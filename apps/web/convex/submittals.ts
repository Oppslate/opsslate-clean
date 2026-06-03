import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { emailFrom, emailReplyTo } from "./emailConfig";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function procurementState(sub: any) {
  const status = String(sub.status || "").toLowerCase();
  const procurementStatus = String(sub.procurementStatus || sub.requestStatus || "").toLowerCase();
  if (procurementStatus === "escalated") return "escalated";
  if (procurementStatus === "received" || sub.uploadDocumentId || status === "submitted") return "received";
  if (/approved|rejected|revise/.test(status)) return "reviewed";
  if (sub.dueDate && sub.dueDate < today() && !/approved|closed/.test(status)) return "overdue";
  if (procurementStatus === "requested" || procurementStatus === "reminded" || sub.requestedAt) return "requested";
  if (sub.responsibleEmail || sub.responsibleCompany || sub.responsibleContact) return "ready_to_request";
  return "unassigned";
}

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) { items = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).order("desc").collect(); }
    else { items = await ctx.db.query("submittals").filter((q) => q.eq(q.field("companyId"), args.companyId)).order("desc").collect(); }
    if (args.status) items = items.filter((i) => i.status === args.status);
    const pMap = new Map<string, string>();
    for (const i of items) { if (!pMap.has(i.projectId)) { const p = await ctx.db.get(i.projectId); if (p) pMap.set(i.projectId, p.name); } }
    return items.map((i) => ({ ...i, procurementState: procurementState(i), projectName: pMap.get(i.projectId) ?? "" }));
  },
});

export const procurementDashboard = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const items = args.projectId
      ? await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).collect()
      : await ctx.db.query("submittals").filter((q) => q.eq(q.field("companyId"), args.companyId)).collect();
    const enriched = items.map((item) => ({ ...item, procurementState: procurementState(item) }));
    return {
      total: enriched.length,
      readyToRequest: enriched.filter((item) => item.procurementState === "ready_to_request").length,
      requested: enriched.filter((item) => item.procurementState === "requested").length,
      received: enriched.filter((item) => item.procurementState === "received").length,
      escalated: enriched.filter((item) => item.procurementState === "escalated").length,
      overdueRequests: enriched.filter((item) => item.procurementState === "overdue").length,
      lateItems: enriched.filter((item) => item.procurementState === "overdue" || item.procurementState === "escalated").slice(0, 8),
    };
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"), projectId: v.id("projects"), title: v.string(),
    specSection: v.optional(v.string()), description: v.optional(v.string()),
    submittedBy: v.optional(v.string()), priority: v.optional(v.string()),
    reviewer: v.optional(v.string()), dueDate: v.optional(v.string()), trade: v.optional(v.string()), notes: v.optional(v.string()),
    itemNumber: v.optional(v.string()), sourceDocumentId: v.optional(v.id("documents")), sourceDocumentName: v.optional(v.string()), sourceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    return ctx.db.insert("submittals", { ...args, number: existing.length + 1, status: "Pending", procurementStatus: "not_requested", submittedDate: today() });
  },
});

export const markRequestSent = mutation({
  args: { id: v.id("submittals"), requestedBy: v.optional(v.string()), channel: v.optional(v.string()), messageId: v.optional(v.string()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      requestStatus: "requested",
      procurementStatus: "requested",
      requestedAt: Date.now(),
      requestedBy: args.requestedBy,
      lastReminderSentAt: Date.now(),
      lastReminderChannel: args.channel || "email",
      lastReminderStatus: args.error ? "failed" : "sent",
      lastReminderMessageId: args.messageId,
      lastReminderError: args.error,
    });
  },
});

export const markReceived = mutation({
  args: { id: v.id("submittals"), uploadDocumentId: v.optional(v.id("documents")), uploadDocumentName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
      procurementStatus: "received",
      requestStatus: "received",
      receivedAt: Date.now(),
      uploadDate: today(),
      status: "Submitted",
    });
  },
});

export const escalateLate = mutation({
  args: { id: v.id("submittals"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      procurementStatus: "escalated",
      requestStatus: "escalated",
      escalatedAt: Date.now(),
      escalationReason: args.reason || "Submittal request is late or blocking work.",
    });
  },
});

