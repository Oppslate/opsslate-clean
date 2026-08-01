import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4N cross sections are same-origin, authenticated, and tenant-authorized", async () => {
  const [route, gateway, query] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/cross-sections/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/heliosEuclidCrossSections.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /euclid\/cross-sections/);
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(query, /requireHeliosPrincipal/);
  assert.match(query, /project\.companyId !== companyId/);
});

test("Euclid Stage 4N consumes the canonical model and 4M without PDF, AI, or persistence", async () => {
  const query = await read("../../web/convex/heliosEuclidCrossSections.ts");
  assert.match(query, /by_project_current/);
  assert.match(query, /reconstructEuclidModel/);
  assert.match(query, /evaluateHeliosEuclidCrossSection/);
  assert.doesNotMatch(query, /openai|ctx\.storage|storageId|application\/pdf|input_file/i);
  assert.doesNotMatch(query, /ctx\.db\.insert|ctx\.db\.patch|ctx\.db\.replace|ctx\.db\.delete/);
});

test("Euclid Stage 4N exposes a one-click governed section review in the cockpit", async () => {
  const evaluator = await read("../src/components/euclid-station-evaluator.tsx");
  assert.match(evaluator, /@opsslate\/suite-ui\/button/);
  assert.match(evaluator, /Build section/);
  assert.match(evaluator, /cross-sections/);
  assert.match(evaluator, /canBuildSurface/);
  assert.match(evaluator, /unresolvedControls/);
});

test("Euclid Stage 4N adds signed typical sections to canonical civil-geometry intake", async () => {
  const [contract, persistence, adapter] = await Promise.all([
    read("../../web/convex/heliosCivilGeometryOpenAIContracts.ts"),
    read("../../web/convex/heliosCivilGeometry.ts"),
    read("../../../packages/helios-domain/src/euclid-shadow.ts"),
  ]);
  assert.match(contract, /signed vertical rise/);
  assert.match(contract, /typicalSections/);
  assert.match(persistence, /typicalSections: record\.typicalSections/);
  assert.match(adapter, /typicalSections\.push/);
});

test("Ask Helios uses the deterministic 4N section instead of calculating lateral geometry", async () => {
  const assistant = await read("../../web/convex/heliosAssistant.ts");
  assert.match(assistant, /evaluateHeliosEuclidCrossSection/);
  assert.match(assistant, /euclid-cross-section:/);
  assert.match(assistant, /Deterministic Euclid 4N cross section/);
  assert.doesNotMatch(assistant, /crossSlope.*\/\s*100/i);
});
