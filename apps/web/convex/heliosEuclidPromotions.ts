import {
  HELIOS_EUCLID_PROMOTION_ADAPTER,
  HELIOS_EUCLID_PROMOTER,
  HELIOS_EUCLID_PROMOTER_VERSION,
  buildHeliosEuclidEntityChunks,
  buildHeliosEuclidPromotion,
  heliosEuclidReviewSetFingerprint,
  normalizeHeliosEuclidPromotionInput,
  type HeliosEuclidReviewDecision,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructEuclidCandidate } from "./heliosEuclidCandidateReconstruction";
import { scheduleEuclidHorizontalSolution } from "./heliosEuclidHorizontalSchedule";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";
import { scheduleEuclidVerticalSolution } from "./heliosEuclidVerticalSchedule";

function decision(row: Doc<"heliosEuclidReviewDecisions">): HeliosEuclidReviewDecision {
  return {
    id: String(row._id), version: 1, requestId: row.requestId, action: row.action,
    euclidModelId: String(row.euclidModelId), modelFingerprint: row.modelFingerprint,
    sourceFingerprint: row.sourceFingerprint, targetEntityType: row.targetEntityType,
    targetEntityId: row.targetEntityId, targetFingerprint: row.targetFingerprint,
    reason: row.reason, changes: row.correctionJson ? JSON.parse(row.correctionJson) : undefined,
    decisionFingerprint: row.decisionFingerprint, reviewerName: row.reviewerName, createdAt: row.createdAt,
  };
}

async function retireCurrentSolutions(ctx: MutationCtx, source: Doc<"heliosEuclidModels">, now: number) {
  const [horizontal, vertical, integration] = await Promise.all([
    ctx.db.query("heliosEuclidHorizontalSolutions").withIndex("by_package_current", (query) => query.eq("packageId", source.packageId).eq("isCurrent", true)).first(),
    ctx.db.query("heliosEuclidVerticalSolutions").withIndex("by_package_current", (query) => query.eq("packageId", source.packageId).eq("isCurrent", true)).first(),
    ctx.db.query("heliosEuclidIntegrationSolutions").withIndex("by_package_current", (query) => query.eq("packageId", source.packageId).eq("isCurrent", true)).first(),
  ]);
  if (horizontal?.euclidModelId === source._id) await ctx.db.patch(horizontal._id, { isCurrent: false, status: "superseded", updatedAt: now });
  if (vertical?.euclidModelId === source._id) await ctx.db.patch(vertical._id, { isCurrent: false, status: "superseded", updatedAt: now });
  if (integration?.euclidModelId === source._id) await ctx.db.patch(integration._id, { isCurrent: false, status: "superseded", updatedAt: now });
}

