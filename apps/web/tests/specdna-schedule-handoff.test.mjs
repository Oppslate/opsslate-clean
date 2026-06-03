import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const scheduleConstraints = readFileSync(join(process.cwd(), "convex", "scheduleConstraints.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const schedulePanel = readFileSync(join(process.cwd(), "src", "components", "schedule-intelligence-panel.tsx"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(schema, /scheduleConstraints:\s*defineTable/, "schema defines schedule constraints");
assert.match(schema, /constraintType:\s*v\.optional\(v\.string\(\)\)/, "schedule constraints store constraint type");
assert.match(schema, /leadTimeDays:\s*v\.optional\(v\.number\(\)\)/, "schedule constraints store lead time");
assert.match(schema, /reviewPeriodDays:\s*v\.optional\(v\.number\(\)\)/, "schedule constraints store review period");
assert.match(schema, /blockingRule:\s*v\.optional\(v\.string\(\)\)/, "schedule constraints store blocking rules");
assert.match(schema, /sourceSpecSection:\s*v\.optional\(v\.string\(\)\)/, "schedule constraints store source spec section");
assert.match(schema, /sourceQuote:\s*v\.optional\(v\.string\(\)\)/, "schedule constraints store source quote");
assert.match(schema, /projectRole:\s*v\.optional\(v\.string\(\)\)/, "schedule constraints store project role");

assert.match(scheduleConstraints, /export const list/, "schedule constraints can be listed");
assert.match(scheduleConstraints, /export const create/, "schedule constraints can be created");
assert.match(scheduleConstraints, /export const update/, "schedule constraints can be updated");
assert.match(scheduleConstraints, /export const remove/, "schedule constraints can be removed");

assert.match(specDNA, /type SpecScheduleDraft/, "specDNA has schedule draft type");
assert.match(specDNA, /createScheduleConstraintFromSpecItem/, "specDNA creates schedule constraints from matrix items");
assert.match(specDNA, /export const publishScheduleConstraint/, "specDNA exposes editable schedule publishing");
assert.match(specDNA, /createdRecordType:\s*"schedule_constraint"/, "published schedule constraints stamp matrix linkage");
assert.match(specDNA, /sourceType:\s*"spec_intelligence"/, "created schedule constraints are source linked");

assert.match(panel, /scheduleDraftItem/, "panel has schedule draft state");
assert.match(panel, /Review Schedule Draft/, "panel opens a schedule draft modal");
assert.match(panel, /Publish Schedule Constraint/, "panel publishes reviewed schedule constraints");
assert.match(panel, /publishScheduleConstraint/, "panel calls schedule publishing mutation");
assert.match(panel, /projectRole/, "panel includes project role context");

assert.match(schedulePanel, /Schedule Intelligence/, "project page has schedule intelligence panel UI");
assert.match(schedulePanel, /scheduleConstraints\.list/, "schedule panel lists published constraints");
assert.match(schedulePanel, /sourceSpecSection/, "schedule panel displays source spec section");
assert.match(schedulePanel, /sourceQuote/, "schedule panel displays source quote");
assert.match(projectPage, /ScheduleIntelligencePanel/, "project page renders schedule intelligence panel");

console.log("specdna schedule handoff checks passed");
