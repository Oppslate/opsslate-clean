import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /sourceRecords/, "Cicero recommendation actions should carry source records");
assert.match(page, /Source Records/, "Cicero recommendation cards should show source records");
assert.match(page, /sourceRecordId/, "Recommendation source records should preserve source record ids");
assert.match(page, /sourceType/, "Recommendation source records should preserve source types");
assert.match(page, /sourceRecordTrailForAction/, "Cicero should derive source trails from memory records");
assert.match(page, /Source Trail:/, "Estimator feedback should store a source trail");

console.log("cicero source trail checks passed");
