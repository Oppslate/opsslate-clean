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
assert.match(page, /bidPortfolioRows/, "bid portfolio should be driven by project rows");
assert.match(page, /estimateForProject/, "bid portfolio should attach estimates to their project rows");
assert.match(page, /projectDisplayName/, "bid portfolio should show the project name as the primary row label");
assert.match(page, /Open Estimate/, "project portfolio rows with estimates should open the estimate");
assert.match(page, /Start Estimate/, "project portfolio rows without estimates should prompt the estimator to start one");
assert.match(page, /No estimate/, "project portfolio should show a clear empty estimate state");
assert.match(page, /EstimateDetailView/, "opening a bid should render the estimate item drill-down worksheet");
assert.match(page, /EstimatesListView/, "estimates tool should render a clean estimate list view");
assert.match(page, /activeTool !== "cockpit" && activeTool !== "estimates" \? bidActionToolbar : null/, "bid command toolbar should render only after opening the bid workspace");
assert.match(page, /setActiveTool\(row\.estimate\?\._id \? "estimate-detail" : "estimates"\)/, "portfolio open action should drill into estimate detail when an estimate exists");
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

for (const action of ["← Back", "+ Section", "+ Milestone", "+ Add Item", "+ From Cost DB", "Print Bid", "AI Tools", "Production", "Bid Package", "Settings"]) {
  assert.ok(page.includes(action), `estimating cockpit top toolbar should include ${action}`);
}

for (const sectionFlow of ["Add Section / Phase", "Section / Phase Type", "COMMON_CONSTRUCTION_PHASES", "Other", "Custom Phase Name", "opsslate_estimate_custom_phases"]) {
  assert.ok(page.includes(sectionFlow), `section/phase workflow should include ${sectionFlow}`);
}

for (const detailText of ["Draft Actions", "Schedule readiness", "Estimate Total", "Request RFQ", "No bid items yet"]) {
  assert.ok(page.includes(detailText), `estimate detail worksheet should include ${detailText}`);
}

for (const builderText of ["Guided Estimate Builder", "Phase", "Section Under Phase", "Item Under Section", "Create Estimate + First Item", "ESTIMATE_PHASE_LIBRARY"]) {
  assert.ok(page.includes(builderText), `guided estimate builder should include ${builderText}`);
}

for (const productionTool of ["Ops-Takeoff", "Production Breakdown", "Equipment Analyzer", "Equipment Dealers"]) {
  assert.ok(page.includes(productionTool), `production dropdown should include ${productionTool}`);
}

for (const productionText of ["Production Rate Breakdown", "Equipment Hours", "Man-Hours", "Production Days", "Labor Cost", "Equipment Cost", "Prevailing Rates", "Back to Estimate", "Print / PDF", "Recalculate"]) {
  assert.ok(page.includes(productionText), `production rate breakdown should include ${productionText}`);
}

for (const helper of ["estimateTotal", "rfqCounts", "scheduleReadinessScore", "predictiveSignalsForEstimate"]) {
  assert.match(page, new RegExp(helper), `estimating cockpit should use ${helper}`);
}

for (const helper of ["productionRowsForItems", "productionSummaryForRows", "productionRateForItem", "ProductionRateBreakdownView"]) {
  assert.match(page, new RegExp(helper), `production breakdown should use ${helper}`);
}

console.log("estimating cockpit checks passed");
