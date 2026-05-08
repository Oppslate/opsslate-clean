import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("equipment")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    type: v.optional(v.string()),
    serial: v.optional(v.string()),
    hours: v.optional(v.number()),
    nextDue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("equipment", {
      companyId: args.companyId,
      name: args.name,
      type: args.type,
      serial: args.serial,
      hours: args.hours,
      nextDue: args.nextDue,
      status: "Available",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const update = mutation({
  args: {
    id: v.id("equipment"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    serial: v.optional(v.string()),
    hours: v.optional(v.number()),
    nextDue: v.optional(v.string()),
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
