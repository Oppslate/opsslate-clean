import {
  HELIOS_EUCLID_INTEGRATION_SOLVER,
  buildHeliosEngineeringParityFingerprint,
  buildHeliosEuclidCockpitWorkspace,
  buildHeliosEuclidQuantityCandidates,
  heliosEuclidIntegrationSolutionFingerprint,
  type HeliosEuclidEngineeringGraphEdge,
  type HeliosEuclidEngineeringGraphNode,
  type HeliosEuclidIntegrationCheck,
  type HeliosEuclidIntegrationSolution,
  type HeliosEuclidValidationDelta,
  type HeliosEuclidQuantityReadiness,
  type HeliosEuclidCockpitWorkspace,
  type HeliosEuclidReviewDecision,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

async function ownedProject(
  ctx: QueryCtx,
  companyId: Id<"companies">,
  projectIdValue: string,
) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  if (!projectId) throw new Error("Project not found.");
  const project = await ctx.db.get(projectId);
  if (!project || project.companyId !== companyId) throw new Error("Project not found.");
  return project;
}

function projectSummary(project: Doc<"heliosProjects">) {
  return {
    id: String(project._id),
    name: project.name,
    projectNumber: project.projectNumber,
    ownerClient: project.ownerClient,
    bidDate: project.bidDate,
    location: project.location,
  };
}

export async function reconstructIntegrationSolution(
  ctx: QueryCtx | MutationCtx,
  record: Doc<"heliosEuclidIntegrationSolutions">,
): Promise<HeliosEuclidIntegrationSolution> {
  if (record.status === "failed" || record.status === "superseded") {
    throw new Error("The current Euclid relationship graph is not readable.");
  }
  const chunks = await ctx.db
    .query("heliosEuclidIntegrationSolutionChunks")
    .withIndex("by_solution", (query) => query.eq("solutionId", record._id))
    .collect();
  if (chunks.length !== record.chunkCount) throw new Error("Euclid relationship graph chunks are incomplete.");
  const nodes: HeliosEuclidEngineeringGraphNode[] = [];
  const edges: HeliosEuclidEngineeringGraphEdge[] = [];
  const readiness: HeliosEuclidQuantityReadiness[] = [];
  const checks: HeliosEuclidIntegrationCheck[] = [];
  let storedItemCount = 0;
  for (const chunk of [...chunks].sort((left, right) => left.chunkIndex - right.chunkIndex)) {
    const payload = JSON.parse(chunk.payloadJson) as Array<{ kind?: string; payload?: unknown }>;
    if (!Array.isArray(payload) || payload.length !== chunk.itemCount) throw new Error("Euclid relationship graph chunk count is invalid.");
    if (buildHeliosEngineeringParityFingerprint(payload) !== chunk.payloadFingerprint) throw new Error("Euclid relationship graph chunk fingerprint is invalid.");
    storedItemCount += payload.length;
    for (const item of payload) {
      if (item.kind === "node") nodes.push(item.payload as HeliosEuclidEngineeringGraphNode);
      else if (item.kind === "edge") edges.push(item.payload as HeliosEuclidEngineeringGraphEdge);
      else if (item.kind === "readiness") readiness.push(item.payload as HeliosEuclidQuantityReadiness);
      else if (item.kind === "check") checks.push(item.payload as HeliosEuclidIntegrationCheck);
      else throw new Error("Euclid relationship graph contains an unsupported item.");
    }
  }
  if (
    storedItemCount !== record.nodeCount + record.edgeCount + record.readinessCount + record.checkCount ||
    nodes.length !== record.nodeCount ||
    edges.length !== record.edgeCount ||
    readiness.length !== record.readinessCount ||
    checks.length !== record.checkCount
  ) throw new Error("Euclid relationship graph totals are inconsistent.");
  const idBasis = {
    modelFingerprint: record.modelFingerprint,
    horizontal: record.horizontalSolutionFingerprint,
    vertical: record.verticalSolutionFingerprint,
    solver: HELIOS_EUCLID_INTEGRATION_SOLVER,
  };
  const solution: HeliosEuclidIntegrationSolution = {
    id: `integration-solution:${buildHeliosEngineeringParityFingerprint(idBasis).split(":")[1]!.slice(0, 32)}`,
    euclidModelId: String(record.euclidModelId),
    sourceFingerprint: record.sourceFingerprint,
    modelFingerprint: record.modelFingerprint,
    horizontalSolutionFingerprint: record.horizontalSolutionFingerprint,
    verticalSolutionFingerprint: record.verticalSolutionFingerprint,
    solver: HELIOS_EUCLID_INTEGRATION_SOLVER,
    solverVersion: record.solverVersion as HeliosEuclidIntegrationSolution["solverVersion"],
    status: record.status,
    nodes,
    edges,
    readiness,
    checks,
    readyCount: record.readyCount,
    reviewCount: record.reviewCount,
    blockedCount: record.blockedCount,
    unavailableCount: record.unavailableCount,
  };
  if (heliosEuclidIntegrationSolutionFingerprint(solution) !== record.solutionFingerprint) {
    throw new Error("Euclid relationship graph failed end-to-end fingerprint validation.");
  }
  return solution;
}

