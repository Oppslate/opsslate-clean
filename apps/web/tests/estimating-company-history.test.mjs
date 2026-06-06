import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src", "app", "estimating", "page.tsx"), "utf8");
const estimating = readFileSync(join(process.cwd(), "convex", "estimating.ts"), "utf8");

assert.match(estimating, /export const listCompanyEstimateItems = query/, "estimating data layer should expose company-wide estimate item history when Convex functions are deployed");
assert.match(estimating, /args:\s*\{\s*companyId:\s*v\.id\("companies"\)/, "company-wide estimate item history should be scoped to the company");
assert.match(estimating, /ctx\.db\.query\("estimateItems"\)\s*\.withIndex\("by_company"/, "company-wide estimate item history should read estimateItems by company");

assert.match(page, /HistoricalEstimateItemsCollector/, "estimating page should collect historical items across all company estimates with deployed queries");
assert.match(page, /HistoricalEstimateItemsProbe/, "estimating page should load each estimate's items without depending on an undeployed Convex function");
assert.doesNotMatch(page, /api\.estimating\.listCompanyEstimateItems/, "estimating page should not crash if a new Convex function is not deployed yet");
assert.match(page, /const historicalEstimateItems = useMemo\(\(\) => Object\.values\(historicalItemsByEstimate\)\.flat\(\)/, "estimating page should keep selected estimate items separate from company history");
assert.match(page, /historicalItems:\s*historicalEstimateItems \|\| \[\]/, "predictive model should learn from all company estimate items");
assert.doesNotMatch(page, /historicalItems:\s*estimateItems \|\| \[\]/, "predictive model should not use only the selected estimate as historical item memory");

console.log("company historical estimate item wiring checks passed");
