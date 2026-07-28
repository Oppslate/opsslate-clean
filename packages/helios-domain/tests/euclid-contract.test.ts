import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveHeliosEuclidExportQualification,
  HELIOS_EUCLID_SCHEMA_VERSION,
  validateHeliosEuclidContract,
  type HeliosEuclidModel,
  type HeliosEuclidStation,
  type HeliosEuclidValue,
} from "../src/euclid-contract.ts";

const station = (value: number): HeliosEuclidStation => ({
  chainage: value,
  displayedStation: value,
  printedStation: `${Math.floor(value / 100)}+${String(value % 100).padStart(2, "0")}`,
  chainageOrigin: "printed",
  inputValueIds: [],
  provenanceIds: ["prov-1"],
  reviewState: "accepted",
});

const value = <T>(id: string, normalized: T, printedValue: string): HeliosEuclidValue<T> => ({
  id,
  value: normalized,
  origin: "printed",
  printedValue,
  inputValueIds: [],
  provenanceIds: ["prov-1"],
  reviewState: "accepted",
});

function titusModel(): HeliosEuclidModel {
  return {
    id: "euclid-titus-r1",
    companyId: "company-1",
    projectId: "titus",
    packageId: "package-1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "source-fingerprint-1",
    status: "accepted",
    spatialReferences: [{
      id: "crs-1",
      name: "Published project grid",
      referenceState: "known",
      coordinateBasis: "grid",
      axisOrder: "northing_easting",
      horizontalUnit: "us_survey_foot",
      verticalUnit: "us_survey_foot",
      horizontalDatum: "Printed horizontal datum",
      projectedCoordinateSystem: "Printed State Plane zone",
      verticalDatum: "Printed vertical datum",
      provenanceIds: ["prov-1"],
      reviewState: "accepted",
    }],
    provenance: [{
      id: "prov-1",
      engineeringSourceId: "source-1",
      documentId: "document-blt-2",
      pageId: "page-blt-2",
      physicalPageNumber: 1,
      sheetNumber: "BLT-2",
      viewKey: "front-ave-control",
      locator: "Horizontal control table",
      textSpanIds: ["span-1"],
      authority: "coordinate_control",
      confidence: 98,
    }],
    alignments: [{
      id: "alignment-front-ave",
      printedName: "FRONT AVE",
      normalizedName: "Front Avenue",
      alignmentType: "roadway_centerline",
      spatialReferenceId: "crs-1",
      startStation: station(14000),
      endStation: station(14709.05),
      increasingDirection: "east",
      sourceSheetNumbers: ["BLT-1", "BLT-2"],
      reviewState: "accepted",
      completeness: "complete",
    }, {
      id: "alignment-titus-run",
      printedName: "TITUS RUN",
      normalizedName: "Titus Run",
      alignmentType: "stream_channel",
      spatialReferenceId: "crs-1",
      startStation: station(5000),
      endStation: station(5400),
      increasingDirection: "downstream",
      sourceSheetNumbers: ["BLT-2"],
      reviewState: "accepted",
      completeness: "complete_with_limitations",
    }],
    controlPoints: [{
      id: "front-start",
      alignmentId: "alignment-front-ave",
      pointType: "pob",
      name: "Front Avenue start",
      station: station(14000),
      northing: value("northing-start", 783767.8232, "783767.8232"),
      easting: value("easting-start", 1180350.421, "1180350.421"),
      reviewState: "accepted",
    }, {
      id: "front-end",
      alignmentId: "alignment-front-ave",
      pointType: "pot",
      name: "Front Avenue end",
      station: station(14709.05),
      northing: value("northing-end", 783900, "783900.00"),
      easting: value("easting-end", 1181050, "1181050.00"),
      reviewState: "accepted",
    }],
    horizontalElements: [{
      id: "front-line-1",
      alignmentId: "alignment-front-ave",
      sequence: 1,
      elementType: "line",
      startStation: station(14000),
      endStation: station(14709.05),
      startPointId: "front-start",
      endPointId: "front-end",
      length: value("line-length", 709.05, "709.05 FT"),
      bearing: value("line-bearing", "N 78° E", "N 78° E"),
      reviewState: "accepted",
    }],
    stationEquations: [],
    profiles: [{
      id: "profile-front-grade",
      alignmentId: "alignment-front-ave",
      printedName: "FINAL GRADE",
      normalizedName: "Front Avenue proposed finished grade",
      role: "proposed_finished_grade",
      startStation: station(14200),
      endStation: station(14700),
      verticalDatum: "Printed vertical datum",
      sourceSheetNumbers: ["PRO-1"],
      reviewState: "accepted",
      completeness: "complete",
    }],
    profilePoints: [{
      id: "front-pvc",
      profileId: "profile-front-grade",
      pointType: "pvc",
      station: station(14300),
      elevation: value("front-pvc-elevation", 1373, "1373.00"),
      reviewState: "accepted",
    }, {
      id: "front-pvi",
      profileId: "profile-front-grade",
      pointType: "pvi",
      station: station(14332.5),
      elevation: value("front-pvi-elevation", 1372.5, "1372.50"),
      reviewState: "accepted",
    }, {
      id: "front-pvt",
      profileId: "profile-front-grade",
      pointType: "pvt",
      station: station(14365),
      elevation: value("front-pvt-elevation", 1372.4, "1372.40"),
      reviewState: "accepted",
    }],
    verticalTangents: [],
    verticalCurves: [{
      id: "front-vc-1",
      profileId: "profile-front-grade",
      sequence: 1,
      curveType: "sag",
      symmetry: "symmetric",
      pvcPointId: "front-pvc",
      pviPointId: "front-pvi",
      pvtPointId: "front-pvt",
      incomingGradePercent: value("front-g1", -2.71, "-2.71%"),
      outgoingGradePercent: value("front-g2", -1.03, "-1.03%"),
      length: value("front-vc-length", 65, "65.00 FT"),
      solverVersion: "euclid-parabolic-v1",
      reviewState: "accepted",
    }],
    typicalSections: [],
    crossSectionPoints: [],
    structures: [{
      id: "titus-box-culvert",
      structureType: "box_culvert",
      printedName: "Proposed precast concrete box culvert",
      primaryAlignmentId: "alignment-front-ave",
      station: station(14448),
      skewDegrees: value("culvert-skew", 0, "0 deg"),
      provenanceIds: ["prov-1"],
      reviewState: "accepted",
    }],
    inverts: [],
    materialLayers: [],
    relationships: [{
      id: "front-crosses-titus",
      relationshipType: "alignment_crossing",
      sourceEntityId: "alignment-front-ave",
      targetEntityId: "alignment-titus-run",
      sourceStation: station(14448),
      targetStation: station(5200),
      provenanceIds: ["prov-1"],
      reviewState: "accepted",
    }],
    issues: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

test("freezes separate roadway and stream alignment identities under one Euclid model", () => {
  const model = titusModel();
  const result = validateHeliosEuclidContract(model);
  assert.equal(result.valid, true);
  assert.deepEqual(model.alignments.map((alignment) => alignment.normalizedName), ["Front Avenue", "Titus Run"]);
  assert.equal(model.profiles[0]?.alignmentId, "alignment-front-ave");
});

test("rejects a profile that is not attached to a known horizontal alignment", () => {
  const model = titusModel();
  model.profiles[0]!.alignmentId = "missing-alignment";
  const result = validateHeliosEuclidContract(model);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "missing_parent_alignment"));
});

