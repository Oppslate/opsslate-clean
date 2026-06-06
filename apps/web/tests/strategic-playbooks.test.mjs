import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /type StrategicPlaybook/, "Strategic playbooks should have a typed model");
assert.match(page, /STRATEGIC_PLAYBOOKS/, "Strategic playbooks should have a starter library");
assert.match(page, /function StrategicPlaybooksView/, "Strategic playbooks should have a dedicated view");
assert.match(page, /Fast Strike Bid/, "Fast Strike Bid should exist");
assert.match(page, /Margin Defense Bid/, "Margin Defense Bid should exist");
assert.match(page, /Quote Lock Strategy/, "Quote Lock Strategy should exist");
assert.match(page, /Schedule Compression Trap/, "Schedule Compression Trap should exist");
assert.match(page, /Spec Gap Exposure/, "Spec Gap Exposure should exist");
assert.match(page, /No-Bid Warning/, "No-Bid Warning should exist");
assert.match(page, /sourceMix/, "Playbooks should show source mix");

console.log("strategic playbook checks passed");
