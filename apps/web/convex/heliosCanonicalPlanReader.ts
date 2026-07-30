import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  fingerprintEngineeringRecord,
  fingerprintPlanView,
} from "./heliosEngineeringParityPayloads";

const WORKFLOW = "plan_reconstruction" as const;
const REQUIRED_PARITY_AREAS = [
  "plan_pages",
  "plan_views",
  "plan_calibrations",
  "plan_references",
] as const;

type ReaderCtx = QueryCtx | MutationCtx;

export type HeliosPlanReaderRows = {
  pages: Doc<"heliosPlanPages">[];
  references: Doc<"heliosPlanReferences">[];
  calibrations: Doc<"heliosPlanCalibrations">[];
  sheetDecisions: Doc<"heliosPlanSheetDecisions">[];
  reader: {
    mode: "legacy" | "canonical";
    activationId?: string;
    engineeringRecordId?: string;
    artifactId?: string;
    parityRunId?: string;
    authorizedRecordCount?: number;
    fingerprintMatchCount?: number;
  };
};

type CanonicalCandidate = {
  project: Doc<"heliosProjects">;
  planRun: Doc<"heliosPlanRuns">;
  record: Doc<"heliosEngineeringRecords">;
  artifact: Doc<"heliosEngineeringArtifacts">;
  parity: Doc<"heliosEngineeringParityRuns">;
  cutover: Doc<"heliosCanonicalCutoverRuns">;
  pages: Doc<"heliosPlanPages">[];
  references: Doc<"heliosPlanReferences">[];
  calibrations: Doc<"heliosPlanCalibrations">[];
  sheetDecisions: Doc<"heliosPlanSheetDecisions">[];
  authorizedRecordCount: number;
  fingerprintMatchCount: number;
};

function fail(message: string): never {
  throw new Error(`Canonical Plan reader blocked: ${message}`);
}

function exactFingerprintMap(
  provenance: Doc<"heliosEngineeringProvenance">[],
  recordType: string,
) {
  const rows = provenance.filter((row) => row.recordType === recordType);
  const fingerprints = new Map<string, string>();
  for (const row of rows) {
    if (!row.recordFingerprint) fail(`${recordType} ${row.recordId} has no canonical fingerprint.`);
    if (fingerprints.has(row.recordId)) fail(`${recordType} ${row.recordId} is registered more than once.`);
    fingerprints.set(row.recordId, row.recordFingerprint);
  }
  return fingerprints;
}

function verifyRecords(
  label: string,
  canonical: Map<string, string>,
  authoritative: Array<{ id: string; fingerprint: string }>,
) {
  if (canonical.size !== authoritative.length) {
    fail(`${label} coverage changed (${canonical.size} canonical, ${authoritative.length} current).`);
  }
  for (const record of authoritative) {
    const fingerprint = canonical.get(record.id);
    if (!fingerprint) fail(`${label} ${record.id} is not authorized by the canonical artifact.`);
    if (fingerprint !== record.fingerprint) fail(`${label} ${record.id} changed after parity approval.`);
  }
}

async function loadPlanRows(ctx: ReaderCtx, runId: Id<"heliosPlanRuns">) {
  const [pages, references, calibrations, sheetDecisions] = await Promise.all([
    ctx.db
      .query("heliosPlanPages")
      .withIndex("by_run_page", (query) => query.eq("runId", runId))
      .collect(),
    ctx.db
      .query("heliosPlanReferences")
      .withIndex("by_run", (query) => query.eq("runId", runId))
      .collect(),
    ctx.db
      .query("heliosPlanCalibrations")
      .withIndex("by_run", (query) => query.eq("runId", runId))
      .collect(),
    ctx.db
      .query("heliosPlanSheetDecisions")
      .withIndex("by_run_current", (query) =>
        query.eq("runId", runId).eq("isCurrent", true),
      )
      .collect(),
  ]);
  return { pages, references, calibrations, sheetDecisions };
}

