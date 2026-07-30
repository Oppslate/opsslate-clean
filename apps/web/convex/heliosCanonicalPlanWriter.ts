import { buildHeliosEngineeringParityFingerprint } from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";

const BATCH_SIZE = 4;
const WORKFLOW = "plan_reconstruction" as const;

const startCanonicalBatchReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosPlanJobs"> },
  null
>("heliosPlanActions:startCanonicalPlanBatch");

function blocked(message: string): never {
  throw new Error(`Canonical Plan writer blocked: ${message}`);
}

function inputFingerprint(
  pages: Array<{
    page: Doc<"heliosEngineeringPages">;
    render: Doc<"heliosEngineeringAssets">;
  }>,
) {
  return buildHeliosEngineeringParityFingerprint(
    pages.map(({ page, render }) => ({
      pageId: String(page._id),
      engineeringSourceId: String(page.engineeringSourceId),
      physicalPageNumber: page.physicalPageNumber,
      pageSha256: page.pageSha256 || "",
      modality: page.modality,
      materializationVersion: page.materializationVersion || 0,
      nativeTextSpanCount: page.nativeTextSpanCount || 0,
      ocrTextSpanCount: page.ocrTextSpanCount || 0,
      ocrVersion: page.ocrVersion || 0,
      renderId: String(render._id),
      renderSha256: render.sha256,
    })),
  );
}

function metadataSignature(page: Doc<"heliosPlanPages">) {
  return JSON.stringify({
    pageKind: page.pageKind,
    printedPageNumber: page.printedPageNumber.trim(),
    sheetNumber: page.sheetNumber.trim().toUpperCase(),
    title: page.title.trim().toUpperCase(),
    discipline: page.discipline.trim().toUpperCase(),
    issueDate: page.issueDate.trim(),
    revisionMarker: page.revisionMarker.trim().toUpperCase(),
  });
}

