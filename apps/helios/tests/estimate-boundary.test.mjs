import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");

const route = source("src/app/api/projects/[projectId]/estimate/propose/route.ts");
const reviewRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/review/route.ts");
const buildRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/build/route.ts");
const supportRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/support/route.ts");
const acceptRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/accept-import/route.ts");
const acceptRemainingRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/accept-remaining/route.ts");
const reclassifyWbsRoute = source("src/app/api/projects/[projectId]/estimate/[estimateId]/reclassify-wbs/route.ts");
const gateway = source("../web/convex/heliosGateway.ts");
const estimates = source("../web/convex/heliosEstimates.ts");
const estimateReviews = source("../web/convex/heliosEstimateReviews.ts");
const estimateBuild = source("../web/convex/heliosEstimateBuild.ts");
const estimateSupport = source("../web/convex/heliosEstimateSupport.ts");
const actions = source("../web/convex/heliosEstimateActions.ts");
const contracts = source("../web/convex/heliosEstimateOpenAIContracts.ts");
const schema = source("../web/convex/schema.ts");
const builder = source("src/components/estimate-builder.tsx");
const importReview = source("src/components/estimate-import-review.tsx");
const costCodeWorkspace = source("src/components/estimate-cost-code-workspace.tsx");
const supportCenter = source("src/components/estimate-support-center.tsx");
const navigation = source("src/lib/navigation.ts");
const domain = source("../../packages/helios-domain/src/index.ts");
const wbs = source("../../packages/helios-domain/src/wbs.ts");

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

test("3E.2 build mutations enforce origin, identity, tenant, hierarchy, and accepted owner scope", () => {
  assert.match(buildRoute, /isSameOrigin/);
  assert.match(buildRoute, /readHeliosPrincipal/);
  assert.match(estimateBuild, /requireHeliosPrincipal/);
  assert.match(estimateBuild, /estimate\.companyId !== companyId/);
  assert.match(estimateBuild, /record\.companyId !== companyId/);
  assert.match(estimateBuild, /Accept the owner pay item before building/);
  assert.match(estimateBuild, /normalizeEstimateBuildInput/);
});

