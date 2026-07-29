import {
  HELIOS_CANONICAL_MATERIALIZATION_VERSION,
  HELIOS_CANONICAL_OCR_VERSION,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";

const OCR_ENGINE = "tesseract-wasm@0.11.0";
const OCR_LANGUAGE = "eng";
const OCR_CONCURRENCY = 2;
const OCR_MAX_ATTEMPTS = 3;

const boundaryValidator = v.object({
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
});

const startOcrReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosEngineeringOcrJobs">; attempt: number },
  null
>("heliosEngineeringOcrActions:runCanonicalPageOcr");

const refreshProjectReference = makeFunctionReference<
  "mutation",
  { projectId: Id<"heliosProjects">; packageId: Id<"heliosBidPackages"> },
  null
>("heliosEngineeringShadow:refreshProjectShadow");

function sourceIsCurrent(
  source: Doc<"heliosEngineeringSources">,
  record: Doc<"heliosEngineeringRecords">,
) {
  return (
    source.engineeringRecordId === record._id &&
    source.projectId === record.projectId &&
    source.packageId === record.packageId &&
    record.isCurrent &&
    source.status !== "superseded"
  );
}

async function currentPageRender(ctx: MutationCtx, pageId: Id<"heliosEngineeringPages">) {
  const assets = await ctx.db
    .query("heliosEngineeringAssets")
    .withIndex("by_page_kind", (query) => query.eq("pageId", pageId).eq("kind", "page_render"))
    .collect();
  return assets.find((asset) => asset.isCurrent !== false && !asset.viewKey) || null;
}

async function scheduleAvailableOcr(
  ctx: MutationCtx,
  engineeringRecordId: Id<"heliosEngineeringRecords">,
) {
  const processing = await ctx.db
    .query("heliosEngineeringOcrJobs")
    .withIndex("by_record_status", (query) =>
      query.eq("engineeringRecordId", engineeringRecordId).eq("status", "processing"),
    )
    .take(OCR_CONCURRENCY);
  const available = Math.max(0, OCR_CONCURRENCY - processing.length);
  if (!available) return [];
  const queued = await ctx.db
    .query("heliosEngineeringOcrJobs")
    .withIndex("by_record_status", (query) =>
      query.eq("engineeringRecordId", engineeringRecordId).eq("status", "queued"),
    )
    .take(available);
  const now = Date.now();
  for (const job of queued) {
    await ctx.db.patch(job._id, {
      status: "processing",
      attemptCount: job.attemptCount + 1,
      startedAt: now,
      completedAt: undefined,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, startOcrReference, {
      jobId: job._id,
      attempt: job.attemptCount + 1,
    });
  }
  return queued.map((job) => job._id);
}

async function refreshSourceMaterialization(
  ctx: MutationCtx,
  sourceId: Id<"heliosEngineeringSources">,
) {
  const [pages, materialization] = await Promise.all([
    ctx.db
      .query("heliosEngineeringPages")
      .withIndex("by_source_page", (query) => query.eq("engineeringSourceId", sourceId))
      .collect(),
    ctx.db
      .query("heliosEngineeringMaterializations")
      .withIndex("by_source_version", (query) =>
        query
          .eq("engineeringSourceId", sourceId)
          .eq("materializationVersion", HELIOS_CANONICAL_MATERIALIZATION_VERSION),
      )
      .first(),
  ]);
  if (!materialization) return;
  const materializedPages = pages.filter(
    (page) => page.materializationVersion === HELIOS_CANONICAL_MATERIALIZATION_VERSION,
  );
  const ocrPendingPageCount = materializedPages.filter(
    (page) => page.ocrStatus === "pending",
  ).length;
  const failedPageCount = materializedPages.filter(
    (page) => page.materializationStatus === "failed",
  ).length;
  const completedPageCount = materializedPages.filter((page) =>
    ["ready", "partially_ready"].includes(page.materializationStatus || ""),
  ).length;
  const status = completedPageCount === 0 && failedPageCount > 0
    ? "failed" as const
    : failedPageCount > 0 || completedPageCount !== materialization.sourcePageCount || ocrPendingPageCount > 0
      ? "partially_ready" as const
      : "ready" as const;
  await ctx.db.patch(materialization._id, {
    status,
    completedPageCount,
    failedPageCount,
    ocrPendingPageCount,
    textSpanCount: materializedPages.reduce(
      (sum, page) => sum + (page.nativeTextSpanCount || 0) + (page.ocrTextSpanCount || 0),
      0,
    ),
    lastError: failedPageCount
      ? `${failedPageCount} canonical page${failedPageCount === 1 ? "" : "s"} failed materialization or OCR.`
      : undefined,
    completedAt: status === "ready" ? Date.now() : materialization.completedAt,
    updatedAt: Date.now(),
  });
}

export const backfillProjectOcr = internalMutation({
  args: { projectId: v.string(), force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) throw new Error("Current Helios project package not found.");
    const record = await ctx.db
      .query("heliosEngineeringRecords")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first();
    if (!record) throw new Error("Current canonical engineering record not found.");
    const pages = await ctx.db
      .query("heliosEngineeringPages")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id))
      .collect();
    const candidates = pages.filter((page) =>
      page.sourcePlanPageId &&
      ["scanned", "hybrid"].includes(page.modality) &&
      page.materializationVersion === HELIOS_CANONICAL_MATERIALIZATION_VERSION &&
      (args.force || page.ocrStatus !== "ready"),
    );
    let queued = 0;
    let missingRender = 0;
    const now = Date.now();
    for (const page of candidates) {
      const [source, render, existing] = await Promise.all([
        ctx.db.get(page.engineeringSourceId),
        currentPageRender(ctx, page._id),
        ctx.db
          .query("heliosEngineeringOcrJobs")
          .withIndex("by_page_version", (query) =>
            query.eq("pageId", page._id).eq("ocrVersion", HELIOS_CANONICAL_OCR_VERSION),
          )
          .first(),
      ]);
      if (!source || !sourceIsCurrent(source, record)) continue;
      if (!render) {
        missingRender += 1;
        continue;
      }
      if (existing?.status === "processing") continue;
      if (
        existing?.status === "ready" &&
        existing.renderSha256 === render.sha256 &&
        page.ocrStatus === "ready" &&
        !args.force
      ) continue;
      const values = {
        pageRenderAssetId: render._id,
        renderSha256: render.sha256,
        engine: OCR_ENGINE,
        language: OCR_LANGUAGE,
        status: "queued" as const,
        spanCount: 0,
        characterCount: 0,
        meanConfidence: undefined,
        phase: undefined,
        lastError: undefined,
        startedAt: undefined,
        completedAt: undefined,
        updatedAt: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, { ...values, attemptCount: 0 });
      } else {
        await ctx.db.insert("heliosEngineeringOcrJobs", {
          companyId: page.companyId,
          projectId: page.projectId,
          packageId: record.packageId,
          engineeringRecordId: record._id,
          engineeringSourceId: page.engineeringSourceId,
          pageId: page._id,
          ocrVersion: HELIOS_CANONICAL_OCR_VERSION,
          attemptCount: 0,
          createdBy: record.createdBy,
          createdAt: now,
          ...values,
        });
      }
      await ctx.db.patch(page._id, {
        ocrStatus: "pending",
        ocrVersion: HELIOS_CANONICAL_OCR_VERSION,
        ocrEngine: OCR_ENGINE,
        ocrRenderSha256: render.sha256,
        ocrTextSpanCount: 0,
        ocrError: undefined,
        ocrCompletedAt: undefined,
        materializationStatus: "partially_ready",
        updatedAt: now,
      });
      queued += 1;
    }
    const started = await scheduleAvailableOcr(ctx, record._id);
    return {
      recordId: String(record._id),
      candidateCount: candidates.length,
      queued,
      missingRender,
      started: started.map(String),
    };
  },
});

