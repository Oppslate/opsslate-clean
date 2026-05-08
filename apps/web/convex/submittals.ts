import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) { items = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId as any)).order("desc").collect(); }
    else { items = await ctx.db.query("submittals").filter((q) => q.eq(q.field("companyId"), args.companyId)).order("desc").collect(); }
    if (args.status) items = items.filter((i) => i.status === args.status);
    const pMap = new Map<string, string>();
    for (const i of items) { if (!pMap.has(i.projectId)) { const p = await ctx.db.get(i.projectId); if (p) pMap.set(i.projectId, p.name); } }
    return items.map((i) => ({ ...i, projectName: pMap.get(i.projectId) ?? "" }));
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"), projectId: v.id("projects"), title: v.string(),
    specSection: v.optional(v.string()), description: v.optional(v.string()),
    submittedBy: v.optional(v.string()), priority: v.optional(v.string()),
    reviewer: v.optional(v.string()), dueDate: v.optional(v.string()), trade: v.optional(v.string()), notes: v.optional(v.string()),
    itemNumber: v.optional(v.string()), sourceDocumentId: v.optional(v.id("documents")), sourceDocumentName: v.optional(v.string()), sourceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    return ctx.db.insert("submittals", { ...args, number: existing.length + 1, status: "Pending", submittedDate: new Date().toISOString().slice(0, 10) });
  },
});

export const review = mutation({
  args: { id: v.id("submittals"), reviewAction: v.string(), reviewComments: v.optional(v.string()), reviewer: v.string() },
  handler: async (ctx, args) => {
    const statusMap: Record<string, string> = { "Approved": "Approved", "Approved as Noted": "Approved as Noted", "Revise and Resubmit": "Revise & Resubmit", "Rejected": "Rejected" };
    await ctx.db.patch(args.id, { reviewAction: args.reviewAction, reviewComments: args.reviewComments, reviewer: args.reviewer, reviewDate: new Date().toISOString().slice(0, 10), adminDecisionBy: args.reviewer, adminDecisionDate: new Date().toISOString().slice(0, 10), status: statusMap[args.reviewAction] ?? args.reviewAction });
  },
});

export const update = mutation({
  args: {
    id: v.id("submittals"), title: v.optional(v.string()), specSection: v.optional(v.string()),
    description: v.optional(v.string()), priority: v.optional(v.string()), reviewer: v.optional(v.string()),
    dueDate: v.optional(v.string()), trade: v.optional(v.string()), status: v.optional(v.string()), notes: v.optional(v.string()),
    itemNumber: v.optional(v.string()), uploadDocumentId: v.optional(v.id("documents")), uploadDocumentName: v.optional(v.string()), uploadDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => { const { id, ...f } = args; await ctx.db.patch(id, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined))); },
});

export const createFromSpecScan = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    sourceDocumentId: v.id("documents"),
    sourceDocumentName: v.string(),
    items: v.array(v.object({
      itemNumber: v.optional(v.string()),
      title: v.string(),
      description: v.optional(v.string()),
      specSection: v.optional(v.string()),
      trade: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    let nextNumber = existing.length + 1;
    const ids = [];
    for (const item of args.items) {
      const id = await ctx.db.insert("submittals", {
        companyId: args.companyId,
        projectId: args.projectId,
        number: nextNumber++,
        title: item.title,
        itemNumber: item.itemNumber,
        description: item.description,
        specSection: item.specSection,
        trade: item.trade,
        status: "Pending",
        submittedDate: new Date().toISOString().slice(0, 10),
        sourceDocumentId: args.sourceDocumentId,
        sourceDocumentName: args.sourceDocumentName,
        sourceType: "spec-scan",
      });
      ids.push(id);
    }
    return ids;
  },
});

export const remove = mutation({ args: { id: v.id("submittals") }, handler: async (ctx, args) => { await ctx.db.delete(args.id); } });
