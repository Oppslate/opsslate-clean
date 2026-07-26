import {
  normalizeEstimateSupportInput,
  type HeliosEstimateSupportInput,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
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
  if (!project || !estimate || project.companyId !== companyId || estimate.companyId !== companyId || estimate.projectId !== project._id) {
    throw new Error("Estimate was not found.");
  }
  if (!(["ready_for_review", "accepted"] as string[]).includes(estimate.status)) {
    throw new Error("The estimate must be ready for review before supporting records can be changed.");
  }
  const latest = await ctx.db.query("heliosEstimates")
    .withIndex("by_project_version", (query) => query.eq("projectId", project._id))
    .order("desc")
    .first();
  if (!latest || latest._id !== estimate._id) throw new Error("This estimate version is stale. Open the current version.");
  if (project.currentPackageRevision !== undefined && estimate.sourcePackageRevision !== project.currentPackageRevision) {
    throw new Error("The bid package changed. Reanalyze the current document revision first.");
  }
  return { project, estimate };
}

async function ownedPayItemAny(ctx: MutationCtx, companyId: Id<"companies">, estimateId: Id<"heliosEstimates">, value: string) {
  const id = ctx.db.normalizeId("heliosOwnerPayItems", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) throw new Error("Owner pay item was not found.");
  return record;
}

async function ownedPayItem(ctx: MutationCtx, companyId: Id<"companies">, estimateId: Id<"heliosEstimates">, value: string) {
  const record = await ownedPayItemAny(ctx, companyId, estimateId, value);
  if (!(["accepted", "corrected"] as string[]).includes(record.reviewStatus)) throw new Error("Accept the owner pay item before creating supporting records.");
  return record;
}

async function ownedCostCodeAny(ctx: MutationCtx, companyId: Id<"companies">, estimateId: Id<"heliosEstimates">, value: string) {
  const id = ctx.db.normalizeId("heliosEstimateCostCodes", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) throw new Error("Cost code was not found.");
  const payItem = await ownedPayItemAny(ctx, companyId, estimateId, String(record.payItemId));
  return { record, payItem };
}

async function ownedCostCode(ctx: MutationCtx, companyId: Id<"companies">, estimateId: Id<"heliosEstimates">, value: string) {
  const { record, payItem } = await ownedCostCodeAny(ctx, companyId, estimateId, value);
  if (!(["accepted", "corrected"] as string[]).includes(record.reviewStatus)) throw new Error("Accept the cost code before creating supporting records.");
  if (!(["accepted", "corrected"] as string[]).includes(payItem.reviewStatus)) throw new Error("Accept the owner pay item before creating supporting records.");
  return { record, payItem };
}

async function ownedRfq(ctx: MutationCtx, companyId: Id<"companies">, estimateId: Id<"heliosEstimates">, value: string) {
  const id = ctx.db.normalizeId("heliosEstimateRfqs", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) throw new Error("RFQ was not found.");
  return record;
}

async function ownedSubmittal(ctx: MutationCtx, companyId: Id<"companies">, estimateId: Id<"heliosEstimates">, value: string) {
  const id = ctx.db.normalizeId("heliosEstimateSubmittals", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) throw new Error("Submittal was not found.");
  return record;
}

async function ownedRisk(ctx: MutationCtx, companyId: Id<"companies">, estimateId: Id<"heliosEstimates">, value: string) {
  const id = ctx.db.normalizeId("heliosEstimateRisks", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId) throw new Error("Risk was not found.");
  return record;
}

function uniqueIds<T extends string>(values: T[]) {
  return [...new Set(values)];
}

async function validateRiskLinks(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  estimateId: Id<"heliosEstimates">,
  risk: NonNullable<HeliosEstimateSupportInput["risk"]>,
) {
  const payItemIds = await Promise.all(risk.linkedPayItemIds.map(async (value) => (await ownedPayItemAny(ctx, companyId, estimateId, value))._id));
  const costCodes = await Promise.all(risk.linkedCostCodeIds.map((value) => ownedCostCodeAny(ctx, companyId, estimateId, value)));
  const quantityIds = await Promise.all(risk.linkedQuantityIds.map(async (value) => {
    const id = ctx.db.normalizeId("heliosEstimateQuantities", value);
    const row = id ? await ctx.db.get(id) : null;
    if (!row || row.companyId !== companyId || row.estimateId !== estimateId) throw new Error("Linked quantity was not found.");
    await ownedCostCodeAny(ctx, companyId, estimateId, String(row.costCodeId));
    return row._id;
  }));
  return {
    linkedPayItemIds: uniqueIds(payItemIds),
    linkedCostCodeIds: uniqueIds(costCodes.map(({ record }) => record._id)),
    linkedQuantityIds: uniqueIds(quantityIds),
  };
}

