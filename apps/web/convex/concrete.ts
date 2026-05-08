import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("concretePours")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const listByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const projects = await ctx.db.query("projects").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const all = [];
    for (const p of projects) {
      const items = await ctx.db.query("concretePours").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      all.push(...items.map((c) => ({ ...c, projectName: p.name })));
    }
    return all;
  },
});

export const remove = mutation({
  args: { id: v.id("concretePours") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    date: v.optional(v.string()),
    pour: v.optional(v.string()),
    cy: v.optional(v.number()),
    mixDesign: v.optional(v.string()),
    supplier: v.optional(v.string()),
    pump: v.optional(v.string()),
    crew: v.optional(v.string()),
    weatherRisk: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("concretePours", { ...args, status: "Planned" });
  },
});

export const update = mutation({
  args: {
    id: v.id("concretePours"),
    date: v.optional(v.string()),
    pour: v.optional(v.string()),
    cy: v.optional(v.number()),
    mixDesign: v.optional(v.string()),
    supplier: v.optional(v.string()),
    pump: v.optional(v.string()),
    crew: v.optional(v.string()),
    status: v.optional(v.string()),
    weatherRisk: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});
