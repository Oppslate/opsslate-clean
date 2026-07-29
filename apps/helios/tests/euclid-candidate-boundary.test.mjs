import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Stage 4H stores immutable reviewed candidates with complete decision lineage", async () => {
  const [schema, mutation, domain] = await Promise.all([
    read("../../web/convex/schema.ts"),
    read("../../web/convex/heliosEuclidCandidates.ts"),
    read("../../../packages/helios-domain/src/euclid-candidate.ts"),
  ]);
  assert.match(schema, /heliosEuclidReviewCandidates/);
  assert.match(schema, /heliosEuclidReviewCandidateChunks/);
  assert.match(schema, /heliosEuclidReviewCandidateDecisions/);
  assert.match(schema, /by_model_request/);
  assert.match(mutation, /buildHeliosEuclidReviewCandidate/);
  assert.match(mutation, /buildHeliosEuclidEntityChunks/);
  assert.match(mutation, /Euclid candidate request was already used for a different review set/);
  assert.match(domain, /Review decision for .* is stale/);
  assert.match(domain, /downstreamEligible: false/);
});

test("Stage 4H never promotes source geometry or publishes downstream records", async () => {
  const [mutation, component] = await Promise.all([
    read("../../web/convex/heliosEuclidCandidates.ts"),
    read("../src/components/euclid-cockpit.tsx"),
  ]);
  assert.doesNotMatch(mutation, /ctx\.db\.patch|ctx\.db\.delete/);
  assert.doesNotMatch(mutation, /heliosQuantity|heliosEstimate|LandXML|schedule/i);
  assert.match(component, /Build reviewed candidate/);
  assert.match(component, /never promotes geometry or publishes downstream records/);
});

test("Stage 4H endpoints remain same-origin, authenticated, and gateway protected", async () => {
  const [route, gateway, http] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/candidates/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/http.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /callHeliosGateway/);
  assert.match(gateway, /protectedPayload/);
  assert.match(gateway, /normalizeHeliosEuclidCandidateBuildInput/);
  assert.match(http, /\/helios\/v1\/euclid\/candidates/);
});
