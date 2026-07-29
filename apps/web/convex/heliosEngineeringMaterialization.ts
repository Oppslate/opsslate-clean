import {
  derivePlanSheetConflicts,
  HELIOS_CANONICAL_MATERIALIZATION_VERSION,
  planSheetAuthorityByPage,
  type HeliosPlanPage,
  type HeliosPlanSheetDecision,
  type HeliosPlanViewType,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";

const boundaryValidator = v.object({
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
});

const startSourceReference = makeFunctionReference<
  "action",
  {
    materializationId: Id<"heliosEngineeringMaterializations">;
    startPage?: number;
    endPage?: number;
    replaceRender?: boolean;
  },
  null
>("heliosEngineeringMaterializationActions:startSourceMaterialization");

const materializeViewsReference = makeFunctionReference<
  "action",
  { pageId: Id<"heliosEngineeringPages"> },
  null
>("heliosEngineeringMaterializationActions:materializePageViews");

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

function diagnosticPlanPage(page: Doc<"heliosPlanPages">): HeliosPlanPage {
  return {
    id: String(page._id),
    documentId: String(page.documentId),
    documentName: page.documentName,
    physicalPageNumber: page.physicalPageNumber,
    pageKind: page.pageKind,
    printedPageNumber: page.printedPageNumber,
    sheetNumber: page.sheetNumber,
    title: page.title,
    discipline: page.discipline,
    subdiscipline: page.subdiscipline,
    issueDate: page.issueDate,
    revisionMarker: page.revisionMarker,
    addendumAssociation: page.addendumAssociation,
    modality: page.modality,
    titleBlockBoundary: page.titleBlockBoundary,
    titleBlockText: page.titleBlockText,
    confidence: page.confidence,
    unresolvedIssues: page.unresolvedIssues,
    views: page.views.map((view) => ({
      ...view,
      viewType: view.viewType as HeliosPlanViewType,
      scaleCandidates: [],
    })),
  };
}

function diagnosticSheetDecision(
  decision: Doc<"heliosPlanSheetDecisions">,
): HeliosPlanSheetDecision {
  return {
    id: String(decision._id),
    normalizedSheetNumber: decision.normalizedSheetNumber,
    sheetNumber: decision.sheetNumber,
    decision: decision.decision,
    status: decision.status,
    primaryPageId: decision.primaryPageId ? String(decision.primaryPageId) : undefined,
    referencePageIds: decision.referencePageIds.map(String),
    reason: decision.reason,
    reviewerName: decision.reviewerName,
    reviewedAt: decision.updatedAt,
  };
}

async function queueSource(
  ctx: MutationCtx,
  source: Doc<"heliosEngineeringSources">,
  force: boolean,
) {
  const record = await ctx.db.get(source.engineeringRecordId);
  if (!record || !sourceIsCurrent(source, record) || source.sourceKind !== "pdf") {
    return null;
  }
  let materialization = await ctx.db
    .query("heliosEngineeringMaterializations")
    .withIndex("by_source_version", (query) =>
      query
        .eq("engineeringSourceId", source._id)
        .eq("materializationVersion", HELIOS_CANONICAL_MATERIALIZATION_VERSION),
    )
    .first();
  const now = Date.now();
  if (
    materialization &&
    materialization.sourceFingerprint === source.sourceFingerprint &&
    !force &&
    ["queued", "processing", "ready", "partially_ready"].includes(materialization.status)
  ) {
    return materialization._id;
  }
  if (!materialization) {
    const id = await ctx.db.insert("heliosEngineeringMaterializations", {
      companyId: source.companyId,
      projectId: source.projectId,
      packageId: source.packageId,
      engineeringRecordId: source.engineeringRecordId,
      engineeringSourceId: source._id,
      materializationVersion: HELIOS_CANONICAL_MATERIALIZATION_VERSION,
      sourceFingerprint: source.sourceFingerprint,
      status: "queued",
      attemptCount: 1,
      sourcePageCount: 0,
      completedPageCount: 0,
      failedPageCount: 0,
      nativeTextPageCount: 0,
      ocrPendingPageCount: 0,
      textSpanCount: 0,
      pageRenderCount: 0,
      viewCropCount: 0,
      createdBy: record.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    materialization = await ctx.db.get(id);
  } else {
    await ctx.db.patch(materialization._id, {
      sourceFingerprint: source.sourceFingerprint,
      status: "queued",
      attemptCount: materialization.attemptCount + 1,
      sourcePageCount: 0,
      completedPageCount: 0,
      failedPageCount: 0,
      nativeTextPageCount: 0,
      ocrPendingPageCount: 0,
      textSpanCount: 0,
      pageRenderCount: 0,
      viewCropCount: 0,
      lastError: undefined,
      startedAt: undefined,
      completedAt: undefined,
      updatedAt: now,
    });
    materialization = await ctx.db.get(materialization._id);
  }
  if (!materialization) return null;
  await ctx.scheduler.runAfter(0, startSourceReference, {
    materializationId: materialization._id,
  });
  return materialization._id;
}

export const queueSourceMaterialization = internalMutation({
  args: {
    sourceId: v.id("heliosEngineeringSources"),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    return source ? queueSource(ctx, source, Boolean(args.force)) : null;
  },
});

export const backfillProjectMaterialization = internalMutation({
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
    const sources = await ctx.db
      .query("heliosEngineeringSources")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id))
      .collect();
    const queued: string[] = [];
    for (const source of sources) {
      const id = await queueSource(ctx, source, Boolean(args.force));
      if (id) queued.push(String(id));
    }
    return { recordId: String(record._id), sourceCount: sources.length, queued };
  },
});

