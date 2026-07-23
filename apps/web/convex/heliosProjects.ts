import {
  HELIOS_MAX_PDF_BYTES,
  HELIOS_UPLOAD_INTENT_LIFETIME_MS,
  canonicalPdfFileName,
  normalizeProjectInput,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

const projectInputValidator = v.object({
  name: v.string(),
  projectNumber: v.optional(v.string()),
  ownerClient: v.optional(v.string()),
  engineer: v.optional(v.string()),
  bidDate: v.optional(v.string()),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
});

function projectSummary(
  project: Doc<"heliosProjects">,
  documentCount: number,
) {
  return {
    id: project._id,
    name: project.name,
    projectNumber: project.projectNumber,
    ownerClient: project.ownerClient,
    engineer: project.engineer,
    bidDate: project.bidDate,
    location: project.location,
    notes: project.notes,
    status: project.status,
    intelligenceStatus: project.intelligenceStatus,
    documentCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function documentSummary(document: Doc<"heliosDocuments">) {
  return {
    id: document._id,
    projectId: document.projectId,
    fileName: document.fileName,
    contentType: document.contentType,
    size: document.size,
    sha256: document.sha256,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function ownedProject(
  ctx: QueryCtx | MutationCtx,
  companyId: Doc<"users">["companyId"],
  projectIdValue: string,
) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  if (!projectId) throw new Error("Project not found.");
  const project = await ctx.db.get(projectId);
  if (!project || project.companyId !== companyId) {
    throw new Error("Project not found.");
  }
  return project;
}

export const listCockpit = internalQuery({
  args: { principal: heliosPrincipalValidator },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const projects = await ctx.db
      .query("heliosProjects")
      .withIndex("by_company_updated", (query) =>
        query.eq("companyId", companyId),
      )
      .order("desc")
      .take(25);

    const projectRows = await Promise.all(
      projects.map(async (project) => {
        const documents = await ctx.db
          .query("heliosDocuments")
          .withIndex("by_project", (query) =>
            query.eq("projectId", project._id),
          )
          .collect();
        return {
          project: projectSummary(project, documents.length),
          documents,
        };
      }),
    );

    const processingQueue = projectRows
      .flatMap(({ project, documents }) =>
        documents
          .filter((document) => document.status === "ready_for_intelligence")
          .map((document) => ({
            document: documentSummary(document),
            projectName: project.name,
          })),
      )
      .sort((left, right) => right.document.updatedAt - left.document.updatedAt)
      .slice(0, 20);

    return {
      recentProjects: projectRows.map(({ project }) => project),
      processingQueue,
    };
  },
});

export const createProject = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    input: projectInputValidator,
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const input = normalizeProjectInput(args.input);
    const now = Date.now();
    const projectId = await ctx.db.insert("heliosProjects", {
      companyId,
      createdBy: user._id,
      ...input,
      status: "draft",
      intelligenceStatus: "awaiting_documents",
      createdAt: now,
      updatedAt: now,
    });
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project could not be created.");
    return projectSummary(project, 0);
  },
});

export const getProject = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) =>
        query.eq("projectId", project._id),
      )
      .order("desc")
      .collect();
    return {
      project: projectSummary(project, documents.length),
      documents: documents.map(documentSummary),
    };
  },
});

export const createUploadIntent = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const project = await ownedProject(ctx, companyId, args.projectId);
    if (project.status === "archived") {
      throw new Error("Archived projects cannot accept documents.");
    }

    const now = Date.now();
    const intentId = await ctx.db.insert("heliosUploadIntents", {
      companyId,
      projectId: project._id,
      createdBy: user._id,
      status: "pending",
      expiresAt: now + HELIOS_UPLOAD_INTENT_LIFETIME_MS,
      createdAt: now,
      updatedAt: now,
    });
    const uploadUrl = await ctx.storage.generateUploadUrl();
    if (project.status === "draft") {
      await ctx.db.patch(project._id, { status: "intake", updatedAt: now });
    }
    return { intentId, uploadUrl };
  },
});

export const inspectUpload = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    intentId: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const project = await ownedProject(ctx, companyId, args.projectId);
    const intentId = ctx.db.normalizeId("heliosUploadIntents", args.intentId);
    if (!intentId) throw new Error("Upload authorization is invalid.");
    const intent = await ctx.db.get(intentId);
    if (
      !intent ||
      intent.companyId !== companyId ||
      intent.projectId !== project._id ||
      intent.createdBy !== user._id ||
      intent.status !== "pending" ||
      intent.expiresAt <= Date.now()
    ) {
      throw new Error("Upload authorization has expired.");
    }
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) throw new Error("Uploaded file was not found.");
    return {
      contentType: metadata.contentType,
      size: metadata.size,
      sha256: metadata.sha256,
    };
  },
});

export const registerDocument = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    intentId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    magicValid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const project = await ownedProject(ctx, companyId, args.projectId);
    const intentId = ctx.db.normalizeId("heliosUploadIntents", args.intentId);
    if (!intentId) throw new Error("Upload authorization is invalid.");
    const intent = await ctx.db.get(intentId);
    if (
      !intent ||
      intent.companyId !== companyId ||
      intent.projectId !== project._id ||
      intent.createdBy !== user._id ||
      intent.status !== "pending" ||
      intent.expiresAt <= Date.now()
    ) {
      throw new Error("Upload authorization has expired.");
    }

    const now = Date.now();
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    const canonicalFileName = canonicalPdfFileName(args.fileName);
    const invalidReason =
      !metadata
        ? "Uploaded file was not found."
        : metadata.contentType !== "application/pdf"
          ? "Uploaded file is not a PDF."
          : metadata.size <= 0 || metadata.size > HELIOS_MAX_PDF_BYTES
            ? "Uploaded PDF exceeds the allowed size."
            : !args.magicValid
              ? "Uploaded file does not contain a valid PDF signature."
              : !canonicalFileName.endsWith(".pdf")
                ? "Uploaded filename must end in .pdf."
                : null;

    if (invalidReason || !metadata) {
      if (metadata) await ctx.storage.delete(args.storageId);
      await ctx.db.patch(intent._id, {
        status: "failed",
        failureReason: invalidReason || "Uploaded file is invalid.",
        updatedAt: now,
      });
      throw new Error(invalidReason || "Uploaded file is invalid.");
    }

    const duplicate = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project_hash", (query) =>
        query.eq("projectId", project._id).eq("sha256", metadata.sha256),
      )
      .first();
    if (duplicate) {
      await ctx.storage.delete(args.storageId);
      await ctx.db.patch(intent._id, {
        status: "consumed",
        duplicateDocumentId: duplicate._id,
        updatedAt: now,
      });
      return { kind: "duplicate" as const, document: documentSummary(duplicate) };
    }

    const documentId = await ctx.db.insert("heliosDocuments", {
      companyId,
      projectId: project._id,
      uploadedBy: user._id,
      storageId: args.storageId,
      fileName: args.fileName.trim(),
      canonicalFileName,
      contentType: "application/pdf",
      size: metadata.size,
      sha256: metadata.sha256,
      status: "ready_for_intelligence",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(intent._id, { status: "consumed", updatedAt: now });
    await ctx.db.patch(project._id, {
      status: "documents_ready",
      intelligenceStatus: "ready_for_intelligence",
      updatedAt: now,
    });
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document could not be registered.");
    return { kind: "created" as const, document: documentSummary(document) };
  },
});
