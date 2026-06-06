import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /function EstimatorMemoryView/, "Estimator Memory should be a dedicated view component");
assert.match(page, /Prediction Runs/, "Estimator Memory should show prediction runs");
assert.match(page, /Estimator Feedback/, "Estimator Memory should show estimator feedback");
assert.match(page, /Outcome Memory/, "Estimator Memory should show outcome memory");
assert.match(page, /Accepted Recommendations/, "Estimator Memory should show accepted recommendations");
assert.match(page, /Dismissed Recommendations/, "Estimator Memory should show dismissed recommendations");

console.log("estimator memory view checks passed");
