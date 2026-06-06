import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createPredictionRun = mutation({
  args: {
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    projectId: v.optional(v.id("projects")),
    modelVersion: v.string(),
    predictionType: v.string(),
    predictionKey: v.string(),
    predictionValue: v.any(),
    inputSnapshot: v.optional(v.any()),
    outputSnapshot: v.optional(v.any()),
    outcomeSnapshot: v.optional(v.any()),
    outcomeRecordedAt: v.optional(v.number()),
    confidence: v.optional(v.number()),
    status: v.optional(v.string()),
    explanation: v.optional(v.string()),
    sourceDataSummary: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("estimatePredictionRuns", {
      ...args,
      status: args.status || "recorded",
      createdAt: Date.now(),
    });
  },
});

export const updatePredictionRunOutcome = mutation({
  args: {
    predictionRunId: v.id("estimatePredictionRuns"),
    outcomeSnapshot: v.any(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.predictionRunId, {
      outcomeSnapshot: args.outcomeSnapshot,
      outcomeRecordedAt: Date.now(),
      status: args.status || "outcome-recorded",
    });
  },
});

export const listPredictionRuns = query({
  args: {
    companyId: v.id("companies"),
    estimateId: v.optional(v.id("estimates")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 200);
    if (args.estimateId) {
      return ctx.db.query("estimatePredictionRuns")
        .withIndex("by_estimate", (q) => q.eq("estimateId", args.estimateId!))
        .order("desc")
        .take(limit);
    }
    return ctx.db.query("estimatePredictionRuns")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);
  },
});

export const recordPredictionFeatures = mutation({
  args: {
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    projectId: v.optional(v.id("projects")),
    predictionRunId: v.id("estimatePredictionRuns"),
    features: v.array(v.object({
      featureKey: v.string(),
      featureValue: v.any(),
      featureType: v.optional(v.string()),
      featureWeight: v.optional(v.number()),
      sourceTable: v.optional(v.string()),
      sourceRecordId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const feature of args.features) {
      ids.push(await ctx.db.insert("estimatePredictionFeatures", {
        companyId: args.companyId,
        estimateId: args.estimateId,
        projectId: args.projectId,
        predictionRunId: args.predictionRunId,
        ...feature,
        createdAt: Date.now(),
      }));
    }
    return ids;
  },
});

export const recordEstimateOutcome = mutation({
  args: {
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    projectId: v.optional(v.id("projects")),
    predictionRunId: v.optional(v.id("estimatePredictionRuns")),
    outcomeType: v.string(),
    outcomeKey: v.optional(v.string()),
    expectedValue: v.optional(v.any()),
    actualValue: v.optional(v.any()),
    variance: v.optional(v.number()),
    wonLost: v.optional(v.string()),
    finalMargin: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    awardedAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("estimateOutcomeMemory", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const listEstimateOutcomes = query({
  args: {
    companyId: v.id("companies"),
    estimateId: v.optional(v.id("estimates")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 200);
    if (args.estimateId) {
      return ctx.db.query("estimateOutcomeMemory")
        .withIndex("by_estimate", (q) => q.eq("estimateId", args.estimateId!))
        .order("desc")
        .take(limit);
    }
    return ctx.db.query("estimateOutcomeMemory")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);
  },
});

export const recordEstimatorFeedback = mutation({
  args: {
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    projectId: v.optional(v.id("projects")),
    predictionRunId: v.optional(v.id("estimatePredictionRuns")),
    sourceUserId: v.optional(v.id("users")),
    feedbackType: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    action: v.optional(v.string()),
    accepted: v.optional(v.boolean()),
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("estimatorFeedback", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const recordPredictionFeedback = mutation({
  args: {
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    projectId: v.optional(v.id("projects")),
    predictionRunId: v.id("estimatePredictionRuns"),
    sourceUserId: v.optional(v.id("users")),
    predictionKey: v.string(),
    feedbackType: v.string(),
    expectedValue: v.optional(v.any()),
    actualValue: v.optional(v.any()),
    accuracyScore: v.optional(v.number()),
    wasUseful: v.optional(v.boolean()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("predictionFeedback", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listPredictionFeedback = query({
  args: {
    companyId: v.id("companies"),
    predictionRunId: v.optional(v.id("estimatePredictionRuns")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 200);
    if (args.predictionRunId) {
      return ctx.db.query("predictionFeedback")
        .withIndex("by_prediction_run", (q) => q.eq("predictionRunId", args.predictionRunId!))
        .order("desc")
        .take(limit);
    }
    return ctx.db.query("predictionFeedback")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);
  },
});
