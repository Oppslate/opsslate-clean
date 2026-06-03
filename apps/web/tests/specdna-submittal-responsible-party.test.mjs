import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const submittalsPage = readFileSync(join(process.cwd(), "src", "app", "submittals", "page.tsx"), "utf8");

assert.match(schema, /responsibleCompany:\s*v\.optional\(v\.string\(\)\)/, "submittals store responsible company");
assert.match(schema, /responsibleContact:\s*v\.optional\(v\.string\(\)\)/, "submittals store responsible contact");
assert.match(schema, /responsibleEmail:\s*v\.optional\(v\.string\(\)\)/, "submittals store responsible email");
assert.match(schema, /responsiblePhone:\s*v\.optional\(v\.string\(\)\)/, "submittals store responsible phone");
assert.match(schema, /responsibleSubcontractorId:\s*v\.optional\(v\.string\(\)\)/, "submittals link responsible subcontractor");
assert.match(schema, /requestStatus:\s*v\.optional\(v\.string\(\)\)/, "submittals track request/reminder status");

assert.match(specDNA, /responsibleCompany:\s*v\.optional\(v\.string\(\)\)/, "publishSubmittal accepts responsible company");
assert.match(specDNA, /responsibleSubcontractorId/, "publishSubmittal accepts responsible subcontractor id");
assert.match(specDNA, /requestStatus:\s*"not_requested"/, "published spec submittals start as not requested");

assert.match(panel, /api\.subcontractors\.list/, "Spec Matrix loads subcontractors for assignment");
assert.match(panel, /Responsible subcontractor/, "submittal draft can assign a subcontractor");
assert.match(panel, /responsibleEmail/, "submittal draft captures responsible email");
assert.match(panel, /responsiblePhone/, "submittal draft captures responsible phone");

assert.match(submittalsPage, /Responsible party/, "Submittals page shows responsible party");
assert.match(submittalsPage, /requestStatus/, "Submittals page shows request status");
assert.match(submittalsPage, /mailto:\$\{sub\.responsibleEmail\}/, "Submittals page can email responsible party");

console.log("specdna submittal responsible-party checks passed");
