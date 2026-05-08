import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("notificationProfiles") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("notificationProfiles")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    email: v.string(),
    type: v.string(),
    projectIds: v.optional(v.array(v.string())),
    includeCalendar: v.optional(v.boolean()),
    includeTodayPanel: v.optional(v.boolean()),
    includeCrewSchedule: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("notificationProfiles", {
      ...args,
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("notificationProfiles"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.optional(v.string()),
    projectIds: v.optional(v.array(v.string())),
    includeCalendar: v.optional(v.boolean()),
    includeTodayPanel: v.optional(v.boolean()),
    includeCrewSchedule: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
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
  args: { id: v.id("notificationProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("notificationProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.id);
    if (!profile) return;
    await ctx.db.patch(args.id, { active: !profile.active });
  },
});
