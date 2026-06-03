import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const taskPanel = readFileSync(join(process.cwd(), "src", "components", "task-panel.tsx"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(schema, /sourceType:\s*v\.optional\(v\.string\(\)\)/, "tasks store source type");
assert.match(schema, /sourceItemId:\s*v\.optional\(v\.string\(\)\)/, "tasks store source matrix item");
assert.match(schema, /sourceSpecSection:\s*v\.optional\(v\.string\(\)\)/, "tasks store source spec section");
assert.match(schema, /sourceQuote:\s*v\.optional\(v\.string\(\)\)/, "tasks store source quote");
assert.match(schema, /projectRole:\s*v\.optional\(v\.string\(\)\)/, "tasks store project role context");

assert.match(specDNA, /export const publishTask/, "specDNA exposes editable task publishing");
assert.match(specDNA, /function createTaskFromSpecItem/, "specDNA has shared task creator");
assert.match(specDNA, /sourceType:\s*"spec_intelligence"/, "created tasks are spec intelligence sourced");
assert.match(specDNA, /sourceQuote:\s*item\.sourceQuote/, "created tasks preserve source quote");
assert.match(specDNA, /createdRecordType:\s*"task"/, "published tasks stamp matrix record linkage");

assert.match(panel, /taskDraftItem/, "panel has task draft review state");
assert.match(panel, /Review Task Draft/, "panel opens a task draft review modal");
assert.match(panel, /publishTask/, "panel publishes edited tasks");
assert.match(panel, /projectRole/, "panel passes project role into task handoff");
assert.match(projectPage, /projectRole=\{project\.projectRole/, "project page provides project role to Spec Matrix");

assert.match(taskPanel, /SOURCE EVIDENCE/, "Task panel displays source evidence");
assert.match(taskPanel, /sourceSpecSection/, "Task panel shows source spec section");
assert.match(taskPanel, /sourceQuote/, "Task panel shows source quote");

console.log("specdna task handoff checks passed");
