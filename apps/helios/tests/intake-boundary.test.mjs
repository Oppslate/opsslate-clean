import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const projectsRoute = readFileSync(
  join(root, "src/app/api/projects/route.ts"),
  "utf8",
);
const uploadRoute = readFileSync(
  join(root, "src/app/api/projects/[projectId]/upload-url/route.ts"),
  "utf8",
);
const documentRoute = readFileSync(
  join(root, "src/app/api/projects/[projectId]/documents/route.ts"),
  "utf8",
);
const projectStore = readFileSync(
  join(root, "../web/convex/heliosProjects.ts"),
  "utf8",
);
const gateway = readFileSync(
  join(root, "../web/convex/heliosGateway.ts"),
  "utf8",
);

test("project and document mutations require signed session and same-origin", () => {
  for (const source of [projectsRoute, uploadRoute, documentRoute]) {
    assert.match(source, /readHeliosPrincipal/);
    assert.match(source, /isSameOrigin/);
  }
});

test("company ownership is reauthorized inside every project operation", () => {
  assert.match(projectStore, /requireHeliosPrincipal/g);
  assert.match(projectStore, /project\.companyId !== companyId/);
  assert.doesNotMatch(projectsRoute, /companyId/);
  assert.doesNotMatch(uploadRoute, /companyId/);
  assert.doesNotMatch(documentRoute, /companyId/);
});

test("storage registration validates server-observed PDF data", () => {
  assert.match(gateway, /blob\.slice\(0,\s*5\)/);
  assert.match(gateway, /"%PDF-"/);
  assert.match(projectStore, /metadata\.contentType !== "application\/pdf"/);
  assert.match(projectStore, /metadata\.sha256/);
  assert.match(projectStore, /by_project_hash/);
  assert.match(projectStore, /ctx\.storage\.delete/);
  assert.doesNotMatch(projectStore, /getUrl\(/);
});
