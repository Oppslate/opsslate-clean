import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const rfis = readFileSync(join(process.cwd(), "convex", "rfis.ts"), "utf8");
const submittals = readFileSync(join(process.cwd(), "convex", "submittals.ts"), "utf8");
const tasks = readFileSync(join(process.cwd(), "convex", "tasks.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const commandCenter = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const designDoc = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(schema, /resolvedByRecordType:\s*v\.optional\(v\.string\(\)\)/, "matrix items store downstream resolution record type");
assert.match(schema, /resolvedByRecordId:\s*v\.optional\(v\.string\(\)\)/, "matrix items store downstream resolution record id");
assert.match(schema, /resolvedNote:\s*v\.optional\(v\.string\(\)\)/, "matrix items store downstream resolution note");
assert.match(schema, /closedLoopSyncedAt:\s*v\.optional\(v\.number\(\)\)/, "matrix items store closed-loop sync timestamp");

assert.match(rfis, /syncSpecIntelligenceResolution/, "RFI module has closed-loop sync helper");
assert.match(rfis, /recordType:\s*"rfi"/, "RFI answer stamps record type");
assert.match(rfis, /closedLoopSyncedAt:\s*Date\.now\(\)/, "RFI answer stamps sync time");

assert.match(submittals, /syncSpecIntelligenceResolution/, "submittal module has closed-loop sync helper");
assert.match(submittals, /record\.sourceType !== "spec_intelligence"/, "submittal sync only applies to spec intelligence records");
assert.match(submittals, /recordType:\s*"submittal"/, "submittal approval stamps record type");
assert.match(submittals, /reviewAction/, "submittal review drives closed-loop sync");
assert.match(submittals, /resolutionStatus:\s*"resolved"/, "submittal approval resolves source item");

assert.match(tasks, /syncSpecIntelligenceResolution/, "task module has closed-loop sync helper");
assert.match(tasks, /sourceType === "spec_intelligence"/, "task sync only applies to spec intelligence records");
assert.match(tasks, /recordType:\s*"task"/, "task completion stamps record type");
assert.match(tasks, /status === "Complete"/, "task complete drives closed-loop sync");
assert.match(tasks, /progress === 100/, "100 percent progress drives closed-loop sync");

assert.match(specDNA, /closed_loop_sync/, "audit trail includes closed-loop sync event");
assert.match(commandCenter, /Closed Loop Sync/, "command center displays closed-loop sync events");
assert.match(commandCenter, /resolvedByRecordType/, "command center shows downstream record type");

assert.match(designDoc, /Closed-loop sync/, "design doc tracks closed-loop sync");

console.log("specdna closed-loop sync checks passed");
