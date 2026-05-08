import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return ctx.db
        .query("feedback")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("desc")
        .collect();
    }
    return ctx.db.query("feedback").order("desc").collect();
  },
});

export const submit = mutation({
  args: {
    companyId: v.id("companies"),
    userName: v.optional(v.string()),
    category: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("feedback", {
      companyId: args.companyId,
      userName: args.userName,
      category: args.category,
      message: args.message,
      status: "new",
      priority: "normal",
      createdAt: new Date().toISOString(),
    });

    // Post to Discord #feedback channel
    await ctx.scheduler.runAfter(0, internal.discordWebhook.postFeedback, {
      userName: args.userName,
      category: args.category,
      message: args.message,
    });

    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("feedback"),
    status: v.string(),
    aiSummary: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const getNew = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("feedback")
      .withIndex("by_status", (q) => q.eq("status", "new"))
      .order("desc")
      .collect();
  },
});
