import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) return null;
    // Resolve logo URL if stored
    let resolvedLogoUrl = (company as any).logoUrl || null;
    if ((company as any).logoStorageId) {
      try {
        const url = await ctx.storage.getUrl((company as any).logoStorageId as any);
        if (url) resolvedLogoUrl = url;
      } catch {}
    }
    return { ...company, resolvedLogoUrl };
  },
});

export const update = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    tagline: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    logoStorageId: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, ...fields } = args;
    const clean: Record<string, any> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) clean[k] = val;
    }
    await ctx.db.patch(companyId, clean);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
