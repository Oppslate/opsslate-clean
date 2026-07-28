import { makeFunctionReference } from "convex/server";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const solveEuclidVerticalShadow = makeFunctionReference<
  "mutation",
  { euclidModelId: Id<"heliosEuclidModels"> },
  unknown
>("heliosEuclidVertical:solveEuclidVerticalShadow");

/** Failure-isolated scheduling keeps Stage 4B canonical persistence authoritative. */
export async function scheduleEuclidVerticalSolution(
  ctx: MutationCtx,
  euclidModelId: Id<"heliosEuclidModels">,
) {
  await ctx.scheduler.runAfter(0, solveEuclidVerticalShadow, { euclidModelId });
}
