import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /function DataCenterView/, "Data Center shell should be a dedicated view component");
assert.match(page, /Company Intelligence/, "Data Center should show Company Intelligence");
assert.match(page, /Market Intelligence/, "Data Center should show Market Intelligence");
assert.match(page, /Strategic Playbooks/, "Data Center should show Strategic Playbooks");
assert.match(page, /data-center-search/, "Data Center should expose search");
assert.match(page, /data-center-detail/, "Data Center should expose a detail area");

console.log("data center shell checks passed");
