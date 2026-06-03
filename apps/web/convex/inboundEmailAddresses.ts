import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_INBOUND_DOMAIN = "inbound.opsslate.app";

function cleanLocalPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9._+-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildFullAddress(localPart: string, domain = DEFAULT_INBOUND_DOMAIN) {
  return `${cleanLocalPart(localPart)}@${domain.toLowerCase().trim()}`;
}

export const list = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("inboundEmailAddresses")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.string(),
    localPart: v.string(),
    label: v.optional(v.string()),
    routeType: v.string(),
    projectId: v.optional(v.string()),
    projectName: v.optional(v.string()),
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const domain = args.domain || DEFAULT_INBOUND_DOMAIN;
    const fullAddress = buildFullAddress(args.localPart, domain);
    const existing = await ctx.db
      .query("inboundEmailAddresses")
      .withIndex("by_full_address", (q) => q.eq("fullAddress", fullAddress))
      .first();
    if (existing) throw new Error("That forwarding address already exists.");
    const now = Date.now();
    return ctx.db.insert("inboundEmailAddresses", {
      companyId: args.companyId,
      localPart: cleanLocalPart(args.localPart),
      domain,
      fullAddress,
      label: args.label,
      routeType: args.routeType,
      projectId: args.projectId,
      projectName: args.projectName,
      status: "active",
      provider: "Resend Inbound",
      gmailVerificationStatus: "not_started",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("inboundEmailAddresses"),
    label: v.optional(v.string()),
    routeType: v.optional(v.string()),
    projectId: v.optional(v.string()),
    projectName: v.optional(v.string()),
    status: v.optional(v.string()),
    gmailVerificationStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
      updatedAt: Date.now(),
    });
  },
});

export const markGmailVerification = mutation({
  args: {
    fullAddress: v.string(),
    gmailVerificationCode: v.optional(v.string()),
    gmailVerificationSubject: v.optional(v.string()),
    lastSender: v.optional(v.string()),
    lastSubject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fullAddress = args.fullAddress.toLowerCase().trim();
    const address = await ctx.db
      .query("inboundEmailAddresses")
      .withIndex("by_full_address", (q) => q.eq("fullAddress", fullAddress))
      .first();
    if (!address) return null;
    await ctx.db.patch(address._id, {
      gmailVerificationStatus: args.gmailVerificationCode ? "code_received" : "email_received",
      gmailVerificationCode: args.gmailVerificationCode,
      gmailVerificationSubject: args.gmailVerificationSubject,
      gmailVerificationReceivedAt: Date.now(),
      lastReceivedAt: Date.now(),
      lastSender: args.lastSender,
      lastSubject: args.lastSubject,
      updatedAt: Date.now(),
    });
    return address._id;
  },
});

export const touchReceived = mutation({
  args: {
    fullAddress: v.string(),
    lastSender: v.optional(v.string()),
    lastSubject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const address = await ctx.db
      .query("inboundEmailAddresses")
      .withIndex("by_full_address", (q) => q.eq("fullAddress", args.fullAddress.toLowerCase().trim()))
      .first();
    if (!address) return null;
    await ctx.db.patch(address._id, {
      lastReceivedAt: Date.now(),
      lastSender: args.lastSender,
      lastSubject: args.lastSubject,
      updatedAt: Date.now(),
    });
    return address._id;
  },
});

export const remove = mutation({
  args: { id: v.id("inboundEmailAddresses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const resolveRecipient = query({
  args: { addresses: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const raw of args.addresses) {
      const fullAddress = raw.toLowerCase().trim();
      const address = await ctx.db
        .query("inboundEmailAddresses")
        .withIndex("by_full_address", (q) => q.eq("fullAddress", fullAddress))
        .first();
      if (address && address.status !== "paused") {
        return {
          companyId: address.companyId,
          projectId: address.routeType === "project" ? address.projectId : undefined,
          routeType: address.routeType,
          fullAddress: address.fullAddress,
          label: address.label,
        };
      }
    }
    return null;
  },
});
