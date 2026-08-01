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
  typicalSections: [],
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

test("Stage 4N canonical intake preserves typical-section widths and signed outward slopes", () => {
  const input = shadowInput();
  input.records[1]!.typicalSections = [{
    name: "Roadway typical", stationStart: 14200, stationEnd: 14700,
    laneWidthLeft: 12, laneWidthRight: 12, shoulderWidthLeft: 4, shoulderWidthRight: 4,
    crossSlopeLeftPercent: -2, crossSlopeRightPercent: -2,
  }];
  const result = buildHeliosEuclidShadowModel(input);
  assert.equal(result.typicalSections.length, 1);
  assert.equal(result.typicalSections[0]?.laneWidthLeft?.value, 12);
  assert.equal(result.typicalSections[0]?.crossSlopeRightPercent?.value, -2);
  assert.equal(result.typicalSections[0]?.stationStart.displayedStation, 14200);
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

test("BLT-2 curve tables reconstruct a complete horizontal chain between coordinate anchors", () => {
  const input = shadowInput();
  const horizontal = input.records[2]!;
  horizontal.alignmentName = "Front Avenue Centerline";
  horizontal.horizontalPoints = [
    { station: 14021.28, northing: 787367.8232, easting: 1108350.421, label: "Front Ave Sta. 140+21.28" },
    { station: 14403.35, northing: 787264.9964, easting: 1108708.3139, label: "Front Ave Sta. 144+03.35" },
    { station: 14448.33, northing: 787265.1349, easting: 1108753.2961, label: "Front Ave Sta. 144+48.33" },
    { station: 14709.05, northing: 787216.3053, easting: 1109006.8251, label: "Front Ave Sta. 147+09.05" },
  ];
  horizontal.horizontalSegments = [];

  const curve1 = baseRecord("curve-1", "horizontal_alignment");
  curve1.sheetNumber = "BLT-2";
  curve1.authority = "dimensioned_geometry";
  curve1.alignmentName = "Front Avenue Centerline";
  curve1.horizontalSegments = [{
    kind: "curve",
    stationStart: 14165.82,
    stationEnd: 14294.88,
    length: 129.06,
    radius: 250,
    deltaDegrees: 29.5788611111,
    bearing: "",
    label: "Front Ave Curve No. 1; PC 141+65.82; PT 142+94.88; 29°34'43.9\" LT",
  }];
  const curve2 = baseRecord("curve-2", "horizontal_alignment");
  curve2.sheetNumber = "BLT-2";
  curve2.authority = "dimensioned_geometry";
  curve2.alignmentName = "Front Avenue Centerline";
  curve2.horizontalSegments = [{
    kind: "curve",
    stationStart: 14489.38,
    stationEnd: 14649.39,
    length: 160.01,
    radius: 450,
    deltaDegrees: 20.3728055556,
    bearing: "",
    label: "Front Ave Curve No. 2; PC 144+89.38; PT 146+49.39; 20°22'22.1\" RT",
  }];
  input.records.push(curve1, curve2);

  const model = buildHeliosEuclidShadowModel(input);
  const curves = model.horizontalElements.filter((row) => row.elementType === "circular_curve");
  assert.equal(model.horizontalElements.length, 7);
  assert.equal(curves.length, 2);
  assert.deepEqual(curves.map((row) => row.rotation), ["left", "right"]);
  assert.deepEqual(curves.map((row) => row.radius.value), [250, 450]);
  assert.deepEqual(curves.map((row) => row.deltaDegrees.value), [29.5788611111, 20.3728055556]);
  assert.deepEqual(curves.map((row) => [row.startStation.displayedStation, row.endStation.displayedStation]), [
    [14165.82, 14294.88],
    [14489.38, 14649.39],
  ]);
  const computedCurveControls = model.controlPoints.filter((row) =>
    [14165.82, 14294.88, 14489.38, 14649.39].includes(row.station.displayedStation));
  assert.equal(computedCurveControls.length, 4);
  assert.ok(computedCurveControls.every((row) => row.northing.origin === "computed" && row.easting.origin === "computed"));
  assert.ok(model.issues.some((issue) => issue.code === "horizontal_chain_computed_from_anchors"));

  const solution = solveHeliosEuclidHorizontalControl(model);
  const frontAvenue = solution.alignmentSolutions.find((row) => row.alignmentId === model.alignments[0]?.id);
  assert.notEqual(frontAvenue?.status, "not_applicable");
  assert.equal(frontAvenue?.elementCount, 7);
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
