import {
  derivePlanSheetConflicts,
  evaluateHeliosCanonicalCutover,
  type HeliosCanonicalCutoverInput,
  type HeliosEngineeringParityArea,
  type HeliosEngineeringParityStatus,
  type HeliosPlanPage,
  type HeliosPlanSheetDecision,
  type HeliosPlanViewType,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

type CutoverContext = {
  companyId: Id<"companies">;
  projectId: Id<"heliosProjects">;
  packageId: Id<"heliosBidPackages">;
  createdBy: Id<"users">;
  engineeringRecordId?: Id<"heliosEngineeringRecords">;
  parityRunId?: Id<"heliosEngineeringParityRuns">;
  sourceFingerprint?: string;
  input: HeliosCanonicalCutoverInput;
};

function cutoverPlanPage(page: {
  _id: Id<"heliosPlanPages">;
  documentId: Id<"heliosDocuments">;
  documentName: string;
  physicalPageNumber: number;
  pageKind: "sheet" | "non_sheet" | "exception";
  printedPageNumber: string;
  sheetNumber: string;
  title: string;
  discipline: string;
  subdiscipline: string;
  issueDate: string;
  revisionMarker: string;
  addendumAssociation: string;
  modality: "vector" | "scanned" | "hybrid" | "unusable";
  titleBlockBoundary?: { x: number; y: number; width: number; height: number };
  titleBlockText: string;
  confidence: number;
  unresolvedIssues: string[];
  views: Array<{
    viewKey: string;
    viewType: string;
    label: string;
    boundary: { x: number; y: number; width: number; height: number };
    northOrientation: string;
    measurable: boolean;
    unresolvedIssues: string[];
  }>;
}): HeliosPlanPage {
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

function cutoverSheetDecision(decision: {
  _id: Id<"heliosPlanSheetDecisions">;
  normalizedSheetNumber: string;
  sheetNumber: string;
  decision: "apply_recommended" | "use_as_current" | "keep_both" | "escalate";
  status: "resolved" | "review_required" | "escalated";
  primaryPageId?: Id<"heliosPlanPages">;
  referencePageIds: Id<"heliosPlanPages">[];
  reason: string;
  reviewerName: string;
  updatedAt: number;
}): HeliosPlanSheetDecision {
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

function summarizeEvaluation(
  context: CutoverContext,
  evaluation: ReturnType<typeof evaluateHeliosCanonicalCutover>,
) {
  return {
    projectId: String(context.projectId),
    packageId: String(context.packageId),
    engineeringRecordId: context.engineeringRecordId
      ? String(context.engineeringRecordId)
      : undefined,
    parityRunId: context.parityRunId ? String(context.parityRunId) : undefined,
    sourceFingerprint: context.sourceFingerprint,
    input: context.input,
    status: evaluation.status,
    eligibleWorkflowCount: evaluation.eligibleWorkflowCount,
    blockedWorkflowCount: evaluation.blockedWorkflowCount,
    duplicatePdfUploadWorkflowCount: evaluation.duplicatePdfUploadWorkflowCount,
    workflows: evaluation.workflows.map((workflow) => ({
      id: workflow.id,
      status: workflow.status,
      blockers: workflow.blockers,
    })),
    blockers: evaluation.blockers,
  };
}

function parityAreas(
  areas: Array<{ area: HeliosEngineeringParityArea; status: HeliosEngineeringParityStatus }>,
) {
  return Object.fromEntries(areas.map((area) => [area.area, area.status])) as HeliosCanonicalCutoverInput["parityAreas"];
}

async function loadCutoverContext(
  ctx: QueryCtx | MutationCtx,
  projectIdValue: string,
): Promise<CutoverContext | null> {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  const project = projectId ? await ctx.db.get(projectId) : null;
  if (!project?.activePackageId) return null;
  const [bidPackage, record, parityRun] = await Promise.all([
    ctx.db.get(project.activePackageId),
    ctx.db
      .query("heliosEngineeringRecords")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first(),
    ctx.db
      .query("heliosEngineeringParityRuns")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", project._id).eq("isCurrent", true),
      )
      .first(),
  ]);
  if (!bidPackage || bidPackage.projectId !== project._id) return null;

  const validParity = record && parityRun?.engineeringRecordId === record._id ? parityRun : null;
  const [sources, pages, materializations, assets, planRun] = record
    ? await Promise.all([
        ctx.db.query("heliosEngineeringSources").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
        ctx.db.query("heliosEngineeringPages").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
        ctx.db.query("heliosEngineeringMaterializations").withIndex("by_record_status", (query) => query.eq("engineeringRecordId", record._id)).collect(),
        ctx.db.query("heliosEngineeringAssets").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
        ctx.db.query("heliosPlanRuns").withIndex("by_package_current", (query) => query.eq("packageId", project.activePackageId!).eq("isCurrent", true)).first(),
      ])
    : [[], [], [], [], null];
  const [planPages, sheetDecisions] = planRun
    ? await Promise.all([
        ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", planRun._id)).collect(),
        ctx.db.query("heliosPlanSheetDecisions").withIndex("by_run_current", (query) => query.eq("runId", planRun._id).eq("isCurrent", true)).collect(),
      ])
    : [[], []];
  const drawingAuthority = derivePlanSheetConflicts(
    planPages.map(cutoverPlanPage),
    sheetDecisions.map(cutoverSheetDecision),
  );
  const unresolvedDrawingAuthorityCount = drawingAuthority.filter(
    (authority) => authority.status !== "resolved",
  ).length;
  const currentAssets = assets.filter((row) => row.isCurrent !== false);
  const canonicalTextSpanCount = materializations.reduce(
    (sum, materialization) => sum + materialization.textSpanCount,
    0,
  );
  const planCanonicalPages = pages.filter((page) => page.sourcePlanPageId);
  const usablePlanPages = planCanonicalPages.filter((page) => page.modality !== "unusable");
  const canonicalTextReadyPageCount = usablePlanPages.filter((page) => {
    if (page.modality === "vector") return page.nativeTextStatus === "ready";
    if (page.modality === "scanned") return page.ocrStatus === "ready";
    return page.nativeTextStatus === "ready" && page.ocrStatus === "ready";
  }).length;
  const currentPageRenderIds = new Set(
    currentAssets
      .filter((asset) => asset.kind === "page_render" && !asset.viewKey)
      .map((asset) => String(asset.pageId)),
  );
  const canonicalPageRenderCount = usablePlanPages.filter((page) =>
    currentPageRenderIds.has(String(page._id)),
  ).length;
  const planPageById = new Map(planCanonicalPages.map((page) => [String(page.sourcePlanPageId), page]));
  const expectedViewKeys = new Set(
    planPages.flatMap((page) => {
      const canonical = planPageById.get(String(page._id));
      return canonical
        ? page.views.map((view) => `${String(canonical._id)}:${view.viewKey}`)
        : [];
    }),
  );
  const currentViewKeys = new Set(
    currentAssets
      .filter((asset) => asset.kind === "view_crop" && asset.viewKey)
      .map((asset) => `${String(asset.pageId)}:${asset.viewKey}`),
  );
  const canonicalViewCropCount = [...expectedViewKeys].filter((key) => currentViewKeys.has(key)).length;

  return {
    companyId: project.companyId,
    projectId: project._id,
    packageId: bidPackage._id,
    createdBy: project.createdBy,
    engineeringRecordId: record?._id,
    parityRunId: validParity?._id,
    sourceFingerprint: record?.sourceFingerprint,
    input: {
      engineeringRecordAvailable: Boolean(record),
      engineeringRecordCurrent: Boolean(record?.isCurrent),
      sourceCount: sources.length,
      immutableSourceCount: sources.filter((source) => source.immutable).length,
      canonicalPageCount: pages.length,
      usableCanonicalPageCount: usablePlanPages.length,
      canonicalTextSpanCount,
      canonicalTextReadyPageCount,
      canonicalAssetCount: currentAssets.length,
      canonicalPageRenderCount,
      canonicalExpectedViewCount: expectedViewKeys.size,
      canonicalViewCropCount,
      unresolvedDrawingAuthorityCount,
      coverage: record?.coverage || {
        documentIntelligence: "pending",
        planReconstruction: "pending",
        civilGeometry: "pending",
      },
      parityStatus: validParity?.status,
      parityAreas: validParity ? parityAreas(validParity.areas) : {},
    },
  };
}

export const auditCanonicalCutover = internalMutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const context = await loadCutoverContext(ctx, args.projectId);
    if (!context) throw new Error("Current Helios bid package not found.");
    const evaluation = evaluateHeliosCanonicalCutover(context.input);
    const currentRuns = await ctx.db
      .query("heliosCanonicalCutoverRuns")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", context.projectId).eq("isCurrent", true),
      )
      .collect();
    for (const run of currentRuns) await ctx.db.patch(run._id, { isCurrent: false });
    const createdAt = Date.now();
    const runId = await ctx.db.insert("heliosCanonicalCutoverRuns", {
      companyId: context.companyId,
      projectId: context.projectId,
      packageId: context.packageId,
      engineeringRecordId: context.engineeringRecordId,
      parityRunId: context.parityRunId,
      contractVersion: evaluation.contractVersion,
      sourceFingerprint: context.sourceFingerprint,
      status: evaluation.status,
      isCurrent: true,
      eligibleWorkflowCount: evaluation.eligibleWorkflowCount,
      blockedWorkflowCount: evaluation.blockedWorkflowCount,
      duplicatePdfUploadWorkflowCount: evaluation.duplicatePdfUploadWorkflowCount,
      sourceCount: context.input.sourceCount,
      immutableSourceCount: context.input.immutableSourceCount,
      canonicalPageCount: context.input.canonicalPageCount,
      usableCanonicalPageCount: context.input.usableCanonicalPageCount,
      canonicalTextSpanCount: context.input.canonicalTextSpanCount,
      canonicalTextReadyPageCount: context.input.canonicalTextReadyPageCount,
      canonicalAssetCount: context.input.canonicalAssetCount,
      canonicalPageRenderCount: context.input.canonicalPageRenderCount,
      canonicalExpectedViewCount: context.input.canonicalExpectedViewCount,
      canonicalViewCropCount: context.input.canonicalViewCropCount,
      unresolvedDrawingAuthorityCount: context.input.unresolvedDrawingAuthorityCount,
      workflows: evaluation.workflows,
      blockers: evaluation.blockers,
      createdBy: context.createdBy,
      createdAt,
    });
    return { runId: String(runId), createdAt, ...evaluation };
  },
});

export const getCanonicalCutoverReadiness = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const context = await loadCutoverContext(ctx, args.projectId);
    if (!context) return null;
    const latestRun = await ctx.db
      .query("heliosCanonicalCutoverRuns")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", context.projectId).eq("isCurrent", true),
      )
      .first();
    return {
      input: context.input,
      evaluation: evaluateHeliosCanonicalCutover(context.input),
      latestRun,
    };
  },
});

export const getCanonicalCutoverSummary = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const context = await loadCutoverContext(ctx, args.projectId);
    if (!context) return null;
    return summarizeEvaluation(context, evaluateHeliosCanonicalCutover(context.input));
  },
});
