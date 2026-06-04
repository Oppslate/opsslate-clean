import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sidebar = readFileSync(join(process.cwd(), "src", "components", "sidebar.tsx"), "utf8");

const projectManagementIndex = sidebar.indexOf("Project Management");
const commandCenterIndex = sidebar.indexOf("Command Center");
const navIndex = sidebar.indexOf("<nav className=");
const renderedProjectManagementIndex = sidebar.lastIndexOf("Project Management", navIndex);

assert.ok(projectManagementIndex > -1, "sidebar should show the Project Management app heading");
assert.ok(commandCenterIndex > -1, "sidebar should keep the Command Center section heading");
assert.ok(renderedProjectManagementIndex > -1, "Project Management heading should render above the side nav sections");
assert.ok(renderedProjectManagementIndex < navIndex, "Project Management heading should appear before the side nav");
assert.match(sidebar, /text-\[10px\][\s\S]*font-black[\s\S]*uppercase[\s\S]*text-muted-foreground[\s\S]*Project Management/, "Project Management should use the same small uppercase muted heading style");

console.log("sidebar project management heading checks passed");
