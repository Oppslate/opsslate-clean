import {
  HELIOS_EUCLID_VERTICAL_DEFAULT_TOLERANCES,
  HELIOS_EUCLID_VERTICAL_SOLVER,
  HELIOS_EUCLID_VERTICAL_SOLVER_VERSION,
  HELIOS_EUCLID_VERTICAL_TOLERANCE_VERSION,
  buildHeliosEngineeringParityFingerprint,
  buildHeliosEuclidVerticalSolutionChunks,
  heliosEuclidVerticalSolutionFingerprint,
  solveHeliosEuclidVerticalProfiles,
  type HeliosEuclidModel,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";
import { scheduleEuclidIntegrationSolution } from "./heliosEuclidIntegrationSchedule";

const solveVerticalReference = makeFunctionReference<
  "mutation",
  { euclidModelId: Id<"heliosEuclidModels"> },
  unknown
>("heliosEuclidVertical:solveEuclidVerticalShadow");

function solutionKey(model: Doc<"heliosEuclidModels">) {
  return [
    "euclid-vertical",
    `model:${String(model._id)}`,
    `model-fingerprint:${model.modelFingerprint}`,
    `solver:${HELIOS_EUCLID_VERTICAL_SOLVER}`,
    `tolerances:${HELIOS_EUCLID_VERTICAL_TOLERANCE_VERSION}`,
  ].join("|");
}

async function supersedeCurrentSolution(ctx: MutationCtx, packageId: Id<"heliosBidPackages">) {
  const current = await ctx.db
    .query("heliosEuclidVerticalSolutions")
    .withIndex("by_package_current", (query) => query.eq("packageId", packageId).eq("isCurrent", true))
    .first();
  if (current) await ctx.db.patch(current._id, { isCurrent: false, status: "superseded", updatedAt: Date.now() });
}

async function storeFailure(ctx: MutationCtx, model: Doc<"heliosEuclidModels">, message: string) {
  const key = solutionKey(model);
  const existing = await ctx.db.query("heliosEuclidVerticalSolutions").withIndex("by_solution_key", (query) => query.eq("solutionKey", key)).first();
  if (existing?.isCurrent && existing.status === "failed") return String(existing._id);
  await supersedeCurrentSolution(ctx, model.packageId);
  const now = Date.now();
  const id = await ctx.db.insert("heliosEuclidVerticalSolutions", {
    companyId: model.companyId,
    projectId: model.projectId,
    packageId: model.packageId,
    packageRevision: model.packageRevision,
    euclidModelId: model._id,
    solutionKey: key,
    solver: HELIOS_EUCLID_VERTICAL_SOLVER,
    solverVersion: HELIOS_EUCLID_VERTICAL_SOLVER_VERSION,
    toleranceVersion: HELIOS_EUCLID_VERTICAL_TOLERANCE_VERSION,
    tolerances: HELIOS_EUCLID_VERTICAL_DEFAULT_TOLERANCES,
    sourceFingerprint: model.sourceFingerprint,
    modelFingerprint: model.modelFingerprint,
    solutionFingerprint: buildHeliosEngineeringParityFingerprint({ key, message }),
    status: "failed",
    isCurrent: true,
    shadowMode: model.shadowMode,
    profileCount: 0,
    passedProfileCount: 0,
    reviewProfileCount: 0,
    blockedProfileCount: 0,
    notApplicableProfileCount: 0,
    checkCount: 0,
    reviewCount: 0,
    blockingCount: 1,
    chunkCount: 0,
    lastError: message.slice(0, 600),
    createdBy: model.createdBy,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  });
  return String(id);
}

export const solveEuclidVerticalShadow = internalMutation({
  args: { euclidModelId: v.id("heliosEuclidModels") },
  handler: async (ctx, args) => {
    const stored = await ctx.db.get(args.euclidModelId);
    if (!stored?.isCurrent || stored.validationStatus !== "valid" || stored.status === "failed") return { status: "not_ready" as const };
    let model: HeliosEuclidModel;
    try {
      model = await reconstructEuclidModel(ctx, stored);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Euclid model reconstruction failed.";
      const solutionId = await storeFailure(ctx, stored, message);
      await scheduleEuclidIntegrationSolution(ctx, stored._id);
      return { status: "failed" as const, solutionId };
    }
    let solution;
    try {
      solution = solveHeliosEuclidVerticalProfiles(model);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Euclid vertical solution failed.";
      const solutionId = await storeFailure(ctx, stored, message);
      await scheduleEuclidIntegrationSolution(ctx, stored._id);
      return { status: "failed" as const, solutionId };
    }
    const fingerprint = heliosEuclidVerticalSolutionFingerprint(solution);
    const current = await ctx.db
      .query("heliosEuclidVerticalSolutions")
      .withIndex("by_package_current", (query) => query.eq("packageId", stored.packageId).eq("isCurrent", true))
      .first();
    if (current?.euclidModelId === stored._id && current.solutionFingerprint === fingerprint && current.status !== "failed") {
      await scheduleEuclidIntegrationSolution(ctx, stored._id);
      return { status: current.status, solutionId: String(current._id), reused: true };
    }

    const chunks = buildHeliosEuclidVerticalSolutionChunks(solution);
    await supersedeCurrentSolution(ctx, stored.packageId);
    const now = Date.now();
    const solutionId = await ctx.db.insert("heliosEuclidVerticalSolutions", {
      companyId: stored.companyId,
      projectId: stored.projectId,
      packageId: stored.packageId,
      packageRevision: stored.packageRevision,
      euclidModelId: stored._id,
      solutionKey: solutionKey(stored),
      solver: solution.solver,
      solverVersion: solution.solverVersion,
      toleranceVersion: solution.toleranceVersion,
      tolerances: solution.tolerances,
      sourceFingerprint: solution.sourceFingerprint,
      modelFingerprint: stored.modelFingerprint,
      solutionFingerprint: fingerprint,
      status: solution.status,
      isCurrent: true,
      shadowMode: stored.shadowMode,
      profileCount: solution.profileSolutions.length,
      passedProfileCount: solution.profileSolutions.filter((row) => row.status === "passed").length,
      reviewProfileCount: solution.profileSolutions.filter((row) => row.status === "review").length,
      blockedProfileCount: solution.profileSolutions.filter((row) => row.status === "blocked").length,
      notApplicableProfileCount: solution.profileSolutions.filter((row) => row.status === "not_applicable").length,
      checkCount: solution.checkCount,
      reviewCount: solution.reviewCount,
      blockingCount: solution.blockingCount,
      chunkCount: chunks.length,
      createdBy: stored.createdBy,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
    for (const chunk of chunks) {
      await ctx.db.insert("heliosEuclidVerticalSolutionChunks", {
        companyId: stored.companyId,
        projectId: stored.projectId,
        solutionId,
        profileId: chunk.profileId,
        chunkIndex: chunk.chunkIndex,
        checkCount: chunk.checkCount,
        payloadJson: chunk.payloadJson,
        payloadFingerprint: chunk.payloadFingerprint,
        createdAt: now,
      });
    }
    await scheduleEuclidIntegrationSolution(ctx, stored._id);
    return { status: solution.status, solutionId: String(solutionId), reused: false };
  },
});

export const solveCurrentProjectVerticalShadow = internalMutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    const model = await ctx.db
      .query("heliosEuclidModels")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!model || model.validationStatus !== "valid") return null;
    await ctx.scheduler.runAfter(0, solveVerticalReference, { euclidModelId: model._id });
    return { euclidModelId: String(model._id), scheduled: true };
  },
});

export const getVerticalSolutionStatus = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    const solution = await ctx.db
      .query("heliosEuclidVerticalSolutions")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!solution) return null;
    const chunks = await ctx.db
      .query("heliosEuclidVerticalSolutionChunks")
      .withIndex("by_solution", (query) => query.eq("solutionId", solution._id))
      .collect();
    return {
      solutionId: String(solution._id),
      euclidModelId: String(solution.euclidModelId),
      shadowMode: solution.shadowMode,
      status: solution.status,
      solver: solution.solver,
      solverVersion: solution.solverVersion,
      toleranceVersion: solution.toleranceVersion,
      profileCount: solution.profileCount,
      passedProfileCount: solution.passedProfileCount,
      reviewProfileCount: solution.reviewProfileCount,
      blockedProfileCount: solution.blockedProfileCount,
      checkCount: solution.checkCount,
      reviewCount: solution.reviewCount,
      blockingCount: solution.blockingCount,
      storedCheckCount: chunks.reduce((sum, row) => sum + row.checkCount, 0),
      solutionFingerprint: solution.solutionFingerprint,
      lastError: solution.lastError,
    };
  },
});
