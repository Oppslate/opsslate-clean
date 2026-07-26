import {
  calculateCostCodeDirectCost,
  calculateDerivedUnitCost,
  calculateEstimateReviewSummary,
  calculatePricingStatus,
  calculateResourceCost,
  parseEstimateProposal,
  reconcileAllocations,
  type HeliosEstimateWorkspace,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

const ESTIMATE_SCHEMA_VERSION = 2;

const startEstimateReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosEstimateJobs"> },
  null
>("heliosEstimateActions:startEstimateProposal");

async function ownedProject(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">,
  projectIdValue: string,
) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  if (!projectId) throw new Error("Project not found.");
  const project = await ctx.db.get(projectId);
  if (!project || project.companyId !== companyId) {
    throw new Error("Project not found.");
  }
  return project;
}

async function currentProjectIntelligence(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"heliosProjects">,
) {
  const rows = await ctx.db
    .query("heliosProjectIntelligence")
    .withIndex("by_project", (query) => query.eq("projectId", projectId))
    .order("desc")
    .collect();
  return rows.find((row) => row.isCurrent !== false) || null;
}

function evidenceId(
  ctx: MutationCtx,
  value: string,
): Id<"heliosEvidence"> {
  const id = ctx.db.normalizeId("heliosEvidence", value);
  if (!id) throw new Error("Estimate proposal contains invalid evidence.");
  return id;
}

export const requestProposal = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const intelligence = await currentProjectIntelligence(ctx, project._id);
    if (!intelligence) {
      throw new Error("Project intelligence must be ready before an estimate proposal can be created.");
    }
    if (
      project.currentPackageRevision !== undefined &&
      intelligence.packageRevision !== project.currentPackageRevision
    ) {
      throw new Error("Project intelligence is stale. Reanalyze the current bid package first.");
    }
    const activeJobs = await Promise.all(
      (["queued", "processing"] as const).map((status) =>
        ctx.db
          .query("heliosEstimateJobs")
          .withIndex("by_project_status", (query) =>
            query.eq("projectId", project._id).eq("status", status),
          )
          .first(),
      ),
    );
    if (activeJobs.some(Boolean)) {
      throw new Error("An estimate proposal is already processing.");
    }
    const previous = await ctx.db
      .query("heliosEstimates")
      .withIndex("by_project_version", (query) =>
        query.eq("projectId", project._id),
      )
      .order("desc")
      .first();
    const now = Date.now();
    const estimateId = await ctx.db.insert("heliosEstimates", {
      companyId,
      projectId: project._id,
      createdBy: user._id,
      sourceIntelligenceId: intelligence._id,
      sourcePackageRevision: intelligence.packageRevision,
      version: (previous?.version || 0) + 1,
      schemaVersion: ESTIMATE_SCHEMA_VERSION,
      status: "proposal_processing",
      overheadBasisPoints: 0,
      profitBasisPoints: 0,
      bondBasisPoints: 0,
      taxProfileStatus: "not_configured",
      createdAt: now,
      updatedAt: now,
    });
    const jobId = await ctx.db.insert("heliosEstimateJobs", {
      companyId,
      projectId: project._id,
      estimateId,
      sourceIntelligenceId: intelligence._id,
      packageRevision: intelligence.packageRevision,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, startEstimateReference, { jobId });
    return { estimateId: String(estimateId), jobId: String(jobId), status: "queued" as const };
  },
});

export const loadEstimateJob = internalQuery({
  args: { jobId: v.id("heliosEstimateJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const [estimate, project, intelligence, evidence] = await Promise.all([
      ctx.db.get(job.estimateId),
      ctx.db.get(job.projectId),
      ctx.db.get(job.sourceIntelligenceId),
      ctx.db
        .query("heliosEvidence")
        .withIndex("by_project", (query) => query.eq("projectId", job.projectId))
        .collect(),
    ]);
    if (!estimate || !project || !intelligence) return null;
    return { job, estimate, project, intelligence, evidence };
  },
});

