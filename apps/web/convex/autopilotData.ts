import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Autopilot Config ──
export const getConfig = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const configs = await ctx.db.query("autopilot")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return configs[0] ?? null;
  },
});

export const listConfigs = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const configs = await ctx.db.query("autopilot")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const results = [];
    for (const c of configs) {
      const p = await ctx.db.get(c.projectId);
      results.push({ ...c, projectName: p?.name ?? "" });
    }
    return results;
  },
});

export const enableAutopilot = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    managesCrew: v.optional(v.boolean()),
    managesSupplies: v.optional(v.boolean()),
    managesSchedule: v.optional(v.boolean()),
    monitorsWeather: v.optional(v.boolean()),
    monitorsSafety: v.optional(v.boolean()),
    autoSendEmails: v.optional(v.boolean()),
    generatesDailyLogs: v.optional(v.boolean()),
    projectGoals: v.optional(v.string()),
    constraints: v.optional(v.string()),
    budget: v.optional(v.number()),
    deadline: v.optional(v.string()),
    scopeOfWork: v.optional(v.string()),
    phases: v.optional(v.string()),
    currentPhase: v.optional(v.string()),
    milestones: v.optional(v.string()),
    enabledBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("autopilot")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    if (existing) {
      const { companyId, projectId, ...fields } = args;
      await ctx.db.patch(existing._id, { ...fields, enabled: true, enabledAt: new Date().toISOString() });
      return existing._id;
    }
    return ctx.db.insert("autopilot", {
      ...args,
      enabled: true,
      enabledAt: new Date().toISOString(),
      totalActions: 0,
    });
  },
});

export const disableAutopilot = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const config = await ctx.db.query("autopilot")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    if (config) await ctx.db.patch(config._id, { enabled: false });
  },
});

export const updateConfig = mutation({
  args: {
    projectId: v.id("projects"),
    managesCrew: v.optional(v.boolean()),
    managesSupplies: v.optional(v.boolean()),
    managesSchedule: v.optional(v.boolean()),
    monitorsWeather: v.optional(v.boolean()),
    monitorsSafety: v.optional(v.boolean()),
    autoSendEmails: v.optional(v.boolean()),
    generatesDailyLogs: v.optional(v.boolean()),
    projectGoals: v.optional(v.string()),
    constraints: v.optional(v.string()),
    budget: v.optional(v.number()),
    deadline: v.optional(v.string()),
    scopeOfWork: v.optional(v.string()),
    phases: v.optional(v.string()),
    currentPhase: v.optional(v.string()),
    milestones: v.optional(v.string()),
    lastRunAt: v.optional(v.string()),
    lastRunSummary: v.optional(v.string()),
    totalActions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...fields } = args;
    const config = await ctx.db.query("autopilot")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
    if (config) {
      const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      await ctx.db.patch(config._id, clean);
    }
  },
});

// ── Autopilot Action Log ──
export const listLogs = query({
  args: { projectId: v.id("projects"), status: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("autopilotLog")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(args.limit ?? 50);
    if (args.status) items = items.filter((i) => i.status === args.status);
    return items;
  },
});

export const createLog = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(),
    category: v.string(),
    title: v.string(),
    description: v.string(),
    actionTaken: v.optional(v.string()),
    status: v.string(),
    confidence: v.optional(v.number()),
    requiresApproval: v.optional(v.boolean()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("autopilotLog", { ...args, createdAt: new Date().toISOString() });
  },
});

export const approveAction = mutation({
  args: { id: v.id("autopilotLog"), approvedBy: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "approved", approvedBy: args.approvedBy, approvedAt: new Date().toISOString() });
  },
});

export const rejectAction = mutation({
  args: { id: v.id("autopilotLog"), rejectedBy: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "rejected", rejectedBy: args.rejectedBy, rejectedReason: args.reason });
  },
});

export const pendingCount = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("autopilotLog")
      .withIndex("by_status", (q) => q.eq("projectId", args.projectId).eq("status", "pending_approval"))
      .collect();
    return items.length;
  },
});
