import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Queries ──
export const getDocument = query({
  args: { id: v.id("bidDocuments") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const listDocuments = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("bidDocuments").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
  },
});

export const listBidLineItems = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("bidLineItems").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
  },
});

export const getBidVsActual = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const bidItems = await ctx.db.query("bidLineItems").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const budgetItems = await ctx.db.query("budgetLineItems").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();

    const totalBid = bidItems.reduce((s, i) => s + (i.bidAmount || 0), 0);
    const totalCommitted = bidItems.reduce((s, i) => s + (i.committed || 0), 0);
    const totalActual = bidItems.reduce((s, i) => s + (i.actual || 0), 0);

    // Cross-reference with budget tracker
    const budgetActual = budgetItems.reduce((s, i) => s + (i.actual || 0), 0);
    const budgetCommitted = budgetItems.reduce((s, i) => s + (i.committed || 0), 0);

    // Group bid items by category
    const byCategory: Record<string, { bid: number; committed: number; actual: number; items: typeof bidItems }> = {};
    for (const item of bidItems) {
      const cat = item.category || "Uncategorized";
      if (!byCategory[cat]) byCategory[cat] = { bid: 0, committed: 0, actual: 0, items: [] };
      byCategory[cat].bid += item.bidAmount || 0;
      byCategory[cat].committed += item.committed || 0;
      byCategory[cat].actual += item.actual || 0;
      byCategory[cat].items.push(item);
    }

    return {
      totalBid,
      totalCommitted: totalCommitted || budgetCommitted,
      totalActual: totalActual || budgetActual,
      totalVariance: totalBid - (totalActual || budgetActual),
      profitMargin: totalBid > 0 ? ((totalBid - (totalActual || budgetActual)) / totalBid * 100) : 0,
      byCategory,
      lineItems: bidItems,
      budgetItems,
    };
  },
});

export const projectsWithBidDocs = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const docs = await ctx.db.query("bidDocuments").collect();
    const projectIds = new Set(docs.map(d => d.projectId.toString()));
    return Array.from(projectIds);
  },
});

// ── Mutations ──
export const insertDocument = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(),
    fileName: v.string(),
    fileId: v.id("_storage"),
    uploadedAt: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("bidDocuments", args),
});

export const updateDocStatus = mutation({
  args: { id: v.id("bidDocuments"), status: v.string() },
  handler: async (ctx, args) => ctx.db.patch(args.id, { status: args.status }),
});

export const updateDocExtracted = mutation({
  args: { id: v.id("bidDocuments"), status: v.string(), extractedData: v.any() },
  handler: async (ctx, args) => ctx.db.patch(args.id, { status: args.status, extractedData: args.extractedData }),
});

export const insertBidLineItem = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    documentId: v.id("bidDocuments"),
    costCode: v.optional(v.string()),
    description: v.string(),
    category: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    bidAmount: v.number(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("bidLineItems", args),
});

export const updateBidLineItem = mutation({
  args: {
    id: v.id("bidLineItems"),
    committed: v.optional(v.number()),
    actual: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const item = await ctx.db.get(id);
    if (!item) return;
    const committed = fields.committed ?? item.committed ?? 0;
    const actual = fields.actual ?? item.actual ?? 0;
    const variance = (item.bidAmount || 0) - actual;
    await ctx.db.patch(id, { ...fields, variance });
  },
});

export const deleteBidLineItem = mutation({
  args: { id: v.id("bidLineItems") },
  handler: async (ctx, args) => ctx.db.delete(args.id),
});

export const deleteDocument = mutation({
  args: { id: v.id("bidDocuments") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (doc) {
      await ctx.storage.delete(doc.fileId);
      // Delete associated line items
      const items = await ctx.db.query("bidLineItems").withIndex("by_project", (q) => q.eq("projectId", doc.projectId)).collect();
      for (const item of items) {
        if (item.documentId === args.id) await ctx.db.delete(item._id);
      }
      await ctx.db.delete(args.id);
    }
  },
});
