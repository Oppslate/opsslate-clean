import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4J promotion is tenant-authorized and same-origin protected", async () => {
  const [route, gateway, mutation] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/promotions/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/heliosEuclidPromotions.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /euclid\/promotions/);
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(mutation, /requireHeliosPrincipal/);
  assert.match(mutation, /project\.companyId !== companyId/);
});

test("Euclid Stage 4J requires exact passing lineage and zero degraded results", async () => {
  const [domain, mutation] = await Promise.all([
    read("../../../packages/helios-domain/src/euclid-promotion.ts"),
    read("../../web/convex/heliosEuclidPromotions.ts"),
  ]);
  assert.match(domain, /validation\.status !== "passed"/);
  assert.match(domain, /validation\.degradedCount !== 0/);
  assert.match(domain, /validateHeliosEuclidContract/);
  assert.match(mutation, /validation\.validationFingerprint !== input\.validationFingerprint/);
  assert.match(mutation, /heliosEuclidReviewSetFingerprint/);
  assert.match(mutation, /Candidate review set is no longer current/);
});

test("Euclid Stage 4J creates a new immutable canonical version with append-only lineage", async () => {
  const [schema, mutation] = await Promise.all([
    read("../../web/convex/schema.ts"),
    read("../../web/convex/heliosEuclidPromotions.ts"),
  ]);
  assert.match(schema, /heliosEuclidPromotions: defineTable/);
  assert.match(schema, /canonicalOrigin: v\.optional/);
  assert.match(mutation, /canonicalVersion = \(source\.canonicalVersion \?\? 1\) \+ 1/);
  assert.match(mutation, /canonicalOrigin: "reviewed_candidate"/);
  assert.match(mutation, /ctx\.db\.insert\("heliosEuclidModels"/);
  assert.match(mutation, /ctx\.db\.insert\("heliosEuclidPromotions"/);
  assert.match(mutation, /ctx\.db\.insert\("heliosEuclidProvenance"/);
  assert.match(mutation, /ctx\.db\.insert\("heliosEuclidEntityChunks"/);
  assert.match(mutation, /ctx\.db\.patch\(source\._id, \{ isCurrent: false, status: "superseded"/);
  assert.doesNotMatch(mutation, /ctx\.db\.delete|ctx\.storage|openai|application\/pdf/i);
});

test("Euclid Stage 4J remains isolated from downstream estimating and export records", async () => {
  const [mutation, component] = await Promise.all([
    read("../../web/convex/heliosEuclidPromotions.ts"),
    read("../src/components/euclid-cockpit.tsx"),
  ]);
  assert.match(mutation, /downstreamEligible: false/);
  assert.match(component, /Promote canonical/);
  assert.match(component, /validation\.canPromote/);
  assert.match(component, /Euclid publication adds a proposed, traceable estimate quantity only/);
  assert.doesNotMatch(mutation, /ctx\.db\.insert\("(?:heliosEstimate|estimate|procurement|schedule|landXml)/i);
});
