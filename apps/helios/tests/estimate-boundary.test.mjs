import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");

const route = source("src/app/api/projects/[projectId]/estimate/propose/route.ts");
const gateway = source("../web/convex/heliosGateway.ts");
const estimates = source("../web/convex/heliosEstimates.ts");
const actions = source("../web/convex/heliosEstimateActions.ts");
const contracts = source("../web/convex/heliosEstimateOpenAIContracts.ts");
const schema = source("../web/convex/schema.ts");
const builder = source("src/components/estimate-builder.tsx");
const navigation = source("src/lib/navigation.ts");

test("estimate proposal requests enforce session, origin, gateway, tenant, and project ownership", () => {
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(gateway, /protectedPayload/);
  assert.match(estimates, /requireHeliosPrincipal/);
  assert.match(estimates, /project\.companyId !== companyId/);
  assert.match(estimates, /intelligence\.packageRevision !== project\.currentPackageRevision/);
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
  assert.match(builder, /Risk register/);
  assert.match(builder, /Unpriced/);
  assert.match(builder, /EvidenceList/);
});
