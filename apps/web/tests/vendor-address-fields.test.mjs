import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const page = readFileSync(join(root, "src", "app", "vendors", "page.tsx"), "utf8");
const schema = readFileSync(join(root, "convex", "schema.ts"), "utf8");
const mutations = readFileSync(join(root, "convex", "vendors.ts"), "utf8");

for (const field of ["address", "city", "state", "zipCode"]) {
  assert.match(page, new RegExp(`key: "${field}"`), `Vendor form should include ${field}.`);
  assert.match(schema, new RegExp(`${field}: v\\.optional\\(v\\.string\\(\\)\\)`), `Vendor schema should include ${field}.`);
  assert.match(mutations, new RegExp(`${field}: v\\.optional\\(v\\.string\\(\\)\\)`), `Vendor mutations should accept ${field}.`);
}

assert.match(page, /Address/, "Vendor table or export should include address label.");
assert.match(page, /City/, "Vendor table or export should include city label.");
assert.match(page, /State/, "Vendor table or export should include state label.");
assert.match(page, /Zip Code/, "Vendor table or export should include zip code label.");
assert.match(page, /colSpan=\{8\}/, "Empty table column span should match the expanded vendor table.");
