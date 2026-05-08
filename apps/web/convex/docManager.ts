import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) { items = await ctx.db.query("documents").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).order("desc").collect(); }
    else { items = await ctx.db.query("documents").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).order("desc").collect(); }
    if (args.category) items = items.filter((i) => i.category === args.category);
    const pMap = new Map<string, string>();
    for (const i of items) { if (i.projectId && !pMap.has(i.projectId)) { const p = await ctx.db.get(i.projectId); if (p) pMap.set(i.projectId, p.name); } }
    return items.map((i) => ({ ...i, projectName: i.projectId ? pMap.get(i.projectId) ?? "" : "Company" }));
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"), projectId: v.optional(v.id("projects")), name: v.string(), category: v.string(),
    url: v.optional(v.string()), storageId: v.optional(v.id("_storage")), fileSize: v.optional(v.number()), uploadedBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())), notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("documents", { ...args, uploadedAt: new Date().toISOString(), version: 1 }),
});

export const update = mutation({
  args: { id: v.id("documents"), name: v.optional(v.string()), category: v.optional(v.string()), tags: v.optional(v.array(v.string())), notes: v.optional(v.string()) },
  handler: async (ctx, args) => { const { id, ...f } = args; await ctx.db.patch(id, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined))); },
});

export const updateAiExtract = mutation({
  args: { id: v.id("documents"), aiExtract: v.string(), aiStatus: v.string() },
  handler: async (ctx, args) => { await ctx.db.patch(args.id, { aiExtract: args.aiExtract, aiStatus: args.aiStatus }); },
});

export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const remove = mutation({ args: { id: v.id("documents") }, handler: async (ctx, args) => { await ctx.db.delete(args.id); } });
