import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const commandCenter = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(commandCenter, /description\?: React\.ReactNode/, "collapsible sections support descriptions");
assert.match(commandCenter, /sectionDescription/, "UI renders section descriptions");
assert.match(commandCenter, /Needs Attention/, "UI has a top-level needs attention section");
assert.match(commandCenter, /More Intelligence/, "UI groups deeper panels behind more intelligence");
assert.match(commandCenter, /Designed for scan-first review/, "UI explains the cleaner command center");
assert.match(commandCenter, /Shows spec-driven problems/, "autonomous agent card describes expected value");
assert.match(commandCenter, /Compares addenda and revised specs/, "change impact card describes expected value");
assert.match(commandCenter, /Builds subcontractor-facing bid packages/, "bid package card describes expected value");
assert.match(commandCenter, /Shows what has been reviewed, approved, and pushed downstream/, "publish card describes expected value");
assert.match(commandCenter, /Keeps the detailed evidence, audit history, confidence scoring, and follow-up queues available without crowding the board/, "more intelligence card describes expected value");
assert.match(commandCenter, /hidden unless opened/i, "UI documents calmer collapsed detail behavior");

assert.match(design, /scan-first/, "design doc tracks scan-first command center cleanup");
assert.match(design, /More Intelligence/, "design doc tracks deeper panels grouped behind More Intelligence");

console.log("specdna command center cleanup checks passed");
