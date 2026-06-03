import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");

assert.match(schema, /specIntakeRuns:\s*defineTable/, "schema defines spec intake runs");
assert.match(schema, /specIntelligenceItems:\s*defineTable/, "schema defines spec intelligence items");
assert.match(schema, /category:\s*v\.string\(\)/, "items store category");
assert.match(schema, /destinationModules:\s*v\.optional\(v\.array\(v\.string\(\)\)\)/, "items store destination modules");
assert.match(specDNA, /export const listRuns/, "specDNA exposes listRuns");
assert.match(specDNA, /export const listItems/, "specDNA exposes listItems");
assert.match(specDNA, /export const updateItemStatus/, "specDNA exposes updateItemStatus");
assert.match(specDNA, /export const commitApproved/, "specDNA exposes commitApproved");

console.log("specdna schema checks passed");
