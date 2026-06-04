import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const schedulerPage = readFileSync(join(root, "src/app/scheduler/page.tsx"), "utf8");

assert.ok(schedulerPage.includes('"use client"'), "/scheduler should be an interactive workspace");
assert.ok(schedulerPage.includes("AppShell"), "/scheduler should live inside the OpsSlate app shell");
assert.ok(schedulerPage.includes("Scheduler Workspace"), "/scheduler should render the scheduler main page");
assert.ok(schedulerPage.includes("3-Week Lookahead"), "/scheduler should start with a lookahead planning board");
assert.ok(schedulerPage.includes("Schedule Intelligence"), "/scheduler should include schedule intelligence context");
assert.ok(schedulerPage.includes("Construction Task Library"), "/scheduler should include construction task templates");
assert.ok(schedulerPage.includes("Task / WBS"), "/scheduler should render a construction task table");
assert.ok(schedulerPage.includes("Gantt Timeline"), "/scheduler should render a Gantt-style timeline");
assert.ok(schedulerPage.includes("Predecessor"), "/scheduler should expose predecessor/dependency fields");
assert.ok(schedulerPage.includes("Critical Path"), "/scheduler should surface critical path scheduling");
assert.ok(schedulerPage.includes("Mobilization"), "/scheduler should include construction phase templates");
assert.ok(!schedulerPage.includes("ProductSalesPage"), "/scheduler should no longer render the marketing page");
