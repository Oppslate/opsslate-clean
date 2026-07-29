import {
  HELIOS_EUCLID_SCHEMA_VERSION,
  HELIOS_EUCLID_SHADOW_ADAPTER,
  HELIOS_EUCLID_SHADOW_VERSION,
  buildHeliosEngineeringParityFingerprint,
  buildHeliosEuclidEntityChunks,
  buildHeliosEuclidShadowModel,
  euclidModelFingerprint,
  validateHeliosEuclidContract,
  type HeliosEuclidAuthority,
  type HeliosEuclidLegacyGeometryRecord,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { fingerprintEngineeringRecord } from "./heliosEngineeringParityPayloads";
import { scheduleEuclidHorizontalSolution } from "./heliosEuclidHorizontalSchedule";
import { scheduleEuclidVerticalSolution } from "./heliosEuclidVerticalSchedule";
import { deriveStoredPlanSheetConflicts } from "./heliosPlanAuthority";

const retryEuclidReference = makeFunctionReference<
  "mutation",
  { geometryRunId: Id<"heliosCivilGeometryRuns">; attempt?: number },
  unknown
>("heliosEuclidShadow:syncEuclidRunShadow");

type EuclidBasis = {
  run: Doc<"heliosCivilGeometryRuns">;
  engineeringRecord: Doc<"heliosEngineeringRecords">;
  artifact: Doc<"heliosEngineeringArtifacts">;
};

function modelKey(basis: EuclidBasis) {
  return [
    "euclid-shadow",
    `record:${String(basis.engineeringRecord._id)}`,
    `geometry:${String(basis.run._id)}`,
    `schema:${HELIOS_EUCLID_SCHEMA_VERSION}`,
    `adapter:${HELIOS_EUCLID_SHADOW_ADAPTER}`,
  ].join("|");
}

async function loadBasis(ctx: MutationCtx, geometryRunId: Id<"heliosCivilGeometryRuns">): Promise<EuclidBasis | null> {
  const run = await ctx.db.get(geometryRunId);
  if (!run?.isCurrent) return null;
  const engineeringRecord = await ctx.db
    .query("heliosEngineeringRecords")
    .withIndex("by_package_current", (query) => query.eq("packageId", run.packageId).eq("isCurrent", true))
    .first();
  if (!engineeringRecord || engineeringRecord.projectId !== run.projectId || engineeringRecord.packageRevision !== run.packageRevision) return null;
  const artifact = await ctx.db
    .query("heliosEngineeringArtifacts")
    .withIndex("by_authoritative_record", (query) => query
      .eq("engineeringRecordId", engineeringRecord._id)
      .eq("authoritativeRecordType", "heliosCivilGeometryRuns")
      .eq("authoritativeRecordId", String(run._id)))
    .first();
  if (!artifact || artifact.status === "superseded") return null;
  return { run, engineeringRecord, artifact };
}

async function supersedeCurrentModel(ctx: MutationCtx, packageId: Id<"heliosBidPackages">) {
  const current = await ctx.db
    .query("heliosEuclidModels")
    .withIndex("by_package_current", (query) => query.eq("packageId", packageId).eq("isCurrent", true))
    .first();
  if (current) await ctx.db.patch(current._id, { isCurrent: false, status: "superseded", updatedAt: Date.now() });
  return current;
}

async function storeTerminalFailure(
  ctx: MutationCtx,
  basis: EuclidBasis,
  message: string,
  code: string,
) {
  const key = modelKey(basis);
  const existing = await ctx.db.query("heliosEuclidModels").withIndex("by_model_key", (query) => query.eq("modelKey", key)).order("desc").first();
  if (existing?.isCurrent && existing.status === "failed" && existing.lastError === message) return String(existing._id);
  await supersedeCurrentModel(ctx, basis.run.packageId);
  const now = Date.now();
  const id = await ctx.db.insert("heliosEuclidModels", {
    companyId: basis.run.companyId,
    projectId: basis.run.projectId,
    packageId: basis.run.packageId,
    packageRevision: basis.run.packageRevision,
    engineeringRecordId: basis.engineeringRecord._id,
    engineeringArtifactId: basis.artifact._id,
    planRunId: basis.run.planRunId,
    geometryRunId: basis.run._id,
    modelKey: key,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: HELIOS_EUCLID_SHADOW_VERSION,
    adapterVersion: HELIOS_EUCLID_SHADOW_ADAPTER,
    canonicalVersion: 1,
    canonicalOrigin: "ingestion",
    sourceFingerprint: basis.engineeringRecord.sourceFingerprint,
    modelFingerprint: buildHeliosEngineeringParityFingerprint({ key, code, message }),
    status: "failed",
    isCurrent: true,
    shadowMode: true,
    sourceRecordCount: basis.run.recordCount,
    acceptedSourceRecordCount: basis.run.acceptedRecordCount,
    provenanceCount: 0,
    entityCount: 0,
    entityChunkCount: 0,
    issueCount: 1,
    blockingIssueCount: 1,
    validationStatus: "invalid",
    validationIssues: [{ code, message }],
    lastError: message.slice(0, 600),
    createdBy: basis.run.createdBy,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  });
  return String(id);
}

function asLegacyRecord(input: {
  record: Doc<"heliosCivilGeometryRecords">;
  provenance: Doc<"heliosEngineeringProvenance">;
  page: Doc<"heliosEngineeringPages">;
}): HeliosEuclidLegacyGeometryRecord {
  const { record, provenance, page } = input;
  return {
    id: String(record._id),
    documentId: String(record.documentId),
    engineeringSourceId: String(provenance.engineeringSourceId),
    engineeringPageId: String(page._id),
    physicalPageNumber: page.physicalPageNumber,
    sheetNumber: page.sheetNumber || undefined,
    viewKey: record.viewKey || undefined,
    geometryType: record.geometryType,
    authority: record.authority as HeliosEuclidAuthority,
    alignmentName: record.alignmentName,
    sourceLocator: provenance.sourceLocator || record.sourceLocator,
    units: record.units,
    confidence: Math.min(record.confidence, provenance.confidence),
    status: record.status,
    unresolvedIssues: record.unresolvedIssues,
    horizontalPoints: record.horizontalPoints,
    horizontalSegments: record.horizontalSegments,
    stationEquations: record.stationEquations,
    verticalPoints: record.verticalPoints,
    crossSectionPoints: record.crossSectionPoints,
    invertPoints: record.invertPoints,
    materialLayers: record.materialLayers,
  };
}

export const syncEuclidRunShadow = internalMutation({
  args: {
    geometryRunId: v.id("heliosCivilGeometryRuns"),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const basis = await loadBasis(ctx, args.geometryRunId);
    if (!basis) return { status: "not_ready" as const };
    const [geometryRecords, sheetDecisions, planPages] = await Promise.all([
      ctx.db
        .query("heliosCivilGeometryRecords")
        .withIndex("by_run_created", (query) => query.eq("geometryRunId", basis.run._id))
        .collect(),
      ctx.db
        .query("heliosPlanSheetDecisions")
        .withIndex("by_run_current", (query) => query.eq("runId", basis.run.planRunId).eq("isCurrent", true))
        .collect(),
      ctx.db
        .query("heliosPlanPages")
        .withIndex("by_run_page", (query) => query.eq("runId", basis.run.planRunId))
        .collect(),
    ]);
    const drawingAuthority = deriveStoredPlanSheetConflicts(planPages, sheetDecisions);
    const unresolvedAuthority = drawingAuthority
      .filter((conflict) => conflict.status !== "resolved")
      .map((conflict) => conflict.sheetNumber);
    if (unresolvedAuthority.length) {
      const message = `Resolve drawing authority before Euclid promotion: ${unresolvedAuthority.join(", ")}.`;
      const id = await storeTerminalFailure(ctx, basis, message, "drawing_authority_unresolved");
      return { status: "failed" as const, modelId: id };
    }
    const referencePageIds = new Set(
      drawingAuthority
        .filter((conflict) => conflict.status === "resolved")
        .flatMap((conflict) => conflict.referencePageIds),
    );
    const records = geometryRecords.filter((record) =>
      !["rejected", "superseded"].includes(record.status) && !referencePageIds.has(String(record.pageId)),
    );
    if (!records.length) {
      const id = await storeTerminalFailure(ctx, basis, "No active stored civil geometry records are available for Euclid shadow population.", "no_source_geometry");
      return { status: "failed" as const, modelId: id };
    }

    const canonicalProvenance = await ctx.db
      .query("heliosEngineeringProvenance")
      .withIndex("by_artifact", (query) => query.eq("artifactId", basis.artifact._id))
      .collect();
    const provenanceByRecord = new Map(
      canonicalProvenance
        .filter((row) => row.recordType === "heliosCivilGeometryRecords")
        .map((row) => [row.recordId, row]),
    );
    const pageIds = new Set(canonicalProvenance.flatMap((row) => row.pageId ? [String(row.pageId)] : []));
    const pages = await ctx.db
      .query("heliosEngineeringPages")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", basis.engineeringRecord._id))
      .collect();
    const pageById = new Map(pages.filter((page) => pageIds.has(String(page._id))).map((page) => [String(page._id), page]));
    const missing = records.filter((record) => {
      const source = provenanceByRecord.get(String(record._id));
      return !source?.pageId || !pageById.has(String(source.pageId));
    });
    if (missing.length) {
      const attempt = Math.max(0, Math.floor(args.attempt || 0));
      if (attempt < 3) {
        await ctx.scheduler.runAfter(2_000 * (2 ** attempt), retryEuclidReference, {
          geometryRunId: basis.run._id,
          attempt: attempt + 1,
        });
        return { status: "waiting_for_canonical_provenance" as const, missingCount: missing.length };
      }
      const id = await storeTerminalFailure(
        ctx,
        basis,
        `${missing.length} civil geometry records lack canonical page provenance after bounded retries.`,
        "canonical_provenance_incomplete",
      );
      return { status: "failed" as const, modelId: id };
    }

    const legacyRecords = records.map((record) => {
      const source = provenanceByRecord.get(String(record._id))!;
      return asLegacyRecord({ record, provenance: source, page: pageById.get(String(source.pageId))! });
    });
    let model;
    try {
      model = buildHeliosEuclidShadowModel({
        id: modelKey(basis),
        companyId: String(basis.run.companyId),
        projectId: String(basis.run.projectId),
        packageId: String(basis.run.packageId),
        packageRevision: basis.run.packageRevision,
        engineeringRecordId: String(basis.engineeringRecord._id),
        geometryRunId: String(basis.run._id),
        sourceFingerprint: basis.engineeringRecord.sourceFingerprint,
        processingVersion: basis.run.processingVersion,
        records: legacyRecords,
        createdAt: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Euclid shadow transformation failed.";
      const id = await storeTerminalFailure(ctx, basis, message, "contract_transformation_failed");
      return { status: "failed" as const, modelId: id };
    }
    const validation = validateHeliosEuclidContract(model);
    const fingerprint = euclidModelFingerprint(model);
    const current = await ctx.db
      .query("heliosEuclidModels")
      .withIndex("by_package_current", (query) => query.eq("packageId", basis.run.packageId).eq("isCurrent", true))
      .first();
    if (current?.modelFingerprint === fingerprint && current.validationStatus === "valid") {
      await scheduleEuclidHorizontalSolution(ctx, current._id);
      await scheduleEuclidVerticalSolution(ctx, current._id);
      return { status: "ready" as const, modelId: String(current._id), reused: true };
    }

    const chunks = buildHeliosEuclidEntityChunks(model);
    const entityCount = chunks.reduce((sum, chunk) => sum + chunk.entityCount, 0);
    await supersedeCurrentModel(ctx, basis.run.packageId);
    const now = Date.now();
    const modelId = await ctx.db.insert("heliosEuclidModels", {
      companyId: basis.run.companyId,
      projectId: basis.run.projectId,
      packageId: basis.run.packageId,
      packageRevision: basis.run.packageRevision,
      engineeringRecordId: basis.engineeringRecord._id,
      engineeringArtifactId: basis.artifact._id,
      planRunId: basis.run.planRunId,
      geometryRunId: basis.run._id,
      modelKey: model.id,
      schemaVersion: model.schemaVersion,
      processingVersion: model.processingVersion,
      adapterVersion: HELIOS_EUCLID_SHADOW_ADAPTER,
      canonicalVersion: 1,
      canonicalOrigin: "ingestion",
      sourceFingerprint: model.sourceFingerprint,
      modelFingerprint: fingerprint,
      status: model.status,
      isCurrent: true,
      shadowMode: true,
      sourceRecordCount: records.length,
      acceptedSourceRecordCount: records.filter((record) => record.status === "accepted").length,
      provenanceCount: model.provenance.length,
      entityCount,
      entityChunkCount: chunks.length,
      issueCount: model.issues.length,
      blockingIssueCount: model.issues.filter((issue) => issue.severity === "blocking" && issue.status === "open").length,
      validationStatus: validation.valid ? "valid" : "invalid",
      validationIssues: validation.issues,
      createdBy: basis.run.createdBy,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
    const legacyRecordById = new Map(records.map((record) => [String(record._id), record]));
    for (const item of model.provenance) {
      const recordId = item.id.replace(/^provenance:/, "");
      const sourceGeometry = legacyRecordById.get(recordId)!;
      const source = provenanceByRecord.get(recordId)!;
      await ctx.db.insert("heliosEuclidProvenance", {
        companyId: basis.run.companyId,
        projectId: basis.run.projectId,
        euclidModelId: modelId,
        provenanceKey: item.id,
        engineeringSourceId: source.engineeringSourceId,
        engineeringProvenanceId: source._id,
        engineeringPageId: source.pageId!,
        sourceGeometryRecordId: sourceGeometry._id,
        documentId: sourceGeometry.documentId,
        physicalPageNumber: item.physicalPageNumber,
        sheetNumber: item.sheetNumber,
        viewKey: item.viewKey,
        locator: item.locator,
        authority: item.authority,
        confidence: item.confidence,
        provenanceFingerprint: fingerprintEngineeringRecord({
          sourceGeometryRecordId: String(sourceGeometry._id),
          engineeringProvenanceId: String(source._id),
          physicalPageNumber: item.physicalPageNumber,
          sheetNumber: item.sheetNumber,
          viewKey: item.viewKey,
          locator: item.locator,
          authority: item.authority,
          confidence: item.confidence,
        }),
        createdAt: now,
      });
    }
    for (const chunk of chunks) {
      await ctx.db.insert("heliosEuclidEntityChunks", {
        companyId: basis.run.companyId,
        projectId: basis.run.projectId,
        euclidModelId: modelId,
        entityType: chunk.entityType,
        chunkIndex: chunk.chunkIndex,
        entityCount: chunk.entityCount,
        payloadJson: chunk.payloadJson,
        payloadFingerprint: chunk.payloadFingerprint,
        createdAt: now,
      });
    }
    await scheduleEuclidHorizontalSolution(ctx, modelId);
    await scheduleEuclidVerticalSolution(ctx, modelId);
    return { status: "ready" as const, modelId: String(modelId), reused: false };
  },
});

export const syncActiveProjectEuclidShadow = internalMutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) return null;
    const planRun = await ctx.db
      .query("heliosPlanRuns")
      .withIndex("by_package_current", (query) => query.eq("packageId", project.activePackageId!).eq("isCurrent", true))
      .first();
    if (!planRun) return null;
    const geometryRun = await ctx.db
      .query("heliosCivilGeometryRuns")
      .withIndex("by_plan_current", (query) => query.eq("planRunId", planRun._id).eq("isCurrent", true))
      .first();
    if (!geometryRun) return null;
    await ctx.scheduler.runAfter(0, retryEuclidReference, { geometryRunId: geometryRun._id, attempt: 0 });
    return { geometryRunId: String(geometryRun._id), scheduled: true };
  },
});

export const getEuclidShadowStatus = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    const model = await ctx.db
      .query("heliosEuclidModels")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!model) return null;
    const [provenance, chunks] = await Promise.all([
      ctx.db.query("heliosEuclidProvenance").withIndex("by_model", (query) => query.eq("euclidModelId", model._id)).collect(),
      ctx.db.query("heliosEuclidEntityChunks").withIndex("by_model", (query) => query.eq("euclidModelId", model._id)).collect(),
    ]);
    return {
      modelId: String(model._id),
      modelKey: model.modelKey,
      shadowMode: model.shadowMode,
      status: model.status,
      validationStatus: model.validationStatus,
      sourceRecordCount: model.sourceRecordCount,
      provenanceCount: provenance.length,
      entityCount: chunks.reduce((sum, chunk) => sum + chunk.entityCount, 0),
      entityChunkCount: chunks.length,
      modelFingerprint: model.modelFingerprint,
      lastError: model.lastError,
    };
  },
});
