import {
  parseDocumentIntelligence,
  parseProjectSynthesis,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
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
import { ensureBidBasisProfile } from "./heliosBidBasis";
import {
  scheduleDocumentShadow,
  scheduleProjectShadow,
} from "./heliosEngineeringShadowSchedule";

const startDocumentReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosIntelligenceJobs"> },
  null
>("heliosIntelligenceActions:startDocument");
const synthesizeProjectReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosIntelligenceJobs"> },
  null
>("heliosIntelligenceActions:synthesizeProject");

const activeDocumentStatuses = new Set([
  "queued",
  "uploading",
  "analyzing",
]);

function safeError(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.slice(0, 500) || "Document intelligence failed.";
}

async function projectForCompany(
  ctx: MutationCtx,
  companyId: Id<"companies">,
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

async function documentForProject(
  ctx: MutationCtx,
  project: Doc<"heliosProjects">,
  documentIdValue: string,
) {
  const documentId = ctx.db.normalizeId("heliosDocuments", documentIdValue);
  if (!documentId) throw new Error("Document not found.");
  const document = await ctx.db.get(documentId);
  if (
    !document ||
    document.companyId !== project.companyId ||
    document.projectId !== project._id
  ) {
    throw new Error("Document not found.");
  }
  return document;
}

async function activeDocumentJob(
  ctx: MutationCtx,
  documentId: Id<"heliosDocuments">,
) {
  const jobs = await ctx.db
    .query("heliosIntelligenceJobs")
    .withIndex("by_document", (query) => query.eq("documentId", documentId))
    .order("desc")
    .take(10);
  return jobs.find((job) => activeDocumentStatuses.has(job.status));
}

async function packageDocumentIds(
  ctx: MutationCtx | QueryCtx,
  packageId: Id<"heliosBidPackages">,
) {
  const entries = await ctx.db
    .query("heliosPackageEntries")
    .withIndex("by_package", (query) => query.eq("packageId", packageId))
    .collect();
  return new Set(
    entries
      .map((entry) => entry.documentId)
      .filter((documentId): documentId is Id<"heliosDocuments"> =>
        Boolean(documentId),
      )
      .map(String),
  );
}

async function enqueueDocument(
  ctx: MutationCtx,
  document: Doc<"heliosDocuments">,
) {
  const existing = await activeDocumentJob(ctx, document._id);
  if (existing) return existing._id;
  const now = Date.now();
  const attempt = (document.attemptCount || 0) + 1;
  const jobId = await ctx.db.insert("heliosIntelligenceJobs", {
    companyId: document.companyId,
    projectId: document.projectId,
    documentId: document._id,
    packageId: document.packageId,
    kind: "document",
    status: "queued",
    attempt,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(document._id, {
    status: "queued",
    attemptCount: attempt,
    lastError: undefined,
    processingStartedAt: undefined,
    processingCompletedAt: undefined,
    updatedAt: now,
  });
  await ctx.db.patch(document.projectId, {
    intelligenceStatus: "queued",
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(0, startDocumentReference, { jobId });
  return jobId;
}

async function enqueueProjectSynthesis(
  ctx: MutationCtx,
  project: Doc<"heliosProjects">,
  bidPackage?: Doc<"heliosBidPackages">,
) {
  const active = await ctx.db
    .query("heliosIntelligenceJobs")
    .withIndex("by_project_status", (query) =>
      query.eq("projectId", project._id).eq("status", "synthesizing"),
    )
    .first();
  if (active) return active._id;

  const projectJobs = await ctx.db
    .query("heliosIntelligenceJobs")
    .withIndex("by_project_status", (query) =>
      query.eq("projectId", project._id),
    )
    .collect();
  const attempt =
    Math.max(
      0,
      ...projectJobs
        .filter((job) => job.kind === "project")
        .map((job) => job.attempt),
    ) + 1;
  const now = Date.now();
  const jobId = await ctx.db.insert("heliosIntelligenceJobs", {
    companyId: project.companyId,
    projectId: project._id,
    packageId: bidPackage?._id,
    packageRevision: bidPackage?.revision,
    kind: "project",
    status: "synthesizing",
    attempt,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(project._id, {
    intelligenceStatus: "processing",
    latestIntelligenceError: undefined,
    updatedAt: now,
  });
  if (bidPackage) {
    await ctx.db.patch(bidPackage._id, {
      status: "processing",
      lastError: undefined,
      updatedAt: now,
    });
  }
  await ctx.scheduler.runAfter(0, synthesizeProjectReference, { jobId });
  return jobId;
}

async function maybeStartProjectSynthesis(
  ctx: MutationCtx,
  projectId: Id<"heliosProjects">,
  packageId?: Id<"heliosBidPackages">,
) {
  const project = await ctx.db.get(projectId);
  if (!project) return null;
  const bidPackage = packageId
    ? (await ctx.db.get(packageId)) || undefined
    : undefined;
  if (packageId && (!bidPackage || !bidPackage.finalizedAt)) return null;

  const documents = await ctx.db
    .query("heliosDocuments")
    .withIndex("by_project", (query) => query.eq("projectId", projectId))
    .collect();
  const allowedDocumentIds = packageId
    ? await packageDocumentIds(ctx, packageId)
    : undefined;
  const scopedDocuments = allowedDocumentIds
    ? documents.filter((document) =>
        allowedDocumentIds.has(String(document._id)),
      )
    : documents;
  const active = scopedDocuments.some((document) =>
    [
      "ready_for_intelligence",
      "queued",
      "uploading_to_openai",
      "analyzing",
    ].includes(document.status),
  );
  if (active) return null;
  const hasCompleted = scopedDocuments.some(
    (document) => document.status === "completed",
  );
  if (!hasCompleted) return null;
  return enqueueProjectSynthesis(ctx, project, bidPackage);
}

export const queueDocument = internalMutation({
  args: { documentId: v.id("heliosDocuments") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (
      !document ||
      document.status === "superseded" ||
      document.status === "completed"
    ) {
      return null;
    }
    return enqueueDocument(ctx, document);
  },
});

export const finalizePackage = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    packageId: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await projectForCompany(ctx, companyId, args.projectId);
    const packageId = ctx.db.normalizeId("heliosBidPackages", args.packageId);
    if (!packageId) throw new Error("Bid package not found.");
    const bidPackage = await ctx.db.get(packageId);
    if (
      !bidPackage ||
      bidPackage.companyId !== companyId ||
      bidPackage.projectId !== project._id ||
      project.activePackageId !== bidPackage._id
    ) {
      throw new Error("Bid package not found.");
    }
    if (bidPackage.finalizedAt) {
      return {
        packageId: String(bidPackage._id),
        status: bidPackage.status,
      };
    }
    if (bidPackage.status !== "uploading") {
      throw new Error("Bid package cannot be finalized.");
    }
    const entries = await ctx.db
      .query("heliosPackageEntries")
      .withIndex("by_package", (query) =>
        query.eq("packageId", bidPackage._id),
      )
      .collect();
    const unresolved = entries.filter((entry) =>
      ["pending", "failed"].includes(entry.status),
    );
    if (unresolved.length) {
      throw new Error(
        `${unresolved.length} package files still require attention.`,
      );
    }
    const accepted = entries.filter((entry) =>
      ["uploaded", "duplicate"].includes(entry.status),
    );
    if (!accepted.length) {
      throw new Error("The bid package contains no registered source evidence.");
    }

    const now = Date.now();
    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) =>
        query.eq("projectId", project._id),
      )
      .collect();
    const packageDocuments = documents.filter(
      (document) =>
        document.packageId === bidPackage._id &&
        document.status === "ready_for_intelligence",
    );
    if (!packageDocuments.length) {
      await ctx.db.patch(bidPackage._id, {
        status: "ready_for_review",
        finalizedAt: now,
        lastError: undefined,
        updatedAt: now,
      });
      await ctx.db.patch(project._id, {
        status: "documents_ready",
        intelligenceStatus: "ready_for_intelligence",
        latestIntelligenceError: undefined,
        updatedAt: now,
      });
      const finalizedPackage = await ctx.db.get(bidPackage._id);
      if (finalizedPackage) {
        await ensureBidBasisProfile(ctx, project, finalizedPackage);
      }
      await scheduleProjectShadow(ctx, project._id, bidPackage._id);
      return {
        packageId: String(bidPackage._id),
        status: "ready_for_review" as const,
      };
    }
    await ctx.db.patch(bidPackage._id, {
      status: "ready_for_analysis",
      finalizedAt: now,
      lastError: undefined,
      updatedAt: now,
    });
    for (const document of packageDocuments) {
      await enqueueDocument(ctx, document);
    }
    await ctx.db.patch(bidPackage._id, {
      status: "processing",
      updatedAt: now,
    });
    await ctx.db.patch(project._id, {
      status: "documents_ready",
      intelligenceStatus: packageDocuments.length
        ? "queued"
        : "processing",
      latestIntelligenceError: undefined,
      updatedAt: now,
    });
    const finalizedPackage = await ctx.db.get(bidPackage._id);
    if (finalizedPackage) {
      await ensureBidBasisProfile(ctx, project, finalizedPackage);
    }
    await scheduleProjectShadow(ctx, project._id, bidPackage._id);
    return {
      packageId: String(bidPackage._id),
      status: "processing" as const,
    };
  },
});

export const retryDocument = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await projectForCompany(ctx, companyId, args.projectId);
    const document = await documentForProject(ctx, project, args.documentId);
    if (document.status !== "failed") {
      throw new Error("Only failed documents can be retried.");
    }
    const jobId = await enqueueDocument(ctx, document);
    return { jobId, status: "queued" as const };
  },
});

