import {
  buildHeliosEngineeringParityFingerprint,
  derivePlanSheetConflicts,
  normalizePlanReviewInput,
  parsePlanDocumentIntelligence,
  planSheetAuthorityByPage,
  type HeliosPlanPage,
  type HeliosPlanReviewInput,
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
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
  type HeliosPrincipalArgs,
} from "./heliosAuthorization";
import { deriveProjectBidBasis } from "./heliosBidBasis";
import {
  retirePlanReaderActivation,
  retirePlanWriterActivation,
} from "./heliosCanonicalPlanReader";
import { canonicalPlanInputFingerprint } from "./heliosCanonicalPlanWriter";
import { scheduleGeometryRunShadow, schedulePlanRunShadow } from "./heliosEngineeringShadowSchedule";

const PROCESSING_VERSION = 1;
const CANONICAL_PROCESSING_VERSION = 2;
const CANONICAL_BATCH_SIZE = 4;

const startPlanDocumentReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosPlanJobs"> },
  null
>("heliosPlanActions:startPlanDocument");

const startCanonicalPlanBatchReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosPlanJobs"> },
  null
>("heliosPlanActions:startCanonicalPlanBatch");

const evaluateCanonicalWriterReference = makeFunctionReference<
  "mutation",
  { projectId: string },
  unknown
>("heliosCanonicalPlanWriter:evaluateCanonicalPlanWriterPilot");

