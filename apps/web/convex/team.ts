import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── List all team members ──
export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db.query("teamMembers")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

// ── Get current user's team member record ──
export const getMyMembership = query({
  args: { companyId: v.id("companies"), email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db.query("teamMembers")
      .withIndex("by_email", (q) => q.eq("companyId", args.companyId).eq("email", args.email))
      .first();
  },
});

// Simple hash (matches auth.ts)
function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return "h_" + Math.abs(h).toString(36);
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

// ── Invite a team member (auto-creates user account) ──
export const invite = mutation({
  args: {
    companyId: v.id("companies"),
    email: v.string(),
    name: v.string(),
    role: v.string(),
    assignedProjects: v.optional(v.array(v.string())),
    invitedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // Check if team member already exists
    const existing = await ctx.db.query("teamMembers")
      .withIndex("by_email", (q) => q.eq("companyId", args.companyId).eq("email", emailLower))
      .first();
    if (existing) throw new Error("Team member with this email already exists");

    // Generate temp password
    const tempPassword = generateTempPassword();

    // Check if user account already exists
    let userId;
    const existingUser = await ctx.db.query("users")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    if (existingUser) {
      // User exists — update their companyId to this company so they see the right data
      await ctx.db.patch(existingUser._id, { companyId: args.companyId });
      userId = existingUser._id;
    } else {
      // Create new user account — must set password on first login
      const resetToken = Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
      userId = await ctx.db.insert("users", {
        companyId: args.companyId,
        email: emailLower,
        name: args.name,
        role: args.role,
        passwordHash: simpleHash(tempPassword),
        mustChangePassword: true,
        resetToken,
        resetTokenExpiry: Date.now() + 7 * 24 * 3600000, // 7 days to set up
      });
    }

    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);

    const memberId = await ctx.db.insert("teamMembers", {
      companyId: args.companyId,
      email: emailLower,
      name: args.name,
      role: args.role,
      userId,
      status: "active",
      assignedProjects: args.assignedProjects || [],
      inviteToken: token,
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
    });

    // Return setup info for the email
    const userDoc = userId ? await ctx.db.get(userId) : null;
    return {
      memberId,
      tempPassword,
      isExistingUser: !!existingUser,
      setupToken: (userDoc as any)?.resetToken,
    };
  },
});

// ── Update team member ──
export const update = mutation({
  args: {
    id: v.id("teamMembers"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    status: v.optional(v.string()),
    assignedProjects: v.optional(v.array(v.string())),
    permissions: v.optional(v.object({
      budget: v.optional(v.string()),
      bidTracker: v.optional(v.string()),
      crew: v.optional(v.string()),
      dailyLogs: v.optional(v.string()),
      timeTracking: v.optional(v.string()),
      punchList: v.optional(v.string()),
      safety: v.optional(v.string()),
      siteMedia: v.optional(v.string()),
      changeOrders: v.optional(v.string()),
      rfis: v.optional(v.string()),
      submittals: v.optional(v.string()),
      correspondence: v.optional(v.string()),
      documents: v.optional(v.string()),
      aiTools: v.optional(v.string()),
      reports: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

// ── Remove team member ──
export const remove = mutation({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Accept invite (link user account to team member) ──
export const acceptInvite = mutation({
  args: { inviteToken: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const member = await ctx.db.query("teamMembers")
      .withIndex("by_invite", (q) => q.eq("inviteToken", args.inviteToken))
      .first();
    if (!member) throw new Error("Invalid invite token");
    if (member.status !== "invited") throw new Error("Invite already used");

    await ctx.db.patch(member._id, {
      userId: args.userId,
      status: "active",
      inviteToken: undefined,
      lastActiveAt: Date.now(),
    });

    // Update user role
    await ctx.db.patch(args.userId, { role: member.role });

    return member;
  },
});

// ── Ensure owner exists (auto-create for existing users) ──
export const ensureOwner = mutation({
  args: { companyId: v.id("companies"), userId: v.id("users"), email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("teamMembers")
      .withIndex("by_email", (q) => q.eq("companyId", args.companyId).eq("email", args.email.toLowerCase()))
      .first();
    if (existing) return existing._id;

    return ctx.db.insert("teamMembers", {
      companyId: args.companyId,
      userId: args.userId,
      email: args.email.toLowerCase(),
      name: args.name,
      role: "owner",
      status: "active",
      assignedProjects: [],
      lastActiveAt: Date.now(),
    });
  },
});

// ── Activity log ──
export const logActivity = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    action: v.string(),
    module: v.string(),
    projectId: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("activityLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const getActivityLog = query({
  args: { companyId: v.id("companies"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db.query("activityLog")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(args.limit || 50);
  },
});
