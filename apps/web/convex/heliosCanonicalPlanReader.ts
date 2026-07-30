import { buildHeliosEngineeringParityFingerprint } from "@opsslate/helios-domain";
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
  planRun: Doc<"heliosPlanRuns">;
  pages: Doc<"heliosPlanPages">[];
  references: Doc<"heliosPlanReferences">[];
  calibrations: Doc<"heliosPlanCalibrations">[];
  sheetDecisions: Doc<"heliosPlanSheetDecisions">[];
  reader: {
    mode: "legacy" | "canonical" | "canonical_writer";
    activationId?: string;
    writerActivationId?: string;
    rollbackPlanRunId?: string;
    fallbackReason?: string;
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

function writerBlocked(message: string): never {
  throw new Error(`Canonical Plan writer activation blocked: ${message}`);
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

function planOutputFingerprint(
  run: Doc<"heliosPlanRuns">,
  rows: Awaited<ReturnType<typeof loadPlanRows>>,
) {
  return buildHeliosEngineeringParityFingerprint({
    run: {
      id: String(run._id),
      packageId: String(run.packageId),
      packageRevision: run.packageRevision,
      inputMode: run.inputMode || "legacy_pdf",
      shadowOfRunId: run.shadowOfRunId ? String(run.shadowOfRunId) : "",
      engineeringRecordId: run.engineeringRecordId
        ? String(run.engineeringRecordId)
        : "",
      canonicalInputFingerprint: run.canonicalInputFingerprint || "",
      sourceFingerprint: run.sourceFingerprint,
      status: run.status,
    },
    pages: rows.pages
      .map((row) => fingerprintEngineeringRecord(row))
      .sort(),
    views: rows.pages
      .flatMap((page) =>
        page.views.map((view) =>
          fingerprintPlanView({
            pageId: String(page._id),
            physicalPageNumber: page.physicalPageNumber,
            view,
          }),
        ),
      )
      .sort(),
    references: rows.references
      .map((row) => fingerprintEngineeringRecord(row))
      .sort(),
    calibrations: rows.calibrations
      .map((row) => fingerprintEngineeringRecord(row))
      .sort(),
    sheetDecisions: rows.sheetDecisions
      .map((row) => fingerprintEngineeringRecord(row))
      .sort(),
  });
}

type CanonicalWriterBasis = {
  pilot: Doc<"heliosCanonicalPlanWriterPilots">;
  legacyPlanRun: Doc<"heliosPlanRuns">;
  canonicalPlanRun: Doc<"heliosPlanRuns">;
  record: Doc<"heliosEngineeringRecords">;
  artifact: Doc<"heliosEngineeringArtifacts">;
  rows: Awaited<ReturnType<typeof loadPlanRows>>;
  outputFingerprint: string;
  pageCount: number;
  viewCount: number;
  referenceCount: number;
  calibrationCount: number;
  sheetDecisionCount: number;
};

async function canonicalWriterBasis(
  ctx: ReaderCtx,
  project: Doc<"heliosProjects">,
  pilot: Doc<"heliosCanonicalPlanWriterPilots">,
): Promise<{ basis?: CanonicalWriterBasis; issues: string[] }> {
  const issues: string[] = [];
  const [bidPackage, legacyPlanRun, canonicalPlanRun, record] = await Promise.all([
    ctx.db.get(pilot.packageId),
    ctx.db.get(pilot.authoritativePlanRunId),
    ctx.db.get(pilot.shadowPlanRunId),
    ctx.db.get(pilot.engineeringRecordId),
  ]);
  if (
    !project.activePackageId ||
    project.activePackageId !== pilot.packageId ||
    project.currentPackageRevision !== bidPackage?.revision
  ) {
    issues.push("The active bid package or revision changed after the writer pilot.");
  }
  if (!bidPackage || bidPackage.projectId !== project._id) {
    issues.push("The writer pilot bid package is unavailable.");
  }
  if (
    !pilot.isCurrent ||
    pilot.status !== "ready_for_review" ||
    pilot.activationEligible !== true ||
    pilot.semanticReviewRequired !== false ||
    pilot.semanticReconciliationStatus !== "completed" ||
    pilot.semanticSource !== "canonical_plan_artifact" ||
    pilot.issues.length > 0
  ) {
    issues.push("The current writer pilot has not passed the governed semantic activation gate.");
  }
  if (
    !legacyPlanRun ||
    !legacyPlanRun.isCurrent ||
    legacyPlanRun.packageId !== pilot.packageId ||
    legacyPlanRun.packageRevision !== bidPackage?.revision ||
    legacyPlanRun.status !== "ready_for_review"
  ) {
    issues.push("The legacy rollback Plan run is missing, stale, or no longer current.");
  }
  if (
    !canonicalPlanRun ||
    canonicalPlanRun.isCurrent ||
    canonicalPlanRun.inputMode !== "canonical_pages" ||
    canonicalPlanRun.shadowOfRunId !== pilot.authoritativePlanRunId ||
    canonicalPlanRun.engineeringRecordId !== pilot.engineeringRecordId ||
    canonicalPlanRun.canonicalInputFingerprint !== pilot.inputFingerprint ||
    canonicalPlanRun.packageId !== pilot.packageId ||
    canonicalPlanRun.packageRevision !== bidPackage?.revision ||
    canonicalPlanRun.status !== "ready_for_review"
  ) {
    issues.push("The canonical Plan output is missing, stale, or no longer a non-current shadow.");
  }
  if (
    !record ||
    !record.isCurrent ||
    record.status !== "ready" ||
    record.packageId !== pilot.packageId
  ) {
    issues.push("The canonical engineering record is missing, stale, or not ready.");
  }
  if (
    legacyPlanRun &&
    canonicalPlanRun &&
    legacyPlanRun.sourceFingerprint !== canonicalPlanRun.sourceFingerprint
  ) {
    issues.push("The canonical and legacy Plan outputs no longer share one source fingerprint.");
  }

  const artifact = record && legacyPlanRun
    ? await ctx.db
        .query("heliosEngineeringArtifacts")
        .withIndex("by_authoritative_record", (query) =>
          query
            .eq("engineeringRecordId", record._id)
            .eq("authoritativeRecordType", "heliosPlanRuns")
            .eq("authoritativeRecordId", String(legacyPlanRun._id)),
        )
        .first()
    : null;
  if (
    !artifact ||
    artifact.kind !== "plan_inventory" ||
    artifact.status !== "ready" ||
    artifact.sourceFingerprint !== legacyPlanRun?.sourceFingerprint
  ) {
    issues.push("The governed Plan inventory artifact is missing or on another source fingerprint.");
  }
  if (issues.length || !legacyPlanRun || !canonicalPlanRun || !record || !artifact) {
    return { issues };
  }

  const rows = await loadPlanRows(ctx, canonicalPlanRun._id);
  const pageCount = rows.pages.length;
  const viewCount = rows.pages.reduce((sum, page) => sum + page.views.length, 0);
  const referenceCount = rows.references.length;
  const calibrationCount = rows.calibrations.length;
  const sheetDecisionCount = rows.sheetDecisions.length;
  if (
    pageCount !== pilot.canonicalPageCount ||
    pageCount !== pilot.outputPageCount ||
    pilot.exactPageIdentityCount !== pageCount ||
    pilot.pageMetadataMatchCount !== pageCount ||
    pilot.viewSemanticPageMatchCount !== pageCount
  ) {
    issues.push("Canonical page identity, metadata, or view parity changed after approval.");
  }
  if (
    viewCount !== pilot.authoritativeViewCount ||
    viewCount !== pilot.shadowViewCount ||
    referenceCount !== pilot.authoritativeReferenceCount ||
    referenceCount !== pilot.shadowReferenceCount ||
    pilot.referenceSemanticMatchCount !== referenceCount ||
    calibrationCount !== (pilot.authoritativeCalibrationCount || 0) ||
    calibrationCount !== (pilot.shadowCalibrationCount || 0) ||
    pilot.calibrationSemanticMatchCount !== calibrationCount
  ) {
    issues.push("Canonical view, reference, or calibration parity changed after approval.");
  }
  return {
    issues,
    basis: issues.length
      ? undefined
      : {
          pilot,
          legacyPlanRun,
          canonicalPlanRun,
          record,
          artifact,
          rows,
          outputFingerprint: planOutputFingerprint(canonicalPlanRun, rows),
          pageCount,
          viewCount,
          referenceCount,
          calibrationCount,
          sheetDecisionCount,
        },
  };
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
  const writerActivation = await ctx.db
    .query("heliosCanonicalPlanWriterActivations")
    .withIndex("by_project_current", (query) =>
      query.eq("projectId", project._id).eq("isCurrent", true),
    )
    .first();
  if (writerActivation?.mode === "active") {
    const pilot = await ctx.db.get(writerActivation.pilotId);
    const candidate = pilot
      ? await canonicalWriterBasis(ctx, project, pilot)
      : { issues: ["The activated canonical writer pilot is unavailable."] };
    const basis = candidate.basis;
    const activationIssues = [...candidate.issues];
    if (
      basis &&
      (writerActivation.packageId !== basis.legacyPlanRun.packageId ||
        writerActivation.packageRevision !== basis.legacyPlanRun.packageRevision ||
        writerActivation.engineeringRecordId !== basis.record._id ||
        writerActivation.artifactId !== basis.artifact._id ||
        writerActivation.legacyPlanRunId !== basis.legacyPlanRun._id ||
        writerActivation.canonicalPlanRunId !== basis.canonicalPlanRun._id ||
        writerActivation.sourceFingerprint !== basis.legacyPlanRun.sourceFingerprint ||
        writerActivation.canonicalInputFingerprint !== basis.pilot.inputFingerprint ||
        writerActivation.canonicalOutputFingerprint !== basis.outputFingerprint ||
        writerActivation.pageCount !== basis.pageCount ||
        writerActivation.viewCount !== basis.viewCount ||
        writerActivation.referenceCount !== basis.referenceCount ||
        writerActivation.calibrationCount !== basis.calibrationCount ||
        writerActivation.sheetDecisionCount !== basis.sheetDecisionCount)
    ) {
      activationIssues.push("The activated writer authorization no longer matches its exact output lineage.");
    }
    if (basis && activationIssues.length === 0) {
      return {
        planRun: basis.canonicalPlanRun,
        ...basis.rows,
        reader: {
          mode: "canonical_writer",
          writerActivationId: String(writerActivation._id),
          rollbackPlanRunId: String(basis.legacyPlanRun._id),
          engineeringRecordId: String(basis.record._id),
          artifactId: String(basis.artifact._id),
          authorizedRecordCount:
            basis.pageCount +
            basis.viewCount +
            basis.referenceCount +
            basis.calibrationCount +
            basis.sheetDecisionCount,
          fingerprintMatchCount:
            basis.pageCount +
            basis.viewCount +
            basis.referenceCount +
            basis.calibrationCount +
            basis.sheetDecisionCount,
        },
      };
    }

    const rollbackRun =
      project.activePackageId === writerActivation.packageId
        ? await ctx.db.get(writerActivation.legacyPlanRunId)
        : null;
    const fallbackRun =
      rollbackRun && rollbackRun.packageId === project.activePackageId
        ? rollbackRun
        : planRun;
    const rows = await loadPlanRows(ctx, fallbackRun._id);
    return {
      planRun: fallbackRun,
      ...rows,
      reader: {
        mode: "legacy",
        writerActivationId: String(writerActivation._id),
        rollbackPlanRunId: String(fallbackRun._id),
        fallbackReason:
          activationIssues.join(" ") ||
          "The canonical writer lineage changed, so Helios returned to the legacy Plan run.",
      },
    };
  }

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
    return { planRun, ...rows, reader: { mode: "legacy" } };
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
    planRun,
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

async function copyLegacySheetDecisions(
  ctx: MutationCtx,
  basis: CanonicalWriterBasis,
) {
  const legacyRows = await loadPlanRows(ctx, basis.legacyPlanRun._id);
  const canonicalByIdentity = new Map<string, Id<"heliosPlanPages">>();
  for (const page of basis.rows.pages) {
    const identity = `${page.documentId}:${page.physicalPageNumber}`;
    if (canonicalByIdentity.has(identity)) {
      writerBlocked(`canonical page identity ${identity} is duplicated.`);
    }
    canonicalByIdentity.set(identity, page._id);
  }
  const legacyPageById = new Map(legacyRows.pages.map((page) => [String(page._id), page]));
  const mapPageId = (pageId: Id<"heliosPlanPages">) => {
    const legacyPage = legacyPageById.get(String(pageId));
    if (!legacyPage) writerBlocked(`sheet decision page ${pageId} is not in the legacy Plan run.`);
    const canonicalPageId = canonicalByIdentity.get(
      `${legacyPage.documentId}:${legacyPage.physicalPageNumber}`,
    );
    if (!canonicalPageId) {
      writerBlocked(
        `${legacyPage.documentName} page ${legacyPage.physicalPageNumber} has no canonical decision target.`,
      );
    }
    return canonicalPageId;
  };

  for (const decision of basis.rows.sheetDecisions) {
    await ctx.db.patch(decision._id, { isCurrent: false, updatedAt: Date.now() });
  }
  for (const decision of legacyRows.sheetDecisions) {
    await ctx.db.insert("heliosPlanSheetDecisions", {
      companyId: decision.companyId,
      projectId: decision.projectId,
      packageId: decision.packageId,
      runId: basis.canonicalPlanRun._id,
      normalizedSheetNumber: decision.normalizedSheetNumber,
      sheetNumber: decision.sheetNumber,
      decision: decision.decision,
      status: decision.status,
      primaryPageId: decision.primaryPageId
        ? mapPageId(decision.primaryPageId)
        : undefined,
      referencePageIds: decision.referencePageIds.map(mapPageId),
      reason: decision.reason,
      reviewerUserId: decision.reviewerUserId,
      reviewerName: decision.reviewerName,
      isCurrent: true,
      createdAt: decision.createdAt,
      updatedAt: decision.updatedAt,
    });
  }
  return legacyRows.sheetDecisions.length;
}

export async function retirePlanWriterActivation(
  ctx: MutationCtx,
  projectId: Id<"heliosProjects">,
  reason: string,
) {
  const activation = await ctx.db
    .query("heliosCanonicalPlanWriterActivations")
    .withIndex("by_project_current", (query) =>
      query.eq("projectId", projectId).eq("isCurrent", true),
    )
    .first();
  if (!activation || activation.mode !== "active") return null;
  const now = Date.now();
  await ctx.db.patch(activation._id, { isCurrent: false });
  const rollbackId = await ctx.db.insert("heliosCanonicalPlanWriterActivations", {
    companyId: activation.companyId,
    projectId: activation.projectId,
    packageId: activation.packageId,
    packageRevision: activation.packageRevision,
    engineeringRecordId: activation.engineeringRecordId,
    artifactId: activation.artifactId,
    pilotId: activation.pilotId,
    legacyPlanRunId: activation.legacyPlanRunId,
    canonicalPlanRunId: activation.canonicalPlanRunId,
    mode: "rolled_back",
    isCurrent: true,
    sourceFingerprint: activation.sourceFingerprint,
    canonicalInputFingerprint: activation.canonicalInputFingerprint,
    canonicalOutputFingerprint: activation.canonicalOutputFingerprint,
    pageCount: activation.pageCount,
    viewCount: activation.viewCount,
    referenceCount: activation.referenceCount,
    calibrationCount: activation.calibrationCount,
    sheetDecisionCount: activation.sheetDecisionCount,
    issues: [...activation.issues, reason.slice(0, 500)],
    createdBy: activation.createdBy,
    createdAt: now,
    rolledBackAt: now,
  });
  return {
    activationId: activation._id,
    rollbackId,
    legacyPlanRunId: activation.legacyPlanRunId,
    canonicalPlanRunId: activation.canonicalPlanRunId,
  };
}

export const stageCanonicalPlanWriterActivation = internalMutation({
  args: { projectId: v.string(), activate: v.boolean() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) {
      writerBlocked("the project or active bid package was not found.");
    }
    const pilot = await ctx.db
      .query("heliosCanonicalPlanWriterPilots")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", project._id).eq("isCurrent", true),
      )
      .first();
    if (!pilot) writerBlocked("the current canonical writer pilot was not found.");
    const candidate = await canonicalWriterBasis(ctx, project, pilot);
    if (!candidate.basis || candidate.issues.length) {
      writerBlocked(candidate.issues.join(" ") || "the writer pilot is not activation eligible.");
    }

    await copyLegacySheetDecisions(ctx, candidate.basis);
    const canonicalRows = await loadPlanRows(ctx, candidate.basis.canonicalPlanRun._id);
    const canonicalOutputFingerprint = planOutputFingerprint(
      candidate.basis.canonicalPlanRun,
      canonicalRows,
    );
    const pageCount = canonicalRows.pages.length;
    const viewCount = canonicalRows.pages.reduce(
      (sum, page) => sum + page.views.length,
      0,
    );
    const referenceCount = canonicalRows.references.length;
    const calibrationCount = canonicalRows.calibrations.length;
    const sheetDecisionCount = canonicalRows.sheetDecisions.length;

    const current = await ctx.db
      .query("heliosCanonicalPlanWriterActivations")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", project._id).eq("isCurrent", true),
      )
      .collect();
    for (const row of current) await ctx.db.patch(row._id, { isCurrent: false });
    if (args.activate) {
      await retirePlanReaderActivation(
        ctx,
        project._id,
        "Canonical Plan writer output was activated; the earlier reader pilot is retained as rollback history.",
      );
    }
    const now = Date.now();
    const activationId = await ctx.db.insert("heliosCanonicalPlanWriterActivations", {
      companyId: project.companyId,
      projectId: project._id,
      packageId: candidate.basis.legacyPlanRun.packageId,
      packageRevision: candidate.basis.legacyPlanRun.packageRevision,
      engineeringRecordId: candidate.basis.record._id,
      artifactId: candidate.basis.artifact._id,
      pilotId: candidate.basis.pilot._id,
      legacyPlanRunId: candidate.basis.legacyPlanRun._id,
      canonicalPlanRunId: candidate.basis.canonicalPlanRun._id,
      mode: args.activate ? "active" : "shadow",
      isCurrent: true,
      sourceFingerprint: candidate.basis.legacyPlanRun.sourceFingerprint,
      canonicalInputFingerprint: candidate.basis.pilot.inputFingerprint,
      canonicalOutputFingerprint,
      pageCount,
      viewCount,
      referenceCount,
      calibrationCount,
      sheetDecisionCount,
      issues: [],
      createdBy: project.createdBy,
      createdAt: now,
      activatedAt: args.activate ? now : undefined,
    });
    return {
      activationId: String(activationId),
      mode: args.activate ? "active" as const : "shadow" as const,
      projectId: String(project._id),
      packageId: String(candidate.basis.legacyPlanRun.packageId),
      packageRevision: candidate.basis.legacyPlanRun.packageRevision,
      legacyPlanRunId: String(candidate.basis.legacyPlanRun._id),
      canonicalPlanRunId: String(candidate.basis.canonicalPlanRun._id),
      engineeringRecordId: String(candidate.basis.record._id),
      artifactId: String(candidate.basis.artifact._id),
      canonicalInputFingerprint: candidate.basis.pilot.inputFingerprint,
      canonicalOutputFingerprint,
      pageCount,
      viewCount,
      referenceCount,
      calibrationCount,
      sheetDecisionCount,
      originalPdfReads: 0,
      openAiCalls: 0,
    };
  },
});

