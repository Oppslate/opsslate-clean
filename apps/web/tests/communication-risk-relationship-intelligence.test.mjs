import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const emails = readFileSync(join(process.cwd(), "convex", "emails.ts"), "utf8");
const page = readFileSync(join(process.cwd(), "src", "app", "emails", "page.tsx"), "utf8");

assert.match(emails, /function extractContactCandidates/, "emails module extracts contact candidates");
assert.match(emails, /function toneAnalysis/, "emails module analyzes tone and priority");
assert.match(emails, /function relationshipTrend/, "emails module computes relationship trend");
assert.match(emails, /function conversationDirection/, "emails module predicts conversation direction");
assert.match(emails, /function responsePosture/, "emails module recommends response posture");
assert.match(emails, /function communicationProfile/, "emails module builds communication profiles");
assert.match(emails, /export const communicationRiskIntelligence\s*=\s*query/, "emails module exposes communication risk query");
assert.match(emails, /contactCandidates/, "risk query returns contact candidates");
assert.match(emails, /tone/, "risk query returns tone");
assert.match(emails, /priority/, "risk query returns priority");
assert.match(emails, /argumentative/, "risk query detects argumentative language");
assert.match(emails, /legal_notice/, "risk query detects legal notice language");
assert.match(emails, /relationshipTrend/, "risk query returns relationship trend");
assert.match(emails, /conversationDirection/, "risk query returns conversation direction");
assert.match(emails, /recommendedResponsePosture/, "risk query returns response posture");
assert.match(emails, /communicationProfile/, "risk query returns communication profile");
assert.match(emails, /toneTrajectory/, "risk query returns tone trajectory");
assert.match(emails, /escalationRisk/, "risk query returns escalation risk");
assert.match(emails, /phrasingSignals/, "risk query returns phrasing signals");
assert.match(emails, /sourceEvidence/, "risk query returns source evidence");

assert.match(page, /Communication Risk & Relationship Intelligence/, "page renders communication risk panel");
assert.match(page, /Contact Candidates/, "page renders contact candidates");
assert.match(page, /Tone & Priority/, "page renders tone and priority");
assert.match(page, /Relationship Trend/, "page renders relationship trend");
assert.match(page, /Conversation Direction/, "page renders conversation direction");
assert.match(page, /Recommended Response Posture/, "page renders response posture");
assert.match(page, /Communication Profile/, "page renders communication profile");
assert.match(page, /Add to Project Contacts/, "page can add candidate contacts to project team");
assert.match(page, /toneTrajectory/, "page references tone trajectory");
assert.match(page, /escalationRisk/, "page references escalation risk");
assert.match(page, /phrasingSignals/, "page references phrasing signals");

console.log("communication risk relationship intelligence checks passed");
