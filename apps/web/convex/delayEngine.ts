import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── Gather all project intelligence for delay prediction ──
export const gatherProjectIntelligence = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    // Tasks & schedule
    const tasks = await ctx.db.query("tasks").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    // Crew
    const allCrew = await ctx.db.query("crew").collect();
    const crew = allCrew.filter(c => c.projectId === args.projectId);

    // RFIs
    const rfis = await ctx.db.query("rfis").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    // Submittals
    const submittals = await ctx.db.query("submittals").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    // Deliveries
    const deliveries = await ctx.db.query("deliveries").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    // Concrete pours
    const pours = await ctx.db.query("concretePours").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    // Change orders
    const changeOrders = await ctx.db.query("changeOrders").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    // Budget
    const budgetItems = await ctx.db.query("budgetLineItems").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    // Time entries
    const timeEntries = await ctx.db.query("timeEntries").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    // Punch list
    const allPunch = await ctx.db.query("punchList").collect();
    const punchItems = allPunch.filter(p => (p as any).projectId?.toString() === args.projectId.toString());

    // Daily logs
    const allLogs = await ctx.db.query("dailyLogs").collect();
    const dailyLogs = allLogs.filter(l => (l as any).projectId?.toString() === args.projectId.toString());

    // Safety incidents
    const allIncidents = await ctx.db.query("incidents").collect();
    const incidents = allIncidents.filter(i => (i as any).projectId?.toString() === args.projectId.toString());

    // Weather alerts
    const allAlerts = await ctx.db.query("weatherAlerts").collect();
    const weatherAlerts = allAlerts.filter(w => (w as any).projectId?.toString() === args.projectId.toString());

    // Bid line items
    const bidItems = await ctx.db.query("bidLineItems").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();

    return {
      project,
      tasks,
      crew,
      rfis,
      submittals,
      deliveries,
      pours,
      changeOrders,
      budgetItems,
      timeEntries,
      punchItems,
      dailyLogs,
      incidents,
      weatherAlerts,
      bidItems,
    };
  },
});

// ── Store prediction results ──
export const savePrediction = mutation({
  args: {
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    generatedAt: v.number(),
    overallRisk: v.string(), // "low" | "medium" | "high" | "critical"
    predictedDelayDays: v.number(),
    confidence: v.number(),
    predictions: v.any(), // array of individual predictions
    recommendations: v.any(), // array of recommendations
    rawAnalysis: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("delayPredictions", args);
  },
});

// ── Get latest prediction ──
export const getLatestPrediction = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const preds = await ctx.db.query("delayPredictions")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("desc")
      .take(1);
    return preds[0] ?? null;
  },
});

// ── Get prediction history ──
export const getPredictionHistory = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("delayPredictions")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("desc")
      .take(10);
  },
});
