import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src", "app", "estimating", "page.tsx"), "utf8");

assert.match(page, /Estimating Cockpit/, "estimating route should render the cockpit");
assert.match(page, /<AppShell showSidebar={false}>/, "estimating cockpit should not render the Project Management sidebar shell");
assert.match(page, /Estimator Command Center/, "estimating route should include an estimating-specific sidebar");
assert.match(page, /Project Selection/, "estimating cockpit should include a project selection dropdown");
assert.match(page, /setSelectedProjectId/, "project selection should update cockpit project context");
assert.match(page, /projectFilteredEstimates/, "project selection should filter the bid portfolio and metrics");
assert.match(page, /All projects/, "project dropdown should allow the estimator to view all projects");
assert.match(page, /Bid Command Center/, "cockpit should use bid-first command center language");
assert.match(page, /RFQ Desk/, "RFQ workspace should remain available as a tool");
assert.match(page, /Predictive Bid Engine/, "cockpit should include predictive bid engine panel");
assert.match(page, /Schedule Readiness/, "cockpit should include schedule alignment/readiness");
assert.match(page, /Bid Portfolio/, "cockpit should include bid portfolio table");
assert.match(page, /Bid Pulse/, "cockpit should include bid pulse panel");
assert.match(page, /AI Estimator/, "cockpit should include AI Estimator action queue");
assert.match(page, /italic text-orange-100/, "inspiration quote should use italic styling");

for (const label of ["Materials", "Labor", "Equipment", "Historical Bid Database", "Risk Database"]) {
  assert.ok(page.includes(label), `estimating sidebar should include ${label}`);
}

for (const action of ["← Back", "+ Section", "+ Add Item", "+ From Cost DB", "Print Bid", "AI Tools", "Production", "Bid Package", "Settings"]) {
  assert.ok(page.includes(action), `estimating cockpit top toolbar should include ${action}`);
}

for (const helper of ["estimateTotal", "rfqCounts", "scheduleReadinessScore", "predictiveSignalsForEstimate"]) {
  assert.match(page, new RegExp(helper), `estimating cockpit should use ${helper}`);
}

console.log("estimating cockpit checks passed");
