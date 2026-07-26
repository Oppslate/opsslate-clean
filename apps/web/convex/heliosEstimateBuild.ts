import {
  calculateCostCodeDirectCost,
  deriveAllocationValues,
  normalizeEstimateBuildInput,
  reconcileAllocations,
  type HeliosEstimateBuildInput,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

async function ownedEstimate(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  projectIdValue: string,
  estimateIdValue: string,
) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  const estimateId = ctx.db.normalizeId("heliosEstimates", estimateIdValue);
  if (!projectId || !estimateId) throw new Error("Estimate was not found.");
  const [project, estimate] = await Promise.all([ctx.db.get(projectId), ctx.db.get(estimateId)]);
  if (
    !project ||
    !estimate ||
    project.companyId !== companyId ||
    estimate.companyId !== companyId ||
    estimate.projectId !== project._id
  ) throw new Error("Estimate was not found.");
  if (!(["ready_for_review", "accepted"] as string[]).includes(estimate.status)) {
    throw new Error("The estimate must be ready for review before build-up can be changed.");
  }
  return { project, estimate };
}

async function ownedPayItem(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  estimateId: Id<"heliosEstimates">,
  value: string,
) {
  const id = ctx.db.normalizeId("heliosOwnerPayItems", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) {
    throw new Error("Owner pay item was not found.");
  }
  if (!(["accepted", "corrected"] as string[]).includes(record.reviewStatus)) {
    throw new Error("Accept the owner pay item before building its internal cost codes.");
  }
  return record;
}

async function ownedCostCode(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  estimateId: Id<"heliosEstimates">,
  value: string,
) {
  const id = ctx.db.normalizeId("heliosEstimateCostCodes", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) {
    throw new Error("Cost code was not found.");
  }
  await ownedPayItem(ctx, companyId, estimateId, String(record.payItemId));
  return record;
}

async function ownedResource(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  estimateId: Id<"heliosEstimates">,
  value: string,
) {
  const id = ctx.db.normalizeId("heliosEstimateResources", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) {
    throw new Error("Resource was not found.");
  }
  await ownedCostCode(ctx, companyId, estimateId, String(record.costCodeId));
  return record;
}

async function ownedQuantity(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  estimateId: Id<"heliosEstimates">,
  value: string,
) {
  const id = ctx.db.normalizeId("heliosEstimateQuantities", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) {
    throw new Error("Quantity record was not found.");
  }
  await ownedCostCode(ctx, companyId, estimateId, String(record.costCodeId));
  return record;
}

async function ownedAllocation(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  estimateId: Id<"heliosEstimates">,
  value: string,
) {
  const id = ctx.db.normalizeId("heliosEstimateAllocations", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) {
    throw new Error("Allocation was not found.");
  }
  await ownedCostCode(ctx, companyId, estimateId, String(record.sourceCostCodeId));
  return record;
}

async function costCodeDirectCost(ctx: MutationCtx, costCodeId: Id<"heliosEstimateCostCodes">) {
  const resources = await ctx.db.query("heliosEstimateResources")
    .withIndex("by_cost_code", (query) => query.eq("costCodeId", costCodeId)).collect();
  return calculateCostCodeDirectCost(resources.filter((row) => row.reviewStatus !== "rejected"));
}

async function allocationValues(
  ctx: MutationCtx,
  costCode: Awaited<ReturnType<typeof ownedCostCode>>,
  allocation: NonNullable<HeliosEstimateBuildInput["allocation"]>,
) {
  const sourceCostCents = await costCodeDirectCost(ctx, costCode._id);
  const derived = deriveAllocationValues({
    allocationType: allocation.allocationType,
    controllingValue: allocation.controllingValue,
    sourceQuantity: costCode.productionQuantity,
    sourceCostCents,
  });
  return {
    allocationType: allocation.allocationType,
    controllingValue: allocation.controllingValue,
    ...derived,
    calculationBasis: `${allocation.allocationType} control; source ${costCode.productionQuantity ?? "unknown"} ${costCode.productionUnit}; direct cost ${sourceCostCents ?? "unpriced"} cents`,
    balancingStatus: "unbalanced" as const,
  };
}

