import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("customTrades")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const add = mutation({
  args: { companyId: v.id("companies"), name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customTrades")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const normalized = args.name.trim();
    if (!normalized) return null;
    if (existing.some((t) => t.name.toLowerCase() === normalized.toLowerCase())) return null;
    return ctx.db.insert("customTrades", { companyId: args.companyId, name: normalized });
  },
});