export const loadOcrJob = internalQuery({
  args: { jobId: v.id("heliosEngineeringOcrJobs"), attempt: v.number() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "processing" || job.attemptCount !== args.attempt) return null;
    const [page, render, source, record] = await Promise.all([
      ctx.db.get(job.pageId),
      ctx.db.get(job.pageRenderAssetId),
      ctx.db.get(job.engineeringSourceId),
      ctx.db.get(job.engineeringRecordId),
    ]);
    if (
      !page || !render || !source || !record ||
      !sourceIsCurrent(source, record) ||
      render.kind !== "page_render" ||
      render.isCurrent === false ||
      render.sha256 !== job.renderSha256 ||
      render.pageId !== page._id ||
      !page.sourcePlanPageId ||
      !["scanned", "hybrid"].includes(page.modality)
    ) return null;
    // Deliberately excludes the source document and originalStorageId. OCR is
    // allowed to consume only the already materialized canonical page render.
    return { job, page, render };
  },
});

export const replaceOcrPageTextSpans = internalMutation({
  args: {
    jobId: v.id("heliosEngineeringOcrJobs"),
    attempt: v.number(),
    reset: v.boolean(),
    spans: v.array(v.object({
      spanKey: v.string(),
      readingOrder: v.number(),
      text: v.string(),
      boundary: boundaryValidator,
      confidence: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "processing" || job.attemptCount !== args.attempt) {
      return { stored: 0, resetRemaining: false };
    }
    const [page, source, record] = await Promise.all([
      ctx.db.get(job.pageId),
      ctx.db.get(job.engineeringSourceId),
      ctx.db.get(job.engineeringRecordId),
    ]);
    if (!page || !source || !record || !sourceIsCurrent(source, record)) {
      return { stored: 0, resetRemaining: false };
    }
    if (args.reset) {
      const current = await ctx.db
        .query("heliosEngineeringTextSpans")
        .withIndex("by_page_channel", (query) =>
          query.eq("pageId", page._id).eq("channel", "ocr"),
        )
        .filter((query) => query.neq(query.field("isCurrent"), false))
        .take(500);
      for (const span of current) await ctx.db.patch(span._id, { isCurrent: false });
      return { stored: 0, resetRemaining: current.length === 500 };
    }
    const now = Date.now();
    for (const span of args.spans) {
      const existing = await ctx.db
        .query("heliosEngineeringTextSpans")
        .withIndex("by_page_span_key", (query) =>
          query.eq("pageId", page._id).eq("channel", "ocr").eq("spanKey", span.spanKey),
        )
        .first();
      const values = {
        readingOrder: span.readingOrder,
        text: span.text,
        boundary: span.boundary,
        confidence: span.confidence,
        sourceLocator: `Canonical OCR · PDF page ${page.physicalPageNumber}`,
        materializationVersion: HELIOS_CANONICAL_MATERIALIZATION_VERSION,
        isCurrent: true,
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else {
        await ctx.db.insert("heliosEngineeringTextSpans", {
          companyId: page.companyId,
          projectId: page.projectId,
          engineeringRecordId: page.engineeringRecordId,
          engineeringSourceId: page.engineeringSourceId,
          pageId: page._id,
          channel: "ocr",
          spanKey: span.spanKey,
          createdAt: now,
          ...values,
        });
      }
    }
    return { stored: args.spans.length, resetRemaining: false };
  },
});

export const markOcrPhase = internalMutation({
  args: {
    jobId: v.id("heliosEngineeringOcrJobs"),
    attempt: v.number(),
    phase: v.union(
      v.literal("loading_render"), v.literal("loading_engine"),
      v.literal("recognizing"), v.literal("persisting"),
    ),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "processing" || job.attemptCount !== args.attempt) return false;
    await ctx.db.patch(job._id, { phase: args.phase, updatedAt: Date.now() });
    return true;
  },
});

export const completeOcrJob = internalMutation({
  args: {
    jobId: v.id("heliosEngineeringOcrJobs"),
    attempt: v.number(),
    spanCount: v.number(),
    characterCount: v.number(),
    meanConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "processing" || job.attemptCount !== args.attempt) return null;
    const page = await ctx.db.get(job.pageId);
    if (!page) return null;
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: "ready",
      spanCount: args.spanCount,
      characterCount: args.characterCount,
      meanConfidence: args.meanConfidence,
      phase: undefined,
      lastError: undefined,
      completedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(page._id, {
      ocrStatus: "ready",
      ocrTextSpanCount: args.spanCount,
      ocrVersion: job.ocrVersion,
      ocrEngine: job.engine,
      ocrRenderSha256: job.renderSha256,
      ocrError: undefined,
      ocrCompletedAt: now,
      materializationStatus: page.nativeTextStatus === "failed"
        ? "failed"
        : page.modality === "hybrid" && page.nativeTextStatus !== "ready"
          ? "partially_ready"
          : "ready",
      materializationError: page.nativeTextStatus === "failed" ? page.materializationError : undefined,
      updatedAt: now,
    });
    await refreshSourceMaterialization(ctx, job.engineeringSourceId);
    await scheduleAvailableOcr(ctx, job.engineeringRecordId);
    await ctx.scheduler.runAfter(0, refreshProjectReference, {
      projectId: job.projectId,
      packageId: job.packageId,
    });
    return { status: "ready" as const };
  },
});

export const failOcrJob = internalMutation({
  args: { jobId: v.id("heliosEngineeringOcrJobs"), attempt: v.number(), error: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "processing" || job.attemptCount !== args.attempt) return null;
    const page = await ctx.db.get(job.pageId);
    const error = args.error.trim().slice(0, 500) || "Canonical page OCR failed.";
    if (job.attemptCount < OCR_MAX_ATTEMPTS) {
      await ctx.db.patch(job._id, {
        attemptCount: job.attemptCount + 1,
        lastError: error,
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(
        2_000 * (2 ** Math.max(0, job.attemptCount - 1)),
        startOcrReference,
        { jobId: job._id, attempt: job.attemptCount + 1 },
      );
      return { status: "retrying" as const, attemptCount: job.attemptCount };
    }
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: "failed",
      phase: undefined,
      lastError: error,
      completedAt: now,
      updatedAt: now,
    });
    if (page) {
      await ctx.db.patch(page._id, {
        ocrStatus: "failed",
        ocrError: error,
        materializationStatus: "failed",
        materializationError: error,
        updatedAt: now,
      });
    }
    await refreshSourceMaterialization(ctx, job.engineeringSourceId);
    await scheduleAvailableOcr(ctx, job.engineeringRecordId);
    return { status: "failed" as const, attemptCount: job.attemptCount };
  },
});

