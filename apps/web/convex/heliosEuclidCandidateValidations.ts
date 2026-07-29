import {
  HELIOS_EUCLID_CANDIDATE_VALIDATOR,
  HELIOS_EUCLID_CANDIDATE_VALIDATOR_VERSION,
  HELIOS_EUCLID_ENTITY_TYPES,
  buildHeliosEngineeringParityFingerprint,
  buildHeliosEuclidCandidateValidationChunks,
  euclidModelFingerprint,
  heliosEuclidReviewSetFingerprint,
  normalizeHeliosEuclidCandidateValidationInput,
  validateHeliosEuclidContract,
  validateHeliosEuclidReviewCandidate,
  type HeliosEuclidEntityType,
  type HeliosEuclidModel,
  type HeliosEuclidReviewDecision,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

async function ownedProject(ctx: MutationCtx, companyId: Id<"companies">, projectIdValue: string) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  if (!projectId) throw new Error("Project not found.");
  const project = await ctx.db.get(projectId);
  if (!project || project.companyId !== companyId) throw new Error("Project not found.");
  return project;
}

function reviewDecision(row: Doc<"heliosEuclidReviewDecisions">): HeliosEuclidReviewDecision {
  return {
    id: String(row._id),
    version: 1,
    requestId: row.requestId,
    action: row.action,
    euclidModelId: String(row.euclidModelId),
    modelFingerprint: row.modelFingerprint,
    sourceFingerprint: row.sourceFingerprint,
    targetEntityType: row.targetEntityType,
    targetEntityId: row.targetEntityId,
    targetFingerprint: row.targetFingerprint,
    reason: row.reason,
    changes: row.correctionJson ? JSON.parse(row.correctionJson) : undefined,
    decisionFingerprint: row.decisionFingerprint,
    reviewerName: row.reviewerName,
    createdAt: row.createdAt,
  };
}

async function reconstructCandidate(
  ctx: MutationCtx,
  candidate: Doc<"heliosEuclidReviewCandidates">,
  source: HeliosEuclidModel,
) {
  const chunks = await ctx.db
    .query("heliosEuclidReviewCandidateChunks")
    .withIndex("by_candidate", (query) => query.eq("candidateId", candidate._id))
    .collect();
  if (chunks.length !== candidate.chunkCount) throw new Error("Reviewed candidate chunks are incomplete.");
  const groups = {} as Record<HeliosEuclidEntityType, unknown[]>;
  for (const entityType of HELIOS_EUCLID_ENTITY_TYPES) groups[entityType] = [];
  for (const chunk of [...chunks].sort((left, right) => left.entityType.localeCompare(right.entityType) || left.chunkIndex - right.chunkIndex)) {
    const payload = JSON.parse(chunk.payloadJson) as unknown;
    if (!Array.isArray(payload) || payload.length !== chunk.entityCount) throw new Error(`Reviewed candidate ${chunk.entityType} chunk count is invalid.`);
    if (buildHeliosEngineeringParityFingerprint(payload) !== chunk.payloadFingerprint) throw new Error(`Reviewed candidate ${chunk.entityType} chunk fingerprint is invalid.`);
    groups[chunk.entityType as HeliosEuclidEntityType].push(...payload);
  }
  const entityCount = Object.values(groups).reduce((sum, rows) => sum + rows.length, 0);
  if (entityCount !== candidate.entityCount) throw new Error("Reviewed candidate entity total is inconsistent.");
  const model: HeliosEuclidModel = {
    id: `review-candidate:${candidate.candidateKey.split(":")[1]!.slice(0, 32)}`,
    companyId: source.companyId,
    projectId: source.projectId,
    packageId: source.packageId,
    packageRevision: source.packageRevision,
    schemaVersion: source.schemaVersion,
    processingVersion: source.processingVersion,
    sourceFingerprint: source.sourceFingerprint,
    status: "partially_accepted",
    spatialReferences: groups.spatial_reference as HeliosEuclidModel["spatialReferences"],
    provenance: source.provenance,
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
    createdAt: candidate.createdAt,
    updatedAt: candidate.createdAt,
  };
  const contract = validateHeliosEuclidContract(model);
  if (!contract.valid) throw new Error(`Reviewed candidate failed its frozen contract: ${contract.issues.map((row) => row.code).join(", ")}`);
  if (euclidModelFingerprint(model) !== candidate.candidateFingerprint) throw new Error("Reviewed candidate failed end-to-end fingerprint validation.");
  return model;
}

