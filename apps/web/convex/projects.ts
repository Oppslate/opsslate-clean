import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("projects")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    county: v.optional(v.string()),
    fabricator: v.optional(v.string()),
    contractor: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    style: v.optional(v.string()),
    contractDate: v.optional(v.string()),
    orderDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    foundationType: v.optional(v.string()),
    projectManager: v.optional(v.string()),
    contractValue: v.optional(v.number()),
    retainagePercent: v.optional(v.number()),
    billingMethod: v.optional(v.string()),
    clientPO: v.optional(v.string()),
    contingencyPercent: v.optional(v.number()),
    planStatus: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const archive = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "Archived" });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const directProjectTables = [
      "rentals",
      "deliveries",
      "concretePours",
      "risks",
      "tasks",
      "fieldNotes",
      "contacts",
      "crew",
      "changeOrders",
      "budget",
      "voiceCommands",
      "delayPredictions",
      "bidDocuments",
      "bidLineItems",
      "budgetLineItems",
      "rfis",
      "submittals",
      "timeEntries",
      "documents",
      "siteMedia",
      "punchList",
      "dailyLogs",
      "clientPortalLinks",
      "aiProjectManagers",
      "aiPmMessages",
      "aiPmTasks",
    ];
    for (const table of directProjectTables) {
      const records = await (ctx.db.query as any)(table)
        .withIndex("by_project", (q: any) => q.eq("projectId", args.id))
        .collect();
      for (const record of records) await ctx.db.delete(record._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    code: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    county: v.optional(v.string()),
    fabricator: v.optional(v.string()),
    contractor: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    style: v.optional(v.string()),
    contractDate: v.optional(v.string()),
    orderDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    foundationType: v.optional(v.string()),
    projectManager: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("projects", { ...args, status: "Active" });
  },
});
