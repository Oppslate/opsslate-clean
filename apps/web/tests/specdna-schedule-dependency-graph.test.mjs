import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const scheduleConstraints = readFileSync(join(process.cwd(), "convex", "scheduleConstraints.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "schedule-intelligence-panel.tsx"), "utf8");
const design = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(schema, /scheduleConstraints:[\s\S]*predecessorTaskId/, "schedule constraints store predecessor task id");
assert.match(schema, /scheduleConstraints:[\s\S]*successorTaskId/, "schedule constraints store successor task id");
assert.match(schema, /scheduleConstraints:[\s\S]*dependencyType/, "schedule constraints store dependency type");
assert.match(schema, /scheduleConstraints:[\s\S]*lagDays/, "schedule constraints store lag days");
assert.match(schema, /scheduleConstraints:[\s\S]*dependencyStatus/, "schedule constraints store dependency status");
assert.match(schema, /tasks:[\s\S]*dependsOn/, "tasks already store dependency ids");

assert.match(scheduleConstraints, /function dependencyTypeLabel/, "schedule constraints describe dependency types");
assert.match(scheduleConstraints, /function matchTaskForConstraint/, "schedule constraints can match constraints to tasks");
assert.match(scheduleConstraints, /function buildDependencyGraph/, "schedule constraints build dependency graph");
assert.match(scheduleConstraints, /export const getDependencyGraph\s*=\s*query/, "schedule constraints expose dependency graph query");
assert.match(scheduleConstraints, /export const applyConstraintDependencies\s*=\s*mutation/, "schedule constraints can apply dependencies");
assert.match(scheduleConstraints, /predecessorTaskId/, "dependency application writes predecessor ids");
assert.match(scheduleConstraints, /successorTaskId/, "dependency application writes successor ids");
assert.match(scheduleConstraints, /dependsOn/, "dependency application patches task dependsOn");
assert.match(scheduleConstraints, /cycleWarnings/, "dependency graph reports cycle warnings");
assert.match(scheduleConstraints, /criticalPathCandidates/, "dependency graph reports critical path candidates");

assert.match(panel, /getDependencyGraph/, "schedule panel reads dependency graph");
assert.match(panel, /applyConstraintDependencies/, "schedule panel can apply dependency logic");
assert.match(panel, /Dependency Graph/, "schedule panel renders dependency graph section");
assert.match(panel, /Predecessor/, "schedule panel labels predecessor logic");
assert.match(panel, /Successor/, "schedule panel labels successor logic");
assert.match(panel, /Apply Dependency Logic/, "schedule panel exposes apply action");
assert.match(panel, /Cycle warnings/, "schedule panel renders cycle warnings");
assert.match(panel, /Critical path candidates/, "schedule panel renders critical path candidates");

assert.match(design, /Schedule dependency graph/, "design doc tracks schedule dependency graph slice");

console.log("specdna schedule dependency graph checks passed");
