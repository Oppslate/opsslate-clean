import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("Euclid Stage 4C stores immutable shadow-only horizontal solutions", async () => {
  const [schema, solver, scheduler] = await Promise.all([
    source("web/convex/schema.ts"),
    source("web/convex/heliosEuclidHorizontal.ts"),
    source("web/convex/heliosEuclidHorizontalSchedule.ts"),
  ]);
  assert.match(schema, /heliosEuclidHorizontalSolutions: defineTable/);
  assert.match(schema, /heliosEuclidHorizontalSolutionChunks: defineTable/);
  assert.match(schema, /shadowMode: v\.boolean/);
  assert.match(schema, /solutionFingerprint/);
  assert.match(solver, /solveEuclidHorizontalShadow = internalMutation/);
  assert.match(solver, /getHorizontalSolutionStatus = internalQuery/);
  assert.match(solver, /supersedeCurrentSolution/);
  assert.match(scheduler, /Failure-isolated scheduling/);
});

test("Euclid Stage 4C reconstructs only the stored canonical Euclid model", async () => {
  const [solver, domain] = await Promise.all([
    source("web/convex/heliosEuclidHorizontal.ts"),
    source("../packages/helios-domain/src/euclid-horizontal.ts"),
  ]);
  assert.match(solver, /heliosEuclidEntityChunks/);
  assert.match(solver, /heliosEuclidProvenance/);
  assert.match(solver, /payloadFingerprint/);
  assert.match(solver, /solveHeliosEuclidHorizontalControl/);
  assert.match(domain, /curve_arc_length/);
  assert.match(domain, /station_branch_unassigned/);
  assert.match(domain, /bearing_unparseable/);
  for (const implementation of [solver, domain]) {
    assert.doesNotMatch(implementation, /from "openai"|files\.create|responses\.create|storage\.get|storage\.getUrl|\.pdf\b/i);
  }
});

test("Euclid Stage 4C is scheduled only after canonical Euclid persistence", async () => {
  const writer = await source("web/convex/heliosEuclidShadow.ts");
  const chunkInsert = writer.indexOf('ctx.db.insert("heliosEuclidEntityChunks"');
  const schedule = writer.lastIndexOf("scheduleEuclidHorizontalSolution(ctx, modelId)");
  assert.ok(chunkInsert >= 0);
  assert.ok(schedule > chunkInsert);
});

test("Euclid Stage 4C does not cut over existing application readers or UI", async () => {
  const consumers = await Promise.all([
    source("web/convex/heliosGateway.ts"),
    source("web/convex/heliosEstimates.ts"),
    source("web/convex/heliosEstimateBuild.ts"),
    source("web/convex/heliosTakeoffIntelligence.ts"),
    source("web/convex/heliosAssistant.ts"),
    source("helios/src/components/estimate-cockpit-2.tsx"),
  ]);
  for (const consumer of consumers) {
    assert.doesNotMatch(consumer, /heliosEuclidHorizontalSolutions|heliosEuclidHorizontalSolutionChunks/);
  }
});
