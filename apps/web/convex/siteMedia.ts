import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    companyId: v.id("companies"),
    projectId: v.optional(v.string()),
    category: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId && args.category) {
      items = await ctx.db.query("siteMedia")
        .withIndex("by_category", (q) => q.eq("projectId", args.projectId as any).eq("category", args.category!))
        .order("desc").collect();
    } else if (args.projectId && args.type) {
      items = await ctx.db.query("siteMedia")
        .withIndex("by_type", (q) => q.eq("projectId", args.projectId as any).eq("type", args.type!))
        .order("desc").collect();
    } else if (args.projectId) {
      items = await ctx.db.query("siteMedia")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId as any))
        .order("desc").collect();
    } else {
      items = await ctx.db.query("siteMedia")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc").collect();
    }
    const pMap = new Map<string, string>();
    for (const item of items) {
      if (!pMap.has(item.projectId)) {
        const p = await ctx.db.get(item.projectId);
        if (p) pMap.set(item.projectId, p.name);
      }
    }
    return items.map((i) => ({ ...i, projectName: pMap.get(i.projectId) ?? "" }));
  },
});

export const getById = query({
  args: { id: v.id("siteMedia") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(),
    fileName: v.string(),
    url: v.string(),
    thumbnailUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    capturedDate: v.optional(v.string()),
    capturedBy: v.optional(v.string()),
    altitude: v.optional(v.string()),
    gpsCoords: v.optional(v.string()),
    linkedPunchId: v.optional(v.string()),
    linkedChangeOrderId: v.optional(v.string()),
    linkedDailyLogId: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("siteMedia", { ...args, status: "active" });
  },
});

export const update = mutation({
  args: {
    id: v.id("siteMedia"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    capturedDate: v.optional(v.string()),
    capturedBy: v.optional(v.string()),
    altitude: v.optional(v.string()),
    gpsCoords: v.optional(v.string()),
    linkedPunchId: v.optional(v.string()),
    linkedChangeOrderId: v.optional(v.string()),
    linkedDailyLogId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("siteMedia") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const stats = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) {
      items = await ctx.db.query("siteMedia")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId as any))
        .collect();
    } else {
      items = await ctx.db.query("siteMedia")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect();
    }
    const photos = items.filter((i) => i.type === "photo").length;
    const videos = items.filter((i) => i.type === "video").length;
    const drone = items.filter((i) => i.type === "drone").length;
    const totalSize = items.reduce((s, i) => s + (i.fileSize ?? 0), 0);
    return { total: items.length, photos, videos, drone, totalSize };
  },
});

export const resolveUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});

export const fixUrls = mutation({
  handler: async (ctx) => {
    const all = await ctx.db.query("siteMedia").collect();
    let fixed = 0;
    for (const m of all) {
      if (m.url && m.url.includes("/api/storage/")) {
        const sid = m.url.replace(/.*\/api\/storage\//, "");
        try {
          const signed = await ctx.storage.getUrl(sid as any);
          if (signed && signed !== m.url) {
            await ctx.db.patch(m._id, { url: signed });
            fixed++;
          }
        } catch { /* skip */ }
      }
    }
    return { total: all.length, fixed };
  },
});
