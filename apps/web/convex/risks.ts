import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("risks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
  },
});

export const listByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const projects = await ctx.db.query("projects").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const all = [];
    for (const p of projects) {
      const items = await ctx.db.query("risks").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      all.push(...items.map((r) => ({ ...r, projectName: p.name })));
    }
    return all;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    description: v.optional(v.string()),
    probability: v.optional(v.string()),
    impact: v.optional(v.string()),
    mitigation: v.optional(v.string()),
    owner: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("risks", { ...args, status: "Open" });
  },
});

export const update = mutation({
  args: {
    id: v.id("risks"),
    description: v.optional(v.string()),
    probability: v.optional(v.string()),
    impact: v.optional(v.string()),
    mitigation: v.optional(v.string()),
    owner: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("risks") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});