export const retryProject = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await projectForCompany(ctx, companyId, args.projectId);
    if (
      project.intelligenceStatus !== "failed" &&
      project.intelligenceStatus !== "partially_ready"
    ) {
      throw new Error("Project intelligence is not eligible for retry.");
    }
    const completed = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) => query.eq("projectId", project._id))
      .filter((query) => query.eq(query.field("status"), "completed"))
      .first();
    if (!completed) throw new Error("No completed document intelligence exists.");
    const bidPackage = project.activePackageId
      ? (await ctx.db.get(project.activePackageId)) || undefined
      : undefined;
    if (bidPackage && !bidPackage.finalizedAt) {
      throw new Error("Finalize the active bid package before retrying.");
    }
    const jobId = await enqueueProjectSynthesis(ctx, project, bidPackage);
    return { jobId, status: "synthesizing" as const };
  },
});

export const queueReviewedReanalysis = internalMutation({
  args: {
    projectId: v.id("heliosProjects"),
    intelligenceId: v.id("heliosProjectIntelligence"),
  },
  handler: async (ctx, args) => {
    const [project, intelligence] = await Promise.all([
      ctx.db.get(args.projectId),
      ctx.db.get(args.intelligenceId),
    ]);
    if (
      !project ||
      !intelligence ||
      intelligence.projectId !== project._id ||
      intelligence.companyId !== project.companyId ||
      intelligence.isCurrent === false
    ) {
      return null;
    }
    const bidPackage = project.activePackageId
      ? (await ctx.db.get(project.activePackageId)) || undefined
      : undefined;
    if (bidPackage && !bidPackage.finalizedAt) return null;
    return enqueueProjectSynthesis(ctx, project, bidPackage);
  },
});

