import { makeFunctionReference } from "convex/server";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const solveEuclidHorizontalShadow = makeFunctionReference<
  "mutation",
  { euclidModelId: Id<"heliosEuclidModels"> },
  unknown
>("heliosEuclidHorizontal:solveEuclidHorizontalShadow");

/** Failure-isolated scheduling keeps Stage 4B canonical persistence authoritative. */
export async function scheduleEuclidHorizontalSolution(
  ctx: MutationCtx,
  euclidModelId: Id<"heliosEuclidModels">,
) {
  await ctx.scheduler.runAfter(0, solveEuclidHorizontalShadow, { euclidModelId });
}
