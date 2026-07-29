import {
  evaluateHeliosCanonicalCutover,
  type HeliosCanonicalCutoverInput,
  type HeliosEngineeringParityArea,
  type HeliosEngineeringParityStatus,
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
  const [sources, pages, textRows, assets, planRun] = record
    ? await Promise.all([
        ctx.db.query("heliosEngineeringSources").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
        ctx.db.query("heliosEngineeringPages").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
        ctx.db.query("heliosEngineeringTextSpans").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
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
  const sheetCounts = new Map<string, number>();
  for (const page of planPages.filter((page) => page.pageKind === "sheet" && page.sheetNumber.trim())) {
    const sheet = page.sheetNumber.trim().toUpperCase();
    sheetCounts.set(sheet, (sheetCounts.get(sheet) || 0) + 1);
  }
  const resolvedSheets = new Set(
    sheetDecisions
      .filter((decision) => decision.status === "resolved")
      .map((decision) => decision.normalizedSheetNumber),
  );
  const unresolvedDrawingAuthorityCount = [...sheetCounts.entries()]
    .filter(([sheet, count]) => count > 1 && !resolvedSheets.has(sheet))
    .length;

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
      canonicalTextSpanCount: textRows.length,
      canonicalAssetCount: assets.length,
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
      canonicalTextSpanCount: context.input.canonicalTextSpanCount,
      canonicalAssetCount: context.input.canonicalAssetCount,
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
