import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const estimating = readFileSync(join(process.cwd(), "convex", "estimating.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "estimate-requirements-panel.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(schema, /estimateItems:[\s\S]*sourceType/, "estimate items store source type");
assert.match(schema, /estimateItems:[\s\S]*sourceRequirementId/, "estimate items store source requirement id");
assert.match(schema, /estimateItems:[\s\S]*sourcePaymentRuleId/, "estimate items store source payment rule id");
assert.match(schema, /estimateItems:[\s\S]*sourceSpecSection/, "estimate items store source spec section");
assert.match(schema, /estimateItems:[\s\S]*sourceQuote/, "estimate items store source quote");
assert.match(schema, /estimateItems:[\s\S]*suggestionConfidence/, "estimate items store suggestion confidence");

assert.match(estimating, /function inferEstimateUnit/, "estimating infers units from measurement clauses");
assert.match(estimating, /function buildEstimateItemSuggestions/, "estimating builds estimate item suggestions");
assert.match(estimating, /scopeAssumption/, "suggestions use scope assumptions");
assert.match(estimating, /measurementLanguage/, "suggestions use measurement language");
assert.match(estimating, /payItemNotes/, "suggestions use pay item notes");
assert.match(estimating, /export const listEstimateItemSuggestions\s*=\s*query/, "estimating exposes suggestions query");
assert.match(estimating, /export const createSuggestedEstimateItems\s*=\s*mutation/, "estimating can create suggested estimate items");
assert.match(estimating, /ctx\.db\.query\("paymentRules"\)/, "suggestions read payment rules");
assert.match(estimating, /ctx\.db\.insert\("estimateItems"/, "suggestions insert estimate items");
assert.match(estimating, /sourceRequirementId/, "created estimate items keep requirement source");
assert.match(estimating, /sourcePaymentRuleId/, "created estimate items keep payment rule source");

assert.match(panel, /listEstimateItemSuggestions/, "estimate requirements panel reads suggestions");
assert.match(panel, /createSuggestedEstimateItems/, "estimate requirements panel can create suggested items");
assert.match(panel, /Estimate Item Suggestions/, "panel renders suggestion section");
assert.match(panel, /Suggested line item/, "panel labels suggested line items");
assert.match(panel, /Add Suggestions/, "panel exposes add suggestions action");
assert.match(panel, /Measurement basis/, "panel shows measurement basis");
assert.match(panel, /Source evidence/, "panel keeps source evidence visible");

assert.match(design, /Estimate item suggestions/, "design doc tracks estimate item suggestions slice");

console.log("specdna estimate item suggestion checks passed");
