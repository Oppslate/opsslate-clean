import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const estimating = readFileSync(join(process.cwd(), "convex", "estimating.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const estimatePanel = readFileSync(join(process.cwd(), "src", "components", "estimate-requirements-panel.tsx"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(schema, /estimateRequirements:\s*defineTable/, "schema defines estimate requirements");
assert.match(schema, /estimateId:\s*v\.optional\(v\.id\("estimates"\)\)/, "estimate requirements can link to estimates");
assert.match(schema, /requirementType:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store type");
assert.match(schema, /allowance:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store allowances");
assert.match(schema, /alternate:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store alternates");
assert.match(schema, /exclusion:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store exclusions");
assert.match(schema, /wageRule:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store wage rules");
assert.match(schema, /bondRule:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store bond rules");
assert.match(schema, /taxRule:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store tax rules");
assert.match(schema, /dbeRule:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store DBE rules");
assert.match(schema, /liquidatedDamagesRule:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store liquidated damages");
assert.match(schema, /scopeAssumption:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store scope assumptions");
assert.match(schema, /sourceQuote:\s*v\.optional\(v\.string\(\)\)/, "estimate requirements store source quote");

assert.match(estimating, /export const listEstimateRequirements/, "estimating API can list estimate requirements");
assert.match(estimating, /export const createEstimateRequirement/, "estimating API can create estimate requirements");
assert.match(estimating, /export const updateEstimateRequirement/, "estimating API can update estimate requirements");
assert.match(estimating, /export const deleteEstimateRequirement/, "estimating API can delete estimate requirements");

assert.match(specDNA, /type SpecEstimateRequirementDraft/, "specDNA has estimate requirement draft type");
assert.match(specDNA, /createEstimateRequirementFromSpecItem/, "specDNA creates estimate requirements from matrix items");
assert.match(specDNA, /export const publishEstimateRequirement/, "specDNA exposes editable estimate requirement publishing");
assert.match(specDNA, /item\.category !== "bid_requirement" && item\.category !== "scope_item"/, "publish accepts bid and scope items");
assert.match(specDNA, /createdRecordType:\s*"estimate_requirement"/, "published estimate requirements stamp matrix linkage");
assert.match(specDNA, /sourceType:\s*"spec_intelligence"/, "created estimate requirements are source linked");

assert.match(panel, /estimateRequirementDraftItem/, "panel has estimate requirement draft state");
assert.match(panel, /Review Estimate Draft/, "panel opens estimate draft modal");
assert.match(panel, /Publish Estimate Requirement/, "panel publishes reviewed estimate requirements");
assert.match(panel, /publishEstimateRequirement/, "panel calls estimate requirement publishing mutation");
assert.match(panel, /scopeAssumption/, "panel reviews scope assumptions");
assert.match(panel, /liquidatedDamagesRule/, "panel reviews liquidated damages");

assert.match(estimatePanel, /Bid \/ Estimate Requirements/, "project page has estimate requirements panel UI");
assert.match(estimatePanel, /estimating\.listEstimateRequirements/, "estimate panel lists published requirements");
assert.match(estimatePanel, /allowance/, "estimate panel displays allowances");
assert.match(estimatePanel, /scopeAssumption/, "estimate panel displays scope assumptions");
assert.match(estimatePanel, /sourceQuote/, "estimate panel displays source quote");
assert.match(projectPage, /EstimateRequirementsPanel/, "project page renders estimate requirements panel");

console.log("specdna estimate handoff checks passed");
