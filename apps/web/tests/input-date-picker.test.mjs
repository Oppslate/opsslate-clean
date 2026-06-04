import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const input = readFileSync(join(process.cwd(), "src", "components", "ui", "input.tsx"), "utf8");

assert.match(input, /pickerInputTypes/, "shared Input should identify picker-capable input types");
for (const type of ["date", "datetime-local", "month", "time", "week"]) {
  assert.ok(input.includes(`"${type}"`), `shared Input should support ${type} picker behavior`);
}
assert.match(input, /input\.showPicker/, "shared Input should open the native browser picker");
assert.match(input, /\[color-scheme:dark\]/, "date picker inputs should respect the dark UI theme");
assert.match(input, /React\.forwardRef/, "shared Input should continue forwarding refs");

console.log("input date picker checks passed");
