import { buildHeliosEngineeringParityFingerprint } from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";

const BATCH_SIZE = 4;
const WORKFLOW = "plan_reconstruction" as const;
const SEMANTIC_RECONCILIATION_VERSION = 1;

const startCanonicalBatchReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosPlanJobs"> },
  null
>("heliosPlanActions:startCanonicalPlanBatch");

const evaluateCanonicalWriterReference = makeFunctionReference<
  "mutation",
  { projectId: string },
  unknown
>("heliosCanonicalPlanWriter:evaluateCanonicalPlanWriterPilot");

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
  return JSON.stringify(metadataFields(page));
}

function metadataFields(page: Doc<"heliosPlanPages">) {
  return {
    pageKind: page.pageKind,
    printedPageNumber: page.printedPageNumber.trim(),
    sheetNumber: page.sheetNumber.trim().toUpperCase(),
    title: page.title.trim().toUpperCase(),
    discipline: page.discipline.trim().toUpperCase(),
    issueDate: page.issueDate.trim(),
    revisionMarker: page.revisionMarker.trim().toUpperCase(),
  };
}

function viewSignature(page: Doc<"heliosPlanPages">) {
  return JSON.stringify(page.views.map((view) => ({
    viewKey: view.viewKey.trim(),
    viewType: view.viewType,
    label: view.label.trim(),
    boundary: view.boundary,
    northOrientation: view.northOrientation.trim(),
    measurable: view.measurable,
    unresolvedIssues: view.unresolvedIssues.map((issue) => issue.trim()),
  })).sort((left, right) => left.viewKey.localeCompare(right.viewKey)));
}

function referenceSignature(
  reference: Doc<"heliosPlanReferences">,
  pageIdentityById: Map<string, string>,
) {
  return JSON.stringify({
    source: pageIdentityById.get(String(reference.sourcePageId)) || "",
    sourceSheetNumber: reference.sourceSheetNumber.trim().toUpperCase(),
    sourceViewKey: reference.sourceViewKey.trim(),
    referenceType: reference.referenceType,
    label: reference.label.trim(),
    targetSheetNumber: reference.targetSheetNumber.trim().toUpperCase(),
    targetDetail: reference.targetDetail.trim().toUpperCase(),
    targetSpecification: reference.targetSpecification.trim().toUpperCase(),
    locator: reference.locator.trim(),
    status: reference.status,
    target: reference.targetPageId
      ? pageIdentityById.get(String(reference.targetPageId)) || ""
      : "",
    confidence: reference.confidence,
  });
}

function calibrationSignature(
  calibration: Doc<"heliosPlanCalibrations">,
  pageIdentityById: Map<string, string>,
) {
  return JSON.stringify({
    page: pageIdentityById.get(String(calibration.pageId)) || "",
    viewKey: calibration.viewKey.trim(),
    source: calibration.source,
    scale: calibration.scale.trim(),
    units: calibration.units.trim().toUpperCase(),
    sourceRegion: calibration.sourceRegion.trim(),
    confidence: calibration.confidence,
    status: calibration.status,
    approvedBy: calibration.approvedBy ? String(calibration.approvedBy) : "",
    approvedAt: calibration.approvedAt || 0,
  });
}

