import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const estimating = readFileSync(join(process.cwd(), "convex", "estimating.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "estimate-requirements-panel.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(schema, /estimateItems:[\s\S]*costCode:\s*v\.optional\(v\.string\(\)\)/, "estimate items store suggested cost code");
assert.match(schema, /estimateItems:[\s\S]*assemblyId:\s*v\.optional\(v\.string\(\)\)/, "estimate items store suggested assembly id");
assert.match(schema, /estimateItems:[\s\S]*assemblyName:\s*v\.optional\(v\.string\(\)\)/, "estimate items store suggested assembly name");
assert.match(schema, /estimateItems:[\s\S]*duplicateFingerprint:\s*v\.optional\(v\.string\(\)\)/, "estimate items store duplicate fingerprint");

assert.match(estimating, /function inferEstimateSection/, "estimating infers estimate section");
assert.match(estimating, /function inferCostCode/, "estimating infers cost code");
assert.match(estimating, /function suggestionFingerprint/, "estimating builds duplicate fingerprints");
assert.match(estimating, /function matchCatalogItem/, "estimating matches cost item catalog");
assert.match(estimating, /function matchAssembly/, "estimating matches assemblies");
assert.match(estimating, /ctx\.db\.query\("costItems"\)/, "suggestions read cost item catalog");
assert.match(estimating, /ctx\.db\.query\("estimateAssemblies"\)/, "suggestions read assemblies");
assert.match(estimating, /costCode/, "suggestions carry cost codes");
assert.match(estimating, /assemblyName/, "suggestions carry assembly names");
assert.match(estimating, /duplicateFingerprint/, "created estimate items keep duplicate fingerprint");
assert.match(estimating, /duplicateReason/, "suggestions explain duplicate suppression");

assert.match(panel, /Cost Code/, "panel displays suggested cost code");
assert.match(panel, /Assembly/, "panel displays assembly mapping");
assert.match(panel, /Duplicate Check/, "panel displays duplicate check");
assert.match(panel, /Catalog Match/, "panel displays catalog matching");

assert.match(design, /Estimate cockpit deeper integration/, "design doc tracks deeper estimate integration");

console.log("specdna estimate deeper integration checks passed");
