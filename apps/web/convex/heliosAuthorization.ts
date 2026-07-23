import { v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";

const HELIOS_ALLOWED_ROLES = new Set(["owner", "admin", "estimator"]);

export const heliosPrincipalValidator = v.object({
  userId: v.string(),
  companyId: v.string(),
  subject: v.string(),
  issuer: v.string(),
});

export type HeliosPrincipalArgs = {
  userId: string;
  companyId: string;
  subject: string;
  issuer: string;
};

type AuthorizationContext = Pick<QueryCtx | MutationCtx, "db">;

export async function requireHeliosPrincipal(
  ctx: AuthorizationContext,
  principal: HeliosPrincipalArgs,
) {
  const userId = ctx.db.normalizeId("users", principal.userId);
  const companyId = ctx.db.normalizeId("companies", principal.companyId);
  if (!userId || !companyId) throw new Error("Unauthorized Helios principal.");

  const user = await ctx.db.get(userId);
  if (
    !user ||
    user.companyId !== companyId ||
    user.identityIssuer !== principal.issuer ||
    user.identitySubject !== principal.subject
  ) {
    throw new Error("Unauthorized Helios principal.");
  }

  const memberships = await ctx.db
    .query("teamMembers")
    .withIndex("by_user", (query) => query.eq("userId", user._id))
    .collect();
  const activeMembership = memberships.find(
    (membership) =>
      membership.companyId === user.companyId &&
      membership.status === "active",
  );
  if (memberships.length > 0 && !activeMembership) {
    throw new Error("Helios membership is inactive.");
  }

  const role = (activeMembership?.role || user.role || "member").toLowerCase();
  if (!HELIOS_ALLOWED_ROLES.has(role)) {
    throw new Error("Role is not authorized for Helios.");
  }

  return { user, companyId, role };
}
