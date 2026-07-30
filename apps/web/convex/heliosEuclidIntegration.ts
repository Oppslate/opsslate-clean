import {
  HELIOS_EUCLID_INTEGRATION_SOLVER,
  HELIOS_EUCLID_INTEGRATION_SOLVER_VERSION,
  buildHeliosEngineeringParityFingerprint,
  buildHeliosEuclidIntegrationSolutionChunks,
  heliosEuclidIntegrationSolutionFingerprint,
  solveHeliosEuclidEngineeringGraph,
  type HeliosEuclidControlGate,
  type HeliosEuclidGateStatus,
  type HeliosEuclidModel,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";
import { scheduleEuclidIntegrationSolution } from "./heliosEuclidIntegrationSchedule";

function solutionKey(model: Doc<"heliosEuclidModels">, horizontal: Doc<"heliosEuclidHorizontalSolutions">, vertical: Doc<"heliosEuclidVerticalSolutions">) {
  return [
    "euclid-integration",
    `model:${String(model._id)}`,
    `horizontal:${horizontal.solutionFingerprint}`,
    `vertical:${vertical.solutionFingerprint}`,
    `solver:${HELIOS_EUCLID_INTEGRATION_SOLVER}`,
  ].join("|");
}

function supportedStatus(status: string): HeliosEuclidGateStatus {
  if (["passed", "review", "blocked", "not_applicable", "failed"].includes(status)) return status as HeliosEuclidGateStatus;
  return "failed";
}

function scopeStatus(checks: Array<{ status?: string }>): Exclude<HeliosEuclidGateStatus, "failed"> {
  if (checks.some((row) => row.status === "block")) return "blocked";
  if (checks.some((row) => row.status === "review")) return "review";
  if (!checks.length || checks.every((row) => row.status === "not_applicable")) return "not_applicable";
  return "passed";
}

async function horizontalGate(
  ctx: MutationCtx,
  solution: Doc<"heliosEuclidHorizontalSolutions">,
  canonicalModelId: string,
): Promise<HeliosEuclidControlGate> {
  const chunks = await ctx.db.query("heliosEuclidHorizontalSolutionChunks").withIndex("by_solution", (query) => query.eq("solutionId", solution._id)).collect();
  if (chunks.length !== solution.chunkCount || chunks.reduce((sum, row) => sum + row.checkCount, 0) !== solution.checkCount) throw new Error("Horizontal solution chunks are incomplete.");
  const grouped = new Map<string, Array<{ status?: string }>>();
  for (const chunk of [...chunks].sort((left, right) => left.alignmentId.localeCompare(right.alignmentId) || left.chunkIndex - right.chunkIndex)) {
    const payload = JSON.parse(chunk.payloadJson) as Array<{ status?: string }>;
    if (!Array.isArray(payload) || payload.length !== chunk.checkCount || buildHeliosEngineeringParityFingerprint(payload) !== chunk.payloadFingerprint) throw new Error("Horizontal solution chunk failed fingerprint validation.");
    grouped.set(chunk.alignmentId, [...(grouped.get(chunk.alignmentId) || []), ...payload]);
  }
  return { euclidModelId: canonicalModelId, sourceFingerprint: solution.sourceFingerprint, solutionFingerprint: solution.solutionFingerprint, status: supportedStatus(solution.status), scopes: [...grouped].map(([id, checks]) => ({ id, status: scopeStatus(checks) })).sort((left, right) => left.id.localeCompare(right.id)) };
}

async function verticalGate(
  ctx: MutationCtx,
  solution: Doc<"heliosEuclidVerticalSolutions">,
  canonicalModelId: string,
): Promise<HeliosEuclidControlGate> {
  const chunks = await ctx.db.query("heliosEuclidVerticalSolutionChunks").withIndex("by_solution", (query) => query.eq("solutionId", solution._id)).collect();
  if (chunks.length !== solution.chunkCount || chunks.reduce((sum, row) => sum + row.checkCount, 0) !== solution.checkCount) throw new Error("Vertical solution chunks are incomplete.");
  const grouped = new Map<string, Array<{ status?: string }>>();
  for (const chunk of [...chunks].sort((left, right) => left.profileId.localeCompare(right.profileId) || left.chunkIndex - right.chunkIndex)) {
    const payload = JSON.parse(chunk.payloadJson) as Array<{ status?: string }>;
    if (!Array.isArray(payload) || payload.length !== chunk.checkCount || buildHeliosEngineeringParityFingerprint(payload) !== chunk.payloadFingerprint) throw new Error("Vertical solution chunk failed fingerprint validation.");
    grouped.set(chunk.profileId, [...(grouped.get(chunk.profileId) || []), ...payload]);
  }
  return { euclidModelId: canonicalModelId, sourceFingerprint: solution.sourceFingerprint, solutionFingerprint: solution.solutionFingerprint, status: supportedStatus(solution.status), scopes: [...grouped].map(([id, checks]) => ({ id, status: scopeStatus(checks) })).sort((left, right) => left.id.localeCompare(right.id)) };
}

async function supersedeCurrentSolution(ctx: MutationCtx, packageId: Id<"heliosBidPackages">) {
  const current = await ctx.db.query("heliosEuclidIntegrationSolutions").withIndex("by_package_current", (query) => query.eq("packageId", packageId).eq("isCurrent", true)).first();
  if (current) await ctx.db.patch(current._id, { isCurrent: false, status: "superseded", updatedAt: Date.now() });
}

async function storeFailure(
  ctx: MutationCtx,
  model: Doc<"heliosEuclidModels">,
  horizontal: Doc<"heliosEuclidHorizontalSolutions">,
  vertical: Doc<"heliosEuclidVerticalSolutions">,
  message: string,
) {
  const key = solutionKey(model, horizontal, vertical);
  const existing = await ctx.db.query("heliosEuclidIntegrationSolutions").withIndex("by_solution_key", (query) => query.eq("solutionKey", key)).first();
  if (existing?.isCurrent && existing.status === "failed") return String(existing._id);
  await supersedeCurrentSolution(ctx, model.packageId);
  const now = Date.now();
  const id = await ctx.db.insert("heliosEuclidIntegrationSolutions", {
    companyId: model.companyId,
    projectId: model.projectId,
    packageId: model.packageId,
    packageRevision: model.packageRevision,
    euclidModelId: model._id,
    horizontalSolutionId: horizontal._id,
    verticalSolutionId: vertical._id,
    solutionKey: key,
    solver: HELIOS_EUCLID_INTEGRATION_SOLVER,
    solverVersion: HELIOS_EUCLID_INTEGRATION_SOLVER_VERSION,
    sourceFingerprint: model.sourceFingerprint,
    modelFingerprint: model.modelFingerprint,
    horizontalSolutionFingerprint: horizontal.solutionFingerprint,
    verticalSolutionFingerprint: vertical.solutionFingerprint,
    solutionFingerprint: buildHeliosEngineeringParityFingerprint({ key, message }),
    status: "failed",
    isCurrent: true,
    shadowMode: model.shadowMode,
    nodeCount: 0,
    edgeCount: 0,
    alignmentCount: 0,
    readinessCount: 0,
    readyCount: 0,
    reviewCount: 0,
    blockedCount: 1,
    unavailableCount: 0,
    checkCount: 1,
    chunkCount: 0,
    lastError: message.slice(0, 600),
    createdBy: model.createdBy,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  });
  return String(id);
}

export const solveEuclidIntegrationShadow = internalMutation({
  args: { euclidModelId: v.id("heliosEuclidModels"), attempt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const modelRecord = await ctx.db.get(args.euclidModelId);
    if (!modelRecord?.isCurrent || modelRecord.validationStatus !== "valid" || modelRecord.status === "failed") return { status: "not_ready" as const };
    const [horizontal, vertical] = await Promise.all([
      ctx.db.query("heliosEuclidHorizontalSolutions").withIndex("by_package_current", (query) => query.eq("packageId", modelRecord.packageId).eq("isCurrent", true)).first(),
      ctx.db.query("heliosEuclidVerticalSolutions").withIndex("by_package_current", (query) => query.eq("packageId", modelRecord.packageId).eq("isCurrent", true)).first(),
    ]);
    if (!horizontal || !vertical || horizontal.euclidModelId !== modelRecord._id || vertical.euclidModelId !== modelRecord._id) {
      const attempt = args.attempt || 0;
      if (attempt < 6) await scheduleEuclidIntegrationSolution(ctx, modelRecord._id, attempt + 1);
      return { status: "awaiting_control_solvers" as const, attempt };
    }

    let model: HeliosEuclidModel;
    let horizontalControl: HeliosEuclidControlGate;
    let verticalControl: HeliosEuclidControlGate;
    try {
      [model, horizontalControl, verticalControl] = await Promise.all([
        reconstructEuclidModel(ctx, modelRecord),
        horizontalGate(ctx, horizontal, modelRecord.modelKey),
        verticalGate(ctx, vertical, modelRecord.modelKey),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Euclid integration inputs failed validation.";
      const solutionId = await storeFailure(ctx, modelRecord, horizontal, vertical, message);
      return { status: "failed" as const, solutionId };
    }
    let solution;
    try {
      solution = solveHeliosEuclidEngineeringGraph({ model, horizontal: horizontalControl, vertical: verticalControl });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Euclid engineering graph failed.";
      const solutionId = await storeFailure(ctx, modelRecord, horizontal, vertical, message);
      return { status: "failed" as const, solutionId };
    }
    const fingerprint = heliosEuclidIntegrationSolutionFingerprint(solution);
    const current = await ctx.db.query("heliosEuclidIntegrationSolutions").withIndex("by_package_current", (query) => query.eq("packageId", modelRecord.packageId).eq("isCurrent", true)).first();
    if (current?.euclidModelId === modelRecord._id && current.solutionFingerprint === fingerprint && current.status !== "failed") return { status: current.status, solutionId: String(current._id), reused: true };

    const chunks = buildHeliosEuclidIntegrationSolutionChunks(solution);
    await supersedeCurrentSolution(ctx, modelRecord.packageId);
    const now = Date.now();
    const solutionId = await ctx.db.insert("heliosEuclidIntegrationSolutions", {
      companyId: modelRecord.companyId,
      projectId: modelRecord.projectId,
      packageId: modelRecord.packageId,
      packageRevision: modelRecord.packageRevision,
      euclidModelId: modelRecord._id,
      horizontalSolutionId: horizontal._id,
      verticalSolutionId: vertical._id,
      solutionKey: solutionKey(modelRecord, horizontal, vertical),
      solver: solution.solver,
      solverVersion: solution.solverVersion,
      sourceFingerprint: solution.sourceFingerprint,
      modelFingerprint: solution.modelFingerprint,
      horizontalSolutionFingerprint: solution.horizontalSolutionFingerprint,
      verticalSolutionFingerprint: solution.verticalSolutionFingerprint,
      solutionFingerprint: fingerprint,
      status: solution.status,
      isCurrent: true,
      shadowMode: modelRecord.shadowMode,
      nodeCount: solution.nodes.length,
      edgeCount: solution.edges.length,
      alignmentCount: model.alignments.length,
      readinessCount: solution.readiness.length,
      readyCount: solution.readyCount,
      reviewCount: solution.reviewCount,
      blockedCount: solution.blockedCount,
      unavailableCount: solution.unavailableCount,
      checkCount: solution.checks.length,
      chunkCount: chunks.length,
      createdBy: modelRecord.createdBy,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
    for (const chunk of chunks) await ctx.db.insert("heliosEuclidIntegrationSolutionChunks", { companyId: modelRecord.companyId, projectId: modelRecord.projectId, solutionId, chunkIndex: chunk.chunkIndex, itemCount: chunk.itemCount, payloadJson: chunk.payloadJson, payloadFingerprint: chunk.payloadFingerprint, createdAt: now });
    return { status: solution.status, solutionId: String(solutionId), reused: false };
  },
});

export const getIntegrationSolutionStatus = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    const solution = await ctx.db.query("heliosEuclidIntegrationSolutions").withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true)).first();
    if (!solution) return null;
    const chunks = await ctx.db.query("heliosEuclidIntegrationSolutionChunks").withIndex("by_solution", (query) => query.eq("solutionId", solution._id)).collect();
    return { solutionId: String(solution._id), euclidModelId: String(solution.euclidModelId), shadowMode: solution.shadowMode, status: solution.status, solver: solution.solver, solverVersion: solution.solverVersion, nodeCount: solution.nodeCount, edgeCount: solution.edgeCount, alignmentCount: solution.alignmentCount, readinessCount: solution.readinessCount, readyCount: solution.readyCount, reviewCount: solution.reviewCount, blockedCount: solution.blockedCount, unavailableCount: solution.unavailableCount, checkCount: solution.checkCount, storedItemCount: chunks.reduce((sum, row) => sum + row.itemCount, 0), solutionFingerprint: solution.solutionFingerprint, lastError: solution.lastError };
  },
});
