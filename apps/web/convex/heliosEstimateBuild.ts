import {
  normalizeEstimateBuildInput,
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
    let recordType: "cost_code" | "resource";
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
      const siblings = await ctx.db.query("heliosEstimateCostCodes")
        .withIndex("by_pay_item", (query) => query.eq("payItemId", record.payItemId)).collect();
      if (siblings.some((row) => row._id !== record._id && row.reviewStatus !== "rejected" && row.code.toLowerCase() === input.costCode!.code.toLowerCase())) {
        throw new Error(`Cost code ${input.costCode!.code} already exists under this owner item.`);
      }
      previousValue = record;
      await ctx.db.patch(record._id, { ...input.costCode!, reviewStatus: "corrected", updatedAt: now });
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
    } else {
      const record = await ownedResource(ctx, companyId, estimate._id, input.resourceId || "");
      previousValue = record;
      const reviewStatus = input.action === "accept_resource" ? "accepted" as const : "rejected" as const;
      await ctx.db.patch(record._id, { reviewStatus, updatedAt: now });
      recordType = "resource";
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
