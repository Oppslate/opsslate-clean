import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("Stage 1 defines a canonical engineering record with immutable source provenance", async () => {
  const [contract, schema] = await Promise.all([
    source("../packages/helios-domain/src/engineering-record.ts"),
    source("web/convex/schema.ts"),
  ]);
  assert.match(contract, /HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION/);
  assert.match(contract, /buildHeliosEngineeringSourceFingerprint/);
  assert.match(contract, /assertHeliosEngineeringCompatibility/);
  assert.match(schema, /heliosEngineeringRecords: defineTable/);
  assert.match(schema, /heliosEngineeringSources: defineTable/);
  assert.match(schema, /originalStorageId/);
  assert.match(schema, /originalSha256/);
  assert.match(schema, /immutable: v\.boolean/);
});

test("Stage 1 provides page, text, visual asset, artifact, and provenance channels", async () => {
  const schema = await source("web/convex/schema.ts");
  for (const table of [
    "heliosEngineeringPages",
    "heliosEngineeringTextSpans",
    "heliosEngineeringAssets",
    "heliosEngineeringArtifacts",
    "heliosEngineeringProvenance",
  ]) {
    assert.match(schema, new RegExp(`${table}: defineTable`));
  }
  assert.match(schema, /v\.literal\("native"\)/);
  assert.match(schema, /v\.literal\("ocr"\)/);
  assert.match(schema, /v\.literal\("page_render"\)/);
  assert.match(schema, /v\.literal\("view_crop"\)/);
  assert.match(schema, /textSpanIds/);
  assert.match(schema, /evidenceId/);
});

test("Stage 1 models one reusable OpenAI file lifecycle without activating it", async () => {
  const [schema, documentActions, planActions, geometryActions, estimateActions] =
    await Promise.all([
      source("web/convex/schema.ts"),
      source("web/convex/heliosIntelligenceActions.ts"),
      source("web/convex/heliosPlanActions.ts"),
      source("web/convex/heliosCivilGeometryActions.ts"),
      source("web/convex/heliosEstimateActions.ts"),
    ]);
  assert.match(schema, /heliosEngineeringRemoteFiles: defineTable/);
  assert.match(schema, /provider: v\.literal\("openai"\)/);
  assert.match(schema, /referenceCount/);
  assert.match(schema, /cleanupAttempts/);

  // Existing workflows remain authoritative until shadow comparison is approved.
  assert.match(documentActions, /client\.files\.create/);
  assert.match(planActions, /openai\.files\.create/);
  assert.match(geometryActions, /openai\.files\.create/);
  assert.doesNotMatch(estimateActions, /files\.create/);
  for (const activeWorkflow of [
    documentActions,
    planActions,
    geometryActions,
    estimateActions,
  ]) {
    assert.doesNotMatch(activeWorkflow, /heliosEngineering/);
  }
});

test("Stage 1 keeps all three downstream coverage decisions explicit", async () => {
  const [contract, schema] = await Promise.all([
    source("../packages/helios-domain/src/engineering-record.ts"),
    source("web/convex/schema.ts"),
  ]);
  for (const area of [
    "document_intelligence",
    "plan_reconstruction",
    "civil_geometry",
  ]) {
    assert.match(contract, new RegExp(area));
  }
  assert.match(schema, /documentIntelligence/);
  assert.match(schema, /planReconstruction/);
  assert.match(schema, /civilGeometry/);
  assert.match(schema, /not_applicable/);
});
