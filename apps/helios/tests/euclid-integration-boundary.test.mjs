import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("Euclid Stage 4E stores an immutable shadow relationship and readiness result", async () => {
  const [schema, integration, scheduler] = await Promise.all([
    source("web/convex/schema.ts"),
    source("web/convex/heliosEuclidIntegration.ts"),
    source("web/convex/heliosEuclidIntegrationSchedule.ts"),
  ]);
  assert.match(schema, /heliosEuclidIntegrationSolutions: defineTable/);
  assert.match(schema, /heliosEuclidIntegrationSolutionChunks: defineTable/);
  assert.match(schema, /horizontalSolutionId: v\.id\("heliosEuclidHorizontalSolutions"\)/);
  assert.match(schema, /verticalSolutionId: v\.id\("heliosEuclidVerticalSolutions"\)/);
  assert.match(integration, /solveEuclidIntegrationShadow = internalMutation/);
  assert.match(integration, /getIntegrationSolutionStatus = internalQuery/);
  assert.match(integration, /supersedeCurrentSolution/);
  assert.match(scheduler, /waits for both independent control solvers/);
});

test("Euclid Stage 4E waits for fingerprint-verified 4C and 4D results", async () => {
  const integration = await source("web/convex/heliosEuclidIntegration.ts");
  assert.match(integration, /horizontalGate/);
  assert.match(integration, /verticalGate/);
  assert.match(integration, /payloadFingerprint/);
  assert.match(integration, /awaiting_control_solvers/);
  assert.match(integration, /horizontal\.euclidModelId !== modelRecord\._id/);
  assert.match(integration, /vertical\.euclidModelId !== modelRecord\._id/);
});

test("Euclid Stage 4E translates stored database identity back to the canonical contract model key", async () => {
  const [integration, cockpit] = await Promise.all([
    source("web/convex/heliosEuclidIntegration.ts"),
    source("web/convex/heliosEuclidCockpit.ts"),
  ]);
  assert.match(integration, /horizontalGate\(ctx, horizontal, modelRecord\.modelKey\)/);
  assert.match(integration, /verticalGate\(ctx, vertical, modelRecord\.modelKey\)/);
  assert.match(integration, /async function horizontalGate[\s\S]*?return \{ euclidModelId: canonicalModelId/);
  assert.match(integration, /async function verticalGate[\s\S]*?return \{ euclidModelId: canonicalModelId/);
  assert.match(cockpit, /reconstructIntegrationSolution\(ctx, solutionRecord, modelRecord\.modelKey\)/);
  assert.match(cockpit, /export async function reconstructIntegrationSolution[\s\S]*?euclidModelId: canonicalModelId/);
});

test("Euclid Stage 4E is scheduled only after each independent solver persists its chunks", async () => {
  const [horizontal, vertical] = await Promise.all([
    source("web/convex/heliosEuclidHorizontal.ts"),
    source("web/convex/heliosEuclidVertical.ts"),
  ]);
  for (const [solver, table] of [[horizontal, "heliosEuclidHorizontalSolutionChunks"], [vertical, "heliosEuclidVerticalSolutionChunks"]]) {
    const chunkInsert = solver.indexOf(`ctx.db.insert("${table}"`);
    const schedule = solver.lastIndexOf("scheduleEuclidIntegrationSolution(ctx, stored._id)");
    assert.ok(chunkInsert >= 0);
    assert.ok(schedule > chunkInsert);
  }
});

test("Euclid Stage 4E consumes canonical records without PDF, storage, or OpenAI access", async () => {
  const [integration, domain] = await Promise.all([
    source("web/convex/heliosEuclidIntegration.ts"),
    source("../packages/helios-domain/src/euclid-integration.ts"),
  ]);
  assert.match(integration, /reconstructEuclidModel/);
  assert.match(domain, /relationship_semantics/);
  assert.match(domain, /alignment_station_extent/);
  assert.match(domain, /pipe connectivity must be explicitly confirmed/);
  for (const implementation of [integration, domain]) assert.doesNotMatch(implementation, /from "openai"|files\.create|responses\.create|storage\.get|storage\.getUrl|\.pdf\b/i);
});

test("Euclid Stage 4E does not cut over existing quantity, assistant, estimate, or cockpit readers", async () => {
  const consumers = await Promise.all([
    source("web/convex/heliosTakeoffIntelligence.ts"),
    source("web/convex/heliosAssistant.ts"),
    source("web/convex/heliosEstimates.ts"),
    source("web/convex/heliosEstimateBuild.ts"),
    source("helios/src/components/estimate-cockpit-2.tsx"),
  ]);
  for (const consumer of consumers) assert.doesNotMatch(consumer, /heliosEuclidIntegrationSolutions|heliosEuclidIntegrationSolutionChunks/);
});
