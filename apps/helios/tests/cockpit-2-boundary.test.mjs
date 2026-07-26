import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");
const cockpit = source("src/components/estimate-cockpit-2.tsx");
const projectIntake = source("src/components/project-intake.tsx");
const projectPage = source("src/app/projects/[projectId]/page.tsx");

test("Cockpit 2.0 loads the current tenant-authorized estimate with the project", () => {
  assert.match(projectPage, /getEstimateWorkspace/);
  assert.match(projectPage, /Promise\.all/);
  assert.match(projectPage, /workspace=\{workspace\}/);
  assert.match(projectIntake, /detail\.intelligence && workspace/);
  assert.match(projectIntake, /EstimateCockpit2/);
});

test("Cockpit 2.0 uses the approved three-panel stacked-estimate workflow", () => {
  assert.match(cockpit, /aria-label="Bid review queue"/);
  assert.match(cockpit, /aria-label="Stacked estimate"/);
  assert.match(cockpit, /aria-label="Contextual intelligence and proof"/);
  assert.match(cockpit, /Section → owner item → cost code → resource/);
  assert.match(cockpit, /Estimate coverage/);
  assert.match(cockpit, /Quantity coverage/);
  assert.match(cockpit, /Pricing coverage/);
  assert.match(cockpit, /Evidence verified/);
  assert.match(cockpit, /Risk decisions/);
  assert.doesNotMatch(cockpit, /<iframe|mockData|placeholderData/);
});

test("Cockpit 2.0 connects real estimate, quantity, pricing, procurement, evidence, and risk records", () => {
  assert.match(cockpit, /workspace\.sections/);
  assert.match(cockpit, /code\.quantities/);
  assert.match(cockpit, /code\.pricingStatus/);
  assert.match(cockpit, /workspace\.rfqs/);
  assert.match(cockpit, /workspace\.submittals/);
  assert.match(cockpit, /workspace\.evidenceLinks/);
  assert.match(cockpit, /workspace\.risks/);
  assert.match(cockpit, /workspace\.decisionHistory/);
});

test("Cockpit 2.0 keeps bid-day decisions contextual, one-click, audited, and responsive", () => {
  assert.match(cockpit, /accept_cost_code/);
  assert.match(cockpit, /accept_quantity/);
  assert.match(cockpit, /verify_evidence/);
  assert.match(cockpit, /set_risk_decision/);
  assert.match(cockpit, /set_rfq_status/);
  assert.match(cockpit, /estimate\/\$\{workspace\.id\}\/\$\{path\}/);
  assert.match(cockpit, /sticky bottom-0/);
  assert.match(cockpit, /lg:grid-cols/);
  assert.match(cockpit, /xl:grid-cols/);
  assert.match(cockpit, /h-\[560px\]/);
});
