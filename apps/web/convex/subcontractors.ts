import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => ctx.db.query("subcontractors").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(),
});

export const getById = query({
  args: { id: v.id("subcontractors") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    companyId: v.id("companies"), name: v.string(), trade: v.optional(v.string()),
    contactName: v.optional(v.string()), phone: v.optional(v.string()), email: v.optional(v.string()),
    address: v.optional(v.string()), license: v.optional(v.string()), licenseExpiry: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()), insuranceProvider: v.optional(v.string()),
    rating: v.optional(v.number()), notes: v.optional(v.string()),
    status: v.optional(v.string()), projectIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => ctx.db.insert("subcontractors", { ...args, status: args.status || "Active" }),
});

export const update = mutation({
  args: {
    id: v.id("subcontractors"), name: v.optional(v.string()), trade: v.optional(v.string()),
    contactName: v.optional(v.string()), phone: v.optional(v.string()), email: v.optional(v.string()),
    address: v.optional(v.string()), license: v.optional(v.string()), licenseExpiry: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()), insuranceProvider: v.optional(v.string()),
    rating: v.optional(v.number()), status: v.optional(v.string()), notes: v.optional(v.string()),
    projectIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)));
  },
});

export const remove = mutation({
  args: { id: v.id("subcontractors") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});
