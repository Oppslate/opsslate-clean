import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_SURFACE_QUANTITY_PUBLICATION_VERSION,
  HELIOS_EUCLID_SURFACE_QUANTITY_REVIEW_VERSION,
  heliosEuclidSurfaceQuantityCapability,
  heliosEuclidSurfaceQuantityReviewFingerprint,
  normalizeHeliosEuclidSurfaceDraftPublicationInput,
  normalizeHeliosEuclidSurfaceQuantityReviewInput,
} from "../src/index.ts";

test("Stage 4Q normalizes an explicit accepted 4P draft review", () => {
  assert.deepEqual(normalizeHeliosEuclidSurfaceQuantityReviewInput({
    version: HELIOS_EUCLID_SURFACE_QUANTITY_REVIEW_VERSION,
    requestId: "review-request-1",
    euclidModelId: "model-1",
    modelFingerprint: "sha256:model",
    alignmentId: "alignment-1",
    resultFingerprint: "sha256:result",
    draftQuantityId: "draft-1",
    draftQuantityFingerprint: "sha256:draft",
    action: "accept",
  }), {
    version: 1,
    requestId: "review-request-1",
    euclidModelId: "model-1",
    modelFingerprint: "sha256:model",
    alignmentId: "alignment-1",
    resultFingerprint: "sha256:result",
    draftQuantityId: "draft-1",
    draftQuantityFingerprint: "sha256:draft",
    action: "accept",
    reason: undefined,
  });
});

test("Stage 4Q requires a reason when a draft is deferred or rejected", () => {
  assert.throws(() => normalizeHeliosEuclidSurfaceQuantityReviewInput({
    version: 1,
    requestId: "review-request-2",
    euclidModelId: "model-1",
    modelFingerprint: "sha256:model",
    alignmentId: "alignment-1",
    resultFingerprint: "sha256:result",
    draftQuantityId: "draft-1",
    draftQuantityFingerprint: "sha256:draft",
    action: "defer",
  }), /reason is required/i);
});

test("Stage 4Q normalizes the reviewed 4P to governed 4K adapter input", () => {
  const input = normalizeHeliosEuclidSurfaceDraftPublicationInput({
    version: HELIOS_EUCLID_SURFACE_QUANTITY_PUBLICATION_VERSION,
    requestId: "publish-request-1",
    euclidModelId: "model-1",
    modelFingerprint: "sha256:model",
    alignmentId: "alignment-1",
    integrationSolutionId: "solution-1",
    integrationSolutionFingerprint: "sha256:solution",
    resultFingerprint: "sha256:result",
    draftQuantityId: "draft-1",
    draftQuantityFingerprint: "sha256:draft",
    reviewId: "review-1",
    reviewFingerprint: "sha256:review",
    costCodeId: "cost-code-1",
    use: "production",
  });
  assert.equal(input.use, "production");
  assert.equal(input.reviewFingerprint, "sha256:review");
});

test("Stage 4Q review fingerprints and capability mapping are deterministic", () => {
  const input = {
    modelFingerprint: "sha256:model",
    resultFingerprint: "sha256:result",
    draftQuantityId: "draft-1",
    draftQuantityFingerprint: "sha256:draft",
    action: "accept" as const,
    reviewerUserId: "user-1",
    createdAt: 100,
  };
  assert.equal(
    heliosEuclidSurfaceQuantityReviewFingerprint(input),
    heliosEuclidSurfaceQuantityReviewFingerprint(input),
  );
  assert.equal(heliosEuclidSurfaceQuantityCapability("earthwork_excavation_volume"), "earthwork_volume");
  assert.equal(heliosEuclidSurfaceQuantityCapability("structural_section_volume"), "earthwork_volume");
  assert.equal(heliosEuclidSurfaceQuantityCapability("material_area"), "material_area");
});
