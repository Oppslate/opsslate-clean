import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const manpowerValidator = v.array(v.object({
  trade: v.string(),
  company: v.optional(v.string()),
  headcount: v.number(),
  hours: v.optional(v.number()),
}));

const equipmentValidator = v.array(v.object({
  name: v.string(),
  status: v.optional(v.string()),
  hours: v.optional(v.number()),
}));

const delayValidator = v.array(v.object({
  description: v.string(),
  cause: v.optional(v.string()),
  hoursLost: v.optional(v.number()),
}));

const visitorValidator = v.array(v.object({
  name: v.string(),
  company: v.optional(v.string()),
  purpose: v.optional(v.string()),
}));

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let logs;
    if (args.projectId) {
      const projects = await ctx.db.query("projects")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect();
      const project = projects.find((p) => p._id === args.projectId);
      if (!project) return [];
      logs = await ctx.db.query("dailyLogs")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .order("desc")
        .collect();
      return logs.map((l) => ({ ...l, projectName: project.name }));
    }

    logs = await ctx.db.query("dailyLogs")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();

    const projectMap = new Map<string, string>();
    for (const l of logs) {
      if (!projectMap.has(l.projectId)) {
        const p = await ctx.db.get(l.projectId);
        if (p) projectMap.set(l.projectId, p.name);
      }
    }
    return logs.map((l) => ({ ...l, projectName: projectMap.get(l.projectId) ?? "" }));
  },
});

export const getById = query({
  args: { id: v.id("dailyLogs") },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.id);
    if (!log) return null;
    const p = await ctx.db.get(log.projectId);
    return { ...log, projectName: p?.name ?? "" };
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    date: v.string(),
    createdBy: v.optional(v.string()),
    weatherCondition: v.optional(v.string()),
    tempHigh: v.optional(v.number()),
    tempLow: v.optional(v.number()),
    wind: v.optional(v.string()),
    precipitation: v.optional(v.string()),
    manpower: v.optional(manpowerValidator),
    totalManpower: v.optional(v.number()),
    equipmentOnSite: v.optional(equipmentValidator),
    workPerformed: v.optional(v.string()),
    delays: v.optional(delayValidator),
    visitors: v.optional(visitorValidator),
    safetyIncidents: v.optional(v.string()),
    toolboxTalk: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("dailyLogs", {
      ...args,
      status: "draft",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("dailyLogs"),
    weatherCondition: v.optional(v.string()),
    tempHigh: v.optional(v.number()),
    tempLow: v.optional(v.number()),
    wind: v.optional(v.string()),
    precipitation: v.optional(v.string()),
    manpower: v.optional(manpowerValidator),
    totalManpower: v.optional(v.number()),
    equipmentOnSite: v.optional(equipmentValidator),
    workPerformed: v.optional(v.string()),
    delays: v.optional(delayValidator),
    visitors: v.optional(visitorValidator),
    safetyIncidents: v.optional(v.string()),
    toolboxTalk: v.optional(v.string()),
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
  args: { id: v.id("dailyLogs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getLatest = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().slice(0, 10);
    const logs = await ctx.db.query("dailyLogs")
      .withIndex("by_date", (q) => q.eq("companyId", args.companyId).eq("date", today))
      .collect();
    const results = [];
    for (const l of logs) {
      const p = await ctx.db.get(l.projectId);
      results.push({ ...l, projectName: p?.name ?? "" });
    }
    return results;
  },
});
