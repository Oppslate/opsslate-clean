import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /function MarketIntelligenceView/, "Market Intelligence should have a read-only view");
assert.match(page, /api\.marketIntelligence\.listMarketRecords/, "Estimating should query market intelligence records");
assert.match(page, /Public Bid Results/, "Market Intelligence should include public bid results");
assert.match(page, /Prevailing Wage/, "Market Intelligence should include prevailing wage");
assert.match(page, /Commodity Indexes/, "Market Intelligence should include commodities");
assert.match(page, /Owner Procurement History/, "Market Intelligence should include owner history");
assert.match(page, /market-intelligence-search/, "Market Intelligence should expose search");
assert.match(page, /Source URL/, "Market Intelligence should expose source URLs");

console.log("market intelligence UI checks passed");
