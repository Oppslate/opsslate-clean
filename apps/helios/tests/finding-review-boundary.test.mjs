import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");

const reviewRoute = source(
  "src/app/api/projects/[projectId]/intelligence/[intelligenceId]/findings/[findingId]/review/route.ts",
);
const reviewQueue = source("src/components/finding-review-queue.tsx");
const intelligencePanel = source(
  "src/components/project-intelligence-panel.tsx",
);
const reviews = source("../web/convex/heliosReviews.ts");
const intelligence = source("../web/convex/heliosIntelligence.ts");
const projects = source("../web/convex/heliosProjects.ts");
const gateway = source("../web/convex/heliosGateway.ts");
const schema = source("../web/convex/schema.ts");

test("finding review mutations enforce session, origin, tenant, and current generation", () => {
  assert.match(reviewRoute, /isSameOrigin/);
  assert.match(reviewRoute, /readHeliosPrincipal/);
  assert.match(reviewRoute, /normalizeFindingReviewInput/);
  assert.match(reviews, /requireHeliosPrincipal/);
  assert.match(reviews, /project\.companyId !== companyId/);
  assert.match(reviews, /intelligence\.companyId !== companyId/);
  assert.match(reviews, /intelligence\.projectId !== project\._id/);
  assert.match(reviews, /intelligence\.isCurrent === false/);
  assert.match(reviews, /findingPrefix/);
  assert.match(gateway, /protectedPayload/);
});

test("human decisions are append-only and preserve immutable AI generations", () => {
  assert.match(schema, /heliosFindingReviewEvents: defineTable/);
  assert.match(schema, /reviewerUserId/);
  assert.match(schema, /by_intelligence_finding_created/);
  assert.match(reviews, /ctx\.db\.insert\("heliosFindingReviewEvents"/);
  assert.doesNotMatch(reviews, /ctx\.db\.(?:patch|replace|delete)\([^)]*event/i);
  assert.match(projects, /reviewEventsByFinding/);
  assert.match(projects, /history:/);
  assert.match(intelligence, /queueReviewedReanalysis/);
  assert.match(intelligence, /enqueueProjectSynthesis/);
  assert.match(intelligence, /isCurrent: false/);
});

test("review queue supports filtering, evidence, decisions, corrections, and history", () => {
  assert.match(intelligencePanel, /value="review"/);
  assert.match(reviewQueue, /Filter by type/);
  assert.match(reviewQueue, /Filter by risk/);
  assert.match(reviewQueue, /Filter by confidence/);
  assert.match(reviewQueue, /Filter by review status/);
  assert.match(reviewQueue, /Filter by trade/);
  assert.match(reviewQueue, /Approve/);
  assert.match(reviewQueue, /Correct/);
  assert.match(reviewQueue, /Reject/);
  assert.match(reviewQueue, /Reanalyze/);
  assert.match(reviewQueue, /Supersede/);
  assert.match(reviewQueue, /Review history/);
  assert.match(reviewQueue, /onOpenEvidence/);
});

test("Foundation 3D stops before estimate, pricing, procurement, or RFQ creation", () => {
  const combined = `${reviewQueue}\n${intelligencePanel}`;
  assert.doesNotMatch(
    combined,
    /create estimate|estimate builder|create bid item|send rfq|vendor pricing/i,
  );
});
