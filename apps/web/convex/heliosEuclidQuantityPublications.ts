import {
  HELIOS_EUCLID_QUANTITY_ADAPTER,
  HELIOS_EUCLID_QUANTITY_PUBLISHER,
  HELIOS_EUCLID_QUANTITY_PUBLISHER_VERSION,
  buildHeliosEngineeringParityFingerprint,
  buildHeliosEuclidQuantityCandidates,
  normalizeHeliosEuclidQuantityPublicationInput,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructIntegrationSolution } from "./heliosEuclidCockpit";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

export const publishCandidate = internalMutation({
  args: { principal: heliosPrincipalValidator, projectId: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    const { companyId, user } = await requireHeliosPrincipal(ctx, args.principal);
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project || project.companyId !== companyId) throw new Error("Project not found.");
    const input = normalizeHeliosEuclidQuantityPublicationInput(args.input);
    const modelId = ctx.db.normalizeId("heliosEuclidModels", input.euclidModelId);
    const solutionId = ctx.db.normalizeId("heliosEuclidIntegrationSolutions", input.integrationSolutionId);
    const costCodeId = ctx.db.normalizeId("heliosEstimateCostCodes", input.costCodeId);
    if (!modelId || !solutionId || !costCodeId) throw new Error("Quantity publication lineage was not found.");

    const [modelRecord, solutionRecord, costCode] = await Promise.all([
      ctx.db.get(modelId), ctx.db.get(solutionId), ctx.db.get(costCodeId),
    ]);
    if (
      !modelRecord || !solutionRecord || !costCode ||
      modelRecord.companyId !== companyId || solutionRecord.companyId !== companyId || costCode.companyId !== companyId ||
      modelRecord.projectId !== project._id || solutionRecord.projectId !== project._id || costCode.projectId !== project._id
    ) throw new Error("Quantity publication lineage was not found.");

    if (
      !modelRecord.isCurrent || modelRecord.validationStatus !== "valid" || modelRecord.status !== "accepted" ||
      modelRecord.shadowMode || modelRecord.canonicalOrigin !== "reviewed_candidate" || (modelRecord.canonicalVersion ?? 1) < 2 ||
      modelRecord.modelFingerprint !== input.modelFingerprint
    ) throw new Error("Only the current promoted canonical Euclid model can publish quantities.");
    const promotion = await ctx.db
      .query("heliosEuclidPromotions")
      .withIndex("by_promoted_model", (query) => query.eq("promotedEuclidModelId", modelRecord._id))
      .first();
    if (!promotion || promotion.status !== "promoted" || promotion.promotedModelFingerprint !== modelRecord.modelFingerprint) {
      throw new Error("The current Euclid model does not have valid governed promotion lineage.");
    }
    if (
      !solutionRecord.isCurrent || solutionRecord.euclidModelId !== modelRecord._id || solutionRecord.status !== "passed" ||
      solutionRecord.sourceFingerprint !== modelRecord.sourceFingerprint ||
      solutionRecord.solutionFingerprint !== input.integrationSolutionFingerprint
    ) throw new Error("The Euclid integration solution is stale or is not passing.");

    const existingRequest = await ctx.db
      .query("heliosEuclidQuantityPublications")
      .withIndex("by_model_request", (query) => query.eq("euclidModelId", modelRecord._id).eq("requestId", input.requestId))
      .first();
    if (existingRequest) {
      if (
        existingRequest.candidateId !== input.candidateId ||
        existingRequest.candidateFingerprint !== input.candidateFingerprint ||
        existingRequest.costCodeId !== costCode._id || existingRequest.use !== input.use
      ) throw new Error("Publication request was already used for different quantity lineage.");
      return {
        publicationId: String(existingRequest._id),
        estimateQuantityId: String(existingRequest.estimateQuantityId),
        status: existingRequest.status,
        reviewStatus: existingRequest.reviewStatus,
        reused: true,
      };
    }

    const model = await reconstructEuclidModel(ctx, modelRecord);
    const solution = await reconstructIntegrationSolution(ctx, solutionRecord, modelRecord.modelKey);
    const candidates = buildHeliosEuclidQuantityCandidates({ model, solution });
    const selected = candidates.find((row) => row.id === input.candidateId);
    if (!selected || selected.fingerprint !== input.candidateFingerprint) {
      throw new Error("The Euclid quantity candidate is stale. Reload the cockpit before publishing.");
    }
    const existingCandidate = await ctx.db
      .query("heliosEuclidQuantityPublications")
      .withIndex("by_model_candidate", (query) => query.eq("euclidModelId", modelRecord._id).eq("candidateId", selected.id))
      .first();
    if (existingCandidate) {
      if (
        existingCandidate.candidateFingerprint !== selected.fingerprint ||
        existingCandidate.costCodeId !== costCode._id || existingCandidate.use !== input.use ||
        existingCandidate.integrationSolutionFingerprint !== solutionRecord.solutionFingerprint
      ) throw new Error("This Euclid candidate is already mapped to another estimate quantity.");
      return {
        publicationId: String(existingCandidate._id),
        estimateQuantityId: String(existingCandidate.estimateQuantityId),
        status: existingCandidate.status,
        reviewStatus: existingCandidate.reviewStatus,
        reused: true,
      };
    }

    const estimates = await ctx.db
      .query("heliosEstimates")
      .withIndex("by_project_version", (query) => query.eq("projectId", project._id))
      .collect();
    const estimate = estimates
      .filter((row) => row.companyId === companyId && (row.status === "ready_for_review" || row.status === "accepted"))
      .sort((left, right) => right.version - left.version)[0];
    if (!estimate || costCode.estimateId !== estimate._id || costCode.reviewStatus === "rejected") {
      throw new Error("Select a current, reviewable estimate cost code for this quantity.");
    }
    const payItem = await ctx.db.get(costCode.payItemId);
    const section = payItem ? await ctx.db.get(payItem.sectionId) : null;
    if (
      !payItem || !section || payItem.companyId !== companyId || section.companyId !== companyId ||
      payItem.estimateId !== estimate._id || section.estimateId !== estimate._id ||
      payItem.reviewStatus === "rejected" || section.reviewStatus === "rejected"
    ) throw new Error("The selected estimate cost code is no longer reviewable.");
    if (input.use === "production" && costCode.productionUnit.trim().toUpperCase() !== selected.unit) {
      throw new Error(`Production quantity unit ${selected.unit} does not match cost-code production unit ${costCode.productionUnit}.`);
    }

    const publicationKey = buildHeliosEngineeringParityFingerprint({
      euclidModelId: String(modelRecord._id), modelFingerprint: modelRecord.modelFingerprint,
      integrationSolutionId: String(solutionRecord._id), integrationSolutionFingerprint: solutionRecord.solutionFingerprint,
      candidateId: selected.id, candidateFingerprint: selected.fingerprint,
      estimateId: String(estimate._id), costCodeId: String(costCode._id), use: input.use,
      publisher: HELIOS_EUCLID_QUANTITY_PUBLISHER, publisherVersion: HELIOS_EUCLID_QUANTITY_PUBLISHER_VERSION,
    });
    const duplicate = await ctx.db
      .query("heliosEuclidQuantityPublications")
      .withIndex("by_publication_key", (query) => query.eq("publicationKey", publicationKey))
      .first();
    if (duplicate) return {
      publicationId: String(duplicate._id), estimateQuantityId: String(duplicate.estimateQuantityId),
      status: duplicate.status, reviewStatus: duplicate.reviewStatus, reused: true,
    };

    const now = Date.now();
    const estimateQuantityId = await ctx.db.insert("heliosEstimateQuantities", {
      companyId, projectId: project._id, estimateId: estimate._id, costCodeId: costCode._id,
      value: selected.value, unit: selected.unit, quantityType: "plan",
      sourceLabel: "Helios governed Euclid quantity",
      sourceReference: `euclid-model:${modelRecord._id}; integration:${solutionRecord._id}; candidate:${selected.id}`,
      method: `${selected.method}. ${selected.formula}`,
      confidence: selected.confidence, use: input.use, status: "current", reviewStatus: "proposed",
      origin: "human", evidenceIds: [], createdAt: now, updatedAt: now,
    });
    const publicationId = await ctx.db.insert("heliosEuclidQuantityPublications", {
      companyId, projectId: project._id, packageId: modelRecord.packageId, packageRevision: modelRecord.packageRevision,
      euclidModelId: modelRecord._id, canonicalVersion: modelRecord.canonicalVersion ?? 1,
      integrationSolutionId: solutionRecord._id, estimateId: estimate._id, costCodeId: costCode._id, estimateQuantityId,
      requestId: input.requestId, publicationKey, candidateId: selected.id, candidateFingerprint: selected.fingerprint,
      sourceFingerprint: selected.sourceFingerprint, modelFingerprint: selected.modelFingerprint,
      integrationSolutionFingerprint: selected.solutionFingerprint, readinessId: selected.readinessId,
      capability: selected.capability, calculationType: selected.calculationType, alignmentId: selected.alignmentId,
      label: selected.label, value: selected.value, unit: selected.unit, formula: selected.formula, method: selected.method,
      inputEntityIds: selected.inputEntityIds, provenanceKeys: selected.provenanceIds, confidence: selected.confidence,
      use: input.use, status: "published", reviewStatus: "proposed",
      publisher: HELIOS_EUCLID_QUANTITY_PUBLISHER, publisherVersion: HELIOS_EUCLID_QUANTITY_PUBLISHER_VERSION,
      adapterVersion: HELIOS_EUCLID_QUANTITY_ADAPTER, createdBy: user._id,
      publishedByName: user.name || user.email, createdAt: now,
    });
    await ctx.db.insert("heliosEstimateDecisionEvents", {
      companyId, projectId: project._id, estimateId: estimate._id, recordType: "quantity",
      recordId: String(estimateQuantityId), action: "create",
      decisionValue: {
        euclidQuantityPublicationId: String(publicationId), candidateId: selected.id,
        value: selected.value, unit: selected.unit, use: input.use, reviewStatus: "proposed",
      },
      reviewerUserId: user._id, reviewerName: user.name || user.email, createdAt: now,
    });
    return {
      publicationId: String(publicationId), estimateQuantityId: String(estimateQuantityId),
      status: "published" as const, reviewStatus: "proposed" as const, reused: false,
    };
  },
});
