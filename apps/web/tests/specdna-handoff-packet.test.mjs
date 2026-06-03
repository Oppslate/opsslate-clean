import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function buildHandoffPacket/, "specDNA builds a handoff packet");
assert.match(specDNA, /handoffPacket/, "command center returns handoff packet");
assert.match(specDNA, /executiveSummary/, "handoff packet includes executive summary");
assert.match(specDNA, /openRisks/, "handoff packet includes open risks");
assert.match(specDNA, /downstreamSummary/, "handoff packet includes downstream summary");
assert.match(specDNA, /nextSteps/, "handoff packet includes next steps");
assert.match(specDNA, /sourceDocuments/, "handoff packet includes source documents");
assert.match(specDNA, /pmReadinessNarrative/, "handoff packet includes PM readiness narrative");

assert.match(panel, /handoffPacket/, "UI reads handoff packet");
assert.match(panel, /Bid-to-Build Handoff Packet/, "UI renders handoff packet title");
assert.match(panel, /Executive Summary/, "UI renders executive summary");
assert.match(panel, /Open Risks/, "UI renders open risks");
assert.match(panel, /Downstream Summary/, "UI renders downstream summary");
assert.match(panel, /Next Steps/, "UI renders next steps");
assert.match(panel, /Source Documents/, "UI renders source documents");
assert.match(panel, /PM Readiness/, "UI renders PM readiness");

assert.match(design, /Project handoff report/, "design doc tracks handoff report phase 2 slice");

console.log("specdna handoff packet checks passed");
