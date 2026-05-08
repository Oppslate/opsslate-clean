import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("insuranceRequirements")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    extractedText: v.optional(v.string()),
    requirements: v.optional(v.array(v.object({
      category: v.string(),
      description: v.string(),
      limit: v.optional(v.string()),
      status: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("insuranceRequirements", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("insuranceRequirements"),
    name: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    extractedText: v.optional(v.string()),
    requirements: v.optional(v.array(v.object({
      category: v.string(),
      description: v.string(),
      limit: v.optional(v.string()),
      status: v.optional(v.string()),
    }))),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("insuranceRequirements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
