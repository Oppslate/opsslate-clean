import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function buildReminderQueue/, "specDNA builds a reminder queue");
assert.match(specDNA, /reminderQueue/, "command center returns reminder queue");
assert.match(specDNA, /reminderSummary/, "command center returns reminder summary");
assert.match(specDNA, /export const markReminderSent\s*=\s*mutation/, "specDNA exposes reminder tracking mutation");
assert.match(specDNA, /recordType/, "reminder mutation accepts record type");
assert.match(specDNA, /submittal/, "reminder automation includes submittals");
assert.match(specDNA, /rfi/, "reminder automation includes RFIs");
assert.match(specDNA, /task/, "reminder automation includes tasks");
assert.match(specDNA, /subcontractor_request/, "reminder automation includes subcontractor requests");
assert.match(specDNA, /dueDate/, "reminder automation checks submittal due dates");
assert.match(specDNA, /dateRequired/, "reminder automation checks RFI required dates");
assert.match(specDNA, /dateScheduled/, "reminder automation checks task scheduled dates");
assert.match(specDNA, /lastReminderSentAt/, "reminder automation tracks last reminder date");
assert.match(specDNA, /reminderCount/, "reminder automation increments reminder count");
assert.match(specDNA, /actionRow\("Reminder"/, "reminders enter the action queue");

assert.match(schema, /rfis:[\s\S]*lastReminderSentAt/, "RFI schema stores reminder timestamps");
assert.match(schema, /rfis:[\s\S]*reminderCount/, "RFI schema stores reminder count");
assert.match(schema, /tasks:[\s\S]*lastReminderSentAt/, "Task schema stores reminder timestamps");
assert.match(schema, /tasks:[\s\S]*reminderCount/, "Task schema stores reminder count");

assert.match(panel, /reminderQueue/, "UI reads reminder queue");
assert.match(panel, /reminderSummary/, "UI reads reminder summary");
assert.match(panel, /Reminder \/ Follow-up Automation/, "UI renders reminder automation section");
assert.match(panel, /Due soon/, "UI renders due soon metric");
assert.match(panel, /Overdue/, "UI renders overdue metric");
assert.match(panel, /Subcontractor requests/, "UI renders subcontractor request metric");
assert.match(panel, /Mark reminded/, "UI can mark a reminder as sent");

assert.match(design, /Reminder \/ Follow-up automation/, "design doc tracks reminder automation slice");

console.log("specdna reminder automation checks passed");
