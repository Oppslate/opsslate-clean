import {
  calculateEstimateReviewSummary,
  normalizeEstimateReviewInput,
  type HeliosEstimateReviewStatus,
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
  const [project, estimate] = await Promise.all([
    ctx.db.get(projectId),
    ctx.db.get(estimateId),
  ]);
  if (
    !project ||
    !estimate ||
    project.companyId !== companyId ||
    estimate.companyId !== companyId ||
    estimate.projectId !== project._id
  ) {
    throw new Error("Estimate was not found.");
  }
  if (estimate.status !== "ready_for_review") {
    throw new Error("Only a proposal that is ready for review can be changed.");
  }
  return { project, estimate };
}

function statusFor(action: string): HeliosEstimateReviewStatus {
  if (action === "accept") return "accepted";
  if (action === "reject" || action === "merge") return "rejected";
  if (action === "defer") return "deferred";
  return "corrected";
}

function itemTypeFor(unit: string) {
  return unit.toUpperCase() === "LS" ? "lump_sum" as const : "unit_price" as const;
}

export const reviewRecord = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    estimateId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const { project, estimate } = await ownedEstimate(
      ctx,
      companyId,
      args.projectId,
      args.estimateId,
    );
    const input = normalizeEstimateReviewInput(args.input);
    const now = Date.now();

    if (input.recordType === "section") {
      const recordId = ctx.db.normalizeId("heliosEstimateSections", input.recordId);
      if (!recordId) throw new Error("Estimate section was not found.");
      const record = await ctx.db.get(recordId);
      if (
        !record ||
        record.companyId !== companyId ||
        record.projectId !== project._id ||
        record.estimateId !== estimate._id
      ) throw new Error("Estimate section was not found.");
      const previousValue = record;
      if (input.action === "merge" || input.action === "map") {
        const targetId = ctx.db.normalizeId("heliosEstimateSections", input.targetRecordId || "");
        const target = targetId ? await ctx.db.get(targetId) : null;
        if (!target || target.estimateId !== estimate._id || target.companyId !== companyId || target._id === record._id) {
          throw new Error("Target section was not found.");
        }
        const items = await ctx.db.query("heliosOwnerPayItems").withIndex("by_section", (q) => q.eq("sectionId", record._id)).collect();
        for (const item of items) await ctx.db.patch(item._id, { sectionId: target._id, updatedAt: now });
        await ctx.db.patch(record._id, { reviewStatus: "rejected", updatedAt: now });
      } else if (input.action === "split") {
        if (!input.split?.name) throw new Error("Enter a name for the new section.");
        const sections = await ctx.db.query("heliosEstimateSections").withIndex("by_estimate_sequence", (q) => q.eq("estimateId", estimate._id)).collect();
        const newSectionId = await ctx.db.insert("heliosEstimateSections", {
          companyId,
          projectId: project._id,
          estimateId: estimate._id,
          key: `human-${now}`,
          name: input.split.name,
          sequence: Math.max(...sections.map((section) => section.sequence), 0) + 10,
          reviewStatus: "corrected",
          evidenceIds: record.evidenceIds,
          createdAt: now,
          updatedAt: now,
        });
        for (const itemValue of input.split.moveRecordIds || []) {
          const itemId = ctx.db.normalizeId("heliosOwnerPayItems", itemValue);
          const item = itemId ? await ctx.db.get(itemId) : null;
          if (item && item.sectionId === record._id && item.estimateId === estimate._id) {
            await ctx.db.patch(item._id, { sectionId: newSectionId, updatedAt: now });
          }
        }
        await ctx.db.patch(record._id, { reviewStatus: "corrected", updatedAt: now });
      } else if (input.action === "correct") {
        const correction = input.correction || {};
        await ctx.db.patch(record._id, {
          name: correction.name ?? record.name,
          sequence: correction.sequence ?? record.sequence,
          reviewStatus: "corrected",
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(record._id, { reviewStatus: statusFor(input.action), updatedAt: now });
      }
      const decisionValue = await ctx.db.get(record._id);
      const eventId = await ctx.db.insert("heliosEstimateDecisionEvents", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        recordType: "section",
        recordId: String(record._id),
        action: input.action,
        comment: input.comment,
        targetRecordId: input.targetRecordId,
        previousValue,
        decisionValue,
        reviewerUserId: user._id,
        reviewerName: user.name,
        createdAt: now,
      });
      return { eventId: String(eventId), status: decisionValue?.reviewStatus };
    }

    const recordId = ctx.db.normalizeId("heliosOwnerPayItems", input.recordId);
    if (!recordId) throw new Error("Owner pay item was not found.");
    const record = await ctx.db.get(recordId);
    if (
      !record ||
      record.companyId !== companyId ||
      record.projectId !== project._id ||
      record.estimateId !== estimate._id
    ) throw new Error("Owner pay item was not found.");
    const previousValue = record;
    if (input.action === "merge") {
      const targetId = ctx.db.normalizeId("heliosOwnerPayItems", input.targetRecordId || "");
      const target = targetId ? await ctx.db.get(targetId) : null;
      if (!target || target.estimateId !== estimate._id || target.companyId !== companyId || target._id === record._id) {
        throw new Error("Target owner item was not found.");
      }
      const codes = await ctx.db.query("heliosEstimateCostCodes").withIndex("by_pay_item", (q) => q.eq("payItemId", record._id)).collect();
      for (const code of codes) await ctx.db.patch(code._id, { payItemId: target._id, updatedAt: now });
      await ctx.db.patch(record._id, { reviewStatus: "rejected", updatedAt: now });
    } else if (input.action === "map") {
      const targetId = ctx.db.normalizeId("heliosEstimateSections", input.targetRecordId || "");
      const target = targetId ? await ctx.db.get(targetId) : null;
      if (!target || target.estimateId !== estimate._id || target.companyId !== companyId) {
        throw new Error("Target section was not found.");
      }
      await ctx.db.patch(record._id, { sectionId: target._id, reviewStatus: "corrected", updatedAt: now });
    } else if (input.action === "split") {
      const split = input.split;
      if (!split?.officialItemNumber || !split.description || split.officialSequence === undefined) {
        throw new Error("The new owner item needs a sequence, item number, and description.");
      }
      const bidUnit = split.bidUnit || record.bidUnit;
      const newItemId = await ctx.db.insert("heliosOwnerPayItems", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        sectionId: record.sectionId,
        officialSequence: split.officialSequence,
        officialItemNumber: split.officialItemNumber,
        description: split.description,
        sequence: split.officialSequence,
        bidQuantity: split.bidQuantity,
        bidUnit,
        itemType: split.itemType || itemTypeFor(bidUnit),
        fixedAmountCents: split.fixedAmountCents,
        submittedUnitPriceCents: split.submittedUnitPriceCents,
        importChangeType: "new",
        quantityStatus: split.bidQuantity === undefined ? "takeoff_required" : "owner_provided",
        confidence: record.confidence,
        reviewStatus: "corrected",
        evidenceIds: record.evidenceIds,
        createdAt: now,
        updatedAt: now,
      });
      for (const codeValue of split.moveRecordIds || []) {
        const codeId = ctx.db.normalizeId("heliosEstimateCostCodes", codeValue);
        const code = codeId ? await ctx.db.get(codeId) : null;
        if (code && code.payItemId === record._id && code.estimateId === estimate._id) {
          await ctx.db.patch(code._id, { payItemId: newItemId, updatedAt: now });
        }
      }
      await ctx.db.patch(record._id, { reviewStatus: "corrected", updatedAt: now });
    } else if (input.action === "correct") {
      const correction = input.correction || {};
      const nextUnit = correction.bidUnit ?? record.bidUnit;
      let correctedSectionId = record.sectionId;
      if (correction.sectionId) {
        const sectionId = ctx.db.normalizeId("heliosEstimateSections", correction.sectionId);
        const section = sectionId ? await ctx.db.get(sectionId) : null;
        if (!section || section.estimateId !== estimate._id || section.companyId !== companyId) {
          throw new Error("Target section was not found.");
        }
        correctedSectionId = section._id;
      }
      await ctx.db.patch(record._id, {
        sectionId: correctedSectionId,
        officialSequence: correction.officialSequence ?? record.officialSequence ?? record.sequence,
        sequence: correction.officialSequence ?? record.officialSequence ?? record.sequence,
        officialItemNumber: correction.officialItemNumber ?? record.officialItemNumber,
        description: correction.description ?? record.description,
        estimatorDescription: correction.estimatorDescription ?? record.estimatorDescription,
        bidQuantity: correction.bidQuantity ?? record.bidQuantity,
        bidUnit: nextUnit,
        itemType: correction.itemType ?? record.itemType ?? itemTypeFor(nextUnit),
        fixedAmountCents: correction.fixedAmountCents ?? record.fixedAmountCents,
        submittedUnitPriceCents: correction.submittedUnitPriceCents ?? record.submittedUnitPriceCents,
        quantityStatus: correction.bidQuantity === undefined ? record.quantityStatus : "owner_provided",
        reviewStatus: "corrected",
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(record._id, { reviewStatus: statusFor(input.action), updatedAt: now });
    }
    const decisionValue = await ctx.db.get(record._id);
    const eventId = await ctx.db.insert("heliosEstimateDecisionEvents", {
      companyId,
      projectId: project._id,
      estimateId: estimate._id,
      recordType: "pay_item",
      recordId: String(record._id),
      action: input.action,
      comment: input.comment,
      targetRecordId: input.targetRecordId,
      previousValue,
      decisionValue,
      reviewerUserId: user._id,
      reviewerName: user.name,
      createdAt: now,
    });
    return { eventId: String(eventId), status: decisionValue?.reviewStatus };
  },
});

