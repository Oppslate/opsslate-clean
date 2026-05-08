import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { month: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const events = await ctx.db.query("personalEvents").order("asc").collect();
    if (args.month) {
      return events.filter((e) => e.date.startsWith(args.month!));
    }
    return events;
  },
});

export const upcoming = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const end = new Date(Date.now() + (args.days ?? 14) * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const events = await ctx.db.query("personalEvents").order("asc").collect();
    return events.filter((e) => e.date >= today && e.date <= end && !e.done);
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    time: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    recurring: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("personalEvents", { ...args, done: false });
  },
});

export const update = mutation({
  args: {
    id: v.id("personalEvents"),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    done: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("personalEvents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
