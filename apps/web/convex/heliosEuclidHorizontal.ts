import {
  HELIOS_EUCLID_HORIZONTAL_DEFAULT_TOLERANCES,
  HELIOS_EUCLID_HORIZONTAL_SOLVER,
  HELIOS_EUCLID_HORIZONTAL_SOLVER_VERSION,
  HELIOS_EUCLID_HORIZONTAL_TOLERANCE_VERSION,
  buildHeliosEngineeringParityFingerprint,
  buildHeliosEuclidHorizontalSolutionChunks,
  heliosEuclidHorizontalSolutionFingerprint,
  solveHeliosEuclidHorizontalControl,
  validateHeliosEuclidContract,
  type HeliosEuclidEntityType,
  type HeliosEuclidModel,
  type HeliosEuclidProvenance,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";

const solveHorizontalReference = makeFunctionReference<
  "mutation",
  { euclidModelId: Id<"heliosEuclidModels"> },
  unknown
>("heliosEuclidHorizontal:solveEuclidHorizontalShadow");

function solutionKey(model: Doc<"heliosEuclidModels">) {
  return [
    "euclid-horizontal",
    `model:${String(model._id)}`,
    `model-fingerprint:${model.modelFingerprint}`,
    `solver:${HELIOS_EUCLID_HORIZONTAL_SOLVER}`,
    `tolerances:${HELIOS_EUCLID_HORIZONTAL_TOLERANCE_VERSION}`,
  ].join("|");
}

async function reconstructEuclidModel(
  ctx: MutationCtx,
  stored: Doc<"heliosEuclidModels">,
): Promise<HeliosEuclidModel> {
  const [chunks, storedProvenance] = await Promise.all([
    ctx.db.query("heliosEuclidEntityChunks").withIndex("by_model", (query) => query.eq("euclidModelId", stored._id)).collect(),
    ctx.db.query("heliosEuclidProvenance").withIndex("by_model", (query) => query.eq("euclidModelId", stored._id)).collect(),
  ]);
  if (chunks.length !== stored.entityChunkCount) throw new Error("Euclid entity chunks are incomplete.");
  if (storedProvenance.length !== stored.provenanceCount) throw new Error("Euclid provenance records are incomplete.");
  const groups: Record<HeliosEuclidEntityType, unknown[]> = {
    spatial_reference: [],
    alignment: [],
    control_point: [],
    horizontal_element: [],
    station_equation: [],
    profile: [],
    profile_point: [],
    vertical_tangent: [],
    vertical_curve: [],
    typical_section: [],
    cross_section_point: [],
    structure: [],
    invert: [],
    material_layer: [],
    relationship: [],
    issue: [],
  };
  for (const chunk of [...chunks].sort((left, right) => left.entityType.localeCompare(right.entityType) || left.chunkIndex - right.chunkIndex)) {
    const payload = JSON.parse(chunk.payloadJson) as unknown;
    if (!Array.isArray(payload) || payload.length !== chunk.entityCount) throw new Error(`Euclid ${chunk.entityType} chunk has an invalid entity count.`);
    if (buildHeliosEngineeringParityFingerprint(payload) !== chunk.payloadFingerprint) throw new Error(`Euclid ${chunk.entityType} chunk fingerprint does not match.`);
    groups[chunk.entityType as HeliosEuclidEntityType].push(...payload);
  }
  const entityCount = Object.values(groups).reduce((sum, rows) => sum + rows.length, 0);
  if (entityCount !== stored.entityCount) throw new Error("Euclid reconstructed entity count does not match its canonical model record.");

  const provenance: HeliosEuclidProvenance[] = [...storedProvenance]
    .sort((left, right) => left.provenanceKey.localeCompare(right.provenanceKey))
    .map((row) => ({
      id: row.provenanceKey,
      engineeringSourceId: String(row.engineeringSourceId),
      documentId: row.documentId ? String(row.documentId) : undefined,
      pageId: String(row.engineeringPageId),
      physicalPageNumber: row.physicalPageNumber,
      sheetNumber: row.sheetNumber,
      viewKey: row.viewKey,
      locator: row.locator,
      textSpanIds: [],
      authority: row.authority,
      confidence: row.confidence,
    }));

  const model: HeliosEuclidModel = {
    id: stored.modelKey,
    companyId: String(stored.companyId),
    projectId: String(stored.projectId),
    packageId: String(stored.packageId),
    packageRevision: stored.packageRevision,
    schemaVersion: stored.schemaVersion as HeliosEuclidModel["schemaVersion"],
    processingVersion: stored.processingVersion,
    sourceFingerprint: stored.sourceFingerprint,
    status: stored.status,
    spatialReferences: groups.spatial_reference as HeliosEuclidModel["spatialReferences"],
    provenance,
    alignments: groups.alignment as HeliosEuclidModel["alignments"],
    controlPoints: groups.control_point as HeliosEuclidModel["controlPoints"],
    horizontalElements: groups.horizontal_element as HeliosEuclidModel["horizontalElements"],
    stationEquations: groups.station_equation as HeliosEuclidModel["stationEquations"],
    profiles: groups.profile as HeliosEuclidModel["profiles"],
    profilePoints: groups.profile_point as HeliosEuclidModel["profilePoints"],
    verticalTangents: groups.vertical_tangent as HeliosEuclidModel["verticalTangents"],
    verticalCurves: groups.vertical_curve as HeliosEuclidModel["verticalCurves"],
    typicalSections: groups.typical_section as HeliosEuclidModel["typicalSections"],
    crossSectionPoints: groups.cross_section_point as HeliosEuclidModel["crossSectionPoints"],
    structures: groups.structure as HeliosEuclidModel["structures"],
    inverts: groups.invert as HeliosEuclidModel["inverts"],
    materialLayers: groups.material_layer as HeliosEuclidModel["materialLayers"],
    relationships: groups.relationship as HeliosEuclidModel["relationships"],
    issues: groups.issue as HeliosEuclidModel["issues"],
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
  const validation = validateHeliosEuclidContract(model);
  if (!validation.valid) throw new Error(`Reconstructed Euclid model failed its frozen contract: ${validation.issues.map((row) => row.code).join(", ")}`);
  return model;
}

async function supersedeCurrentSolution(ctx: MutationCtx, packageId: Id<"heliosBidPackages">) {
  const current = await ctx.db
    .query("heliosEuclidHorizontalSolutions")
    .withIndex("by_package_current", (query) => query.eq("packageId", packageId).eq("isCurrent", true))
    .first();
  if (current) await ctx.db.patch(current._id, { isCurrent: false, status: "superseded", updatedAt: Date.now() });
}

async function storeFailure(ctx: MutationCtx, model: Doc<"heliosEuclidModels">, message: string) {
  const key = solutionKey(model);
  const existing = await ctx.db.query("heliosEuclidHorizontalSolutions").withIndex("by_solution_key", (query) => query.eq("solutionKey", key)).first();
  if (existing?.isCurrent && existing.status === "failed") return String(existing._id);
  await supersedeCurrentSolution(ctx, model.packageId);
  const now = Date.now();
  const id = await ctx.db.insert("heliosEuclidHorizontalSolutions", {
    companyId: model.companyId,
    projectId: model.projectId,
    packageId: model.packageId,
    packageRevision: model.packageRevision,
    euclidModelId: model._id,
    solutionKey: key,
    solver: HELIOS_EUCLID_HORIZONTAL_SOLVER,
    solverVersion: HELIOS_EUCLID_HORIZONTAL_SOLVER_VERSION,
    toleranceVersion: HELIOS_EUCLID_HORIZONTAL_TOLERANCE_VERSION,
    tolerances: HELIOS_EUCLID_HORIZONTAL_DEFAULT_TOLERANCES,
    sourceFingerprint: model.sourceFingerprint,
    modelFingerprint: model.modelFingerprint,
    solutionFingerprint: buildHeliosEngineeringParityFingerprint({ key, message }),
    status: "failed",
    isCurrent: true,
    shadowMode: true,
    alignmentCount: 0,
    passedAlignmentCount: 0,
    reviewAlignmentCount: 0,
    blockedAlignmentCount: 0,
    notApplicableAlignmentCount: 0,
    checkCount: 0,
    reviewCount: 0,
    blockingCount: 1,
    chunkCount: 0,
    lastError: message.slice(0, 600),
    createdBy: model.createdBy,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  });
  return String(id);
}

export const solveEuclidHorizontalShadow = internalMutation({
  args: { euclidModelId: v.id("heliosEuclidModels") },
  handler: async (ctx, args) => {
    const stored = await ctx.db.get(args.euclidModelId);
    if (!stored?.isCurrent || stored.validationStatus !== "valid" || stored.status === "failed") return { status: "not_ready" as const };
    let model: HeliosEuclidModel;
    try {
      model = await reconstructEuclidModel(ctx, stored);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Euclid model reconstruction failed.";
      const solutionId = await storeFailure(ctx, stored, message);
      return { status: "failed" as const, solutionId };
    }
    let solution;
    try {
      solution = solveHeliosEuclidHorizontalControl(model);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Euclid horizontal solution failed.";
      const solutionId = await storeFailure(ctx, stored, message);
      return { status: "failed" as const, solutionId };
    }
    const fingerprint = heliosEuclidHorizontalSolutionFingerprint(solution);
    const current = await ctx.db
      .query("heliosEuclidHorizontalSolutions")
      .withIndex("by_package_current", (query) => query.eq("packageId", stored.packageId).eq("isCurrent", true))
      .first();
    if (current?.euclidModelId === stored._id && current.solutionFingerprint === fingerprint && current.status !== "failed") {
      return { status: current.status, solutionId: String(current._id), reused: true };
    }

    const chunks = buildHeliosEuclidHorizontalSolutionChunks(solution);
    await supersedeCurrentSolution(ctx, stored.packageId);
    const now = Date.now();
    const solutionId = await ctx.db.insert("heliosEuclidHorizontalSolutions", {
      companyId: stored.companyId,
      projectId: stored.projectId,
      packageId: stored.packageId,
      packageRevision: stored.packageRevision,
      euclidModelId: stored._id,
      solutionKey: solutionKey(stored),
      solver: solution.solver,
      solverVersion: solution.solverVersion,
      toleranceVersion: solution.toleranceVersion,
      tolerances: solution.tolerances,
      sourceFingerprint: solution.sourceFingerprint,
      modelFingerprint: stored.modelFingerprint,
      solutionFingerprint: fingerprint,
      status: solution.status,
      isCurrent: true,
      shadowMode: true,
      alignmentCount: solution.alignmentSolutions.length,
      passedAlignmentCount: solution.alignmentSolutions.filter((row) => row.status === "passed").length,
      reviewAlignmentCount: solution.alignmentSolutions.filter((row) => row.status === "review").length,
      blockedAlignmentCount: solution.alignmentSolutions.filter((row) => row.status === "blocked").length,
      notApplicableAlignmentCount: solution.alignmentSolutions.filter((row) => row.status === "not_applicable").length,
      checkCount: solution.checkCount,
      reviewCount: solution.reviewCount,
      blockingCount: solution.blockingCount,
      chunkCount: chunks.length,
      createdBy: stored.createdBy,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
    for (const chunk of chunks) {
      await ctx.db.insert("heliosEuclidHorizontalSolutionChunks", {
        companyId: stored.companyId,
        projectId: stored.projectId,
        solutionId,
        alignmentId: chunk.alignmentId,
        chunkIndex: chunk.chunkIndex,
        checkCount: chunk.checkCount,
        payloadJson: chunk.payloadJson,
        payloadFingerprint: chunk.payloadFingerprint,
        createdAt: now,
      });
    }
    return { status: solution.status, solutionId: String(solutionId), reused: false };
  },
});

export const solveCurrentProjectHorizontalShadow = internalMutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    const model = await ctx.db
      .query("heliosEuclidModels")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!model || model.validationStatus !== "valid") return null;
    await ctx.scheduler.runAfter(0, solveHorizontalReference, { euclidModelId: model._id });
    return { euclidModelId: String(model._id), scheduled: true };
  },
});

export const getHorizontalSolutionStatus = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    const solution = await ctx.db
      .query("heliosEuclidHorizontalSolutions")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!solution) return null;
    const chunks = await ctx.db
      .query("heliosEuclidHorizontalSolutionChunks")
      .withIndex("by_solution", (query) => query.eq("solutionId", solution._id))
      .collect();
    return {
      solutionId: String(solution._id),
      euclidModelId: String(solution.euclidModelId),
      shadowMode: solution.shadowMode,
      status: solution.status,
      solver: solution.solver,
      solverVersion: solution.solverVersion,
      toleranceVersion: solution.toleranceVersion,
      alignmentCount: solution.alignmentCount,
      passedAlignmentCount: solution.passedAlignmentCount,
      reviewAlignmentCount: solution.reviewAlignmentCount,
      blockedAlignmentCount: solution.blockedAlignmentCount,
      checkCount: solution.checkCount,
      reviewCount: solution.reviewCount,
      blockingCount: solution.blockingCount,
      storedCheckCount: chunks.reduce((sum, row) => sum + row.checkCount, 0),
      solutionFingerprint: solution.solutionFingerprint,
      lastError: solution.lastError,
    };
  },
});
