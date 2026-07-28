import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_SCHEMA_VERSION,
  HELIOS_EUCLID_VERTICAL_SOLVER,
  buildHeliosEuclidVerticalSolutionChunks,
  evaluateHeliosEuclidVerticalCurve,
  heliosEuclidVerticalSolutionFingerprint,
  solveHeliosEuclidVerticalProfiles,
  type HeliosEuclidModel,
  type HeliosEuclidStation,
  type HeliosEuclidValue,
} from "../src/index.ts";

const provenanceId = "prov-pro-1";

function station(chainage: number): HeliosEuclidStation {
  return {
    chainage,
    displayedStation: chainage,
    printedStation: `${Math.floor(chainage / 100)}+${(chainage % 100).toFixed(2).padStart(5, "0")}`,
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

function titusPro1GoldenModel(): HeliosEuclidModel {
  const pviElevation = 1373 + (-0.0271 * 32.5);
  const pvtElevation = pviElevation + (0.0103 * 32.5);
  return {
    id: "euclid:titus:pro-1-golden",
    companyId: "company-1",
    projectId: "titus",
    packageId: "package-1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "titus-pro-1-controlled-transcription-v1",
    status: "accepted",
    spatialReferences: [{
      id: "crs-titus",
      name: "Titus published project grid fixture",
      referenceState: "known",
      coordinateBasis: "grid",
      axisOrder: "northing_easting",
      horizontalUnit: "us_survey_foot",
      verticalUnit: "us_survey_foot",
      horizontalDatum: "Controlled fixture datum",
      verticalDatum: "Controlled fixture vertical datum",
      projectedCoordinateSystem: "Controlled fixture project grid",
      provenanceIds: [provenanceId],
      reviewState: "accepted",
    }],
    provenance: [{
      id: provenanceId,
      engineeringSourceId: "source-pro-1",
      documentId: "document-pro-1",
      pageId: "page-pro-1",
      physicalPageNumber: 1,
      sheetNumber: "PRO-1",
      viewKey: "roadway-profile",
      locator: "Controlled mathematical transcription for Stage 4D validation",
      textSpanIds: [],
      authority: "profile_geometry",
      confidence: 100,
    }],
    alignments: [{
      id: "alignment-front-avenue",
      printedName: "FRONT AVE",
      normalizedName: "Front Avenue",
      alignmentType: "roadway_centerline",
      spatialReferenceId: "crs-titus",
      startStation: station(14200),
      endStation: station(14700),
      increasingDirection: "increasing station",
      sourceSheetNumbers: ["PRO-1"],
      reviewState: "accepted",
      completeness: "complete",
    }],
    controlPoints: [],
    horizontalElements: [],
    stationEquations: [],
    profiles: [{
      id: "profile-finished-grade",
      alignmentId: "alignment-front-avenue",
      printedName: "FINAL T.G.L.",
      normalizedName: "Proposed finished grade",
      role: "proposed_finished_grade",
      startStation: station(14300),
      endStation: station(14365),
      verticalDatum: "Controlled fixture vertical datum",
      sourceSheetNumbers: ["PRO-1"],
      reviewState: "accepted",
      completeness: "complete",
    }, {
      id: "profile-existing-ground",
      alignmentId: "alignment-front-avenue",
      printedName: "EXISTING GROUND",
      normalizedName: "Existing ground",
      role: "existing_ground",
      startStation: station(14200),
      endStation: station(14700),
      verticalDatum: "Controlled fixture vertical datum",
      sourceSheetNumbers: ["PRO-1"],
      reviewState: "accepted",
      completeness: "complete",
    }],
    profilePoints: [
      { id: "fg-pvc", profileId: "profile-finished-grade", pointType: "pvc", station: station(14300), elevation: value("fg-pvc-elev", 1373, "1373.00"), reviewState: "accepted" },
      { id: "fg-pvi", profileId: "profile-finished-grade", pointType: "pvi", station: station(14332.5), elevation: value("fg-pvi-elev", pviElevation, pviElevation.toFixed(5)), reviewState: "accepted" },
      { id: "fg-pvt", profileId: "profile-finished-grade", pointType: "pvt", station: station(14365), elevation: value("fg-pvt-elev", pvtElevation, pvtElevation.toFixed(5)), reviewState: "accepted" },
      { id: "eg-start", profileId: "profile-existing-ground", pointType: "profile_start", station: station(14200), elevation: value("eg-start-elev", 1375, "1375.00"), reviewState: "accepted" },
      { id: "eg-end", profileId: "profile-existing-ground", pointType: "profile_end", station: station(14700), elevation: value("eg-end-elev", 1377, "1377.00"), reviewState: "accepted" },
    ],
    verticalTangents: [{ id: "eg-tangent", profileId: "profile-existing-ground", sequence: 1, startPointId: "eg-start", endPointId: "eg-end", gradePercent: value("eg-grade", 0.4, "0.40%"), reviewState: "accepted" }],
    verticalCurves: [{
      id: "fg-curve-1",
      profileId: "profile-finished-grade",
      sequence: 1,
      curveType: "sag",
      symmetry: "symmetric",
      pvcPointId: "fg-pvc",
      pviPointId: "fg-pvi",
      pvtPointId: "fg-pvt",
      incomingGradePercent: value("fg-g1", -2.71, "-2.71%"),
      outgoingGradePercent: value("fg-g2", 1.03, "+1.03%"),
      length: value("fg-length", 65, "L = 65.00 FT"),
      algebraicGradeDifferencePercent: value("fg-a", 3.74, "A = 3.74%"),
      kValue: value("fg-k", 65 / 3.74, `K = ${(65 / 3.74).toFixed(4)}`),
      solverVersion: HELIOS_EUCLID_VERTICAL_SOLVER,
      reviewState: "accepted",
    }],
    typicalSections: [],
    crossSectionPoints: [],
    structures: [],
    inverts: [],
    materialLayers: [],
    relationships: [],
    issues: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

test("Stage 4D keeps proposed grade and existing ground as separate profiles", () => {
  const solution = solveHeliosEuclidVerticalProfiles(titusPro1GoldenModel());
  assert.equal(solution.status, "passed");
  assert.equal(solution.blockingCount, 0);
  assert.equal(solution.reviewCount, 0);
  assert.deepEqual(solution.profileSolutions.map((row) => [row.role, row.status]), [
    ["existing_ground", "passed"],
    ["proposed_finished_grade", "passed"],
  ]);
});

test("Stage 4D evaluates the normal parabolic curve and refuses extrapolation", () => {
  const model = titusPro1GoldenModel();
  const curve = model.verticalCurves[0]!;
  const [pvc, pvi, pvt] = model.profilePoints.slice(0, 3);
  const atPvc = evaluateHeliosEuclidVerticalCurve({ curve, pvc: pvc!, pvi: pvi!, pvt: pvt!, chainage: 14300 });
  const atPvt = evaluateHeliosEuclidVerticalCurve({ curve, pvc: pvc!, pvi: pvi!, pvt: pvt!, chainage: 14365 });
  const lowChainage = 14300 - ((-0.0271 * 65) / (0.0103 - (-0.0271)));
  const atLow = evaluateHeliosEuclidVerticalCurve({ curve, pvc: pvc!, pvi: pvi!, pvt: pvt!, chainage: lowChainage });
  assert.equal(atPvc.elevation, 1373);
  assert.equal(atPvt.elevation, model.profilePoints[2]!.elevation.value);
  assert.ok(Math.abs(atLow.gradePercent) < 1e-9);
  assert.throws(() => evaluateHeliosEuclidVerticalCurve({ curve, pvc: pvc!, pvi: pvi!, pvt: pvt!, chainage: 14299.99 }), /cannot extrapolate/);
});

test("Stage 4D blocks a PVT elevation that breaks tangent closure", () => {
  const model = titusPro1GoldenModel();
  model.profilePoints[2]!.elevation.value += 0.25;
  const solution = solveHeliosEuclidVerticalProfiles(model);
  assert.equal(solution.status, "blocked");
  assert.ok(solution.profileSolutions.flatMap((row) => row.checks).some((row) => row.code === "outgoing_tangent_closure" && row.status === "block"));
});

test("Stage 4D blocks a printed K value that conflicts with length and grade change", () => {
  const model = titusPro1GoldenModel();
  model.verticalCurves[0]!.kValue!.value += 1;
  const solution = solveHeliosEuclidVerticalProfiles(model);
  assert.equal(solution.status, "blocked");
  assert.ok(solution.profileSolutions.flatMap((row) => row.checks).some((row) => row.code === "vertical_curve_k_value" && row.status === "block"));
});

test("Stage 4D blocks curve controls when no complete curve record exists", () => {
  const model = titusPro1GoldenModel();
  model.verticalCurves = [];
  const solution = solveHeliosEuclidVerticalProfiles(model);
  assert.equal(solution.status, "blocked");
  assert.ok(solution.profileSolutions.flatMap((row) => row.checks).some((row) => row.code === "curve_controls_unmodeled" && row.status === "block"));
});

test("Stage 4D solution fingerprints and profile chunks are deterministic", () => {
  const first = solveHeliosEuclidVerticalProfiles(titusPro1GoldenModel());
  const second = solveHeliosEuclidVerticalProfiles(titusPro1GoldenModel());
  assert.equal(heliosEuclidVerticalSolutionFingerprint(first), heliosEuclidVerticalSolutionFingerprint(second));
  const chunks = buildHeliosEuclidVerticalSolutionChunks(first, 2);
  assert.equal(chunks.reduce((sum, row) => sum + row.checkCount, 0), first.checkCount);
  assert.ok(chunks.every((row) => row.payloadFingerprint.startsWith("helios-parity-v1:")));
  assert.deepEqual(new Set(chunks.map((row) => row.profileId)), new Set(["profile-existing-ground", "profile-finished-grade"]));
});
