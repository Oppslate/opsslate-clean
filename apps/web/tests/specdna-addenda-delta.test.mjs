import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function buildAddendaDelta/, "specDNA builds addenda delta");
assert.match(specDNA, /addendaDelta/, "command center returns addenda delta");
assert.match(specDNA, /latestRunId/, "delta tracks latest run");
assert.match(specDNA, /previousRunId/, "delta tracks previous run");
assert.match(specDNA, /addedItems/, "delta includes added items");
assert.match(specDNA, /removedItems/, "delta includes removed items");
assert.match(specDNA, /changedItems/, "delta includes changed items");
assert.match(specDNA, /newRiskItems/, "delta includes new risk items");
assert.match(specDNA, /changeSummary/, "delta includes change summary");
assert.match(specDNA, /deltaKey/, "delta compares normalized obligation keys");
assert.match(specDNA, /actionRow\("Addenda"/, "addenda changes enter action queue");

assert.match(panel, /addendaDelta/, "UI reads addenda delta");
assert.match(panel, /Addenda Delta/, "UI renders addenda delta section");
assert.match(panel, /New Obligations/, "UI labels new obligations");
assert.match(panel, /Removed/, "UI labels removed obligations");
assert.match(panel, /Changed/, "UI labels changed obligations");
assert.match(panel, /New Risks/, "UI labels new risks");
assert.match(panel, /changeSummary/, "UI renders change summary");

assert.match(design, /Addenda comparison/, "design doc tracks addenda comparison slice");

console.log("specdna addenda delta checks passed");
