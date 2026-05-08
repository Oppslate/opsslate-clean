import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getEmail = query({
  args: { id: v.id("emails") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const updateEmailAI = mutation({
  args: {
    id: v.id("emails"),
    aiTone: v.string(),
    aiRiskFlags: v.array(v.string()),
    aiActionItems: v.array(v.string()),
    aiSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
