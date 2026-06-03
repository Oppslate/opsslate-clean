import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const emails = readFileSync(join(process.cwd(), "convex", "emails.ts"), "utf8");
const page = readFileSync(join(process.cwd(), "src", "app", "emails", "page.tsx"), "utf8");
const inbound = readFileSync(join(process.cwd(), "src", "app", "api", "inbound-email", "route.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");

assert.match(emails, /function communicationBucket/, "emails module classifies communication buckets");
assert.match(emails, /function communicationPriority/, "emails module scores communication priority");
assert.match(emails, /export const rescueInbox\s*=\s*query/, "emails module exposes rescue inbox query");
assert.match(emails, /needs_response/, "rescue inbox includes needs response bucket");
assert.match(emails, /needs_action/, "rescue inbox includes needs action bucket");
assert.match(emails, /filed_to_project/, "rescue inbox includes filed to project bucket");
assert.match(emails, /needs_help_sorting/, "rescue inbox includes needs help sorting bucket");
assert.match(emails, /contract_notice/, "rescue inbox detects contract notices");
assert.match(emails, /schedule_impact/, "rescue inbox detects schedule impact");
assert.match(emails, /cost_impact/, "rescue inbox detects cost impact");
assert.match(emails, /suggestedNextAction/, "rescue inbox returns next actions");
assert.match(emails, /companyForwardingAddress/, "rescue inbox returns company forwarding address");

assert.match(schema, /routingConfidence:\s*v\.optional\(v\.number\(\)\)/, "emails store routing confidence");
assert.match(schema, /communicationBucket:\s*v\.optional\(v\.string\(\)\)/, "emails store communication bucket");
assert.match(schema, /communicationCategory:\s*v\.optional\(v\.string\(\)\)/, "emails store communication category");

assert.match(inbound, /communicationBucket/, "inbound route stores communication bucket");
assert.match(inbound, /routingConfidence/, "inbound route stores routing confidence");

assert.match(page, /Communication Rescue Inbox/, "page renders rescue inbox");
assert.match(page, /Forward everything here/, "page shows simple forwarding address");
assert.match(page, /Needs Response/, "page shows needs response bucket");
assert.match(page, /Needs Action/, "page shows needs action bucket");
assert.match(page, /Filed Automatically/, "page shows filed automatically bucket");
assert.match(page, /Needs Help Sorting/, "page shows sorting help bucket");
assert.match(page, /Today\u2019s save-your-sanity list/, "page renders calm daily triage language");
assert.match(page, /suggestedNextAction/, "page shows suggested next action");
assert.match(page, /routeConfidence/, "page shows route confidence");

console.log("communication rescue inbox checks passed");