function domainPlanPage(page: Doc<"heliosPlanPages">): HeliosPlanPage {
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

function domainSheetDecision(decision: Doc<"heliosPlanSheetDecisions">): HeliosPlanSheetDecision {
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

async function ownedProject(
  ctx: MutationCtx,
  principal: HeliosPrincipalArgs,
  projectIdValue: string,
) {
  const { user, companyId } = await requireHeliosPrincipal(ctx, principal);
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  if (!projectId) throw new Error("Project not found.");
  const project = await ctx.db.get(projectId);
  if (!project || project.companyId !== companyId) throw new Error("Project not found.");
  return { user, companyId, project };
}

async function canonicalPlanBasis(
  ctx: MutationCtx,
  packageId: Id<"heliosBidPackages">,
  documentIds: Id<"heliosDocuments">[],
) {
  const record = await ctx.db
    .query("heliosEngineeringRecords")
    .withIndex("by_package_current", (query) => query.eq("packageId", packageId).eq("isCurrent", true))
    .first();
  if (!record || !["ready", "partially_ready"].includes(record.status)) return null;
  const [sources, pages, assets] = await Promise.all([
    ctx.db.query("heliosEngineeringSources").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
    ctx.db.query("heliosEngineeringPages").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
    ctx.db.query("heliosEngineeringAssets").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
  ]);
  const sourceByDocument = new Map(
    sources.filter((source) => source.documentId).map((source) => [String(source.documentId), source]),
  );
  const renderByPage = new Map(
    assets
      .filter((asset) => asset.kind === "page_render" && !asset.viewKey && asset.isCurrent !== false)
      .map((asset) => [String(asset.pageId), asset]),
  );
  const batches: Array<Array<{
    documentId: Id<"heliosDocuments">;
    page: Doc<"heliosEngineeringPages">;
    render: Doc<"heliosEngineeringAssets">;
  }>> = [];
  for (const documentId of documentIds) {
    const source = sourceByDocument.get(String(documentId));
    if (!source || source.status !== "ready") {
      throw new Error(`Canonical Plan reconstruction is missing the immutable source for document ${documentId}.`);
    }
    const documentPages = pages
      .filter((page) => page.engineeringSourceId === source._id)
      .sort((left, right) => left.physicalPageNumber - right.physicalPageNumber);
    if (!documentPages.length) {
      throw new Error(`Canonical Plan reconstruction found no materialized pages for document ${documentId}.`);
    }
    const inputs = documentPages.map((page) => {
      const render = renderByPage.get(String(page._id));
      if (!render) throw new Error(`Canonical Plan reconstruction is missing a pinned render for document ${documentId} page ${page.physicalPageNumber}.`);
      return { documentId, page, render };
    });
    for (let index = 0; index < inputs.length; index += CANONICAL_BATCH_SIZE) {
      batches.push(inputs.slice(index, index + CANONICAL_BATCH_SIZE));
    }
  }
  const inputFingerprint = buildHeliosEngineeringParityFingerprint(
    batches.map((batch) => canonicalPlanInputFingerprint(batch)),
  );
  return { record, batches, inputFingerprint, pageCount: batches.reduce((sum, batch) => sum + batch.length, 0) };
}

async function createPlanRun(
  ctx: MutationCtx,
  principal: HeliosPrincipalArgs,
  projectIdValue: string,
) {
  const { user, companyId, project } = await ownedProject(ctx, principal, projectIdValue);
  await retirePlanWriterActivation(
    ctx,
    project._id,
    "Plan reconstruction was requested; the canonical writer returned to its retained legacy rollback run.",
  );
  await retirePlanReaderActivation(
    ctx,
    project._id,
    "Plan reconstruction was requested; the canonical reader returned to legacy until fresh parity is approved.",
  );
  if (!project.activePackageId) throw new Error("Finalize a bid package before reconstructing plans.");
  const bidPackage = await ctx.db.get(project.activePackageId);
  if (!bidPackage || bidPackage.projectId !== project._id || bidPackage.companyId !== companyId) {
    throw new Error("Active bid package not found.");
  }
  const basis = await deriveProjectBidBasis(ctx, project, bidPackage);
  const planCategory = basis.categories.find((category) => category.category === "plans");
  const planDocumentIds = (planCategory?.documentIds || [])
    .map((value) => ctx.db.normalizeId("heliosDocuments", value))
    .filter((value): value is Id<"heliosDocuments"> => Boolean(value));
  const applicable = planCategory?.state === "received" && planDocumentIds.length > 0;
  const current = await ctx.db
    .query("heliosPlanRuns")
    .withIndex("by_package_current", (query) => query.eq("packageId", bidPackage._id).eq("isCurrent", true))
    .first();
  const currentJobs = current
    ? await ctx.db.query("heliosPlanJobs").withIndex("by_run", (query) => query.eq("runId", current._id)).collect()
    : [];
  const currentDocuments = new Set(currentJobs.map((job) => String(job.documentId)));
  if (
    current &&
    current.sourceFingerprint === basis.sourceFingerprint &&
    current.sourceDocumentCount === planDocumentIds.length &&
    planDocumentIds.every((documentId) => currentDocuments.has(String(documentId))) &&
    ["queued", "processing", "ready_for_review", "partially_ready", "not_applicable_to_current_basis"].includes(current.status)
  ) {
    await finalizeRun(ctx, current._id);
    const refreshed = await ctx.db.get(current._id);
    return {
      runId: String(current._id),
      status: refreshed?.status || current.status,
      reused: true,
    };
  }
  if (current) await ctx.db.patch(current._id, { isCurrent: false, updatedAt: Date.now() });

  const now = Date.now();
  const canonical = applicable ? await canonicalPlanBasis(ctx, bidPackage._id, planDocumentIds) : null;
  const runId = await ctx.db.insert("heliosPlanRuns", {
    companyId,
    projectId: project._id,
    packageId: bidPackage._id,
    packageRevision: bidPackage.revision,
    isCurrent: true,
    status: applicable ? "queued" : "not_applicable_to_current_basis",
    processingVersion: canonical ? CANONICAL_PROCESSING_VERSION : PROCESSING_VERSION,
    inputMode: canonical ? "canonical_pages" : "legacy_pdf",
    engineeringRecordId: canonical?.record._id,
    canonicalInputFingerprint: canonical?.inputFingerprint,
    sourceFingerprint: basis.sourceFingerprint,
    sourceDocumentCount: applicable ? planDocumentIds.length : 0,
    sourcePageCount: canonical?.pageCount || 0,
    registeredPageCount: 0,
    sheetCount: 0,
    nonSheetPageCount: 0,
    exceptionPageCount: 0,
    measurableViewCount: 0,
    approvedCalibrationCount: 0,
    blockedMeasurementCount: 0,
    unresolvedReferenceCount: 0,
    issues: applicable ? [] : ["Plans are not part of the current bid basis. Plan processing was bypassed without blocking the estimate."],
    createdBy: user._id,
    createdAt: now,
    updatedAt: now,
    completedAt: applicable ? undefined : now,
  });
  await ctx.db.insert("heliosPlanReviewEvents", {
    companyId,
    projectId: project._id,
    packageId: bidPackage._id,
    runId,
    action: "request_reconstruction",
    reviewerUserId: user._id,
    reviewerName: user.name,
    decisionValue: applicable ? "queued" : "not_applicable_to_current_basis",
    createdAt: now,
  });
  if (!applicable) return { runId: String(runId), status: "not_applicable_to_current_basis" as const, reused: false };

  if (canonical) {
    for (const [index, batch] of canonical.batches.entries()) {
      const documentId = batch[0]!.documentId;
      const jobId = await ctx.db.insert("heliosPlanJobs", {
        companyId, projectId: project._id, packageId: bidPackage._id, runId, documentId,
        status: "queued", attempt: 1, inputMode: "canonical_pages",
        engineeringPageIds: batch.map(({ page }) => page._id),
        canonicalInputFingerprint: canonicalPlanInputFingerprint(batch),
        createdAt: now, updatedAt: now,
      });
      await ctx.scheduler.runAfter(Math.floor(index / 4) * 5_000, startCanonicalPlanBatchReference, { jobId });
    }
  } else {
    for (const documentId of planDocumentIds) {
      const document = await ctx.db.get(documentId);
      if (!document || document.projectId !== project._id || document.companyId !== companyId) continue;
      const jobId = await ctx.db.insert("heliosPlanJobs", {
        companyId, projectId: project._id, packageId: bidPackage._id, runId, documentId,
        status: "queued", attempt: 1, inputMode: "legacy_pdf", createdAt: now, updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, startPlanDocumentReference, { jobId });
    }
  }
  return { runId: String(runId), status: "queued" as const, reused: false };
}

async function finalizeRun(ctx: MutationCtx, runId: Id<"heliosPlanRuns">) {
  const run = await ctx.db.get(runId);
  if (!run) return;
  const jobs = await ctx.db.query("heliosPlanJobs").withIndex("by_run", (query) => query.eq("runId", runId)).collect();
  if (jobs.some((job) => !["completed", "failed"].includes(job.status))) return false;
  const pages = await ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", runId)).collect();
  const references = await ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", runId)).collect();
  const calibrations = await ctx.db.query("heliosPlanCalibrations").withIndex("by_run", (query) => query.eq("runId", runId)).collect();
  const sheetDecisions = await ctx.db.query("heliosPlanSheetDecisions")
    .withIndex("by_run_current", (query) => query.eq("runId", runId).eq("isCurrent", true))
    .collect();
  const sheetConflicts = derivePlanSheetConflicts(
    pages.map(domainPlanPage),
    sheetDecisions.map(domainSheetDecision),
  );
  const authorityByPage = planSheetAuthorityByPage(sheetConflicts);
  const pagesBySheet = new Map<string, typeof pages>();
  for (const page of pages.filter((candidate) => candidate.sheetNumber)) {
    const key = page.sheetNumber.trim().toUpperCase();
    if (authorityByPage.get(String(page._id)) === "permit_reference") continue;
    pagesBySheet.set(key, [...(pagesBySheet.get(key) || []), page]);
  }
  for (const reference of references) {
    const targets = reference.targetSheetNumber
      ? pagesBySheet.get(reference.targetSheetNumber.trim().toUpperCase()) || []
      : [];
    await ctx.db.patch(reference._id, {
      status: targets.length === 1 ? "resolved" : "unresolved",
      targetPageId: targets.length === 1 ? targets[0]._id : undefined,
    });
  }
  const viewKeys = new Set<string>();
  let measurableViewCount = 0;
  for (const page of pages) {
    for (const view of page.views.filter((candidate) => candidate.measurable)) {
      measurableViewCount += 1;
      viewKeys.add(`${page._id}:${view.viewKey}`);
    }
  }
  const approvedViewKeys = new Set(
    calibrations.filter((calibration) => calibration.status === "approved").map((calibration) => `${calibration.pageId}:${calibration.viewKey}`),
  );
  const failedJobs = jobs.filter((job) => job.status === "failed");
  const unresolvedReferenceCount = references.filter((reference) => {
    if (!reference.targetSheetNumber) return false;
    return (pagesBySheet.get(reference.targetSheetNumber.trim().toUpperCase()) || []).length !== 1;
  }).length;
  const issues = [
    ...sheetConflicts.filter((conflict) => conflict.status !== "resolved").map((conflict) =>
      conflict.status === "escalated"
        ? `Drawing authority conflict escalated: ${conflict.sheetNumber}.`
        : `Drawing version conflict requires review: ${conflict.sheetNumber}.`,
    ),
    ...failedJobs.map((job) => `Plan document failed: ${job.error || "analysis unavailable"}`),
  ];
  const now = Date.now();
  await ctx.db.patch(runId, {
    status: jobs.every((job) => job.status === "failed") ? "failed" : failedJobs.length ? "partially_ready" : "ready_for_review",
    model: jobs.find((job) => job.model)?.model,
    sourcePageCount: pages.length,
    registeredPageCount: pages.length,
    sheetCount: pages.filter((page) => page.pageKind === "sheet").length,
    nonSheetPageCount: pages.filter((page) => page.pageKind === "non_sheet").length,
    exceptionPageCount: pages.filter((page) => page.pageKind === "exception").length,
    measurableViewCount,
    approvedCalibrationCount: approvedViewKeys.size,
    blockedMeasurementCount: [...viewKeys].filter((key) => !approvedViewKeys.has(key)).length,
    unresolvedReferenceCount,
    issues,
    updatedAt: now,
    completedAt: now,
  });
  await schedulePlanRunShadow(ctx, runId);
  if (run.inputMode === "canonical_pages" && run.shadowOfRunId) {
    await ctx.scheduler.runAfter(0, evaluateCanonicalWriterReference, {
      projectId: String(run.projectId),
    });
  }
  return true;
}

export const reviewPlanIntelligence = internalMutation({
  args: { principal: heliosPrincipalValidator, projectId: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    const input = normalizePlanReviewInput(args.input) as HeliosPlanReviewInput;
    if (input.action === "request_reconstruction") return createPlanRun(ctx, args.principal, args.projectId);
    const { user, companyId, project } = await ownedProject(ctx, args.principal, args.projectId);
    if (input.action === "resolve_sheet_conflict") {
      if (!project.activePackageId) throw new Error("Current bid package not found.");
      const requestedCanonicalPageId = input.primaryPageId
        ? ctx.db.normalizeId("heliosPlanPages", input.primaryPageId)
        : null;
      const requestedCanonicalPage = requestedCanonicalPageId
        ? await ctx.db.get(requestedCanonicalPageId)
        : null;
      const writerRollback = await retirePlanWriterActivation(
        ctx,
        project._id,
        "Drawing authority review changed; the canonical writer returned to legacy until a new exact pilot is approved.",
      );
      const run = await ctx.db.query("heliosPlanRuns")
        .withIndex("by_package_current", (query) => query.eq("packageId", project.activePackageId!).eq("isCurrent", true))
        .first();
      if (!run) throw new Error("Current plan reconstruction not found.");
      const [pages, decisions] = await Promise.all([
        ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", run._id)).collect(),
        ctx.db.query("heliosPlanSheetDecisions")
          .withIndex("by_run_current", (query) => query.eq("runId", run._id).eq("isCurrent", true))
          .collect(),
      ]);
      const normalizedSheet = input.sheetNumber!.trim().toUpperCase();
      const conflicts = derivePlanSheetConflicts(pages.map(domainPlanPage), decisions.map(domainSheetDecision));
      const conflict = conflicts.find((candidate) => candidate.normalizedSheetNumber === normalizedSheet);
      if (!conflict) throw new Error("Drawing conflict not found in the current plan revision.");
      const candidatePageIds = conflict.pageIds
        .map((value) => ctx.db.normalizeId("heliosPlanPages", value))
        .filter((value): value is Id<"heliosPlanPages"> => Boolean(value));
      const mappedRequestedPrimary =
        writerRollback &&
        requestedCanonicalPage &&
        requestedCanonicalPage.runId === writerRollback.canonicalPlanRunId
          ? pages.find(
              (page) =>
                page.documentId === requestedCanonicalPage.documentId &&
                page.physicalPageNumber === requestedCanonicalPage.physicalPageNumber,
            )?._id
          : requestedCanonicalPageId || undefined;
      const requestedPrimary = input.decision === "apply_recommended"
        ? conflict.suggestedPrimaryPageId
        : mappedRequestedPrimary
          ? String(mappedRequestedPrimary)
          : input.primaryPageId;
      const primaryPageId = requestedPrimary
        ? ctx.db.normalizeId("heliosPlanPages", requestedPrimary) || undefined
        : undefined;
      if (primaryPageId && !candidatePageIds.some((pageId) => pageId === primaryPageId)) {
        throw new Error("The selected drawing is not part of this conflict.");
      }
      if (["apply_recommended", "use_as_current"].includes(input.decision!) && !primaryPageId) {
        throw new Error("A current bid drawing could not be established.");
      }
      const status = ["apply_recommended", "use_as_current"].includes(input.decision!)
        ? "resolved" as const
        : input.decision === "escalate" ? "escalated" as const : "review_required" as const;
      const referencePageIds = primaryPageId
        ? candidatePageIds.filter((pageId) => pageId !== primaryPageId)
        : [];
      const primaryPage = primaryPageId ? pages.find((page) => page._id === primaryPageId) : undefined;
      const reason = input.decision === "apply_recommended"
        ? `Estimator accepted the recommended current bid drawing: ${primaryPage?.documentName || conflict.sheetNumber}.`
        : input.decision === "use_as_current"
          ? `Estimator classified ${primaryPage?.documentName || conflict.sheetNumber} as the current bid drawing.`
          : input.decision === "keep_both"
            ? "Estimator retained both drawings for further comparison; downstream authority remains unresolved."
            : "Estimator escalated the drawing authority conflict for project-team resolution.";
      const existing = decisions.find((decision) => decision.normalizedSheetNumber === normalizedSheet);
      const now = Date.now();
      if (existing) await ctx.db.patch(existing._id, { isCurrent: false, updatedAt: now });
      const decisionId = await ctx.db.insert("heliosPlanSheetDecisions", {
        companyId,
        projectId: project._id,
        packageId: run.packageId,
        runId: run._id,
        normalizedSheetNumber: normalizedSheet,
        sheetNumber: conflict.sheetNumber,
        decision: input.decision!,
        status,
        primaryPageId,
        referencePageIds,
        reason,
        reviewerUserId: user._id,
        reviewerName: user.name,
        isCurrent: true,
        createdAt: now,
        updatedAt: now,
      });
      await retirePlanReaderActivation(
        ctx,
        project._id,
        "Drawing authority changed; the canonical reader returned to legacy until the updated Plan artifact passes parity.",
      );
      await ctx.db.insert("heliosPlanReviewEvents", {
        companyId,
        projectId: project._id,
        packageId: run.packageId,
        runId: run._id,
        action: "resolve_sheet_conflict",
        sheetNumber: conflict.sheetNumber,
        primaryPageId,
        reviewerUserId: user._id,
        reviewerName: user.name,
        previousValue: existing?.decision,
        decisionValue: input.decision!,
        createdAt: now,
      });
      const geometryRun = await ctx.db.query("heliosCivilGeometryRuns")
        .withIndex("by_plan_current", (query) => query.eq("planRunId", run._id).eq("isCurrent", true))
        .first();
      if (geometryRun) await scheduleGeometryRunShadow(ctx, geometryRun._id);
      await finalizeRun(ctx, run._id);
      return { runId: String(run._id), decisionId: String(decisionId), status };
    }
    const calibrationId = ctx.db.normalizeId("heliosPlanCalibrations", input.calibrationId!);
    if (!calibrationId) throw new Error("Calibration not found.");
    let calibration = await ctx.db.get(calibrationId);
    if (!calibration || calibration.companyId !== companyId || calibration.projectId !== project._id) {
      throw new Error("Calibration not found.");
    }
    const calibrationPage = await ctx.db.get(calibration.pageId);
    const writerRollback = await retirePlanWriterActivation(
      ctx,
      project._id,
      "Plan calibration review changed; the canonical writer returned to legacy until a new exact pilot is approved.",
    );
    if (
      writerRollback &&
      calibration.runId === writerRollback.canonicalPlanRunId &&
      calibrationPage
    ) {
      const legacyPages = await ctx.db
        .query("heliosPlanPages")
        .withIndex("by_run_page", (query) =>
          query.eq("runId", writerRollback.legacyPlanRunId),
        )
        .collect();
      const legacyPage = legacyPages.find(
        (page) =>
          page.documentId === calibrationPage.documentId &&
          page.physicalPageNumber === calibrationPage.physicalPageNumber,
      );
      const legacyCalibrations = legacyPage
        ? await ctx.db
            .query("heliosPlanCalibrations")
            .withIndex("by_page_view", (query) =>
              query.eq("pageId", legacyPage._id).eq("viewKey", calibration!.viewKey),
            )
            .collect()
        : [];
      const mappedCalibration = legacyCalibrations.find(
        (candidate) =>
          candidate.runId === writerRollback.legacyPlanRunId &&
          candidate.source === calibration!.source &&
          candidate.scale === calibration!.scale &&
          candidate.units === calibration!.units &&
          candidate.sourceRegion === calibration!.sourceRegion,
      );
      if (!mappedCalibration) {
        throw new Error("The canonical calibration could not be mapped to its legacy rollback record. Refresh Plan Intelligence and try again.");
      }
      calibration = mappedCalibration;
    }
    const run = await ctx.db.get(calibration.runId);
    if (!run || !run.isCurrent || run.packageId !== project.activePackageId) throw new Error("Calibration is not current.");
    await retirePlanReaderActivation(
      ctx,
      project._id,
      "Plan calibration changed; the canonical reader returned to legacy until the updated Plan artifact passes parity.",
    );
    const now = Date.now();
    const nextStatus = input.action === "approve_calibration" ? "approved" : "blocked";
    if (nextStatus === "approved") {
      const peers = await ctx.db.query("heliosPlanCalibrations").withIndex("by_page_view", (query) => query.eq("pageId", calibration.pageId).eq("viewKey", calibration.viewKey)).collect();
      for (const peer of peers) {
        if (peer._id !== calibration._id && peer.status !== "superseded") {
          await ctx.db.patch(peer._id, { status: "superseded", updatedAt: now });
        }
      }
    }
    await ctx.db.patch(calibration._id, {
      status: nextStatus,
      approvedBy: nextStatus === "approved" ? user._id : undefined,
      approvedAt: nextStatus === "approved" ? now : undefined,
      updatedAt: now,
    });
    await ctx.db.insert("heliosPlanReviewEvents", {
      companyId,
      projectId: project._id,
      packageId: calibration.packageId,
      runId: calibration.runId,
      calibrationId: calibration._id,
      action: input.action,
      reviewerUserId: user._id,
      reviewerName: user.name,
      previousValue: calibration.status,
      decisionValue: nextStatus,
      createdAt: now,
    });
    await finalizeRun(ctx, calibration.runId);
    return { runId: String(calibration.runId), calibrationId: String(calibration._id), status: nextStatus };
  },
});

export const loadPlanJob = internalQuery({
  args: { jobId: v.id("heliosPlanJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const [run, project, document] = await Promise.all([
      ctx.db.get(job.runId), ctx.db.get(job.projectId), ctx.db.get(job.documentId),
    ]);
    const isCanonicalShadow = Boolean(
      run?.inputMode === "canonical_pages" &&
      run.shadowOfRunId &&
      job.inputMode === "canonical_pages",
    );
    if (!run || (!run.isCurrent && !isCanonicalShadow) || !project || !document) return null;
    return { job, run, project, document };
  },
});

export const markPlanUploading = internalMutation({
  args: { jobId: v.id("heliosPlanJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "queued") return false;
    const now = Date.now();
    await ctx.db.patch(job._id, { status: "uploading", startedAt: now, updatedAt: now });
    await ctx.db.patch(job.runId, { status: "processing", updatedAt: now });
    return true;
  },
});

export const markPlanAnalyzing = internalMutation({
  args: { jobId: v.id("heliosPlanJobs"), openaiFileId: v.optional(v.string()), openaiResponseId: v.string(), model: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "uploading") return false;
    await ctx.db.patch(job._id, { status: "analyzing", openaiFileId: args.openaiFileId, openaiResponseId: args.openaiResponseId, model: args.model, updatedAt: Date.now() });
    return true;
  },
});

export const completePlanJob = internalMutation({
  args: { jobId: v.id("heliosPlanJobs"), model: v.string(), result: v.any() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "analyzing") return null;
    const [document, run] = await Promise.all([ctx.db.get(job.documentId), ctx.db.get(job.runId)]);
    if (!document || !run) throw new Error("Plan document or run not found.");
    const parsedLocal = parsePlanDocumentIntelligence(args.result);
    let parsed = parsedLocal;
    if (job.inputMode === "canonical_pages") {
      if (!job.engineeringPageIds?.length || parsedLocal.sourcePageCount !== job.engineeringPageIds.length) {
        throw new Error("Canonical Plan batch page coverage does not match its pinned input.");
      }
      const physicalPageByBatchPage = new Map<number, number>();
      for (const [index, engineeringPageId] of job.engineeringPageIds.entries()) {
        const engineeringPage = await ctx.db.get(engineeringPageId);
        if (!engineeringPage || engineeringPage.engineeringRecordId !== run.engineeringRecordId) {
          throw new Error("Canonical Plan batch lineage changed before completion.");
        }
        physicalPageByBatchPage.set(index + 1, engineeringPage.physicalPageNumber);
      }
      parsed = {
        ...parsedLocal,
        pages: parsedLocal.pages.map((page) => ({
          ...page,
          physicalPageNumber: physicalPageByBatchPage.get(page.physicalPageNumber) || page.physicalPageNumber,
        })),
        references: parsedLocal.references.map((reference) => ({
          ...reference,
          sourcePageNumber: physicalPageByBatchPage.get(reference.sourcePageNumber) || reference.sourcePageNumber,
        })),
      };
    }
    const now = Date.now();
    const pageIds = new Map<number, Id<"heliosPlanPages">>();
    for (const page of parsed.pages) {
      const pageId = await ctx.db.insert("heliosPlanPages", {
        companyId: job.companyId, projectId: job.projectId, packageId: job.packageId, runId: job.runId,
        documentId: job.documentId, documentName: document.fileName,
        physicalPageNumber: page.physicalPageNumber, pageKind: page.pageKind,
        printedPageNumber: page.printedPageNumber, sheetNumber: page.sheetNumber, title: page.title,
        discipline: page.discipline, subdiscipline: page.subdiscipline, issueDate: page.issueDate,
        revisionMarker: page.revisionMarker, addendumAssociation: page.addendumAssociation,
        modality: page.modality, processingVersion: PROCESSING_VERSION,
        titleBlockBoundary: page.titleBlockBoundary || undefined, titleBlockText: page.titleBlockText,
        confidence: page.confidence, unresolvedIssues: page.unresolvedIssues,
        views: page.views.map((view) => ({
          viewKey: view.viewKey,
          viewType: view.viewType,
          label: view.label,
          boundary: view.boundary,
          northOrientation: view.northOrientation,
          measurable: view.measurable,
          unresolvedIssues: view.unresolvedIssues,
        })),
        createdAt: now,
      });
      pageIds.set(page.physicalPageNumber, pageId);
      for (const view of page.views.filter((candidate) => candidate.measurable)) {
        const uniqueScales = new Set(view.scaleCandidates.map((candidate) => `${candidate.scale}|${candidate.units}`));
        if (!view.scaleCandidates.length) {
          await ctx.db.insert("heliosPlanCalibrations", {
            companyId: job.companyId, projectId: job.projectId, packageId: job.packageId, runId: job.runId,
            pageId, viewKey: view.viewKey, source: "stated_numeric", scale: "", units: "", sourceRegion: "",
            confidence: 0, status: "blocked", createdAt: now, updatedAt: now,
          });
        } else {
          for (const candidate of view.scaleCandidates) {
            await ctx.db.insert("heliosPlanCalibrations", {
              companyId: job.companyId, projectId: job.projectId, packageId: job.packageId, runId: job.runId,
              pageId, viewKey: view.viewKey, source: candidate.source, scale: candidate.scale, units: candidate.units,
              sourceRegion: candidate.sourceRegion, confidence: candidate.confidence,
              status: uniqueScales.size > 1 ? "conflicted" : "proposed", createdAt: now, updatedAt: now,
            });
          }
        }
      }
    }
    for (const reference of parsed.references) {
      const sourcePageId = pageIds.get(reference.sourcePageNumber);
      if (!sourcePageId) continue;
      await ctx.db.insert("heliosPlanReferences", {
        companyId: job.companyId, projectId: job.projectId, packageId: job.packageId, runId: job.runId,
        sourcePageId, sourceSheetNumber: reference.sourceSheetNumber, sourceViewKey: reference.sourceViewKey,
        referenceType: reference.referenceType, label: reference.label, targetSheetNumber: reference.targetSheetNumber,
        targetDetail: reference.targetDetail, targetSpecification: reference.targetSpecification, locator: reference.locator,
        status: "unresolved", confidence: reference.confidence, createdAt: now,
      });
    }
    await ctx.db.patch(job._id, { status: "completed", model: args.model, completedAt: now, updatedAt: now });
    await finalizeRun(ctx, job.runId);
    return null;
  },
});

export const failPlanJob = internalMutation({
  args: { jobId: v.id("heliosPlanJobs"), error: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || ["completed", "failed"].includes(job.status)) return null;
    const now = Date.now();
    await ctx.db.patch(job._id, { status: "failed", error: args.error.slice(0, 600), completedAt: now, updatedAt: now });
    await finalizeRun(ctx, job.runId);
    return null;
  },
});
