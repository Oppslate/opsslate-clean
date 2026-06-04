import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const schedulerPage = readFileSync(join(root, "src/app/scheduler/page.tsx"), "utf8");
const scheduler2Page = readFileSync(join(root, "src/app/scheduler2/page.tsx"), "utf8");

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

assert.ok(scheduler2Page.includes("OpsSlate Scheduler"), "/scheduler2 should archive the separated scheduler shell");
assert.ok(scheduler2Page.includes("No project selected"), "/scheduler2 should require a project before scheduling");
assert.ok(scheduler2Page.includes("Start with a phase"), "/scheduler2 should start schedule creation with phases");
assert.ok(scheduler2Page.includes("Milestones"), "/scheduler2 should nest milestone checkpoints inside phases");
assert.ok(scheduler2Page.includes("Tasks"), "/scheduler2 should nest detailed task activities inside milestones");
assert.ok(scheduler2Page.includes("Import From Estimate"), "/scheduler2 should expose estimate import as a prompted action");
assert.ok(scheduler2Page.includes("Phase name"), "/scheduler2 should prompt for phase names");
assert.ok(scheduler2Page.includes("Milestone name"), "/scheduler2 should prompt for milestone names");
assert.ok(scheduler2Page.includes("Task name"), "/scheduler2 should prompt for task names");
assert.ok(scheduler2Page.includes("Edit Phase"), "/scheduler2 should allow phase editing");
assert.ok(scheduler2Page.includes("Delete Phase"), "/scheduler2 should allow phase deletion");
assert.ok(scheduler2Page.includes("Edit Milestone"), "/scheduler2 should allow milestone editing");
assert.ok(scheduler2Page.includes("Delete Milestone"), "/scheduler2 should allow milestone deletion");
assert.ok(scheduler2Page.includes("Edit Task"), "/scheduler2 should allow task editing");
assert.ok(scheduler2Page.includes("Delete Task"), "/scheduler2 should allow task deletion");
assert.ok(scheduler2Page.includes("Construction Gantt"), "/scheduler2 should keep the separated Gantt view");
