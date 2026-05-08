import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple hash for demo — replace with bcrypt action for production
function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return "h_" + Math.abs(h).toString(36);
}

function genToken(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const signup = mutation({
  args: {
    companyName: v.string(),
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) throw new Error("Email already registered");

    const companyId = await ctx.db.insert("companies", {
      name: args.companyName,
      plan: "free",
    });

    const token = genToken();
    await ctx.db.insert("users", {
      companyId,
      email: args.email,
      name: args.name,
      role: "admin",
      passwordHash: simpleHash(args.password),
      sessionToken: token,
    });

    return { token, companyId };
  },
});

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user || user.passwordHash !== simpleHash(args.password)) {
      throw new Error("Invalid email or password");
    }
    const token = genToken();
    await ctx.db.patch(user._id, { sessionToken: token });
    return { token, companyId: user.companyId, name: user.name, role: user.role };
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_session", (q) => q.eq("sessionToken", args.token))
      .first();
    if (!user) return null;
    // Check for team membership to get proper role/permissions
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return {
      _id: user._id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      role: teamMember?.role || user.role || "admin",
      teamMemberId: teamMember?._id,
      assignedProjects: teamMember?.assignedProjects,
      teamStatus: teamMember?.status,
    };
  },
});

// Auto-provision a user from the shared auth service
export const provisionFromSharedAuth = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      // User exists — just generate new session token
      const token = genToken();
      await ctx.db.patch(existing._id, { sessionToken: token });
      return { token, companyId: existing.companyId };
    }

    // Create new company + user
    const companyId = await ctx.db.insert("companies", {
      name: args.companyName,
      plan: "free",
    });

    const token = genToken();
    await ctx.db.insert("users", {
      companyId,
      email: args.email,
      name: args.name,
      role: "admin",
      passwordHash: "shared_auth",
      sessionToken: token,
    });

    return { token, companyId };
  },
});

export const lookupByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const matches = users.filter(u => 
      u.name.toLowerCase().includes(args.name.toLowerCase()) ||
      u.email.toLowerCase().includes(args.name.toLowerCase())
    );
    return matches.map(u => ({ email: u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), name: u.name }));
  },
});

// Generate a password reset token (valid 1 hour)
export const generateResetToken = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    if (!user) return { ok: true }; // Don't reveal if email exists
    const token = genToken() + genToken();
    await ctx.db.patch(user._id, {
      resetToken: token,
      resetTokenExpiry: Date.now() + 3600000, // 1 hour
    });
    return { ok: true, token, name: user.name };
  },
});

// Verify a reset token is valid
export const verifyResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => (u as any).resetToken === args.token);
    if (!user) return null;
    if ((user as any).resetTokenExpiry && (user as any).resetTokenExpiry < Date.now()) return null;
    return { email: user.email, name: user.name };
  },
});

// Reset password with token
export const resetPasswordWithToken = mutation({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => (u as any).resetToken === args.token);
    if (!user) throw new Error("Invalid or expired reset link");
    if ((user as any).resetTokenExpiry && (user as any).resetTokenExpiry < Date.now()) {
      throw new Error("Reset link has expired. Please request a new one.");
    }
    await ctx.db.patch(user._id, {
      passwordHash: simpleHash(args.newPassword),
      resetToken: undefined,
      resetTokenExpiry: undefined,
      mustChangePassword: undefined,
    });
    return { ok: true };
  },
});

// Reset password directly (for admin/setup)
export const resetPassword = mutation({
  args: { email: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      passwordHash: simpleHash(args.newPassword),
      mustChangePassword: undefined,
    });
    const token = genToken();
    await ctx.db.patch(user._id, { sessionToken: token });
    return { ok: true, token, companyId: user.companyId };
  },
});

// Lookup account by name (forgot login)
export const lookupAccount = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const q = args.name.toLowerCase();
    return users
      .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .map((u) => ({
        email: u.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
        name: u.name,
      }));
  },
});

export const fixUserCompany = mutation({
  args: { email: v.string(), companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", args.email)).first();
    if (!user) return { error: "User not found" };
    const oldCompany = user.companyId;
    await ctx.db.patch(user._id, { companyId: args.companyId });
    return { success: true, userId: user._id, oldCompany, newCompany: args.companyId };
  },
});
