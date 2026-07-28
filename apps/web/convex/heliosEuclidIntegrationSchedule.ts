import { makeFunctionReference } from "convex/server";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const solveEuclidIntegrationShadow = makeFunctionReference<
  "mutation",
  { euclidModelId: Id<"heliosEuclidModels">; attempt?: number },
  unknown
>("heliosEuclidIntegration:solveEuclidIntegrationShadow");

/** Stage 4E waits for both independent control solvers without coupling their commits. */
export async function scheduleEuclidIntegrationSolution(
  ctx: MutationCtx,
  euclidModelId: Id<"heliosEuclidModels">,
  attempt = 0,
) {
  await ctx.scheduler.runAfter(attempt ? Math.min(8_000, 250 * (2 ** attempt)) : 0, solveEuclidIntegrationShadow, { euclidModelId, attempt });
}
