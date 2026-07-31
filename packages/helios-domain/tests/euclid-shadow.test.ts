import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHeliosEuclidEntityChunks,
  buildHeliosEuclidShadowModel,
  deriveHeliosEuclidExportQualification,
  euclidModelFingerprint,
  solveHeliosEuclidHorizontalControl,
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
  vertical.verticalDatum = "NAVD88";
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

test("T.G.L. is the proposed roadway centerline profile and shares its horizontal alignment", () => {
  const input = shadowInput();
  input.records[2]!.alignmentName = "Front Avenue Station Line";
  input.records[0]!.alignmentName = "Front Avenue final T.G.L.";
  input.records[0]!.sourceLocator = "Sheet PRO-1, Front Avenue roadway profile";
  const model = buildHeliosEuclidShadowModel(input);

  assert.equal(model.alignments.length, 1);
  assert.equal(model.alignments[0]?.printedName, "Front Avenue Station Line");
  assert.equal(model.alignments[0]?.normalizedName, "front avenue");
  assert.equal(model.profiles[0]?.role, "proposed_finished_grade");
  assert.equal(model.profiles[0]?.verticalDatum, "NAVD88");
  assert.equal(model.spatialReferences[0]?.verticalDatum, "NAVD88");
  assert.equal(model.profiles[0]?.alignmentId, model.alignments[0]?.id);
});

test("mixed roadway profile ordinates become separate existing-ground and FINAL T.G.L. surfaces", () => {
  const input = shadowInput();
  input.records[2]!.alignmentName = "Front Avenue Centerline";
  input.records[0]!.alignmentName = "Front Avenue centerline";
  input.records[0]!.verticalPoints = [
    { station: 14200, elevation: 1375.74, label: "EXISTING GROUND ordinate" },
    { station: 14220, elevation: 1375.18, label: "EXISTING GROUND ordinate" },
    { station: 14200, elevation: 1374.45, label: "FINAL T.G.L. ordinate", gradePercent: -2.71 },
    { station: 14220, elevation: 1373.91, label: "PVT and FINAL T.G.L. ordinate; outgoing grade -1.03%" },
  ];
  const model = buildHeliosEuclidShadowModel(input);

  assert.equal(model.alignments.length, 1);
  assert.deepEqual(model.profiles.map((profile) => profile.role).sort(), ["existing_ground", "proposed_finished_grade"]);
  assert.ok(model.profiles.every((profile) => profile.alignmentId === model.alignments[0]?.id));
  assert.equal(model.profilePoints.filter((point) => point.profileId.includes("existing-ground")).length, 2);
  assert.equal(model.profilePoints.filter((point) => point.profileId.includes("proposed-finished-grade")).length, 2);
  assert.ok(model.profiles.every((profile) => profile.verticalDatum === "NAVD88"));
});

test("printed PVC PVI PVT controls create a deterministic vertical curve", () => {
  const input = shadowInput();
  input.records[0]!.alignmentName = "Front Avenue final T.G.L.";
  input.records[0]!.verticalPoints = [
    { station: 14200, elevation: 1374, label: "PVC; vertical curve L=100 FT, G1=-1.00%, G2=+1.00%" },
    { station: 14250, elevation: 1373.5, label: "PVI, 100-ft vertical curve" },
    { station: 14300, elevation: 1374, label: "PVT and FINAL T.G.L. ordinate; outgoing grade +1.00%" },
  ];
  const model = buildHeliosEuclidShadowModel(input);

  assert.equal(model.verticalCurves.length, 1);
  assert.equal(model.verticalCurves[0]?.curveType, "sag");
  assert.equal(model.verticalCurves[0]?.length.value, 100);
  assert.equal(model.verticalCurves[0]?.incomingGradePercent.value, -1);
  assert.equal(model.verticalCurves[0]?.outgoingGradePercent.value, 1);
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

test("Stage 4C resolves equation locations but blocks unassigned downstream station branches", () => {
  const input = shadowInput();
  input.records[2]!.stationEquations = [{ backStation: 14500, aheadStation: 14480, label: "Sta. 145+00 BK = 144+80 AH" }];
  const model = buildHeliosEuclidShadowModel(input);
  assert.equal(model.stationEquations.length, 1);
  assert.equal(model.stationEquations[0]?.physicalChainage.value, 14500);
  assert.equal(model.stationEquations[0]?.backStation.value, 14500);
  assert.equal(model.stationEquations[0]?.aheadStation.value, 14480);
  const solution = solveHeliosEuclidHorizontalControl(model);
  assert.equal(solution.status, "blocked");
  assert.ok(solution.alignmentSolutions.some((row) => row.checks.some((item) => item.code === "station_branch_unassigned")));
});

test("Stage 4C retains ambiguous station equations as a traceable blocking issue", () => {
  const input = shadowInput();
  input.records[2]!.stationEquations = [
    { backStation: 14500, aheadStation: 14480, label: "Equation A" },
    { backStation: 14500, aheadStation: 14470, label: "Equation B" },
  ];
  const model = buildHeliosEuclidShadowModel(input);
  assert.equal(model.status, "conflicted");
  assert.equal(model.stationEquations.length, 0);
  assert.ok(model.issues.some((issue) => issue.code === "station_equation_location_ambiguous" && issue.severity === "blocking"));
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
