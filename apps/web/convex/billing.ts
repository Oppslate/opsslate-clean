import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get company billing info
export const getCompanyPlan = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const company = await ctx.db.get(companyId);
    if (!company) return null;
    return {
      plan: company.plan || "free",
      planStatus: company.planStatus || "active",
      stripeCustomerId: company.stripeCustomerId,
      stripeSubscriptionId: company.stripeSubscriptionId,
      planExpiresAt: company.planExpiresAt,
    };
  },
});

// Update subscription after Stripe webhook
export const updateSubscription = mutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.string(),
    planStatus: v.string(),
    planExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find company by stripe customer ID
    const company = await ctx.db
      .query("companies")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();

    if (company) {
      await ctx.db.patch(company._id, {
        plan: args.plan,
        planStatus: args.planStatus,
        stripeSubscriptionId: args.stripeSubscriptionId,
        planExpiresAt: args.planExpiresAt,
      });
      return company._id;
    }
    return null;
  },
});

// Set Stripe customer ID on company (called during first checkout)
export const setStripeCustomer = mutation({
  args: {
    companyId: v.id("companies"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, { companyId, stripeCustomerId }) => {
    await ctx.db.patch(companyId, { stripeCustomerId });
  },
});

// Cancel subscription (set to free)
export const cancelSubscription = mutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .first();

    if (company) {
      await ctx.db.patch(company._id, {
        plan: "free",
        planStatus: "canceled",
        stripeSubscriptionId: undefined,
      });
    }
  },
});

// Plan feature limits
export const PLAN_LIMITS = {
  free: {
    projects: 1,
    crewMembers: 3,
    storage: "100MB",
    aiQueries: 10,
    modules: [
      "dashboard", "calendar", "daily-logs", "crew", "time-tracking",
      "weather", "punch-list", "site-media", "settings", "help",
    ],
  },
  pro: {
    projects: 10,
    crewMembers: 25,
    storage: "10GB",
    aiQueries: 1000,
    modules: "all",
  },
  team: {
    projects: -1, // unlimited
    crewMembers: -1,
    storage: "50GB",
    aiQueries: -1,
    modules: "all",
  },
  suite_pro: {
    projects: -1,
    crewMembers: -1,
    storage: "50GB",
    aiQueries: -1,
    modules: "all",
  },
  suite_biz: {
    projects: -1,
    crewMembers: -1,
    storage: "100GB",
    aiQueries: -1,
    modules: "all",
  },
};

// Check if a module is available for a plan
export const checkModuleAccess = query({
  args: { companyId: v.id("companies"), module: v.string() },
  handler: async (ctx, { companyId, module }) => {
    const company = await ctx.db.get(companyId);
    const plan = (company?.plan || "free") as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    if (limits.modules === "all") return { allowed: true, plan };
    return {
      allowed: (limits.modules as string[]).includes(module),
      plan,
    };
  },
});
