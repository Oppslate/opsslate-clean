import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("4D geometry and takeoff mutations enforce session, origin, tenant, project, and current revision", async () => {
  const [geometryRoute, takeoffRoute, gateway, geometry, takeoff] = await Promise.all([
    source("helios/src/app/api/projects/[projectId]/civil-geometry/route.ts"),
    source("helios/src/app/api/projects/[projectId]/takeoff/route.ts"),
    source("web/convex/heliosGateway.ts"),
    source("web/convex/heliosCivilGeometry.ts"),
    source("web/convex/heliosTakeoffIntelligence.ts"),
  ]);
  for (const route of [geometryRoute, takeoffRoute]) {
    assert.match(route, /isSameOrigin/);
    assert.match(route, /readHeliosPrincipal/);
  }
  assert.match(gateway, /protectedPayload/);
  assert.match(gateway, /normalizeCivilGeometryReviewInput/);
  assert.match(gateway, /normalizeTakeoffReviewInput/);
  assert.match(geometry, /requireHeliosPrincipal/);
  assert.match(geometry, /isCurrent/);
  assert.match(takeoff, /companyId/);
  assert.match(takeoff, /planRunId !== basis\.planRun\._id/);
});

test("4D uses civil coordinate geometry before scale fallback and never asks AI for bid quantities", async () => {
  const [contract, prompt, panel] = await Promise.all([
    source("../packages/helios-domain/src/civil-geometry.ts"),
    source("web/convex/heliosCivilGeometryOpenAIContracts.ts"),
    source("helios/src/components/quantity-intelligence-panel.tsx"),
  ]);
  assert.match(contract, /horizontalAlignmentLength/);
  assert.match(contract, /horizontalSegments/);
  assert.match(contract, /stationEquations/);
  assert.match(contract, /verticalAlignmentLength/);
  assert.match(contract, /averageEndAreaVolume/);
  assert.match(contract, /materialLayerVolumeCubicYards/);
  assert.match(prompt, /Horizontal control coordinates/);
  assert.match(prompt, /tangent or curve table row/);
  assert.match(prompt, /Cross-section and typical-section offsets/);
  assert.match(prompt, /Drainage structure stations, offsets, inverts/);
  assert.match(prompt, /Calibrated scale is fallback only/);
  assert.match(prompt, /calculate a bid quantity/i);
  assert.match(panel, /Accepted coordinate geometry appears first/);
  assert.match(panel, /scale.*fallback/i);
});

test("4D keeps measured, owner, production, purchasing, and risk quantities governed and distinct", async () => {
  const [domain, backend, schema, panel] = await Promise.all([
    source("../packages/helios-domain/src/takeoff-intelligence.ts"),
    source("web/convex/heliosTakeoffIntelligence.ts"),
    source("web/convex/schema.ts"),
    source("helios/src/components/quantity-intelligence-panel.tsx"),
  ]);
  assert.match(domain, /calculatedValue/);
  assert.match(domain, /ownerQuantity/);
  assert.match(domain, /"comparative", "production", "purchasing", "risk"/);
  assert.match(backend, /reviewStatus: "proposed"/);
  assert.match(backend, /quantityType: "plan"/);
  assert.match(schema, /heliosTakeoffMeasurements/);
  assert.match(schema, /heliosTakeoffReviewEvents/);
  assert.match(panel, /Use for production/);
  assert.match(panel, /Compare only/);
});
