import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const commandCenter = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function buildSpecChangeImpactEngine/, "specDNA builds change impact engine");
assert.match(specDNA, /specChangeImpactEngine/, "command center returns change impact engine");
assert.match(specDNA, /impactedRecords/, "change impact includes impacted downstream records");
assert.match(specDNA, /severityScore/, "change impact includes severity scoring");
assert.match(specDNA, /recommendedAction/, "change impact recommends actions");
assert.match(specDNA, /affectedModules/, "change impact maps affected modules");
assert.match(specDNA, /estimate_items/, "change impact checks estimating impacts");
assert.match(specDNA, /bid_packages/, "change impact checks bid package impacts");
assert.match(specDNA, /subcontractor_notifications/, "change impact checks subcontractor notification impacts");
assert.match(specDNA, /sourceEvidence/, "change impact preserves source evidence");

assert.match(commandCenter, /function CollapsibleCommandSection/, "UI has reusable collapsible section");
assert.match(commandCenter, /collapsedSections/, "UI tracks collapsed sections");
assert.match(commandCenter, /defaultCollapsed/, "UI supports default collapsed state");
assert.match(commandCenter, /Spec Change Impact Engine/, "UI renders change impact engine");
assert.match(commandCenter, /Downstream Records Affected/, "UI shows impacted downstream record count");
assert.match(commandCenter, /Recommended Action/, "UI shows recommended action");
assert.match(commandCenter, /Show|Hide/, "UI exposes collapse controls");

assert.match(design, /Spec Change Impact Engine/, "design doc tracks change impact engine");
assert.match(design, /collapsible/, "design doc tracks collapsible command center cards");

console.log("specdna change impact and collapsible checks passed");
