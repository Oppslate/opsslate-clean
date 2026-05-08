import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) { items = await ctx.db.query("rfis").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).order("desc").collect(); }
    else { items = await ctx.db.query("rfis").filter((q) => q.eq(q.field("companyId"), args.companyId)).order("desc").collect(); }
    if (args.status) items = items.filter((i) => i.status === args.status);
    const pMap = new Map<string, string>();
    for (const i of items) { if (!pMap.has(i.projectId)) { const p = await ctx.db.get(i.projectId); if (p) pMap.set(i.projectId, p.name); } }
    return items.map((i) => ({ ...i, projectName: pMap.get(i.projectId) ?? "" }));
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"), projectId: v.id("projects"), subject: v.string(), question: v.string(),
    priority: v.optional(v.string()), assignedTo: v.optional(v.string()), requestedBy: v.optional(v.string()),
    dateRequired: v.optional(v.string()), costImpact: v.optional(v.boolean()), scheduleImpact: v.optional(v.boolean()), notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("rfis").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    return ctx.db.insert("rfis", { ...args, number: existing.length + 1, status: "Open", dateSubmitted: new Date().toISOString().slice(0, 10) });
  },
});

export const answer = mutation({
  args: { id: v.id("rfis"), answer: v.string(), answeredBy: v.optional(v.string()) },
  handler: async (ctx, args) => { await ctx.db.patch(args.id, { answer: args.answer, status: "Answered", dateAnswered: new Date().toISOString().slice(0, 10) }); },
});

export const update = mutation({
  args: {
    id: v.id("rfis"), subject: v.optional(v.string()), question: v.optional(v.string()), answer: v.optional(v.string()),
    priority: v.optional(v.string()), assignedTo: v.optional(v.string()), dateRequired: v.optional(v.string()),
    status: v.optional(v.string()), costImpact: v.optional(v.boolean()), scheduleImpact: v.optional(v.boolean()), notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => { const { id, ...f } = args; await ctx.db.patch(id, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined))); },
});

export const remove = mutation({ args: { id: v.id("rfis") }, handler: async (ctx, args) => { await ctx.db.delete(args.id); } });
