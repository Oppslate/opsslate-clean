import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4O surface assembly is same-origin, authenticated, and tenant-authorized", async () => {
  const [route, gateway, query] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/surfaces/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/heliosEuclidSurfaces.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /euclid\/surfaces/);
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(query, /requireHeliosPrincipal/);
  assert.match(query, /project\.companyId !== companyId/);
});

test("Euclid Stage 4O consumes only the canonical record and pure domain solver", async () => {
  const query = await read("../../web/convex/heliosEuclidSurfaces.ts");
  assert.match(query, /by_project_current/);
  assert.match(query, /reconstructEuclidModel/);
  assert.match(query, /assembleHeliosEuclidSurfaces/);
  assert.doesNotMatch(query, /openai|ctx\.storage|storageId|application\/pdf|input_file/i);
  assert.doesNotMatch(query, /ctx\.db\.insert|ctx\.db\.patch|ctx\.db\.replace|ctx\.db\.delete/);
});

test("Euclid Stage 4O exposes one-click governed surface review without quantity publication", async () => {
  const [component, cockpit] = await Promise.all([
    read("../src/components/euclid-surface-assembler.tsx"),
    read("../src/components/euclid-cockpit.tsx"),
  ]);
  assert.match(component, /@opsslate\/suite-ui\/button/);
  assert.match(component, /Build surfaces and draft quantities/);
  assert.match(component, /surfaceAssembly/);
  assert.match(component, /canCompareSurfaces/);
  assert.match(component, /surface\.gaps/);
  assert.match(component, /Draft results do not change the estimate/i);
  assert.match(cockpit, /value="surfaces"/);
  assert.match(cockpit, /EuclidSurfaceAssembler/);
});

test("Ask Helios cites deterministic 4O readiness rather than inventing surface geometry", async () => {
  const assistant = await read("../../web/convex/heliosAssistant.ts");
  assert.match(assistant, /assembleHeliosEuclidSurfaces/);
  assert.match(assistant, /euclid-surface-assembly:/);
  assert.match(assistant, /Deterministic Euclid 4O surface assembly/);
});
