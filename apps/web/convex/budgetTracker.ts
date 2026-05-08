import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getBudget = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const b = await ctx.db.query("budget").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).first();
    const lines = await ctx.db.query("budgetLineItems").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    // Get approved COs
    const cos = await ctx.db.query("changeOrders").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const approvedCOCost = cos.filter((c) => c.status === "Approved").reduce((s, c) => s + (c.approvedCost ?? c.estimatedCost ?? 0), 0);
    const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0);
    const totalCommitted = lines.reduce((s, l) => s + (l.committed ?? 0), 0);
    const totalActual = lines.reduce((s, l) => s + (l.actual ?? 0), 0);
    return { budget: b, lineItems: lines, approvedCOCost, totalBudgeted, totalCommitted, totalActual, coCount: cos.filter((c) => c.status === "Approved").length };
  },
});

export const upsertBudget = mutation({
  args: { companyId: v.id("companies"), projectId: v.id("projects"), originalContract: v.optional(v.number()), contingency: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("budget").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { originalContract: args.originalContract, contingency: args.contingency, updatedAt: new Date().toISOString() });
    } else {
      await ctx.db.insert("budget", { ...args, updatedAt: new Date().toISOString() });
    }
  },
});

export const addLineItem = mutation({
  args: { companyId: v.id("companies"), projectId: v.id("projects"), costCode: v.string(), description: v.string(), category: v.optional(v.string()), budgeted: v.number(), committed: v.optional(v.number()), actual: v.optional(v.number()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => { return ctx.db.insert("budgetLineItems", { ...args, variance: args.budgeted - (args.actual ?? 0) }); },
});

export const updateLineItem = mutation({
  args: { id: v.id("budgetLineItems"), costCode: v.optional(v.string()), description: v.optional(v.string()), category: v.optional(v.string()), budgeted: v.optional(v.number()), committed: v.optional(v.number()), actual: v.optional(v.number()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    if (clean.budgeted !== undefined || clean.actual !== undefined) {
      const item = await ctx.db.get(id);
      clean.variance = ((clean.budgeted as number) ?? item?.budgeted ?? 0) - ((clean.actual as number) ?? item?.actual ?? 0);
    }
    await ctx.db.patch(id, clean);
  },
});

export const removeLineItem = mutation({
  args: { id: v.id("budgetLineItems") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});
