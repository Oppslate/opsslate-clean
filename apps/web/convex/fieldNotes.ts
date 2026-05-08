import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("fieldNotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(50);
  },
});

export const add = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    note: v.string(),
    author: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("fieldNotes", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("fieldNotes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
