import {
  HELIOS_MAX_PACKAGE_BYTES,
  HELIOS_MAX_PACKAGE_ENTRIES,
  HELIOS_MAX_UPLOAD_BATCH,
  normalizePackageInput,
  type HeliosPackageInput,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

function manifestFingerprint(input: HeliosPackageInput) {
  const source = JSON.stringify({
    adapter: input.adapter,
    manifestVersion: input.manifestVersion,
    sourceType: input.sourceType,
    revisionKind: input.revisionKind,
    revisionLabel: input.revisionLabel || "",
    entries: input.entries.map((entry) => ({
      kind: entry.kind,
      sourceCategory: entry.sourceCategory,
      relativePath: entry.relativePath.toLowerCase(),
      size: entry.size,
      sha256: entry.sha256 || "",
      accepted: entry.accepted,
      reason: entry.reason || "",
    })),
  });
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193) >>> 0;
    right = Math.imul(right ^ code, 0x85ebca6b) >>> 0;
  }
  return `${left.toString(16).padStart(8, "0")}${right
    .toString(16)
    .padStart(8, "0")}`;
}

async function packageSummary(
  ctx: MutationCtx,
  project: Doc<"heliosProjects">,
  bidPackage: Doc<"heliosBidPackages">,
) {
  const [entries, envelopes] = await Promise.all([
    ctx.db
      .query("heliosPackageEntries")
      .withIndex("by_package", (query) =>
        query.eq("packageId", bidPackage._id),
      )
      .collect(),
    ctx.db
      .query("heliosPackageEnvelopes")
      .withIndex("by_package", (query) =>
        query.eq("packageId", bidPackage._id),
      )
      .collect(),
  ]);
  return {
    id: String(bidPackage._id),
    projectId: String(project._id),
    name: bidPackage.name,
    sourceType: bidPackage.sourceType,
    adapter: bidPackage.adapter || ("manual" as const),
    manifestVersion: bidPackage.manifestVersion || 1,
    revisionKind:
      bidPackage.revisionKind ||
      (bidPackage.revision === 1 ? ("initial" as const) : ("supplemental" as const)),
    revisionLabel: bidPackage.revisionLabel,
    revision: bidPackage.revision,
    status: bidPackage.status,
    entryCount: bidPackage.entryCount,
    pdfCount: bidPackage.pdfCount,
    rejectedCount: bidPackage.rejectedCount,
    uploadedCount: bidPackage.uploadedCount,
    duplicateCount: bidPackage.duplicateCount,
    failedCount: bidPackage.failedCount,
    writtenScopeCount: bidPackage.writtenScopeCount || 0,
    totalBytes: bidPackage.totalBytes,
    lastError: bidPackage.lastError,
    finalizedAt: bidPackage.finalizedAt,
    analysisCompletedAt: bidPackage.analysisCompletedAt,
    createdAt: bidPackage.createdAt,
    updatedAt: bidPackage.updatedAt,
    entries: entries.map((entry) => ({
      id: String(entry._id),
      packageId: String(entry.packageId),
      envelopeId: entry.envelopeRecordId
        ? envelopes.find((envelope) => envelope._id === entry.envelopeRecordId)
            ?.envelopeId
        : undefined,
      kind: entry.kind || ("pdf" as const),
      sourceCategory: entry.sourceCategory || ("unknown" as const),
      relativePath: entry.relativePath,
      size: entry.size,
      sha256: entry.sha256,
      status: entry.status,
      reason: entry.reason,
      documentId: entry.documentId ? String(entry.documentId) : undefined,
      writtenScopeId: entry.writtenScopeId
        ? String(entry.writtenScopeId)
        : undefined,
    })),
    envelopes: envelopes.map((envelope) => ({
      id: String(envelope._id),
      envelopeId: envelope.envelopeId,
      adapter: envelope.adapter,
      sourceType: envelope.sourceType,
      manifestVersion: envelope.manifestVersion,
      revisionKind: envelope.revisionKind,
      revisionLabel: envelope.revisionLabel,
      status: envelope.status,
      entryCount: envelope.entryCount,
      acceptedCount: envelope.acceptedCount,
      rejectedCount: envelope.rejectedCount,
      totalBytes: envelope.totalBytes,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
    })),
  };
}

