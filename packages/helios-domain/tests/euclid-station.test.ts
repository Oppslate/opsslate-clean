import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_SCHEMA_VERSION,
  evaluateHeliosEuclidAlignmentPosition,
  evaluateHeliosEuclidStationOffsetPosition,
  type HeliosEuclidModel,
  type HeliosEuclidStation,
  type HeliosEuclidValue,
} from "../src/index.ts";

const provenanceId = "prov-station-engine";

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

function value<T>(id: string, normalized: T): HeliosEuclidValue<T> {
  return {
    id,
    value: normalized,
    origin: "printed",
    printedValue: String(normalized),
    inputValueIds: [],
    provenanceIds: [provenanceId],
    reviewState: "accepted",
  };
}

function model(): HeliosEuclidModel {
  const curveLength = 100 * Math.PI / 2;
  return {
    id: "euclid:4l-fixture",
    companyId: "company-1",
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "single-ingestion-source-v1",
    status: "accepted",
    spatialReferences: [{
      id: "crs-1", name: "Fixture grid", referenceState: "known", coordinateBasis: "grid",
      axisOrder: "northing_easting", horizontalUnit: "us_survey_foot", verticalUnit: "us_survey_foot",
      horizontalDatum: "Fixture datum", projectedCoordinateSystem: "Fixture grid",
      provenanceIds: [provenanceId], reviewState: "accepted",
    }],
    provenance: [{
      id: provenanceId, engineeringSourceId: "source-1", pageId: "page-1", physicalPageNumber: 1,
      sheetNumber: "G-1", locator: "accepted control fixture", textSpanIds: [], authority: "coordinate_control", confidence: 100,
    }],
    alignments: [{
      id: "road", printedName: "ROAD T.G.L.", normalizedName: "Road centerline", alignmentType: "roadway_centerline",
      spatialReferenceId: "crs-1", startStation: station(1000), endStation: station(1250 + curveLength),
      increasingDirection: "north then east", sourceSheetNumbers: ["G-1"], reviewState: "accepted", completeness: "complete",
    }, {
      id: "culvert", printedName: "CULVERT CL", normalizedName: "Culvert centerline", alignmentType: "structure_baseline",
      spatialReferenceId: "crs-1", startStation: station(0), endStation: station(100),
      increasingDirection: "east", sourceSheetNumbers: ["G-1"], reviewState: "accepted", completeness: "complete",
    }],
    controlPoints: [
      { id: "road-pob", alignmentId: "road", pointType: "pob", name: "POB", station: station(1000), northing: value("road-pob-n", 1000), easting: value("road-pob-e", 1000), reviewState: "accepted" },
      { id: "road-pc", alignmentId: "road", pointType: "pc", name: "PC", station: station(1100), northing: value("road-pc-n", 1100), easting: value("road-pc-e", 1000), reviewState: "accepted" },
      { id: "road-pt", alignmentId: "road", pointType: "pt", name: "PT", station: station(1100 + curveLength), northing: value("road-pt-n", 1200), easting: value("road-pt-e", 1100), reviewState: "accepted" },
      { id: "road-pot", alignmentId: "road", pointType: "pot", name: "POT", station: station(1250 + curveLength), northing: value("road-pot-n", 1200), easting: value("road-pot-e", 1250), reviewState: "accepted" },
      { id: "culvert-pob", alignmentId: "culvert", pointType: "pob", name: "Culvert POB", station: station(0), northing: value("culvert-pob-n", 2000), easting: value("culvert-pob-e", 2000), reviewState: "accepted" },
      { id: "culvert-pot", alignmentId: "culvert", pointType: "pot", name: "Culvert POT", station: station(100), northing: value("culvert-pot-n", 2000), easting: value("culvert-pot-e", 2100), reviewState: "accepted" },
    ],
    horizontalElements: [
      { id: "road-line-1", alignmentId: "road", sequence: 1, elementType: "line", startStation: station(1000), endStation: station(1100), startPointId: "road-pob", endPointId: "road-pc", length: value("road-line-length", 100), bearing: value("road-line-bearing", "N 00 00 00 E"), reviewState: "accepted" },
      { id: "road-curve", alignmentId: "road", sequence: 2, elementType: "circular_curve", startStation: station(1100), endStation: station(1100 + curveLength), startPointId: "road-pc", endPointId: "road-pt", length: value("road-curve-length", curveLength), rotation: "right", radius: value("road-radius", 100), deltaDegrees: value("road-delta", 90), reviewState: "accepted" },
      { id: "road-line-2", alignmentId: "road", sequence: 3, elementType: "line", startStation: station(1100 + curveLength), endStation: station(1250 + curveLength), startPointId: "road-pt", endPointId: "road-pot", length: value("road-line-2-length", 150), bearing: value("road-line-2-bearing", "N 90 00 00 E"), reviewState: "accepted" },
      { id: "culvert-line", alignmentId: "culvert", sequence: 1, elementType: "line", startStation: station(0), endStation: station(100), startPointId: "culvert-pob", endPointId: "culvert-pot", length: value("culvert-line-length", 100), bearing: value("culvert-bearing", "N 90 00 00 E"), reviewState: "accepted" },
    ],
    stationEquations: [],
    profiles: [{ id: "road-fg", alignmentId: "road", printedName: "T.G.L.", normalizedName: "Roadway proposed centerline grade", role: "proposed_finished_grade", startStation: station(1000), endStation: station(1250 + curveLength), verticalDatum: "Fixture datum", sourceSheetNumbers: ["PRO-1"], reviewState: "accepted", completeness: "complete" }, { id: "culvert-invert", alignmentId: "culvert", printedName: "CULVERT INVERT", normalizedName: "Culvert invert", role: "culvert_invert", startStation: station(0), endStation: station(100), verticalDatum: "Fixture datum", sourceSheetNumbers: ["C-1"], reviewState: "accepted", completeness: "complete" }],
    profilePoints: [
      { id: "fg-start", profileId: "road-fg", pointType: "profile_start", station: station(1000), elevation: value("fg-start-elev", 100), reviewState: "accepted" },
      { id: "fg-end", profileId: "road-fg", pointType: "profile_end", station: station(1250 + curveLength), elevation: value("fg-end-elev", 100 + (250 + curveLength) * 0.02), reviewState: "accepted" },
      { id: "invert-start", profileId: "culvert-invert", pointType: "profile_start", station: station(0), elevation: value("invert-start-elev", 80), reviewState: "accepted" },
      { id: "invert-end", profileId: "culvert-invert", pointType: "profile_end", station: station(100), elevation: value("invert-end-elev", 79), reviewState: "accepted" },
    ],
    verticalTangents: [
      { id: "fg-tangent", profileId: "road-fg", sequence: 1, startPointId: "fg-start", endPointId: "fg-end", gradePercent: value("fg-grade", 2), reviewState: "accepted" },
      { id: "invert-tangent", profileId: "culvert-invert", sequence: 1, startPointId: "invert-start", endPointId: "invert-end", gradePercent: value("invert-grade", -1), reviewState: "accepted" },
    ],
    verticalCurves: [], typicalSections: [], crossSectionPoints: [], structures: [], inverts: [], materialLayers: [], relationships: [], issues: [], createdAt: 1, updatedAt: 1,
  };
}

