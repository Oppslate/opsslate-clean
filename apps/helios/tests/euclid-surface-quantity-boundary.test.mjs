import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4P draft quantities are same-origin, authenticated, and tenant-authorized", async () => {
  const [route, gateway, query] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/surface-quantities/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/heliosEuclidSurfaceQuantities.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /surface-quantities/);
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(query, /requireHeliosPrincipal/);
  assert.match(query, /project\.companyId !== companyId/);
});

test("Euclid Stage 4P consumes the canonical record and deterministic solver without PDF, AI, storage, or persistence", async () => {
  const query = await read("../../web/convex/heliosEuclidSurfaceQuantities.ts");
  assert.match(query, /by_project_current/);
  assert.match(query, /reconstructEuclidModel/);
  assert.match(query, /calculateHeliosEuclidSurfaceQuantities/);
  assert.doesNotMatch(query, /openai|ctx\.storage|storageId|application\/pdf|input_file/i);
  assert.doesNotMatch(query, /ctx\.db\.insert|ctx\.db\.patch|ctx\.db\.replace|ctx\.db\.delete/);
  assert.doesNotMatch(query, /publishCandidate|heliosEstimateQuantities/);
});

test("Euclid Stage 4P keeps bid-day review to one click and labels every result draft", async () => {
  const component = await read("../src/components/euclid-surface-assembler.tsx");
  assert.match(component, /@opsslate\/suite-ui\/button/);
  assert.match(component, /Build surfaces and draft quantities/);
  assert.match(component, /euclid\/surface-quantities/);
  assert.match(component, /Draft quantity register/);
  assert.match(component, /Estimator review required/);
  assert.doesNotMatch(component, /useEffect[\s\S]*surface-quantity-publications/);
});

test("Ask Helios cites deterministic 4P drafts and states the no-publication boundary", async () => {
  const assistant = await read("../../web/convex/heliosAssistant.ts");
  assert.match(assistant, /calculateHeliosEuclidSurfaceQuantities/);
  assert.match(assistant, /euclid-surface-quantities:/);
  assert.match(assistant, /Deterministic Euclid 4P draft quantity/);
  assert.match(assistant, /not been written, accepted, priced, or published/);
});
