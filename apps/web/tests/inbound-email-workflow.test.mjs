import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const route = readFileSync(join(process.cwd(), "src", "app", "api", "inbound-email", "route.ts"), "utf8");
const settings = readFileSync(join(process.cwd(), "src", "app", "settings", "page.tsx"), "utf8");
const addresses = readFileSync(join(process.cwd(), "convex", "inboundEmailAddresses.ts"), "utf8");

assert.match(schema, /inboundEmailAddresses:\s*defineTable/, "schema stores inbound email addresses");
assert.match(schema, /localPart:\s*v\.string/, "inbound address stores local part");
assert.match(schema, /fullAddress:\s*v\.string/, "inbound address stores full address");
assert.match(schema, /routeType:\s*v\.string/, "inbound address stores route type");
assert.match(schema, /gmailVerificationStatus/, "inbound address tracks Gmail verification");
assert.match(schema, /by_full_address/, "inbound address can be resolved by full address");

assert.match(addresses, /export const list\s*=\s*query/, "address module lists company addresses");
assert.match(addresses, /export const create\s*=\s*mutation/, "address module creates forwarding addresses");
assert.match(addresses, /export const update\s*=\s*mutation/, "address module updates forwarding addresses");
assert.match(addresses, /export const remove\s*=\s*mutation/, "address module removes forwarding addresses");
assert.match(addresses, /export const resolveRecipient\s*=\s*query/, "address module resolves inbound recipients");
assert.match(addresses, /gmailVerificationCode/, "address module stores Gmail verification code");

assert.match(route, /api\.inboundEmailAddresses\.resolveRecipient/, "inbound route resolves configured forwarding addresses");
assert.match(route, /retrieveResendReceivedEmail/, "Resend inbound webhooks retrieve full email content before saving");
assert.match(route, /emails\/receiving\/\$\{emailId\}/, "Resend inbound route calls the Receiving API");
assert.match(route, /INBOUND_DEFAULT_COMPANY_ID/, "inbound fallback company is configured by environment");
assert.match(route, /extractGmailVerification/, "inbound route detects Gmail confirmation messages");
assert.match(route, /gmailVerificationCode/, "inbound route saves Gmail verification code");
assert.match(route, /Resend Inbound event email\.received/, "inbound route documents Resend inbound mode");
assert.match(route, /SendGrid Inbound Parse/, "inbound route documents SendGrid parsed mode");
assert.match(route, /mailgun|sendgrid/i, "inbound route accepts provider form posts");
assert.match(route, /projectId: route\.projectId/, "inbound route applies project routing");

assert.match(settings, /Gmail Forwarding Setup Wizard/, "settings renders Gmail forwarding wizard");
assert.match(settings, /Inbound Email Address Manager/, "settings renders inbound address manager");
assert.match(settings, /Create forwarding address/, "settings can create forwarding addresses");
assert.match(settings, /Gmail verification/, "settings shows Gmail verification status");
assert.match(settings, /Resend Inbound/, "settings shows Resend inbound setup");
assert.match(settings, /https:\/\/www\.opsslate\.app\/api\/inbound-email/, "settings shows webhook URL");
assert.match(settings, /company@inbound\.opsslate\.app/, "settings shows example forwarding address");
assert.match(settings, /project route/i, "settings supports project route selection");

console.log("inbound email workflow checks passed");
