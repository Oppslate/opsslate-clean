import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHeliosEuclidEntityChunks,
  buildHeliosEuclidShadowModel,
  deriveHeliosEuclidExportQualification,
  euclidModelFingerprint,
  type BuildHeliosEuclidShadowInput,
  type HeliosEuclidLegacyGeometryRecord,
} from "../src/index.ts";

const baseRecord = (
  id: string,
  geometryType: HeliosEuclidLegacyGeometryRecord["geometryType"],
): HeliosEuclidLegacyGeometryRecord => ({
  id,
  documentId: `document-${id}`,
  engineeringSourceId: `source-${id}`,
  engineeringPageId: `page-${id}`,
  physicalPageNumber: 1,
  sheetNumber: id === "horizontal" ? "BLT-2" : "PRO-1",
  viewKey: `${id}-view`,
  geometryType,
  authority: geometryType === "horizontal_alignment" ? "coordinate_control" : "profile_geometry",
  alignmentName: "Front Avenue",
  sourceLocator: `${id} control view`,
  units: "US survey feet",
  confidence: 98,
  status: "accepted",
  unresolvedIssues: [],
  horizontalPoints: [],
  horizontalSegments: [],
  stationEquations: [],
  verticalPoints: [],
  crossSectionPoints: [],
  invertPoints: [],
  materialLayers: [],
});

function shadowInput(): BuildHeliosEuclidShadowInput {
  const horizontal = baseRecord("horizontal", "horizontal_alignment");
  horizontal.horizontalPoints = [
    { station: 14000, northing: 783767.8232, easting: 1180350.421, label: "POB Front Avenue" },
    { station: 14709.05, northing: 783900, easting: 1181050, label: "POT Front Avenue" },
  ];
  horizontal.horizontalSegments = [{
    kind: "tangent",
    stationStart: 14000,
    stationEnd: 14709.05,
    length: 709.05,
    bearing: "N 78 deg E",
    label: "Front Avenue tangent",
  }];

  const vertical = baseRecord("vertical", "vertical_alignment");
  vertical.verticalPoints = [
    { station: 14200, elevation: 1374.2, label: "Profile start", gradePercent: -2.71 },
    { station: 14448, elevation: 1372.2, label: "PVI at culvert", gradePercent: 1.03 },
    { station: 14700, elevation: 1378.8, label: "Profile end" },
  ];

  const section = baseRecord("section", "cross_section");
  section.authority = "cross_section_geometry";
  section.crossSectionPoints = [
    { station: 14448, offset: -12, elevation: 1371.2, surface: "existing", label: "Existing left" },
    { station: 14448, offset: 12, elevation: 1371.6, surface: "proposed", label: "Proposed right" },
  ];

  return {
    id: "euclid:titus:r1",
    companyId: "company-1",
    projectId: "titus",
    packageId: "package-1",
    packageRevision: 1,
    engineeringRecordId: "engineering-record-1",
    geometryRunId: "geometry-run-1",
    sourceFingerprint: "canonical-source-fingerprint",
    processingVersion: 1,
    records: [vertical, section, horizontal],
    createdAt: 100,
  };
}

test("Stage 4B deterministically builds one traceable Euclid shadow from stored geometry", () => {
  const input = shadowInput();
  const model = buildHeliosEuclidShadowModel(input);
  assert.equal(model.alignments.length, 1);
  assert.equal(model.alignments[0]?.normalizedName, "front avenue");
  assert.equal(model.controlPoints.length, 2);
  assert.equal(model.horizontalElements.length, 1);
  assert.equal(model.profiles.length, 1);
  assert.equal(model.profiles[0]?.alignmentId, model.alignments[0]?.id);
  assert.equal(model.crossSectionPoints.length, 2);
  assert.equal(model.provenance.length, 3);
  assert.equal(model.status, "accepted");

  const reversed = buildHeliosEuclidShadowModel({ ...input, records: [...input.records].reverse() });
  assert.equal(euclidModelFingerprint(reversed), euclidModelFingerprint(model));
});

test("Stage 4B keeps coordinate ambiguity explicit and blocks premature exchange", () => {
  const model = buildHeliosEuclidShadowModel(shadowInput());
  assert.equal(model.spatialReferences[0]?.referenceState, "partially_known");
  assert.equal(model.spatialReferences[0]?.coordinateBasis, "unknown");
  const qualification = deriveHeliosEuclidExportQualification(model, {
    alignmentIds: [model.alignments[0]!.id],
    profileIds: [model.profiles[0]!.id],
  });
  assert.equal(qualification.eligible, false);
  assert.ok(qualification.reasons.includes("Unknown or conflicted coordinate references block export."));
});

test("Stage 4B does not guess ambiguous linear units or curve rotation", () => {
  const input = shadowInput();
  const horizontal = input.records[2]!;
  horizontal.units = "feet";
  horizontal.horizontalSegments = [{
    kind: "curve",
    stationStart: 14000,
    stationEnd: 14709.05,
    length: 709.05,
    radius: 450,
    deltaDegrees: 22.5,
    bearing: "",
    label: "Curve 1",
  }];
  const model = buildHeliosEuclidShadowModel(input);
  assert.ok(model.spatialReferences.some((reference) => reference.horizontalUnit === "unknown"));
  assert.equal(model.horizontalElements.length, 0);
  assert.equal(model.status, "conflicted");
  assert.ok(model.issues.some((issue) => issue.code === "curve_rotation_missing"));
});

test("Stage 4B records unresolved station equations instead of fabricating chainage", () => {
  const input = shadowInput();
  input.records[2]!.stationEquations = [{ backStation: 14500, aheadStation: 14480, label: "Sta. 145+00 BK = 144+80 AH" }];
  const model = buildHeliosEuclidShadowModel(input);
  assert.equal(model.status, "conflicted");
  assert.ok(model.issues.some((issue) => issue.code === "station_equation_requires_resolution" && issue.severity === "blocking"));
  assert.equal(model.stationEquations.length, 0);
});

test("Stage 4B chunks entities without changing their count or fingerprint", () => {
  const model = buildHeliosEuclidShadowModel(shadowInput());
  const chunks = buildHeliosEuclidEntityChunks(model, 1);
  const entityCount = chunks.reduce((sum, chunk) => sum + chunk.entityCount, 0);
  const expectedCount =
    model.spatialReferences.length
    + model.alignments.length
    + model.controlPoints.length
    + model.horizontalElements.length
    + model.profiles.length
    + model.profilePoints.length
    + model.verticalTangents.length
    + model.crossSectionPoints.length
    + model.relationships.length
    + model.issues.length;
  assert.equal(entityCount, expectedCount);
  assert.ok(chunks.every((chunk) => chunk.entityCount === 1 && chunk.payloadFingerprint.startsWith("helios-parity-v1:")));
});