export const validateCandidate = internalMutation({
  args: { principal: heliosPrincipalValidator, projectId: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    const { companyId, user } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const input = normalizeHeliosEuclidCandidateValidationInput(args.input);
    const candidateId = ctx.db.normalizeId("heliosEuclidReviewCandidates", input.candidateId);
    if (!candidateId) throw new Error("Reviewed Euclid candidate was not found.");
    const candidate = await ctx.db.get(candidateId);
    if (!candidate || candidate.companyId !== companyId || candidate.projectId !== project._id) throw new Error("Reviewed Euclid candidate was not found.");
    if (!candidate.validationEligible || candidate.status !== "ready_for_validation" || candidate.downstreamEligible !== false) throw new Error("Reviewed candidate is not ready for deterministic validation.");
    if (candidate.candidateFingerprint !== input.candidateFingerprint || candidate.reviewSetFingerprint !== input.reviewSetFingerprint) throw new Error("Candidate validation request is stale. Reload the cockpit before validating.");
    const sourceRecord = await ctx.db.get(candidate.sourceEuclidModelId);
    if (!sourceRecord || sourceRecord.companyId !== companyId || sourceRecord.projectId !== project._id || !sourceRecord.isCurrent || sourceRecord.modelFingerprint !== candidate.sourceModelFingerprint || sourceRecord.sourceFingerprint !== candidate.sourceFingerprint) throw new Error("Candidate source model is stale.");

    const reviewRecords = await ctx.db
      .query("heliosEuclidReviewDecisions")
      .withIndex("by_model_created", (query) => query.eq("euclidModelId", sourceRecord._id))
      .collect();
    if (heliosEuclidReviewSetFingerprint(reviewRecords.map(reviewDecision)) !== candidate.reviewSetFingerprint) throw new Error("Candidate review set is no longer current. Build a new reviewed candidate.");

    const requestResult = await ctx.db
      .query("heliosEuclidCandidateValidations")
      .withIndex("by_candidate_request", (query) => query.eq("candidateId", candidate._id).eq("requestId", input.requestId))
      .first();
    if (requestResult) return { validationId: String(requestResult._id), status: requestResult.status, validationPassed: requestResult.validationPassed, promotionEligible: false, downstreamEligible: false, reused: true };

    const sourceModel = await reconstructEuclidModel(ctx, sourceRecord);
    const candidateModel = await reconstructCandidate(ctx, candidate, sourceModel);
    const createdAt = Date.now();
    const validation = validateHeliosEuclidReviewCandidate({ sourceModel, candidateModel, candidateId: String(candidate._id), candidateFingerprint: candidate.candidateFingerprint, reviewSetFingerprint: candidate.reviewSetFingerprint, createdAt });
    const existing = await ctx.db.query("heliosEuclidCandidateValidations").withIndex("by_validation_key", (query) => query.eq("validationKey", validation.validationKey)).first();
    if (existing) {
      if (existing.companyId !== companyId || existing.projectId !== project._id || existing.candidateId !== candidate._id) throw new Error("Candidate validation is not available.");
      return { validationId: String(existing._id), status: existing.status, validationPassed: existing.validationPassed, promotionEligible: false, downstreamEligible: false, reused: true };
    }
    const chunks = buildHeliosEuclidCandidateValidationChunks(validation);
    const validationId = await ctx.db.insert("heliosEuclidCandidateValidations", {
      companyId,
      projectId: project._id,
      packageId: candidate.packageId,
      packageRevision: candidate.packageRevision,
      sourceEuclidModelId: sourceRecord._id,
      candidateId: candidate._id,
      requestId: input.requestId,
      validationKey: validation.validationKey,
      sourceModelFingerprint: validation.sourceModelFingerprint,
      candidateFingerprint: validation.candidateFingerprint,
      sourceFingerprint: validation.sourceFingerprint,
      reviewSetFingerprint: validation.reviewSetFingerprint,
      validator: HELIOS_EUCLID_CANDIDATE_VALIDATOR,
      validatorVersion: HELIOS_EUCLID_CANDIDATE_VALIDATOR_VERSION,
      status: validation.status,
      validationPassed: validation.validationPassed,
      promotionEligible: false,
      downstreamEligible: false,
      sourceHorizontalFingerprint: validation.sourceHorizontalFingerprint,
      candidateHorizontalFingerprint: validation.candidateHorizontalFingerprint,
      sourceVerticalFingerprint: validation.sourceVerticalFingerprint,
      candidateVerticalFingerprint: validation.candidateVerticalFingerprint,
      sourceIntegrationFingerprint: validation.sourceIntegrationFingerprint,
      candidateIntegrationFingerprint: validation.candidateIntegrationFingerprint,
      validationFingerprint: validation.validationFingerprint,
      horizontalStatus: validation.candidateHorizontal.status,
      verticalStatus: validation.candidateVertical.status,
      integrationStatus: validation.candidateIntegration.status,
      changedCount: validation.changedCount,
      improvedCount: validation.improvedCount,
      degradedCount: validation.degradedCount,
      horizontalCheckCount: validation.candidateHorizontal.checkCount,
      verticalCheckCount: validation.candidateVertical.checkCount,
      integrationCheckCount: validation.candidateIntegration.checks.length,
      readinessCount: validation.candidateIntegration.readiness.length,
      readyCount: validation.candidateIntegration.readyCount,
      reviewCount: validation.candidateIntegration.reviewCount,
      blockedCount: validation.candidateIntegration.blockedCount,
      unavailableCount: validation.candidateIntegration.unavailableCount,
      blockingReasons: validation.blockingReasons,
      chunkCount: chunks.length,
      createdBy: user._id,
      createdAt,
    });
    for (const chunk of chunks) await ctx.db.insert("heliosEuclidCandidateValidationChunks", { companyId, projectId: project._id, validationId, resultType: chunk.resultType, chunkIndex: chunk.chunkIndex, itemCount: chunk.itemCount, payloadJson: chunk.payloadJson, payloadFingerprint: chunk.payloadFingerprint, createdAt });
    return { validationId: String(validationId), status: validation.status, validationPassed: validation.validationPassed, promotionEligible: false, downstreamEligible: false, reused: false };
  },
});
