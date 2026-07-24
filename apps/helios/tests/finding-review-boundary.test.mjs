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
const cockpit = source("src/components/project-intelligence-cockpit.tsx");
const cockpitQueue = source("src/components/cockpit-finding-queue.tsx");
const decisionDock = source("src/components/cockpit-decision-dock.tsx");
const evidenceCockpit = source("src/components/evidence-review-cockpit.tsx");
const projectIntake = source("src/components/project-intake.tsx");
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
  const combined = `${reviewQueue}\n${intelligencePanel}\n${cockpit}\n${decisionDock}`;
  assert.doesNotMatch(
    combined,
    /create estimate|estimate builder|create bid item|send rfq|vendor pricing/i,
  );
});

test("Foundation 3D.1 composes queue, PDF evidence, and decisions in one cockpit", () => {
  assert.match(cockpit, /CockpitFindingQueue/);
  assert.match(cockpit, /EvidenceReviewCockpit/);
  assert.match(cockpit, /CockpitDecisionDock/);
  assert.match(cockpit, /selectedFindingId/);
  assert.match(cockpitQueue, /Findings inbox/);
  assert.match(evidenceCockpit, /<iframe/);
  assert.match(evidenceCockpit, /Cited pages/);
  assert.match(evidenceCockpit, /AI explanation/);
  assert.match(decisionDock, /Selected finding/);
  assert.match(decisionDock, /Your decision/);
  assert.doesNotMatch(cockpit, /TabsContent|TabsTrigger/);
});

test("cockpit remains primary while document administration is available on demand", () => {
  assert.match(projectIntake, /detail\.intelligence \?/);
  assert.match(projectIntake, /ProjectIntelligenceCockpit/);
  assert.match(projectIntake, /<details/);
  assert.match(projectIntake, /Bid package and project document control/);
  assert.ok(
    projectIntake.indexOf("<ProjectIntelligenceCockpit") <
      projectIntake.indexOf("<details"),
  );
});
