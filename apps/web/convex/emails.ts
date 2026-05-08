import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("emails")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.string(),
    projectId: v.optional(v.string()),
    subject: v.string(),
    from: v.string(),
    to: v.optional(v.string()),
    cc: v.optional(v.string()),
    date: v.string(),
    body: v.optional(v.string()),
    bodyPreview: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    hasAttachments: v.optional(v.boolean()),
    attachmentNames: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    threadId: v.optional(v.string()),
    importance: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.string())),
    pipelineStatus: v.optional(v.string()),
    processedByPm: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    extractedContacts: v.optional(v.number()),
    extractedTasks: v.optional(v.number()),
    extractedDates: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("emails", {
      ...args,
      bodyPreview: args.bodyPreview ?? args.body?.slice(0, 100),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("emails"),
    projectId: v.optional(v.string()),
    subject: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    cc: v.optional(v.string()),
    date: v.optional(v.string()),
    body: v.optional(v.string()),
    bodyPreview: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    hasAttachments: v.optional(v.boolean()),
    attachmentNames: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    threadId: v.optional(v.string()),
    importance: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.string())),
    aiTone: v.optional(v.string()),
    aiRiskFlags: v.optional(v.array(v.string())),
    aiActionItems: v.optional(v.array(v.string())),
    aiSummary: v.optional(v.string()),
    pipelineStatus: v.optional(v.string()),
    processedByPm: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    extractedContacts: v.optional(v.number()),
    extractedTasks: v.optional(v.number()),
    extractedDates: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    if (!clean.bodyPreview && clean.body && typeof clean.body === "string") {
      clean.bodyPreview = clean.body.slice(0, 100);
    }
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const addAttachment = mutation({
  args: {
    emailId: v.id("emails"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    // Add storageId to email attachments
    const existing = email.attachmentStorageIds || [];
    const existingNames = email.attachmentNames || [];
    await ctx.db.patch(args.emailId, {
      attachmentStorageIds: [...existing, args.storageId],
      attachmentNames: [...existingNames, args.fileName],
      hasAttachments: true,
    });

    // If it's a photo and email is linked to a project, auto-save to Site Media
    const isPhoto = args.fileType.startsWith("image/");
    if (isPhoto && email.projectId) {
      const url = await ctx.storage.getUrl(args.storageId as any);
      if (url) {
        await ctx.db.insert("siteMedia", {
          companyId: email.companyId as any,
          projectId: email.projectId as any,
          type: "photo",
          fileName: args.fileName,
          url,
          title: `Email: ${email.subject}`,
          description: `From correspondence — ${email.from} (${email.date})`,
          category: "Email Attachments",
          tags: ["email", "attachment"],
          capturedDate: email.date,
          capturedBy: email.from,
          status: "active",
          uploadedBy: "system",
        });
      }
    }

    return { ok: true, savedToSiteMedia: isPhoto && !!email.projectId };
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getAttachmentUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const urls: Record<string, string | null> = {};
    for (const id of args.storageIds) {
      urls[id] = await ctx.storage.getUrl(id as any);
    }
    return urls;
  },
});

export const importBatch = mutation({
  args: {
    companyId: v.string(),
    emails: v.array(v.object({
      projectId: v.optional(v.string()),
      subject: v.string(),
      from: v.string(),
      to: v.optional(v.string()),
      cc: v.optional(v.string()),
      date: v.string(),
      body: v.optional(v.string()),
      bodyPreview: v.optional(v.string()),
      category: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      hasAttachments: v.optional(v.boolean()),
      attachmentNames: v.optional(v.array(v.string())),
      source: v.optional(v.string()),
      threadId: v.optional(v.string()),
      importance: v.optional(v.string()),
      isRead: v.optional(v.boolean()),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const email of args.emails) {
      const id = await ctx.db.insert("emails", {
        ...email,
        companyId: args.companyId,
        bodyPreview: email.bodyPreview ?? email.body?.slice(0, 100),
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});