export const retrySourceMaterializationPage = internalMutation({
  args: {
    sourceId: v.id("heliosEngineeringSources"),
    physicalPageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source || source.sourceKind !== "pdf") {
      throw new Error("Canonical PDF source not found.");
    }
    const record = await ctx.db.get(source.engineeringRecordId);
    if (!record || !sourceIsCurrent(source, record)) {
      throw new Error("Canonical PDF source is stale.");
    }
    const job = await ctx.db
      .query("heliosEngineeringMaterializations")
      .withIndex("by_source_version", (query) =>
        query
          .eq("engineeringSourceId", source._id)
          .eq("materializationVersion", HELIOS_CANONICAL_MATERIALIZATION_VERSION),
      )
      .first();
    if (!job || job.status === "processing") {
      throw new Error("Canonical source materialization is unavailable or already processing.");
    }
    const physicalPageNumber = Math.max(1, Math.floor(args.physicalPageNumber));
    await ctx.db.patch(job._id, {
      status: "processing",
      attemptCount: job.attemptCount + 1,
      lastError: undefined,
      startedAt: Date.now(),
      completedAt: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, startSourceReference, {
      materializationId: job._id,
      startPage: physicalPageNumber,
      endPage: physicalPageNumber,
      replaceRender: true,
    });
    return job._id;
  },
});

export const loadSourceMaterialization = internalQuery({
  args: { materializationId: v.id("heliosEngineeringMaterializations") },
  handler: async (ctx, args) => {
    const materialization = await ctx.db.get(args.materializationId);
    if (!materialization) return null;
    const [source, record] = await Promise.all([
      ctx.db.get(materialization.engineeringSourceId),
      ctx.db.get(materialization.engineeringRecordId),
    ]);
    if (
      !source ||
      !record ||
      !sourceIsCurrent(source, record) ||
      source.sourceFingerprint !== materialization.sourceFingerprint ||
      source.sourceKind !== "pdf" ||
      !source.originalStorageId
    ) {
      return null;
    }
    return { materialization, source, record };
  },
});