export const markEstimateProcessing = internalMutation({
  args: {
    jobId: v.id("heliosEstimateJobs"),
    responseId: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "queued") return false;
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: "processing",
      openaiResponseId: args.responseId,
      model: args.model,
      startedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(job.estimateId, { model: args.model, updatedAt: now });
    return true;
  },
});

export const completeEstimateProposal = internalMutation({
  args: {
    jobId: v.id("heliosEstimateJobs"),
    model: v.string(),
    result: v.any(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || !["queued", "processing"].includes(job.status)) return null;
    const evidenceRows = await ctx.db
      .query("heliosEvidence")
      .withIndex("by_project", (query) => query.eq("projectId", job.projectId))
      .collect();
    const proposal = parseEstimateProposal(
      args.result,
      evidenceRows.map((row) => String(row._id)),
    );
    const now = Date.now();
    const projectEstimates = await ctx.db
      .query("heliosEstimates")
      .withIndex("by_project_version", (query) => query.eq("projectId", job.projectId))
      .order("desc")
      .collect();
    const previousAccepted = projectEstimates.find(
      (estimate) => estimate._id !== job.estimateId && estimate.status === "accepted",
    );
    const previousItems = previousAccepted
      ? await ctx.db.query("heliosOwnerPayItems").withIndex("by_estimate", (query) => query.eq("estimateId", previousAccepted._id)).collect()
      : [];
    const previousByNumber = new Map(previousItems.map((item) => [item.officialItemNumber, item]));
    const proposedItemNumbers = new Set<string>();
    for (const section of proposal.sections) {
      const sectionId = await ctx.db.insert("heliosEstimateSections", {
        companyId: job.companyId,
        projectId: job.projectId,
        estimateId: job.estimateId,
        key: section.key,
        name: section.name,
        sequence: section.sequence,
        reviewStatus: "proposed",
        evidenceIds: section.evidenceIds.map((id) => evidenceId(ctx, id)),
        createdAt: now,
        updatedAt: now,
      });
      for (const [itemIndex, item] of section.payItems.entries()) {
        proposedItemNumbers.add(item.officialItemNumber);
        const previousItem = previousByNumber.get(item.officialItemNumber);
        const importChangeType = !previousItem
          ? "new" as const
          : previousItem.bidUnit !== item.bidUnit ||
              (previousItem.bidQuantity !== undefined && item.bidQuantity !== undefined && previousItem.bidQuantity !== item.bidQuantity)
            ? "conflict" as const
            : previousItem.description !== item.description ||
                previousItem.officialSequence !== item.officialSequence ||
                previousItem.fixedAmountCents !== item.fixedAmountCents
              ? "changed" as const
              : "unchanged" as const;
        const payItemId = await ctx.db.insert("heliosOwnerPayItems", {
          companyId: job.companyId,
          projectId: job.projectId,
          estimateId: job.estimateId,
          sectionId,
          officialSequence: item.officialSequence,
          officialItemNumber: item.officialItemNumber,
          description: item.description,
          estimatorDescription: item.estimatorDescription,
          sequence: itemIndex,
          bidQuantity: item.bidQuantity,
          bidUnit: item.bidUnit,
          itemType: item.itemType,
          fixedAmountCents: item.fixedAmountCents,
          importChangeType,
          quantityStatus: item.quantityStatus,
          confidence: item.confidence,
          reviewStatus: "proposed",
          evidenceIds: item.evidenceIds.map((id) => evidenceId(ctx, id)),
          createdAt: now,
          updatedAt: now,
        });
        for (const [codeIndex, code] of item.costCodes.entries()) {
          const costCodeId = await ctx.db.insert("heliosEstimateCostCodes", {
            companyId: job.companyId,
            projectId: job.projectId,
            estimateId: job.estimateId,
            payItemId,
            code: code.code,
            description: code.description,
            sequence: codeIndex,
            scopeOwnership: code.scopeOwnership,
            productionQuantity: undefined,
            productionUnit: code.productionUnit,
            allocationRequired: false,
            confidence: code.confidence,
            reviewStatus: "proposed",
            evidenceIds: code.evidenceIds.map((id) => evidenceId(ctx, id)),
            createdAt: now,
            updatedAt: now,
          });
          await ctx.db.insert("heliosEstimateQuantities", {
            companyId: job.companyId,
            projectId: job.projectId,
            estimateId: job.estimateId,
            costCodeId,
            value: code.productionQuantity,
            unit: code.productionUnit,
            quantityType: code.productionQuantity === undefined ? "takeoff_required" : "preliminary_ai_takeoff",
            sourceLabel: "Helios estimate proposal",
            method: code.productionQuantity === undefined
              ? "Detailed takeoff required before production pricing and allocation."
              : "Preliminary AI quantity inferred from cited bid documents; estimator verification required.",
            confidence: code.confidence,
            use: "production",
            status: code.productionQuantity === undefined ? "takeoff_required" : "current",
            reviewStatus: "proposed",
            origin: "ai",
            evidenceIds: code.evidenceIds.map((id) => evidenceId(ctx, id)),
            createdAt: now,
            updatedAt: now,
          });
          for (const [resourceIndex, resource] of code.resources.entries()) {
            await ctx.db.insert("heliosEstimateResources", {
              companyId: job.companyId,
              projectId: job.projectId,
              estimateId: job.estimateId,
              costCodeId,
              sequence: resourceIndex,
              resourceClass: resource.resourceClass,
              description: resource.description,
              quantity: resource.quantity,
              unit: resource.unit,
              rateStatus: "unpriced",
              wasteBasisPoints: 0,
              escalationBasisPoints: 0,
              reviewStatus: "proposed",
              taxStatus: resource.taxStatus,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }
    }
    const missingItems = previousItems.filter(
      (item) => item.reviewStatus !== "rejected" && !proposedItemNumbers.has(item.officialItemNumber),
    );
    if (missingItems.length) {
      const missingSectionId = await ctx.db.insert("heliosEstimateSections", {
        companyId: job.companyId,
        projectId: job.projectId,
        estimateId: job.estimateId,
        key: "prior-owner-items-missing",
        name: "Prior owner items missing from current proposal",
        sequence: 999_999,
        reviewStatus: "proposed",
        evidenceIds: [...new Set(missingItems.flatMap((item) => item.evidenceIds))],
        createdAt: now,
        updatedAt: now,
      });
      for (const item of missingItems) {
        await ctx.db.insert("heliosOwnerPayItems", {
          companyId: job.companyId,
          projectId: job.projectId,
          estimateId: job.estimateId,
          sectionId: missingSectionId,
          officialSequence: item.officialSequence ?? item.sequence,
          officialItemNumber: item.officialItemNumber,
          description: item.description,
          estimatorDescription: item.estimatorDescription,
          sequence: item.sequence,
          bidQuantity: item.bidQuantity,
          bidUnit: item.bidUnit,
          itemType: item.itemType ?? (item.bidUnit.toUpperCase() === "LS" ? "lump_sum" : "unit_price"),
          fixedAmountCents: item.fixedAmountCents,
          importChangeType: "missing",
          quantityStatus: item.quantityStatus,
          confidence: item.confidence,
          reviewStatus: "proposed",
          evidenceIds: item.evidenceIds,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    for (const risk of proposal.risks) {
      await ctx.db.insert("heliosEstimateRisks", {
        companyId: job.companyId,
        projectId: job.projectId,
        estimateId: job.estimateId,
        ...risk,
        evidenceIds: risk.evidenceIds.map((id) => evidenceId(ctx, id)),
        reviewStatus: "proposed",
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(job.estimateId, {
      status: "ready_for_review",
      model: args.model,
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(job._id, {
      status: "completed",
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      error: undefined,
      completedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const failEstimateProposal = internalMutation({
  args: { jobId: v.id("heliosEstimateJobs"), error: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || ["completed", "failed"].includes(job.status)) return null;
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: "failed",
      error: args.error,
      completedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(job.estimateId, {
      status: "failed",
      error: args.error,
      updatedAt: now,
    });
    return null;
  },
});

export const getWorkspace = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
  },
  handler: async (ctx, args): Promise<HeliosEstimateWorkspace | null> => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const estimate = await ctx.db
      .query("heliosEstimates")
      .withIndex("by_project_version", (query) => query.eq("projectId", project._id))
      .order("desc")
      .first();
    if (!estimate) return null;
    const [sectionRows, payItemRows, costCodeRows, resourceRows, quantityRows, allocationRows, riskRows, evidenceRows, decisionRows] =
      await Promise.all([
        ctx.db.query("heliosEstimateSections").withIndex("by_estimate_sequence", (q) => q.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosOwnerPayItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEstimateCostCodes").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEstimateResources").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEstimateQuantities").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEstimateAllocations").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEstimateRisks").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEvidence").withIndex("by_project", (q) => q.eq("projectId", project._id)).collect(),
        ctx.db.query("heliosEstimateDecisionEvents").withIndex("by_estimate_created", (q) => q.eq("estimateId", estimate._id)).order("desc").collect(),
      ]);
    const legacyOfficialSequence = new Map(
      [...payItemRows]
        .sort((left, right) => left._creationTime - right._creationTime)
        .map((item, index) => [item._id, index + 1]),
    );
    const resourcesFor = (costCodeId: Id<"heliosEstimateCostCodes">) =>
      resourceRows.filter((row) => row.costCodeId === costCodeId && row.reviewStatus !== "rejected").map((resource) => {
        const effectiveRateCents = resource.overrideRateCents ?? resource.rateCents;
        const calculatedResource = {
          quantity: resource.quantity,
          rateCents: resource.rateCents,
          overrideRateCents: resource.overrideRateCents,
          wasteBasisPoints: resource.wasteBasisPoints || 0,
          escalationBasisPoints: resource.escalationBasisPoints || 0,
        };
        return {
        id: String(resource._id),
        resourceClass: resource.resourceClass,
        description: resource.description,
        quantity: resource.quantity,
        unit: resource.unit,
        rateCents: resource.rateCents,
        rateStatus: resource.rateStatus,
        priceSourceLabel: resource.priceSourceLabel,
        priceSourceReference: resource.priceSourceReference,
        effectiveDate: resource.effectiveDate,
        wasteBasisPoints: resource.wasteBasisPoints || 0,
        durationHours: resource.durationHours,
        crewOrAssembly: resource.crewOrAssembly,
        escalationBasisPoints: resource.escalationBasisPoints || 0,
        overrideRateCents: resource.overrideRateCents,
        overrideReason: resource.overrideReason,
        overriddenBy: resource.overriddenBy ? String(resource.overriddenBy) : undefined,
        overriddenAt: resource.overriddenAt,
        effectiveRateCents,
        taxStatus: resource.taxStatus,
        reviewStatus: resource.reviewStatus || "proposed",
        pricingStatus: effectiveRateCents === undefined || resource.quantity === undefined ? "unpriced" as const : "priced" as const,
        directCostCents: calculateResourceCost(calculatedResource),
      };
      });
    const costCodeModels = new Map(costCodeRows
      .filter((code) => code.reviewStatus !== "rejected")
      .map((code) => {
        const resources = resourcesFor(code._id);
        const directCostCents = calculateCostCodeDirectCost(resources);
        const quantities = quantityRows
          .filter((row) => row.costCodeId === code._id && row.reviewStatus !== "rejected")
          .map((row) => ({
            id: String(row._id),
            costCodeId: String(row.costCodeId),
            value: row.value,
            unit: row.unit,
            quantityType: row.quantityType,
            sourceLabel: row.sourceLabel,
            sourceReference: row.sourceReference,
            method: row.method,
            confidence: row.confidence,
            use: row.use,
            status: row.status,
            reviewStatus: row.reviewStatus,
            origin: row.origin,
            evidenceIds: row.evidenceIds.map(String),
          }));
        const allocations = allocationRows
          .filter((row) => row.sourceCostCodeId === code._id && (row.reviewStatus || "proposed") !== "rejected")
          .map((row) => ({
            id: String(row._id),
            sourceCostCodeId: String(row.sourceCostCodeId),
            targetPayItemId: String(row.targetPayItemId),
            targetCostCodeId: row.targetCostCodeId ? String(row.targetCostCodeId) : undefined,
            allocationType: row.allocationType,
            controllingValue: row.controllingValue ?? row.quantity ?? row.percentBasisPoints ?? row.amountCents ?? 0,
            quantity: row.quantity,
            percentBasisPoints: row.percentBasisPoints,
            amountCents: row.amountCents,
            calculationBasis: row.calculationBasis || "Legacy allocation; estimator review required.",
            balancingStatus: row.balancingStatus || "incomplete",
            reviewStatus: row.reviewStatus || "proposed",
          }));
        const reconciliation = reconcileAllocations({
          allocationRequired: code.allocationRequired || false,
          sourceQuantity: code.productionQuantity,
          sourceCostCents: directCostCents,
          allocations,
        });
        return [String(code._id), {
          id: String(code._id),
          code: code.code,
          description: code.description,
          scopeOwnership: code.scopeOwnership,
          productionQuantity: code.productionQuantity,
          productionUnit: code.productionUnit,
          confidence: code.confidence,
          reviewStatus: code.reviewStatus,
          evidenceIds: code.evidenceIds.map(String),
          resources,
          quantities,
          allocations,
          allocationRequired: code.allocationRequired || false,
          allocationStatus: reconciliation.status,
          reconciliationIssues: reconciliation.issues,
          pricingStatus: calculatePricingStatus(resources),
          directCostCents,
        }] as const;
      }));
    const allocatedAmounts = new Map<string, number>();
    const invalidAllocationItems = new Set<string>();
    for (const code of costCodeRows.filter((row) => row.reviewStatus !== "rejected" && row.allocationRequired)) {
      const model = costCodeModels.get(String(code._id));
      if (!model) continue;
      if (model.allocationStatus !== "balanced") {
        invalidAllocationItems.add(String(code.payItemId));
        model.allocations.forEach((allocation) => invalidAllocationItems.add(allocation.targetPayItemId));
        continue;
      }
      model.allocations.forEach((allocation) => {
        allocatedAmounts.set(
          allocation.targetPayItemId,
          (allocatedAmounts.get(allocation.targetPayItemId) || 0) + (allocation.amountCents || 0),
        );
      });
    }
    const sections = sectionRows.map((section) => ({
      id: String(section._id),
      name: section.name,
      sequence: section.sequence,
      reviewStatus: section.reviewStatus,
      evidenceIds: section.evidenceIds.map(String),
      payItems: payItemRows.filter((item) => item.sectionId === section._id).map((item) => {
        const costCodes = costCodeRows
          .filter((code) => code.payItemId === item._id && code.reviewStatus !== "rejected")
          .map((code) => costCodeModels.get(String(code._id))!)
          .filter(Boolean);
        const codeCosts = costCodes
          .filter((code) => !code.allocationRequired)
          .map((code) => code.directCostCents);
        const directCostCents = invalidAllocationItems.has(String(item._id)) || codeCosts.some((cost) => cost === undefined)
          ? undefined
          : codeCosts.reduce<number>((sum, cost) => sum + (cost || 0), allocatedAmounts.get(String(item._id)) || 0);
        return {
          id: String(item._id),
          officialSequence: item.officialSequence ?? legacyOfficialSequence.get(item._id) ?? item.sequence,
          officialItemNumber: item.officialItemNumber,
          description: item.description,
          estimatorDescription: item.estimatorDescription,
          bidQuantity: item.bidQuantity,
          bidUnit: item.bidUnit,
          itemType: item.itemType ?? (item.bidUnit.toUpperCase() === "LS" ? "lump_sum" : "unit_price"),
          fixedAmountCents: item.fixedAmountCents,
          importChangeType: item.importChangeType ?? "new",
          quantityStatus: item.quantityStatus,
          confidence: item.confidence,
          reviewStatus: item.reviewStatus,
          evidenceIds: item.evidenceIds.map(String),
          costCodes,
          directCostCents,
          derivedUnitCostCents: calculateDerivedUnitCost(directCostCents, item.bidQuantity),
        };
      }),
    }));
    const documentNames = new Map<string, string>();
    await Promise.all(evidenceRows.map(async (row) => {
      if (!documentNames.has(String(row.documentId))) {
        const document = await ctx.db.get(row.documentId);
        documentNames.set(String(row.documentId), document?.fileName || "Project document");
      }
    }));
    const reviewRecords = [
      ...sectionRows.map((row) => ({ reviewStatus: row.reviewStatus })),
      ...payItemRows.map((row) => ({ reviewStatus: row.reviewStatus })),
    ];
    const activeItems = payItemRows.filter((row) => row.reviewStatus !== "rejected");
    const blockers: string[] = [];
    if (!activeItems.length) blockers.push("At least one owner pay item must be retained.");
    const itemNumbers = new Set<string>();
    const itemSequences = new Set<number>();
    for (const item of activeItems) {
      const sequence = item.officialSequence ?? legacyOfficialSequence.get(item._id) ?? item.sequence;
      if (itemNumbers.has(item.officialItemNumber)) blockers.push(`Duplicate owner item ${item.officialItemNumber}.`);
      if (itemSequences.has(sequence)) blockers.push(`Duplicate official sequence ${sequence}.`);
      itemNumbers.add(item.officialItemNumber);
      itemSequences.add(sequence);
      if (["fixed_price", "allowance"].includes(item.itemType || "") && item.fixedAmountCents === undefined) {
        blockers.push(`Owner item ${item.officialItemNumber} is missing its official fixed amount.`);
      }
    }
    return {
      id: String(estimate._id),
      projectId: String(project._id),
      version: estimate.version,
      schemaVersion: estimate.schemaVersion,
      status: estimate.status,
      sourceIntelligenceId: String(estimate.sourceIntelligenceId),
      sourcePackageRevision: estimate.sourcePackageRevision,
      model: estimate.model,
      error: estimate.error,
      overheadBasisPoints: estimate.overheadBasisPoints,
      profitBasisPoints: estimate.profitBasisPoints,
      bondBasisPoints: estimate.bondBasisPoints,
      taxProfileStatus: estimate.taxProfileStatus,
      reviewSummary: calculateEstimateReviewSummary(reviewRecords, [...new Set(blockers)]),
      decisionHistory: decisionRows.map((event) => ({
        id: String(event._id),
        recordType: event.recordType,
        recordId: event.recordId,
        action: event.action,
        comment: event.comment,
        targetRecordId: event.targetRecordId,
        previousValue: event.previousValue,
        decisionValue: event.decisionValue,
        reviewerName: event.reviewerName,
        createdAt: event.createdAt,
      })),
      sections,
      risks: riskRows.map((risk) => ({
        id: String(risk._id),
        title: risk.title,
        detail: risk.detail,
        probabilityPercent: risk.probabilityPercent,
        lowCostCents: risk.lowCostCents,
        mostLikelyCostCents: risk.mostLikelyCostCents,
        highCostCents: risk.highCostCents,
        scheduleDays: risk.scheduleDays,
        mitigation: risk.mitigation,
        owner: risk.owner,
        disposition: risk.disposition,
        confidence: risk.confidence,
        reviewStatus: risk.reviewStatus,
        evidenceIds: risk.evidenceIds.map(String),
      })),
      evidence: evidenceRows.map((row) => ({
        id: String(row._id),
        documentId: String(row.documentId),
        documentName: documentNames.get(String(row.documentId)) || "Project document",
        pageNumber: row.pageNumber,
        locator: row.locator,
        excerpt: row.excerpt,
      })),
      createdAt: estimate.createdAt,
      updatedAt: estimate.updatedAt,
    };
  },
});
