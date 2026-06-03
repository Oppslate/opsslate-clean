import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const commandCenter = readFileSync(join(process.cwd(), "src", "components", "spec-intelligence-command-center.tsx"), "utf8");
const designDoc = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(specDNA, /function buildSpecAuditTrail/, "specDNA builds an audit trail");
assert.match(specDNA, /function buildExceptionDashboard/, "specDNA builds an exception dashboard");
assert.match(specDNA, /auditTrail/, "command center returns audit trail");
assert.match(specDNA, /exceptionDashboard/, "command center returns exception dashboard");
assert.match(specDNA, /extraction_started/, "audit trail includes extraction started event");
assert.match(specDNA, /extraction_completed/, "audit trail includes extraction completed event");
assert.match(specDNA, /review_status/, "audit trail includes review status event");
assert.match(specDNA, /downstream_publish/, "audit trail includes downstream publish event");
assert.match(specDNA, /low_confidence/, "exception dashboard tracks low confidence");
assert.match(specDNA, /missing_destination/, "exception dashboard tracks missing destination");
assert.match(specDNA, /approved_not_committed/, "exception dashboard tracks approved-not-committed");
assert.match(specDNA, /failed_run/, "exception dashboard tracks failed runs");
assert.match(specDNA, /severity/, "exceptions have severity");
assert.match(specDNA, /ownerHint/, "exceptions include owner hint");

assert.match(commandCenter, /Spec Intelligence Audit Trail/, "UI renders audit trail");
assert.match(commandCenter, /Exception Dashboard/, "UI renders exception dashboard");
assert.match(commandCenter, /Failed Runs/, "UI shows failed run exceptions");
assert.match(commandCenter, /Low Confidence/, "UI shows low confidence exceptions");
assert.match(commandCenter, /Missing Destination/, "UI shows missing destination exceptions");
assert.match(commandCenter, /Approved Not Committed/, "UI shows approved-not-committed exceptions");
assert.match(commandCenter, /Audit Event/, "UI labels audit events");
assert.match(commandCenter, /Source Evidence/, "UI keeps source evidence visible");

assert.match(designDoc, /Spec Intelligence audit trail and Exception dashboard/, "design doc tracks audit and exceptions");

console.log("specdna audit and exceptions checks passed");
