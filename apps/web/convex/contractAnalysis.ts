import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const analyses = await ctx.db
      .query("contractAnalysis")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();
    // Join project names
    const results = [];
    for (const a of analyses) {
      const p = await ctx.db.get(a.projectId);
      results.push({ ...a, projectName: p?.name ?? "" });
    }
    return results;
  },
});

export const getById = query({
  args: { id: v.id("contractAnalysis") },
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.id);
    if (!a) return null;
    const p = await ctx.db.get(a.projectId);
    return { ...a, projectName: p?.name ?? "" };
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    rawText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("contractAnalysis", {
      ...args,
      status: "processing",
      createdAt: Date.now(),
    });
  },
});

export const updateAnalysis = mutation({
  args: {
    id: v.id("contractAnalysis"),
    summary: v.optional(v.string()),
    insuranceRequirements: v.optional(v.array(v.object({
      requirement: v.string(),
      limit: v.optional(v.string()),
    }))),
    criticalDates: v.optional(v.array(v.object({
      date: v.string(),
      description: v.string(),
    }))),
    schedulingMilestones: v.optional(v.array(v.object({
      milestone: v.string(),
      date: v.optional(v.string()),
    }))),
    risks: v.optional(v.array(v.object({
      risk: v.string(),
      severity: v.optional(v.string()),
    }))),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("contractAnalysis") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
