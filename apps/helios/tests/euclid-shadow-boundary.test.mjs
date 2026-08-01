import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("Euclid Stage 4B adds versioned write-only shadow storage", async () => {
  const [schema, writer] = await Promise.all([
    source("web/convex/schema.ts"),
    source("web/convex/heliosEuclidShadow.ts"),
  ]);
  for (const table of ["heliosEuclidModels", "heliosEuclidProvenance", "heliosEuclidEntityChunks"]) {
    assert.match(schema, new RegExp(`${table}: defineTable`));
  }
  assert.match(schema, /shadowMode: v\.boolean/);
  assert.match(schema, /modelFingerprint/);
  assert.match(schema, /payloadFingerprint/);
  assert.match(writer, /syncEuclidRunShadow = internalMutation/);
  assert.match(writer, /getEuclidShadowStatus = internalQuery/);
  assert.match(writer, /supersedeCurrentModel/);
});

test("Euclid Stage 4B consumes stored canonical facts without another PDF or AI call", async () => {
  const [writer, adapter, engineeringShadow] = await Promise.all([
    source("web/convex/heliosEuclidShadow.ts"),
    source("../packages/helios-domain/src/euclid-shadow.ts"),
    source("web/convex/heliosEngineeringShadow.ts"),
  ]);
  assert.match(writer, /heliosCivilGeometryRecords/);
  assert.match(writer, /heliosEngineeringProvenance/);
  assert.match(writer, /heliosEngineeringPages/);
  assert.match(writer, /buildHeliosEuclidShadowModel/);
  assert.match(adapter, /HELIOS_EUCLID_SHADOW_ADAPTER/);
  assert.match(adapter, /validateHeliosEuclidContract/);
  assert.match(engineeringShadow, /scheduleEuclidShadow/);
  for (const implementation of [writer, adapter]) {
    assert.doesNotMatch(implementation, /from "openai"|files\.create|responses\.create|storage\.getUrl/);
  }
});

test("Euclid Stage 4B does not cut over existing application readers", async () => {
  const consumers = await Promise.all([
    source("web/convex/heliosEstimates.ts"),
    source("web/convex/heliosEstimateBuild.ts"),
    source("web/convex/heliosTakeoffIntelligence.ts"),
    source("helios/src/components/estimate-cockpit-2.tsx"),
  ]);
  for (const consumer of consumers) {
    assert.doesNotMatch(consumer, /heliosEuclidModels|heliosEuclidEntityChunks|heliosEuclidProvenance/);
  }
  const [gateway, assistant] = await Promise.all([
    source("web/convex/heliosGateway.ts"),
    source("web/convex/heliosAssistant.ts"),
  ]);
  assert.match(gateway, /heliosEuclidStations:evaluatePosition/);
  assert.match(assistant, /evaluateHeliosEuclidAlignmentPosition/);
});

test("Euclid Stage 4B fails closed on missing canonical provenance", async () => {
  const writer = await source("web/convex/heliosEuclidShadow.ts");
  assert.match(writer, /waiting_for_canonical_provenance/);
  assert.match(writer, /canonical_provenance_incomplete/);
  assert.match(writer, /bounded retries/i);
  assert.match(writer, /validationStatus: "invalid"/);
});

test("Euclid and cutover share deterministic bid-over-permit drawing authority", async () => {
  const [writer, cutover, authority] = await Promise.all([
    source("web/convex/heliosEuclidShadow.ts"),
    source("web/convex/heliosCanonicalCutover.ts"),
    source("web/convex/heliosPlanAuthority.ts"),
  ]);
  assert.match(authority, /derivePlanSheetConflicts/);
  assert.match(authority, /deriveStoredPlanSheetConflicts/);
  assert.match(authority, /deterministic bid-over-permit authority/i);
  assert.match(writer, /deriveStoredPlanSheetConflicts\(planPages, sheetDecisions\)/);
  assert.match(cutover, /deriveStoredPlanSheetConflicts\(planPages, sheetDecisions\)/);
  assert.match(writer, /conflict\.referencePageIds/);
  assert.doesNotMatch(writer, /sheetCounts|decisionBySheet/);
});
