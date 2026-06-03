import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /export const getReminderTarget\s*=\s*query/, "specDNA resolves reminder target records");
assert.match(specDNA, /contacts/, "reminder notifications resolve project contacts for assignees");
assert.match(specDNA, /export const sendReminderNotification\s*=\s*action/, "specDNA exposes reminder notification action");
assert.match(specDNA, /channel:\s*v\.union\(v\.literal\("email"\),\s*v\.literal\("sms"\)\)/, "notification action supports email and sms channels");
assert.match(specDNA, /RESEND_API_KEY/, "email reminders use existing Resend provider");
assert.match(specDNA, /https:\/\/api\.resend\.com\/emails/, "email reminders call Resend email API");
assert.match(specDNA, /TWILIO_ACCOUNT_SID/, "SMS reminders check Twilio account SID");
assert.match(specDNA, /TWILIO_MESSAGING_SERVICE_SID/, "SMS reminders prefer a Twilio Messaging Service");
assert.match(specDNA, /https:\/\/api\.twilio\.com\/2010-04-01\/Accounts/, "SMS reminders call Twilio messages API");
assert.match(specDNA, /recordReminderDelivery/, "reminder sends are recorded after provider response");
assert.match(specDNA, /missing_recipient/, "notification action reports missing recipient cleanly");
assert.match(specDNA, /not_configured/, "notification action reports missing provider configuration cleanly");

for (const table of ["submittals", "rfis", "tasks"]) {
  assert.match(schema, new RegExp(`${table}:[\\s\\S]*lastReminderChannel`), `${table} stores last reminder channel`);
  assert.match(schema, new RegExp(`${table}:[\\s\\S]*lastReminderStatus`), `${table} stores last reminder status`);
  assert.match(schema, new RegExp(`${table}:[\\s\\S]*lastReminderMessageId`), `${table} stores provider message id`);
  assert.match(schema, new RegExp(`${table}:[\\s\\S]*lastReminderError`), `${table} stores reminder error details`);
}

assert.match(panel, /useAction/, "UI calls reminder notification action");
assert.match(panel, /sendReminderNotification/, "UI wires reminder notification action");
assert.match(panel, /Send email/, "UI can send reminder email");
assert.match(panel, /Send text/, "UI can send reminder SMS");
assert.match(panel, /lastReminderStatus/, "UI displays reminder send status");

assert.match(design, /Outbound reminder notifications/, "design doc tracks outbound notification slice");

console.log("specdna reminder notification checks passed");
