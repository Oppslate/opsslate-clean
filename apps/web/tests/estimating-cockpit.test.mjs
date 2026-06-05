import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src", "app", "estimating", "page.tsx"), "utf8");

assert.match(page, /Estimating Cockpit/, "estimating route should render the cockpit");
assert.match(page, /<AppShell showSidebar={false} showTopBar={false}>/, "estimating cockpit should not render the Project Management sidebar or extra utility bar");
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
assert.match(page, /showBidActionToolbar \? \(/, "bid command toolbar should render only after opening the bid workspace");
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

for (const action of ["← Back", "+ Section", "+ Add Item", "+ From Cost DB", "Print Bid", "AI Tools", "Production", "Bid Package", "Settings"]) {
  assert.ok(page.includes(action), `estimating cockpit top toolbar should include ${action}`);
}
assert.doesNotMatch(page, /\+ Milestone/, "estimate toolbar should not create milestone hierarchy lines");

for (const sectionFlow of ["Add Section / Phase", "Parent Phase", "COMMON_CONSTRUCTION_PHASES", "Other", "Custom Phase Name", "opsslate_estimate_custom_phases"]) {
  assert.ok(page.includes(sectionFlow), `section/phase workflow should include ${sectionFlow}`);
}

for (const parentLineFlow of ["SECTION_PARENT_NOTE", "OPSSLATE_SECTION_PARENT", "Parent phase line created from + Section", "No bid items yet"]) {
  assert.ok(page.includes(parentLineFlow), `section button should create and render parent bid lines: ${parentLineFlow}`);
}

for (const polishedEstimateUi of ["SectionGlyph", "fixed left-4 right-4 top-[76px] z-[90]", "h-[72px] shrink-0", "Bid Clock", "Engineer Est.", "Current Bid", "Bid Delta", "engineerEstimateValue", "bidDateValue", "project?.contractDate", "bidCountdownLabel", "HierarchyRenameModal", "Edit Section", "deleteSectionGroup", "saveSectionRename"]) {
  assert.ok(page.includes(polishedEstimateUi), `estimate detail should include polished bid command UI: ${polishedEstimateUi}`);
}
for (const childRowIndent of ['data-estimate-child-row="true"', "p-3 pl-12", "-left-6 top-2 h-px w-4"]) {
  assert.ok(page.includes(childRowIndent), `estimate child rows should be visually indented under their parent section: ${childRowIndent}`);
}

assert.ok(!page.includes("Folder {section}"), "estimate section rows should use a folder icon instead of the word Folder");
assert.ok(!page.includes("Parent line"), "estimate section rows should not display non-actionable parent line filler text");

for (const removedMilestoneFlow of ["MilestoneModal", "Add Milestone", "Select the section parent", "Milestone child line under", "estimateMilestoneOptions", "Edit Milestone", "deleteMilestoneGroup", "saveMilestoneRename"]) {
  assert.ok(!page.includes(removedMilestoneFlow), `estimate workflow should not include milestone hierarchy: ${removedMilestoneFlow}`);
}

for (const bidItemFlow of ["BidItemModal", "Add Estimate Item", "Section", "Quantity", "Unit of Measure", "Tax %", "Unit Cost", "Line Total", "Extended"]) {
  assert.ok(page.includes(bidItemFlow), `add item workflow should include ${bidItemFlow}`);
}
for (const itemDescriptionDropdownFlow of ["COMMON_ESTIMATE_ITEM_DESCRIPTIONS", "Survey Operations", "Duct Bank Excavation", "Select item description", "Type custom item description", "opsslate_estimate_custom_item_descriptions"]) {
  assert.ok(page.includes(itemDescriptionDropdownFlow), `item description should use saved dropdown options with custom Other entries: ${itemDescriptionDropdownFlow}`);
}

for (const itemEntryFlow of ["Scope / Proof Notes", "RFQ Vendor / Supplier", "RFQ Due Date", "Submittal Requirement", "Production Days", "Crew Size", "Lead Time / Constraint", "ITEM_SCOPE_NOTE_PREFIX", "ITEM_RFQ_DETAIL_PREFIX", "ITEM_SUBMITTAL_DETAIL_PREFIX", "ITEM_SCHEDULE_DETAIL_PREFIX"]) {
  assert.ok(page.includes(itemEntryFlow), `bid item modal should capture estimator detail at item creation/edit: ${itemEntryFlow}`);
}

for (const modalOwnedAction of ["RFI required", "RFI Question", "Attach snippet", "Snippet title", "Snippet purpose", "ITEM_RFI_DETAIL_PREFIX", "RFI_INTENT_NOTE"]) {
  assert.ok(page.includes(modalOwnedAction), `add/edit item modal should own line evidence/action capture: ${modalOwnedAction}`);
}

for (const rowAction of ["onRequestQuote(item)", "onCreateRfi(item)", "onCreateSubmittal(item)", "onAttachSnippet(item)"]) {
  assert.doesNotMatch(page, new RegExp(`<Button size="sm" variant="outline" onClick=\\{\\(\\) => ${rowAction.replace(/[()]/g, "\\$&")}\\}`), `estimate worksheet rows should not expose cluttered action button ${rowAction}`);
}

assert.match(page, /activeTool === "war-room" \? aiToolsWorkspace/, "AI estimator cards should live behind the AI Tools workspace, not in the estimate worksheet");

for (const moonshotFlow of ["MoveControls", "ORDER_NOTE_PREFIX", "OPSSLATE_ORDER", "RFQ required", "Request submittal", "RFQ_INTENT_NOTE", "SUBMITTAL_INTENT_NOTE", "TBD supplier", "Submittal Intent"]) {
  assert.ok(page.includes(moonshotFlow), `hierarchy moonshot workflow should include ${moonshotFlow}`);
}

for (const actionWiring of ["ProofModal", "onOpenProof", "openItemEditor", "saveEditedItemLine", "deleteBidItem", "deleteEstimateItem", "duplicateEstimateRow", "deleteEstimateRow", "onDuplicateEstimate", "onDeleteEstimate", "Save Item Changes"]) {
  assert.ok(page.includes(actionWiring), `estimating page should wire visible action buttons: ${actionWiring}`);
}

for (const ciceroFeature of ["CiceroCommandPanel", "HandoffPipelinePanel", "SnippetModal", "SNIPPET_NOTE_PREFIX", "ESTIMATE_HANDOFF_PREFIX", "ESTIMATOR_ACTION_PREFIX", "Bid Survival Score", "Save Snippet", "Send to PM", "Send to Scheduler", "PM Handoff", "Scheduler Handoff"]) {
  assert.ok(page.includes(ciceroFeature), `Cicero estimator engine should include ${ciceroFeature}`);
}

for (const pipelineBehavior of ["sendEstimateHandoff", "createCiceroAction", "openSnippetTool", "saveSnippetToItem", "window.location.href = target", "/scheduler", "/project-management"]) {
  assert.ok(page.includes(pipelineBehavior), `estimating pipeline should wire ${pipelineBehavior}`);
}

for (const launchpadAction of ["createRfiFromEstimateItem", "createSubmittalFromEstimateItem", "pushEstimateItemToSchedule", "api.rfis.create", "api.submittals.create", "api.tasks.create", "sourceType: \"estimate_item\"", "Scheduler task created from this estimate line"]) {
  assert.ok(page.includes(launchpadAction), `line item launchpad should include ${launchpadAction}`);
}

assert.match(page, /setActiveTool\("rfq"\)/, "request RFQ from a bid line should open the RFQ workspace");
assert.match(page, /itemSnapshots:\s*\[\{\s*id:/, "RFQ drafts created from item actions should store item snapshot ids consistently");
assert.doesNotMatch(page, /itemSnapshots:\s*\[\{\s*_id:/, "RFQ item snapshots should not use _id when comparison reads snapshot.id");

for (const detailText of ["Draft Actions", "Schedule readiness", "Estimate Total", "Request RFQ", "No bid items yet"]) {
  assert.ok(page.includes(detailText), `estimate detail worksheet should include ${detailText}`);
}

for (const removedBuilderText of ["Blank Estimate Slate", "Build the estimate structure", "Guardrail: an item cannot be created until Phase, Section, and Item are filled in.", "Create Estimate + Add Item", "ESTIMATE_PHASE_LIBRARY"]) {
  assert.ok(!page.includes(removedBuilderText), `estimates page should not show the experimental blank slate builder: ${removedBuilderText}`);
}
assert.match(page, /Start Estimate/, "estimates list should remain the starting point for project estimates");

for (const productionTool of ["Ops-Takeoff", "Production Breakdown", "Equipment Analyzer", "Equipment Dealers"]) {
  assert.ok(page.includes(productionTool), `production dropdown should include ${productionTool}`);
}

for (const productionText of ["Production Rate Breakdown", "Equipment Hours", "Man-Hours", "Production Days", "Labor Cost", "Equipment Cost", "Prevailing Rates", "Back to Estimate", "Print / PDF", "Recalculate"]) {
  assert.ok(page.includes(productionText), `production rate breakdown should include ${productionText}`);
}

for (const helper of ["estimateTotal", "rfqCounts", "scheduleReadinessScore", "predictiveSignalsForEstimate"]) {
  assert.match(page, new RegExp(helper), `estimating cockpit should use ${helper}`);
}

for (const predictiveModel of ["buildPredictiveEstimatorModel", "Bid Survival Score", "Margin Risk", "Scope Gap Risk", "RFQ Exposure", "Production Confidence", "Historical Similarity", "Recommended Draft Actions"]) {
  assert.ok(page.includes(predictiveModel), `estimating cockpit should include predictive estimator model output: ${predictiveModel}`);
}

for (const predictiveInput of ["historicalEstimates", "historicalItems", "historicalWinRate", "similarEstimateMatches", "scopeGapRisk", "marginRisk", "rfqExposure", "productionConfidence"]) {
  assert.ok(page.includes(predictiveInput), `predictive estimator should learn from bidding history and score ${predictiveInput}`);
}

for (const helper of ["productionRowsForItems", "productionSummaryForRows", "productionRateForItem", "ProductionRateBreakdownView"]) {
  assert.match(page, new RegExp(helper), `production breakdown should use ${helper}`);
}

console.log("estimating cockpit checks passed");
