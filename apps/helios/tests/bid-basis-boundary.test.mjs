import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");

const route = source("src/app/api/projects/[projectId]/bid-basis/route.ts");
const panel = source("src/components/bid-basis-panel.tsx");
const projectIntake = source("src/components/project-intake.tsx");
const basis = source("../web/convex/heliosBidBasis.ts");
const estimates = source("../web/convex/heliosEstimates.ts");
const schema = source("../web/convex/schema.ts");

test("bid-basis decisions require a verified same-origin session and tenant ownership", () => {
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /isSameOrigin/);
  assert.match(basis, /requireHeliosPrincipal/);
  assert.match(basis, /project\.companyId !== companyId/);
  assert.match(basis, /document\.companyId !== companyId/);
  assert.match(basis, /document\.projectId !== project\._id/);
});

test("revision-specific profiles and decisions are durable and auditable", () => {
  assert.match(schema, /heliosBidBasisProfiles: defineTable/);
  assert.match(schema, /heliosDocumentClassifications: defineTable/);
  assert.match(schema, /heliosBidBasisEvents: defineTable/);
  assert.match(basis, /packageRevision: bidPackage\.revision/);
  assert.match(basis, /ctx\.db\.insert\("heliosBidBasisEvents"/);
  assert.match(basis, /reviewerUserId: user\._id/);
});

test("the estimate gate uses one usable basis rather than requiring plans and specs", () => {
  assert.match(estimates, /bidBasis\.workspaceState === "no_usable_scope_basis"/);
  assert.match(estimates, /bidBasisRow\.proceededAt/);
  assert.doesNotMatch(estimates, /hasPlans\s*&&\s*hasSpecs/);
});

test("project control exposes one-click proceed and capability-specific readiness", () => {
  assert.match(projectIntake, /BidBasisPanel/);
  assert.match(panel, /Proceed with available basis/);
  assert.match(panel, /plan_takeoff_spatial|capability\.capability/);
  assert.match(panel, /Not issued/);
  assert.match(panel, /N\/A/);
  assert.match(panel, /Correct a document classification/);
});