async function existingEnvelope(
  ctx: MutationCtx,
  projectId: Id<"heliosProjects">,
  input: HeliosPackageInput,
) {
  const envelope = await ctx.db
    .query("heliosPackageEnvelopes")
    .withIndex("by_project_envelope", (query) =>
      query.eq("projectId", projectId).eq("envelopeId", input.envelopeId),
    )
    .unique();
  if (!envelope) return null;
  if (envelope.manifestFingerprint !== manifestFingerprint(input)) {
    throw new Error("Package envelope ID was reused with different contents.");
  }
  return envelope;
}

async function insertWrittenScope(
  ctx: MutationCtx,
  args: {
    companyId: Doc<"users">["companyId"];
    projectId: Id<"heliosProjects">;
    packageId: Id<"heliosBidPackages">;
    packageEntryId: Id<"heliosPackageEntries">;
    createdBy: Id<"users">;
    entry: HeliosPackageInput["entries"][number];
    now: number;
  },
) {
  const { entry } = args;
  if (
    entry.kind !== "written_scope" ||
    !entry.title ||
    !entry.content ||
    !entry.sha256
  ) {
    throw new Error("Written scope manifest is incomplete.");
  }
  const duplicate = await ctx.db
    .query("heliosWrittenScopes")
    .withIndex("by_project_hash", (query) =>
      query.eq("projectId", args.projectId).eq("sha256", entry.sha256!),
    )
    .first();
  if (duplicate) {
    return { kind: "duplicate" as const, writtenScopeId: duplicate._id };
  }
  const priorScopes = await ctx.db
    .query("heliosWrittenScopes")
    .withIndex("by_project", (query) => query.eq("projectId", args.projectId))
    .collect();
  const priorVersion = priorScopes
    .filter(
      (scope) =>
        scope.relativePath.toLowerCase() === entry.relativePath.toLowerCase(),
    )
    .sort((left, right) => right.version - left.version)[0];
  const writtenScopeId = await ctx.db.insert("heliosWrittenScopes", {
    companyId: args.companyId,
    projectId: args.projectId,
    packageId: args.packageId,
    packageEntryId: args.packageEntryId,
    createdBy: args.createdBy,
    title: entry.title,
    canonicalTitle: entry.title.normalize("NFKC").toLowerCase(),
    relativePath: entry.relativePath,
    content: entry.content,
    sourceLocation: entry.sourceLocation,
    size: entry.size,
    sha256: entry.sha256,
    version: (priorVersion?.version || 0) + 1,
    supersedesWrittenScopeId: priorVersion?._id,
    createdAt: args.now,
    updatedAt: args.now,
  });
  return { kind: "created" as const, writtenScopeId };
}

