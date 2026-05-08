import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ===== BUYOUT ITEMS =====
export const listItems = query({
  args: { companyId: v.id("companies"), projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("buyoutItems")
      .withIndex("by_project", (q) => q.eq("companyId", args.companyId).eq("projectId", args.projectId))
      .collect();
  },
});

export const createItem = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    category: v.string(),
    description: v.string(),
    budgetAmount: v.number(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    status: v.string(),
    scope: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("buyoutItems", {
      ...args,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("buyoutItems"),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    budgetAmount: v.optional(v.number()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    awardedVendor: v.optional(v.string()),
    awardedAmount: v.optional(v.number()),
    awardedDate: v.optional(v.string()),
    poNumber: v.optional(v.string()),
    status: v.optional(v.string()),
    quotesReceived: v.optional(v.number()),
    leadTime: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    savings: v.optional(v.number()),
    savingsPercent: v.optional(v.number()),
    notes: v.optional(v.string()),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { ...fields, updatedAt: new Date().toISOString() };
    // Remove undefined fields
    for (const k of Object.keys(updates)) {
      if (updates[k] === undefined) delete updates[k];
    }
    await ctx.db.patch(id, updates);
  },
});

export const removeItem = mutation({
  args: { id: v.id("buyoutItems") },
  handler: async (ctx, args) => {
    // Remove associated quotes
    const quotes = await ctx.db
      .query("buyoutQuotes")
      .withIndex("by_item", (q) => q.eq("buyoutItemId", args.id))
      .collect();
    for (const q of quotes) await ctx.db.delete(q._id);
    await ctx.db.delete(args.id);
  },
});

// ===== QUOTES =====
export const listQuotes = query({
  args: { buyoutItemId: v.id("buyoutItems") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("buyoutQuotes")
      .withIndex("by_item", (q) => q.eq("buyoutItemId", args.buyoutItemId))
      .collect();
  },
});

export const listAllQuotes = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("buyoutQuotes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const createQuote = mutation({
  args: {
    companyId: v.id("companies"),
    buyoutItemId: v.id("buyoutItems"),
    vendorName: v.string(),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    amount: v.number(),
    unitPrice: v.optional(v.number()),
    leadTime: v.optional(v.string()),
    notes: v.optional(v.string()),
    quoteDate: v.optional(v.string()),
    expiresDate: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("buyoutQuotes", {
      ...args,
      createdAt: new Date().toISOString(),
    });
    // Update quote count on buyout item
    const quotes = await ctx.db
      .query("buyoutQuotes")
      .withIndex("by_item", (q) => q.eq("buyoutItemId", args.buyoutItemId))
      .collect();
    await ctx.db.patch(args.buyoutItemId, { quotesReceived: quotes.length });
    return id;
  },
});

export const updateQuote = mutation({
  args: {
    id: v.id("buyoutQuotes"),
    vendorName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    amount: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    leadTime: v.optional(v.string()),
    notes: v.optional(v.string()),
    quoteDate: v.optional(v.string()),
    expiresDate: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { ...fields };
    for (const k of Object.keys(updates)) {
      if (updates[k] === undefined) delete updates[k];
    }
    await ctx.db.patch(id, updates);
  },
});

export const removeQuote = mutation({
  args: { id: v.id("buyoutQuotes"), buyoutItemId: v.id("buyoutItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    const quotes = await ctx.db
      .query("buyoutQuotes")
      .withIndex("by_item", (q) => q.eq("buyoutItemId", args.buyoutItemId))
      .collect();
    await ctx.db.patch(args.buyoutItemId, { quotesReceived: quotes.length });
  },
});

// Award a quote — update the buyout item with vendor info and mark other quotes rejected
export const awardQuote = mutation({
  args: { quoteId: v.id("buyoutQuotes"), buyoutItemId: v.id("buyoutItems") },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error("Quote not found");
    
    // Mark this quote as selected
    await ctx.db.patch(args.quoteId, { status: "selected" });
    
    // Mark all other quotes for this item as rejected
    const otherQuotes = await ctx.db
      .query("buyoutQuotes")
      .withIndex("by_item", (q) => q.eq("buyoutItemId", args.buyoutItemId))
      .collect();
    for (const q of otherQuotes) {
      if (q._id !== args.quoteId && q.status !== "rejected") {
        await ctx.db.patch(q._id, { status: "rejected" });
      }
    }
    
    // Update buyout item
    const item = await ctx.db.get(args.buyoutItemId);
    if (!item) return;
    const savings = item.budgetAmount - quote.amount;
    const savingsPercent = item.budgetAmount > 0 ? (savings / item.budgetAmount) * 100 : 0;
    
    await ctx.db.patch(args.buyoutItemId, {
      status: "awarded",
      awardedVendor: quote.vendorName,
      awardedAmount: quote.amount,
      awardedDate: new Date().toISOString().slice(0, 10),
      savings,
      savingsPercent,
      leadTime: quote.leadTime,
      updatedAt: new Date().toISOString(),
    });
  },
});
