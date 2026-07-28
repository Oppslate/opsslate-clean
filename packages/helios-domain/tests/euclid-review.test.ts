import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_REVIEW_VERSION,
  heliosEuclidReviewDecisionFingerprint,
  heliosEuclidReviewTargetFingerprint,
  normalizeHeliosEuclidReviewInput,
  summarizeHeliosEuclidReviewDecisions,
} from "../src/euclid-review.ts";

const base = {
  version: HELIOS_EUCLID_REVIEW_VERSION,
  requestId: "request-1",
  euclidModelId: "model-1",
  modelFingerprint: "parity:model",
  sourceFingerprint: "parity:source",
  targetEntityType: "control_point",
  targetEntityId: "point-1",
  targetFingerprint: heliosEuclidReviewTargetFingerprint({ id: "point-1", northing: 100 }),
} as const;

test("accept is one click and does not require correction content", () => {
  const input = normalizeHeliosEuclidReviewInput({ ...base, action: "accept" });
  assert.equal(input.action, "accept");
  assert.equal(input.reason, undefined);
  assert.equal(input.changes, undefined);
});

test("corrections are constrained to an entity-specific field allowlist", () => {
  const input = normalizeHeliosEuclidReviewInput({
    ...base,
    action: "correct",
    reason: "Survey control sheet shows a revised northing.",
    changes: [{ field: "northing.value", valueType: "number", numberValue: 101.25, unit: "us_survey_foot" }],
  });
  assert.equal(input.changes?.[0]?.numberValue, 101.25);
  assert.throws(() => normalizeHeliosEuclidReviewInput({
    ...base,
    action: "correct",
    reason: "Invalid arbitrary edit.",
    changes: [{ field: "companyId", valueType: "string", stringValue: "other" }],
  }), /not allowed/);
});

test("non-accept decisions require a reason and corrections require changes", () => {
  assert.throws(() => normalizeHeliosEuclidReviewInput({ ...base, action: "defer" }), /reason is required/i);
  assert.throws(() => normalizeHeliosEuclidReviewInput({ ...base, action: "correct", reason: "Needs correction." }), /at least one changed field/i);
});

test("review decisions are fingerprinted and folded append-only by target", () => {
  const accept = normalizeHeliosEuclidReviewInput({ ...base, action: "accept" });
  const reject = normalizeHeliosEuclidReviewInput({ ...base, requestId: "request-2", action: "reject", reason: "Conflicts with the control sheet." });
  const rows = [
    { ...accept, id: "d1", decisionFingerprint: heliosEuclidReviewDecisionFingerprint(accept), reviewerName: "Estimator", createdAt: 1 },
    { ...reject, id: "d2", decisionFingerprint: heliosEuclidReviewDecisionFingerprint(reject), reviewerName: "Estimator", createdAt: 2 },
  ];
  const summary = summarizeHeliosEuclidReviewDecisions(rows);
  assert.equal(summary.total, 1);
  assert.equal(summary.rejected, 1);
  assert.equal(summary.currentDecisions[0]?.id, "d2");
  assert.notEqual(rows[0]?.decisionFingerprint, rows[1]?.decisionFingerprint);
});