export const acceptImportReview = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    estimateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const { project, estimate } = await ownedEstimate(ctx, companyId, args.projectId, args.estimateId);
    const [sections, items] = await Promise.all([
      ctx.db.query("heliosEstimateSections").withIndex("by_estimate_sequence", (q) => q.eq("estimateId", estimate._id)).collect(),
      ctx.db.query("heliosOwnerPayItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
    ]);
    const blockers: string[] = [];
    const activeItems = items.filter((item) => item.reviewStatus !== "rejected");
    const legacyOfficialSequence = new Map(
      [...items]
        .sort((left, right) => left._creationTime - right._creationTime)
        .map((item, index) => [item._id, index + 1]),
    );
    if (!activeItems.length) blockers.push("At least one owner pay item must be retained.");
    const numbers = new Set<string>();
    const sequences = new Set<number>();
    for (const item of activeItems) {
      const sequence = item.officialSequence ?? legacyOfficialSequence.get(item._id) ?? item.sequence;
      if (numbers.has(item.officialItemNumber)) blockers.push(`Duplicate owner item ${item.officialItemNumber}.`);
      if (sequences.has(sequence)) blockers.push(`Duplicate official sequence ${sequence}.`);
      numbers.add(item.officialItemNumber);
      sequences.add(sequence);
      if (["fixed_price", "allowance"].includes(item.itemType || "") && item.fixedAmountCents === undefined) {
        blockers.push(`Owner item ${item.officialItemNumber} is missing its official fixed amount.`);
      }
    }
    const summary = calculateEstimateReviewSummary([...sections, ...items], [...new Set(blockers)]);
    if (!summary.canAcceptImport) {
      throw new Error(summary.blockers[0] || `${summary.total - summary.reviewed} proposed or deferred records still need a decision.`);
    }
    const now = Date.now();
    await ctx.db.patch(estimate._id, {
      status: "accepted",
      importReviewedBy: user._id,
      importReviewedAt: now,
      updatedAt: now,
    });
    const eventId = await ctx.db.insert("heliosEstimateDecisionEvents", {
      companyId,
      projectId: project._id,
      estimateId: estimate._id,
      recordType: "estimate",
      recordId: String(estimate._id),
      action: "accept_import",
      comment: "Owner pay-item import review accepted.",
      previousValue: { status: estimate.status },
      decisionValue: { status: "accepted", reviewSummary: summary },
      reviewerUserId: user._id,
      reviewerName: user.name,
      createdAt: now,
    });
    return { eventId: String(eventId), status: "accepted" as const };
  },
});