export const loadDocumentJob = internalQuery({
  args: { jobId: v.id("heliosIntelligenceJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.kind !== "document" || !job.documentId) return null;
    const document = await ctx.db.get(job.documentId);
    if (!document) return null;
    const project = await ctx.db.get(document.projectId);
    if (
      !project ||
      project.companyId !== job.companyId ||
      document.companyId !== job.companyId
    ) {
      return null;
    }
    return { job, document, project };
  },
});

export const markDocumentUploading = internalMutation({
  args: { jobId: v.id("heliosIntelligenceJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (
      !job ||
      job.kind !== "document" ||
      !job.documentId ||
      job.status !== "queued"
    ) {
      return false;
    }
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: "uploading",
      startedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(job.documentId, {
      status: "uploading_to_openai",
      processingStartedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(job.projectId, {
      intelligenceStatus: "processing",
      updatedAt: now,
    });
    return true;
  },
});

export const markDocumentAnalyzing = internalMutation({
  args: {
    jobId: v.id("heliosIntelligenceJobs"),
    openaiFileId: v.string(),
    openaiResponseId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (
      !job ||
      job.kind !== "document" ||
      !job.documentId ||
      job.status !== "uploading"
    ) {
      return false;
    }
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: "analyzing",
      openaiFileId: args.openaiFileId,
      openaiResponseId: args.openaiResponseId,
      updatedAt: now,
    });
    await ctx.db.patch(job.documentId, {
      status: "analyzing",
      updatedAt: now,
    });
    return true;
  },
});

export const failDocumentJob = internalMutation({
  args: {
    jobId: v.id("heliosIntelligenceJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.kind !== "document" || !job.documentId) return null;
    if (job.status === "completed") return null;
    const now = Date.now();
    const error = safeError(args.error);
    await ctx.db.patch(job._id, {
      status: "failed",
      error,
      completedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(job.documentId, {
      status: "failed",
      lastError: error,
      processingCompletedAt: now,
      updatedAt: now,
    });
    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) => query.eq("projectId", job.projectId))
      .collect();
    const allowedDocumentIds = job.packageId
      ? await packageDocumentIds(ctx, job.packageId)
      : undefined;
    const scopedDocuments = allowedDocumentIds
      ? documents.filter((document) =>
          allowedDocumentIds.has(String(document._id)),
        )
      : documents;
    const hasCompleted = scopedDocuments.some(
      (document) => document.status === "completed",
    );
    const hasActive = scopedDocuments.some((document) =>
      ["ready_for_intelligence", "queued", "uploading_to_openai", "analyzing"].includes(
        document.status,
      ),
    );
    await ctx.db.patch(job.projectId, {
      intelligenceStatus: hasActive
        ? "processing"
        : hasCompleted
          ? "partially_ready"
          : "failed",
      updatedAt: now,
    });
    if (!hasActive && hasCompleted) {
      await maybeStartProjectSynthesis(ctx, job.projectId, job.packageId);
    }
    await scheduleDocumentShadow(ctx, job._id);
    return null;
  },
});

export const completeDocumentJob = internalMutation({
  args: {
    jobId: v.id("heliosIntelligenceJobs"),
    model: v.string(),
    result: v.any(),
    responseId: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const result = parseDocumentIntelligence(args.result);
    const job = await ctx.db.get(args.jobId);
    if (
      !job ||
      job.kind !== "document" ||
      !job.documentId ||
      job.status !== "analyzing"
    ) {
      throw new Error("Document intelligence job is no longer active.");
    }
    const document = await ctx.db.get(job.documentId);
    if (
      !document ||
      document.projectId !== job.projectId ||
      document.companyId !== job.companyId
    ) {
      throw new Error("Document intelligence ownership is invalid.");
    }
    const now = Date.now();
    const previousIntelligence = await ctx.db
      .query("heliosDocumentIntelligence")
      .withIndex("by_document", (query) =>
        query.eq("documentId", document._id),
      )
      .collect();
    for (const row of previousIntelligence) await ctx.db.delete(row._id);
    const previousEvidence = await ctx.db
      .query("heliosEvidence")
      .withIndex("by_document", (query) =>
        query.eq("documentId", document._id),
      )
      .collect();
    for (const row of previousEvidence) await ctx.db.delete(row._id);

    const evidenceIds = new Map<string, Id<"heliosEvidence">>();
    for (const evidence of result.evidence) {
      const evidenceId = await ctx.db.insert("heliosEvidence", {
        companyId: job.companyId,
        projectId: job.projectId,
        documentId: document._id,
        evidenceKey: evidence.key,
        pageNumber: evidence.pageNumber,
        locator: evidence.locator,
        excerpt: evidence.excerpt,
        createdAt: now,
      });
      evidenceIds.set(evidence.key, evidenceId);
    }
    const resolveEvidenceKeys = (keys: string[]) =>
      keys.map((key) => {
        const evidenceId = evidenceIds.get(key);
        if (!evidenceId) throw new Error("Document evidence mapping failed.");
        return evidenceId;
      });

    await ctx.db.insert("heliosDocumentIntelligence", {
      companyId: job.companyId,
      projectId: job.projectId,
      documentId: document._id,
      model: args.model,
      schemaVersion: 1,
      documentType: result.documentType,
      summary: result.summary,
      summaryEvidenceIds: resolveEvidenceKeys(result.summaryEvidenceKeys),
      confidence: result.confidence,
      findings: result.findings.map((finding) => ({
        category: finding.category,
        title: finding.title,
        detail: finding.detail,
        confidence: finding.confidence,
        severity: finding.severity,
        evidenceIds: resolveEvidenceKeys(finding.evidenceKeys),
      })),
      generatedAt: now,
    });
    await ctx.db.patch(document._id, {
      status: "completed",
      lastError: undefined,
      processingCompletedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(job._id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });
    await scheduleDocumentShadow(ctx, job._id);

    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) => query.eq("projectId", job.projectId))
      .collect();
    const allowedDocumentIds = job.packageId
      ? await packageDocumentIds(ctx, job.packageId)
      : undefined;
    const scopedDocuments = allowedDocumentIds
      ? documents.filter((document) =>
          allowedDocumentIds.has(String(document._id)),
        )
      : documents;
    const active = scopedDocuments.some((row) =>
      ["ready_for_intelligence", "queued", "uploading_to_openai", "analyzing"].includes(
        row.status,
      ),
    );
    const completed = scopedDocuments.filter(
      (row) => row.status === "completed",
    );
    if (active) {
      await ctx.db.patch(job.projectId, {
        intelligenceStatus: "processing",
        updatedAt: now,
      });
      return null;
    }
    if (!completed.length) {
      await ctx.db.patch(job.projectId, {
        intelligenceStatus: "failed",
        updatedAt: now,
      });
      return null;
    }

    await maybeStartProjectSynthesis(ctx, job.projectId, job.packageId);
    return null;
  },
});

export const loadProjectJob = internalQuery({
  args: { jobId: v.id("heliosIntelligenceJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.kind !== "project" || job.status !== "synthesizing") {
      return null;
    }
    const project = await ctx.db.get(job.projectId);
    if (!project || project.companyId !== job.companyId) return null;
    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) =>
        query.eq("projectId", project._id),
      )
      .collect();
    const allowedDocumentIds = job.packageId
      ? await packageDocumentIds(ctx, job.packageId)
      : undefined;
    const completedDocuments = documents.filter(
      (document) =>
        document.status === "completed" &&
        (!allowedDocumentIds ||
          allowedDocumentIds.has(String(document._id))),
    );
    const analyses = await Promise.all(
      completedDocuments.map(async (document) => {
        const analysis = await ctx.db
          .query("heliosDocumentIntelligence")
          .withIndex("by_document", (query) =>
            query.eq("documentId", document._id),
          )
          .first();
        return analysis ? { document, analysis } : null;
      }),
    );
    const activeDocumentIds = new Set(
      completedDocuments.map((document) => String(document._id)),
    );
    const evidence = (await ctx.db
      .query("heliosEvidence")
      .withIndex("by_project", (query) =>
        query.eq("projectId", project._id),
      )
      .collect()).filter((row) => activeDocumentIds.has(String(row.documentId)));
    return {
      job,
      project,
      analyses: analyses.filter((row) => row !== null),
      evidence,
    };
  },
});

