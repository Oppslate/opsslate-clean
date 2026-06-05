import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src", "app", "page.tsx"), "utf8");

assert.match(page, /Commodity Tracker/, "dashboard should render a construction commodity tracker card");
assert.match(page, /Market Watch/, "commodity tracker should identify itself as a market watch snapshot");

for (const commodity of ["Gas", "Diesel", "Lumber", "Steel"]) {
  assert.ok(page.includes(`label: "${commodity}"`), `commodity tracker should include ${commodity}`);
}

const weatherIndex = page.indexOf("<h2 className=\"text-sm font-bold\">Weather</h2>");
const commodityIndex = page.indexOf("Commodity Tracker");
const priorityIndex = page.indexOf("Priority Actions");

assert.ok(weatherIndex >= 0, "dashboard should include Weather card");
assert.ok(commodityIndex > weatherIndex, "commodity tracker should appear after Weather");
assert.ok(priorityIndex > commodityIndex, "Priority Actions should appear after commodity tracker");

console.log("dashboard commodity tracker checks passed");
