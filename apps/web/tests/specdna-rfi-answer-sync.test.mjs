import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const rfis = readFileSync(join(process.cwd(), "convex", "rfis.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const rfiPage = readFileSync(join(process.cwd(), "src", "app", "rfis", "page.tsx"), "utf8");

assert.match(schema, /resolutionStatus:\s*v\.optional\(v\.string\(\)\)/, "matrix items track resolution status");
assert.match(schema, /resolvedByRfiId:\s*v\.optional\(v\.string\(\)\)/, "matrix items link to the answered RFI");
assert.match(schema, /resolvedAnswer:\s*v\.optional\(v\.string\(\)\)/, "matrix items store the RFI answer");
assert.match(schema, /resolvedAt:\s*v\.optional\(v\.number\(\)\)/, "matrix items store resolution timestamp");

assert.match(rfis, /sourceItemId/, "RFI answer checks for source matrix item linkage");
assert.match(rfis, /const sourceItem = await ctx\.db\.get\(record\.sourceItemId as any\)/, "RFI answer loads the source matrix item");
assert.match(rfis, /resolutionStatus:\s*"resolved"/, "RFI answer marks source item resolved");
assert.match(rfis, /resolvedAnswer:\s*args\.answer/, "RFI answer writes the answer back to the matrix item");

assert.match(panel, /resolvedAnswer/, "Spec Matrix displays the resolved answer");
assert.match(panel, /Resolved by RFI answer/, "Spec Matrix labels resolved answers");
assert.match(panel, /<option value="resolved">Resolved<\/option>/, "Spec Matrix can filter resolved items");

assert.match(rfiPage, /Answer synced to Spec Intelligence Matrix/, "RFI page confirms answer sync");

console.log("specdna RFI answer sync checks passed");
