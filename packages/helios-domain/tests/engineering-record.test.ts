import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_ENGINEERING_COVERAGE_AREAS,
  HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION,
  HeliosEngineeringRecordError,
  assertHeliosEngineeringCompatibility,
  buildHeliosEngineeringSourceFingerprint,
  deriveHeliosEngineeringShadowCoverage,
  deriveHeliosEngineeringShadowRecordStatus,
} from "../src/index.ts";

const hexadecimal =
  "eaabc4702f84ca61f1b74631cf405b4cdb64598618cc39edbc429644f06b2ab1";
const base64 = "6qvEcC+EymHxt0Yxz0BbTNtkWYYYzDntvEKWRPBrKrE=";

test("defines additive engineering coverage without changing existing workflow names", () => {
  assert.equal(HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION, 1);
  assert.deepEqual(HELIOS_ENGINEERING_COVERAGE_AREAS, [
    "document_intelligence",
    "plan_reconstruction",
    "civil_geometry",
  ]);
});

test("builds one stable source fingerprint across browser and storage digest encodings", () => {
  const input = {
    packageRevision: 2,
    sourceVersion: 1,
    ingestionSchemaVersion: 1,
    extractorVersion: "canonical-pages-v1",
    promptVersion: "engineering-ingestion-v1",
    modelVersion: "gpt-5.6-sol",
  };
  assert.equal(
    buildHeliosEngineeringSourceFingerprint({ ...input, sha256: hexadecimal }),
    buildHeliosEngineeringSourceFingerprint({ ...input, sha256: base64 }),
  );
});

test("rejects stale package, source, and ownership identities", () => {
  const identity = {
    companyId: "company-1",
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 2,
    documentId: "document-1",
    sha256: base64,
    sourceVersion: 1,
  };
  assert.equal(
    assertHeliosEngineeringCompatibility(identity, {
      ...identity,
      sha256: hexadecimal,
    }),
    true,
  );
  assert.throws(
    () => assertHeliosEngineeringCompatibility(identity, {
      ...identity,
      packageRevision: 3,
    }),
    /packageRevision/,
  );
  assert.throws(
    () => assertHeliosEngineeringCompatibility(identity, {
      ...identity,
      companyId: "company-2",
    }),
    /companyId/,
  );
});

test("requires exactly one immutable PDF or written-scope source", () => {
  const invalid = {
    companyId: "company-1",
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 1,
    sha256: base64,
    sourceVersion: 1,
  };
  assert.throws(
    () => assertHeliosEngineeringCompatibility(invalid, invalid),
    HeliosEngineeringRecordError,
  );
});

test("keeps valid variable bid bases from waiting on absent plans", () => {
  const coverage = deriveHeliosEngineeringShadowCoverage({
    pdfSourceCount: 1,
    completedDocumentCount: 1,
    failedDocumentCount: 0,
    activeDocumentCount: 0,
    plansApplicable: false,
  });
  assert.deepEqual(coverage, {
    documentIntelligence: "ready",
    planReconstruction: "not_applicable",
    civilGeometry: "not_applicable",
  });
  assert.equal(deriveHeliosEngineeringShadowRecordStatus(coverage), "ready");
});

test("treats a written-scope-only canonical basis as ready without invented PDF work", () => {
  const coverage = deriveHeliosEngineeringShadowCoverage({
    pdfSourceCount: 0,
    completedDocumentCount: 0,
    failedDocumentCount: 0,
    activeDocumentCount: 0,
    plansApplicable: false,
  });
  assert.equal(deriveHeliosEngineeringShadowRecordStatus(coverage), "ready");
});

test("reports partial shadow coverage without promoting pending geometry", () => {
  const coverage = deriveHeliosEngineeringShadowCoverage({
    pdfSourceCount: 3,
    completedDocumentCount: 2,
    failedDocumentCount: 1,
    activeDocumentCount: 0,
    plansApplicable: true,
    planRunStatus: "partially_ready",
    geometryRunStatus: "queued",
  });
  assert.deepEqual(coverage, {
    documentIntelligence: "partially_ready",
    planReconstruction: "partially_ready",
    civilGeometry: "processing",
  });
  assert.equal(
    deriveHeliosEngineeringShadowRecordStatus(coverage),
    "partially_ready",
  );
});
