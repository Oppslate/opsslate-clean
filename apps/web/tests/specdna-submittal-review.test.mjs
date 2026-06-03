import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const submittalsPage = readFileSync(join(process.cwd(), "src", "app", "submittals", "page.tsx"), "utf8");

assert.match(schema, /sourceItemId:\s*v\.optional\(v\.string\(\)\)/, "submittals store source matrix item");
assert.match(schema, /sourceSpecSection:\s*v\.optional\(v\.string\(\)\)/, "submittals store source spec section");
assert.match(schema, /sourceQuote:\s*v\.optional\(v\.string\(\)\)/, "submittals store source quote");
assert.match(schema, /sourceConfidence:\s*v\.optional\(v\.number\(\)\)/, "submittals store source confidence");

assert.match(specDNA, /export const publishSubmittal/, "specDNA exposes editable submittal publishing");
assert.match(specDNA, /function createSubmittalFromSpecItem/, "specDNA has shared submittal creator");
assert.match(specDNA, /sourceType:\s*"spec_intelligence"/, "created submittals are spec intelligence sourced");
assert.match(specDNA, /sourceQuote:\s*item\.sourceQuote/, "created submittals preserve source quote");
assert.match(specDNA, /createdRecordType:\s*"submittal"/, "published submittals stamp matrix record linkage");

assert.match(panel, /submittalDraftItem/, "panel has submittal draft review state");
assert.match(panel, /Review Submittal Draft/, "panel opens a submittal draft review modal");
assert.match(panel, /publishSubmittal/, "panel publishes edited submittals");
assert.match(panel, /Publish Submittal/, "panel has an explicit submittal publish action");

assert.match(submittalsPage, /SOURCE EVIDENCE/, "Submittals page displays source evidence");
assert.match(submittalsPage, /sourceSpecSection/, "Submittals page shows source spec section");
assert.match(submittalsPage, /sourceQuote/, "Submittals page shows source quote");

console.log("specdna submittal review checks passed");
