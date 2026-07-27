import { makeFunctionReference } from "convex/server";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const syncProjectReference = makeFunctionReference<
  "mutation",
  { projectId: Id<"heliosProjects">; packageId: Id<"heliosBidPackages"> },
  null
>("heliosEngineeringShadow:syncProjectShadow");

const syncDocumentReference = makeFunctionReference<
  "mutation",
  { jobId: Id<"heliosIntelligenceJobs"> },
  null
>("heliosEngineeringShadow:syncDocumentShadow");

const syncPlanRunReference = makeFunctionReference<
  "mutation",
  { runId: Id<"heliosPlanRuns"> },
  null
>("heliosEngineeringShadow:syncPlanRunShadow");

const syncGeometryRunReference = makeFunctionReference<
  "mutation",
  { runId: Id<"heliosCivilGeometryRuns"> },
  null
>("heliosEngineeringShadow:syncGeometryRunShadow");

async function scheduleWithoutBlocking(
  operation: () => Promise<unknown>,
  label: string,
) {
  try {
    await operation();
  } catch (error) {
    console.error(`Helios engineering shadow scheduling failed (${label}).`, error);
  }
}

export async function scheduleProjectShadow(
  ctx: MutationCtx,
  projectId: Id<"heliosProjects">,
  packageId: Id<"heliosBidPackages">,
) {
  await scheduleWithoutBlocking(
    () => ctx.scheduler.runAfter(0, syncProjectReference, { projectId, packageId }),
    "project",
  );
}

export async function scheduleDocumentShadow(
  ctx: MutationCtx,
  jobId: Id<"heliosIntelligenceJobs">,
) {
  await scheduleWithoutBlocking(
    () => ctx.scheduler.runAfter(0, syncDocumentReference, { jobId }),
    "document",
  );
}

export async function schedulePlanRunShadow(
  ctx: MutationCtx,
  runId: Id<"heliosPlanRuns">,
) {
  await scheduleWithoutBlocking(
    () => ctx.scheduler.runAfter(0, syncPlanRunReference, { runId }),
    "plan",
  );
}

export async function scheduleGeometryRunShadow(
  ctx: MutationCtx,
  runId: Id<"heliosCivilGeometryRuns">,
) {
  await scheduleWithoutBlocking(
    () => ctx.scheduler.runAfter(0, syncGeometryRunReference, { runId }),
    "geometry",
  );
}
