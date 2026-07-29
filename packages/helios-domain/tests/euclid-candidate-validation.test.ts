import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION,
  HELIOS_EUCLID_SCHEMA_VERSION,
  buildHeliosEuclidCandidateValidationChunks,
  euclidModelFingerprint,
  normalizeHeliosEuclidCandidateValidationInput,
  validateHeliosEuclidReviewCandidate,
  type HeliosEuclidModel,
  type HeliosEuclidStation,
  type HeliosEuclidValue,
} from "../src/index.ts";

const provenanceId = "prov-4i";

function station(chainage: number): HeliosEuclidStation {
  return {
    chainage,
    displayedStation: chainage,
    printedStation: `${Math.floor(chainage / 100)}+${String(chainage % 100).padStart(2, "0")}`,
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

function sourceModel(): HeliosEuclidModel {
  return {
    id: "euclid-source-4i",
    companyId: "company-1",
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "source-fingerprint-4i",
    status: "accepted",
    spatialReferences: [{ id: "crs-1", name: "Controlled grid", referenceState: "known", coordinateBasis: "grid", axisOrder: "northing_easting", horizontalUnit: "us_survey_foot", verticalUnit: "us_survey_foot", horizontalDatum: "Controlled datum", verticalDatum: "Controlled datum", projectedCoordinateSystem: "Controlled projection", provenanceIds: [provenanceId], reviewState: "accepted" }],
    provenance: [{ id: provenanceId, engineeringSourceId: "source-1", documentId: "document-1", pageId: "page-1", physicalPageNumber: 1, sheetNumber: "HC-1", locator: "Controlled Stage 4I fixture", textSpanIds: [], authority: "coordinate_control", confidence: 100 }],
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

function candidateFrom(source: HeliosEuclidModel) {
  const candidate = structuredClone(source);
  candidate.id = "review-candidate:4i";
  candidate.status = "partially_accepted";
  candidate.updatedAt = 2;
  return candidate;
}

test("Stage 4I reruns deterministic solvers without promoting an unchanged candidate", () => {
  const source = sourceModel();
  const candidate = candidateFrom(source);
  const result = validateHeliosEuclidReviewCandidate({
    sourceModel: source,
    candidateModel: candidate,
    candidateId: "candidate-record-1",
    candidateFingerprint: euclidModelFingerprint(candidate),
    reviewSetFingerprint: "review-set-1",
    createdAt: 10,
  });
  assert.equal(result.status, "passed");
  assert.equal(result.validationPassed, true);
  assert.equal(result.promotionEligible, false);
  assert.equal(result.downstreamEligible, false);
  assert.equal(result.changedCount, 0);
  assert.notEqual(result.sourceHorizontalFingerprint, result.candidateHorizontalFingerprint);
});

test("Stage 4I reports a corrected control that degrades horizontal closure", () => {
  const source = sourceModel();
  const candidate = candidateFrom(source);
  candidate.controlPoints[1]!.easting.value = 1;
  candidate.controlPoints[1]!.easting.origin = "corrected";
  candidate.controlPoints[1]!.easting.reviewState = "corrected";
  candidate.controlPoints[1]!.reviewState = "corrected";
  const result = validateHeliosEuclidReviewCandidate({
    sourceModel: source,
    candidateModel: candidate,
    candidateId: "candidate-record-2",
    candidateFingerprint: euclidModelFingerprint(candidate),
    reviewSetFingerprint: "review-set-2",
    createdAt: 11,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.validationPassed, false);
  assert.ok(result.degradedCount > 0);
  assert.ok(result.deltas.some((row) => row.domain === "horizontal" && row.afterStatus === "block"));
  assert.ok(result.blockingReasons.some((row) => /closure|bearing|blocked/i.test(row)));
  assert.equal(source.controlPoints[1]!.easting.value, 0);
});

test("Stage 4I rejects stale candidates and produces fingerprinted bounded chunks", () => {
  const source = sourceModel();
  const candidate = candidateFrom(source);
  assert.throws(() => validateHeliosEuclidReviewCandidate({
    sourceModel: source,
    candidateModel: candidate,
    candidateId: "candidate-record-3",
    candidateFingerprint: "stale-fingerprint",
    reviewSetFingerprint: "review-set-3",
    createdAt: 12,
  }), /fingerprint is stale/);

  const result = validateHeliosEuclidReviewCandidate({
    sourceModel: source,
    candidateModel: candidate,
    candidateId: "candidate-record-3",
    candidateFingerprint: euclidModelFingerprint(candidate),
    reviewSetFingerprint: "review-set-3",
    createdAt: 12,
  });
  const chunks = buildHeliosEuclidCandidateValidationChunks(result, 2);
  assert.ok(chunks.length > 0);
  assert.ok(chunks.every((row) => row.itemCount <= 2 && row.payloadFingerprint.startsWith("helios-parity-v1:")));
  assert.deepEqual(normalizeHeliosEuclidCandidateValidationInput({ version: HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION, requestId: "request-1", candidateId: "candidate-1", candidateFingerprint: "fingerprint-1", reviewSetFingerprint: "review-set-1" }), { version: HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION, requestId: "request-1", candidateId: "candidate-1", candidateFingerprint: "fingerprint-1", reviewSetFingerprint: "review-set-1" });
});