test("Stage 4L evaluates a tangent station with roadway T.G.L. elevation", () => {
  const result = evaluateHeliosEuclidAlignmentPosition(model(), { alignmentId: "road", displayedStation: 1050 });
  assert.equal(result.status, "verified");
  assert.equal(result.horizontal?.northing, 1050);
  assert.equal(result.horizontal?.easting, 1000);
  assert.equal(result.profiles[0]?.profileRole, "proposed_finished_grade");
  assert.equal(result.profiles[0]?.elevation, 101);
});

test("Stage 4L evaluates circular horizontal control without scaling the PDF", () => {
  const query = 1100 + Math.PI * 100 / 4;
  const result = evaluateHeliosEuclidAlignmentPosition(model(), { alignmentId: "road", chainage: query });
  assert.ok(Math.abs((result.horizontal?.northing || 0) - 1170.7106781187) < 1e-8);
  assert.ok(Math.abs((result.horizontal?.easting || 0) - 1029.2893218813) < 1e-8);
  assert.equal(result.horizontal?.elementType, "circular_curve");
});

test("Stage 4L evaluates a separate culvert alignment and invert profile", () => {
  const result = evaluateHeliosEuclidAlignmentPosition(model(), { alignmentId: "culvert", displayedStation: 50 });
  assert.equal(result.horizontal?.northing, 2000);
  assert.equal(result.horizontal?.easting, 2050);
  assert.equal(result.profiles[0]?.profileRole, "culvert_invert");
  assert.equal(result.profiles[0]?.elevation, 79.5);
});

