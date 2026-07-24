import {
  normalizeFindingReviewInput,
  type HeliosFindingReviewStatus,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

const queueReviewedReanalysisReference = makeFunctionReference<
  "mutation",
  {
    projectId: Id<"heliosProjects">;
    intelligenceId: Id<"heliosProjectIntelligence">;
  },
  Id<"heliosIntelligenceJobs"> | null
>("heliosIntelligence:queueReviewedReanalysis");

function reviewStatus(action: string): Exclude<
  HeliosFindingReviewStatus,
  "needs_review"
> {
  if (action === "approve") return "approved";
  if (action === "correct") return "corrected";
  if (action === "reject") return "rejected";
  if (action === "request_reanalysis") return "reanalysis_requested";
  return "superseded";
}

export const reviewFinding = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    intelligenceId: v.string(),
    findingId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const intelligenceId = ctx.db.normalizeId(
      "heliosProjectIntelligence",
      args.intelligenceId,
    );
    if (!projectId || !intelligenceId) {
      throw new Error("Finding was not found.");
    }
    const [project, intelligence] = await Promise.all([
      ctx.db.get(projectId),
      ctx.db.get(intelligenceId),
    ]);
    if (
      !project ||
      !intelligence ||
      project.companyId !== companyId ||
      intelligence.companyId !== companyId ||
      intelligence.projectId !== project._id ||
      intelligence.isCurrent === false
    ) {
      throw new Error("Finding was not found.");
    }
    const currentIntelligence = await ctx.db
      .query("heliosProjectIntelligence")
      .withIndex("by_project", (query) => query.eq("projectId", project._id))
      .order("desc")
      .first();
    if (
      !currentIntelligence ||
      currentIntelligence._id !== intelligence._id ||
      (project.currentPackageRevision || 0) >
        (intelligence.packageRevision || 0) ||
      ["queued", "processing"].includes(project.intelligenceStatus)
    ) {
      throw new Error(
        "This intelligence snapshot is not available for review.",
      );
    }

    const findingPrefix = `${intelligence._id}:finding:`;
    if (!args.findingId.startsWith(findingPrefix)) {
      throw new Error("Finding was not found.");
    }
    const findingIndex = Number(args.findingId.slice(findingPrefix.length));
    if (
      !Number.isSafeInteger(findingIndex) ||
      findingIndex < 0 ||
      findingIndex >= intelligence.findings.length
    ) {
      throw new Error("Finding was not found.");
    }

    const input = normalizeFindingReviewInput(args.input);
    if (input.action === "request_reanalysis") {
      const priorEvents = await ctx.db
        .query("heliosFindingReviewEvents")
        .withIndex("by_intelligence_finding_created", (query) =>
          query
            .eq("intelligenceId", intelligence._id)
            .eq("findingId", args.findingId),
        )
        .order("desc")
        .first();
      if (priorEvents?.status === "reanalysis_requested") {
        throw new Error("Reanalysis is already requested for this finding.");
      }
    }

    const now = Date.now();
    const status = reviewStatus(input.action);
    const eventId = await ctx.db.insert("heliosFindingReviewEvents", {
      companyId,
      projectId: project._id,
      intelligenceId: intelligence._id,
      generationId: intelligence.generationId,
      findingId: args.findingId,
      findingIndex,
      action: input.action,
      status,
      correctedTitle: input.correctedTitle,
      correctedDetail: input.correctedDetail,
      trade: input.trade,
      comment: input.comment,
      reviewerUserId: user._id,
      reviewerName: user.name,
      createdAt: now,
    });
    if (input.action === "request_reanalysis") {
      await ctx.db.patch(project._id, {
        intelligenceStatus: "queued",
        latestIntelligenceError: undefined,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, queueReviewedReanalysisReference, {
        projectId: project._id,
        intelligenceId: intelligence._id,
      });
    }
    return {
      id: String(eventId),
      action: input.action,
      status,
      reviewerName: user.name,
      correctedTitle: input.correctedTitle,
      correctedDetail: input.correctedDetail,
      trade: input.trade,
      comment: input.comment,
      createdAt: now,
    };
  },
});