async function canonicalCandidate(
  ctx: ReaderCtx,
  project: Doc<"heliosProjects">,
  planRun: Doc<"heliosPlanRuns">,
): Promise<CanonicalCandidate> {
  if (!project.activePackageId || planRun.packageId !== project.activePackageId) {
    fail("the plan run is not on the active bid package.");
  }
  if (!planRun.isCurrent || planRun.status !== "ready_for_review") {
    fail("the current plan reconstruction is not ready for exact reader parity.");
  }

  const [record, parity, cutover] = await Promise.all([
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
    ctx.db
      .query("heliosCanonicalCutoverRuns")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", project._id).eq("isCurrent", true),
      )
      .first(),
  ]);
  if (!record || !record.isCurrent || record.packageId !== planRun.packageId) {
    fail("the active canonical engineering record is missing.");
  }
  if (
    !parity ||
    parity.status !== "passed" ||
    parity.engineeringRecordId !== record._id ||
    parity.packageId !== planRun.packageId
  ) {
    fail("the current exact-parity run is missing or stale.");
  }
  for (const area of REQUIRED_PARITY_AREAS) {
    if (parity.areas.find((row) => row.area === area)?.status !== "passed") {
      fail(`${area} did not pass exact parity.`);
    }
  }
  if (
    !cutover ||
    cutover.status !== "shadow_ready" ||
    cutover.engineeringRecordId !== record._id ||
    cutover.parityRunId !== parity._id ||
    cutover.packageId !== planRun.packageId
  ) {
    fail("the canonical cutover audit is missing or stale.");
  }
  const workflow = cutover.workflows.find((row) => row.id === WORKFLOW);
  if (!workflow || workflow.status !== "shadow_ready" || workflow.blockers.length) {
    fail("Plan Reconstruction is not approved by the cutover audit.");
  }
  if (cutover.unresolvedDrawingAuthorityCount !== 0) {
    fail("drawing authority still has unresolved conflicts.");
  }

  const artifact = await ctx.db
    .query("heliosEngineeringArtifacts")
    .withIndex("by_authoritative_record", (query) =>
      query
        .eq("engineeringRecordId", record._id)
        .eq("authoritativeRecordType", "heliosPlanRuns")
        .eq("authoritativeRecordId", String(planRun._id)),
    )
    .first();
  if (
    !artifact ||
    artifact.kind !== "plan_inventory" ||
    artifact.status !== "ready" ||
    artifact.sourceFingerprint !== planRun.sourceFingerprint
  ) {
    fail("the canonical Plan artifact is missing, incomplete, or on another source fingerprint.");
  }

  const [rows, provenance] = await Promise.all([
    loadPlanRows(ctx, planRun._id),
    ctx.db
      .query("heliosEngineeringProvenance")
      .withIndex("by_artifact", (query) => query.eq("artifactId", artifact._id))
      .collect(),
  ]);
  const pageFingerprints = exactFingerprintMap(provenance, "heliosPlanPages");
  const viewFingerprints = exactFingerprintMap(provenance, "heliosPlanPageViews");
  const calibrationFingerprints = exactFingerprintMap(provenance, "heliosPlanCalibrations");
  const referenceFingerprints = exactFingerprintMap(provenance, "heliosPlanReferences");

  verifyRecords(
    "plan page",
    pageFingerprints,
    rows.pages.map((row) => ({
      id: String(row._id),
      fingerprint: fingerprintEngineeringRecord(row),
    })),
  );
  verifyRecords(
    "plan view",
    viewFingerprints,
    rows.pages.flatMap((page) =>
      page.views.map((view) => ({
        id: `${page._id}:${view.viewKey}`,
        fingerprint: fingerprintPlanView({
          pageId: String(page._id),
          physicalPageNumber: page.physicalPageNumber,
          view,
        }),
      })),
    ),
  );
  verifyRecords(
    "plan calibration",
    calibrationFingerprints,
    rows.calibrations.map((row) => ({
      id: String(row._id),
      fingerprint: fingerprintEngineeringRecord(row),
    })),
  );
  verifyRecords(
    "plan reference",
    referenceFingerprints,
    rows.references.map((row) => ({
      id: String(row._id),
      fingerprint: fingerprintEngineeringRecord(row),
    })),
  );

  const authorizedRecordCount =
    pageFingerprints.size +
    viewFingerprints.size +
    calibrationFingerprints.size +
    referenceFingerprints.size;
  return {
    project,
    planRun,
    record,
    artifact,
    parity,
    cutover,
    ...rows,
    authorizedRecordCount,
    fingerprintMatchCount: authorizedRecordCount,
  };
}

export async function readPlanRows(
  ctx: ReaderCtx,
  project: Doc<"heliosProjects">,
  planRun: Doc<"heliosPlanRuns">,
): Promise<HeliosPlanReaderRows> {
  const activation = await ctx.db
    .query("heliosCanonicalReaderActivations")
    .withIndex("by_project_workflow_current", (query) =>
      query
        .eq("projectId", project._id)
        .eq("workflow", WORKFLOW)
        .eq("isCurrent", true),
    )
    .first();
  if (!activation || activation.mode !== "active") {
    const rows = await loadPlanRows(ctx, planRun._id);
    return { ...rows, reader: { mode: "legacy" } };
  }

  const candidate = await canonicalCandidate(ctx, project, planRun);
  if (
    activation.packageId !== planRun.packageId ||
    activation.planRunId !== planRun._id ||
    activation.engineeringRecordId !== candidate.record._id ||
    activation.artifactId !== candidate.artifact._id ||
    activation.parityRunId !== candidate.parity._id ||
    activation.cutoverRunId !== candidate.cutover._id ||
    activation.sourceFingerprint !== planRun.sourceFingerprint
  ) {
    fail("the active reader authorization no longer matches the current project basis.");
  }
  return {
    pages: candidate.pages,
    references: candidate.references,
    calibrations: candidate.calibrations,
    sheetDecisions: candidate.sheetDecisions,
    reader: {
      mode: "canonical",
      activationId: String(activation._id),
      engineeringRecordId: String(candidate.record._id),
      artifactId: String(candidate.artifact._id),
      parityRunId: String(candidate.parity._id),
      authorizedRecordCount: candidate.authorizedRecordCount,
      fingerprintMatchCount: candidate.fingerprintMatchCount,
    },
  };
}

