import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const commandCenter = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function buildBidPackageIntelligence/, "specDNA builds bid package intelligence");
assert.match(specDNA, /function buildTradePackage/, "specDNA builds trade packages");
assert.match(specDNA, /bidPackageIntelligence/, "command center returns bid package intelligence");
assert.match(specDNA, /tradePackages/, "bid intelligence includes trade packages");
assert.match(specDNA, /bidInvitations/, "bid intelligence includes bid invitations");
assert.match(specDNA, /submittalRequirements/, "bid intelligence includes submittal requirements");
assert.match(specDNA, /scopeSheets/, "bid intelligence includes scope sheets");
assert.match(specDNA, /reminderPaths/, "bid intelligence includes reminder paths");
assert.match(specDNA, /recommendedSubcontractors/, "bid intelligence recommends subcontractors");
assert.match(specDNA, /scopeInclusions/, "scope sheets include inclusions");
assert.match(specDNA, /scopeExclusions/, "scope sheets include exclusions");
assert.match(specDNA, /sourceEvidence/, "bid packages preserve source evidence");
assert.match(specDNA, /inviteStatus:\s*"draft"/, "bid invitations start as drafts");
assert.match(specDNA, /followUpStatus:\s*"not_started"/, "reminder paths start not started");

assert.match(commandCenter, /Bid Package \/ Subcontractor Intelligence/, "UI renders bid package intelligence");
assert.match(commandCenter, /Trade Packages/, "UI shows trade packages");
assert.match(commandCenter, /Bid Invitations/, "UI shows bid invitations");
assert.match(commandCenter, /Scope Sheets/, "UI shows scope sheets");
assert.match(commandCenter, /Submittal Requirements/, "UI shows submittal requirements");
assert.match(commandCenter, /Reminder Paths/, "UI shows reminder paths");
assert.match(commandCenter, /Recommended Subs/, "UI shows recommended subcontractors");

assert.match(design, /Bid Package \/ Subcontractor Intelligence/, "design doc tracks bid package intelligence");

console.log("specdna bid package intelligence checks passed");