export const getWorkspace = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    alignmentId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<HeliosEuclidCockpitWorkspace> => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const modelRecord = await ctx.db
      .query("heliosEuclidModels")
      .withIndex("by_project_current", (query) => query.eq("projectId", project._id).eq("isCurrent", true))
      .first();
    if (!modelRecord || modelRecord.companyId !== companyId) {
      return buildHeliosEuclidCockpitWorkspace({ project: projectSummary(project) });
    }
    const [solutionRecord, reviewRecords, candidateRecord, promotionRecord] = await Promise.all([
      ctx.db
        .query("heliosEuclidIntegrationSolutions")
        .withIndex("by_project_current", (query) => query.eq("projectId", project._id).eq("isCurrent", true))
        .first(),
      ctx.db
        .query("heliosEuclidReviewDecisions")
        .withIndex("by_model_created", (query) => query.eq("euclidModelId", modelRecord._id))
        .collect(),
      ctx.db
        .query("heliosEuclidReviewCandidates")
        .withIndex("by_model_created", (query) => query.eq("sourceEuclidModelId", modelRecord._id))
        .order("desc")
        .first(),
      ctx.db
        .query("heliosEuclidPromotions")
        .withIndex("by_promoted_model", (query) => query.eq("promotedEuclidModelId", modelRecord._id))
        .first(),
    ]);
    if (solutionRecord && (solutionRecord.companyId !== companyId || solutionRecord.euclidModelId !== modelRecord._id)) {
      throw new Error("Euclid cockpit identity is stale.");
    }
    if (
      candidateRecord &&
      (
        candidateRecord.companyId !== companyId ||
        candidateRecord.projectId !== project._id ||
        candidateRecord.sourceEuclidModelId !== modelRecord._id ||
        candidateRecord.downstreamEligible !== false
      )
    ) throw new Error("Euclid reviewed candidate identity is invalid.");
    if (promotionRecord && (promotionRecord.companyId !== companyId || promotionRecord.projectId !== project._id || promotionRecord.promotedEuclidModelId !== modelRecord._id || promotionRecord.promotedModelFingerprint !== modelRecord.modelFingerprint || promotionRecord.downstreamEligible !== false)) throw new Error("Euclid canonical promotion identity is invalid.");
    const model = await reconstructEuclidModel(ctx, modelRecord);
    const validationRecord = candidateRecord
      ? await ctx.db
        .query("heliosEuclidCandidateValidations")
        .withIndex("by_candidate_created", (query) => query.eq("candidateId", candidateRecord._id))
        .order("desc")
        .first()
      : undefined;
    let validationDeltas: HeliosEuclidValidationDelta[] = [];
    if (validationRecord) {
      if (
        validationRecord.companyId !== companyId ||
        validationRecord.projectId !== project._id ||
        validationRecord.candidateId !== candidateRecord?._id ||
        validationRecord.promotionEligible !== false ||
        validationRecord.downstreamEligible !== false
      ) throw new Error("Euclid candidate validation identity is invalid.");
      const chunks = await ctx.db
        .query("heliosEuclidCandidateValidationChunks")
        .withIndex("by_validation", (query) => query.eq("validationId", validationRecord._id))
        .collect();
      if (chunks.length !== validationRecord.chunkCount) throw new Error("Euclid candidate validation chunks are incomplete.");
      for (const chunk of chunks) {
        const payload = JSON.parse(chunk.payloadJson) as unknown;
        if (!Array.isArray(payload) || payload.length !== chunk.itemCount) throw new Error("Euclid candidate validation chunk count is invalid.");
        if (buildHeliosEngineeringParityFingerprint(payload) !== chunk.payloadFingerprint) throw new Error("Euclid candidate validation chunk fingerprint is invalid.");
        if (chunk.resultType === "delta") validationDeltas.push(...payload as HeliosEuclidValidationDelta[]);
      }
      if (validationDeltas.length !== validationRecord.changedCount) throw new Error("Euclid candidate validation delta total is inconsistent.");
      validationDeltas = validationDeltas.sort((left, right) => left.domain.localeCompare(right.domain) || left.scopeId.localeCompare(right.scopeId) || left.code.localeCompare(right.code));
    }
    const reviewDecisions: HeliosEuclidReviewDecision[] = reviewRecords.map((row) => ({
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
    const solution = solutionRecord && solutionRecord.status !== "failed"
      ? await reconstructIntegrationSolution(ctx, solutionRecord)
      : undefined;
    const estimates = await ctx.db
      .query("heliosEstimates")
      .withIndex("by_project_version", (query) => query.eq("projectId", project._id))
      .collect();
    const estimate = estimates
      .filter((row) => row.companyId === companyId && (row.status === "ready_for_review" || row.status === "accepted"))
      .sort((left, right) => right.version - left.version)[0];
    const [costCodes, publications] = await Promise.all([
      estimate
        ? ctx.db.query("heliosEstimateCostCodes").withIndex("by_estimate", (query) => query.eq("estimateId", estimate._id)).collect()
        : Promise.resolve([]),
      ctx.db.query("heliosEuclidQuantityPublications").withIndex("by_model_created", (query) => query.eq("euclidModelId", modelRecord._id)).collect(),
    ]);
    const targets = [];
    for (const costCode of costCodes) {
      if (costCode.companyId !== companyId || costCode.reviewStatus === "rejected") continue;
      const payItem = await ctx.db.get(costCode.payItemId);
      const section = payItem ? await ctx.db.get(payItem.sectionId) : null;
      if (
        !payItem || !section || payItem.companyId !== companyId || section.companyId !== companyId ||
        payItem.estimateId !== estimate?._id || section.estimateId !== estimate?._id ||
        payItem.reviewStatus === "rejected" || section.reviewStatus === "rejected"
      ) continue;
      targets.push({
        costCodeId: String(costCode._id), code: costCode.code, description: costCode.description,
        payItemNumber: payItem.officialItemNumber, payItemDescription: payItem.estimatorDescription || payItem.description,
        productionUnit: costCode.productionUnit,
        reviewStatus: costCode.reviewStatus as "proposed" | "deferred" | "accepted" | "corrected",
      });
    }
    const quantityEligible = Boolean(
      promotionRecord && !modelRecord.shadowMode && modelRecord.canonicalOrigin === "reviewed_candidate" &&
      modelRecord.status === "accepted" && solution && solutionRecord?.status === "passed",
    );
    const rawCandidates = quantityEligible && solution
      ? buildHeliosEuclidQuantityCandidates({ model, solution })
      : [];
    const publicationByCandidate = new Map(publications.map((row) => [row.candidateId, row]));
    const quantityCandidates = rawCandidates.map((row) => {
      const publication = publicationByCandidate.get(row.id);
      return {
        ...row,
        publication: publication ? {
          id: String(publication._id), estimateQuantityId: String(publication.estimateQuantityId),
          costCodeId: String(publication.costCodeId), use: publication.use,
          publishedByName: publication.publishedByName, createdAt: publication.createdAt,
        } : undefined,
      };
    });
    const quantityStatus = !quantityEligible
      ? "not_eligible" as const
      : !estimate || !targets.length || !quantityCandidates.length
        ? "blocked" as const
        : "ready" as const;
    const quantityReason = !quantityEligible
      ? "Promote the reviewed Euclid candidate and wait for its passing engineering graph before publishing quantities."
      : !estimate
        ? "Build a reviewable estimate before publishing Euclid quantities."
        : !targets.length
          ? "The current estimate has no reviewable cost codes."
          : !quantityCandidates.length
            ? "No quantity capability is ready on the current canonical model."
            : undefined;
    return buildHeliosEuclidCockpitWorkspace({
      project: projectSummary(project),
      model,
      modelRecord: {
        id: String(modelRecord._id),
        packageRevision: modelRecord.packageRevision,
        modelFingerprint: modelRecord.modelFingerprint,
        shadowMode: modelRecord.shadowMode,
        canonicalVersion: modelRecord.canonicalVersion ?? 1,
        canonicalOrigin: modelRecord.canonicalOrigin ?? "ingestion",
        issueCount: modelRecord.issueCount,
        blockingIssueCount: modelRecord.blockingIssueCount,
        updatedAt: modelRecord.updatedAt,
        promotion: promotionRecord ? {
          id: String(promotionRecord._id),
          sourceEuclidModelId: String(promotionRecord.sourceEuclidModelId),
          candidateId: String(promotionRecord.candidateId),
          validationId: String(promotionRecord.validationId),
          promotedByName: promotionRecord.promotedByName,
          downstreamEligible: false,
          createdAt: promotionRecord.createdAt,
        } : undefined,
      },
      reviewDecisions,
      candidateRecord: candidateRecord ? {
        id: String(candidateRecord._id),
        status: candidateRecord.status,
        validationEligible: candidateRecord.validationEligible,
        downstreamEligible: false,
        reviewSetFingerprint: candidateRecord.reviewSetFingerprint,
        candidateFingerprint: candidateRecord.candidateFingerprint,
        totalTargetCount: candidateRecord.totalTargetCount,
        acceptedCount: candidateRecord.acceptedCount,
        correctedCount: candidateRecord.correctedCount,
        deferredCount: candidateRecord.deferredCount,
        rejectedCount: candidateRecord.rejectedCount,
        unreviewedCount: candidateRecord.unreviewedCount,
        blockingReasons: candidateRecord.blockingReasons,
        createdAt: candidateRecord.createdAt,
        validation: validationRecord ? {
          id: String(validationRecord._id),
          status: validationRecord.status,
          validationPassed: validationRecord.validationPassed,
          promotionEligible: false,
          downstreamEligible: false,
          validationFingerprint: validationRecord.validationFingerprint,
          candidateFingerprint: validationRecord.candidateFingerprint,
          reviewSetFingerprint: validationRecord.reviewSetFingerprint,
          changedCount: validationRecord.changedCount,
          improvedCount: validationRecord.improvedCount,
          degradedCount: validationRecord.degradedCount,
          horizontalStatus: validationRecord.horizontalStatus,
          verticalStatus: validationRecord.verticalStatus,
          integrationStatus: validationRecord.integrationStatus,
          readyCount: validationRecord.readyCount,
          reviewCount: validationRecord.reviewCount,
          blockedCount: validationRecord.blockedCount,
          unavailableCount: validationRecord.unavailableCount,
          blockingReasons: validationRecord.blockingReasons,
          deltas: validationDeltas,
          createdAt: validationRecord.createdAt,
        } : undefined,
      } : undefined,
      solution,
      solutionRecord: solutionRecord ? {
        id: String(solutionRecord._id),
        status: solutionRecord.status === "superseded" ? "failed" : solutionRecord.status,
        solver: solutionRecord.solver,
        solverVersion: solutionRecord.solverVersion,
        nodeCount: solutionRecord.nodeCount,
        edgeCount: solutionRecord.edgeCount,
        checkCount: solutionRecord.checkCount,
        completedAt: solutionRecord.completedAt,
        lastError: solutionRecord.lastError,
      } : undefined,
      quantityPublication: {
        status: quantityStatus,
        reason: quantityReason,
        euclidModelId: String(modelRecord._id),
        integrationSolutionId: solutionRecord ? String(solutionRecord._id) : undefined,
        integrationSolutionFingerprint: solutionRecord?.solutionFingerprint,
        estimateId: estimate ? String(estimate._id) : undefined,
        publishedCount: publications.length,
        candidates: quantityCandidates,
        targets: targets.sort((left, right) => left.code.localeCompare(right.code)),
      },
      selectedAlignmentId: args.alignmentId,
    });
  },
});
