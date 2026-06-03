import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const commandCenter = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const designDoc = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function agentRecommendation/, "specDNA has autonomous recommendation helper");
assert.match(specDNA, /function buildAutonomousSpecAgent/, "specDNA builds autonomous spec agent");
assert.match(specDNA, /autonomousSpecAgent/, "command center returns autonomous spec agent");
assert.match(specDNA, /watchDomains/, "agent includes watched domains");
assert.match(specDNA, /recommendedActions/, "agent returns recommended actions");
assert.match(specDNA, /riskLevel/, "agent recommendations include risk level");
assert.match(specDNA, /nextBestAction/, "agent recommendations include next best action");
assert.match(specDNA, /automationCandidate/, "agent identifies automation candidates");
assert.match(specDNA, /rfi_watch/, "agent watches RFI problems");
assert.match(specDNA, /submittal_watch/, "agent watches submittal problems");
assert.match(specDNA, /task_watch/, "agent watches task problems");
assert.match(specDNA, /schedule_watch/, "agent watches schedule problems");
assert.match(specDNA, /billing_watch/, "agent watches billing problems");
assert.match(specDNA, /estimating_watch/, "agent watches estimating problems");

assert.match(commandCenter, /Autonomous Spec Agent/, "UI renders autonomous spec agent panel");
assert.match(commandCenter, /Project Watch/, "UI shows project watch status");
assert.match(commandCenter, /Recommended Actions/, "UI shows recommended actions");
assert.match(commandCenter, /Next Best Action/, "UI shows next best action");
assert.match(commandCenter, /Automation Candidate/, "UI labels automation candidates");
assert.match(commandCenter, /RFIs/, "UI shows RFI watched domain");
assert.match(commandCenter, /Submittals/, "UI shows submittal watched domain");
assert.match(commandCenter, /Tasks/, "UI shows task watched domain");
assert.match(commandCenter, /Schedule/, "UI shows schedule watched domain");
assert.match(commandCenter, /Billing/, "UI shows billing watched domain");
assert.match(commandCenter, /Estimating/, "UI shows estimating watched domain");

assert.match(designDoc, /Autonomous Spec Agent/, "design doc tracks autonomous spec agent");

console.log("specdna autonomous spec agent checks passed");