test("3E.2 supports seven resources, focused worksheets, one-click acceptance, and controlled overrides", () => {
  for (const resourceClass of ["labor", "equipment", "material", "subcontract", "trucking", "disposal", "other"]) {
    assert.match(domain, new RegExp(`"${resourceClass}"`));
  }
  assert.match(costCodeWorkspace, /accept_resource/);
  assert.match(builder, /accept_cost_code/);
  assert.match(costCodeWorkspace, /Open worksheet/);
  assert.match(costCodeWorkspace, /overrideReason/);
  assert.match(costCodeWorkspace, /effectiveDate/);
  assert.match(estimateBuild, /overriddenBy/);
  assert.match(estimateBuild, /heliosEstimateDecisionEvents/);
  assert.doesNotMatch(builder, /code\.resources\.map\(\(resource\) => <Badge/);
});

test("3E.3 separates governed production quantities from immutable owner bid quantities", () => {
  assert.match(schema, /heliosEstimateQuantities: defineTable/);
  assert.match(schema, /v\.literal\("takeoff_required"\)/);
  assert.match(estimates, /productionQuantity: undefined/);
  assert.match(estimates, /preliminary_ai_takeoff/);
  assert.match(estimateBuild, /applyProductionQuantity/);
  assert.match(costCodeWorkspace, /Unknown never means zero/);
  assert.match(costCodeWorkspace, /mark_takeoff_required/);
  assert.match(costCodeWorkspace, /accept_quantity/);
});

test("3E.3 derives allocations on the server and prevents duplicate or orphan cost", () => {
  assert.match(estimateBuild, /deriveAllocationValues/);
  assert.match(estimateBuild, /reconcileAllocations/);
  assert.match(estimateBuild, /already allocated to that destination/);
  assert.match(domain, /Shared cost has no allocation destinations/);
  assert.match(domain, /Allocated percentages must total exactly 100%/);
  assert.match(costCodeWorkspace, /Treat as shared cost/);
  assert.match(costCodeWorkspace, /Orphan cost/);
});

test("3E.3 removes unbalanced shared sources from direct rollup and preserves append-only review", () => {
  assert.match(estimates, /filter\(\(code\) => !code\.allocationRequired\)/);
  assert.match(estimates, /invalidAllocationItems/);
  assert.match(estimateBuild, /recordType = "quantity"/);
  assert.match(estimateBuild, /recordType = "allocation"/);
  assert.match(estimateBuild, /heliosEstimateDecisionEvents/);
  assert.match(schema, /v\.literal\("quantity"\)/);
  assert.match(schema, /v\.literal\("allocation"\)/);
});

test("3E.4 supporting records enforce session, current revision, tenant, and hierarchy", () => {
  assert.match(supportRoute, /isSameOrigin/);
  assert.match(supportRoute, /readHeliosPrincipal/);
  assert.match(supportRoute, /normalizeEstimateSupportInput/);
  assert.match(estimateSupport, /requireHeliosPrincipal/);
  assert.match(estimateSupport, /project\.companyId !== companyId/);
  assert.match(estimateSupport, /latest\._id !== estimate\._id/);
  assert.match(estimateSupport, /estimate\.sourcePackageRevision !== project\.currentPackageRevision/);
  assert.match(estimateSupport, /Accept the cost code before creating supporting records/);
  assert.match(estimateSupport, /heliosEstimateDecisionEvents/);
});

test("3E.4 creates procurement records only from accepted scope and keeps evidence linked", () => {
  assert.match(schema, /heliosEstimateEvidenceLinks: defineTable/);
  assert.match(schema, /heliosEstimateRfqs: defineTable/);
  assert.match(schema, /heliosEstimateSubmittals: defineTable/);
  assert.match(estimateSupport, /generate_rfq/);
  assert.match(estimateSupport, /generate_submittal/);
  assert.match(estimateSupport, /linkedPayItemIds/);
  assert.match(estimateSupport, /linkedCostCodeIds/);
  assert.match(estimateSupport, /addEvidenceLinks/);
  assert.match(supportCenter, /Draft RFQ/);
  assert.match(supportCenter, /Add submittal/);
});

test("3E.4 provides one-click evidence verification and risk carry decisions", () => {
  assert.match(supportCenter, /Evidence Matrix/);
  assert.match(supportCenter, /verify_evidence/);
  assert.match(supportCenter, /dispute_evidence/);
  for (const decision of ["base_estimate", "contingency", "qualification", "transfer", "no_carry"]) {
    assert.match(supportCenter, new RegExp(decision));
  }
  assert.match(estimateSupport, /set_risk_decision/);
  assert.match(estimateSupport, /previousValue/);
  assert.match(estimateSupport, /decisionValue/);
  assert.match(builder, /value="evidence"/);
  assert.match(builder, /value="procurement"/);
});

test("3E.1 deterministically stages new, unchanged, changed, conflicting, and missing owner items", () => {
  for (const state of ["new", "unchanged", "changed", "conflict", "missing"]) {
    assert.match(schema + estimates + importReview, new RegExp(`\\b${state}\\b`));
  }
  assert.match(estimates, /previousAccepted/);
  assert.match(estimates, /previousByNumber/);
  assert.match(estimates, /proposedItemNumbers/);
  assert.match(estimates, /classifyEstimateWbsSection/);
});

test("contractor WBS is shared, ordered, secure, auditable, and independent of owner grouping", () => {
  for (const section of [
    "Mobilization",
    "Site Preparation",
    "Earthwork",
    "Fill & Embankment",
    "Drainage",
    "Utilities",
    "Concrete",
    "Asphalt",
    "Structures",
    "Traffic Control",
    "Restoration",
    "Miscellaneous",
  ]) assert.match(wbs, new RegExp(section.replace(/[&]/g, "&")));
  assert.match(contracts, /HELIOS_ESTIMATE_WBS/);
  assert.match(contracts, /Do not preserve the owner's specification grouping/);
  assert.match(estimates, /reclassifyEstimateWbs/);
  assert.match(estimates, /Accepted and superseded estimates are immutable/);
  assert.match(estimates, /recordType: "estimate"/);
  assert.match(estimates, /origin: "system"/);
  assert.match(reclassifyWbsRoute, /isSameOrigin/);
  assert.match(reclassifyWbsRoute, /readHeliosPrincipal/);
  assert.match(importReview, /Apply contractor WBS/);
  assert.match(importReview, /aria-expanded/);
  assert.match(builder, /group\/section/);
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

test("unit-price owner items collect cost per bid unit and calculate the item extension", () => {
  assert.match(schema, /submittedUnitPriceCents: v\.optional\(v\.number\(\)\)/);
  assert.match(estimateReviews, /submittedUnitPriceCents: correction\.submittedUnitPriceCents/);
  assert.match(estimates, /calculateSubmittedItemAmount/);
  assert.match(importReview, /Cost per \{bidUnit \|\| "unit"\}/);
  assert.match(importReview, /Calculated item cost/);
  assert.match(importReview, /submittedUnitPriceDollars/);
  assert.match(builder, /item\.submittedAmountCents/);
});
