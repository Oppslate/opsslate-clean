import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("deliveries").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
  },
});

export const listByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const projects = await ctx.db.query("projects").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const all = [];
    for (const p of projects) {
      const dels = await ctx.db.query("deliveries").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      all.push(...dels.map((d) => ({ ...d, projectName: p.name })));
    }
    return all;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    supplier: v.optional(v.string()),
    material: v.optional(v.string()),
    po: v.optional(v.string()),
    eta: v.optional(v.string()),
    status: v.optional(v.string()),
    confirmed: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("deliveries", { ...args, status: args.status ?? "Scheduled" });
  },
});

export const update = mutation({
  args: {
    id: v.id("deliveries"),
    supplier: v.optional(v.string()),
    material: v.optional(v.string()),
    po: v.optional(v.string()),
    eta: v.optional(v.string()),
    status: v.optional(v.string()),
    confirmed: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("deliveries") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});