function evidenceRelationship(recordType: string) {
  if (recordType === "quantity") return "quantity" as const;
  if (recordType === "risk") return "risk" as const;
  if (recordType === "rfq") return "procurement" as const;
  if (recordType === "submittal") return "submittal" as const;
  if (recordType === "resource") return "pricing" as const;
  return "scope" as const;
}

async function addEvidenceLinks(
  ctx: MutationCtx,
  values: {
    companyId: Id<"companies">;
    projectId: Id<"heliosProjects">;
    estimateId: Id<"heliosEstimates">;
    recordType: "rfq" | "submittal";
    recordId: string;
    evidenceIds: Id<"heliosEvidence">[];
    now: number;
  },
) {
  await Promise.all(values.evidenceIds.map((evidenceId) => ctx.db.insert("heliosEstimateEvidenceLinks", {
    companyId: values.companyId,
    projectId: values.projectId,
    estimateId: values.estimateId,
    evidenceId,
    recordType: values.recordType,
    recordId: values.recordId,
    relationship: evidenceRelationship(values.recordType),
    origin: "system",
    verificationStatus: "proposed",
    createdAt: values.now,
    updatedAt: values.now,
  })));
}

async function recordEvidence(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  estimateId: Id<"heliosEstimates">,
  recordType: NonNullable<HeliosEstimateSupportInput["recordType"]>,
  recordId: string,
) {
  if (recordType === "section") {
    const id = ctx.db.normalizeId("heliosEstimateSections", recordId);
    const row = id ? await ctx.db.get(id) : null;
    if (!row || row.companyId !== companyId || row.estimateId !== estimateId) throw new Error("Evidence-linked estimate record was not found.");
    return row.evidenceIds;
  }
  if (recordType === "pay_item") return (await ownedPayItemAny(ctx, companyId, estimateId, recordId)).evidenceIds;
  if (recordType === "cost_code") return (await ownedCostCodeAny(ctx, companyId, estimateId, recordId)).record.evidenceIds;
  if (recordType === "quantity") {
    const id = ctx.db.normalizeId("heliosEstimateQuantities", recordId);
    const row = id ? await ctx.db.get(id) : null;
    if (!row || row.companyId !== companyId || row.estimateId !== estimateId) throw new Error("Evidence-linked estimate record was not found.");
    await ownedCostCodeAny(ctx, companyId, estimateId, String(row.costCodeId));
    return row.evidenceIds;
  }
  if (recordType === "resource") {
    const id = ctx.db.normalizeId("heliosEstimateResources", recordId);
    const row = id ? await ctx.db.get(id) : null;
    if (!row || row.companyId !== companyId || row.estimateId !== estimateId) throw new Error("Evidence-linked estimate record was not found.");
    return (await ownedCostCodeAny(ctx, companyId, estimateId, String(row.costCodeId))).record.evidenceIds;
  }
  if (recordType === "rfq") return (await ownedRfq(ctx, companyId, estimateId, recordId)).evidenceIds;
  if (recordType === "submittal") return (await ownedSubmittal(ctx, companyId, estimateId, recordId)).evidenceIds;
  return (await ownedRisk(ctx, companyId, estimateId, recordId)).evidenceIds;
}

