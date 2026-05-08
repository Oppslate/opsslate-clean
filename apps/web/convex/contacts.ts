import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("contacts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    company: v.optional(v.string()),
    title: v.optional(v.string()),
    role: v.optional(v.string()),
    trade: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("contacts", {
      ...args,
      status: args.status || "Active",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    company: v.optional(v.string()),
    title: v.optional(v.string()),
    role: v.optional(v.string()),
    trade: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
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
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
