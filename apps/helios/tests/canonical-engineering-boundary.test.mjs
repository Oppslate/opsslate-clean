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

test("Stage 2 mirrors authoritative outputs without making another OpenAI request", async () => {
  const [shadow, scheduler, documentActions, planActions, geometryActions] =
    await Promise.all([
      source("web/convex/heliosEngineeringShadow.ts"),
      source("web/convex/heliosEngineeringShadowSchedule.ts"),
      source("web/convex/heliosIntelligenceActions.ts"),
      source("web/convex/heliosPlanActions.ts"),
      source("web/convex/heliosCivilGeometryActions.ts"),
    ]);
  assert.match(shadow, /shadowMode: true/);
  assert.match(shadow, /heliosDocumentIntelligence/);
  assert.match(shadow, /heliosPlanPages/);
  assert.match(shadow, /heliosCivilGeometryRecords/);
  assert.match(shadow, /ensureProvenance/);
  assert.doesNotMatch(shadow, /from "openai"|files\.create|responses\.create/);
  assert.match(scheduler, /scheduleWithoutBlocking/);
  for (const activeAction of [documentActions, planActions, geometryActions]) {
    assert.doesNotMatch(activeAction, /heliosEngineeringShadow/);
  }
});

test("Stage 2 remains a write-only shadow boundary for estimator workflows", async () => {
  const consumers = await Promise.all([
    source("web/convex/heliosGateway.ts"),
    source("web/convex/heliosEstimates.ts"),
    source("web/convex/heliosEstimateBuild.ts"),
    source("web/convex/heliosTakeoffIntelligence.ts"),
  ]);
  for (const consumer of consumers) {
    assert.doesNotMatch(
      consumer,
      /heliosEngineeringRecords|heliosEngineeringArtifacts|heliosEngineeringPages/,
    );
  }
});

test("Stage 2 exposes an internal parity report and idempotent source identities", async () => {
  const [shadow, schema] = await Promise.all([
    source("web/convex/heliosEngineeringShadow.ts"),
    source("web/convex/schema.ts"),
  ]);
  assert.match(shadow, /getShadowParity = internalQuery/);
  assert.match(shadow, /by_record_document/);
  assert.match(shadow, /by_authoritative_record/);
  assert.match(shadow, /by_artifact_record/);
  assert.match(schema, /authoritativeRecordType/);
  assert.match(schema, /authoritativeRecordId/);
  assert.match(schema, /shadowMode: v\.boolean/);
});

test("Stage 3 requires exact source, evidence, plan, view, and geometry parity", async () => {
  const [contract, parity, shadow, schema] = await Promise.all([
    source("../packages/helios-domain/src/engineering-record.ts"),
    source("web/convex/heliosEngineeringParity.ts"),
    source("web/convex/heliosEngineeringShadow.ts"),
    source("web/convex/schema.ts"),
  ]);
  for (const area of [
    "sources",
    "document_intelligence",
    "evidence",
    "plan_pages",
    "plan_views",
    "plan_calibrations",
    "plan_references",
    "civil_geometry",
  ]) {
    assert.match(contract, new RegExp(`"${area}"`));
  }
  assert.match(contract, /compareHeliosEngineeringParity/);
  assert.match(contract, /fingerprintMismatchIds/);
  assert.match(parity, /runGoldenParity = internalMutation/);
  assert.match(parity, /getGoldenParity = internalQuery/);
  assert.match(shadow, /recordType: "heliosPlanPageViews"/);
  assert.match(shadow, /recordFingerprint/);
  assert.match(schema, /heliosEngineeringParityRuns: defineTable/);
});

test("Stage 3 remains internal and does not cut over application consumers", async () => {
  const [parity, gateway, estimates, takeoff] = await Promise.all([
    source("web/convex/heliosEngineeringParity.ts"),
    source("web/convex/heliosGateway.ts"),
    source("web/convex/heliosEstimates.ts"),
    source("web/convex/heliosTakeoffIntelligence.ts"),
  ]);
  assert.doesNotMatch(parity, /from "openai"|files\.create|responses\.create/);
  for (const consumer of [gateway, estimates, takeoff]) {
    assert.doesNotMatch(consumer, /heliosEngineeringParityRuns|runGoldenParity/);
  }
});

test("Cutover Stage 1 freezes a workflow-by-workflow original-PDF policy", async () => {
  const contract = await source("../packages/helios-domain/src/canonical-cutover.ts");
  assert.match(contract, /HELIOS_CANONICAL_READER_CONTRACT_VERSION/);
  assert.match(contract, /source_ingestion/);
  assert.match(contract, /required_once/);
  assert.match(contract, /review_only/);
  assert.match(contract, /forbidden/);
  assert.match(contract, /heliosPlanActions:startPlanDocument/);
  assert.match(contract, /heliosCivilGeometryActions:startGeometryDocument/);
});

test("Cutover Stage 1 records immutable readiness audits without switching readers", async () => {
  const [schema, audit, planActions, geometryActions] = await Promise.all([
    source("web/convex/schema.ts"),
    source("web/convex/heliosCanonicalCutover.ts"),
    source("web/convex/heliosPlanActions.ts"),
    source("web/convex/heliosCivilGeometryActions.ts"),
  ]);
  assert.match(schema, /heliosCanonicalCutoverRuns: defineTable/);
  assert.match(audit, /auditCanonicalCutover = internalMutation/);
  assert.match(audit, /getCanonicalCutoverReadiness = internalQuery/);
  assert.doesNotMatch(audit, /from "openai"|files\.create|responses\.create/);

  // The legacy actions remain intact until their separately approved stages.
  assert.match(planActions, /openai\.files\.create/);
  assert.match(geometryActions, /openai\.files\.create/);
});
