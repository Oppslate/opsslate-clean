import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(specDNA, /export const getCommandCenter\s*=\s*query/, "specDNA exposes command center query");
assert.match(specDNA, /specIntelligenceItems/, "command center reads matrix items");
assert.match(specDNA, /specIntakeRuns/, "command center reads intake runs");
assert.match(specDNA, /ctx\.db\.query\("rfis"\)/, "command center reads RFIs");
assert.match(specDNA, /ctx\.db\.query\("tasks"\)/, "command center reads tasks");
assert.match(specDNA, /ctx\.db\.query\("submittals"\)/, "command center reads submittals");
assert.match(specDNA, /ctx\.db\.query\("scheduleConstraints"\)/, "command center reads schedule constraints");
assert.match(specDNA, /ctx\.db\.query\("paymentRules"\)/, "command center reads payment rules");
assert.match(specDNA, /ctx\.db\.query\("estimateRequirements"\)/, "command center reads estimate requirements");
assert.match(specDNA, /coverageScore/, "command center returns coverage score");
assert.match(specDNA, /readiness/, "command center returns readiness lanes");
assert.match(specDNA, /attentionFlags/, "command center returns attention flags");
assert.match(specDNA, /actionQueue/, "command center returns action queue");
assert.match(specDNA, /handoffReadiness/, "command center returns handoff readiness");

assert.match(panel, /Spec Intelligence Command Center/, "UI renders command center title");
assert.match(panel, /coverageScore/, "UI renders coverage score");
assert.match(panel, /readiness/, "UI renders readiness lanes");
assert.match(panel, /actionQueue/, "UI renders action queue");
assert.match(panel, /attentionFlags/, "UI renders attention flags");
assert.match(panel, /Handoff Readiness/, "UI renders handoff readiness section");
assert.match(panel, /Source Evidence/, "UI renders source evidence");

assert.match(projectPage, /SpecIntelligenceCommandCenter/, "project page renders command center");
assert.match(projectPage, /<SpecIntelligenceCommandCenter[\s\S]*<SpecDNAPanel/, "command center renders before the matrix");

console.log("specdna command center checks passed");
