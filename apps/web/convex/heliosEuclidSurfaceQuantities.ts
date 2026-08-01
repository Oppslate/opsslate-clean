import {
  calculateHeliosEuclidSurfaceQuantities,
  type HeliosEuclidSurfaceQuantityResult,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

export const calculateDraftQuantities = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    input: v.object({
      alignmentId: v.string(),
      chainageStart: v.optional(v.number()),
      chainageEnd: v.optional(v.number()),
      interval: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args): Promise<HeliosEuclidSurfaceQuantityResult> => {
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
    return calculateHeliosEuclidSurfaceQuantities(model, args.input);
  },
});
