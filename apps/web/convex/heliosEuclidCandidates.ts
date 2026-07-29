import {
  buildHeliosEuclidEntityChunks,
  buildHeliosEuclidReviewCandidate,
  normalizeHeliosEuclidCandidateBuildInput,
  type HeliosEuclidReviewDecision,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

async function ownedProject(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  projectIdValue: string,
) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  if (!projectId) throw new Error("Project not found.");
  const project = await ctx.db.get(projectId);
  if (!project || project.companyId !== companyId) throw new Error("Project not found.");
  return project;
}

export const buildCandidate = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const { companyId, user } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const input = normalizeHeliosEuclidCandidateBuildInput(args.input);
    const euclidModelId = ctx.db.normalizeId("heliosEuclidModels", input.euclidModelId);
    if (!euclidModelId) throw new Error("Euclid model was not found.");
    const modelRecord = await ctx.db.get(euclidModelId);
    if (
      !modelRecord ||
      modelRecord.companyId !== companyId ||
      modelRecord.projectId !== project._id ||
      !modelRecord.isCurrent ||
      modelRecord.shadowMode !== true
    ) throw new Error("Euclid model was not found.");
    if (
      modelRecord.modelFingerprint !== input.modelFingerprint ||
      modelRecord.sourceFingerprint !== input.sourceFingerprint
    ) throw new Error("Euclid candidate request is stale. Reload the cockpit before building.");

    const [model, reviewRecords] = await Promise.all([
      reconstructEuclidModel(ctx, modelRecord),
      ctx.db
        .query("heliosEuclidReviewDecisions")
        .withIndex("by_model_created", (query) => query.eq("euclidModelId", modelRecord._id))
        .collect(),
    ]);
    const decisions: HeliosEuclidReviewDecision[] = reviewRecords.map((row) => ({
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
    }));
    const createdAt = Date.now();
    const candidate = buildHeliosEuclidReviewCandidate({
      model,
      euclidModelId: String(modelRecord._id),
      modelFingerprint: modelRecord.modelFingerprint,
      decisions,
      createdAt,
    });

    const requestCandidate = await ctx.db
      .query("heliosEuclidReviewCandidates")
      .withIndex("by_model_request", (query) =>
        query.eq("sourceEuclidModelId", modelRecord._id).eq("requestId", input.requestId),
      )
      .first();
    if (requestCandidate) {
      if (requestCandidate.candidateKey !== candidate.candidateKey) {
        throw new Error("Euclid candidate request was already used for a different review set.");
      }
      return {
        candidateId: String(requestCandidate._id),
        status: requestCandidate.status,
        validationEligible: requestCandidate.validationEligible,
        downstreamEligible: requestCandidate.downstreamEligible,
      };
    }
    const existing = await ctx.db
      .query("heliosEuclidReviewCandidates")
      .withIndex("by_candidate_key", (query) => query.eq("candidateKey", candidate.candidateKey))
      .first();
    if (existing) {
      if (existing.companyId !== companyId || existing.projectId !== project._id) {
        throw new Error("Euclid candidate is not available.");
      }
      return {
        candidateId: String(existing._id),
        status: existing.status,
        validationEligible: existing.validationEligible,
        downstreamEligible: existing.downstreamEligible,
      };
    }

    const chunks = buildHeliosEuclidEntityChunks(candidate.model);
    const entityCount = chunks.reduce((sum, chunk) => sum + chunk.entityCount, 0);
    const candidateId = await ctx.db.insert("heliosEuclidReviewCandidates", {
      companyId,
      projectId: project._id,
      packageId: modelRecord.packageId,
      packageRevision: modelRecord.packageRevision,
      sourceEuclidModelId: modelRecord._id,
      requestId: input.requestId,
      candidateKey: candidate.candidateKey,
      sourceModelFingerprint: candidate.sourceModelFingerprint,
      sourceFingerprint: candidate.sourceFingerprint,
      reviewSetFingerprint: candidate.reviewSetFingerprint,
      candidateFingerprint: candidate.candidateFingerprint,
      builder: candidate.builder,
      builderVersion: candidate.builderVersion,
      status: candidate.status,
      validationEligible: candidate.validationEligible,
      downstreamEligible: candidate.downstreamEligible,
      totalTargetCount: candidate.totalTargetCount,
      acceptedCount: candidate.acceptedCount,
      correctedCount: candidate.correctedCount,
      deferredCount: candidate.deferredCount,
      rejectedCount: candidate.rejectedCount,
      unreviewedCount: candidate.unreviewedCount,
      blockingReasons: candidate.blockingReasons.slice(0, 100),
      decisionCount: candidate.decisionIds.length,
      entityCount,
      chunkCount: chunks.length,
      createdBy: user._id,
      createdAt,
    });
    for (const chunk of chunks) {
      await ctx.db.insert("heliosEuclidReviewCandidateChunks", {
        companyId,
        projectId: project._id,
        candidateId,
        entityType: chunk.entityType,
        chunkIndex: chunk.chunkIndex,
        entityCount: chunk.entityCount,
        payloadJson: chunk.payloadJson,
        payloadFingerprint: chunk.payloadFingerprint,
        createdAt,
      });
    }
    const decisionsById = new Map(reviewRecords.map((row) => [String(row._id), row]));
    for (const decisionIdValue of candidate.decisionIds) {
      const decision = decisionsById.get(decisionIdValue);
      if (!decision) throw new Error("Euclid candidate decision lineage is incomplete.");
      await ctx.db.insert("heliosEuclidReviewCandidateDecisions", {
        companyId,
        projectId: project._id,
        candidateId,
        decisionId: decision._id,
        targetEntityType: decision.targetEntityType,
        targetEntityId: decision.targetEntityId,
        action: decision.action,
        decisionFingerprint: decision.decisionFingerprint,
        createdAt,
      });
    }
    return {
      candidateId: String(candidateId),
      status: candidate.status,
      validationEligible: candidate.validationEligible,
      downstreamEligible: candidate.downstreamEligible,
    };
  },
});
