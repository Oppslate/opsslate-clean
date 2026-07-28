import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_SCHEMA_VERSION,
  buildHeliosEuclidHorizontalSolutionChunks,
  heliosEuclidHorizontalSolutionFingerprint,
  parseHeliosEuclidBearing,
  resolveHeliosEuclidStationEquations,
  solveHeliosEuclidHorizontalControl,
  type HeliosEuclidModel,
  type HeliosEuclidStation,
  type HeliosEuclidValue,
} from "../src/index.ts";

const provenanceId = "prov-blt-2";

function station(chainage: number, displayedStation = chainage, stationEquationId?: string): HeliosEuclidStation {
  return {
    chainage,
    displayedStation,
    printedStation: `${Math.floor(displayedStation / 100)}+${(displayedStation % 100).toFixed(2).padStart(5, "0")}`,
    stationEquationId,
    chainageOrigin: "printed",
    inputValueIds: [],
    provenanceIds: [provenanceId],
    reviewState: "accepted",
  };
}

function value<T>(id: string, normalized: T, printedValue = String(normalized)): HeliosEuclidValue<T> {
  return {
    id,
    value: normalized,
    origin: "printed",
    printedValue,
    inputValueIds: [],
    provenanceIds: [provenanceId],
    reviewState: "accepted",
  };
}