export const stageCanonicalPlanWriterPilot = internalMutation({
  args: { projectId: v.string(), pageLimit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) blocked("the project or active package was not found.");

    const authoritativeRun = await ctx.db
      .query("heliosPlanRuns")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first();
    if (!authoritativeRun || authoritativeRun.status !== "ready_for_review") {
      blocked("the current Plan reconstruction is not ready for a shadow writer pilot.");
    }
    const activation = await ctx.db
      .query("heliosCanonicalReaderActivations")
      .withIndex("by_project_workflow_current", (query) =>
        query.eq("projectId", project._id).eq("workflow", WORKFLOW).eq("isCurrent", true),
      )
      .first();
    if (
      !activation ||
      activation.mode !== "active" ||
      activation.planRunId !== authoritativeRun._id ||
      activation.packageId !== authoritativeRun.packageId ||
      activation.sourceFingerprint !== authoritativeRun.sourceFingerprint
    ) {
      blocked("the exact canonical Plan reader pilot is not active on this Plan run.");
    }
    const record = await ctx.db.get(activation.engineeringRecordId);
    if (
      !record ||
      !record.isCurrent ||
      record.packageId !== authoritativeRun.packageId ||
      record.status !== "ready"
    ) {
      blocked("the pinned canonical engineering record is not current and ready.");
    }

    const [authoritativePages, sources, engineeringPages, assets] = await Promise.all([
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", authoritativeRun._id)).collect(),
      ctx.db.query("heliosEngineeringSources").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosEngineeringPages").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosEngineeringAssets").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
    ]);
    if (!authoritativePages.length) blocked("the authoritative Plan run has no pages.");

    const sourceByDocument = new Map(
      sources.filter((source) => source.documentId).map((source) => [String(source.documentId), source]),
    );
    const pageBySourceLocator = new Map(
      engineeringPages.map((page) => [`${page.engineeringSourceId}:${page.physicalPageNumber}`, page]),
    );
    const renderByPage = new Map(
      assets
        .filter((asset) => asset.kind === "page_render" && asset.isCurrent !== false)
        .map((asset) => [String(asset.pageId), asset]),
    );
    const allCanonicalInputs = authoritativePages
      .slice()
      .sort((left, right) =>
        String(left.documentId).localeCompare(String(right.documentId)) ||
        left.physicalPageNumber - right.physicalPageNumber,
      )
      .map((authoritativePage) => {
        const source = sourceByDocument.get(String(authoritativePage.documentId));
        if (!source) blocked(`document ${authoritativePage.documentName} is not in the canonical record.`);
        const page = pageBySourceLocator.get(`${source._id}:${authoritativePage.physicalPageNumber}`);
        if (!page) blocked(`${authoritativePage.documentName} page ${authoritativePage.physicalPageNumber} is missing canonically.`);
        const render = renderByPage.get(String(page._id));
        if (!render) blocked(`${authoritativePage.documentName} page ${authoritativePage.physicalPageNumber} has no pinned render.`);
        return { authoritativePage, page, render };
      });
    const canonicalInputs = args.pageLimit
      ? allCanonicalInputs.slice(0, Math.max(1, Math.floor(args.pageLimit)))
      : allCanonicalInputs;
    const duplicateKeys = canonicalInputs.map(({ authoritativePage }) =>
      `${authoritativePage.documentId}:${authoritativePage.physicalPageNumber}`,
    );
    if (new Set(duplicateKeys).size !== duplicateKeys.length) {
      blocked("the current Plan run contains duplicate document/page identities.");
    }

    const batches: typeof canonicalInputs[] = [];
    for (const documentId of new Set(canonicalInputs.map(({ authoritativePage }) => String(authoritativePage.documentId)))) {
      const documentPages = canonicalInputs.filter(({ authoritativePage }) => String(authoritativePage.documentId) === documentId);
      for (let index = 0; index < documentPages.length; index += BATCH_SIZE) {
        batches.push(documentPages.slice(index, index + BATCH_SIZE));
      }
    }
    const canonicalFingerprint = buildHeliosEngineeringParityFingerprint(
      batches.map((batch) => inputFingerprint(batch)),
    );
    const renderOnlyPageCount = canonicalInputs.filter(({ page }) =>
      (page.nativeTextSpanCount || 0) + (page.ocrTextSpanCount || 0) === 0,
    ).length;
    const existing = await ctx.db
      .query("heliosCanonicalPlanWriterPilots")
      .withIndex("by_project_current", (query) => query.eq("projectId", project._id).eq("isCurrent", true))
      .collect();
    for (const row of existing) await ctx.db.patch(row._id, { isCurrent: false, updatedAt: Date.now() });

    const now = Date.now();
    const shadowRunId = await ctx.db.insert("heliosPlanRuns", {
      companyId: project.companyId,
      projectId: project._id,
      packageId: authoritativeRun.packageId,
      packageRevision: authoritativeRun.packageRevision,
      isCurrent: false,
      status: "queued",
      processingVersion: authoritativeRun.processingVersion + 1,
      inputMode: "canonical_pages",
      shadowOfRunId: authoritativeRun._id,
      engineeringRecordId: record._id,
      canonicalInputFingerprint: canonicalFingerprint,
      sourceFingerprint: authoritativeRun.sourceFingerprint,
      sourceDocumentCount: new Set(canonicalInputs.map(({ authoritativePage }) => String(authoritativePage.documentId))).size,
      sourcePageCount: canonicalInputs.length,
      registeredPageCount: 0,
      sheetCount: 0,
      nonSheetPageCount: 0,
      exceptionPageCount: 0,
      measurableViewCount: 0,
      approvedCalibrationCount: 0,
      blockedMeasurementCount: 0,
      unresolvedReferenceCount: 0,
      issues: [],
      createdBy: project.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    const pilotId = await ctx.db.insert("heliosCanonicalPlanWriterPilots", {
      companyId: project.companyId,
      projectId: project._id,
      packageId: authoritativeRun.packageId,
      engineeringRecordId: record._id,
      authoritativePlanRunId: authoritativeRun._id,
      shadowPlanRunId: shadowRunId,
      isCurrent: true,
      status: "queued",
      inputFingerprint: canonicalFingerprint,
      canonicalPageCount: canonicalInputs.length,
      renderOnlyPageCount,
      batchCount: batches.length,
      completedBatchCount: 0,
      failedBatchCount: 0,
      outputPageCount: 0,
      exactPageIdentityCount: 0,
      pageMetadataMatchCount: 0,
      authoritativeViewCount: canonicalInputs.reduce((sum, { authoritativePage }) => sum + authoritativePage.views.length, 0),
      shadowViewCount: 0,
      authoritativeReferenceCount: 0,
      shadowReferenceCount: 0,
      originalPdfReadCount: 0,
      openAiCallCount: 0,
      issues: [],
      createdBy: project.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    for (const [index, batch] of batches.entries()) {
      const documentId = batch[0]!.authoritativePage.documentId;
      const jobFingerprint = inputFingerprint(batch);
      const jobId = await ctx.db.insert("heliosPlanJobs", {
        companyId: project.companyId,
        projectId: project._id,
        packageId: authoritativeRun.packageId,
        runId: shadowRunId,
        documentId,
        status: "queued",
        attempt: 1,
        inputMode: "canonical_pages",
        engineeringPageIds: batch.map(({ page }) => page._id),
        canonicalInputFingerprint: jobFingerprint,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(Math.floor(index / 4) * 5_000, startCanonicalBatchReference, { jobId });
    }
    await ctx.db.patch(pilotId, { status: "processing", updatedAt: Date.now() });
    return {
      pilotId: String(pilotId),
      authoritativePlanRunId: String(authoritativeRun._id),
      shadowPlanRunId: String(shadowRunId),
      engineeringRecordId: String(record._id),
      canonicalPageCount: canonicalInputs.length,
      renderOnlyPageCount,
      batchCount: batches.length,
      inputFingerprint: canonicalFingerprint,
      originalPdfReadCount: 0,
    };
  },
});

export const loadCanonicalPlanJob = internalQuery({
  args: { jobId: v.id("heliosPlanJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.inputMode !== "canonical_pages" || !job.engineeringPageIds?.length) return null;
    const [run, project, document] = await Promise.all([
      ctx.db.get(job.runId),
      ctx.db.get(job.projectId),
      ctx.db.get(job.documentId),
    ]);
    if (
      !run ||
      run.inputMode !== "canonical_pages" ||
      !run.shadowOfRunId ||
      !run.engineeringRecordId ||
      !project ||
      !document
    ) return null;
    const record = await ctx.db.get(run.engineeringRecordId);
    if (!record || !record.isCurrent || record.packageId !== run.packageId) {
      blocked("the job's canonical engineering record is stale.");
    }
    const pages = [];
    for (const pageId of job.engineeringPageIds) {
      const page = await ctx.db.get(pageId);
      if (!page || page.engineeringRecordId !== record._id) blocked("a pinned canonical page is unavailable.");
      const source = await ctx.db.get(page.engineeringSourceId);
      if (!source || source.documentId !== job.documentId) blocked("a pinned page no longer belongs to the expected source document.");
      const render = await ctx.db
        .query("heliosEngineeringAssets")
        .withIndex("by_page_kind", (query) => query.eq("pageId", page._id).eq("kind", "page_render"))
        .filter((query) => query.neq(query.field("isCurrent"), false))
        .first();
      if (!render) blocked("a pinned canonical page render is unavailable.");
      const spans = (await ctx.db
        .query("heliosEngineeringTextSpans")
        .withIndex("by_page_channel", (query) => query.eq("pageId", page._id))
        .collect())
        .filter((span) => span.isCurrent !== false)
        .sort((a, b) => a.channel.localeCompare(b.channel) || a.readingOrder - b.readingOrder);
      pages.push({ page, source, render, spans });
    }
    const fingerprint = inputFingerprint(pages);
    if (fingerprint !== job.canonicalInputFingerprint) blocked("canonical page content changed after the job was pinned.");
    return { job, run, project, document, pages, inputFingerprint: fingerprint };
  },
});

export const evaluateCanonicalPlanWriterPilot = internalMutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    const pilot = await ctx.db
      .query("heliosCanonicalPlanWriterPilots")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!pilot) return null;
    const [jobs, authoritativePages, shadowPages, authoritativeReferences, shadowReferences] = await Promise.all([
      ctx.db.query("heliosPlanJobs").withIndex("by_run", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", pilot.authoritativePlanRunId)).collect(),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", pilot.authoritativePlanRunId)).collect(),
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
    ]);
    const completed = jobs.filter((job) => job.status === "completed").length;
    const failed = jobs.filter((job) => job.status === "failed").length;
    const terminal = completed + failed === jobs.length;
    if (!terminal) {
      await ctx.db.patch(pilot._id, {
        status: "processing",
        completedBatchCount: completed,
        failedBatchCount: failed,
        openAiCallCount: jobs.filter((job) => Boolean(job.openaiResponseId)).length,
        updatedAt: Date.now(),
      });
      return { status: "processing" as const, completedBatchCount: completed, failedBatchCount: failed, batchCount: jobs.length };
    }

    const targetIdentities = new Set<string>();
    for (const engineeringPageId of jobs.flatMap((job) => job.engineeringPageIds || [])) {
      const engineeringPage = await ctx.db.get(engineeringPageId);
      const source = engineeringPage ? await ctx.db.get(engineeringPage.engineeringSourceId) : null;
      if (engineeringPage && source?.documentId) {
        targetIdentities.add(`${source.documentId}:${engineeringPage.physicalPageNumber}`);
      }
    }
    const targetAuthoritativePages = authoritativePages.filter((page) =>
      targetIdentities.has(`${page.documentId}:${page.physicalPageNumber}`),
    );
    const targetAuthoritativePageIds = new Set(targetAuthoritativePages.map((page) => String(page._id)));
    const targetAuthoritativeReferences = authoritativeReferences.filter((reference) =>
      targetAuthoritativePageIds.has(String(reference.sourcePageId)),
    );
    const authoritativeByIdentity = new Map(targetAuthoritativePages.map((page) => [
      `${page.documentId}:${page.physicalPageNumber}`,
      page,
    ]));
    const shadowByIdentity = new Map(shadowPages.map((page) => [
      `${page.documentId}:${page.physicalPageNumber}`,
      page,
    ]));
    let exactPageIdentityCount = 0;
    let pageMetadataMatchCount = 0;
    for (const [identity, authoritativePage] of authoritativeByIdentity) {
      const shadowPage = shadowByIdentity.get(identity);
      if (!shadowPage) continue;
      exactPageIdentityCount += 1;
      if (metadataSignature(authoritativePage) === metadataSignature(shadowPage)) pageMetadataMatchCount += 1;
    }
    const issues = [
      ...(failed ? [`${failed} canonical page batch${failed === 1 ? "" : "es"} failed.`] : []),
      ...(shadowPages.length !== pilot.canonicalPageCount
        ? [`Canonical coverage differs: ${shadowPages.length} output pages for ${pilot.canonicalPageCount} inputs.`]
        : []),
      ...(exactPageIdentityCount !== pilot.canonicalPageCount
        ? [`Only ${exactPageIdentityCount} of ${pilot.canonicalPageCount} document/page identities match.`]
        : []),
      ...(shadowByIdentity.size !== shadowPages.length ? ["The shadow output contains duplicate document/page identities."] : []),
    ];
    const status = issues.length ? "failed" as const : "ready_for_review" as const;
    const now = Date.now();
    await ctx.db.patch(pilot._id, {
      status,
      completedBatchCount: completed,
      failedBatchCount: failed,
      outputPageCount: shadowPages.length,
      exactPageIdentityCount,
      pageMetadataMatchCount,
      authoritativeViewCount: targetAuthoritativePages.reduce((sum, page) => sum + page.views.length, 0),
      shadowViewCount: shadowPages.reduce((sum, page) => sum + page.views.length, 0),
      authoritativeReferenceCount: targetAuthoritativeReferences.length,
      shadowReferenceCount: shadowReferences.length,
      originalPdfReadCount: 0,
      openAiCallCount: jobs.filter((job) => Boolean(job.openaiResponseId)).length,
      issues,
      completedAt: now,
      updatedAt: now,
    });
    return {
      status,
      completedBatchCount: completed,
      failedBatchCount: failed,
      canonicalPageCount: pilot.canonicalPageCount,
      outputPageCount: shadowPages.length,
      exactPageIdentityCount,
      pageMetadataMatchCount,
      authoritativeViewCount: targetAuthoritativePages.reduce((sum, page) => sum + page.views.length, 0),
      shadowViewCount: shadowPages.reduce((sum, page) => sum + page.views.length, 0),
      authoritativeReferenceCount: targetAuthoritativeReferences.length,
      shadowReferenceCount: shadowReferences.length,
      originalPdfReadCount: 0,
      openAiCallCount: jobs.filter((job) => Boolean(job.openaiResponseId)).length,
      issues,
    };
  },
});

export const getCanonicalPlanWriterPilot = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    return ctx.db
      .query("heliosCanonicalPlanWriterPilots")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
  },
});
