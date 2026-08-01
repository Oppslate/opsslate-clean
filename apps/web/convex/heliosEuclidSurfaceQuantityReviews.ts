import {
  calculateHeliosEuclidSurfaceQuantities,
  heliosEuclidSurfaceQuantityReviewFingerprint,
  normalizeHeliosEuclidSurfaceQuantityReviewInput,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

export const recordDecision = internalMutation({
  args: { principal: heliosPrincipalValidator, projectId: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    const { companyId, user } = await requireHeliosPrincipal(ctx, args.principal);
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project || project.companyId !== companyId) throw new Error("Project not found.");
    const input = normalizeHeliosEuclidSurfaceQuantityReviewInput(args.input);
    const modelId = ctx.db.normalizeId("heliosEuclidModels", input.euclidModelId);
    const modelRecord = modelId ? await ctx.db.get(modelId) : null;
    if (
      !modelRecord || modelRecord.companyId !== companyId || modelRecord.projectId !== project._id
      || !modelRecord.isCurrent || modelRecord.modelFingerprint !== input.modelFingerprint
    ) throw new Error("The canonical Euclid model changed. Recalculate quantities before reviewing them.");

    const existingRequest = await ctx.db
      .query("heliosEuclidSurfaceQuantityReviews")
      .withIndex("by_model_request", (query) => query.eq("euclidModelId", modelRecord._id).eq("requestId", input.requestId))
      .first();
    if (existingRequest) {
      if (
        existingRequest.resultFingerprint !== input.resultFingerprint
        || existingRequest.draftQuantityId !== input.draftQuantityId
        || existingRequest.draftQuantityFingerprint !== input.draftQuantityFingerprint
        || existingRequest.action !== input.action
        || existingRequest.reason !== input.reason
      ) throw new Error("Review request was already used for a different draft decision.");
      return {
        reviewId: String(existingRequest._id),
        decisionFingerprint: existingRequest.decisionFingerprint,
        action: existingRequest.action,
        createdAt: existingRequest.createdAt,
        reused: true,
      };
    }

    const model = await reconstructEuclidModel(ctx, modelRecord);
    const result = calculateHeliosEuclidSurfaceQuantities(model, { alignmentId: input.alignmentId });
    if (result.fingerprint !== input.resultFingerprint) {
      throw new Error("The governed 4P result changed. Recalculate quantities before reviewing them.");
    }
    const draft = result.draftQuantities.find((row) => row.id === input.draftQuantityId);
    if (!draft || draft.fingerprint !== input.draftQuantityFingerprint) {
      throw new Error("The governed 4P draft changed. Recalculate quantities before reviewing it.");
    }
    if (input.action === "accept" && draft.engineeringStatus !== "verified") {
      throw new Error("Only a verified 4P draft can be accepted. Resolve its surface controls and recalculate.");
    }

    const now = Date.now();
    const decisionFingerprint = heliosEuclidSurfaceQuantityReviewFingerprint({
      modelFingerprint: modelRecord.modelFingerprint,
      resultFingerprint: result.fingerprint,
      draftQuantityId: draft.id,
      draftQuantityFingerprint: draft.fingerprint,
      action: input.action,
      reason: input.reason,
      reviewerUserId: String(user._id),
      createdAt: now,
    });
    const reviewId = await ctx.db.insert("heliosEuclidSurfaceQuantityReviews", {
      companyId,
      projectId: project._id,
      packageId: modelRecord.packageId,
      packageRevision: modelRecord.packageRevision,
      euclidModelId: modelRecord._id,
      modelFingerprint: modelRecord.modelFingerprint,
      alignmentId: draft.alignmentId,
      requestId: input.requestId,
      decisionFingerprint,
      resultFingerprint: result.fingerprint,
      draftQuantityId: draft.id,
      draftQuantityFingerprint: draft.fingerprint,
      calculationType: draft.calculationType,
      label: draft.label,
      value: draft.value,
      unit: draft.unit,
      engineeringStatus: draft.engineeringStatus,
      confidence: draft.confidence,
      action: input.action,
      reason: input.reason,
      reviewerUserId: user._id,
      reviewerName: user.name || user.email,
      createdAt: now,
    });
    return {
      reviewId: String(reviewId),
      decisionFingerprint,
      action: input.action,
      createdAt: now,
      reused: false,
    };
  },
});
