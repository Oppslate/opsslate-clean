import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const witnessV = v.array(v.object({ name: v.string(), company: v.optional(v.string()), statement: v.optional(v.string()) }));
const immediateV = v.array(v.object({ action: v.string(), assignedTo: v.optional(v.string()), status: v.string(), completedDate: v.optional(v.string()) }));
const correctiveV = v.array(v.object({ action: v.string(), assignedTo: v.optional(v.string()), dueDate: v.optional(v.string()), status: v.string(), completedDate: v.optional(v.string()) }));
const preventiveV = v.array(v.object({ action: v.string(), assignedTo: v.optional(v.string()), dueDate: v.optional(v.string()), status: v.string() }));

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()), severity: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) {
      items = await ctx.db.query("incidents").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).order("desc").collect();
    } else {
      items = await ctx.db.query("incidents").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).order("desc").collect();
    }
    if (args.severity) items = items.filter((i) => i.severity === args.severity);
    if (args.status) items = items.filter((i) => i.status === args.status);
    const pMap = new Map<string, string>();
    for (const item of items) {
      if (!pMap.has(item.projectId)) { const p = await ctx.db.get(item.projectId); if (p) pMap.set(item.projectId, p.name); }
    }
    const results = [];
    for (const item of items) {
      const comments = await ctx.db.query("incidentComments").withIndex("by_incident", (q) => q.eq("incidentId", item._id)).collect();
      const openActions = [...(item.immediateActions ?? []), ...(item.correctiveActions ?? [])].filter((a) => a.status !== "Complete").length;
      results.push({ ...item, projectName: pMap.get(item.projectId) ?? "", commentCount: comments.length, openActions });
    }
    return results;
  },
});

export const getById = query({
  args: { id: v.id("incidents") },
  handler: async (ctx, args) => {
    const inc = await ctx.db.get(args.id);
    if (!inc) return null;
    const p = await ctx.db.get(inc.projectId);
    return { ...inc, projectName: p?.name ?? "" };
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"), projectId: v.id("projects"),
    title: v.string(), type: v.string(), severity: v.string(),
    date: v.string(), time: v.optional(v.string()), location: v.optional(v.string()),
    description: v.string(),
    injuredPerson: v.optional(v.string()), injuredPersonRole: v.optional(v.string()),
    injuredPersonCompany: v.optional(v.string()), injuryType: v.optional(v.string()),
    bodyPart: v.optional(v.string()), treatmentGiven: v.optional(v.string()),
    hospitalTransport: v.optional(v.boolean()),
    witnesses: v.optional(witnessV),
    rootCause: v.optional(v.string()), contributingFactors: v.optional(v.array(v.string())),
    riskLevel: v.optional(v.string()), likelihoodOfRecurrence: v.optional(v.string()),
    potentialConsequence: v.optional(v.string()),
    immediateActions: v.optional(immediateV), correctiveActions: v.optional(correctiveV),
    preventiveActions: v.optional(preventiveV),
    oshaReportable: v.optional(v.boolean()), oshaRecordNumber: v.optional(v.string()),
    daysAwayFromWork: v.optional(v.number()), restrictedDutyDays: v.optional(v.number()),
    notifiedParties: v.optional(v.array(v.string())),
    reportedBy: v.optional(v.string()), notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("incidents").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const maxNum = existing.reduce((max, i) => Math.max(max, i.number ?? 0), 0);
    const id = await ctx.db.insert("incidents", { ...args, number: maxNum + 1, status: "Open" });
    await ctx.db.insert("incidentComments", {
      incidentId: id, author: args.reportedBy ?? "System",
      text: `🚨 Incident reported: ${args.title} (${args.severity})`, type: "system", createdAt: new Date().toISOString(),
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("incidents"),
    title: v.optional(v.string()), type: v.optional(v.string()), severity: v.optional(v.string()),
    date: v.optional(v.string()), time: v.optional(v.string()), location: v.optional(v.string()),
    description: v.optional(v.string()),
    injuredPerson: v.optional(v.string()), injuredPersonRole: v.optional(v.string()),
    injuredPersonCompany: v.optional(v.string()), injuryType: v.optional(v.string()),
    bodyPart: v.optional(v.string()), treatmentGiven: v.optional(v.string()),
    hospitalTransport: v.optional(v.boolean()),
    witnesses: v.optional(witnessV),
    rootCause: v.optional(v.string()), contributingFactors: v.optional(v.array(v.string())),
    riskLevel: v.optional(v.string()), likelihoodOfRecurrence: v.optional(v.string()),
    potentialConsequence: v.optional(v.string()),
    immediateActions: v.optional(immediateV), correctiveActions: v.optional(correctiveV),
    preventiveActions: v.optional(preventiveV),
    oshaReportable: v.optional(v.boolean()), oshaRecordNumber: v.optional(v.string()),
    daysAwayFromWork: v.optional(v.number()), restrictedDutyDays: v.optional(v.number()),
    notifiedParties: v.optional(v.array(v.string())),
    reviewedBy: v.optional(v.string()), reviewedDate: v.optional(v.string()),
    notes: v.optional(v.string()), status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const closeIncident = mutation({
  args: { id: v.id("incidents"), closedBy: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "Closed", closedBy: args.closedBy, closedDate: new Date().toISOString().slice(0, 10) });
    await ctx.db.insert("incidentComments", {
      incidentId: args.id, author: args.closedBy,
      text: `✅ Incident closed${args.notes ? ` — ${args.notes}` : ""}`, type: "system", createdAt: new Date().toISOString(),
    });
  },
});

export const reopenIncident = mutation({
  args: { id: v.id("incidents"), reopenedBy: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "Open", closedBy: undefined, closedDate: undefined });
    await ctx.db.insert("incidentComments", {
      incidentId: args.id, author: args.reopenedBy,
      text: `🔄 Incident reopened${args.reason ? ` — ${args.reason}` : ""}`, type: "system", createdAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("incidents") },
  handler: async (ctx, args) => {
    const comments = await ctx.db.query("incidentComments").withIndex("by_incident", (q) => q.eq("incidentId", args.id)).collect();
    for (const c of comments) await ctx.db.delete(c._id);
    await ctx.db.delete(args.id);
  },
});

export const listComments = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => ctx.db.query("incidentComments").withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId)).order("asc").collect(),
});

export const addComment = mutation({
  args: { incidentId: v.id("incidents"), author: v.string(), text: v.string() },
  handler: async (ctx, args) => ctx.db.insert("incidentComments", { ...args, type: "comment", createdAt: new Date().toISOString() }),
});

export const stats = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) {
      items = await ctx.db.query("incidents").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).collect();
    } else {
      items = await ctx.db.query("incidents").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    }
    const open = items.filter((i) => i.status === "Open" || i.status === "Under Investigation").length;
    const closed = items.filter((i) => i.status === "Closed").length;
    const critical = items.filter((i) => i.severity === "Critical" || i.severity === "Fatal").length;
    const nearMisses = items.filter((i) => i.type === "Near Miss").length;
    const oshaReportable = items.filter((i) => i.oshaReportable).length;
    const totalDaysAway = items.reduce((s, i) => s + (i.daysAwayFromWork ?? 0), 0);
    const openActions = items.reduce((s, i) => {
      return s + [...(i.immediateActions ?? []), ...(i.correctiveActions ?? []), ...(i.preventiveActions ?? [])].filter((a) => a.status !== "Complete").length;
    }, 0);
    return { total: items.length, open, closed, critical, nearMisses, oshaReportable, totalDaysAway, openActions };
  },
});
