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
} from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

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

    const active = await ctx.db
      .query("heliosIntelligenceJobs")
      .withIndex("by_project_status", (query) =>
        query.eq("projectId", project._id).eq("status", "synthesizing"),
      )
      .first();
    if (active) return { jobId: active._id, status: active.status };

    const now = Date.now();
    const jobId = await ctx.db.insert("heliosIntelligenceJobs", {
      companyId,
      projectId: project._id,
      kind: "project",
      status: "synthesizing",
      attempt: 1,
      createdAt: now,
      startedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(project._id, {
      intelligenceStatus: "processing",
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, synthesizeProjectReference, { jobId });
    return { jobId, status: "synthesizing" as const };
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
    const hasCompleted = documents.some(
      (document) => document.status === "completed",
    );
    const hasActive = documents.some((document) =>
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
      const existingSynthesis = await ctx.db
        .query("heliosIntelligenceJobs")
        .withIndex("by_project_status", (query) =>
          query.eq("projectId", job.projectId).eq("status", "synthesizing"),
        )
        .first();
      if (!existingSynthesis) {
        const projectJobId = await ctx.db.insert("heliosIntelligenceJobs", {
          companyId: job.companyId,
          projectId: job.projectId,
          kind: "project",
          status: "synthesizing",
          attempt: 1,
          createdAt: now,
          startedAt: now,
          updatedAt: now,
        });
        await ctx.db.patch(job.projectId, {
          intelligenceStatus: "processing",
          updatedAt: now,
        });
        await ctx.scheduler.runAfter(0, synthesizeProjectReference, {
          jobId: projectJobId,
        });
      }
    }
    return null;
  },
});

export const completeDocumentJob = internalMutation({
  args: {
    jobId: v.id("heliosIntelligenceJobs"),
    model: v.string(),
    result: v.any(),
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

    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) => query.eq("projectId", job.projectId))
      .collect();
    const active = documents.some((row) =>
      ["ready_for_intelligence", "queued", "uploading_to_openai", "analyzing"].includes(
        row.status,
      ),
    );
    const completed = documents.filter((row) => row.status === "completed");
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

    const existingSynthesis = await ctx.db
      .query("heliosIntelligenceJobs")
      .withIndex("by_project_status", (query) =>
        query.eq("projectId", job.projectId).eq("status", "synthesizing"),
      )
      .first();
    if (!existingSynthesis) {
      const projectJobId = await ctx.db.insert("heliosIntelligenceJobs", {
        companyId: job.companyId,
        projectId: job.projectId,
        kind: "project",
        status: "synthesizing",
        attempt: 1,
        createdAt: now,
        startedAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(job.projectId, {
        intelligenceStatus: "processing",
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, synthesizeProjectReference, {
        jobId: projectJobId,
      });
    }
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
    const analyses = await Promise.all(
      documents
        .filter((document) => document.status === "completed")
        .map(async (document) => {
          const analysis = await ctx.db
            .query("heliosDocumentIntelligence")
            .withIndex("by_document", (query) =>
              query.eq("documentId", document._id),
            )
            .first();
          return analysis ? { document, analysis } : null;
        }),
    );
    const evidence = await ctx.db
      .query("heliosEvidence")
      .withIndex("by_project", (query) =>
        query.eq("projectId", project._id),
      )
      .collect();
    return {
      job,
      project,
      analyses: analyses.filter((row) => row !== null),
      evidence,
    };
  },
});

export const completeProjectJob = internalMutation({
  args: {
    jobId: v.id("heliosIntelligenceJobs"),
    model: v.string(),
    result: v.any(),
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
    const evidenceById = new Map(
      evidence.map((row) => [String(row._id), row._id]),
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
    for (const row of previous) await ctx.db.delete(row._id);
    const now = Date.now();
    await ctx.db.insert("heliosProjectIntelligence", {
      companyId: job.companyId,
      projectId: job.projectId,
      model: args.model,
      schemaVersion: 1,
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
      confidence: result.confidence,
      findings: result.findings.map((finding) => ({
        ...finding,
        evidenceIds: toEvidenceIds(finding.evidenceIds),
      })),
      generatedAt: now,
    });
    await ctx.db.patch(job._id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });
    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) =>
        query.eq("projectId", job.projectId),
      )
      .collect();
    const hasFailed = documents.some((row) => row.status === "failed");
    await ctx.db.patch(job.projectId, {
      intelligenceStatus: hasFailed ? "partially_ready" : "ready_for_review",
      updatedAt: now,
    });
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
    await ctx.db.patch(job._id, {
      status: "failed",
      error: safeError(args.error),
      completedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(job.projectId, {
      intelligenceStatus: "failed",
      updatedAt: now,
    });
    return null;
  },
});
