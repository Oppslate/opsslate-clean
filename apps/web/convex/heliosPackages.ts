import {
  HELIOS_MAX_PACKAGE_BYTES,
  HELIOS_MAX_PACKAGE_ENTRIES,
  HELIOS_MAX_UPLOAD_BATCH,
  normalizePackageInput,
} from "@opsslate/helios-domain";
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

export const appendPackageEntries = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    packageId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const packageId = ctx.db.normalizeId("heliosBidPackages", args.packageId);
    if (!projectId || !packageId) throw new Error("Bid package not found.");
    const [project, bidPackage] = await Promise.all([
      ctx.db.get(projectId),
      ctx.db.get(packageId),
    ]);
    if (
      !project ||
      !bidPackage ||
      project.companyId !== companyId ||
      bidPackage.companyId !== companyId ||
      bidPackage.projectId !== project._id ||
      project.activePackageId !== bidPackage._id
    ) {
      throw new Error("Bid package not found.");
    }
    if (project.status === "archived" || bidPackage.status !== "uploading") {
      throw new Error("Only the current unfinalized package can accept files.");
    }

    const input = normalizePackageInput(args.input);
    const existingEntries = await ctx.db
      .query("heliosPackageEntries")
      .withIndex("by_package", (query) => query.eq("packageId", bidPackage._id))
      .collect();
    const existingByPath = new Map(
      existingEntries.map((entry) => [entry.canonicalPath, entry]),
    );
    const additions = input.entries.filter((entry) => {
      const existing = existingByPath.get(entry.relativePath.toLowerCase());
      if (!existing) return true;
      if (existing.size !== entry.size) {
        throw new Error(
          `A different file already uses this package path: ${entry.relativePath}`,
        );
      }
      return false;
    });
    const acceptedAdditions = additions.filter((entry) => entry.accepted);
    const rejectedAdditions = additions.filter((entry) => !entry.accepted);
    const nextEntryCount = bidPackage.entryCount + additions.length;
    const nextPdfCount = bidPackage.pdfCount + acceptedAdditions.length;
    const nextTotalBytes =
      bidPackage.totalBytes +
      acceptedAdditions.reduce((sum, entry) => sum + entry.size, 0);
    if (nextEntryCount > HELIOS_MAX_PACKAGE_ENTRIES) {
      throw new Error(
        `A package can contain up to ${HELIOS_MAX_PACKAGE_ENTRIES} entries.`,
      );
    }
    if (nextPdfCount > HELIOS_MAX_UPLOAD_BATCH) {
      throw new Error(
        `A package can contain up to ${HELIOS_MAX_UPLOAD_BATCH} valid PDFs.`,
      );
    }
    if (nextTotalBytes > HELIOS_MAX_PACKAGE_BYTES) {
      throw new Error("The combined PDF package is too large.");
    }

    const now = Date.now();
    const insertedEntries = [];
    for (const entry of additions) {
      const entryId = await ctx.db.insert("heliosPackageEntries", {
        companyId,
        projectId: project._id,
        packageId: bidPackage._id,
        relativePath: entry.relativePath,
        canonicalPath: entry.relativePath.toLowerCase(),
        size: entry.size,
        status: entry.accepted ? "pending" : "rejected",
        reason: entry.reason,
        createdAt: now,
        updatedAt: now,
      });
      insertedEntries.push({
        id: String(entryId),
        packageId: String(bidPackage._id),
        relativePath: entry.relativePath,
        size: entry.size,
        status: entry.accepted ? ("pending" as const) : ("rejected" as const),
        reason: entry.reason,
      });
    }

    if (additions.length) {
      await ctx.db.patch(bidPackage._id, {
        entryCount: nextEntryCount,
        pdfCount: nextPdfCount,
        rejectedCount: bidPackage.rejectedCount + rejectedAdditions.length,
        totalBytes: nextTotalBytes,
        updatedAt: now,
      });
    }
    return {
      id: String(bidPackage._id),
      projectId: String(project._id),
      name: bidPackage.name,
      sourceType: bidPackage.sourceType,
      revision: bidPackage.revision,
      status: "uploading" as const,
      entryCount: nextEntryCount,
      pdfCount: nextPdfCount,
      rejectedCount: bidPackage.rejectedCount + rejectedAdditions.length,
      uploadedCount: bidPackage.uploadedCount,
      duplicateCount: bidPackage.duplicateCount,
      failedCount: bidPackage.failedCount,
      totalBytes: nextTotalBytes,
      lastError: bidPackage.lastError,
      createdAt: bidPackage.createdAt,
      updatedAt: additions.length ? now : bidPackage.updatedAt,
      entries: [
        ...existingEntries.map((entry) => ({
          id: String(entry._id),
          packageId: String(entry.packageId),
          relativePath: entry.relativePath,
          size: entry.size,
          status: entry.status,
          reason: entry.reason,
          documentId: entry.documentId ? String(entry.documentId) : undefined,
        })),
        ...insertedEntries,
      ],
    };
  },
});
