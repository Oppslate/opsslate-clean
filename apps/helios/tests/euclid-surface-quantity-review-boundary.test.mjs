import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4Q review and publication routes are same-origin and authenticated", async () => {
  const [reviewRoute, publicationRoute, gateway] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/surface-quantity-reviews/route.ts"),
    read("../src/app/api/projects/[projectId]/euclid/surface-quantity-publications/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
  ]);
  for (const route of [reviewRoute, publicationRoute]) {
    assert.match(route, /isSameOrigin/);
    assert.match(route, /readHeliosPrincipal/);
    assert.match(route, /params: Promise/);
  }
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(gateway, /normalizeHeliosEuclidSurfaceQuantityReviewInput/);
  assert.match(gateway, /normalizeHeliosEuclidSurfaceDraftPublicationInput/);
});

test("Stage 4Q decisions are append-only and require an exact recalculated 4P draft", async () => {
  const [schema, review] = await Promise.all([
    read("../../web/convex/schema.ts"),
    read("../../web/convex/heliosEuclidSurfaceQuantityReviews.ts"),
  ]);
  assert.match(schema, /heliosEuclidSurfaceQuantityReviews: defineTable/);
  assert.match(review, /requireHeliosPrincipal/);
  assert.match(review, /calculateHeliosEuclidSurfaceQuantities/);
  assert.match(review, /result\.fingerprint !== input\.resultFingerprint/);
  assert.match(review, /draft\.fingerprint !== input\.draftQuantityFingerprint/);
  assert.match(review, /engineeringStatus !== "verified"/);
  assert.match(review, /ctx\.db\.insert\("heliosEuclidSurfaceQuantityReviews"/);
  assert.doesNotMatch(review, /ctx\.db\.(patch|replace|delete)/);
  assert.doesNotMatch(review, /openai|ctx\.storage|application\/pdf/i);
});

test("Stage 4Q publication preserves every 4K gate and creates only a proposed estimate quantity", async () => {
  const publication = await read("../../web/convex/heliosEuclidQuantityPublications.ts");
  assert.match(publication, /publishSurfaceDraft/);
  assert.match(publication, /canonicalOrigin !== "reviewed_candidate"/);
  assert.match(publication, /solutionRecord\.status !== "passed"/);
  assert.match(publication, /latestReview[\s\S]*review\.action !== "accept"/);
  assert.match(publication, /heliosEuclidSurfaceQuantityCapability/);
  assert.match(publication, /row\.status === "ready"/);
  assert.match(publication, /Production quantity unit/);
  assert.match(publication, /reviewStatus: "proposed"/);
  assert.match(publication, /surfaceQuantityResultFingerprint/);
  assert.match(publication, /surfaceQuantityReviewFingerprint/);
  assert.doesNotMatch(publication, /ctx\.db\.(patch|replace|delete)/);
});

test("Stage 4Q cockpit makes acceptance fast but keeps publication deliberate", async () => {
  const component = await read("../src/components/euclid-surface-assembler.tsx");
  assert.match(component, /reviewDraft\(row, "accept"\)/);
  assert.match(component, /Send to estimate/);
  assert.match(component, /Select the receiving cost code/);
  assert.match(component, /Create proposed quantity/);
  assert.match(component, /owner quantities and pricing remain unchanged/i);
  assert.doesNotMatch(component, /useEffect/);
});
