import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Stage 4G decisions are tenant-scoped, stale-safe, and append-only", async () => {
  const [schema, mutation, cockpit] = await Promise.all([
    read("../../web/convex/schema.ts"),
    read("../../web/convex/heliosEuclidReviews.ts"),
    read("../../web/convex/heliosEuclidCockpit.ts"),
  ]);
  assert.match(schema, /heliosEuclidReviewDecisions/);
  assert.match(schema, /by_target_created/);
  assert.match(schema, /by_model_request/);
  assert.match(mutation, /modelRecord\.companyId !== companyId/);
  assert.match(mutation, /modelRecord\.projectId !== project\._id/);
  assert.match(mutation, /modelRecord\.modelFingerprint !== input\.modelFingerprint/);
  assert.match(mutation, /modelRecord\.sourceFingerprint !== input\.sourceFingerprint/);
  assert.match(mutation, /beforeJson: JSON\.stringify\(target\)/);
  assert.match(mutation, /Euclid review request was already used for a different decision/);
  assert.doesNotMatch(mutation, /heliosEuclidEntityChunks"\).*patch|heliosEuclidModels"\).*patch/);
  assert.match(cockpit, /heliosEuclidReviewDecisions/);
  assert.match(cockpit, /reviewDecisions/);
});

test("Stage 4G does not activate downstream quantity, estimate, or LandXML consumers", async () => {
  const [mutation, component] = await Promise.all([
    read("../../web/convex/heliosEuclidReviews.ts"),
    read("../src/components/euclid-cockpit.tsx"),
  ]);
  assert.doesNotMatch(mutation, /heliosQuantity|heliosEstimate|LandXML|schedule/i);
  assert.match(component, /remain separate from the immutable source model/);
});
