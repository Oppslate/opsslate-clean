import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projects = readFileSync(join(process.cwd(), "convex", "projects.ts"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");
const jobPage = readFileSync(join(process.cwd(), "src", "app", "job", "[id]", "page.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "src", "app", "page.tsx"), "utf8");

assert.match(projects, /export const archive\s*=\s*mutation/, "projects module exposes archive mutation");
assert.match(projects, /status:\s*"Archived"/, "archive preserves project data by marking Archived");
assert.match(projects, /export const remove\s*=\s*mutation/, "projects module exposes hard delete mutation");
assert.match(projects, /directProjectTables/, "hard delete cascades directly attached project records");
assert.match(projects, /withIndex\("by_project"/, "hard delete uses project indexes for related records");
assert.match(projects, /ctx\.db\.delete\(args\.id\)/, "hard delete removes the project record");

assert.match(projectPage, /Lost Bid/, "project detail status dropdown includes Lost Bid");
assert.match(projectPage, /Archive project/, "project detail renders archive button");
assert.match(projectPage, /Delete project/, "project detail renders delete button");
assert.match(projectPage, /api\.projects\.archive/, "project detail calls archive mutation");
assert.match(projectPage, /projects\.remove/, "project detail calls delete mutation");
assert.match(projectPage, /window\.confirm/, "delete/archive require confirmation");
assert.match(projectPage, /router\.replace\("\/"\)/, "project detail returns to project list after archive/delete");

assert.match(jobPage, /Lost Bid/, "job command view status cycle includes Lost Bid");
assert.match(dashboard, /p\.status !== "Archived"/, "dashboard hides archived projects from normal lists");
assert.match(dashboard, /p\.status === "Lost Bid"/, "dashboard can classify Lost Bid projects");

console.log("project archive delete lost bid checks passed");
