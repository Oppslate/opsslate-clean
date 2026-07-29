import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Stage 4I stores immutable candidate validation and engineering deltas", async () => {
  const [schema, mutation, reconstruction, domain] = await Promise.all([
    read("../../web/convex/schema.ts"),
    read("../../web/convex/heliosEuclidCandidateValidations.ts"),
    read("../../web/convex/heliosEuclidCandidateReconstruction.ts"),
    read("../../../packages/helios-domain/src/euclid-candidate-validation.ts"),
  ]);
  assert.match(schema, /heliosEuclidCandidateValidations/);
  assert.match(schema, /heliosEuclidCandidateValidationChunks/);
  assert.match(schema, /by_candidate_request/);
  assert.match(mutation, /validateHeliosEuclidReviewCandidate/);
  assert.match(reconstruction, /Reviewed candidate failed end-to-end fingerprint validation/);
  assert.match(mutation, /Candidate review set is no longer current/);
  assert.match(domain, /solveHeliosEuclidHorizontalControl/);
  assert.match(domain, /solveHeliosEuclidVerticalProfiles/);
  assert.match(domain, /solveHeliosEuclidEngineeringGraph/);
  assert.match(domain, /validationDeltas/);
});

test("Stage 4I fails closed and cannot promote or publish downstream records", async () => {
  const [mutation, domain] = await Promise.all([
    read("../../web/convex/heliosEuclidCandidateValidations.ts"),
    read("../../../packages/helios-domain/src/euclid-candidate-validation.ts"),
  ]);
  assert.doesNotMatch(mutation, /ctx\.db\.patch|ctx\.db\.replace|ctx\.db\.delete/);
  assert.doesNotMatch(mutation, /ctx\.db\.insert\("helios(?:Estimate|Quantity|Takeoff|Schedule)/i);
  assert.match(domain, /promotionEligible: false/);
  assert.match(domain, /downstreamEligible: false/);
  assert.match(domain, /cannot promote geometry or publish quantities, estimates, schedules, or LandXML/);
  assert.doesNotMatch(mutation, /heliosEuclidPromotions|promoteCandidate/);
});

test("Stage 4I endpoints are same-origin, authenticated, and gateway protected", async () => {
  const [route, gateway, http] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/candidate-validations/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/http.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /callHeliosGateway/);
  assert.match(gateway, /protectedPayload/);
  assert.match(gateway, /normalizeHeliosEuclidCandidateValidationInput/);
  assert.match(http, /\/helios\/v1\/euclid\/candidate-validations/);
});
