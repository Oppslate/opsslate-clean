"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

// Auto-scan a single document when uploaded — called from frontend after upload
export const scanDocument = action({
  args: { documentId: v.id("documents"), companyId: v.id("companies"), projectId: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    // Get the document
    const docs = await ctx.runQuery(a.docManager.list, { companyId: args.companyId, projectId: args.projectId });
    const doc = (docs || []).find((d: any) => d._id === args.documentId) as any;
    if (!doc) return { scanned: false, reason: "Document not found" };

    // Skip if already scanned
    if (doc.aiExtract && doc.aiStatus === "complete") return { scanned: false, reason: "Already scanned" };

    const storageId = doc.storageId || doc.url;
    if (!storageId) return { scanned: false, reason: "No storage ID" };

    try {
      // Read the document
      const result = await ctx.runAction(a.aiPmDocReader.readDocument, { storageId, fileName: doc.name || "unknown" });
      const content = (result as any)?.content || "";

      if (content && content.length > 50 && !content.toLowerCase().includes("unsupported") && !content.toLowerCase().includes("could not extract")) {
        // Save the extracted text
        await ctx.runMutation(a.docManager.updateAiExtract, {
          id: args.documentId,
          aiExtract: content.slice(0, 50000),
          aiStatus: "complete",
        });
        return { scanned: true, chars: content.length };
      } else {
        // Failed to read — create critical task
        await ctx.runMutation(a.docManager.updateAiExtract, {
          id: args.documentId,
          aiExtract: "⚠️ Unable to read this document",
          aiStatus: "failed",
        });

        // Create critical task on the project
        try {
          await ctx.runMutation(a.tasks.create, {
            projectId: args.projectId as any,
            task: "Other",
            customTask: `⚠️ UNREADABLE DOCUMENT: ${doc.name}`,
            status: "Open",
            priority: "Critical",
            impact: "Auto-scan failed — document may be corrupted, password-protected, or unsupported format. Re-upload as PDF or image.",
            dateScheduled: new Date().toISOString().slice(0, 10),
          });
        } catch {}

        // Also create PM task if PM exists
        try {
          const pm = await ctx.runQuery(a.aiPm.getByProject, { projectId: args.projectId as any });
          if (pm) {
            await ctx.runMutation(a.aiPm.createTask, {
              pmId: pm._id,
              projectId: args.projectId as any,
              companyId: args.companyId,
              description: `⚠️ CRITICAL: Cannot read "${doc.name}" — needs manual review`,
              type: "general",
            });
          }
        } catch {}

        return { scanned: false, reason: "Could not extract content" };
      }
    } catch (err) {
      // Complete failure
      await ctx.runMutation(a.docManager.updateAiExtract, {
        id: args.documentId,
        aiExtract: `⚠️ Scan error: ${(err as Error).message?.slice(0, 200) || "Unknown"}`,
        aiStatus: "failed",
      });

      try {
        await ctx.runMutation(a.tasks.create, {
          projectId: args.projectId as any,
          task: "Other",
          customTask: `⚠️ UNREADABLE DOCUMENT: ${doc.name}`,
          status: "Open",
          priority: "Critical",
          impact: `Auto-scan error: ${(err as Error).message?.slice(0, 100) || "Unknown error"}`,
          dateScheduled: new Date().toISOString().slice(0, 10),
        });
      } catch {}

      return { scanned: false, reason: (err as Error).message };
    }
  },
});

// Scan all unscanned documents for a project
export const scanAllForProject = action({
  args: { companyId: v.id("companies"), projectId: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    const docs = await ctx.runQuery(a.docManager.list, { companyId: args.companyId, projectId: args.projectId });
    const unscanned = (docs || []).filter((d: any) => !d.aiExtract || d.aiStatus !== "complete");

    let scanned = 0;
    let failed = 0;
    for (const doc of unscanned.slice(0, 10)) { // Limit to 10 at a time
      try {
        const result = await ctx.runAction(a.autoDocScan.scanDocument, {
          documentId: (doc as any)._id,
          companyId: args.companyId,
          projectId: args.projectId,
        });
        if ((result as any).scanned) scanned++;
        else failed++;
      } catch { failed++; }
    }

    return { total: unscanned.length, scanned, failed };
  },
});
