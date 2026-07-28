import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("Euclid Stage 4D stores immutable shadow-only vertical solutions", async () => {
  const [schema, solver, scheduler] = await Promise.all([
    source("web/convex/schema.ts"),
    source("web/convex/heliosEuclidVertical.ts"),
    source("web/convex/heliosEuclidVerticalSchedule.ts"),
  ]);
  assert.match(schema, /heliosEuclidVerticalSolutions: defineTable/);
  assert.match(schema, /heliosEuclidVerticalSolutionChunks: defineTable/);
  assert.match(schema, /profileCount: v\.number/);
  assert.match(schema, /shadowMode: v\.boolean/);
  assert.match(solver, /solveEuclidVerticalShadow = internalMutation/);
  assert.match(solver, /getVerticalSolutionStatus = internalQuery/);
  assert.match(solver, /supersedeCurrentSolution/);
  assert.match(scheduler, /Failure-isolated scheduling/);
});

test("Euclid Stage 4D solves only the stored canonical Euclid record", async () => {
  const [vertical, sharedReader, domain] = await Promise.all([
    source("web/convex/heliosEuclidVertical.ts"),
    source("web/convex/heliosEuclidHorizontal.ts"),
    source("../packages/helios-domain/src/euclid-vertical.ts"),
  ]);
  assert.match(vertical, /reconstructEuclidModel/);
  assert.match(vertical, /solveHeliosEuclidVerticalProfiles/);
  assert.match(sharedReader, /heliosEuclidEntityChunks/);
  assert.match(sharedReader, /heliosEuclidProvenance/);
  assert.match(sharedReader, /payloadFingerprint/);
  assert.match(domain, /incoming_tangent_closure/);
  assert.match(domain, /curve_controls_unmodeled/);
  assert.match(domain, /cannot extrapolate beyond PVC\/PVT/);
  for (const implementation of [vertical, domain]) {
    assert.doesNotMatch(implementation, /from "openai"|files\.create|responses\.create|storage\.get|storage\.getUrl|\.pdf\b/i);
  }
});

test("Euclid Stage 4D is scheduled only after canonical Euclid persistence", async () => {
  const writer = await source("web/convex/heliosEuclidShadow.ts");
  const chunkInsert = writer.indexOf('ctx.db.insert("heliosEuclidEntityChunks"');
  const schedule = writer.lastIndexOf("scheduleEuclidVerticalSolution(ctx, modelId)");
  assert.ok(chunkInsert >= 0);
  assert.ok(schedule > chunkInsert);
});

test("Euclid Stage 4D does not cut over existing application readers or UI", async () => {
  const consumers = await Promise.all([
    source("web/convex/heliosGateway.ts"),
    source("web/convex/heliosEstimates.ts"),
    source("web/convex/heliosEstimateBuild.ts"),
    source("web/convex/heliosTakeoffIntelligence.ts"),
    source("web/convex/heliosAssistant.ts"),
    source("helios/src/components/estimate-cockpit-2.tsx"),
  ]);
  for (const consumer of consumers) {
    assert.doesNotMatch(consumer, /heliosEuclidVerticalSolutions|heliosEuclidVerticalSolutionChunks/);
  }
});