export const promoteCandidate = internalMutation({
  args: { principal: heliosPrincipalValidator, projectId: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    const { companyId, user } = await requireHeliosPrincipal(ctx, args.principal);
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project || project.companyId !== companyId) throw new Error("Project not found.");
    const input = normalizeHeliosEuclidPromotionInput(args.input);
    const sourceId = ctx.db.normalizeId("heliosEuclidModels", input.sourceEuclidModelId);
    const candidateId = ctx.db.normalizeId("heliosEuclidReviewCandidates", input.candidateId);
    const validationId = ctx.db.normalizeId("heliosEuclidCandidateValidations", input.validationId);
    if (!sourceId || !candidateId || !validationId) throw new Error("Euclid promotion lineage was not found.");
    const [source, candidate, validation] = await Promise.all([ctx.db.get(sourceId), ctx.db.get(candidateId), ctx.db.get(validationId)]);
    if (!source || !candidate || !validation || source.companyId !== companyId || candidate.companyId !== companyId || validation.companyId !== companyId || source.projectId !== project._id || candidate.projectId !== project._id || validation.projectId !== project._id) throw new Error("Euclid promotion lineage was not found.");
    if (source.modelFingerprint !== input.sourceModelFingerprint || candidate.candidateFingerprint !== input.candidateFingerprint || candidate.reviewSetFingerprint !== input.reviewSetFingerprint || validation.validationFingerprint !== input.validationFingerprint) throw new Error("Euclid promotion request is stale. Reload the cockpit before promoting.");

    const existing = await ctx.db.query("heliosEuclidPromotions").withIndex("by_validation", (query) => query.eq("validationId", validation._id)).first();
    if (existing) {
      if (existing.sourceEuclidModelId !== source._id || existing.candidateId !== candidate._id || existing.sourceModelFingerprint !== input.sourceModelFingerprint || existing.candidateFingerprint !== input.candidateFingerprint || existing.reviewSetFingerprint !== input.reviewSetFingerprint || existing.validationFingerprint !== input.validationFingerprint) throw new Error("Candidate validation was already used by another promotion lineage.");
      return { promotionId: String(existing._id), promotedEuclidModelId: String(existing.promotedEuclidModelId), canonicalVersion: existing.canonicalVersion, status: existing.status, downstreamEligible: false, reused: true };
    }
    if (!source.isCurrent || source.validationStatus !== "valid" || source.status === "failed" || source.sourceFingerprint !== candidate.sourceFingerprint) throw new Error("Source Euclid model is no longer current.");
    if (candidate.sourceEuclidModelId !== source._id || candidate.status !== "ready_for_validation" || !candidate.validationEligible || candidate.downstreamEligible !== false) throw new Error("Reviewed candidate is not promotion-ready.");
    if (validation.sourceEuclidModelId !== source._id || validation.candidateId !== candidate._id || validation.sourceModelFingerprint !== source.modelFingerprint || validation.candidateFingerprint !== candidate.candidateFingerprint || validation.reviewSetFingerprint !== candidate.reviewSetFingerprint || validation.sourceFingerprint !== source.sourceFingerprint) throw new Error("Candidate validation lineage is stale.");
    if (!validation.validationPassed || validation.status !== "passed" || validation.degradedCount !== 0 || validation.downstreamEligible !== false) throw new Error("Only a current passing validation with no degraded engineering results can be promoted.");

    const reviews = await ctx.db.query("heliosEuclidReviewDecisions").withIndex("by_model_created", (query) => query.eq("euclidModelId", source._id)).collect();
    if (heliosEuclidReviewSetFingerprint(reviews.map(decision)) !== candidate.reviewSetFingerprint) throw new Error("Candidate review set is no longer current. Build and validate a new candidate.");
    const sourceModel = await reconstructEuclidModel(ctx, source);
    const candidateModel = await reconstructEuclidCandidate(ctx, candidate, sourceModel);
    const now = Date.now();
    const canonicalVersion = (source.canonicalVersion ?? 1) + 1;
    const promotion = buildHeliosEuclidPromotion({
      sourceModel, candidateModel, sourceEuclidModelId: String(source._id), candidateId: String(candidate._id), validationId: String(validation._id),
      validation: { sourceEuclidModelId: String(validation.sourceEuclidModelId), sourceModelFingerprint: validation.sourceModelFingerprint, candidateId: String(validation.candidateId), candidateFingerprint: validation.candidateFingerprint, reviewSetFingerprint: validation.reviewSetFingerprint, validationFingerprint: validation.validationFingerprint, status: validation.status, validationPassed: validation.validationPassed, degradedCount: validation.degradedCount },
      canonicalVersion, createdAt: now,
    });
    const duplicate = await ctx.db.query("heliosEuclidPromotions").withIndex("by_promotion_key", (query) => query.eq("promotionKey", promotion.promotionKey)).first();
    if (duplicate) return { promotionId: String(duplicate._id), promotedEuclidModelId: String(duplicate.promotedEuclidModelId), canonicalVersion: duplicate.canonicalVersion, status: duplicate.status, downstreamEligible: false, reused: true };

    const provenanceRows = await ctx.db.query("heliosEuclidProvenance").withIndex("by_model", (query) => query.eq("euclidModelId", source._id)).collect();
    const chunks = buildHeliosEuclidEntityChunks(promotion.model);
    if (provenanceRows.length !== source.provenanceCount) throw new Error("Source Euclid provenance is incomplete.");
    const entityCount = chunks.reduce((sum, row) => sum + row.entityCount, 0);
    const promotedModelId = await ctx.db.insert("heliosEuclidModels", {
      companyId, projectId: project._id, packageId: source.packageId, packageRevision: source.packageRevision,
      engineeringRecordId: source.engineeringRecordId, engineeringArtifactId: source.engineeringArtifactId,
      planRunId: source.planRunId, geometryRunId: source.geometryRunId, modelKey: promotion.model.id,
      schemaVersion: promotion.model.schemaVersion, processingVersion: promotion.model.processingVersion,
      adapterVersion: HELIOS_EUCLID_PROMOTION_ADAPTER, canonicalVersion, canonicalOrigin: "reviewed_candidate",
      sourceFingerprint: promotion.model.sourceFingerprint, modelFingerprint: promotion.promotedModelFingerprint,
      status: "accepted", isCurrent: true, shadowMode: false,
      sourceRecordCount: source.sourceRecordCount, acceptedSourceRecordCount: source.acceptedSourceRecordCount,
      provenanceCount: provenanceRows.length, entityCount, entityChunkCount: chunks.length,
      issueCount: promotion.model.issues.length, blockingIssueCount: promotion.model.issues.filter((row) => row.status === "open" && row.severity === "blocking").length,
      validationStatus: "valid", validationIssues: [], createdBy: user._id, createdAt: now, updatedAt: now, completedAt: now,
    });
    for (const row of provenanceRows) await ctx.db.insert("heliosEuclidProvenance", { companyId, projectId: project._id, euclidModelId: promotedModelId, provenanceKey: row.provenanceKey, engineeringSourceId: row.engineeringSourceId, engineeringProvenanceId: row.engineeringProvenanceId, engineeringPageId: row.engineeringPageId, sourceGeometryRecordId: row.sourceGeometryRecordId, documentId: row.documentId, physicalPageNumber: row.physicalPageNumber, sheetNumber: row.sheetNumber, viewKey: row.viewKey, locator: row.locator, authority: row.authority, confidence: row.confidence, provenanceFingerprint: row.provenanceFingerprint, createdAt: now });
    for (const chunk of chunks) await ctx.db.insert("heliosEuclidEntityChunks", { companyId, projectId: project._id, euclidModelId: promotedModelId, entityType: chunk.entityType, chunkIndex: chunk.chunkIndex, entityCount: chunk.entityCount, payloadJson: chunk.payloadJson, payloadFingerprint: chunk.payloadFingerprint, createdAt: now });
    const promotionId = await ctx.db.insert("heliosEuclidPromotions", { companyId, projectId: project._id, packageId: source.packageId, packageRevision: source.packageRevision, sourceEuclidModelId: source._id, candidateId: candidate._id, validationId: validation._id, promotedEuclidModelId: promotedModelId, requestId: input.requestId, promotionKey: promotion.promotionKey, canonicalVersion, sourceModelFingerprint: promotion.sourceModelFingerprint, candidateFingerprint: promotion.candidateFingerprint, reviewSetFingerprint: promotion.reviewSetFingerprint, validationFingerprint: promotion.validationFingerprint, promotedModelFingerprint: promotion.promotedModelFingerprint, promoter: HELIOS_EUCLID_PROMOTER, promoterVersion: HELIOS_EUCLID_PROMOTER_VERSION, adapterVersion: HELIOS_EUCLID_PROMOTION_ADAPTER, status: "promoted", downstreamEligible: false, createdBy: user._id, promotedByName: user.name || user.email, createdAt: now });
    await retireCurrentSolutions(ctx, source, now);
    await ctx.db.patch(source._id, { isCurrent: false, status: "superseded", updatedAt: now });
    await scheduleEuclidHorizontalSolution(ctx, promotedModelId);
    await scheduleEuclidVerticalSolution(ctx, promotedModelId);
    return { promotionId: String(promotionId), promotedEuclidModelId: String(promotedModelId), canonicalVersion, status: "promoted" as const, downstreamEligible: false as const, reused: false };
  },
});