export const getCanonicalPlanWriterActivation = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project) return null;
    const activation = await ctx.db
      .query("heliosCanonicalPlanWriterActivations")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", project._id).eq("isCurrent", true),
      )
      .first();
    if (!activation) return null;
    const pilot = await ctx.db.get(activation.pilotId);
    const candidate = pilot
      ? await canonicalWriterBasis(ctx, project, pilot)
      : { issues: ["The activated canonical writer pilot is unavailable."] };
    const basis = candidate.basis;
    const exact = Boolean(
      activation.mode === "active" &&
      basis &&
      candidate.issues.length === 0 &&
      activation.packageId === basis.legacyPlanRun.packageId &&
      activation.packageRevision === basis.legacyPlanRun.packageRevision &&
      activation.engineeringRecordId === basis.record._id &&
      activation.artifactId === basis.artifact._id &&
      activation.legacyPlanRunId === basis.legacyPlanRun._id &&
      activation.canonicalPlanRunId === basis.canonicalPlanRun._id &&
      activation.sourceFingerprint === basis.legacyPlanRun.sourceFingerprint &&
      activation.canonicalInputFingerprint === basis.pilot.inputFingerprint &&
      activation.canonicalOutputFingerprint === basis.outputFingerprint &&
      activation.pageCount === basis.pageCount &&
      activation.viewCount === basis.viewCount &&
      activation.referenceCount === basis.referenceCount &&
      activation.calibrationCount === basis.calibrationCount &&
      activation.sheetDecisionCount === basis.sheetDecisionCount
    );
    return {
      activation,
      effectiveMode: exact ? "canonical_writer" as const : "legacy" as const,
      exact,
      issues: exact ? [] : candidate.issues.length
        ? candidate.issues
        : ["The activation identities or output fingerprint no longer match."],
      originalPdfReads: 0,
      openAiCalls: 0,
    };
  },
});

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
