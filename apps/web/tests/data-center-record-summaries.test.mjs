import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /type DataCenterRecordSummary/, "Data Center should define a normalized record summary type");
assert.match(page, /sourceApp/, "Data Center records should include source app");
assert.match(page, /sourceRecordId/, "Data Center records should include source record id");
assert.match(page, /confidence/, "Data Center records should include confidence");
assert.match(page, /buildEstimatorMemoryRecords/, "Estimator memory records should be built from current bid data");
assert.match(page, /estimate_item/, "Estimate item records should be represented");
assert.match(page, /rfq_quote/, "RFQ quote records should be represented");
assert.match(page, /buyout_award/, "Buyout award records should be represented");
assert.match(page, /actual_outcome/, "Actual outcome records should be represented");

console.log("data center record summary checks passed");
