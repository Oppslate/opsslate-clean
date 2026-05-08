import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) {
      items = await ctx.db.query("changeOrders")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId as any))
        .order("desc").collect();
    } else {
      items = await ctx.db.query("changeOrders")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc").collect();
    }
    if (args.status) items = items.filter((i) => i.status === args.status);

    const pMap = new Map<string, string>();
    for (const item of items) {
      if (!pMap.has(item.projectId)) {
        const p = await ctx.db.get(item.projectId);
        if (p) pMap.set(item.projectId, p.name);
      }
    }

    // Get comment counts
    const results = [];
    for (const item of items) {
      const comments = await ctx.db.query("changeOrderComments")
        .withIndex("by_co", (q) => q.eq("changeOrderId", item._id))
        .collect();
      results.push({ ...item, projectName: pMap.get(item.projectId) ?? "", commentCount: comments.length });
    }
    return results;
  },
});

export const getById = query({
  args: { id: v.id("changeOrders") },
  handler: async (ctx, args) => {
    const co = await ctx.db.get(args.id);
    if (!co) return null;
    const p = await ctx.db.get(co.projectId);
    return { ...co, projectName: p?.name ?? "" };
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    reason: v.optional(v.string()),
    requestedBy: v.optional(v.string()),
    source: v.optional(v.string()),
    priority: v.optional(v.string()),
    costType: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    scheduleDaysImpact: v.optional(v.number()),
    scopeDescription: v.optional(v.string()),
    affectedTrades: v.optional(v.array(v.string())),
    affectedArea: v.optional(v.string()),
    notifyCrewIds: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("changeOrders")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const maxNum = existing.reduce((max, i) => Math.max(max, i.number ?? 0), 0);
    const id = await ctx.db.insert("changeOrders", {
      ...args,
      number: maxNum + 1,
      status: "Pending",
      requestedDate: new Date().toISOString().slice(0, 10),
    });
    // Auto-add creation comment
    await ctx.db.insert("changeOrderComments", {
      changeOrderId: id,
      author: args.createdBy ?? "System",
      text: `Change order created: ${args.title}`,
      type: "system",
      createdAt: new Date().toISOString(),
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("changeOrders"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    reason: v.optional(v.string()),
    requestedBy: v.optional(v.string()),
    source: v.optional(v.string()),
    priority: v.optional(v.string()),
    costType: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    approvedCost: v.optional(v.number()),
    scheduleDaysImpact: v.optional(v.number()),
    scopeDescription: v.optional(v.string()),
    affectedTrades: v.optional(v.array(v.string())),
    affectedArea: v.optional(v.string()),
    notifyCrewIds: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const approve = mutation({
  args: { id: v.id("changeOrders"), approvedBy: v.string(), approvedCost: v.optional(v.number()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const co = await ctx.db.get(args.id);
    if (!co) throw new Error("Not found");
    await ctx.db.patch(args.id, {
      status: "Approved",
      approvedBy: args.approvedBy,
      approvedDate: new Date().toISOString().slice(0, 10),
      approvedCost: args.approvedCost ?? co.estimatedCost,
    });
    await ctx.db.insert("changeOrderComments", {
      changeOrderId: args.id,
      author: args.approvedBy,
      text: `✅ Approved${args.approvedCost ? ` at $${args.approvedCost.toLocaleString()}` : ""}${args.notes ? ` — ${args.notes}` : ""}`,
      type: "approval",
      createdAt: new Date().toISOString(),
    });
  },
});

export const reject = mutation({
  args: { id: v.id("changeOrders"), rejectedBy: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "Rejected",
      rejectedReason: args.reason,
    });
    await ctx.db.insert("changeOrderComments", {
      changeOrderId: args.id,
      author: args.rejectedBy,
      text: `❌ Rejected${args.reason ? ` — ${args.reason}` : ""}`,
      type: "rejection",
      createdAt: new Date().toISOString(),
    });
  },
});

export const submitForReview = mutation({
  args: { id: v.id("changeOrders"), submittedBy: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "Under Review" });
    await ctx.db.insert("changeOrderComments", {
      changeOrderId: args.id,
      author: args.submittedBy,
      text: "📋 Submitted for review",
      type: "system",
      createdAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("changeOrders") },
  handler: async (ctx, args) => {
    const comments = await ctx.db.query("changeOrderComments")
      .withIndex("by_co", (q) => q.eq("changeOrderId", args.id))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);
    await ctx.db.delete(args.id);
  },
});

// Comments
export const listComments = query({
  args: { changeOrderId: v.id("changeOrders") },
  handler: async (ctx, args) => {
    return ctx.db.query("changeOrderComments")
      .withIndex("by_co", (q) => q.eq("changeOrderId", args.changeOrderId))
      .order("asc").collect();
  },
});

export const addComment = mutation({
  args: { changeOrderId: v.id("changeOrders"), author: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    return ctx.db.insert("changeOrderComments", {
      ...args,
      type: "comment",
      createdAt: new Date().toISOString(),
    });
  },
});

// Stats
export const stats = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) {
      items = await ctx.db.query("changeOrders")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId as any))
        .collect();
    } else {
      items = await ctx.db.query("changeOrders")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect();
    }
    const pending = items.filter((i) => i.status === "Pending" || i.status === "Under Review").length;
    const approved = items.filter((i) => i.status === "Approved").length;
    const rejected = items.filter((i) => i.status === "Rejected").length;
    const totalEstimated = items.filter((i) => i.status !== "Rejected").reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
    const totalApproved = items.filter((i) => i.status === "Approved").reduce((s, i) => s + (i.approvedCost ?? i.estimatedCost ?? 0), 0);
    const totalDaysImpact = items.filter((i) => i.status === "Approved").reduce((s, i) => s + (i.scheduleDaysImpact ?? 0), 0);
    return { total: items.length, pending, approved, rejected, totalEstimated, totalApproved, totalDaysImpact };
  },
});
