import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");

const route = source("src/app/api/projects/[projectId]/plan-intelligence/route.ts");
const panel = source("src/components/plan-intelligence-panel.tsx");
const projectIntake = source("src/components/project-intake.tsx");
const plan = source("../web/convex/heliosPlanIntelligence.ts");
const actions = source("../web/convex/heliosPlanActions.ts");
const contracts = source("../web/convex/heliosPlanOpenAIContracts.ts");
const schema = source("../web/convex/schema.ts");

test("plan actions require a same-origin verified session and server-derived plan scope", () => {
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(plan, /requireHeliosPrincipal/);
  assert.match(plan, /deriveProjectBidBasis/);
  assert.match(plan, /category === "plans"/);
  assert.doesNotMatch(route, /documentIds/);
});
test("plan reconstruction is revision controlled and normalized", () => {
  for (const table of ["heliosPlanRuns", "heliosPlanJobs", "heliosPlanPages", "heliosPlanReferences", "heliosPlanCalibrations", "heliosPlanReviewEvents"]) {
    assert.match(schema, new RegExp(`${table}: defineTable`));
  }
  assert.match(plan, /packageRevision: bidPackage\.revision/);
  assert.match(plan, /sourceFingerprint: basis\.sourceFingerprint/);
  assert.match(plan, /isCurrent: false/);
});

test("all pages, mixed modalities, view-local scales, and references are required from the reasoning engine", () => {
  assert.match(contracts, /Return exactly one page record for every physical PDF page/);
  assert.match(contracts, /HELIOS_PLAN_MODALITIES/);
  assert.match(contracts, /A scale belongs to its individual view/);
  assert.match(contracts, /HELIOS_PLAN_REFERENCE_TYPES/);
  assert.match(actions, /input_file/);
  assert.match(actions, /background: true/);
});

test("uncalibrated measurable views stay blocked until a one-click approval", () => {
  assert.match(plan, /status: "blocked"/);
  assert.match(plan, /status: uniqueScales\.size > 1 \? "conflicted" : "proposed"/);
  assert.match(plan, /approvedViewKeys/);
  assert.match(panel, /Approve scale/);
  assert.match(panel, /Measurement blocks/);
  assert.match(projectIntake, /PlanIntelligencePanel/);
});

test("plans absent is an explicit nonblocking state", () => {
  assert.match(plan, /not_applicable_to_current_basis/);
  assert.match(panel, /estimate remains open/);
  assert.match(panel, /Not applicable/);
});