export async function retirePlanReaderActivation(
  ctx: MutationCtx,
  projectId: Id<"heliosProjects">,
  reason: string,
) {
  const activation = await ctx.db
    .query("heliosCanonicalReaderActivations")
    .withIndex("by_project_workflow_current", (query) =>
      query
        .eq("projectId", projectId)
        .eq("workflow", WORKFLOW)
        .eq("isCurrent", true),
    )
    .first();
  if (!activation || activation.mode !== "active") return null;
  const now = Date.now();
  await ctx.db.patch(activation._id, { isCurrent: false });
  const rollbackId = await ctx.db.insert("heliosCanonicalReaderActivations", {
    companyId: activation.companyId,
    projectId: activation.projectId,
    packageId: activation.packageId,
    engineeringRecordId: activation.engineeringRecordId,
    artifactId: activation.artifactId,
    parityRunId: activation.parityRunId,
    cutoverRunId: activation.cutoverRunId,
    planRunId: activation.planRunId,
    workflow: activation.workflow,
    mode: "rolled_back",
    isCurrent: true,
    sourceFingerprint: activation.sourceFingerprint,
    requiredAreaCount: activation.requiredAreaCount,
    verifiedAreaCount: activation.verifiedAreaCount,
    authorizedRecordCount: activation.authorizedRecordCount,
    fingerprintMatchCount: activation.fingerprintMatchCount,
    issues: [...activation.issues, reason.slice(0, 500)],
    createdBy: activation.createdBy,
    createdAt: now,
  });
  return rollbackId;
}

export const stagePlanReaderPilot = internalMutation({
  args: { projectId: v.string(), activate: v.boolean() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) fail("the project or active bid package was not found.");
    const planRun = await ctx.db
      .query("heliosPlanRuns")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first();
    if (!planRun) fail("the current Plan Intelligence run was not found.");
    const candidate = await canonicalCandidate(ctx, project, planRun);
    const current = await ctx.db
      .query("heliosCanonicalReaderActivations")
      .withIndex("by_project_workflow_current", (query) =>
        query
          .eq("projectId", project._id)
          .eq("workflow", WORKFLOW)
          .eq("isCurrent", true),
      )
      .collect();
    for (const row of current) {
      await ctx.db.patch(row._id, { isCurrent: false });
    }
    const now = Date.now();
    const activationId = await ctx.db.insert("heliosCanonicalReaderActivations", {
      companyId: project.companyId,
      projectId: project._id,
      packageId: planRun.packageId,
      engineeringRecordId: candidate.record._id,
      artifactId: candidate.artifact._id,
      parityRunId: candidate.parity._id,
      cutoverRunId: candidate.cutover._id,
      planRunId: planRun._id,
      workflow: WORKFLOW,
      mode: args.activate ? "active" : "shadow",
      isCurrent: true,
      sourceFingerprint: planRun.sourceFingerprint,
      requiredAreaCount: REQUIRED_PARITY_AREAS.length,
      verifiedAreaCount: REQUIRED_PARITY_AREAS.length,
      authorizedRecordCount: candidate.authorizedRecordCount,
      fingerprintMatchCount: candidate.fingerprintMatchCount,
      issues: [],
      createdBy: project.createdBy,
      createdAt: now,
      activatedAt: args.activate ? now : undefined,
    });
    return {
      activationId: String(activationId),
      mode: args.activate ? "active" as const : "shadow" as const,
      projectId: String(project._id),
      packageId: String(planRun.packageId),
      planRunId: String(planRun._id),
      engineeringRecordId: String(candidate.record._id),
      artifactId: String(candidate.artifact._id),
      parityRunId: String(candidate.parity._id),
      cutoverRunId: String(candidate.cutover._id),
      sourceFingerprint: planRun.sourceFingerprint,
      requiredAreaCount: REQUIRED_PARITY_AREAS.length,
      verifiedAreaCount: REQUIRED_PARITY_AREAS.length,
      authorizedRecordCount: candidate.authorizedRecordCount,
      fingerprintMatchCount: candidate.fingerprintMatchCount,
      originalPdfReads: 0,
      openAiCalls: 0,
    };
  },
});

export const getPlanReaderPilot = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    return ctx.db
      .query("heliosCanonicalReaderActivations")
      .withIndex("by_project_workflow_current", (query) =>
        query
          .eq("projectId", projectId)
          .eq("workflow", WORKFLOW)
          .eq("isCurrent", true),
      )
      .first();
  },
});