export const recoverStaleProjectOcr = internalMutation({
  args: { projectId: v.string(), staleAfterMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) throw new Error("Current Helios project package not found.");
    const record = await ctx.db
      .query("heliosEngineeringRecords")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first();
    if (!record) throw new Error("Current canonical engineering record not found.");
    const staleAfterMs = Math.max(300_000, Math.floor(args.staleAfterMs || 900_000));
    const cutoff = Date.now() - staleAfterMs;
    const processing = await ctx.db
      .query("heliosEngineeringOcrJobs")
      .withIndex("by_record_status", (query) =>
        query.eq("engineeringRecordId", record._id).eq("status", "processing"),
      )
      .collect();
    const stale = processing.filter((job) => (job.startedAt || job.updatedAt) <= cutoff);
    for (const job of stale) {
      await ctx.db.patch(job._id, {
        status: "queued",
        phase: undefined,
        lastError: "Recovered after the prior OCR attempt exceeded its execution window.",
        startedAt: undefined,
        updatedAt: Date.now(),
      });
    }
    const started = await scheduleAvailableOcr(ctx, record._id);
    return { recovered: stale.length, started: started.map(String) };
  },
});

export const retryOcrJob = internalMutation({
  args: { jobId: v.id("heliosEngineeringOcrJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "failed") throw new Error("Failed canonical OCR job not found.");
    await ctx.db.patch(job._id, {
      status: "queued",
      phase: undefined,
      attemptCount: 0,
      lastError: undefined,
      startedAt: undefined,
      completedAt: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(job.pageId, {
      ocrStatus: "pending",
      ocrError: undefined,
      materializationStatus: "partially_ready",
      materializationError: undefined,
      updatedAt: Date.now(),
    });
    await scheduleAvailableOcr(ctx, job.engineeringRecordId);
    return job._id;
  },
});

export const getProjectOcrSummary = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) return null;
    const record = await ctx.db
      .query("heliosEngineeringRecords")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first();
    if (!record) return null;
    const [jobs, pages] = await Promise.all([
      ctx.db
        .query("heliosEngineeringOcrJobs")
        .withIndex("by_project_updated", (query) => query.eq("projectId", project._id))
        .collect(),
      ctx.db
        .query("heliosEngineeringPages")
        .withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id))
        .collect(),
    ]);
    const currentJobs = jobs.filter((job) => job.engineeringRecordId === record._id);
    const eligiblePages = pages.filter((page) =>
      page.sourcePlanPageId && ["scanned", "hybrid"].includes(page.modality),
    );
    return {
      recordId: String(record._id),
      eligiblePageCount: eligiblePages.length,
      readyPageCount: eligiblePages.filter((page) => page.ocrStatus === "ready").length,
      pendingPageCount: eligiblePages.filter((page) => page.ocrStatus === "pending").length,
      failedPageCount: eligiblePages.filter((page) => page.ocrStatus === "failed").length,
      statusCounts: Object.fromEntries(
        ["queued", "processing", "ready", "failed", "superseded"].map((status) => [
          status,
          currentJobs.filter((job) => job.status === status).length,
        ]),
      ),
      spanCount: currentJobs.reduce((sum, job) => sum + job.spanCount, 0),
      characterCount: currentJobs.reduce((sum, job) => sum + job.characterCount, 0),
      failures: currentJobs
        .filter((job) => job.status === "failed")
        .map((job) => ({
          jobId: String(job._id),
          pageId: String(job.pageId),
          attemptCount: job.attemptCount,
          error: job.lastError,
        })),
      processing: currentJobs
        .filter((job) => job.status === "processing")
        .map((job) => ({
          jobId: String(job._id),
          pageId: String(job.pageId),
          attemptCount: job.attemptCount,
          phase: job.phase,
          startedAt: job.startedAt,
          updatedAt: job.updatedAt,
        })),
    };
  },
});