export const markSourceProcessing = internalMutation({
  args: { materializationId: v.id("heliosEngineeringMaterializations") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.materializationId);
    if (!row || row.status !== "queued") return false;
    await ctx.db.patch(row._id, {
      status: "processing",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const completePageMaterialization = internalMutation({
  args: {
    materializationId: v.id("heliosEngineeringMaterializations"),
    physicalPageNumber: v.number(),
    widthPoints: v.number(),
    heightPoints: v.number(),
    rotationDegrees: v.number(),
    pageSha256: v.string(),
    inferredModality: v.union(
      v.literal("vector"), v.literal("scanned"), v.literal("hybrid"), v.literal("unusable"),
    ),
    nativeTextSpanCount: v.number(),
    replaceRender: v.optional(v.boolean()),
    pageRender: v.object({
      storageId: v.id("_storage"),
      contentType: v.string(),
      sha256: v.string(),
      pixelWidth: v.number(),
      pixelHeight: v.number(),
      dpi: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.materializationId);
    if (!job || job.status !== "processing") return null;
    const [source, record] = await Promise.all([
      ctx.db.get(job.engineeringSourceId),
      ctx.db.get(job.engineeringRecordId),
    ]);
    if (!source || !record || !sourceIsCurrent(source, record)) return null;
    let page = await ctx.db
      .query("heliosEngineeringPages")
      .withIndex("by_source_page", (query) =>
        query
          .eq("engineeringSourceId", source._id)
          .eq("physicalPageNumber", args.physicalPageNumber),
      )
      .first();
    const replacePossiblyBrokenRender = page?.materializationStatus === "failed";
    const modality = page?.sourcePlanPageId ? page.modality : args.inferredModality;
    const nativeTextStatus = args.nativeTextSpanCount
      ? "ready" as const
      : modality === "scanned"
        ? "not_applicable" as const
        : modality === "unusable"
          ? "failed" as const
          : "pending" as const;
    const ocrStatus = modality === "vector"
      ? "not_applicable" as const
      : modality === "unusable"
        ? "failed" as const
        : "pending" as const;
    const materializationStatus =
      nativeTextStatus === "failed" || ocrStatus === "failed"
        ? "failed" as const
        : ocrStatus === "pending" || nativeTextStatus === "pending"
          ? "partially_ready" as const
          : "ready" as const;
    const now = Date.now();
    const pageValues = {
      widthPoints: args.widthPoints,
      heightPoints: args.heightPoints,
      rotationDegrees: args.rotationDegrees,
      pageSha256: page?.pageSha256 || args.pageSha256,
      modality,
      nativeTextStatus,
      ocrStatus,
      materializationVersion: HELIOS_CANONICAL_MATERIALIZATION_VERSION,
      materializationStatus,
      nativeTextSpanCount: args.nativeTextSpanCount,
      materializationError: undefined,
      materializedAt: now,
      updatedAt: now,
    };
    if (!page) {
      const pageId = await ctx.db.insert("heliosEngineeringPages", {
        companyId: source.companyId,
        projectId: source.projectId,
        engineeringRecordId: source.engineeringRecordId,
        engineeringSourceId: source._id,
        physicalPageNumber: args.physicalPageNumber,
        createdAt: now,
        ...pageValues,
      });
      page = await ctx.db.get(pageId);
    } else {
      await ctx.db.patch(page._id, pageValues);
      page = await ctx.db.get(page._id);
    }
    if (!page) return null;

    const pageAssets = await ctx.db
      .query("heliosEngineeringAssets")
      .withIndex("by_page_kind", (query) => query.eq("pageId", page!._id).eq("kind", "page_render"))
      .collect();
    const currentRender = pageAssets.find((asset) => asset.isCurrent !== false && !asset.viewKey);
    if (
      currentRender?.sha256 === args.pageRender.sha256 &&
      !replacePossiblyBrokenRender &&
      !args.replaceRender
    ) {
      await ctx.storage.delete(args.pageRender.storageId);
    } else {
      for (const asset of pageAssets.filter((row) => row.isCurrent !== false)) {
        await ctx.db.patch(asset._id, { isCurrent: false });
      }
      await ctx.db.insert("heliosEngineeringAssets", {
        companyId: source.companyId,
        projectId: source.projectId,
        engineeringRecordId: source.engineeringRecordId,
        engineeringSourceId: source._id,
        pageId: page._id,
        kind: "page_render",
        materializationVersion: HELIOS_CANONICAL_MATERIALIZATION_VERSION,
        isCurrent: true,
        createdAt: now,
        ...args.pageRender,
      });
    }
    if (page.sourcePlanPageId) {
      await ctx.scheduler.runAfter(0, materializeViewsReference, { pageId: page._id });
    }
    return page._id;
  },
});

export const replacePageTextSpans = internalMutation({
  args: {
    pageId: v.id("heliosEngineeringPages"),
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
    const page = await ctx.db.get(args.pageId);
    if (!page || page.materializationStatus === "failed") {
      return { stored: 0, resetRemaining: false };
    }
    const source = await ctx.db.get(page.engineeringSourceId);
    const record = await ctx.db.get(page.engineeringRecordId);
    if (!source || !record || !sourceIsCurrent(source, record)) {
      return { stored: 0, resetRemaining: false };
    }
    if (args.reset) {
      const current = (await ctx.db
        .query("heliosEngineeringTextSpans")
        .withIndex("by_page_channel", (query) =>
          query.eq("pageId", page._id).eq("channel", "native"),
        )
        .filter((query) => query.neq(query.field("isCurrent"), false))
        .take(500));
      for (const span of current) await ctx.db.patch(span._id, { isCurrent: false });
      return { stored: 0, resetRemaining: current.length === 500 };
    }
    const now = Date.now();
    for (const span of args.spans) {
      const existing = await ctx.db
        .query("heliosEngineeringTextSpans")
        .withIndex("by_page_span_key", (query) =>
          query
            .eq("pageId", page._id)
            .eq("channel", "native")
            .eq("spanKey", span.spanKey),
        )
        .first();
      const values = {
        readingOrder: span.readingOrder,
        text: span.text,
        boundary: span.boundary,
        confidence: span.confidence,
        sourceLocator: `PDF page ${page.physicalPageNumber}`,
        materializationVersion: HELIOS_CANONICAL_MATERIALIZATION_VERSION,
        isCurrent: true,
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else {
        await ctx.db.insert("heliosEngineeringTextSpans", {
          companyId: source.companyId,
          projectId: source.projectId,
          engineeringRecordId: source.engineeringRecordId,
          engineeringSourceId: source._id,
          pageId: page._id,
          channel: "native",
          spanKey: span.spanKey,
          createdAt: now,
          ...values,
        });
      }
    }
    return { stored: args.spans.length, resetRemaining: false };
  },
});

export const recordPageFailure = internalMutation({
  args: {
    materializationId: v.id("heliosEngineeringMaterializations"),
    physicalPageNumber: v.number(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.materializationId);
    if (!job || job.status !== "processing") return;
    const page = await ctx.db
      .query("heliosEngineeringPages")
      .withIndex("by_source_page", (query) =>
        query
          .eq("engineeringSourceId", job.engineeringSourceId)
          .eq("physicalPageNumber", args.physicalPageNumber),
      )
      .first();
    if (page) {
      await ctx.db.patch(page._id, {
        materializationVersion: HELIOS_CANONICAL_MATERIALIZATION_VERSION,
        materializationStatus: "failed",
        materializationError: args.error.slice(0, 500),
        updatedAt: Date.now(),
      });
    }
  },
});

export const finalizeSourceMaterialization = internalMutation({
  args: {
    materializationId: v.id("heliosEngineeringMaterializations"),
    sourcePageCount: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.materializationId);
    if (!job || !["processing", "failed"].includes(job.status)) return null;
    const [pages, assets] = await Promise.all([
      ctx.db
        .query("heliosEngineeringPages")
        .withIndex("by_source_page", (query) => query.eq("engineeringSourceId", job.engineeringSourceId))
        .collect(),
      ctx.db
        .query("heliosEngineeringAssets")
        .withIndex("by_source", (query) => query.eq("engineeringSourceId", job.engineeringSourceId))
        .collect(),
    ]);
    const materializedPages = pages.filter(
      (page) => page.materializationVersion === HELIOS_CANONICAL_MATERIALIZATION_VERSION,
    );
    const completedPageCount = materializedPages.filter((page) =>
      ["ready", "partially_ready"].includes(page.materializationStatus || ""),
    ).length;
    const failedPageCount = materializedPages.filter(
      (page) => page.materializationStatus === "failed",
    ).length;
    const ocrPendingPageCount = materializedPages.filter((page) => page.ocrStatus === "pending").length;
    const nativeTextPageCount = materializedPages.filter((page) => page.nativeTextStatus === "ready").length;
    const currentAssets = assets.filter((asset) => asset.isCurrent !== false);
    const pageRenderCount = currentAssets.filter((asset) => asset.kind === "page_render").length;
    const viewCropCount = currentAssets.filter((asset) => asset.kind === "view_crop").length;
    const sourcePageCount = Math.max(args.sourcePageCount, materializedPages.length);
    const status = completedPageCount === 0 && failedPageCount > 0
      ? "failed" as const
      : failedPageCount > 0 || completedPageCount !== sourcePageCount || ocrPendingPageCount > 0
        ? "partially_ready" as const
        : "ready" as const;
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status,
      sourcePageCount,
      completedPageCount,
      failedPageCount,
      nativeTextPageCount,
      ocrPendingPageCount,
      textSpanCount: materializedPages.reduce(
        (sum, page) => sum + (page.nativeTextSpanCount || 0),
        0,
      ),
      pageRenderCount,
      viewCropCount,
      lastError: failedPageCount ? `${failedPageCount} page render${failedPageCount === 1 ? "" : "s"} failed.` : undefined,
      completedAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, refreshProjectReference, {
      projectId: job.projectId,
      packageId: job.packageId,
    });
    return { status, completedPageCount, failedPageCount, ocrPendingPageCount };
  },
});

export const failSourceMaterialization = internalMutation({
  args: {
    materializationId: v.id("heliosEngineeringMaterializations"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.materializationId);
    if (!job || !["queued", "processing"].includes(job.status)) return;
    await ctx.db.patch(job._id, {
      status: "failed",
      lastError: args.error.slice(0, 500),
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const loadPageViewMaterialization = internalQuery({
  args: { pageId: v.id("heliosEngineeringPages") },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page?.sourcePlanPageId) return null;
    const [source, record, planPage, renders] = await Promise.all([
      ctx.db.get(page.engineeringSourceId),
      ctx.db.get(page.engineeringRecordId),
      ctx.db.get(page.sourcePlanPageId),
      ctx.db
        .query("heliosEngineeringAssets")
        .withIndex("by_page_kind", (query) => query.eq("pageId", page._id).eq("kind", "page_render"))
        .collect(),
    ]);
    const pageRender = renders.find((asset) => asset.isCurrent !== false && !asset.viewKey);
    if (!source || !record || !planPage || !pageRender || !sourceIsCurrent(source, record)) return null;
    return { page, source, record, planPage, pageRender };
  },
});

export const completePageViewMaterialization = internalMutation({
  args: {
    pageId: v.id("heliosEngineeringPages"),
    assets: v.array(v.object({
      viewKey: v.string(),
      storageId: v.id("_storage"),
      contentType: v.string(),
      sha256: v.string(),
      boundary: boundaryValidator,
      pixelWidth: v.number(),
      pixelHeight: v.number(),
      dpi: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) return 0;
    const source = await ctx.db.get(page.engineeringSourceId);
    if (!source) return 0;
    const existing = await ctx.db
      .query("heliosEngineeringAssets")
      .withIndex("by_page_kind", (query) => query.eq("pageId", page._id).eq("kind", "view_crop"))
      .collect();
    const currentByView = new Map(
      existing.filter((asset) => asset.isCurrent !== false && asset.viewKey).map((asset) => [asset.viewKey!, asset]),
    );
    const now = Date.now();
    for (const asset of args.assets) {
      const current = currentByView.get(asset.viewKey);
      if (current?.sha256 === asset.sha256) {
        await ctx.storage.delete(asset.storageId);
        continue;
      }
      if (current) await ctx.db.patch(current._id, { isCurrent: false });
      await ctx.db.insert("heliosEngineeringAssets", {
        companyId: source.companyId,
        projectId: source.projectId,
        engineeringRecordId: source.engineeringRecordId,
        engineeringSourceId: source._id,
        pageId: page._id,
        kind: "view_crop",
        materializationVersion: HELIOS_CANONICAL_MATERIALIZATION_VERSION,
        isCurrent: true,
        createdAt: now,
        ...asset,
      });
    }
    const [sourceAssets, materialization] = await Promise.all([
      ctx.db
        .query("heliosEngineeringAssets")
        .withIndex("by_source", (query) => query.eq("engineeringSourceId", source._id))
        .collect(),
      ctx.db
        .query("heliosEngineeringMaterializations")
        .withIndex("by_source_version", (query) =>
          query
            .eq("engineeringSourceId", source._id)
            .eq("materializationVersion", HELIOS_CANONICAL_MATERIALIZATION_VERSION),
        )
        .first(),
    ]);
    if (materialization) {
      await ctx.db.patch(materialization._id, {
        viewCropCount: sourceAssets.filter(
          (asset) => asset.kind === "view_crop" && asset.isCurrent !== false,
        ).length,
        updatedAt: Date.now(),
      });
    }
    return args.assets.length;
  },
});

export const getProjectMaterializationSummary = internalQuery({
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
    const jobs = await ctx.db
      .query("heliosEngineeringMaterializations")
      .withIndex("by_record_status", (query) => query.eq("engineeringRecordId", record._id))
      .collect();
    const pages = await ctx.db
      .query("heliosEngineeringPages")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id))
      .collect();
    return {
      recordId: String(record._id),
      statusCounts: Object.fromEntries(
        ["queued", "processing", "ready", "partially_ready", "failed"].map((status) => [
          status,
          jobs.filter((job) => job.status === status).length,
        ]),
      ),
      sourceCount: jobs.length,
      sourcePageCount: jobs.reduce((sum, job) => sum + job.sourcePageCount, 0),
      completedPageCount: jobs.reduce((sum, job) => sum + job.completedPageCount, 0),
      failedPageCount: jobs.reduce((sum, job) => sum + job.failedPageCount, 0),
      nativeTextPageCount: jobs.reduce((sum, job) => sum + job.nativeTextPageCount, 0),
      ocrPendingPageCount: jobs.reduce((sum, job) => sum + job.ocrPendingPageCount, 0),
      textSpanCount: jobs.reduce((sum, job) => sum + job.textSpanCount, 0),
      pageRenderCount: jobs.reduce((sum, job) => sum + job.pageRenderCount, 0),
      viewCropCount: jobs.reduce((sum, job) => sum + job.viewCropCount, 0),
      failures: jobs
        .filter((job) => job.status === "failed")
        .map((job) => ({
          materializationId: String(job._id),
          sourceId: String(job.engineeringSourceId),
          sourcePageCount: job.sourcePageCount,
          completedPageCount: job.completedPageCount,
          error: job.lastError,
        })),
      pageFailures: pages
        .filter((page) => page.materializationStatus === "failed")
        .map((page) => ({
          pageId: String(page._id),
          sourceId: String(page.engineeringSourceId),
          physicalPageNumber: page.physicalPageNumber,
          error: page.materializationError,
        })),
    };
  },
});

export const getProjectMaterializationDiagnostics = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) return null;
    const [record, planRun] = await Promise.all([
      ctx.db
        .query("heliosEngineeringRecords")
        .withIndex("by_package_current", (query) =>
          query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
        )
        .first(),
      ctx.db
        .query("heliosPlanRuns")
        .withIndex("by_package_current", (query) =>
          query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
        )
        .first(),
    ]);
    if (!record || !planRun) return null;
    const [pages, planPages, assets, sources, sheetDecisions] = await Promise.all([
      ctx.db.query("heliosEngineeringPages").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", planRun._id)).collect(),
      ctx.db.query("heliosEngineeringAssets").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosEngineeringSources").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosPlanSheetDecisions").withIndex("by_run_current", (query) => query.eq("runId", planRun._id).eq("isCurrent", true)).collect(),
    ]);
    const canonicalByPlanPage = new Map(
      pages
        .filter((page) => page.sourcePlanPageId)
        .map((page) => [String(page.sourcePlanPageId), page]),
    );
    const sourceById = new Map(sources.map((source) => [String(source._id), source]));
    const currentViewKeys = new Set(
      assets
        .filter((asset) => asset.isCurrent !== false && asset.kind === "view_crop" && asset.viewKey)
        .map((asset) => `${String(asset.pageId)}:${asset.viewKey}`),
    );
    const drawingAuthority = derivePlanSheetConflicts(
      planPages.map(diagnosticPlanPage),
      sheetDecisions.map(diagnosticSheetDecision),
    );
    const authorityByPage = planSheetAuthorityByPage(drawingAuthority);
    return {
      drawingAuthority: drawingAuthority.map((authority) => ({
          sheetNumber: authority.sheetNumber,
          classification: authority.conflictType,
          status: authority.status,
          reason: authority.reason,
          pages: authority.pageIds.map((pageId) => {
            const page = planPages.find((candidate) => String(candidate._id) === pageId);
            return {
              pageId,
              role: authorityByPage.get(pageId) || "unresolved",
              documentName: page?.documentName,
              physicalPageNumber: page?.physicalPageNumber,
              issueDate: page?.issueDate,
            };
          }),
          decisions: sheetDecisions
            .filter((decision) => decision.normalizedSheetNumber === authority.normalizedSheetNumber)
            .map((decision) => ({
              decision: decision.decision,
              status: decision.status,
              primaryPageId: decision.primaryPageId ? String(decision.primaryPageId) : undefined,
              updatedAt: decision.updatedAt,
            })),
        })),
      missingViewCrops: planPages.flatMap((planPage) => {
        const page = canonicalByPlanPage.get(String(planPage._id));
        if (!page) return [];
        const source = sourceById.get(String(page.engineeringSourceId));
        return planPage.views.flatMap((view) => {
          const identity = `${String(page._id)}:${view.viewKey}`;
          return currentViewKeys.has(identity)
            ? []
            : [{
                pageId: String(page._id),
                sourceFileName: source?.originalFileName,
                physicalPageNumber: page.physicalPageNumber,
                viewKey: view.viewKey,
                boundary: view.boundary,
              }];
        });
      }),
      ocrPendingPages: pages
        .filter((page) => page.sourcePlanPageId && page.ocrStatus === "pending")
        .map((page) => ({
          pageId: String(page._id),
          sourceFileName: sourceById.get(String(page.engineeringSourceId))?.originalFileName,
          physicalPageNumber: page.physicalPageNumber,
          modality: page.modality,
        })),
    };
  },
});
