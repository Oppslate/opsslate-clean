import { normalizeCivilGeometryReviewInput, parseCivilGeometryDocument } from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { scheduleGeometryRunShadow } from "./heliosEngineeringShadowSchedule";

const PROCESSING_VERSION = 1;
const startGeometryDocumentReference = makeFunctionReference<"action", { jobId: Id<"heliosCivilGeometryJobs"> }, null>("heliosCivilGeometryActions:startGeometryDocument");

async function finalizeGeometryRun(ctx: MutationCtx, runId: Id<"heliosCivilGeometryRuns">) {
  const run = await ctx.db.get(runId);
  if (!run) return;
  const jobs = await ctx.db.query("heliosCivilGeometryJobs").withIndex("by_run", (query) => query.eq("geometryRunId", runId)).collect();
  if (jobs.some((job) => !["completed", "failed"].includes(job.status))) return false;
  const records = await ctx.db.query("heliosCivilGeometryRecords").withIndex("by_run_created", (query) => query.eq("geometryRunId", runId)).collect();
  const failed = jobs.filter((job) => job.status === "failed");
  const now = Date.now();
  await ctx.db.patch(runId, {
    status: jobs.every((job) => job.status === "failed") ? "failed" : failed.length ? "partially_ready" : "ready_for_review",
    model: jobs.find((job) => job.model)?.model,
    recordCount: records.filter((record) => record.status !== "rejected" && record.status !== "superseded").length,
    acceptedRecordCount: records.filter((record) => record.status === "accepted").length,
    unresolvedIssueCount: records.reduce((sum, record) => sum + record.unresolvedIssues.length, 0),
    updatedAt: now,
    completedAt: now,
  });
  await scheduleGeometryRunShadow(ctx, runId);
  return true;
}

export const reviewGeometry = internalMutation({
  args: { principal: heliosPrincipalValidator, projectId: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project || project.companyId !== companyId) throw new Error("Project not found.");
    const input = normalizeCivilGeometryReviewInput(args.input);
    if (input.action === "request_reconstruction") {
      if (!project.activePackageId) throw new Error("Finalize a current bid package first.");
      const bidPackage = await ctx.db.get(project.activePackageId);
      if (!bidPackage || bidPackage.companyId !== companyId) throw new Error("Current bid package not found.");
      const planRun = await ctx.db.query("heliosPlanRuns").withIndex("by_package_current", (query) => query.eq("packageId", bidPackage._id).eq("isCurrent", true)).first();
      if (!planRun || !["ready_for_review", "partially_ready"].includes(planRun.status)) throw new Error("Complete plan reconstruction before building civil geometry.");
      const current = await ctx.db.query("heliosCivilGeometryRuns").withIndex("by_plan_current", (query) => query.eq("planRunId", planRun._id).eq("isCurrent", true)).first();
      if (current && ["queued", "processing", "ready_for_review", "partially_ready"].includes(current.status)) return { runId: String(current._id), status: current.status, reused: true };
      if (current) await ctx.db.patch(current._id, { isCurrent: false, updatedAt: Date.now() });
      const planJobs = await ctx.db.query("heliosPlanJobs").withIndex("by_run", (query) => query.eq("runId", planRun._id)).collect();
      const documentIds = [...new Set(planJobs.filter((job) => job.status === "completed").map((job) => job.documentId))];
      if (!documentIds.length) throw new Error("No completed plan documents are available for geometry reconstruction.");
      const now = Date.now();
      const runId = await ctx.db.insert("heliosCivilGeometryRuns", {
        companyId, projectId: project._id, packageId: bidPackage._id, packageRevision: bidPackage.revision, planRunId: planRun._id,
        isCurrent: true, status: "queued", sourceDocumentCount: documentIds.length, recordCount: 0, acceptedRecordCount: 0,
        unresolvedIssueCount: 0, processingVersion: PROCESSING_VERSION, createdBy: user._id, createdAt: now, updatedAt: now,
      });
      await ctx.db.insert("heliosCivilGeometryReviewEvents", {
        companyId, projectId: project._id, packageId: bidPackage._id, geometryRunId: runId, action: "request_reconstruction",
        reviewerUserId: user._id, reviewerName: user.name, decisionValue: "queued", createdAt: now,
      });
      for (const documentId of documentIds) {
        const jobId = await ctx.db.insert("heliosCivilGeometryJobs", {
          companyId, projectId: project._id, packageId: bidPackage._id, geometryRunId: runId, planRunId: planRun._id,
          documentId, status: "queued", createdAt: now, updatedAt: now,
        });
        await ctx.scheduler.runAfter(0, startGeometryDocumentReference, { jobId });
      }
      return { runId: String(runId), status: "queued", reused: false };
    }
    const recordId = ctx.db.normalizeId("heliosCivilGeometryRecords", input.recordId || "");
    const record = recordId ? await ctx.db.get(recordId) : null;
    if (!record || record.companyId !== companyId || record.projectId !== project._id) throw new Error("Civil-geometry record not found.");
    const run = await ctx.db.get(record.geometryRunId);
    if (!run || !run.isCurrent || run.planRunId === undefined) throw new Error("Civil-geometry record is not current.");
    if (record.status !== "proposed") throw new Error("Only proposed civil geometry can be reviewed.");
    const now = Date.now();
    const status = input.action === "accept_geometry" ? "accepted" as const : "rejected" as const;
    await ctx.db.patch(record._id, { status, reviewedBy: user._id, reviewedByName: user.name, reviewedAt: now, updatedAt: now });
    await ctx.db.insert("heliosCivilGeometryReviewEvents", {
      companyId, projectId: project._id, packageId: record.packageId, geometryRunId: record.geometryRunId, recordId: record._id,
      action: input.action, reviewerUserId: user._id, reviewerName: user.name, previousValue: record.status, decisionValue: status, createdAt: now,
    });
    await finalizeGeometryRun(ctx, record.geometryRunId);
    return { runId: String(record.geometryRunId), recordId: String(record._id), status };
  },
});

