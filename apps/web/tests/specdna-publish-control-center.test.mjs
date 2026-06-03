import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const commandCenter = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function downstreamRecordLabel/, "specDNA labels downstream record types");
assert.match(specDNA, /function buildPublishControlCenter/, "specDNA builds publish control center");
assert.match(specDNA, /publishControlCenter/, "command center returns publish control center");
assert.match(specDNA, /readyToCommit/, "publish center tracks ready-to-commit items");
assert.match(specDNA, /publishedRecords/, "publish center tracks published records");
assert.match(specDNA, /downstreamLedger/, "publish center returns downstream ledger");
assert.match(specDNA, /byDestination/, "publish center groups by destination");
assert.match(specDNA, /recordId/, "publish center includes downstream record ids");
assert.match(specDNA, /createdRecordType/, "publish center reads created record type");
assert.match(specDNA, /createdRecordId/, "publish center reads created record id");

assert.match(commandCenter, /publishControlCenter/, "UI reads publish control center");
assert.match(commandCenter, /Commit \/ Publish Control Center/, "UI renders publish control center");
assert.match(commandCenter, /Ready to Commit/, "UI shows ready-to-commit count");
assert.match(commandCenter, /Published Downstream/, "UI shows published downstream count");
assert.match(commandCenter, /Downstream Ledger/, "UI renders downstream ledger");
assert.match(commandCenter, /RFIs/, "UI shows RFIs destination");
assert.match(commandCenter, /Tasks/, "UI shows tasks destination");
assert.match(commandCenter, /Submittals/, "UI shows submittals destination");
assert.match(commandCenter, /Estimate Items/, "UI shows estimate items destination");
assert.match(commandCenter, /Billing Rules/, "UI shows billing destination");
assert.match(commandCenter, /Schedule Logic/, "UI shows schedule destination");

assert.match(panel, /Commit Approved moves approved items into OpsSlate/, "matrix still explains commit behavior");
assert.match(panel, /commitApproved/, "matrix still provides commit action");

assert.match(design, /Commit \/ publish control center/, "design doc tracks publish control center");

console.log("specdna publish control center checks passed");
