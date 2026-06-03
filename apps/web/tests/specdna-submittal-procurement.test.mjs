import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const submittals = readFileSync(join(process.cwd(), "convex", "submittals.ts"), "utf8");
const page = readFileSync(join(process.cwd(), "src", "app", "submittals", "page.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(schema, /submittals:[\s\S]*procurementStatus/, "submittals store procurement status");
assert.match(schema, /submittals:[\s\S]*requestedBy/, "submittals store request sender");
assert.match(schema, /submittals:[\s\S]*receivedAt/, "submittals store received timestamp");
assert.match(schema, /submittals:[\s\S]*escalatedAt/, "submittals store escalation timestamp");
assert.match(schema, /submittals:[\s\S]*escalationReason/, "submittals store escalation reason");

assert.match(submittals, /function procurementState/, "submittals compute procurement state");
assert.match(submittals, /export const procurementDashboard\s*=\s*query/, "submittals expose procurement dashboard");
assert.match(submittals, /export const markRequestSent\s*=\s*mutation/, "submittals can mark requests sent");
assert.match(submittals, /export const markReceived\s*=\s*mutation/, "submittals can mark received");
assert.match(submittals, /export const escalateLate\s*=\s*mutation/, "submittals can escalate late requests");
assert.match(submittals, /export const sendRequest\s*=\s*action/, "submittals can send request email");
assert.match(submittals, /RESEND_API_KEY/, "submittal request email uses Resend");
assert.match(submittals, /https:\/\/api\.resend\.com\/emails/, "submittal request posts to Resend");
assert.match(submittals, /requestStatus:\s*"requested"/, "request send marks request status");
assert.match(submittals, /procurementStatus:\s*"requested"/, "request send marks procurement status");
assert.match(submittals, /procurementStatus:\s*"received"/, "received action marks procurement received");
assert.match(submittals, /procurementStatus:\s*"escalated"/, "escalation action marks procurement escalated");

assert.match(page, /procurementDashboard/, "submittals page reads procurement dashboard");
assert.match(page, /Submittal Procurement/, "submittals page renders procurement workflow");
assert.match(page, /Request from Sub/, "submittals page can request from subcontractor");
assert.match(page, /Mark Received/, "submittals page can mark submittal received");
assert.match(page, /Escalate Late/, "submittals page can escalate late submittals");
assert.match(page, /procurementStatus/, "submittals page displays procurement status");
assert.match(page, /overdueRequests/, "submittals page displays overdue requests");

assert.match(design, /Submittal procurement workflow/, "design doc tracks submittal procurement workflow");

console.log("specdna submittal procurement checks passed");
