import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const commandCenter = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const designDoc = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function sourceQualityScore/, "confidence v2 scores source quality");
assert.match(specDNA, /function duplicateEvidenceScore/, "confidence v2 scores duplicate evidence");
assert.match(specDNA, /function contradictionRiskScore/, "confidence v2 scores contradiction risk");
assert.match(specDNA, /function downstreamReadinessScore/, "confidence v2 scores downstream readiness");
assert.match(specDNA, /function buildConfidenceScoringV2/, "specDNA builds confidence scoring v2");
assert.match(specDNA, /confidenceScoringV2/, "command center returns confidence scoring v2");
assert.match(specDNA, /sourceQuality/, "confidence v2 includes source quality");
assert.match(specDNA, /duplicateEvidence/, "confidence v2 includes duplicate evidence");
assert.match(specDNA, /contradictionRisk/, "confidence v2 includes contradiction risk");
assert.match(specDNA, /downstreamReadiness/, "confidence v2 includes downstream readiness");
assert.match(specDNA, /scoreDrivers/, "confidence v2 explains score drivers");
assert.match(specDNA, /confidenceBand/, "confidence v2 assigns a confidence band");

assert.match(commandCenter, /Confidence Scoring v2/, "UI renders confidence scoring v2 panel");
assert.match(commandCenter, /Source Quality/, "UI displays source quality");
assert.match(commandCenter, /Duplicate Evidence/, "UI displays duplicate evidence");
assert.match(commandCenter, /Contradiction Risk/, "UI displays contradiction risk");
assert.match(commandCenter, /Downstream Readiness/, "UI displays downstream readiness");
assert.match(commandCenter, /Score Drivers/, "UI displays score drivers");
assert.match(commandCenter, /Confidence Band/, "UI displays confidence band");

assert.match(designDoc, /Spec Intelligence confidence scoring v2/, "design doc tracks confidence scoring v2");

console.log("specdna confidence scoring v2 checks passed");