export const sendRequest = action({
  args: { id: v.id("submittals"), requestedBy: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const sub = await ctx.runQuery(a.submittals.getById, { id: args.id });
    if (!sub) throw new Error("Submittal not found");
    if (!sub.responsibleEmail) {
      await ctx.runMutation(a.submittals.markRequestSent, { id: args.id, requestedBy: args.requestedBy, channel: "email", error: "missing_recipient" });
      return { sent: false, status: "missing_recipient", error: "No responsible email is assigned to this submittal." };
    }
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      await ctx.runMutation(a.submittals.markRequestSent, { id: args.id, requestedBy: args.requestedBy, channel: "email", error: "not_configured" });
      return { sent: false, status: "not_configured", error: "RESEND_API_KEY not set" };
    }
    const subject = `Submittal request: ${sub.title || `SUB-${sub.number}`}`;
    const body = [
      `Please provide the required submittal for ${sub.title || `SUB-${sub.number}`}.`,
      sub.projectName ? `Project: ${sub.projectName}` : "",
      sub.specSection ? `Spec section: ${sub.specSection}` : "",
      sub.dueDate ? `Due date: ${sub.dueDate}` : "",
      sub.description ? `Requirement: ${sub.description}` : "",
      "",
      "Reply with the submittal file or upload it through OpsSlate when available.",
    ].filter(Boolean).join("\n");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: emailFrom("OpsSlate Submittals"),
        reply_to: emailReplyTo(),
        to: [sub.responsibleEmail],
        subject,
        text: body,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      await ctx.runMutation(a.submittals.markRequestSent, { id: args.id, requestedBy: args.requestedBy, channel: "email", error });
      return { sent: false, status: "failed", error };
    }
    const result = await response.json();
    await ctx.runMutation(a.submittals.markRequestSent, { id: args.id, requestedBy: args.requestedBy, channel: "email", messageId: result.id });
    try {
      await ctx.runMutation(a.emails.create, {
        companyId: String(sub.companyId),
        projectId: String(sub.projectId),
        subject,
        from: emailFrom("OpsSlate Submittals"),
        to: sub.responsibleEmail,
        date: today(),
        body,
        bodyPreview: body.slice(0, 200),
        source: "Submittal Procurement",
        category: "outgoing",
        importance: "normal",
        isRead: true,
        hasAttachments: false,
        attachmentNames: [],
      });
    } catch {}
    return { sent: true, status: "sent", messageId: result.id };
  },
});

export const getById = query({
  args: { id: v.id("submittals") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.id);
    if (!sub) return null;
    const project = await ctx.db.get(sub.projectId);
    return { ...sub, procurementState: procurementState(sub), projectName: project?.name || "" };
  },
});

async function syncSpecIntelligenceResolution(ctx: any, record: any, args: { recordType: string; recordId: string; note: string; resolvedBy?: string; resolvedAnswer?: string }) {
  if (!record?.sourceItemId || record.sourceType !== "spec_intelligence") return;
  const sourceItem = await ctx.db.get(record.sourceItemId as any);
  if (!sourceItem) return;
  await ctx.db.patch(record.sourceItemId as any, {
    status: "resolved",
    resolutionStatus: "resolved",
    resolvedAnswer: args.resolvedAnswer,
    resolvedByRecordType: args.recordType,
    resolvedByRecordId: args.recordId,
    resolvedNote: args.note,
    resolvedAt: Date.now(),
    resolvedBy: args.resolvedBy,
    closedLoopSyncedAt: Date.now(),
  });
}

export const review = mutation({
  args: { id: v.id("submittals"), reviewAction: v.string(), reviewComments: v.optional(v.string()), reviewer: v.string() },
  handler: async (ctx, args) => {
    const submittal = await ctx.db.get(args.id);
    const statusMap: Record<string, string> = { "Approved": "Approved", "Approved as Noted": "Approved as Noted", "Revise and Resubmit": "Revise & Resubmit", "Rejected": "Rejected" };
    const status = statusMap[args.reviewAction] ?? args.reviewAction;
    await ctx.db.patch(args.id, { reviewAction: args.reviewAction, reviewComments: args.reviewComments, reviewer: args.reviewer, reviewDate: today(), adminDecisionBy: args.reviewer, adminDecisionDate: today(), procurementStatus: "reviewed", status });
    if (/approved/i.test(status)) {
      await syncSpecIntelligenceResolution(ctx, submittal, {
        recordType: "submittal",
        recordId: String(args.id),
        note: `Submittal reviewed: ${status}`,
        resolvedBy: args.reviewer,
        resolvedAnswer: args.reviewComments || status,
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("submittals"), title: v.optional(v.string()), specSection: v.optional(v.string()),
    description: v.optional(v.string()), priority: v.optional(v.string()), reviewer: v.optional(v.string()),
    dueDate: v.optional(v.string()), trade: v.optional(v.string()), status: v.optional(v.string()), notes: v.optional(v.string()),
    itemNumber: v.optional(v.string()), uploadDocumentId: v.optional(v.id("documents")), uploadDocumentName: v.optional(v.string()), uploadDate: v.optional(v.string()),
    responsibleCompany: v.optional(v.string()), responsibleContact: v.optional(v.string()), responsibleEmail: v.optional(v.string()), responsiblePhone: v.optional(v.string()),
    procurementStatus: v.optional(v.string()), requestStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => { const { id, ...f } = args; await ctx.db.patch(id, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined))); },
});

export const createFromSpecScan = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    sourceDocumentId: v.id("documents"),
    sourceDocumentName: v.string(),
    items: v.array(v.object({
      itemNumber: v.optional(v.string()),
      title: v.string(),
      description: v.optional(v.string()),
      specSection: v.optional(v.string()),
      trade: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    let nextNumber = existing.length + 1;
    const ids = [];
    for (const item of args.items) {
      const id = await ctx.db.insert("submittals", {
        companyId: args.companyId,
        projectId: args.projectId,
        number: nextNumber++,
        title: item.title,
        itemNumber: item.itemNumber,
        description: item.description,
        specSection: item.specSection,
        trade: item.trade,
        status: "Pending",
        procurementStatus: "not_requested",
        requestStatus: "not_requested",
        submittedDate: today(),
        sourceDocumentId: args.sourceDocumentId,
        sourceDocumentName: args.sourceDocumentName,
        sourceType: "spec-scan",
      });
      ids.push(id);
    }
    return ids;
  },
});

export const remove = mutation({ args: { id: v.id("submittals") }, handler: async (ctx, args) => { await ctx.db.delete(args.id); } });
