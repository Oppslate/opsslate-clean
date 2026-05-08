import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ===== COST ITEMS =====
export const listCostItems = query({
  args: { companyId: v.id("companies"), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db.query("costItems").withIndex("by_category", q => q.eq("companyId", args.companyId).eq("category", args.category as string)).collect();
    }
    return await ctx.db.query("costItems").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
  },
});

export const createCostItem = mutation({
  args: { companyId: v.id("companies"), name: v.string(), category: v.string(), unit: v.optional(v.string()), unitCost: v.number(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("costItems", args);
  },
});

export const updateCostItem = mutation({
  args: { id: v.id("costItems"), name: v.optional(v.string()), category: v.optional(v.string()), unit: v.optional(v.string()), unitCost: v.optional(v.number()), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleaned = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await ctx.db.patch(id, cleaned);
  },
});

export const deleteCostItem = mutation({
  args: { id: v.id("costItems") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ===== ESTIMATES =====
export const listEstimates = query({
  args: { companyId: v.id("companies"), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db.query("estimates").withIndex("by_status", q => q.eq("companyId", args.companyId).eq("status", args.status as string)).collect();
    }
    return await ctx.db.query("estimates").withIndex("by_company", q => q.eq("companyId", args.companyId)).order("desc").collect();
  },
});

export const getEstimate = query({
  args: { id: v.id("estimates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createEstimate = mutation({
  args: {
    companyId: v.id("companies"), name: v.string(), client: v.optional(v.string()), location: v.optional(v.string()),
    bidDate: v.optional(v.string()), status: v.string(), bidType: v.optional(v.string()), description: v.optional(v.string()),
    overhead: v.optional(v.number()), profit: v.optional(v.number()), bond: v.optional(v.number()), tax: v.optional(v.number()),
    notes: v.optional(v.string()), projectNumber: v.optional(v.string()), federalAid: v.optional(v.string()),
    dbeGoal: v.optional(v.number()), contractDays: v.optional(v.number()), liquidatedDamages: v.optional(v.number()),
    preBidMeeting: v.optional(v.string()), prevailingWage: v.optional(v.string()), bidBondRequired: v.optional(v.string()),
    bidMethod: v.optional(v.string()), buildingType: v.optional(v.string()), squareFootage: v.optional(v.number()),
    floors: v.optional(v.number()), architect: v.optional(v.string()), addendaCount: v.optional(v.number()), alternates: v.optional(v.string()), trusses: v.optional(v.number()), ends: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("estimates", args);
  },
});

export const updateEstimate = mutation({
  args: {
    id: v.id("estimates"), name: v.optional(v.string()), client: v.optional(v.string()), location: v.optional(v.string()),
    bidDate: v.optional(v.string()), status: v.optional(v.string()), bidType: v.optional(v.string()), description: v.optional(v.string()),
    overhead: v.optional(v.number()), profit: v.optional(v.number()), bond: v.optional(v.number()), tax: v.optional(v.number()),
    notes: v.optional(v.string()), projectNumber: v.optional(v.string()), federalAid: v.optional(v.string()),
    dbeGoal: v.optional(v.number()), contractDays: v.optional(v.number()), liquidatedDamages: v.optional(v.number()),
    preBidMeeting: v.optional(v.string()), prevailingWage: v.optional(v.string()), bidBondRequired: v.optional(v.string()),
    bidMethod: v.optional(v.string()), buildingType: v.optional(v.string()), squareFootage: v.optional(v.number()),
    floors: v.optional(v.number()), architect: v.optional(v.string()), addendaCount: v.optional(v.number()), alternates: v.optional(v.string()), trusses: v.optional(v.number()), ends: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleaned = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await ctx.db.patch(id, cleaned);
  },
});

export const deleteEstimate = mutation({
  args: { id: v.id("estimates") },
  handler: async (ctx, args) => {
    // Delete related items
    const items = await ctx.db.query("estimateItems").withIndex("by_estimate", q => q.eq("estimateId", args.id)).collect();
    for (const item of items) await ctx.db.delete(item._id);
    const rfqs = await ctx.db.query("estimateRfqs").withIndex("by_estimate", q => q.eq("estimateId", args.id)).collect();
    for (const rfq of rfqs) await ctx.db.delete(rfq._id);
    const engs = await ctx.db.query("engineerEstimates").withIndex("by_estimate", q => q.eq("estimateId", args.id)).collect();
    for (const eng of engs) await ctx.db.delete(eng._id);
    await ctx.db.delete(args.id);
  },
});

export const duplicateEstimate = mutation({
  args: { id: v.id("estimates") },
  handler: async (ctx, args) => {
    const orig = await ctx.db.get(args.id);
    if (!orig) throw new Error("Not found");
    const { _id, _creationTime, ...data } = orig;
    const newId = await ctx.db.insert("estimates", { ...data, name: data.name + " (Copy)", status: "draft", projectId: undefined });
    const items = await ctx.db.query("estimateItems").withIndex("by_estimate", q => q.eq("estimateId", args.id)).collect();
    for (const item of items) {
      const { _id: _, _creationTime: __, ...itemData } = item;
      await ctx.db.insert("estimateItems", { ...itemData, estimateId: newId });
    }
    return newId;
  },
});

// ===== ESTIMATE ITEMS =====
export const listEstimateItems = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estimateItems").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
  },
});

export const createEstimateItem = mutation({
  args: { companyId: v.id("companies"), estimateId: v.id("estimates"), section: v.optional(v.string()), description: v.string(), quantity: v.optional(v.number()), unit: v.optional(v.string()), unitCost: v.optional(v.number()), taxPct: v.optional(v.number()), costItemId: v.optional(v.id("costItems")), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("estimateItems", args);
  },
});

export const updateEstimateItem = mutation({
  args: { id: v.id("estimateItems"), section: v.optional(v.string()), description: v.optional(v.string()), quantity: v.optional(v.number()), unit: v.optional(v.string()), unitCost: v.optional(v.number()), taxPct: v.optional(v.number()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleaned = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await ctx.db.patch(id, cleaned);
  },
});

export const deleteEstimateItem = mutation({
  args: { id: v.id("estimateItems") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const bulkCreateEstimateItems = mutation({
  args: { items: v.array(v.object({ companyId: v.id("companies"), estimateId: v.id("estimates"), section: v.optional(v.string()), description: v.string(), quantity: v.optional(v.number()), unit: v.optional(v.string()), unitCost: v.optional(v.number()), taxPct: v.optional(v.number()), notes: v.optional(v.string()) })) },
  handler: async (ctx, args) => {
    const ids = [];
    for (const item of args.items) {
      ids.push(await ctx.db.insert("estimateItems", item));
    }
    return ids;
  },
});

// ===== CREWS & ASSEMBLIES =====
export const listCrews = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estimateCrews").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
  },
});

export const createCrew = mutation({
  args: { companyId: v.id("companies"), name: v.string(), description: v.optional(v.string()), items: v.optional(v.any()) },
  handler: async (ctx, args) => { return await ctx.db.insert("estimateCrews", args); },
});

export const updateCrew = mutation({
  args: { id: v.id("estimateCrews"), name: v.optional(v.string()), description: v.optional(v.string()), items: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const { id, ...u } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(u).filter(([_, v]) => v !== undefined)));
  },
});

export const deleteCrew = mutation({
  args: { id: v.id("estimateCrews") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const listAssemblies = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estimateAssemblies").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
  },
});

export const createAssembly = mutation({
  args: { companyId: v.id("companies"), name: v.string(), description: v.optional(v.string()), items: v.optional(v.any()) },
  handler: async (ctx, args) => { return await ctx.db.insert("estimateAssemblies", args); },
});

export const updateAssembly = mutation({
  args: { id: v.id("estimateAssemblies"), name: v.optional(v.string()), description: v.optional(v.string()), items: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const { id, ...u } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(u).filter(([_, v]) => v !== undefined)));
  },
});