async function refreshAllocationStatus(
  ctx: MutationCtx,
  costCode: Awaited<ReturnType<typeof ownedCostCode>>,
  now: number,
) {
  const rows = await ctx.db.query("heliosEstimateAllocations")
    .withIndex("by_source_cost_code", (query) => query.eq("sourceCostCodeId", costCode._id)).collect();
  const sourceCostCents = await costCodeDirectCost(ctx, costCode._id);
  const recalculatedRows = await Promise.all(rows.map(async (row) => {
    if (row.controllingValue === undefined || (row.reviewStatus || "proposed") === "rejected") return row;
    try {
      const derived = deriveAllocationValues({
        allocationType: row.allocationType,
        controllingValue: row.controllingValue,
        sourceQuantity: costCode.productionQuantity,
        sourceCostCents,
      });
      const updated = { ...row, ...derived };
      await ctx.db.patch(row._id, { ...derived, updatedAt: now });
      return updated;
    } catch {
      return row;
    }
  }));
  const reconciliation = reconcileAllocations({
    allocationRequired: costCode.allocationRequired || false,
    sourceQuantity: costCode.productionQuantity,
    sourceCostCents,
    allocations: recalculatedRows.map((row) => ({
      targetPayItemId: String(row.targetPayItemId),
      targetCostCodeId: row.targetCostCodeId ? String(row.targetCostCodeId) : undefined,
      quantity: row.quantity,
      percentBasisPoints: row.percentBasisPoints,
      amountCents: row.amountCents,
      reviewStatus: row.reviewStatus || "proposed",
    })),
  });
  await Promise.all(recalculatedRows.map((row) => ctx.db.patch(row._id, {
    balancingStatus: reconciliation.status,
    updatedAt: now,
  })));
  return reconciliation;
}

async function applyProductionQuantity(
  ctx: MutationCtx,
  costCode: Awaited<ReturnType<typeof ownedCostCode>>,
  quantity: { _id: Id<"heliosEstimateQuantities">; value?: number; unit: string; use: string; status: string },
  now: number,
) {
  if (quantity.use !== "production" || !["current", "takeoff_required"].includes(quantity.status)) return;
  const siblings = await ctx.db.query("heliosEstimateQuantities")
    .withIndex("by_cost_code", (query) => query.eq("costCodeId", costCode._id)).collect();
  await Promise.all(siblings
    .filter((row) => row._id !== quantity._id && row.use === "production" && ["current", "takeoff_required"].includes(row.status))
    .map((row) => ctx.db.patch(row._id, { status: "superseded", updatedAt: now })));
  await ctx.db.patch(costCode._id, {
    productionQuantity: quantity.status === "takeoff_required" ? undefined : quantity.value,
    productionUnit: quantity.unit,
    updatedAt: now,
  });
}

function resourceValues(
  input: NonNullable<HeliosEstimateBuildInput["resource"]>,
  userId: Id<"users">,
  now: number,
) {
  return {
    ...input,
    overriddenBy: input.overrideRateCents === undefined ? undefined : userId,
    overriddenAt: input.overrideRateCents === undefined ? undefined : now,
  };
}

