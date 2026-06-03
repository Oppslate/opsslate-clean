import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const projects = readFileSync(join(process.cwd(), "convex", "projects.ts"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(schema, /projectRole:\s*v\.optional\(v\.string\(\)\)/, "projects store PM/estimating role");
assert.match(projects, /projectRole:\s*v\.optional\(v\.string\(\)\)/, "project create/update accepts project role");
assert.match(projectPage, /projectRole:\s*string/, "project details form tracks project role");
assert.match(projectPage, /General Contractor/, "project role includes General Contractor");
assert.match(projectPage, /Subcontractor/, "project role includes Subcontractor");
assert.match(projectPage, /updateProjectDetailsField\("projectRole"/, "project role is editable in project details");
assert.match(projectPage, /project\.projectRole/, "project role is displayed on project dashboard");

console.log("project role checks passed");
