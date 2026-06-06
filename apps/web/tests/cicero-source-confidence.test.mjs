import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /CiceroSourceBadge/, "Cicero actions should show source badges");
assert.match(page, /CiceroConfidenceBadge/, "Cicero actions should show confidence badges");
assert.match(page, /Internal Fact/, "Cicero should separate internal facts");
assert.match(page, /External Market Signal/, "Cicero should reserve external market signals");
assert.match(page, /Strategic Recommendation/, "Cicero should separate recommendations");

console.log("cicero source confidence checks passed");
