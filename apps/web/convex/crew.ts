import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("crew") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const listByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("crew")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    // Join project names
    const projectIds = [...new Set(members.map((m) => m.projectId))];
    const projectMap = new Map<string, string>();
    for (const pid of projectIds) {
      const p = await ctx.db.get(pid);
      if (p) projectMap.set(pid, p.name);
    }
    return members.map((m) => ({
      ...m,
      projectName: projectMap.get(m.projectId) ?? "",
    }));
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    trade: v.optional(v.string()),
    task: v.optional(v.string()),
    phaseCode: v.optional(v.string()),
    email: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("crew", {
      ...args,
      status: "Active",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("crew"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    trade: v.optional(v.string()),
    task: v.optional(v.string()),
    phaseCode: v.optional(v.string()),
    email: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
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
  args: { id: v.id("crew") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