export const deleteAssembly = mutation({
  args: { id: v.id("estimateAssemblies") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ===== RFQs =====
export const listRfqs = query({
  args: { companyId: v.id("companies"), estimateId: v.optional(v.id("estimates")) },
  handler: async (ctx, args) => {
    if (args.estimateId) {
      return await ctx.db.query("estimateRfqs").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId!)).collect();
    }
    return await ctx.db.query("estimateRfqs").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
  },
});

export const createRfq = mutation({
  args: { companyId: v.id("companies"), estimateId: v.id("estimates"), vendorName: v.string(), amount: v.optional(v.number()), status: v.optional(v.string()), dueDate: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => { return await ctx.db.insert("estimateRfqs", args); },
});

export const updateRfq = mutation({
  args: { id: v.id("estimateRfqs"), vendorName: v.optional(v.string()), amount: v.optional(v.number()), status: v.optional(v.string()), dueDate: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...u } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(u).filter(([_, v]) => v !== undefined)));
  },
});

export const deleteRfq = mutation({
  args: { id: v.id("estimateRfqs") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ===== ENGINEER ESTIMATES =====
export const listEngineerEstimates = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    return await ctx.db.query("engineerEstimates").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
  },
});

export const bulkCreateEngineerEstimates = mutation({
  args: { items: v.array(v.object({ companyId: v.id("companies"), estimateId: v.id("estimates"), itemCode: v.optional(v.string()), description: v.string(), quantity: v.optional(v.number()), unit: v.optional(v.string()), unitCost: v.optional(v.number()) })) },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.insert("engineerEstimates", item);
    }
  },
});

export const deleteEngineerEstimate = mutation({
  args: { id: v.id("engineerEstimates") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const clearEngineerEstimates = mutation({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("engineerEstimates").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
    for (const item of items) await ctx.db.delete(item._id);
  },
});

// ===== WIN BID → CREATE OPSSLATE PROJECT =====
export const convertToProject = mutation({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const est = await ctx.db.get(args.estimateId);
    if (!est) throw new Error("Estimate not found");
    if (est.projectId) return est.projectId; // Already linked

    // Create OpsSlate project from estimate data
    const projectId = await ctx.db.insert("projects", {
      companyId: est.companyId,
      name: est.name,
      location: est.location || "",
      status: "active",
      type: est.bidType === "building" ? "Commercial" : "Heavy Highway",
      contractor: est.client || "",
      contractDate: est.bidDate || "",
    });

    // Link estimate to project
    await ctx.db.patch(args.estimateId, { projectId, status: "won" });

    return projectId;
  },
});

// ===== CONTACTS / VENDORS / SUBS (shared with OpsSlate) =====
export const listContacts = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("contacts").collect();
  },
});

export const listVendors = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("vendors").collect();
    return all.filter(v => v.companyId === args.companyId);
  },
});

export const listSubcontractors = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("subcontractors").collect();
    return all.filter(s => s.companyId === args.companyId);
  },
});

export const createVendor = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    category: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("vendors", args);
  },
});

export const createSubcontractor = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    trade: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("subcontractors", args);
  },
});
