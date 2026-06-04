import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const projects = readFileSync(join(process.cwd(), "convex", "projects.ts"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(schema, /projectRole:\s*v\.optional\(v\.string\(\)\)/, "projects store PM/estimating role");
assert.match(projects, /projectRole:\s*v\.optional\(v\.string\(\)\)/, "project create/update accepts project role");
assert.match(projectPage, /projectRole:\s*string/, "project details form tracks project role");
for (const role of ["Owner", "Project Manager", "Engineer", "Estimator"]) {
  assert.match(projectPage, new RegExp(role), `project role includes ${role}`);
}
assert.match(projectPage, /updateProjectDetailsDropdown\("projectRole"/, "project role is editable through dropdown/custom controls");
assert.match(projectPage, /updateProjectDetailsCustomDropdown\("projectRole"/, "project role accepts user-entered options");
assert.match(projectPage, /project\.projectRole/, "project role is displayed on project dashboard");

console.log("project role checks passed");