export const markProjectResponse = internalMutation({
  args: {
    jobId: v.id("heliosIntelligenceJobs"),
    responseId: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.kind !== "project" || job.status !== "synthesizing") {
      return false;
    }
    await ctx.db.patch(job._id, {
      openaiResponseId: args.responseId,
      model: args.model,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const completeProjectJob = internalMutation({
  args: {
    jobId: v.id("heliosIntelligenceJobs"),
    model: v.string(),
    result: v.any(),
    responseId: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.kind !== "project" || job.status !== "synthesizing") {
      throw new Error("Project intelligence job is no longer active.");
    }
    const evidence = await ctx.db
      .query("heliosEvidence")
      .withIndex("by_project", (query) =>
        query.eq("projectId", job.projectId),
      )
      .collect();
    const allowedDocumentIds = job.packageId
      ? await packageDocumentIds(ctx, job.packageId)
      : undefined;
    const scopedEvidence = allowedDocumentIds
      ? evidence.filter((row) =>
          allowedDocumentIds.has(String(row.documentId)),
        )
      : evidence;
    const evidenceById = new Map(
      scopedEvidence.map((row) => [String(row._id), row._id]),
    );
    const result = parseProjectSynthesis(args.result, evidenceById.keys());
    const toEvidenceIds = (ids: string[]) =>
      ids.map((id) => {
        const evidenceId = evidenceById.get(id);
        if (!evidenceId) throw new Error("Project evidence mapping failed.");
        return evidenceId;
      });
    const previous = await ctx.db
      .query("heliosProjectIntelligence")
      .withIndex("by_project", (query) =>
        query.eq("projectId", job.projectId),
      )
      .collect();
    for (const row of previous) {
      if (row.isCurrent !== false) {
        await ctx.db.patch(row._id, { isCurrent: false });
      }
    }
    const now = Date.now();
    await ctx.db.insert("heliosProjectIntelligence", {
      companyId: job.companyId,
      projectId: job.projectId,
      packageId: job.packageId,
      packageRevision: job.packageRevision,
      generationId: job._id,
      isCurrent: true,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      model: args.model,
      schemaVersion: 3,
      summary: result.summary,
      summaryEvidenceIds: toEvidenceIds(result.summaryEvidenceIds),
      projectType: {
        ...result.projectType,
        evidenceIds: toEvidenceIds(result.projectType.evidenceIds),
      },
      fundingSource: {
        ...result.fundingSource,
        evidenceIds: toEvidenceIds(result.fundingSource.evidenceIds),
      },
      projectMetadata: {
        projectNumber: {
          ...result.projectMetadata.projectNumber,
          evidenceIds: toEvidenceIds(result.projectMetadata.projectNumber.evidenceIds),
        },
        ownerClient: {
          ...result.projectMetadata.ownerClient,
          evidenceIds: toEvidenceIds(result.projectMetadata.ownerClient.evidenceIds),
        },
        engineer: {
          ...result.projectMetadata.engineer,
          evidenceIds: toEvidenceIds(result.projectMetadata.engineer.evidenceIds),
        },
        bidDate: {
          ...result.projectMetadata.bidDate,
          evidenceIds: toEvidenceIds(result.projectMetadata.bidDate.evidenceIds),
        },
        location: {
          ...result.projectMetadata.location,
          evidenceIds: toEvidenceIds(result.projectMetadata.location.evidenceIds),
        },
      },
      confidence: result.confidence,
      findings: result.findings.map((finding) => ({
        ...finding,
        evidenceIds: toEvidenceIds(finding.evidenceIds),
      })),
      generatedAt: now,
    });
    await ctx.db.patch(job._id, {
      status: "completed",
      model: args.model,
      openaiResponseId: args.responseId,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      completedAt: now,
      updatedAt: now,
    });
    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) =>
        query.eq("projectId", job.projectId),
      )
      .collect();
    const scopedDocuments = allowedDocumentIds
      ? documents.filter((document) =>
          allowedDocumentIds.has(String(document._id)),
        )
      : documents;
    const hasFailed = scopedDocuments.some((row) => row.status === "failed");
    if (job.packageId) {
      const bidPackage = await ctx.db.get(job.packageId);
      if (bidPackage && bidPackage.projectId === job.projectId) {
        await ctx.db.patch(bidPackage._id, {
          status: hasFailed ? "partially_ready" : "ready_for_review",
          analysisCompletedAt: now,
          lastError: undefined,
          updatedAt: now,
        });
      }
    }
    const project = await ctx.db.get(job.projectId);
    const metadata = result.projectMetadata;
    const projectPatch = {
      ...(!project?.projectNumber && metadata.projectNumber.value
        ? { projectNumber: metadata.projectNumber.value }
        : {}),
      ...(!project?.ownerClient && metadata.ownerClient.value
        ? { ownerClient: metadata.ownerClient.value }
        : {}),
      ...(!project?.engineer && metadata.engineer.value
        ? { engineer: metadata.engineer.value }
        : {}),
      ...(!project?.bidDate && metadata.bidDate.value
        ? { bidDate: metadata.bidDate.value }
        : {}),
      ...(!project?.location && metadata.location.value
        ? { location: metadata.location.value }
        : {}),
    };
    await ctx.db.patch(job.projectId, {
      ...projectPatch,
      intelligenceStatus: hasFailed ? "partially_ready" : "ready_for_review",
      latestIntelligenceError: undefined,
      intelligenceUpdatedAt: now,
      updatedAt: now,
    });
    if (job.packageId) {
      const [project, bidPackage] = await Promise.all([
        ctx.db.get(job.projectId),
        ctx.db.get(job.packageId),
      ]);
      if (project && bidPackage && bidPackage.projectId === project._id) {
        await ensureBidBasisProfile(ctx, project, bidPackage);
      }
    }
    return null;
  },
});

export const failProjectJob = internalMutation({
  args: {
    jobId: v.id("heliosIntelligenceJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.kind !== "project") return null;
    const now = Date.now();
    const error = safeError(args.error);
    await ctx.db.patch(job._id, {
      status: "failed",
      error,
      completedAt: now,
      updatedAt: now,
    });
    if (job.packageId) {
      const bidPackage = await ctx.db.get(job.packageId);
      if (bidPackage && bidPackage.projectId === job.projectId) {
        await ctx.db.patch(bidPackage._id, {
          status: "failed",
          lastError: error,
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch(job.projectId, {
      intelligenceStatus: "failed",
      latestIntelligenceError: error,
      updatedAt: now,
    });
    return null;
  },
});
