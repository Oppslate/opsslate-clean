import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_PROMOTION_VERSION,
  HELIOS_EUCLID_SCHEMA_VERSION,
  buildHeliosEuclidPromotion,
  euclidModelFingerprint,
  normalizeHeliosEuclidPromotionInput,
  type HeliosEuclidModel,
  type HeliosEuclidPromotionValidationBasis,
  type HeliosEuclidStation,
  type HeliosEuclidValue,
} from "../src/index.ts";

const provenanceId = "prov-4j";

function station(chainage: number): HeliosEuclidStation {
  return { chainage, displayedStation: chainage, printedStation: `${Math.floor(chainage / 100)}+${String(chainage % 100).padStart(2, "0")}`, chainageOrigin: "printed", inputValueIds: [], provenanceIds: [provenanceId], reviewState: "accepted" };
}

function value<T>(id: string, normalized: T): HeliosEuclidValue<T> {
  return { id, value: normalized, origin: "printed", printedValue: String(normalized), inputValueIds: [], provenanceIds: [provenanceId], reviewState: "accepted" };
}

function model(id: string, status: HeliosEuclidModel["status"]): HeliosEuclidModel {
  return {
    id,
    companyId: "company:1",
    projectId: "project:1",
    packageId: "package:1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "sha256:source",
    status,
    spatialReferences: [{ id: "crs-1", name: "Controlled grid", referenceState: "known", coordinateBasis: "grid", axisOrder: "northing_easting", horizontalUnit: "us_survey_foot", verticalUnit: "us_survey_foot", horizontalDatum: "Controlled datum", verticalDatum: "Controlled datum", projectedCoordinateSystem: "Controlled projection", provenanceIds: [provenanceId], reviewState: "accepted" }],
    provenance: [{ id: provenanceId, engineeringSourceId: "source-1", documentId: "document-1", pageId: "page-1", physicalPageNumber: 1, sheetNumber: "HC-1", locator: "Controlled Stage 4J fixture", textSpanIds: [], authority: "coordinate_control", confidence: 100 }],
    alignments: [{ id: "alignment-1", printedName: "Road", normalizedName: "Road", alignmentType: "roadway_centerline", spatialReferenceId: "crs-1", startStation: station(0), endStation: station(100), increasingDirection: "north", sourceSheetNumbers: ["HC-1"], reviewState: "accepted", completeness: "complete" }],
    controlPoints: [
      { id: "point-1", alignmentId: "alignment-1", pointType: "pob", name: "Start", station: station(0), northing: value("point-1-n", 0), easting: value("point-1-e", 0), reviewState: "accepted" },
      { id: "point-2", alignmentId: "alignment-1", pointType: "pot", name: "End", station: station(100), northing: value("point-2-n", 100), easting: value("point-2-e", 0), reviewState: "accepted" },
    ],
    horizontalElements: [{ id: "line-1", alignmentId: "alignment-1", sequence: 1, elementType: "line", startStation: station(0), endStation: station(100), startPointId: "point-1", endPointId: "point-2", length: value("line-length", 100), bearing: value("line-bearing", "N 00 00 00 E"), reviewState: "accepted" }],
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
    relationships: [],
    issues: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

test("Stage 4J creates a new immutable canonical model from a passing candidate", () => {
  const source = model("euclid-source", "proposed");
  const candidate = model("review-candidate", "partially_accepted");
  const promotion = buildHeliosEuclidPromotion({
    sourceModel: source,
    candidateModel: candidate,
    sourceEuclidModelId: "source-record-id",
    candidateId: "candidate-record-id",
    validationId: "validation-record-id",
    validation: {
      sourceEuclidModelId: "source-record-id",
      sourceModelFingerprint: euclidModelFingerprint(source),
      candidateId: "candidate-record-id",
      candidateFingerprint: euclidModelFingerprint(candidate),
      reviewSetFingerprint: "sha256:review",
      validationFingerprint: "sha256:validation",
      status: "passed",
      validationPassed: true,
      degradedCount: 0,
    },
    canonicalVersion: 2,
    createdAt: 2,
  });
  assert.equal(promotion.status, "promoted");
  assert.equal(promotion.canonicalVersion, 2);
  assert.equal(promotion.model.status, "accepted");
  assert.notEqual(promotion.model.id, candidate.id);
  assert.equal(promotion.downstreamEligible, false);
  assert.equal(source.status, "proposed");
  assert.equal(candidate.status, "partially_accepted");
});

test("Stage 4J blocks review, not-applicable, and degraded validation results", () => {
  const source = model("euclid-source", "proposed");
  const candidate = model("review-candidate", "partially_accepted");
  const basis: HeliosEuclidPromotionValidationBasis = {
    sourceEuclidModelId: "source-record-id",
    sourceModelFingerprint: euclidModelFingerprint(source),
    candidateId: "candidate-record-id",
    candidateFingerprint: euclidModelFingerprint(candidate),
    reviewSetFingerprint: "sha256:review",
    validationFingerprint: "sha256:validation",
    status: "passed",
    validationPassed: true,
    degradedCount: 0,
  };
  const build = (validation: HeliosEuclidPromotionValidationBasis) => buildHeliosEuclidPromotion({ sourceModel: source, candidateModel: candidate, sourceEuclidModelId: "source-record-id", candidateId: "candidate-record-id", validationId: "validation-record-id", validation, canonicalVersion: 2, createdAt: 2 });
  assert.throws(() => build({ ...basis, status: "review", validationPassed: false }), /Only a passing/);
  assert.throws(() => build({ ...basis, status: "not_applicable" }), /Only a passing/);
  assert.throws(() => build({ ...basis, degradedCount: 1 }), /degraded engineering/);
});

test("Stage 4J normalizes a complete stale-safe promotion request", () => {
  assert.deepEqual(normalizeHeliosEuclidPromotionInput({
    version: HELIOS_EUCLID_PROMOTION_VERSION,
    requestId: " request ",
    sourceEuclidModelId: " source ",
    sourceModelFingerprint: " source-fingerprint ",
    candidateId: " candidate ",
    candidateFingerprint: " candidate-fingerprint ",
    reviewSetFingerprint: " review-fingerprint ",
    validationId: " validation ",
    validationFingerprint: " validation-fingerprint ",
  }), {
    version: HELIOS_EUCLID_PROMOTION_VERSION,
    requestId: "request",
    sourceEuclidModelId: "source",
    sourceModelFingerprint: "source-fingerprint",
    candidateId: "candidate",
    candidateFingerprint: "candidate-fingerprint",
    reviewSetFingerprint: "review-fingerprint",
    validationId: "validation",
    validationFingerprint: "validation-fingerprint",
  });
});
