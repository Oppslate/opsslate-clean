import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const marketRecordFields = {
  companyId: v.id("companies"),
  sourceName: v.string(),
  sourceType: v.string(),
  sourceUrl: v.optional(v.string()),
  sourceFileId: v.optional(v.string()),
  collectedAt: v.string(),
  refreshDate: v.optional(v.string()),
  region: v.optional(v.string()),
  ownerAgency: v.optional(v.string()),
  workCategory: v.optional(v.string()),
  title: v.string(),
  summary: v.string(),
  unit: v.optional(v.string()),
  unitCost: v.optional(v.number()),
  totalCost: v.optional(v.number()),
  confidence: v.string(),
  status: v.string(),
  notes: v.optional(v.string()),
};

export const listMarketRecords = query({
  args: {
    companyId: v.id("companies"),
    sourceType: v.optional(v.string()),
    region: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 300);
    if (args.sourceType) {
      return ctx.db.query("marketIntelligenceRecords")
        .withIndex("by_source_type", (q) => q.eq("companyId", args.companyId).eq("sourceType", args.sourceType!))
        .order("desc")
        .take(limit);
    }
    if (args.region) {
      return ctx.db.query("marketIntelligenceRecords")
        .withIndex("by_region", (q) => q.eq("companyId", args.companyId).eq("region", args.region!))
        .order("desc")
        .take(limit);
    }
    return ctx.db.query("marketIntelligenceRecords")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);
  },
});

export const createMarketRecord = mutation({
  args: marketRecordFields,
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return ctx.db.insert("marketIntelligenceRecords", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateMarketRecord = mutation({
  args: {
    id: v.id("marketIntelligenceRecords"),
    sourceName: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourceFileId: v.optional(v.string()),
    collectedAt: v.optional(v.string()),
    refreshDate: v.optional(v.string()),
    region: v.optional(v.string()),
    ownerAgency: v.optional(v.string()),
    workCategory: v.optional(v.string()),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    unit: v.optional(v.string()),
    unitCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    confidence: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const removeMarketRecord = mutation({
  args: { id: v.id("marketIntelligenceRecords") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
