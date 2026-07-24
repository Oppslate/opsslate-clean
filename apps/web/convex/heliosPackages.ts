import { normalizePackageInput } from "@opsslate/helios-domain";
import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

export const createPackage = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) throw new Error("Project not found.");
    const project = await ctx.db.get(projectId);
    if (!project || project.companyId !== companyId) {
      throw new Error("Project not found.");
    }
    if (project.status === "archived") {
      throw new Error("Archived projects cannot accept bid packages.");
    }

    const input = normalizePackageInput(args.input);
    const existingPackages = await ctx.db
      .query("heliosBidPackages")
      .withIndex("by_project_revision", (query) =>
        query.eq("projectId", project._id),
      )
      .order("desc")
      .take(20);
    const active = existingPackages.find((row) =>
      ["uploading", "ready_for_analysis", "processing"].includes(row.status),
    );
    if (active) {
      throw new Error(
        "Finish or resolve the current bid package before creating another.",
      );
    }

    const revision = (existingPackages[0]?.revision || 0) + 1;
    const now = Date.now();
    const pdfEntries = input.entries.filter((entry) => entry.accepted);
    const rejectedEntries = input.entries.filter((entry) => !entry.accepted);
    const packageId = await ctx.db.insert("heliosBidPackages", {
      companyId,
      projectId: project._id,
      createdBy: user._id,
      name: input.name,
      sourceType: input.sourceType,
      revision,
      status: "uploading",
      entryCount: input.entries.length,
      pdfCount: pdfEntries.length,
      rejectedCount: rejectedEntries.length,
      uploadedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      totalBytes: pdfEntries.reduce((sum, entry) => sum + entry.size, 0),
      createdAt: now,
      updatedAt: now,
    });

    const entries = [];
    for (const entry of input.entries) {
      const entryId = await ctx.db.insert("heliosPackageEntries", {
        companyId,
        projectId: project._id,
        packageId,
        relativePath: entry.relativePath,
        canonicalPath: entry.relativePath.toLowerCase(),
        size: entry.size,
        status: entry.accepted ? "pending" : "rejected",
        reason: entry.reason,
        createdAt: now,
        updatedAt: now,
      });
      entries.push({
        id: String(entryId),
        packageId: String(packageId),
        relativePath: entry.relativePath,
        size: entry.size,
        status: entry.accepted ? ("pending" as const) : ("rejected" as const),
        reason: entry.reason,
      });
    }

    await ctx.db.patch(project._id, {
      activePackageId: packageId,
      currentPackageRevision: revision,
      status: "intake",
      latestIntelligenceError: undefined,
      updatedAt: now,
    });

    return {
      id: String(packageId),
      projectId: String(project._id),
      name: input.name,
      sourceType: input.sourceType,
      revision,
      status: "uploading" as const,
      entryCount: input.entries.length,
      pdfCount: pdfEntries.length,
      rejectedCount: rejectedEntries.length,
      uploadedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      totalBytes: pdfEntries.reduce((sum, entry) => sum + entry.size, 0),
      createdAt: now,
      updatedAt: now,
      entries,
    };
  },
});
