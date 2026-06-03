import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(panel, /Spec Intelligence Intake Matrix/, "panel uses Spec Intelligence Intake Matrix name");
assert.match(panel, /analyzeSpecDocument/, "panel can run analysis");
assert.match(panel, /commitApproved/, "panel can commit approved items");
assert.match(panel, /Bid Requirements/, "panel shows bid requirements tab");
assert.match(panel, /Submittals/, "panel shows submittals tab");
assert.match(panel, /Schedule/, "panel shows schedule tab");
assert.match(panel, /Billing/, "panel shows billing tab");
assert.match(projectPage, /SpecDNAPanel/, "project page renders SpecDNAPanel");

console.log("specdna UI checks passed");
