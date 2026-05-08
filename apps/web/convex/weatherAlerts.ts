import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listAlerts = query({
  args: { companyId: v.id("companies"), date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.date) {
      return ctx.db.query("weatherAlerts").withIndex("by_date", (q) => q.eq("companyId", args.companyId).eq("date", args.date!)).collect();
    }
    return ctx.db.query("weatherAlerts").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).order("desc").take(50);
  },
});

export const createAlert = mutation({
  args: {
    companyId: v.id("companies"), projectId: v.id("projects"),
    date: v.string(), alertType: v.string(), severity: v.string(),
    message: v.string(), recommendation: v.string(),
    affectedWork: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("weatherAlerts", { ...args, crewNotified: false, dismissed: false });
  },
});

export const dismissAlert = mutation({
  args: { id: v.id("weatherAlerts") },
  handler: async (ctx, args) => { await ctx.db.patch(args.id, { dismissed: true }); },
});

export const markNotified = mutation({
  args: { id: v.id("weatherAlerts") },
  handler: async (ctx, args) => { await ctx.db.patch(args.id, { crewNotified: true, notifiedAt: new Date().toISOString() }); },
});

export const latestByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("weatherAlerts").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).order("desc").take(10);
  },
});

export const createIfMissing = internalMutation({
  args: {
    companyId: v.id("companies"), projectId: v.id("projects"),
    date: v.string(), alertType: v.string(), severity: v.string(),
    message: v.string(), recommendation: v.string(),
    affectedWork: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("weatherAlerts").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const match = existing.find((a: any) => a.date === args.date && a.alertType === args.alertType && a.message === args.message);
    if (match) return match._id;
    return ctx.db.insert("weatherAlerts", { ...args, crewNotified: false, dismissed: false });
  },
});
