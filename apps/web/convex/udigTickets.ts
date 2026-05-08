import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.string(), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.projectId) {
      return ctx.db.query("udigTickets")
        .withIndex("by_project", (q) => q.eq("companyId", args.companyId).eq("projectId", args.projectId))
        .collect();
    }
    return ctx.db.query("udigTickets")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.string(),
    projectId: v.optional(v.string()),
    dateCalled: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    ticketNumber: v.string(),
    emailCopy: v.optional(v.string()),
    completionDate: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("udigTickets", {
      ...args,
      status: args.status || "Open",
      createdAt: new Date().toISOString(),
    });

    // Auto-add to project communications if project selected
    if (args.projectId) {
      const emailBody = [
        `U-Dig Utility Locate Ticket`,
        ``,
        `Ticket #: ${args.ticketNumber}`,
        `Date Called: ${args.dateCalled}`,
        `Address: ${args.address}`,
        `City: ${args.city}`,
        `State: ${args.state}`,
        args.completionDate ? `Completion Date: ${args.completionDate}` : "",
        `Status: ${args.status || "Open"}`,
        args.notes ? `\nNotes: ${args.notes}` : "",
        args.emailCopy ? `\n--- Email Copy ---\n${args.emailCopy}` : "",
      ].filter(Boolean).join("\n");

      await ctx.db.insert("emails", {
        companyId: args.companyId,
        projectId: args.projectId,
        subject: `U-Dig Ticket #${args.ticketNumber} — ${args.address}, ${args.city}, ${args.state}`,
        from: "U-Dig",
        date: args.dateCalled,
        body: emailBody,
        bodyPreview: emailBody.slice(0, 100),
        category: "incoming",
        source: "U-Dig",
        importance: "normal",
        isRead: true as boolean,
        createdAt: Date.now(),
      });
    }

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("udigTickets"),
    projectId: v.optional(v.string()),
    dateCalled: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    ticketNumber: v.optional(v.string()),
    emailCopy: v.optional(v.string()),
    completionDate: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
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
  args: { id: v.id("udigTickets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
