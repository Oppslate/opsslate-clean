import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const logCommand = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    userId: v.string(),
    transcript: v.string(),
    action: v.string(),
    response: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert("voiceCommands", args),
});

export const getHistory = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("voiceCommands")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("desc")
      .take(20);
  },
});
