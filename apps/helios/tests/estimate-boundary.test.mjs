import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");

const route = source("src/app/api/projects/[projectId]/estimate/propose/route.ts");
const reviewRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/review/route.ts");
const acceptRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/accept-import/route.ts");
const acceptRemainingRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/accept-remaining/route.ts");
const gateway = source("../web/convex/heliosGateway.ts");
const estimates = source("../web/convex/heliosEstimates.ts");
const estimateReviews = source("../web/convex/heliosEstimateReviews.ts");
const actions = source("../web/convex/heliosEstimateActions.ts");
const contracts = source("../web/convex/heliosEstimateOpenAIContracts.ts");
const schema = source("../web/convex/schema.ts");
const builder = source("src/components/estimate-builder.tsx");
const importReview = source("src/components/estimate-import-review.tsx");
const navigation = source("src/lib/navigation.ts");

test("estimate proposal requests enforce session, origin, gateway, tenant, and project ownership", () => {
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(gateway, /protectedPayload/);
  assert.match(estimates, /requireHeliosPrincipal/);
  assert.match(estimates, /project\.companyId !== companyId/);
  assert.match(estimates, /intelligence\.packageRevision !== project\.currentPackageRevision/);
});

test("3E.1 import decisions enforce same-origin session, tenant, project, estimate, and record ownership", () => {
  assert.match(reviewRoute, /isSameOrigin/);
  assert.match(reviewRoute, /readHeliosPrincipal/);
  assert.match(acceptRoute, /isSameOrigin/);
  assert.match(acceptRoute, /readHeliosPrincipal/);
  assert.match(acceptRemainingRoute, /isSameOrigin/);
  assert.match(acceptRemainingRoute, /readHeliosPrincipal/);
  assert.match(estimateReviews, /requireHeliosPrincipal/);
  assert.match(estimateReviews, /estimate\.companyId !== companyId/);
  assert.match(estimateReviews, /record\.estimateId !== estimate\._id/);
  assert.match(estimateReviews, /estimate\.status !== "ready_for_review"/);
});

test("3E.1 keeps common bid-day decisions to one click and audits bulk acceptance per record", () => {
  assert.match(importReview, /onAccept=\{\(\) => saveReview/);
  assert.match(importReview, /onDefer=\{\(\) => saveReview/);
  assert.match(importReview, /Accept remaining unchanged/);
  assert.match(estimateReviews, /acceptRemainingRecords/);
  assert.match(estimateReviews, /for \(const record of sections\)/);
  assert.match(estimateReviews, /for \(const record of items\)/);
  assert.match(estimateReviews, /Accepted unchanged with remaining import proposals/);
});

test("3E.1 records all seven estimator decisions as append-only before-and-after history", () => {
  for (const action of ["accept", "correct", "reject", "defer", "merge", "split", "map"]) {
    assert.match(importReview, new RegExp(`\\b${action}\\b`));
  }
  assert.match(schema, /v\.literal\("accept_import"\)/);
  assert.match(schema, /previousValue: v\.optional\(v\.any\(\)\)/);
  assert.match(schema, /decisionValue: v\.optional\(v\.any\(\)\)/);
  assert.match(estimateReviews, /heliosEstimateDecisionEvents/);
  assert.match(estimateReviews, /reviewerName: user\.name/);
  assert.match(estimateReviews, /previousValue/);
  assert.match(estimateReviews, /decisionValue/);
});

test("3E.1 acceptance is deterministic and locks the reviewed version", () => {
  assert.match(estimateReviews, /calculateEstimateReviewSummary/);
  assert.match(estimateReviews, /summary\.canAcceptImport/);
  assert.match(estimateReviews, /Duplicate official sequence/);
  assert.match(estimateReviews, /missing its official fixed amount/);
  assert.match(estimateReviews, /status: "accepted"/);
  assert.match(estimateReviews, /importReviewedBy: user\._id/);
});

test("3E.1 deterministically stages new, unchanged, changed, conflicting, and missing owner items", () => {
  for (const state of ["new", "unchanged", "changed", "conflict", "missing"]) {
    assert.match(schema + estimates + importReview, new RegExp(`\\b${state}\\b`));
  }
  assert.match(estimates, /previousAccepted/);
  assert.match(estimates, /previousByNumber/);
  assert.match(estimates, /proposedItemNumbers/);
  assert.match(estimates, /prior-owner-items-missing/);
});

test("estimate generations are versioned and never patch an accepted estimate", () => {
  assert.match(schema, /heliosEstimates: defineTable/);
  assert.match(schema, /by_project_version/);
  assert.match(schema, /heliosEstimateSections: defineTable/);
  assert.match(schema, /heliosOwnerPayItems: defineTable/);
  assert.match(schema, /heliosEstimateCostCodes: defineTable/);
  assert.match(schema, /heliosEstimateResources: defineTable/);
  assert.match(schema, /heliosEstimateAllocations: defineTable/);
  assert.match(schema, /heliosEstimateRisks: defineTable/);
  assert.match(schema, /heliosEstimateDecisionEvents: defineTable/);
  assert.match(estimates, /version: \(previous\?\.version \|\| 0\) \+ 1/);
  assert.doesNotMatch(estimates, /patch\(previous\._id/);
});

test("estimate AI output is strict, evidence-validated twice, and cannot contain prices", () => {
  assert.match(actions, /"use node"/);
  assert.match(actions, /background: true/);
  assert.match(actions, /responses\.delete/);
  assert.match(actions, /parseEstimateProposal/);
  assert.match(estimates, /parseEstimateProposal/);
  assert.match(contracts, /rateCents: \{ type: "null" \}/);
  assert.match(contracts, /rateStatus: \{ type: "string", enum: \["unpriced"\] \}/);
  assert.doesNotMatch(builder + route, /OPENAI_API_KEY|openaiResponseId/);
});

test("Estimate Builder uses shared OpsSlate primitives and synchronized estimate records", () => {
  assert.match(navigation, /href: "\/estimate"/);
  assert.doesNotMatch(
    navigation.match(/href: "\/estimate"[\s\S]*?\},/)?.[0] || "",
    /disabled: true/,
  );
  assert.match(builder, /@opsslate\/suite-ui\/table/);
  assert.match(builder, /@opsslate\/suite-ui\/tabs/);
  assert.match(builder, /value="build"/);
  assert.match(builder, /value="bid"/);
  assert.match(builder, /value="import"/);
  assert.match(builder, /officialSequence/);
  assert.match(importReview, /@opsslate\/suite-ui\/dialog/);
  assert.match(importReview, /Owner pay-item import review/);
  assert.match(builder, /Risk register/);
  assert.match(builder, /Unpriced/);
  assert.match(builder, /EvidenceList/);
});
