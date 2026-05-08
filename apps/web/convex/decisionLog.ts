import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("decisionLog")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(100);
  },
});

export const create = mutation({
  args: {
    companyId: v.string(),
    type: v.string(),
    description: v.string(),
    action: v.string(),
    project: v.string(),
    confidence: v.number(),
    outcome: v.string(),
    wasOverridden: v.boolean(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("decisionLog", {
      ...args,
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    });
  },
});

export const override = mutation({
  args: { id: v.id("decisionLog"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { wasOverridden: true, overrideReason: args.reason || "User overrode" });
  },
});

export const getStats = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    const logs = await ctx.db.query("decisionLog")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    
    const total = logs.length;
    const autoExecuted = logs.filter((l) => l.outcome === "auto-executed").length;
    const overridden = logs.filter((l) => l.wasOverridden).length;
    const byType = new Map<string, number>();
    logs.forEach((l) => byType.set(l.type, (byType.get(l.type) || 0) + 1));

    return {
      total,
      autoExecuted,
      overridden,
      acceptanceRate: total > 0 ? Math.round(((total - overridden) / total) * 100) : 100,
      byType: Object.fromEntries(byType),
    };
  },
});
