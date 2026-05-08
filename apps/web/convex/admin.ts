import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function requireAdmin(adminToken: string) {
  const expected = process.env.OPSSLATE_ADMIN_TOKEN;
  if (!expected || adminToken !== expected) {
    throw new Error("Unauthorized");
  }
}

export const listUsers = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      companyId: u.companyId,
      role: u.role,
    }));
  },
});

export const listCompanies = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    return await ctx.db.query("companies").collect();
  },
});

export const setPlan = mutation({
  args: {
    adminToken: v.string(),
    companyId: v.id("companies"),
    plan: v.string(),
    planStatus: v.string(),
  },
  handler: async (ctx, { adminToken, companyId, plan, planStatus }) => {
    requireAdmin(adminToken);
    await ctx.db.patch(companyId, { plan, planStatus });
    return { success: true };
  },
});

export const renameCompany = mutation({
  args: { adminToken: v.string(), companyId: v.id("companies"), name: v.string() },
  handler: async (ctx, { adminToken, companyId, name }) => {
    requireAdmin(adminToken);
    await ctx.db.patch(companyId, { name });
    return { success: true };
  },
});

export const deleteUser = mutation({
  args: { adminToken: v.string(), userId: v.id("users") },
  handler: async (ctx, { adminToken, userId }) => {
    requireAdmin(adminToken);
    await ctx.db.delete(userId);
    return { success: true };
  },
});

export const deleteCompany = mutation({
  args: { adminToken: v.string(), companyId: v.id("companies") },
  handler: async (ctx, { adminToken, companyId }) => {
    requireAdmin(adminToken);
    await ctx.db.delete(companyId);
    return { success: true };
  },
});
