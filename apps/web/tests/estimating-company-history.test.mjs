import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src", "app", "estimating", "page.tsx"), "utf8");
const estimating = readFileSync(join(process.cwd(), "convex", "estimating.ts"), "utf8");

assert.match(estimating, /export const listCompanyEstimateItems = query/, "estimating data layer should expose company-wide estimate item history");
assert.match(estimating, /args:\s*\{\s*companyId:\s*v\.id\("companies"\)/, "company-wide estimate item history should be scoped to the company");
assert.match(estimating, /ctx\.db\.query\("estimateItems"\)\s*\.withIndex\("by_company"/, "company-wide estimate item history should read estimateItems by company");

assert.match(page, /api\.estimating\.listCompanyEstimateItems/, "estimating page should load all company estimate items");
assert.match(page, /const historicalEstimateItems = useQuery/, "estimating page should keep selected estimate items separate from company history");
assert.match(page, /historicalItems:\s*historicalEstimateItems \|\| \[\]/, "predictive model should learn from all company estimate items");
assert.doesNotMatch(page, /historicalItems:\s*estimateItems \|\| \[\]/, "predictive model should not use only the selected estimate as historical item memory");

console.log("company historical estimate item wiring checks passed");
