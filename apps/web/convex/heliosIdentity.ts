import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

const HELIOS_ALLOWED_ROLES = new Set(["owner", "admin", "estimator"]);

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

export const resolveExistingUser = internalMutation({
  args: {
    issuer: v.string(),
    subject: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizedEmail(args.email);
    const issuer = args.issuer.trim();
    const subject = args.subject.trim();

    if (!issuer || !subject || !email) {
      throw new Error("Verified identity is incomplete.");
    }

    const linkedUser = await ctx.db
      .query("users")
      .withIndex("by_identity", (query) =>
        query.eq("identityIssuer", issuer).eq("identitySubject", subject),
      )
      .unique();

    const emailUser = await ctx.db
      .query("users")
      .withIndex("by_email", (query) => query.eq("email", email))
      .unique();

    if (linkedUser && emailUser && linkedUser._id !== emailUser._id) {
      throw new Error("Identity is linked to a different OpsSlate account.");
    }

    const user = linkedUser ?? emailUser;
    if (!user) {
      throw new Error("No existing OpsSlate account matches this identity.");
    }

    if (
      (user.identityIssuer && user.identityIssuer !== issuer) ||
      (user.identitySubject && user.identitySubject !== subject)
    ) {
      throw new Error("OpsSlate account is linked to a different identity.");
    }

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();
    const teamMember = memberships.find(
      (membership) =>
        membership.companyId === user.companyId &&
        membership.status === "active",
    );

    if (memberships.length > 0 && !teamMember) {
      throw new Error("OpsSlate team membership is not active.");
    }

    const role = (teamMember?.role || user.role || "member").toLowerCase();
    if (!HELIOS_ALLOWED_ROLES.has(role)) {
      throw new Error("OpsSlate role is not authorized for Helios.");
    }

    const company = await ctx.db.get(user.companyId);
    if (!company) throw new Error("OpsSlate company no longer exists.");

    if (!user.identityIssuer || !user.identitySubject) {
      await ctx.db.patch(user._id, {
        identityIssuer: issuer,
        identitySubject: subject,
        identityLinkedAt: Date.now(),
      });
    }

    return {
      userId: user._id,
      companyId: user.companyId,
      subject,
      issuer,
      email: user.email,
      name: user.name || args.name,
      role,
    };
  },
});