test("requires accepted vertical curves to identify their deterministic solver", () => {
  const model = titusModel();
  model.verticalCurves[0]!.solverVersion = undefined;
  const result = validateHeliosEuclidContract(model);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "missing_solver_version"));
});

test("qualifies only accepted geometry with its accepted parent alignment", () => {
  const model = titusModel();
  const result = deriveHeliosEuclidExportQualification(model, {
    alignmentIds: ["alignment-front-ave"],
    profileIds: ["profile-front-grade"],
  });
  assert.equal(result.eligible, true);

  model.profiles[0]!.reviewState = "proposed";
  const proposed = deriveHeliosEuclidExportQualification(model, {
    alignmentIds: ["alignment-front-ave"],
    profileIds: ["profile-front-grade"],
  });
  assert.equal(proposed.eligible, false);
  assert.ok(proposed.reasons.includes("Only accepted profiles can be exported."));
});

test("requires explicit acknowledgment before a local-coordinate exchange", () => {
  const model = titusModel();
  model.spatialReferences[0] = {
    ...model.spatialReferences[0]!,
    name: "Local project grid",
    referenceState: "local_only",
    coordinateBasis: "local",
    horizontalDatum: undefined,
    projectedCoordinateSystem: undefined,
  };
  const blocked = deriveHeliosEuclidExportQualification(model, {
    alignmentIds: ["alignment-front-ave"],
  });
  assert.equal(blocked.eligible, false);
  assert.equal(blocked.coordinateMode, "local");
  assert.ok(blocked.reasons.includes("Local-coordinate export requires explicit acknowledgment."));

  const acknowledged = deriveHeliosEuclidExportQualification(model, {
    alignmentIds: ["alignment-front-ave"],
    allowAcknowledgedLocalCoordinates: true,
  });
  assert.equal(acknowledged.eligible, true);
});

test("rejects unexplained engineering values and stations", () => {
  const model = titusModel();
  model.controlPoints[0]!.northing.provenanceIds = [];
  model.profiles[0]!.startStation.provenanceIds = [];
  const result = validateHeliosEuclidContract(model);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "missing_provenance"));
  assert.ok(result.issues.some((issue) => issue.code === "missing_station_provenance"));
});

test("rejects computed values without deterministic inputs", () => {
  const model = titusModel();
  model.horizontalElements[0]!.length = {
    ...model.horizontalElements[0]!.length,
    origin: "computed",
    printedValue: undefined,
    formula: "end chainage - start chainage",
    inputValueIds: [],
  };
  const result = validateHeliosEuclidContract(model);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "incomplete_computation"));
});