export const acceptRemainingRecords = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    estimateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const { project, estimate } = await ownedEstimate(ctx, companyId, args.projectId, args.estimateId);
    const [sections, items] = await Promise.all([
      ctx.db.query("heliosEstimateSections").withIndex("by_estimate_sequence", (q) => q.eq("estimateId", estimate._id)).collect(),
      ctx.db.query("heliosOwnerPayItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
    ]);
    const now = Date.now();
    let accepted = 0;
    for (const record of sections) {
      if (record.reviewStatus !== "proposed") continue;
      await ctx.db.patch(record._id, { reviewStatus: "accepted", updatedAt: now });
      await ctx.db.insert("heliosEstimateDecisionEvents", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        recordType: "section",
        recordId: String(record._id),
        action: "accept",
        comment: "Accepted unchanged with remaining import proposals.",
        previousValue: record,
        decisionValue: { ...record, reviewStatus: "accepted", updatedAt: now },
        reviewerUserId: user._id,
        reviewerName: user.name,
        createdAt: now,
      });
      accepted += 1;
    }
    for (const record of items) {
      if (record.reviewStatus !== "proposed") continue;
      await ctx.db.patch(record._id, { reviewStatus: "accepted", updatedAt: now });
      await ctx.db.insert("heliosEstimateDecisionEvents", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        recordType: "pay_item",
        recordId: String(record._id),
        action: "accept",
        comment: "Accepted unchanged with remaining import proposals.",
        previousValue: record,
        decisionValue: { ...record, reviewStatus: "accepted", updatedAt: now },
        reviewerUserId: user._id,
        reviewerName: user.name,
        createdAt: now,
      });
      accepted += 1;
    }
    return { accepted };
  },
});
