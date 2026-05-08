import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) {
      items = await ctx.db.query("punchList")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId as any))
        .order("desc")
        .collect();
    } else {
      items = await ctx.db.query("punchList")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .collect();
    }
    if (args.status) items = items.filter((i) => i.status === args.status);

    const projectMap = new Map<string, string>();
    for (const item of items) {
      if (!projectMap.has(item.projectId)) {
        const p = await ctx.db.get(item.projectId);
        if (p) projectMap.set(item.projectId, p.name);
      }
    }
    return items.map((i) => ({ ...i, projectName: projectMap.get(i.projectId) ?? "" }));
  },
});

export const getById = query({
  args: { id: v.id("punchList") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    trade: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedCompany: v.optional(v.string()),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auto-increment number per project
    const existing = await ctx.db.query("punchList")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const maxNum = existing.reduce((max, i) => Math.max(max, i.number ?? 0), 0);
    return ctx.db.insert("punchList", { ...args, number: maxNum + 1, status: "Open" });
  },
});

export const update = mutation({
  args: {
    id: v.id("punchList"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    trade: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedCompany: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const markComplete = mutation({
  args: { id: v.id("punchList") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "Complete",
      completedDate: new Date().toISOString().slice(0, 10),
    });
  },
});

export const reopen = mutation({
  args: { id: v.id("punchList") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "Open", completedDate: undefined });
  },
});

export const remove = mutation({
  args: { id: v.id("punchList") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const stats = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items;
    if (args.projectId) {
      items = await ctx.db.query("punchList")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId as any))
        .collect();
    } else {
      items = await ctx.db.query("punchList")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect();
    }
    const open = items.filter((i) => i.status === "Open").length;
    const inProgress = items.filter((i) => i.status === "In Progress").length;
    const complete = items.filter((i) => i.status === "Complete").length;
    const overdue = items.filter((i) => i.status !== "Complete" && i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10)).length;
    return { total: items.length, open, inProgress, complete, overdue };
  },
});