async function insertEnvelopeEntries(
  ctx: MutationCtx,
  args: {
    companyId: Doc<"users">["companyId"];
    projectId: Id<"heliosProjects">;
    packageId: Id<"heliosBidPackages">;
    envelopeRecordId: Id<"heliosPackageEnvelopes">;
    createdBy: Id<"users">;
    entries: HeliosPackageInput["entries"];
    existingPaths?: Set<string>;
    now: number;
  },
) {
  let uploadedScopes = 0;
  let duplicateScopes = 0;
  const insertedIds: Id<"heliosPackageEntries">[] = [];
  for (const entry of args.entries) {
    if (args.existingPaths?.has(entry.relativePath.toLowerCase())) continue;
    const initialStatus = entry.accepted
      ? entry.kind === "written_scope"
        ? "uploaded"
        : "pending"
      : "rejected";
    const entryId = await ctx.db.insert("heliosPackageEntries", {
      companyId: args.companyId,
      projectId: args.projectId,
      packageId: args.packageId,
      envelopeRecordId: args.envelopeRecordId,
      kind: entry.kind,
      sourceCategory: entry.sourceCategory,
      relativePath: entry.relativePath,
      canonicalPath: entry.relativePath.toLowerCase(),
      size: entry.size,
      sha256: entry.sha256,
      status: initialStatus,
      reason: entry.reason,
      createdAt: args.now,
      updatedAt: args.now,
    });
    insertedIds.push(entryId);
    if (entry.accepted && entry.kind === "written_scope") {
      const result = await insertWrittenScope(ctx, {
        companyId: args.companyId,
        projectId: args.projectId,
        packageId: args.packageId,
        packageEntryId: entryId,
        createdBy: args.createdBy,
        entry,
        now: args.now,
      });
      await ctx.db.patch(entryId, {
        status: result.kind === "duplicate" ? "duplicate" : "uploaded",
        writtenScopeId: result.writtenScopeId,
        reason:
          result.kind === "duplicate"
            ? "Exact written scope already exists in this project."
            : undefined,
      });
      if (result.kind === "duplicate") duplicateScopes += 1;
      else uploadedScopes += 1;
    }
  }
  return { insertedIds, uploadedScopes, duplicateScopes };
}

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
    if (input.adapter !== "manual") {
      throw new Error("The Bid Scout adapter is not enabled.");
    }
    const replay = await existingEnvelope(ctx, project._id, input);
    if (replay) {
      const replayPackage = await ctx.db.get(replay.packageId);
      if (!replayPackage) throw new Error("Bid package receipt is unavailable.");
      return packageSummary(ctx, project, replayPackage);
    }

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
    if (revision > 1 && input.revisionKind === "initial") {
      throw new Error("A later package must be an addendum, revision, or supplement.");
    }
    const now = Date.now();
    const acceptedEntries = input.entries.filter((entry) => entry.accepted);
    const pdfEntries = acceptedEntries.filter((entry) => entry.kind === "pdf");
    const writtenScopes = acceptedEntries.filter(
      (entry) => entry.kind === "written_scope",
    );
    const rejectedEntries = input.entries.filter((entry) => !entry.accepted);
    const packageId = await ctx.db.insert("heliosBidPackages", {
      companyId,
      projectId: project._id,
      createdBy: user._id,
      name: input.name,
      sourceType: input.sourceType,
      adapter: input.adapter,
      manifestVersion: input.manifestVersion,
      revisionKind: input.revisionKind,
      revisionLabel: input.revisionLabel,
      predecessorPackageId: existingPackages[0]?._id,
      revision,
      status: "uploading",
      entryCount: input.entries.length,
      pdfCount: pdfEntries.length,
      rejectedCount: rejectedEntries.length,
      uploadedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      writtenScopeCount: writtenScopes.length,
      totalBytes: acceptedEntries.reduce((sum, entry) => sum + entry.size, 0),
      createdAt: now,
      updatedAt: now,
    });
    const envelopeRecordId = await ctx.db.insert("heliosPackageEnvelopes", {
      companyId,
      projectId: project._id,
      packageId,
      createdBy: user._id,
      envelopeId: input.envelopeId,
      adapter: input.adapter,
      sourceType: input.sourceType,
      manifestVersion: input.manifestVersion,
      revisionKind: input.revisionKind,
      revisionLabel: input.revisionLabel,
      manifestFingerprint: manifestFingerprint(input),
      status: pdfEntries.length ? "building" : "terminal",
      entryCount: input.entries.length,
      acceptedCount: acceptedEntries.length,
      rejectedCount: rejectedEntries.length,
      totalBytes: acceptedEntries.reduce((sum, entry) => sum + entry.size, 0),
      createdAt: now,
      updatedAt: now,
    });
    const inserted = await insertEnvelopeEntries(ctx, {
      companyId,
      projectId: project._id,
      packageId,
      envelopeRecordId,
      createdBy: user._id,
      entries: input.entries,
      now,
    });
    if (inserted.uploadedScopes || inserted.duplicateScopes) {
      await ctx.db.patch(packageId, {
        uploadedCount: inserted.uploadedScopes,
        duplicateCount: inserted.duplicateScopes,
      });
    }

    await ctx.db.patch(project._id, {
      activePackageId: packageId,
      currentPackageRevision: revision,
      status: "intake",
      latestIntelligenceError: undefined,
      updatedAt: now,
    });
    const bidPackage = await ctx.db.get(packageId);
    if (!bidPackage) throw new Error("Bid package could not be created.");
    return packageSummary(ctx, project, bidPackage);
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
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
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
    if (input.adapter !== "manual") {
      throw new Error("The Bid Scout adapter is not enabled.");
    }
    if (
      (bidPackage.revisionKind || "initial") !== input.revisionKind ||
      (bidPackage.revisionLabel || "") !== (input.revisionLabel || "")
    ) {
      throw new Error("Package additions must use the active revision purpose.");
    }
    const replay = await existingEnvelope(ctx, project._id, input);
    if (replay) {
      if (replay.packageId !== bidPackage._id) {
        throw new Error("Package envelope belongs to another revision.");
      }
      return packageSummary(ctx, project, bidPackage);
    }

    const existingEntries = await ctx.db
      .query("heliosPackageEntries")
      .withIndex("by_package", (query) => query.eq("packageId", bidPackage._id))
      .collect();
    const existingByPath = new Map(
      existingEntries.map((entry) => [entry.canonicalPath, entry]),
    );
    for (const entry of input.entries) {
      const existing = existingByPath.get(entry.relativePath.toLowerCase());
      if (
        existing &&
        (existing.size !== entry.size ||
          (existing.sha256 && entry.sha256 && existing.sha256 !== entry.sha256))
      ) {
        throw new Error(
          `A different source already uses this package path: ${entry.relativePath}`,
        );
      }
    }
    const additions = input.entries.filter(
      (entry) => !existingByPath.has(entry.relativePath.toLowerCase()),
    );
    const acceptedAdditions = additions.filter((entry) => entry.accepted);
    const acceptedPdfAdditions = acceptedAdditions.filter(
      (entry) => entry.kind === "pdf",
    );
    const writtenScopeAdditions = acceptedAdditions.filter(
      (entry) => entry.kind === "written_scope",
    );
    const rejectedAdditions = additions.filter((entry) => !entry.accepted);
    const nextEntryCount = bidPackage.entryCount + additions.length;
    const nextPdfCount = bidPackage.pdfCount + acceptedPdfAdditions.length;
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
      throw new Error("The combined source package is too large.");
    }

    const now = Date.now();
    const envelopeRecordId = await ctx.db.insert("heliosPackageEnvelopes", {
      companyId,
      projectId: project._id,
      packageId: bidPackage._id,
      createdBy: user._id,
      envelopeId: input.envelopeId,
      adapter: input.adapter,
      sourceType: input.sourceType,
      manifestVersion: input.manifestVersion,
      revisionKind: input.revisionKind,
      revisionLabel: input.revisionLabel,
      manifestFingerprint: manifestFingerprint(input),
      status: acceptedPdfAdditions.length ? "building" : "terminal",
      entryCount: input.entries.length,
      acceptedCount: input.entries.filter((entry) => entry.accepted).length,
      rejectedCount: input.entries.filter((entry) => !entry.accepted).length,
      totalBytes: input.entries
        .filter((entry) => entry.accepted)
        .reduce((sum, entry) => sum + entry.size, 0),
      createdAt: now,
      updatedAt: now,
    });
    const inserted = await insertEnvelopeEntries(ctx, {
      companyId,
      projectId: project._id,
      packageId: bidPackage._id,
      envelopeRecordId,
      createdBy: user._id,
      entries: additions,
      existingPaths: new Set(existingByPath.keys()),
      now,
    });
    await ctx.db.patch(bidPackage._id, {
      entryCount: nextEntryCount,
      pdfCount: nextPdfCount,
      rejectedCount: bidPackage.rejectedCount + rejectedAdditions.length,
      uploadedCount: bidPackage.uploadedCount + inserted.uploadedScopes,
      duplicateCount: bidPackage.duplicateCount + inserted.duplicateScopes,
      writtenScopeCount:
        (bidPackage.writtenScopeCount || 0) + writtenScopeAdditions.length,
      totalBytes: nextTotalBytes,
      updatedAt: now,
    });
    const updated = await ctx.db.get(bidPackage._id);
    if (!updated) throw new Error("Bid package could not be updated.");
    return packageSummary(ctx, project, updated);
  },
});
