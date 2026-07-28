import {
  getHeliosEuclidReviewTarget,
  heliosEuclidReviewDecisionFingerprint,
  heliosEuclidReviewTargetFingerprint,
  normalizeHeliosEuclidReviewInput,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
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

export const recordDecision = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const { companyId, user } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const input = normalizeHeliosEuclidReviewInput(args.input);
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
    if (modelRecord.modelFingerprint !== input.modelFingerprint || modelRecord.sourceFingerprint !== input.sourceFingerprint) {
      throw new Error("Euclid review is stale. Reload the cockpit before recording a decision.");
    }

    const model = await reconstructEuclidModel(ctx, modelRecord);
    const target = getHeliosEuclidReviewTarget(model, input.targetEntityType, input.targetEntityId);
    if (!target) throw new Error("Euclid review target was not found in the current canonical model.");
    const targetFingerprint = heliosEuclidReviewTargetFingerprint(target);
    if (targetFingerprint !== input.targetFingerprint) {
      throw new Error("Euclid review target changed. Reload the cockpit before recording a decision.");
    }

    const decisionFingerprint = heliosEuclidReviewDecisionFingerprint(input);
    const requestDecision = await ctx.db
      .query("heliosEuclidReviewDecisions")
      .withIndex("by_model_request", (query) =>
        query.eq("euclidModelId", modelRecord._id).eq("requestId", input.requestId),
      )
      .first();
    if (requestDecision) {
      if (requestDecision.decisionFingerprint !== decisionFingerprint) {
        throw new Error("Euclid review request was already used for a different decision.");
      }
      return {
        decisionId: String(requestDecision._id),
        action: requestDecision.action,
        createdAt: requestDecision.createdAt,
      };
    }
    const existing = await ctx.db
      .query("heliosEuclidReviewDecisions")
      .withIndex("by_decision_fingerprint", (query) => query.eq("decisionFingerprint", decisionFingerprint))
      .first();
    if (existing) {
      if (existing.companyId !== companyId || existing.projectId !== project._id) throw new Error("Euclid review decision is not available.");
      return { decisionId: String(existing._id), action: existing.action, createdAt: existing.createdAt };
    }

    const createdAt = Date.now();
    const decisionId = await ctx.db.insert("heliosEuclidReviewDecisions", {
      companyId,
      projectId: project._id,
      packageId: modelRecord.packageId,
      packageRevision: modelRecord.packageRevision,
      euclidModelId: modelRecord._id,
      requestId: input.requestId,
      modelFingerprint: modelRecord.modelFingerprint,
      sourceFingerprint: modelRecord.sourceFingerprint,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      targetFingerprint,
      action: input.action,
      reason: input.reason,
      correctionJson: input.changes ? JSON.stringify(input.changes) : undefined,
      beforeJson: JSON.stringify(target),
      decisionFingerprint,
      reviewerUserId: user._id,
      reviewerName: user.name,
      createdAt,
    });
    return { decisionId: String(decisionId), action: input.action, createdAt };
  },
});