function titusHorizontalGoldenModel(): HeliosEuclidModel {
  const curveLength = 100 * Math.PI / 2;
  const frontEnd = 1000 + 100 + curveLength + 50;
  return {
    id: "euclid:titus:horizontal-golden",
    companyId: "company-1",
    projectId: "titus",
    packageId: "package-1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "titus-blt-control-fixture-v1",
    status: "accepted",
    spatialReferences: [{
      id: "crs-titus",
      name: "Titus published project grid fixture",
      referenceState: "known",
      coordinateBasis: "grid",
      axisOrder: "northing_easting",
      horizontalUnit: "us_survey_foot",
      verticalUnit: "us_survey_foot",
      horizontalDatum: "Fixture datum transcribed for deterministic validation",
      projectedCoordinateSystem: "Fixture project grid transcribed for deterministic validation",
      provenanceIds: [provenanceId],
      reviewState: "accepted",
    }],
    provenance: [{
      id: provenanceId,
      engineeringSourceId: "source-blt-2",
      documentId: "document-blt-2",
      pageId: "page-blt-2",
      physicalPageNumber: 1,
      sheetNumber: "BLT-2",
      viewKey: "baseline-ties-centerline-control",
      locator: "Titus golden control transcription; BLT-2",
      textSpanIds: [],
      authority: "coordinate_control",
      confidence: 100,
    }],
    alignments: [{
      id: "alignment-front-avenue",
      printedName: "FRONT AVE",
      normalizedName: "Front Avenue",
      alignmentType: "roadway_centerline",
      spatialReferenceId: "crs-titus",
      startStation: station(1000),
      endStation: station(frontEnd),
      increasingDirection: "north then east",
      sourceSheetNumbers: ["BLT-2"],
      reviewState: "accepted",
      completeness: "complete",
    }, {
      id: "alignment-titus-run",
      printedName: "TITUS RUN",
      normalizedName: "Titus Run",
      alignmentType: "stream_channel",
      spatialReferenceId: "crs-titus",
      startStation: station(5000),
      endStation: station(5100),
      increasingDirection: "east",
      sourceSheetNumbers: ["BLT-2"],
      reviewState: "accepted",
      completeness: "complete",
    }],
    controlPoints: [
      { id: "front-pob", alignmentId: "alignment-front-avenue", pointType: "pob", name: "Front POB", station: station(1000), northing: value("front-pob-n", 1000), easting: value("front-pob-e", 1000), reviewState: "accepted" },
      { id: "front-pc", alignmentId: "alignment-front-avenue", pointType: "pc", name: "Front PC", station: station(1100), northing: value("front-pc-n", 1100), easting: value("front-pc-e", 1000), reviewState: "accepted" },
      { id: "front-pt", alignmentId: "alignment-front-avenue", pointType: "pt", name: "Front PT", station: station(1100 + curveLength), northing: value("front-pt-n", 1200), easting: value("front-pt-e", 1100), reviewState: "accepted" },
      { id: "front-pot", alignmentId: "alignment-front-avenue", pointType: "pot", name: "Front POT", station: station(frontEnd), northing: value("front-pot-n", 1200), easting: value("front-pot-e", 1150), reviewState: "accepted" },
      { id: "titus-pob", alignmentId: "alignment-titus-run", pointType: "pob", name: "Titus POB", station: station(5000), northing: value("titus-pob-n", 2000), easting: value("titus-pob-e", 2000), reviewState: "accepted" },
      { id: "titus-pot", alignmentId: "alignment-titus-run", pointType: "pot", name: "Titus POT", station: station(5100), northing: value("titus-pot-n", 2000), easting: value("titus-pot-e", 2100), reviewState: "accepted" },
    ],
    horizontalElements: [
      { id: "front-line-1", alignmentId: "alignment-front-avenue", sequence: 1, elementType: "line", startStation: station(1000), endStation: station(1100), startPointId: "front-pob", endPointId: "front-pc", length: value("front-line-1-length", 100, "100.00 FT"), bearing: value("front-line-1-bearing", "N 00 00 00 E", "N 00°00'00\" E"), reviewState: "accepted" },
      { id: "front-curve-1", alignmentId: "alignment-front-avenue", sequence: 2, elementType: "circular_curve", startStation: station(1100), endStation: station(1100 + curveLength), startPointId: "front-pc", endPointId: "front-pt", length: value("front-curve-1-length", curveLength, "157.079632679 FT"), rotation: "right", radius: value("front-curve-1-radius", 100, "100.00 FT"), deltaDegrees: value("front-curve-1-delta", 90, "90°00'00\""), reviewState: "accepted" },
      { id: "front-line-2", alignmentId: "alignment-front-avenue", sequence: 3, elementType: "line", startStation: station(1100 + curveLength), endStation: station(frontEnd), startPointId: "front-pt", endPointId: "front-pot", length: value("front-line-2-length", 50, "50.00 FT"), bearing: value("front-line-2-bearing", "N 90 00 00 E", "N 90°00'00\" E"), reviewState: "accepted" },
      { id: "titus-line-1", alignmentId: "alignment-titus-run", sequence: 1, elementType: "line", startStation: station(5000), endStation: station(5100), startPointId: "titus-pob", endPointId: "titus-pot", length: value("titus-line-1-length", 100, "100.00 FT"), bearing: value("titus-line-1-bearing", "N 90 00 00 E", "N 90°00'00\" E"), reviewState: "accepted" },
    ],
    stationEquations: [],
    profiles: [],
    profilePoints: [],
    verticalTangents: [],
    verticalCurves: [],
    typicalSections: [],
    crossSectionPoints: [],
    structures: [],
    inverts: [],
    materialLayers: [],
    relationships: [{ id: "front-crosses-titus", relationshipType: "alignment_crossing", sourceEntityId: "alignment-front-avenue", targetEntityId: "alignment-titus-run", sourceStation: station(1200), targetStation: station(5050), provenanceIds: [provenanceId], reviewState: "accepted" }],
    issues: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

test("Stage 4C parses quadrant bearings without changing survey intent", () => {
  assert.equal(parseHeliosEuclidBearing("N 29°34'43\" E"), 29 + 34 / 60 + 43 / 3600);
  assert.equal(parseHeliosEuclidBearing("S 10 30 00 E"), 169.5);
  assert.equal(parseHeliosEuclidBearing("S 10 30 00 W"), 190.5);
  assert.equal(parseHeliosEuclidBearing("N 10 30 00 W"), 349.5);
  assert.equal(parseHeliosEuclidBearing("AZ 270"), 270);
  assert.equal(parseHeliosEuclidBearing("N 95 E"), undefined);
});

test("Stage 4C deterministically resolves sequential station equations", () => {
  const resolution = resolveHeliosEuclidStationEquations({
    alignmentId: "alignment-front-avenue",
    startChainage: 1000,
    startDisplayedStation: 1000,
    equations: [{ id: "eq-1", alignmentId: "alignment-front-avenue", backStation: 1200, aheadStation: 1150, printedEquation: "12+00 BK = 11+50 AH", provenanceIds: [provenanceId], reviewState: "accepted" }, { id: "eq-2", alignmentId: "alignment-front-avenue", backStation: 1300, aheadStation: 1310, printedEquation: "13+00 BK = 13+10 AH", provenanceIds: [provenanceId], reviewState: "accepted" }],
  });
  assert.deepEqual(resolution.issues, []);
  assert.equal(resolution.equations[0]?.physicalChainage.value, 1200);
  assert.equal(resolution.equations[1]?.physicalChainage.value, 1350);
  assert.deepEqual(resolution.equations[1]?.physicalChainage.inputValueIds, ["eq-2:back", "eq-1:physical-chainage", "eq-1:ahead"]);
});

test("Stage 4C passes the separate Front Avenue and Titus Run golden control chains", () => {
  const solution = solveHeliosEuclidHorizontalControl(titusHorizontalGoldenModel());
  assert.equal(solution.status, "passed");
  assert.equal(solution.alignmentSolutions.length, 2);
  assert.equal(solution.blockingCount, 0);
  assert.equal(solution.reviewCount, 0);
  assert.deepEqual(solution.alignmentSolutions.map((row) => row.status), ["passed", "passed"]);
  assert.ok(solution.alignmentSolutions.flatMap((row) => row.checks).some((row) => row.code === "curve_arc_length" && row.status === "pass"));
});

test("Stage 4C blocks a curve whose printed length conflicts with radius and delta", () => {
  const model = titusHorizontalGoldenModel();
  const curve = model.horizontalElements.find((row) => row.elementType === "circular_curve");
  assert.ok(curve && curve.elementType === "circular_curve");
  curve.length.value += 1;
  const solution = solveHeliosEuclidHorizontalControl(model);
  assert.equal(solution.status, "blocked");
  assert.ok(solution.alignmentSolutions.flatMap((row) => row.checks).some((row) => row.code === "curve_arc_length" && row.status === "block"));
});

test("Stage 4C blocks station-dependent use until post-equation facts identify their branch", () => {
  const model = titusHorizontalGoldenModel();
  const resolution = resolveHeliosEuclidStationEquations({
    alignmentId: "alignment-front-avenue",
    startChainage: 1000,
    startDisplayedStation: 1000,
    equations: [{ id: "eq-front", alignmentId: "alignment-front-avenue", backStation: 1050, aheadStation: 1040, printedEquation: "10+50 BK = 10+40 AH", provenanceIds: [provenanceId], reviewState: "accepted" }],
  });
  model.stationEquations = resolution.equations;
  const solution = solveHeliosEuclidHorizontalControl(model);
  assert.equal(solution.status, "blocked");
  assert.ok(solution.alignmentSolutions.flatMap((row) => row.checks).some((row) => row.code === "station_branch_unassigned" && row.status === "block"));
});

test("Stage 4C solution fingerprints and chunks are deterministic", () => {
  const first = solveHeliosEuclidHorizontalControl(titusHorizontalGoldenModel());
  const second = solveHeliosEuclidHorizontalControl(titusHorizontalGoldenModel());
  assert.equal(heliosEuclidHorizontalSolutionFingerprint(first), heliosEuclidHorizontalSolutionFingerprint(second));
  const chunks = buildHeliosEuclidHorizontalSolutionChunks(first, 2);
  assert.equal(chunks.reduce((sum, row) => sum + row.checkCount, 0), first.checkCount);
  assert.ok(chunks.every((row) => row.payloadFingerprint.startsWith("helios-parity-v1:")));
});
