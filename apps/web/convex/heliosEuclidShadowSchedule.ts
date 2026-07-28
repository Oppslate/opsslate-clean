import { makeFunctionReference } from "convex/server";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const syncEuclidReference = makeFunctionReference<
  "mutation",
  { geometryRunId: Id<"heliosCivilGeometryRuns">; attempt?: number },
  unknown
>("heliosEuclidShadow:syncEuclidRunShadow");

export async function scheduleEuclidShadow(
  ctx: MutationCtx,
  geometryRunId: Id<"heliosCivilGeometryRuns">,
  delayMilliseconds = 15_000,
) {
  try {
    await ctx.scheduler.runAfter(delayMilliseconds, syncEuclidReference, {
      geometryRunId,
      attempt: 0,
    });
  } catch (error) {
    console.error("Euclid shadow scheduling failed without affecting the authoritative geometry run.", error);
  }
}