test("Stage 4L output is deterministic and retains the single-ingestion source fingerprint", () => {
  const first = evaluateHeliosEuclidAlignmentPosition(model(), { alignmentId: "road", displayedStation: 1050 });
  const second = evaluateHeliosEuclidAlignmentPosition(model(), { alignmentId: "road", displayedStation: 1050 });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.sourceFingerprint, "single-ingestion-source-v1");
  assert.match(first.id, /^alignment-position:/);
});

test("Stage 4M applies the signed right-offset convention on north and east tangents", () => {
  const north = evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "road", displayedStation: 1050, offset: 10 });
  assert.equal(north.side, "right");
  assert.equal(north.horizontal?.northing, 1050);
  assert.equal(north.horizontal?.easting, 1010);
  const east = evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "culvert", displayedStation: 50, offset: 10 });
  assert.equal(east.horizontal?.northing, 1990);
  assert.equal(east.horizontal?.easting, 2050);
});

test("Stage 4M applies negative offsets to the left and follows circular tangent azimuth", () => {
  const left = evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "road", displayedStation: 1050, offset: -10 });
  assert.equal(left.side, "left");
  assert.equal(left.horizontal?.easting, 990);
  const curve = evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "road", chainage: 1100 + Math.PI * 100 / 4, offset: 10 });
  assert.ok(Math.abs((curve.horizontal?.northing || 0) - 1163.6396103068) < 1e-8);
  assert.ok(Math.abs((curve.horizontal?.easting || 0) - 1036.3603896932) < 1e-8);
});

test("Stage 4M governs centerline elevation but never invents a lateral elevation", () => {
  const centerline = evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "road", displayedStation: 1050, offset: 0 });
  assert.equal(centerline.elevation?.basis, "profile_at_centerline");
  assert.equal(centerline.elevation?.elevation, 101);
  assert.equal(centerline.status, "verified");
  const lateral = evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "road", displayedStation: 1050, offset: 12 });
  assert.equal(lateral.elevation, undefined);
  assert.match(lateral.limitations.join(" "), /no cross slope/i);
  assert.equal(lateral.status, "preliminary");
});

test("Stage 4M accepts explicit elevation bases without promoting them to governed geometry", () => {
  const delta = evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "road", displayedStation: 1050, offset: 12, verticalOffset: -0.25 });
  assert.equal(delta.elevation?.elevation, 100.75);
  assert.equal(delta.elevation?.basis, "profile_plus_vertical_offset");
  assert.equal(delta.status, "preliminary");
  const explicit = evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "road", displayedStation: 1050, offset: 12, pointElevation: 99.5 });
  assert.equal(explicit.elevation?.elevation, 99.5);
  assert.throws(() => evaluateHeliosEuclidStationOffsetPosition(model(), { alignmentId: "road", displayedStation: 1050, offset: 12, pointElevation: 99.5, verticalOffset: 1 }), /either/);
});

test("Stage 4M is deterministic and retains the immutable source fingerprint", () => {
  const request = { alignmentId: "road", displayedStation: 1050, offset: 12 };
  const first = evaluateHeliosEuclidStationOffsetPosition(model(), request);
  const second = evaluateHeliosEuclidStationOffsetPosition(model(), request);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.sourceFingerprint, "single-ingestion-source-v1");
  assert.match(first.id, /^station-offset:/);
});
