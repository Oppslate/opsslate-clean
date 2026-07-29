import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_CANDIDATE_VERSION,
  HELIOS_EUCLID_REVIEW_VERSION,
  HELIOS_EUCLID_SCHEMA_VERSION,
  buildHeliosEuclidReviewCandidate,
  heliosEuclidReviewDecisionFingerprint,
  heliosEuclidReviewTargetFingerprint,
  normalizeHeliosEuclidCandidateBuildInput,
  type HeliosEuclidModel,
  type HeliosEuclidReviewDecision,
  type HeliosEuclidReviewInput,
} from "../src/index.ts";

const provenance = {
  id: "prov-1",
  engineeringSourceId: "source-1",
  documentId: "document-1",
  pageId: "page-1",
  physicalPageNumber: 1,
  locator: "Control table",
  textSpanIds: [],
  authority: "coordinate_control" as const,
  confidence: 99,
};

const station = (chainage: number, printedStation: string) => ({
  chainage,
  displayedStation: chainage,
  printedStation,
  chainageOrigin: "printed" as const,
  inputValueIds: [],
  provenanceIds: [provenance.id],
  reviewState: "proposed" as const,
});

const engineeringValue = (id: string, value: number) => ({
  id,
  value,
  origin: "printed" as const,
  printedValue: String(value),
  inputValueIds: [],
  provenanceIds: [provenance.id],
  reviewState: "proposed" as const,
});

function sourceModel(): HeliosEuclidModel {
  return {
    id: "source-model",
    companyId: "company-1",
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "parity:source",
    status: "proposed",
    spatialReferences: [{
      id: "crs-1",
      name: "NYSPCS",
      referenceState: "partially_known",
      coordinateBasis: "grid",
      axisOrder: "northing_easting",
      horizontalUnit: "us_survey_foot",
      verticalUnit: "us_survey_foot",
      provenanceIds: [provenance.id],
      reviewState: "accepted",
    }],
    provenance: [provenance],
    alignments: [{
      id: "alignment-1",
      printedName: "Front Avenue",
      normalizedName: "Front Avenue",
      alignmentType: "roadway_centerline",
      spatialReferenceId: "crs-1",
      startStation: station(0, "0+00"),
      endStation: station(100, "1+00"),
      increasingDirection: "east",
      sourceSheetNumbers: ["HC-1"],
      reviewState: "proposed",
      completeness: "complete",
    }],
    controlPoints: [{
      id: "point-1",
      alignmentId: "alignment-1",
      pointType: "pob",
      name: "P-1",
      station: station(0, "0+00"),
      northing: engineeringValue("northing-1", 100),
      easting: engineeringValue("easting-1", 200),
      reviewState: "proposed",
    }],
    horizontalElements: [],
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

function decision(
  model: HeliosEuclidModel,
  targetEntityType: "alignment" | "control_point",
  targetEntityId: string,
  action: "accept" | "correct",
): HeliosEuclidReviewDecision {
  const target = targetEntityType === "alignment"
    ? model.alignments[0]!
    : model.controlPoints[0]!;
  const input: HeliosEuclidReviewInput = {
    version: HELIOS_EUCLID_REVIEW_VERSION,
    requestId: `request-${targetEntityId}`,
    action,
    euclidModelId: "model-record-1",
    modelFingerprint: "parity:model",
    sourceFingerprint: model.sourceFingerprint,
    targetEntityType,
    targetEntityId,
    targetFingerprint: heliosEuclidReviewTargetFingerprint(target),
    reason: action === "correct" ? "Verified against the signed control sheet." : undefined,
    changes: action === "correct"
      ? [{ field: "northing.value", valueType: "number", numberValue: 101.25 }]
      : undefined,
  };
  return {
    ...input,
    id: `decision-${targetEntityId}`,
    decisionFingerprint: heliosEuclidReviewDecisionFingerprint(input),
    reviewerName: "Estimator",
    createdAt: targetEntityType === "alignment" ? 2 : 3,
  };
}

test("Stage 4H builds an immutable reviewed candidate without changing the source model", () => {
  const model = sourceModel();
  const candidate = buildHeliosEuclidReviewCandidate({
    model,
    euclidModelId: "model-record-1",
    modelFingerprint: "parity:model",
    decisions: [
      decision(model, "alignment", "alignment-1", "accept"),
      decision(model, "control_point", "point-1", "correct"),
    ],
    createdAt: 10,
  });
  assert.equal(candidate.status, "ready_for_validation");
  assert.equal(candidate.validationEligible, true);
  assert.equal(candidate.downstreamEligible, false);
  assert.equal(candidate.unreviewedCount, 0);
  assert.equal(candidate.model.controlPoints[0]?.northing.value, 101.25);
  assert.equal(candidate.model.controlPoints[0]?.northing.origin, "corrected");
  assert.equal(candidate.model.controlPoints[0]?.reviewState, "corrected");
  assert.equal(model.controlPoints[0]?.northing.value, 100);
  assert.notEqual(candidate.candidateFingerprint, "parity:model");
});

test("Stage 4H keeps incomplete review out of deterministic validation", () => {
  const model = sourceModel();
  const candidate = buildHeliosEuclidReviewCandidate({
    model,
    euclidModelId: "model-record-1",
    modelFingerprint: "parity:model",
    decisions: [decision(model, "alignment", "alignment-1", "accept")],
    createdAt: 10,
  });
  assert.equal(candidate.status, "incomplete_review");
  assert.equal(candidate.validationEligible, false);
  assert.equal(candidate.unreviewedCount, 1);
  assert.match(candidate.blockingReasons.join(" "), /still require estimator review/);
});

test("Stage 4H fails closed on stale decisions and normalizes build requests", () => {
  const model = sourceModel();
  const stale = decision(model, "alignment", "alignment-1", "accept");
  stale.targetFingerprint = "parity:stale";
  assert.throws(() => buildHeliosEuclidReviewCandidate({
    model,
    euclidModelId: "model-record-1",
    modelFingerprint: "parity:model",
    decisions: [stale],
    createdAt: 10,
  }), /stale/);

  assert.deepEqual(normalizeHeliosEuclidCandidateBuildInput({
    version: HELIOS_EUCLID_CANDIDATE_VERSION,
    requestId: "request-1",
    euclidModelId: "model-record-1",
    modelFingerprint: "parity:model",
    sourceFingerprint: "parity:source",
  }), {
    version: HELIOS_EUCLID_CANDIDATE_VERSION,
    requestId: "request-1",
    euclidModelId: "model-record-1",
    modelFingerprint: "parity:model",
    sourceFingerprint: "parity:source",
  });
});
