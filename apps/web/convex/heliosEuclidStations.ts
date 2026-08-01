import {
  evaluateHeliosEuclidAlignmentPosition,
  evaluateHeliosEuclidStationOffsetPosition,
  type HeliosEuclidAlignmentPosition,
  type HeliosEuclidStationOffsetPosition,
  type HeliosEuclidProfileRole,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

export const evaluatePosition = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    input: v.object({
      alignmentId: v.string(),
      displayedStation: v.optional(v.number()),
      chainage: v.optional(v.number()),
      stationEquationId: v.optional(v.string()),
      profileId: v.optional(v.string()),
      profileRole: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args): Promise<HeliosEuclidAlignmentPosition> => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) throw new Error("Project not found.");
    const project = await ctx.db.get(projectId);
    if (!project || project.companyId !== companyId) throw new Error("Project not found.");
    const modelRecord = await ctx.db
      .query("heliosEuclidModels")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!modelRecord || modelRecord.companyId !== companyId) throw new Error("The project has no current canonical Euclid model.");
    const model = await reconstructEuclidModel(ctx, modelRecord);
    return evaluateHeliosEuclidAlignmentPosition(model, {
      alignmentId: args.input.alignmentId,
      displayedStation: args.input.displayedStation,
      chainage: args.input.chainage,
      stationEquationId: args.input.stationEquationId,
      profileId: args.input.profileId,
      profileRole: args.input.profileRole as HeliosEuclidProfileRole | undefined,
    });
  },
});

export const evaluateOffsetPosition = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    input: v.object({
      alignmentId: v.string(),
      displayedStation: v.optional(v.number()),
      chainage: v.optional(v.number()),
      stationEquationId: v.optional(v.string()),
      profileId: v.optional(v.string()),
      profileRole: v.optional(v.string()),
      offset: v.number(),
      pointElevation: v.optional(v.number()),
      verticalOffset: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args): Promise<HeliosEuclidStationOffsetPosition> => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) throw new Error("Project not found.");
    const project = await ctx.db.get(projectId);
    if (!project || project.companyId !== companyId) throw new Error("Project not found.");
    const modelRecord = await ctx.db
      .query("heliosEuclidModels")
      .withIndex("by_project_current", (query) => query.eq("projectId", projectId).eq("isCurrent", true))
      .first();
    if (!modelRecord || modelRecord.companyId !== companyId) throw new Error("The project has no current canonical Euclid model.");
    const model = await reconstructEuclidModel(ctx, modelRecord);
    return evaluateHeliosEuclidStationOffsetPosition(model, {
      alignmentId: args.input.alignmentId,
      displayedStation: args.input.displayedStation,
      chainage: args.input.chainage,
      stationEquationId: args.input.stationEquationId,
      profileId: args.input.profileId,
      profileRole: args.input.profileRole as HeliosEuclidProfileRole | undefined,
      offset: args.input.offset,
      pointElevation: args.input.pointElevation,
      verticalOffset: args.input.verticalOffset,
    });
  },
});