export const loadGeometryJob = internalQuery({
  args: { jobId: v.id("heliosCivilGeometryJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const [run, project, document, pages] = await Promise.all([
      ctx.db.get(job.geometryRunId), ctx.db.get(job.projectId), ctx.db.get(job.documentId),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", job.planRunId)).collect(),
    ]);
    if (!run || !run.isCurrent || !project || !document) return null;
    return {
      job, run, project, document,
      pages: pages.filter((page) => page.documentId === job.documentId).map((page) => ({
        physicalPageNumber: page.physicalPageNumber, sheetNumber: page.sheetNumber, title: page.title,
        views: page.views.map((view) => ({ viewKey: view.viewKey, viewType: view.viewType, label: view.label })),
      })),
    };
  },
});

export const markGeometryUploading = internalMutation({
  args: { jobId: v.id("heliosCivilGeometryJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId); if (!job || job.status !== "queued") return false;
    const now = Date.now(); await ctx.db.patch(job._id, { status: "uploading", startedAt: now, updatedAt: now }); await ctx.db.patch(job.geometryRunId, { status: "processing", updatedAt: now }); return true;
  },
});

export const markGeometryAnalyzing = internalMutation({
  args: { jobId: v.id("heliosCivilGeometryJobs"), openaiFileId: v.string(), openaiResponseId: v.string(), model: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId); if (!job || job.status !== "uploading") return false;
    await ctx.db.patch(job._id, { status: "analyzing", openaiFileId: args.openaiFileId, openaiResponseId: args.openaiResponseId, model: args.model, updatedAt: Date.now() }); return true;
  },
});

export const completeGeometryJob = internalMutation({
  args: { jobId: v.id("heliosCivilGeometryJobs"), model: v.string(), result: v.any() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId); if (!job || job.status !== "analyzing") return null;
    const pages = await ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", job.planRunId)).collect();
    const documentPages = pages.filter((page) => page.documentId === job.documentId);
    const parsed = parseCivilGeometryDocument(args.result, Math.max(...documentPages.map((page) => page.physicalPageNumber), 1));
    const now = Date.now();
    for (const record of parsed.records) {
      const page = documentPages.find((candidate) => candidate.physicalPageNumber === record.physicalPageNumber);
      if (!page) continue;
      const view = page.views.find((candidate) => candidate.viewKey === record.viewKey) || page.views.find((candidate) => candidate.measurable);
      if (!view) continue;
      await ctx.db.insert("heliosCivilGeometryRecords", {
        companyId: job.companyId, projectId: job.projectId, packageId: job.packageId, geometryRunId: job.geometryRunId, planRunId: job.planRunId,
        documentId: job.documentId, pageId: page._id, viewKey: view.viewKey, geometryType: record.geometryType, authority: record.authority,
        alignmentName: record.alignmentName, sourceLocator: record.sourceLocator, horizontalPoints: record.horizontalPoints,
        horizontalSegments: record.horizontalSegments, stationEquations: record.stationEquations,
        verticalPoints: record.verticalPoints, crossSectionPoints: record.crossSectionPoints, invertPoints: record.invertPoints,
        materialLayers: record.materialLayers, units: record.units, confidence: record.confidence, unresolvedIssues: record.unresolvedIssues,
        status: "proposed", createdAt: now, updatedAt: now,
      });
    }
    await ctx.db.patch(job._id, { status: "completed", model: args.model, completedAt: now, updatedAt: now });
    await finalizeGeometryRun(ctx, job.geometryRunId);
    return null;
  },
});

export const failGeometryJob = internalMutation({
  args: { jobId: v.id("heliosCivilGeometryJobs"), error: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId); if (!job || ["completed", "failed"].includes(job.status)) return null;
    const now = Date.now(); await ctx.db.patch(job._id, { status: "failed", error: args.error.slice(0, 600), completedAt: now, updatedAt: now }); await finalizeGeometryRun(ctx, job.geometryRunId); return null;
  },
});
