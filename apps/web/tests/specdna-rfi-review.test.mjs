import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const rfiPage = readFileSync(join(process.cwd(), "src", "app", "rfis", "page.tsx"), "utf8");

assert.match(schema, /sourceType:\s*v\.optional\(v\.string\(\)\)/, "RFIs store source type");
assert.match(schema, /sourceSpecSection:\s*v\.optional\(v\.string\(\)\)/, "RFIs store spec section source");
assert.match(schema, /sourceQuote:\s*v\.optional\(v\.string\(\)\)/, "RFIs store source quote");
assert.match(schema, /sourceItemId:\s*v\.optional\(v\.string\(\)\)/, "RFIs link back to the matrix item");

assert.match(specDNA, /export const publishRiskRfi/, "specDNA exposes editable risk RFI publishing");
assert.match(specDNA, /subject:\s*v\.optional\(v\.string\(\)\)/, "RFI publishing can override subject");
assert.match(specDNA, /sourceType:\s*"spec_intelligence"/, "created RFIs are marked as spec intelligence sourced");
assert.match(specDNA, /sourceSpecSection:\s*item\.specSection/, "created RFIs preserve spec section evidence");
assert.match(specDNA, /sourceQuote:\s*item\.sourceQuote/, "created RFIs preserve source quote evidence");

assert.match(panel, /rfiDraftItem/, "panel has RFI draft review state");
assert.match(panel, /Review RFI Draft/, "panel opens a review modal before publishing");
assert.match(panel, /publishRiskRfi/, "panel publishes edited risk RFIs");
assert.match(panel, /Publish RFI/, "panel has an explicit publish action");

assert.match(rfiPage, /SOURCE EVIDENCE/, "RFI page displays source evidence");
assert.match(rfiPage, /sourceSpecSection/, "RFI page shows source spec section");
assert.match(rfiPage, /sourceQuote/, "RFI page shows source quote");

console.log("specdna RFI review checks passed");
