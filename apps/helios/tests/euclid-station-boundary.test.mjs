import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4L station evaluation is same-origin, authenticated, and tenant-authorized", async () => {
  const [route, gateway, query] = await Promise.all([
    read("../src/app/api/projects/[projectId]/euclid/stations/route.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/heliosEuclidStations.ts"),
  ]);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(route, /euclid\/stations/);
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(query, /requireHeliosPrincipal/);
  assert.match(query, /project\.companyId !== companyId/);
});

test("Euclid Stage 4L reads one current canonical model and performs no PDF, storage, or AI operation", async () => {
  const query = await read("../../web/convex/heliosEuclidStations.ts");
  assert.match(query, /heliosEuclidModels/);
  assert.match(query, /by_project_current/);
  assert.match(query, /reconstructEuclidModel/);
  assert.match(query, /evaluateHeliosEuclidAlignmentPosition/);
  assert.doesNotMatch(query, /openai|ctx\.storage|storageId|application\/pdf|input_file/i);
  assert.doesNotMatch(query, /ctx\.db\.insert|ctx\.db\.patch|ctx\.db\.replace|ctx\.db\.delete/);
});

test("Euclid Stage 4M cockpit preserves the one-action station check with governed results", async () => {
  const [cockpit, evaluator] = await Promise.all([
    read("../src/components/euclid-cockpit.tsx"),
    read("../src/components/euclid-station-evaluator.tsx"),
  ]);
  assert.match(cockpit, /EuclidStationEvaluator/);
  assert.match(cockpit, /Stage 4M/);
  assert.match(evaluator, /Compute 3D point/);
  assert.match(evaluator, /Northing/);
  assert.match(evaluator, /Easting/);
  assert.match(evaluator, /profile\.profileRole/);
  assert.match(evaluator, /result\.limitations/);
});

test("Ask Helios consumes the deterministic 4L result rather than calculating coordinates in the language model", async () => {
  const assistant = await read("../../web/convex/heliosAssistant.ts");
  assert.match(assistant, /evaluateHeliosEuclidAlignmentPosition/);
  assert.match(assistant, /euclid-position:/);
  assert.match(assistant, /Deterministic Euclid 4L position/);
  assert.match(assistant, /canonicalPositionAvailable/);
});
