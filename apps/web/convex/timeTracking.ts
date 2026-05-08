import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()), date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId && args.date) {
      items = await ctx.db.query("timeEntries").withIndex("by_date", (q) => q.eq("projectId", args.projectId as any).eq("date", args.date!)).collect();
    } else if (args.projectId) {
      items = await ctx.db.query("timeEntries").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).order("desc").collect();
    } else {
      items = await ctx.db.query("timeEntries").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).order("desc").take(200);
    }
    const pMap = new Map<string, string>();
    for (const i of items) { if (!pMap.has(i.projectId)) { const p = await ctx.db.get(i.projectId); if (p) pMap.set(i.projectId, p.name); } }
    return items.map((i) => {
      const totalHours = i.hoursRegular + (i.hoursOvertime ?? 0) + (i.hoursDouble ?? 0);
      const totalCost = (i.hoursRegular * (i.rateRegular ?? 0)) + ((i.hoursOvertime ?? 0) * (i.rateOvertime ?? (i.rateRegular ?? 0) * 1.5)) + ((i.hoursDouble ?? 0) * (i.rateRegular ?? 0) * 2);
      return { ...i, projectName: pMap.get(i.projectId) ?? "", totalHours, totalCost };
    });
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"), projectId: v.id("projects"), crewMemberId: v.optional(v.string()),
    crewMemberName: v.string(), trade: v.optional(v.string()), date: v.string(),
    hoursRegular: v.number(), hoursOvertime: v.optional(v.number()), hoursDouble: v.optional(v.number()),
    rateRegular: v.optional(v.number()), rateOvertime: v.optional(v.number()),
    costCode: v.optional(v.string()), description: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("timeEntries", { ...args, status: "pending" }),
});

export const approve = mutation({
  args: { id: v.id("timeEntries"), approvedBy: v.string() },
  handler: async (ctx, args) => { await ctx.db.patch(args.id, { status: "approved", approvedBy: args.approvedBy }); },
});

export const update = mutation({
  args: {
    id: v.id("timeEntries"), hoursRegular: v.optional(v.number()), hoursOvertime: v.optional(v.number()),
    hoursDouble: v.optional(v.number()), rateRegular: v.optional(v.number()), rateOvertime: v.optional(v.number()),
    costCode: v.optional(v.string()), description: v.optional(v.string()), status: v.optional(v.string()),
  },
  handler: async (ctx, args) => { const { id, ...f } = args; await ctx.db.patch(id, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined))); },
});

export const remove = mutation({ args: { id: v.id("timeEntries") }, handler: async (ctx, args) => { await ctx.db.delete(args.id); } });

export const stats = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) { items = await ctx.db.query("timeEntries").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).collect(); }
    else { items = await ctx.db.query("timeEntries").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(); }
    const totalRegular = items.reduce((s, i) => s + i.hoursRegular, 0);
    const totalOT = items.reduce((s, i) => s + (i.hoursOvertime ?? 0), 0);
    const totalCost = items.reduce((s, i) => s + (i.hoursRegular * (i.rateRegular ?? 0)) + ((i.hoursOvertime ?? 0) * (i.rateOvertime ?? (i.rateRegular ?? 0) * 1.5)), 0);
    return { totalEntries: items.length, totalRegular, totalOT, totalCost, pending: items.filter((i) => i.status === "pending").length };
  },
});
