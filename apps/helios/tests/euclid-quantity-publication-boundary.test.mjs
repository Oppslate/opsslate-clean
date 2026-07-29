import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4K publication is same-origin, authenticated, and tenant-authorized", async () => {
  const [route, gateway, mutation] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/quantity-publications/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/heliosEuclidQuantityPublications.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /euclid\/quantity-publications/);
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(mutation, /requireHeliosPrincipal/);
  assert.match(mutation, /project\.companyId !== companyId/);
});

test("Euclid Stage 4K publishes only current promoted geometry with a passing graph", async () => {
  const mutation = await read("../../web/convex/heliosEuclidQuantityPublications.ts");
  assert.match(mutation, /canonicalOrigin !== "reviewed_candidate"/);
  assert.match(mutation, /modelRecord\.shadowMode/);
  assert.match(mutation, /solutionRecord\.status !== "passed"/);
  assert.match(mutation, /heliosEuclidPromotions/);
  assert.match(mutation, /buildHeliosEuclidQuantityCandidates/);
  assert.match(mutation, /candidate\.fingerprint|selected\.fingerprint/);
});

test("Euclid Stage 4K creates proposed estimate quantity and immutable lineage without overwriting estimate records", async () => {
  const [schema, mutation] = await Promise.all([
    read("../../web/convex/schema.ts"),
    read("../../web/convex/heliosEuclidQuantityPublications.ts"),
  ]);
  assert.match(schema, /heliosEuclidQuantityPublications: defineTable/);
  assert.match(mutation, /ctx\.db\.insert\("heliosEstimateQuantities"/);
  assert.match(mutation, /ctx\.db\.insert\("heliosEuclidQuantityPublications"/);
  assert.match(mutation, /ctx\.db\.insert\("heliosEstimateDecisionEvents"/);
  assert.match(mutation, /reviewStatus: "proposed"/);
  assert.match(mutation, /origin: "human"/);
  assert.match(mutation, /Production quantity unit/);
  assert.doesNotMatch(mutation, /ctx\.db\.patch|ctx\.db\.replace|ctx\.db\.delete/);
  assert.doesNotMatch(mutation, /openai|ctx\.storage|storageId|application\/pdf/i);
});

test("Euclid Stage 4K cockpit requires explicit cost-code mapping and explains protected records", async () => {
  const component = await read("../src/components/euclid-cockpit.tsx");
  assert.match(component, /Send to estimate/);
  assert.match(component, /Select the receiving cost code/);
  assert.match(component, /Comparative — check against the estimate/);
  assert.match(component, /Production — drive resource calculations after approval/);
  assert.match(component, /Owner bid quantities, accepted decisions, pricing, schedule, and LandXML remain unchanged/);
  assert.match(component, /Every result remains proposed until estimate review/);
});