async function mutateEvidenceLink(
  ctx: MutationCtx,
  values: {
    companyId: Id<"companies">;
    projectId: Id<"heliosProjects">;
    estimateId: Id<"heliosEstimates">;
    user: Doc<"users">;
    input: HeliosEstimateSupportInput;
    now: number;
  },
) {
  const input = values.input;
  const evidenceId = ctx.db.normalizeId("heliosEvidence", input.evidenceId || "");
  const evidence = evidenceId ? await ctx.db.get(evidenceId) : null;
  if (!evidence || evidence.companyId !== values.companyId || evidence.projectId !== values.projectId) throw new Error("Evidence was not found.");
  const allowedEvidence = await recordEvidence(ctx, values.companyId, values.estimateId, input.recordType!, input.recordId!);
  if (!allowedEvidence.some((id) => id === evidence._id)) throw new Error("Evidence is not linked to this estimate record.");
  const rows = await ctx.db.query("heliosEstimateEvidenceLinks")
    .withIndex("by_record", (query) => query.eq("estimateId", values.estimateId).eq("recordType", input.recordType!).eq("recordId", input.recordId!))
    .collect();
  const existing = rows.find((row) => row.evidenceId === evidence._id);
  const verificationStatus = input.action === "verify_evidence" ? "verified" as const : "disputed" as const;
  if (existing) {
    const previousValue = existing;
    await ctx.db.patch(existing._id, {
      verificationStatus,
      verifierUserId: values.user._id,
      verifierName: values.user.name,
      verifiedAt: values.now,
      comment: input.comment,
      updatedAt: values.now,
    });
    return { recordId: String(existing._id), previousValue, decisionValue: await ctx.db.get(existing._id) };
  }
  const id = await ctx.db.insert("heliosEstimateEvidenceLinks", {
    companyId: values.companyId,
    projectId: values.projectId,
    estimateId: values.estimateId,
    evidenceId: evidence._id,
    recordType: input.recordType!,
    recordId: input.recordId!,
    relationship: evidenceRelationship(input.recordType!),
    origin: "ai",
    verificationStatus,
    verifierUserId: values.user._id,
    verifierName: values.user.name,
    verifiedAt: values.now,
    comment: input.comment,
    createdAt: values.now,
    updatedAt: values.now,
  });
  return { recordId: String(id), previousValue: undefined, decisionValue: await ctx.db.get(id) };
}

