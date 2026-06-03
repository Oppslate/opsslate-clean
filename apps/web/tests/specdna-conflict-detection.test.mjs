import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function normalizeObligationText/, "specDNA normalizes obligation text for comparison");
assert.match(specDNA, /function detectDuplicateSignals/, "specDNA detects duplicate obligation signals");
assert.match(specDNA, /function detectConflictSignals/, "specDNA detects conflict signals");
assert.match(specDNA, /conflictSignals/, "command center returns conflict signals");
assert.match(specDNA, /duplicateSignals/, "command center returns duplicate signals");
assert.match(specDNA, /rfiRecommended/, "conflict signals can recommend RFI follow-up");
assert.match(specDNA, /attentionFlags[\s\S]*conflicts/, "attention flags include conflicts");
assert.match(specDNA, /attentionFlags[\s\S]*duplicates/, "attention flags include duplicates");
assert.match(specDNA, /actionRow\("Conflict"/, "conflicts enter the action queue");
assert.match(specDNA, /actionRow\("Duplicate"/, "duplicates enter the action queue");

assert.match(panel, /Conflict Watch/, "UI renders conflict watch section");
assert.match(panel, /conflictSignals/, "UI reads conflict signals");
assert.match(panel, /duplicateSignals/, "UI reads duplicate signals");
assert.match(panel, /RFI recommended/, "UI labels RFI recommendations");
assert.match(panel, /Duplicates/, "UI labels duplicates");
assert.match(panel, /Conflicts/, "UI labels conflicts");

assert.match(design, /Duplicate and conflict detection/, "design doc tracks duplicate/conflict phase 2 slice");

console.log("specdna conflict detection checks passed");
