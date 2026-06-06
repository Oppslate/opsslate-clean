import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const schema = readFileSync(join(root, "convex/schema.ts"), "utf8");
const market = readFileSync(join(root, "convex/marketIntelligence.ts"), "utf8");

assert.match(schema, /marketIntelligenceRecords/, "Schema should include market intelligence records");
assert.match(schema, /sourceUrl/, "Market records should include source URL");
assert.match(schema, /region/, "Market records should include region");
assert.match(schema, /ownerAgency/, "Market records should include owner or agency");
assert.match(schema, /refreshDate/, "Market records should include refresh date");
assert.match(market, /createMarketRecord/, "Market module should create market records");
assert.match(market, /listMarketRecords/, "Market module should list market records");
assert.match(market, /updateMarketRecord/, "Market module should update market records");
assert.match(market, /removeMarketRecord/, "Market module should remove market records");

console.log("market intelligence schema checks passed");
