import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const emails = readFileSync(join(process.cwd(), "convex", "emails.ts"), "utf8");
const page = readFileSync(join(process.cwd(), "src", "app", "emails", "page.tsx"), "utf8");

assert.match(emails, /function sourceQuote/, "emails module extracts source quote");
assert.match(emails, /function communicationIntakeItem/, "emails module builds matrix items");
assert.match(emails, /export const communicationIntakeMatrix\s*=\s*query/, "emails module exposes communication intake matrix query");
assert.match(emails, /task/, "matrix extracts tasks");
assert.match(emails, /rfi/, "matrix extracts RFIs");
assert.match(emails, /submittal/, "matrix extracts submittals");
assert.match(emails, /due_date/, "matrix extracts due dates");
assert.match(emails, /cost_impact/, "matrix extracts cost impacts");
assert.match(emails, /schedule_impact/, "matrix extracts schedule impacts");
assert.match(emails, /contract_notice/, "matrix extracts contract notices");
assert.match(emails, /responsibleParty/, "matrix extracts responsible parties");
assert.match(emails, /confidence/, "matrix returns confidence");
assert.match(emails, /sourceQuote/, "matrix returns source quote");
assert.match(emails, /reviewStatus:\s*"needs_review"/, "matrix items start in review");

assert.match(page, /AI Communication Intake Matrix/, "page renders communication intake matrix");
assert.match(page, /Tasks/, "page shows task extraction count");
assert.match(page, /RFIs/, "page shows RFI extraction count");
assert.match(page, /Submittals/, "page shows submittal extraction count");
assert.match(page, /Due Dates/, "page shows due date extraction count");
assert.match(page, /Cost Impacts/, "page shows cost impact extraction count");
assert.match(page, /Schedule Impacts/, "page shows schedule impact extraction count");
assert.match(page, /Contract Notices/, "page shows contract notice extraction count");
assert.match(page, /Source Quote/, "page shows source quote");
assert.match(page, /Confidence/, "page shows confidence");
assert.match(page, /Responsible Party/, "page shows responsible party");

console.log("communication intake matrix checks passed");
