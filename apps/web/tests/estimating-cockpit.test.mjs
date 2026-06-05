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
assert.match(page, /border-orange-500\/35 bg-orange-500\/85 text-white hover:bg-orange-500/, "milestone action should be orange and sit in the bid action toolbar");

for (const sectionFlow of ["Add Section / Phase", "Parent Phase", "COMMON_CONSTRUCTION_PHASES", "Other", "Custom Phase Name", "opsslate_estimate_custom_phases"]) {
  assert.ok(page.includes(sectionFlow), `section/phase workflow should include ${sectionFlow}`);
}

for (const parentLineFlow of ["SECTION_PARENT_NOTE", "OPSSLATE_SECTION_PARENT", "Parent phase line created from + Section", "Parent line", "No estimate items yet. Add a child item under this phase when scope is ready."]) {
  assert.ok(page.includes(parentLineFlow), `section button should create and render parent bid lines: ${parentLineFlow}`);
}

for (const milestoneFlow of ["MilestoneModal", "Add Milestone", "Select the section parent", "MILESTONE_PARENT_NOTE", "OPSSLATE_MILESTONE_PARENT", "Milestone child line under", "estimateMilestoneOptions"]) {
  assert.ok(page.includes(milestoneFlow), `milestone workflow should include ${milestoneFlow}`);
}

for (const bidItemFlow of ["BidItemModal", "Add Item Under Milestone", "Quantity", "Unit of Measure", "Tax %", "Unit Cost", "Line Total", "Extended", "MILESTONE_ITEM_NOTE_PREFIX"]) {
  assert.ok(page.includes(bidItemFlow), `add item workflow should include ${bidItemFlow}`);
}

for (const moonshotFlow of ["MoveControls", "ORDER_NOTE_PREFIX", "OPSSLATE_ORDER", "RFQ required", "Request submittal", "RFQ_INTENT_NOTE", "SUBMITTAL_INTENT_NOTE", "TBD supplier", "Submittal Intent"]) {
  assert.ok(page.includes(moonshotFlow), `hierarchy moonshot workflow should include ${moonshotFlow}`);
}

for (const actionWiring of ["ProofModal", "onOpenProof", "openItemEditor", "saveEditedItemLine", "deleteBidItem", "deleteEstimateItem", "duplicateEstimateRow", "deleteEstimateRow", "onDuplicateEstimate", "onDeleteEstimate", "Save Item Changes"]) {
  assert.ok(page.includes(actionWiring), `estimating page should wire visible action buttons: ${actionWiring}`);
}

assert.match(page, /setActiveTool\("rfq"\)/, "request RFQ from a bid line should open the RFQ workspace");
assert.match(page, /itemSnapshots:\s*\[\{\s*id:/, "RFQ drafts created from item actions should store item snapshot ids consistently");
assert.doesNotMatch(page, /itemSnapshots:\s*\[\{\s*_id:/, "RFQ item snapshots should not use _id when comparison reads snapshot.id");

for (const detailText of ["Draft Actions", "Schedule readiness", "Estimate Total", "Request RFQ", "No bid items yet"]) {
  assert.ok(page.includes(detailText), `estimate detail worksheet should include ${detailText}`);
}

for (const builderText of ["Blank Estimate Slate", "Build the estimate structure", "Phase", "Section Under Phase", "Item Under Section", "Guardrail: an item cannot be created until Phase, Section, and Item are filled in.", "Create Estimate + Add Item", "ESTIMATE_PHASE_LIBRARY"]) {
  assert.ok(page.includes(builderText), `blank estimate slate should include ${builderText}`);
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