function multisetMatchCount(authoritative: string[], shadow: string[]) {
  const remaining = new Map<string, number>();
  for (const signature of shadow) remaining.set(signature, (remaining.get(signature) || 0) + 1);
  let matches = 0;
  for (const signature of authoritative) {
    const count = remaining.get(signature) || 0;
    if (!count) continue;
    matches += 1;
    if (count === 1) remaining.delete(signature);
    else remaining.set(signature, count - 1);
  }
  return matches;
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
      activationEligible: false,
      semanticReviewRequired: true,
      semanticReconciliationStatus: "not_started",
      reconciliationOpenAiCallCount: 0,
      inputFingerprint: canonicalFingerprint,
      canonicalPageCount: canonicalInputs.length,
      renderOnlyPageCount,
      batchCount: batches.length,
      completedBatchCount: 0,
      failedBatchCount: 0,
      outputPageCount: 0,
      exactPageIdentityCount: 0,
      pageMetadataMatchCount: 0,
      pageKindMatchCount: 0,
      printedPageNumberMatchCount: 0,
      sheetNumberMatchCount: 0,
      titleMatchCount: 0,
      disciplineMatchCount: 0,
      issueDateMatchCount: 0,
      revisionMarkerMatchCount: 0,
      viewSemanticPageMatchCount: 0,
      referenceSemanticMatchCount: 0,
      authoritativeViewCount: canonicalInputs.reduce((sum, { authoritativePage }) => sum + authoritativePage.views.length, 0),
      shadowViewCount: 0,
      authoritativeReferenceCount: 0,
      shadowReferenceCount: 0,
      authoritativeCalibrationCount: 0,
      shadowCalibrationCount: 0,
      calibrationSemanticMatchCount: 0,
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

export const reconcileCanonicalPlanWriterPilot = internalMutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) blocked("the project was not found.");
    const pilot = await ctx.db
      .query("heliosCanonicalPlanWriterPilots")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!pilot || pilot.status !== "ready_for_review") {
      blocked("a completed current canonical Plan writer pilot was not found.");
    }
    const [record, authoritativeRun, shadowRun] = await Promise.all([
      ctx.db.get(pilot.engineeringRecordId),
      ctx.db.get(pilot.authoritativePlanRunId),
      ctx.db.get(pilot.shadowPlanRunId),
    ]);
    if (
      !record || !record.isCurrent || record.status !== "ready" ||
      !authoritativeRun || !authoritativeRun.isCurrent || authoritativeRun.status !== "ready_for_review" ||
      !shadowRun || shadowRun.isCurrent || shadowRun.inputMode !== "canonical_pages" ||
      shadowRun.shadowOfRunId !== authoritativeRun._id ||
      shadowRun.engineeringRecordId !== record._id ||
      shadowRun.sourceFingerprint !== authoritativeRun.sourceFingerprint
    ) {
      blocked("the canonical record, authoritative Plan artifact, or shadow lineage is stale.");
    }
    const artifact = await ctx.db
      .query("heliosEngineeringArtifacts")
      .withIndex("by_authoritative_record", (query) => query
        .eq("engineeringRecordId", record._id)
        .eq("authoritativeRecordType", "heliosPlanRuns")
        .eq("authoritativeRecordId", String(authoritativeRun._id)))
      .first();
    if (
      !artifact || artifact.kind !== "plan_inventory" || artifact.status !== "ready" ||
      artifact.sourceFingerprint !== authoritativeRun.sourceFingerprint
    ) {
      blocked("the governed canonical Plan artifact is missing or no longer matches the source fingerprint.");
    }

    const [authoritativePages, shadowPages, authoritativeReferences, shadowReferences,
      authoritativeCalibrations, shadowCalibrations, engineeringPages, sources] = await Promise.all([
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", authoritativeRun._id)).collect(),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", shadowRun._id)).collect(),
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", authoritativeRun._id)).collect(),
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", shadowRun._id)).collect(),
      ctx.db.query("heliosPlanCalibrations").withIndex("by_run", (query) => query.eq("runId", authoritativeRun._id)).collect(),
      ctx.db.query("heliosPlanCalibrations").withIndex("by_run", (query) => query.eq("runId", shadowRun._id)).collect(),
      ctx.db.query("heliosEngineeringPages").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosEngineeringSources").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
    ]);
    if (shadowPages.length !== pilot.canonicalPageCount) {
      blocked("the shadow output does not have complete canonical page coverage.");
    }
    const sourceById = new Map(sources.map((source) => [String(source._id), source]));
    const canonicalByIdentity = new Map<string, Doc<"heliosEngineeringPages">>(engineeringPages.flatMap((page) => {
      const source = sourceById.get(String(page.engineeringSourceId));
      return source?.documentId
        ? [[`${source.documentId}:${page.physicalPageNumber}`, page] as const]
        : [];
    }));
    const authoritativeByIdentity = new Map<string, Doc<"heliosPlanPages">>(authoritativePages.map((page) => [
      `${page.documentId}:${page.physicalPageNumber}`,
      page,
    ]));
    const shadowByIdentity = new Map<string, Doc<"heliosPlanPages">>(shadowPages.map((page) => [
      `${page.documentId}:${page.physicalPageNumber}`,
      page,
    ]));
    if (shadowByIdentity.size !== shadowPages.length) blocked("the shadow output has duplicate page identities.");

    const shadowPageByAuthoritativeId = new Map<string, Id<"heliosPlanPages">>();
    const initialShadowViewCount = shadowPages.reduce((sum, page) => sum + page.views.length, 0);
    let reconciledViewCount = 0;
    for (const [identity, shadowPage] of shadowByIdentity) {
      const authoritativePage = authoritativeByIdentity.get(identity);
      const canonicalPage = canonicalByIdentity.get(identity);
      if (
        !authoritativePage || !canonicalPage ||
        canonicalPage.sourcePlanPageId !== authoritativePage._id
      ) {
        blocked(`canonical semantic lineage is incomplete for ${shadowPage.documentName} page ${shadowPage.physicalPageNumber}.`);
      }
      reconciledViewCount += authoritativePage.views.length;
      shadowPageByAuthoritativeId.set(String(authoritativePage._id), shadowPage._id);
      await ctx.db.patch(shadowPage._id, {
        pageKind: authoritativePage.pageKind,
        printedPageNumber: authoritativePage.printedPageNumber,
        sheetNumber: authoritativePage.sheetNumber,
        title: authoritativePage.title,
        discipline: authoritativePage.discipline,
        subdiscipline: authoritativePage.subdiscipline,
        issueDate: authoritativePage.issueDate,
        revisionMarker: authoritativePage.revisionMarker,
        addendumAssociation: authoritativePage.addendumAssociation,
        modality: canonicalPage.modality,
        titleBlockBoundary: authoritativePage.titleBlockBoundary,
        titleBlockText: authoritativePage.titleBlockText,
        confidence: authoritativePage.confidence,
        unresolvedIssues: authoritativePage.unresolvedIssues,
        views: authoritativePage.views,
      });
    }

    for (const calibration of shadowCalibrations) await ctx.db.delete(calibration._id);
    for (const calibration of authoritativeCalibrations) {
      const pageId = shadowPageByAuthoritativeId.get(String(calibration.pageId));
      if (!pageId) continue;
      await ctx.db.insert("heliosPlanCalibrations", {
        companyId: calibration.companyId,
        projectId: calibration.projectId,
        packageId: calibration.packageId,
        runId: shadowRun._id,
        pageId,
        viewKey: calibration.viewKey,
        source: calibration.source,
        scale: calibration.scale,
        units: calibration.units,
        sourceRegion: calibration.sourceRegion,
        confidence: calibration.confidence,
        status: calibration.status,
        approvedBy: calibration.approvedBy,
        approvedAt: calibration.approvedAt,
        createdAt: calibration.createdAt,
        updatedAt: calibration.updatedAt,
      });
    }

    for (const reference of shadowReferences) await ctx.db.delete(reference._id);
    let reconciledReferenceCount = 0;
    let globallyResolvedReferenceCount = 0;
    for (const reference of authoritativeReferences) {
      const sourcePageId = shadowPageByAuthoritativeId.get(String(reference.sourcePageId));
      if (!sourcePageId) continue;
      const targetPageId = reference.targetPageId
        ? shadowPageByAuthoritativeId.get(String(reference.targetPageId))
        : undefined;
      const status = reference.status === "resolved" && targetPageId ? "resolved" as const : "unresolved" as const;
      if (status === "resolved") globallyResolvedReferenceCount += 1;
      await ctx.db.insert("heliosPlanReferences", {
        companyId: reference.companyId,
        projectId: reference.projectId,
        packageId: reference.packageId,
        runId: shadowRun._id,
        sourcePageId,
        sourceSheetNumber: reference.sourceSheetNumber,
        sourceViewKey: reference.sourceViewKey,
        referenceType: reference.referenceType,
        label: reference.label,
        targetSheetNumber: reference.targetSheetNumber,
        targetDetail: reference.targetDetail,
        targetSpecification: reference.targetSpecification,
        locator: reference.locator,
        status,
        targetPageId,
        confidence: reference.confidence,
        createdAt: reference.createdAt,
      });
      reconciledReferenceCount += 1;
    }

    const targetAuthoritativePages = authoritativePages.filter((page) =>
      shadowPageByAuthoritativeId.has(String(page._id)),
    );
    const measurableViewCount = targetAuthoritativePages.reduce(
      (sum, page) => sum + page.views.filter((view) => view.measurable).length,
      0,
    );
    const targetAuthoritativeCalibrations = authoritativeCalibrations.filter((calibration) =>
      shadowPageByAuthoritativeId.has(String(calibration.pageId)),
    );
    const approvedCalibrationCount = targetAuthoritativeCalibrations.filter((calibration) =>
      calibration.status === "approved",
    ).length;
    const now = Date.now();
    await ctx.db.patch(shadowRun._id, {
      status: "ready_for_review",
      model: `canonical-plan-artifact-reconciliation-v${SEMANTIC_RECONCILIATION_VERSION}`,
      sourcePageCount: targetAuthoritativePages.length,
      registeredPageCount: targetAuthoritativePages.length,
      sheetCount: targetAuthoritativePages.filter((page) => page.pageKind === "sheet").length,
      nonSheetPageCount: targetAuthoritativePages.filter((page) => page.pageKind === "non_sheet").length,
      exceptionPageCount: targetAuthoritativePages.filter((page) => page.pageKind === "exception").length,
      measurableViewCount,
      approvedCalibrationCount,
      blockedMeasurementCount: Math.max(0, measurableViewCount - approvedCalibrationCount),
      unresolvedReferenceCount: reconciledReferenceCount - globallyResolvedReferenceCount,
      issues: [],
      completedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(pilot._id, {
      activationEligible: false,
      semanticReviewRequired: true,
      semanticReconciliationVersion: SEMANTIC_RECONCILIATION_VERSION,
      semanticReconciliationStatus: "completed",
      semanticSource: "canonical_plan_artifact",
      reconciliationOpenAiCallCount: 0,
      removedModelViewCount: Math.max(0, initialShadowViewCount - reconciledViewCount),
      removedModelReferenceCount: Math.max(0, shadowReferences.length - reconciledReferenceCount),
      globallyResolvedReferenceCount,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, evaluateCanonicalWriterReference, { projectId: String(projectId) });
    return {
      pilotId: String(pilot._id),
      shadowPlanRunId: String(shadowRun._id),
      reconciledPageCount: targetAuthoritativePages.length,
      reconciledViewCount,
      reconciledReferenceCount,
      globallyResolvedReferenceCount,
      removedModelViewCount: Math.max(0, initialShadowViewCount - reconciledViewCount),
      removedModelReferenceCount: Math.max(0, shadowReferences.length - reconciledReferenceCount),
      reconciliationOpenAiCallCount: 0,
    };
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
    const [jobs, authoritativePages, shadowPages, authoritativeReferences, shadowReferences,
      authoritativeCalibrations, shadowCalibrations] = await Promise.all([
      ctx.db.query("heliosPlanJobs").withIndex("by_run", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", pilot.authoritativePlanRunId)).collect(),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", pilot.authoritativePlanRunId)).collect(),
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
      ctx.db.query("heliosPlanCalibrations").withIndex("by_run", (query) => query.eq("runId", pilot.authoritativePlanRunId)).collect(),
      ctx.db.query("heliosPlanCalibrations").withIndex("by_run", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
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
    const metadataMatchCounts = {
      pageKind: 0,
      printedPageNumber: 0,
      sheetNumber: 0,
      title: 0,
      discipline: 0,
      issueDate: 0,
      revisionMarker: 0,
    };
    let viewSemanticPageMatchCount = 0;
    for (const [identity, authoritativePage] of authoritativeByIdentity) {
      const shadowPage = shadowByIdentity.get(identity);
      if (!shadowPage) continue;
      exactPageIdentityCount += 1;
      if (metadataSignature(authoritativePage) === metadataSignature(shadowPage)) pageMetadataMatchCount += 1;
      if (viewSignature(authoritativePage) === viewSignature(shadowPage)) viewSemanticPageMatchCount += 1;
      const authoritativeMetadata = metadataFields(authoritativePage);
      const shadowMetadata = metadataFields(shadowPage);
      for (const key of Object.keys(metadataMatchCounts) as Array<keyof typeof metadataMatchCounts>) {
        if (authoritativeMetadata[key] === shadowMetadata[key]) metadataMatchCounts[key] += 1;
      }
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
    const authoritativeViewCount = targetAuthoritativePages.reduce((sum, page) => sum + page.views.length, 0);
    const shadowViewCount = shadowPages.reduce((sum, page) => sum + page.views.length, 0);
    const authoritativeReferenceCount = targetAuthoritativeReferences.length;
    const shadowReferenceCount = shadowReferences.length;
    const pageIdentityById = new Map([
      ...targetAuthoritativePages.map((page) => [String(page._id), `${page.documentId}:${page.physicalPageNumber}`] as const),
      ...shadowPages.map((page) => [String(page._id), `${page.documentId}:${page.physicalPageNumber}`] as const),
    ]);
    const authoritativeReferenceSignatures = targetAuthoritativeReferences.map((reference) =>
      referenceSignature(reference, pageIdentityById),
    );
    const shadowReferenceSignatures = shadowReferences.map((reference) =>
      referenceSignature(reference, pageIdentityById),
    );
    const referenceSemanticMatchCount = multisetMatchCount(
      authoritativeReferenceSignatures,
      shadowReferenceSignatures,
    );
    const authoritativeCalibrationSignatures = authoritativeCalibrations.map((calibration) =>
      calibrationSignature(calibration, pageIdentityById),
    );
    const shadowCalibrationSignatures = shadowCalibrations.map((calibration) =>
      calibrationSignature(calibration, pageIdentityById),
    );
    const calibrationSemanticMatchCount = multisetMatchCount(
      authoritativeCalibrationSignatures,
      shadowCalibrationSignatures,
    );
    const activationEligible = issues.length === 0
      && pageMetadataMatchCount === pilot.canonicalPageCount
      && viewSemanticPageMatchCount === pilot.canonicalPageCount
      && authoritativeViewCount === shadowViewCount
      && authoritativeReferenceCount === shadowReferenceCount
      && referenceSemanticMatchCount === authoritativeReferenceCount
      && authoritativeCalibrations.length === shadowCalibrations.length
      && calibrationSemanticMatchCount === authoritativeCalibrations.length;
    const now = Date.now();
    await ctx.db.patch(pilot._id, {
      status,
      activationEligible,
      semanticReviewRequired: !activationEligible,
      completedBatchCount: completed,
      failedBatchCount: failed,
      outputPageCount: shadowPages.length,
      exactPageIdentityCount,
      pageMetadataMatchCount,
      pageKindMatchCount: metadataMatchCounts.pageKind,
      printedPageNumberMatchCount: metadataMatchCounts.printedPageNumber,
      sheetNumberMatchCount: metadataMatchCounts.sheetNumber,
      titleMatchCount: metadataMatchCounts.title,
      disciplineMatchCount: metadataMatchCounts.discipline,
      issueDateMatchCount: metadataMatchCounts.issueDate,
      revisionMarkerMatchCount: metadataMatchCounts.revisionMarker,
      viewSemanticPageMatchCount,
      referenceSemanticMatchCount,
      authoritativeViewCount,
      shadowViewCount,
      authoritativeReferenceCount,
      shadowReferenceCount,
      authoritativeCalibrationCount: authoritativeCalibrations.length,
      shadowCalibrationCount: shadowCalibrations.length,
      calibrationSemanticMatchCount,
      originalPdfReadCount: 0,
      openAiCallCount: jobs.filter((job) => Boolean(job.openaiResponseId)).length,
      issues,
      completedAt: now,
      updatedAt: now,
    });
    return {
      status,
      activationEligible,
      semanticReviewRequired: !activationEligible,
      completedBatchCount: completed,
      failedBatchCount: failed,
      canonicalPageCount: pilot.canonicalPageCount,
      outputPageCount: shadowPages.length,
      exactPageIdentityCount,
      pageMetadataMatchCount,
      metadataMatchCounts,
      viewSemanticPageMatchCount,
      referenceSemanticMatchCount,
      authoritativeViewCount,
      shadowViewCount,
      authoritativeReferenceCount,
      shadowReferenceCount,
      authoritativeCalibrationCount: authoritativeCalibrations.length,
      shadowCalibrationCount: shadowCalibrations.length,
      calibrationSemanticMatchCount,
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

export const getCanonicalPlanWriterComparison = internalQuery({
  args: { projectId: v.string(), sampleLimit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    const pilot = await ctx.db
      .query("heliosCanonicalPlanWriterPilots")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!pilot) return null;
    const [authoritativePages, shadowPages, authoritativeReferences, shadowReferences] = await Promise.all([
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", pilot.authoritativePlanRunId)).collect(),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", pilot.authoritativePlanRunId)).collect(),
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", pilot.shadowPlanRunId)).collect(),
    ]);
    const shadowByIdentity = new Map(shadowPages.map((page) => [
      `${page.documentId}:${page.physicalPageNumber}`,
      page,
    ]));
    const samples = [];
    const limit = Math.max(1, Math.min(25, Math.floor(args.sampleLimit || 10)));
    for (const authoritativePage of authoritativePages) {
      const shadowPage = shadowByIdentity.get(`${authoritativePage.documentId}:${authoritativePage.physicalPageNumber}`);
      if (!shadowPage) continue;
      const authoritative = metadataFields(authoritativePage);
      const shadow = metadataFields(shadowPage);
      const changedFields = (Object.keys(authoritative) as Array<keyof typeof authoritative>)
        .filter((key) => authoritative[key] !== shadow[key]);
      if (changedFields.length && samples.length < limit) {
        samples.push({
          documentName: authoritativePage.documentName,
          physicalPageNumber: authoritativePage.physicalPageNumber,
          changedFields,
          authoritative,
          shadow,
          authoritativeViewCount: authoritativePage.views.length,
          shadowViewCount: shadowPage.views.length,
        });
      }
    }
    const countBy = <T extends string>(values: T[]) => Object.fromEntries(
      [...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]),
    );
    return {
      pilot,
      authoritativePageKinds: countBy(authoritativePages.map((page) => page.pageKind)),
      shadowPageKinds: countBy(shadowPages.map((page) => page.pageKind)),
      authoritativeViewTypes: countBy(authoritativePages.flatMap((page) => page.views.map((view) => view.viewType))),
      shadowViewTypes: countBy(shadowPages.flatMap((page) => page.views.map((view) => view.viewType))),
      authoritativeReferenceTypes: countBy(authoritativeReferences.map((reference) => reference.referenceType)),
      shadowReferenceTypes: countBy(shadowReferences.map((reference) => reference.referenceType)),
      metadataDifferenceSamples: samples,
    };
  },
});
