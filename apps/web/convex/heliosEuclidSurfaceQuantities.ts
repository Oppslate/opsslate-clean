import {
  calculateHeliosEuclidSurfaceQuantities,
  type HeliosEuclidSurfaceQuantityReviewRecord,
  type HeliosEuclidSurfaceQuantityReviewWorkspace,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

export const calculateDraftQuantities = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    input: v.object({
      alignmentId: v.string(),
      chainageStart: v.optional(v.number()),
      chainageEnd: v.optional(v.number()),
      interval: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args): Promise<HeliosEuclidSurfaceQuantityReviewWorkspace> => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) throw new Error("Project not found.");
    const project = await ctx.db.get(projectId);
    if (!project || project.companyId !== companyId) throw new Error("Project not found.");
    const modelRecord = await ctx.db
      .query("heliosEuclidModels")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!modelRecord || modelRecord.companyId !== companyId) throw new Error("The project has no current canonical Euclid model.");
    const model = await reconstructEuclidModel(ctx, modelRecord);
    const result = calculateHeliosEuclidSurfaceQuantities(model, args.input);
    const [solutionRecord, promotion, reviewRecords, publicationRecords, estimates] = await Promise.all([
      ctx.db
        .query("heliosEuclidIntegrationSolutions")
        .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
        .first(),
      ctx.db
        .query("heliosEuclidPromotions")
        .withIndex("by_promoted_model", (query) => query.eq("promotedEuclidModelId", modelRecord._id))
        .first(),
      ctx.db
        .query("heliosEuclidSurfaceQuantityReviews")
        .withIndex("by_model_created", (query) => query.eq("euclidModelId", modelRecord._id))
        .collect(),
      ctx.db
        .query("heliosEuclidQuantityPublications")
        .withIndex("by_model_created", (query) => query.eq("euclidModelId", modelRecord._id))
        .collect(),
      ctx.db
        .query("heliosEstimates")
        .withIndex("by_project_version", (query) => query.eq("projectId", projectId))
        .collect(),
    ]);
    if (solutionRecord && (solutionRecord.companyId !== companyId || solutionRecord.euclidModelId !== modelRecord._id)) {
      throw new Error("Euclid quantity solution identity is stale.");
    }
    if (promotion && (promotion.companyId !== companyId || promotion.projectId !== projectId)) {
      throw new Error("Euclid quantity promotion identity is stale.");
    }
    const estimate = estimates
      .filter((row) => row.companyId === companyId && (row.status === "ready_for_review" || row.status === "accepted"))
      .sort((left, right) => right.version - left.version)[0];
    const costCodes = estimate
      ? await ctx.db.query("heliosEstimateCostCodes").withIndex("by_estimate", (query) => query.eq("estimateId", estimate._id)).collect()
      : [];
    const targets = [];
    for (const costCode of costCodes) {
      if (costCode.companyId !== companyId || costCode.reviewStatus === "rejected") continue;
      const payItem = await ctx.db.get(costCode.payItemId);
      const section = payItem ? await ctx.db.get(payItem.sectionId) : null;
      if (
        !payItem || !section || payItem.companyId !== companyId || section.companyId !== companyId
        || payItem.estimateId !== estimate?._id || section.estimateId !== estimate?._id
        || payItem.reviewStatus === "rejected" || section.reviewStatus === "rejected"
      ) continue;
      targets.push({
        costCodeId: String(costCode._id),
        code: costCode.code,
        description: costCode.description,
        payItemNumber: payItem.officialItemNumber,
        payItemDescription: payItem.estimatorDescription || payItem.description,
        productionUnit: costCode.productionUnit,
        reviewStatus: costCode.reviewStatus as "proposed" | "deferred" | "accepted" | "corrected",
      });
    }
    const latestReviewByDraft = new Map<string, typeof reviewRecords[number]>();
    for (const review of reviewRecords.sort((left, right) => left.createdAt - right.createdAt)) {
      if (
        review.companyId === companyId
        && review.resultFingerprint === result.fingerprint
        && result.draftQuantities.some((draft) => draft.id === review.draftQuantityId && draft.fingerprint === review.draftQuantityFingerprint)
      ) latestReviewByDraft.set(review.draftQuantityId, review);
    }
    const publicationByDraft = new Map(publicationRecords.flatMap((publication) =>
      publication.companyId === companyId && publication.projectId === projectId
      && publication.surfaceQuantityResultFingerprint === result.fingerprint && publication.surfaceDraftQuantityId
        ? [[publication.surfaceDraftQuantityId, publication] as const]
        : []));
    const draftQuantities = result.draftQuantities.map((draft) => {
      const review = latestReviewByDraft.get(draft.id);
      const publication = publicationByDraft.get(draft.id);
      return {
        ...draft,
        review: review ? {
          id: String(review._id),
          decisionFingerprint: review.decisionFingerprint,
          draftQuantityId: review.draftQuantityId,
          draftQuantityFingerprint: review.draftQuantityFingerprint,
          resultFingerprint: review.resultFingerprint,
          action: review.action,
          reason: review.reason,
          reviewerName: review.reviewerName,
          createdAt: review.createdAt,
        } satisfies HeliosEuclidSurfaceQuantityReviewRecord : undefined,
        publication: publication ? {
          id: String(publication._id),
          estimateQuantityId: String(publication.estimateQuantityId),
          costCodeId: String(publication.costCodeId),
          use: publication.use,
          publishedByName: publication.publishedByName,
          createdAt: publication.createdAt,
        } : undefined,
      };
    });
    const eligible = Boolean(
      promotion?.status === "promoted"
      && promotion.promotedModelFingerprint === modelRecord.modelFingerprint
      && !modelRecord.shadowMode
      && modelRecord.canonicalOrigin === "reviewed_candidate"
      && modelRecord.status === "accepted"
      && modelRecord.validationStatus === "valid"
      && solutionRecord?.isCurrent
      && solutionRecord.status === "passed"
      && solutionRecord.euclidModelId === modelRecord._id
      && solutionRecord.sourceFingerprint === modelRecord.sourceFingerprint,
    );
    const verifiedDraftCount = draftQuantities.filter((draft) => draft.engineeringStatus === "verified").length;
    const status = !eligible
      ? "not_eligible" as const
      : !estimate || !targets.length || !verifiedDraftCount
        ? "blocked" as const
        : "ready" as const;
    const reason = !eligible
      ? "Promote the reviewed canonical Euclid model and wait for a passing engineering graph before reviewing 4P quantities."
      : !estimate
        ? "Build a reviewable estimate before sending governed quantities."
        : !targets.length
          ? "The current estimate has no reviewable cost codes."
          : !verifiedDraftCount
            ? "No verified 4P draft is available. Resolve the listed surface controls and recalculate."
            : undefined;
    return {
      result: { ...result, draftQuantities },
      boundary: {
        status,
        reason,
        euclidModelId: String(modelRecord._id),
        modelFingerprint: modelRecord.modelFingerprint,
        integrationSolutionId: solutionRecord ? String(solutionRecord._id) : undefined,
        integrationSolutionFingerprint: solutionRecord?.solutionFingerprint,
        estimateId: estimate ? String(estimate._id) : undefined,
        reviewedCount: draftQuantities.filter((draft) => Boolean(draft.review)).length,
        acceptedCount: draftQuantities.filter((draft) => draft.review?.action === "accept").length,
        publishedCount: publicationByDraft.size,
        targets: targets.sort((left, right) => left.code.localeCompare(right.code)),
      },
    };
  },
});
