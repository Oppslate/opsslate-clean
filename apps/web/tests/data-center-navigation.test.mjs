import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /Data Center/, "Estimating navigation should expose Data Center");
assert.match(page, /Estimator Memory/, "Data Center should include Estimator Memory");
assert.match(page, /Vendor Pricing/, "Data Center should include Vendor Pricing");
assert.match(page, /Production Rates/, "Data Center should include Production Rates");
assert.match(page, /Market Intelligence/, "Data Center should include Market Intelligence");

console.log("data center navigation checks passed");