export const mutateSupport = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    estimateId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const { project, estimate } = await ownedEstimate(ctx, companyId, args.projectId, args.estimateId);
    const input = normalizeEstimateSupportInput(args.input);
    const now = Date.now();
    let recordType: "rfq" | "submittal" | "risk" | "evidence_link";
    let recordId: string;
    let previousValue: unknown;
    let decisionValue: unknown;
    let auditAction: "generate" | "update" | "accept" | "reject" | "status_change" | "verify" | "dispute";

    if (input.action === "generate_rfq") {
      const { record: code, payItem } = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId!);
      const existing = await ctx.db.query("heliosEstimateRfqs").withIndex("by_estimate_created", (query) => query.eq("estimateId", estimate._id)).collect();
      if (existing.some((row) => row.reviewStatus !== "rejected" && row.linkedCostCodeIds.includes(code._id))) throw new Error("An active RFQ already covers this cost code.");
      const quantities = await ctx.db.query("heliosEstimateQuantities").withIndex("by_cost_code", (query) => query.eq("costCodeId", code._id)).collect();
      const evidenceIds = uniqueIds([...payItem.evidenceIds, ...code.evidenceIds, ...quantities.flatMap((row) => row.evidenceIds)]);
      const id = await ctx.db.insert("heliosEstimateRfqs", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        title: code.code + " " + code.description,
        packageNumber: ("RFQ-" + payItem.officialItemNumber + "-" + code.code).slice(0, 80),
        status: "draft",
        inclusions: [code.description],
        exclusions: [],
        scheduleConstraints: [],
        vendors: [],
        linkedPayItemIds: [payItem._id],
        linkedCostCodeIds: [code._id],
        linkedQuantityIds: quantities.filter((row) => row.reviewStatus !== "rejected").map((row) => row._id),
        evidenceIds,
        origin: "system",
        reviewStatus: "corrected",
        createdAt: now,
        updatedAt: now,
      });
      await addEvidenceLinks(ctx, { companyId, projectId: project._id, estimateId: estimate._id, recordType: "rfq", recordId: String(id), evidenceIds, now });
      recordType = "rfq"; recordId = String(id); previousValue = undefined; decisionValue = await ctx.db.get(id); auditAction = "generate";
    } else if (input.action === "generate_submittal") {
      const { record: code, payItem } = await ownedCostCode(ctx, companyId, estimate._id, input.costCodeId!);
      const existing = await ctx.db.query("heliosEstimateSubmittals").withIndex("by_estimate_created", (query) => query.eq("estimateId", estimate._id)).collect();
      if (existing.some((row) => row.reviewStatus !== "rejected" && row.linkedCostCodeIds.includes(code._id))) throw new Error("An active submittal already covers this cost code.");
      const evidenceIds = uniqueIds([...payItem.evidenceIds, ...code.evidenceIds]);
      const id = await ctx.db.insert("heliosEstimateSubmittals", {
        companyId,
        projectId: project._id,
        estimateId: estimate._id,
        type: "other",
        description: code.code + " " + code.description,
        status: "draft",
        linkedPayItemIds: [payItem._id],
        linkedCostCodeIds: [code._id],
        evidenceIds,
        origin: "system",
        reviewStatus: "corrected",
        createdAt: now,
        updatedAt: now,
      });
      await addEvidenceLinks(ctx, { companyId, projectId: project._id, estimateId: estimate._id, recordType: "submittal", recordId: String(id), evidenceIds, now });
      recordType = "submittal"; recordId = String(id); previousValue = undefined; decisionValue = await ctx.db.get(id); auditAction = "generate";
    } else if (["update_rfq", "accept_rfq", "reject_rfq", "set_rfq_status"].includes(input.action)) {
      const row = await ownedRfq(ctx, companyId, estimate._id, input.rfqId!);
      previousValue = row;
      if (input.action === "update_rfq") await ctx.db.patch(row._id, { ...input.rfq!, reviewStatus: "corrected", updatedAt: now });
      if (input.action === "accept_rfq") await ctx.db.patch(row._id, { reviewStatus: "accepted", updatedAt: now });
      if (input.action === "reject_rfq") await ctx.db.patch(row._id, { reviewStatus: "rejected", updatedAt: now });
      if (input.action === "set_rfq_status") {
        if (!(["accepted", "corrected"] as string[]).includes(row.reviewStatus)) throw new Error("Accept the RFQ scope before advancing its status.");
        if (input.rfqStatus !== "draft" && (!row.requiredQuoteDate || row.inclusions.length === 0 || row.evidenceIds.length === 0)) throw new Error("Complete the quote date, inclusions, and evidence before advancing this RFQ.");
        await ctx.db.patch(row._id, { status: input.rfqStatus!, updatedAt: now });
      }
      recordType = "rfq"; recordId = String(row._id); decisionValue = await ctx.db.get(row._id);
      auditAction = input.action === "accept_rfq" ? "accept" : input.action === "reject_rfq" ? "reject" : input.action === "set_rfq_status" ? "status_change" : "update";
    } else if (["update_submittal", "accept_submittal", "reject_submittal", "set_submittal_status"].includes(input.action)) {
      const row = await ownedSubmittal(ctx, companyId, estimate._id, input.submittalId!);
      previousValue = row;
      if (input.action === "update_submittal") await ctx.db.patch(row._id, { ...input.submittal!, reviewStatus: "corrected", updatedAt: now });
      if (input.action === "accept_submittal") await ctx.db.patch(row._id, { reviewStatus: "accepted", updatedAt: now });
      if (input.action === "reject_submittal") await ctx.db.patch(row._id, { reviewStatus: "rejected", updatedAt: now });
      if (input.action === "set_submittal_status") {
        if (!(["accepted", "corrected"] as string[]).includes(row.reviewStatus)) throw new Error("Accept the submittal requirement before advancing its status.");
        await ctx.db.patch(row._id, { status: input.submittalStatus!, updatedAt: now });
      }
      recordType = "submittal"; recordId = String(row._id); decisionValue = await ctx.db.get(row._id);
      auditAction = input.action === "accept_submittal" ? "accept" : input.action === "reject_submittal" ? "reject" : input.action === "set_submittal_status" ? "status_change" : "update";
    } else if (["update_risk", "accept_risk", "reject_risk", "set_risk_decision"].includes(input.action)) {
      const row = await ownedRisk(ctx, companyId, estimate._id, input.riskId!);
      previousValue = row;
      if (input.action === "update_risk") {
        const links = await validateRiskLinks(ctx, companyId, estimate._id, input.risk!);
        await ctx.db.patch(row._id, { ...input.risk!, ...links, scheduleDays: input.risk!.mostLikelyScheduleDays, reviewStatus: "corrected", updatedAt: now });
      }
      if (input.action === "accept_risk") await ctx.db.patch(row._id, { reviewStatus: "accepted", updatedAt: now });
      if (input.action === "reject_risk") await ctx.db.patch(row._id, { reviewStatus: "rejected", updatedAt: now });
      if (input.action === "set_risk_decision") {
        const disposition = input.riskCarryDecision === "transfer" ? "transferred" as const : row.disposition;
        await ctx.db.patch(row._id, { carryDecision: input.riskCarryDecision!, disposition, reviewStatus: "accepted", updatedAt: now });
      }
      recordType = "risk"; recordId = String(row._id); decisionValue = await ctx.db.get(row._id);
      auditAction = input.action === "accept_risk" ? "accept" : input.action === "reject_risk" ? "reject" : input.action === "set_risk_decision" ? "status_change" : "update";
    } else {
      const result = await mutateEvidenceLink(ctx, { companyId, projectId: project._id, estimateId: estimate._id, user, input, now });
      recordType = "evidence_link"; recordId = result.recordId; previousValue = result.previousValue; decisionValue = result.decisionValue;
      auditAction = input.action === "verify_evidence" ? "verify" : "dispute";
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