export const mutateBuild = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    estimateId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const { project, estimate } = await ownedEstimate(ctx, companyId, args.projectId, args.estimateId);
    const input = normalizeEstimateBuildInput(args.input);
    const now = Date.now();
    let recordType: "cost_code" | "resource" | "quantity" | "allocation";
    let recordId: string;
    let previousValue: unknown;
    let decisionValue: unknown;
    let auditAction: "create" | "update" | "accept" | "reject";

    if (input.action === "create_cost_code") {
      const payItem = await ownedPayItem(ctx, companyId, estimate._id, input.payItemId || "");
      const values = input.costCode!;
      const siblings = await ctx.db.query("heliosEstimateCostCodes")
        .withIndex("by_pay_item", (query) => query.eq("payItemId", payItem._id)).collect();
      if (siblings.some((row) => row.reviewStatus !== "rejected" && row.code.toLowerCase() === values.code.toLowerCase())) {
        throw new Error(`Cost code ${values.code} already exists under this owner item.`);
      }
      const id = await ctx.db.insert("heliosEstimateCostCodes", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        payItemId: payItem._id,
        ...values,
        sequence: Math.max(...siblings.map((row) => row.sequence), -1) + 1,
        confidence: 100,
        reviewStatus: "corrected",
        evidenceIds: [],
        createdAt: now,
        updatedAt: now,
      });
      recordType = "cost_code";
      recordId = String(id);
      previousValue = undefined;
      decisionValue = await ctx.db.get(id);
      auditAction = "create";
    } else if (input.action === "update_cost_code") {
      const record = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId || "");
      const { productionQuantity: _quantityIsManagedInRegister, ...costCodeValues } = input.costCode!;
      const siblings = await ctx.db.query("heliosEstimateCostCodes")
        .withIndex("by_pay_item", (query) => query.eq("payItemId", record.payItemId)).collect();
      if (siblings.some((row) => row._id !== record._id && row.reviewStatus !== "rejected" && row.code.toLowerCase() === input.costCode!.code.toLowerCase())) {
        throw new Error(`Cost code ${input.costCode!.code} already exists under this owner item.`);
      }
      previousValue = record;
      await ctx.db.patch(record._id, { ...costCodeValues, reviewStatus: "corrected", updatedAt: now });
      recordType = "cost_code";
      recordId = String(record._id);
      decisionValue = await ctx.db.get(record._id);
      auditAction = "update";
    } else if (input.action === "accept_cost_code" || input.action === "reject_cost_code") {
      const record = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId || "");
      previousValue = record;
      const reviewStatus = input.action === "accept_cost_code" ? "accepted" as const : "rejected" as const;
      await ctx.db.patch(record._id, { reviewStatus, updatedAt: now });
      recordType = "cost_code";
      recordId = String(record._id);
      decisionValue = await ctx.db.get(record._id);
      auditAction = reviewStatus === "accepted" ? "accept" : "reject";
    } else if (input.action === "create_resource") {
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId || "");
      const siblings = await ctx.db.query("heliosEstimateResources")
        .withIndex("by_cost_code", (query) => query.eq("costCodeId", costCode._id)).collect();
      const id = await ctx.db.insert("heliosEstimateResources", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        costCodeId: costCode._id,
        sequence: Math.max(...siblings.map((row) => row.sequence), -1) + 1,
        ...resourceValues(input.resource!, user._id, now),
        reviewStatus: "corrected",
        createdAt: now,
        updatedAt: now,
      });
      recordType = "resource";
      recordId = String(id);
      previousValue = undefined;
      decisionValue = await ctx.db.get(id);
      auditAction = "create";
      await refreshAllocationStatus(ctx, costCode, now);
    } else if (input.action === "update_resource") {
      const record = await ownedResource(ctx, companyId, estimate._id, input.resourceId || "");
      previousValue = record;
      await ctx.db.patch(record._id, {
        ...resourceValues(input.resource!, user._id, now),
        reviewStatus: "corrected",
        updatedAt: now,
      });
      recordType = "resource";
      recordId = String(record._id);
      decisionValue = await ctx.db.get(record._id);
      auditAction = "update";
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, String(record.costCodeId));
      await refreshAllocationStatus(ctx, costCode, now);
    } else if (input.action === "accept_resource" || input.action === "reject_resource") {
      const record = await ownedResource(ctx, companyId, estimate._id, input.resourceId || "");
      previousValue = record;
      const reviewStatus = input.action === "accept_resource" ? "accepted" as const : "rejected" as const;
      await ctx.db.patch(record._id, { reviewStatus, updatedAt: now });
      recordType = "resource";
      recordId = String(record._id);
      decisionValue = await ctx.db.get(record._id);
      auditAction = reviewStatus === "accepted" ? "accept" : "reject";
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, String(record.costCodeId));
      await refreshAllocationStatus(ctx, costCode, now);
    } else if (input.action === "create_quantity") {
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId || "");
      const values = input.quantity!;
      const status = values.quantityType === "takeoff_required" ? "takeoff_required" as const : "current" as const;
      const id = await ctx.db.insert("heliosEstimateQuantities", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        costCodeId: costCode._id,
        ...values,
        status,
        reviewStatus: "corrected",
        origin: "human",
        evidenceIds: [],
        createdAt: now,
        updatedAt: now,
      });
      const created = (await ctx.db.get(id))!;
      await applyProductionQuantity(ctx, costCode, created, now);
      await refreshAllocationStatus(ctx, { ...costCode, productionQuantity: created.use === "production" ? created.value : costCode.productionQuantity }, now);
      recordType = "quantity";
      recordId = String(id);
      previousValue = undefined;
      decisionValue = await ctx.db.get(id);
      auditAction = "create";
    } else if (input.action === "accept_quantity" || input.action === "reject_quantity") {
      const record = await ownedQuantity(ctx, companyId, estimate._id, input.quantityId || "");
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, String(record.costCodeId));
      previousValue = record;
      const reviewStatus = input.action === "accept_quantity" ? "accepted" as const : "rejected" as const;
      await ctx.db.patch(record._id, { reviewStatus, updatedAt: now });
      const updated = { ...record, reviewStatus };
      if (reviewStatus === "accepted") {
        await applyProductionQuantity(ctx, costCode, updated, now);
      } else if (record.use === "production" && record.status === "current") {
        await ctx.db.patch(costCode._id, { productionQuantity: undefined, updatedAt: now });
      }
      const latestCostCode = (await ctx.db.get(costCode._id))!;
      await refreshAllocationStatus(ctx, latestCostCode, now);
      recordType = "quantity";
      recordId = String(record._id);
      decisionValue = await ctx.db.get(record._id);
      auditAction = reviewStatus === "accepted" ? "accept" : "reject";
    } else if (input.action === "mark_takeoff_required") {
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId || "");
      const id = await ctx.db.insert("heliosEstimateQuantities", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        costCodeId: costCode._id,
        unit: costCode.productionUnit,
        quantityType: "takeoff_required",
        sourceLabel: "Estimator review",
        method: "Detailed takeoff required before the production quantity can be used.",
        confidence: 100,
        use: "production",
        status: "takeoff_required",
        reviewStatus: "corrected",
        origin: "human",
        evidenceIds: [],
        createdAt: now,
        updatedAt: now,
      });
      const created = (await ctx.db.get(id))!;
      await applyProductionQuantity(ctx, costCode, created, now);
      const latestCostCode = (await ctx.db.get(costCode._id))!;
      await refreshAllocationStatus(ctx, latestCostCode, now);
      recordType = "quantity";
      recordId = String(id);
      previousValue = costCode.productionQuantity;
      decisionValue = created;
      auditAction = "create";
    } else if (input.action === "set_allocation_required") {
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId || "");
      previousValue = { allocationRequired: costCode.allocationRequired || false };
      await ctx.db.patch(costCode._id, { allocationRequired: input.allocationRequired!, updatedAt: now });
      const updated = (await ctx.db.get(costCode._id))!;
      await refreshAllocationStatus(ctx, updated, now);
      recordType = "cost_code";
      recordId = String(costCode._id);
      decisionValue = { allocationRequired: input.allocationRequired };
      auditAction = "update";
    } else if (input.action === "create_allocation") {
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId || "");
      if (!costCode.allocationRequired) throw new Error("Mark the source cost code as shared before allocating it.");
      const targetPayItem = await ownedPayItem(ctx, companyId, estimate._id, input.allocation!.targetPayItemId);
      let targetCostCodeId: Id<"heliosEstimateCostCodes"> | undefined;
      if (input.allocation!.targetCostCodeId) {
        const targetCostCode = await ownedCostCode(ctx, companyId, estimate._id, input.allocation!.targetCostCodeId);
        if (targetCostCode.payItemId !== targetPayItem._id) throw new Error("Destination cost code is not under the selected owner item.");
        targetCostCodeId = targetCostCode._id;
      }
      const siblings = await ctx.db.query("heliosEstimateAllocations")
        .withIndex("by_source_cost_code", (query) => query.eq("sourceCostCodeId", costCode._id)).collect();
      if (siblings.some((row) => (row.reviewStatus || "proposed") !== "rejected" && row.targetPayItemId === targetPayItem._id && row.targetCostCodeId === targetCostCodeId)) {
        throw new Error("This source cost is already allocated to that destination.");
      }
      const values = await allocationValues(ctx, costCode, input.allocation!);
      const id = await ctx.db.insert("heliosEstimateAllocations", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        sourceCostCodeId: costCode._id,
        targetPayItemId: targetPayItem._id,
        targetCostCodeId,
        ...values,
        reviewStatus: "corrected",
        createdAt: now,
        updatedAt: now,
      });
      await refreshAllocationStatus(ctx, costCode, now);
      recordType = "allocation";
      recordId = String(id);
      previousValue = undefined;
      decisionValue = await ctx.db.get(id);
      auditAction = "create";
    } else if (input.action === "update_allocation") {
      const record = await ownedAllocation(ctx, companyId, estimate._id, input.allocationId || "");
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, String(record.sourceCostCodeId));
      const targetPayItem = await ownedPayItem(ctx, companyId, estimate._id, input.allocation!.targetPayItemId);
      let targetCostCodeId: Id<"heliosEstimateCostCodes"> | undefined;
      if (input.allocation!.targetCostCodeId) {
        const targetCostCode = await ownedCostCode(ctx, companyId, estimate._id, input.allocation!.targetCostCodeId);
        if (targetCostCode.payItemId !== targetPayItem._id) throw new Error("Destination cost code is not under the selected owner item.");
        targetCostCodeId = targetCostCode._id;
      }
      const siblings = await ctx.db.query("heliosEstimateAllocations")
        .withIndex("by_source_cost_code", (query) => query.eq("sourceCostCodeId", costCode._id)).collect();
      if (siblings.some((row) => row._id !== record._id && (row.reviewStatus || "proposed") !== "rejected" && row.targetPayItemId === targetPayItem._id && row.targetCostCodeId === targetCostCodeId)) {
        throw new Error("This source cost is already allocated to that destination.");
      }
      previousValue = record;
      const values = await allocationValues(ctx, costCode, input.allocation!);
      await ctx.db.patch(record._id, {
        ...values,
        targetPayItemId: targetPayItem._id,
        targetCostCodeId,
        reviewStatus: "corrected",
        updatedAt: now,
      });
      await refreshAllocationStatus(ctx, costCode, now);
      recordType = "allocation";
      recordId = String(record._id);
      decisionValue = await ctx.db.get(record._id);
      auditAction = "update";
    } else {
      const record = await ownedAllocation(ctx, companyId, estimate._id, input.allocationId || "");
      const costCode = await ownedCostCode(ctx, companyId, estimate._id, String(record.sourceCostCodeId));
      previousValue = record;
      const reviewStatus = input.action === "accept_allocation" ? "accepted" as const : "rejected" as const;
      await ctx.db.patch(record._id, { reviewStatus, updatedAt: now });
      await refreshAllocationStatus(ctx, costCode, now);
      recordType = "allocation";
      recordId = String(record._id);
      decisionValue = await ctx.db.get(record._id);
      auditAction = reviewStatus === "accepted" ? "accept" : "reject";
    }

    await ctx.db.patch(estimate._id, { updatedAt: now });
    const eventId = await ctx.db.insert("heliosEstimateDecisionEvents", {
      companyId,
      projectId: project._id,
      estimateId: estimate._id,
      recordType,
      recordId,
      action: auditAction,
      comment: input.comment,
      previousValue,
      decisionValue,
      reviewerUserId: user._id,
      reviewerName: user.name,
      createdAt: now,
    });
    return { eventId: String(eventId), recordId, recordType, action: auditAction };
  },
});
