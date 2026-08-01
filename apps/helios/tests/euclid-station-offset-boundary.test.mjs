import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4M station-offset evaluation is same-origin, authenticated, and tenant-authorized", async () => {
  const [route, gateway, query] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/station-offsets/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/heliosEuclidStations.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /euclid\/station-offsets/);
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(query, /requireHeliosPrincipal/);
  assert.match(query, /project\.companyId !== companyId/);
});

test("Euclid Stage 4M consumes one canonical model and performs no PDF, storage, AI, or persistence operation", async () => {
  const query = await read("../../web/convex/heliosEuclidStations.ts");
  assert.match(query, /by_project_current/);
  assert.match(query, /reconstructEuclidModel/);
  assert.match(query, /evaluateHeliosEuclidStationOffsetPosition/);
  assert.doesNotMatch(query, /openai|ctx\.storage|storageId|application\/pdf|input_file/i);
  assert.doesNotMatch(query, /ctx\.db\.insert|ctx\.db\.patch|ctx\.db\.replace|ctx\.db\.delete/);
});

test("Euclid Stage 4M UI uses shared primitives and one calculation action", async () => {
  const evaluator = await read("../src/components/euclid-station-evaluator.tsx");
  assert.match(evaluator, /@opsslate\/suite-ui\/button/);
  assert.match(evaluator, /@opsslate\/suite-ui\/input/);
  assert.match(evaluator, /Offset \(\+R \/ −L\)/);
  assert.match(evaluator, /Compute 3D point/);
  assert.match(evaluator, /Point elevation/);
  assert.match(evaluator, /result\.limitations/);
});

test("Ask Helios uses the deterministic 4M engine and does not perform station-offset math itself", async () => {
  const assistant = await read("../../web/convex/heliosAssistant.ts");
  assert.match(assistant, /evaluateHeliosEuclidStationOffsetPosition/);
  assert.match(assistant, /euclid-station-offset:/);
  assert.match(assistant, /Deterministic Euclid 4M station-offset position/);
  assert.doesNotMatch(assistant, /offset\s*\*\s*Math\.(sin|cos)/);
});
