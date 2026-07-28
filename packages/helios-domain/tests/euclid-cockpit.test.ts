import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_INTEGRATION_SOLVER,
  HELIOS_EUCLID_SCHEMA_VERSION,
  buildHeliosEuclidCockpitWorkspace,
  type HeliosEuclidIntegrationSolution,
  type HeliosEuclidModel,
} from "../src/index.ts";

const provenance = {
  id: "prov-control",
  engineeringSourceId: "source-1",
  documentId: "document-1",
  pageId: "page-1",
  physicalPageNumber: 2,
  sheetNumber: "BLT-2",
  locator: "Baseline control table",
  textSpanIds: [],
  authority: "coordinate_control" as const,
  confidence: 98,
};

const station = (chainage: number, printedStation: string) => ({
  chainage,
  displayedStation: chainage,
  printedStation,
  chainageOrigin: "printed" as const,
  inputValueIds: [],
  provenanceIds: [provenance.id],
  reviewState: "accepted" as const,
});

const engineeringValue = <T>(id: string, value: T) => ({
  id,
  value,
  origin: "printed" as const,
  printedValue: String(value),
  inputValueIds: [],
  provenanceIds: [provenance.id],
  reviewState: "accepted" as const,
});

function model(): HeliosEuclidModel {
  return {
    id: "euclid-model-1",
    companyId: "company-1",
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "source-fingerprint",
    status: "accepted",
    spatialReferences: [{ id: "crs-1", name: "NYSPCS", referenceState: "known", coordinateBasis: "grid", axisOrder: "northing_easting", horizontalUnit: "us_survey_foot", verticalUnit: "us_survey_foot", provenanceIds: [provenance.id], reviewState: "accepted" }],
    provenance: [provenance],
    alignments: [{ id: "front-ave", printedName: "Front Avenue", normalizedName: "Front Avenue", alignmentType: "roadway_centerline", spatialReferenceId: "crs-1", startStation: station(14000, "140+00"), endStation: station(14700, "147+00"), increasingDirection: "east", sourceSheetNumbers: ["BLT-2"], reviewState: "accepted", completeness: "complete" }],
    controlPoints: [{ id: "pob-1", alignmentId: "front-ave", pointType: "pob", name: "BLP-10", station: station(14000, "140+00"), northing: engineeringValue("n-1", 7810374.812), easting: engineeringValue("e-1", 1108309.144), reviewState: "accepted" }],
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
    updatedAt: 2,
  };
}

function solution(): HeliosEuclidIntegrationSolution {
  return {
    id: "solution-1",
    euclidModelId: "euclid-model-1",
    sourceFingerprint: "source-fingerprint",
    modelFingerprint: "model-fingerprint",
    horizontalSolutionFingerprint: "horizontal-fingerprint",
    verticalSolutionFingerprint: "vertical-fingerprint",
    solver: HELIOS_EUCLID_INTEGRATION_SOLVER,
    solverVersion: 1,
    status: "review",
    nodes: [],
    edges: [],
    readiness: [{ id: "readiness-front-length", alignmentId: "front-ave", capability: "horizontal_length", status: "review", method: "accepted horizontal element chain", inputEntityIds: ["front-ave", "pob-1"], provenanceIds: [provenance.id], reasons: ["The element chain is incomplete."] }],
    checks: [],
    readyCount: 0,
    reviewCount: 1,
    blockedCount: 0,
    unavailableCount: 7,
  };
}

test("Stage 4F stays honest when no canonical Euclid model exists", () => {
  const workspace = buildHeliosEuclidCockpitWorkspace({ project: { id: "project-1", name: "Titus Culvert" } });
  assert.equal(workspace.availability, "awaiting_model");
  assert.equal(workspace.alignments.length, 0);
  assert.equal(workspace.selectedAlignment, undefined);
});

test("Stage 4F exposes only the selected canonical alignment with traceable controls", () => {
  const workspace = buildHeliosEuclidCockpitWorkspace({
    project: { id: "project-1", name: "Titus Culvert" },
    model: model(),
    modelRecord: { packageRevision: 1, shadowMode: true, issueCount: 0, blockingIssueCount: 0, updatedAt: 2 },
    solution: solution(),
    solutionRecord: { id: "solution-record-1", status: "review", solver: HELIOS_EUCLID_INTEGRATION_SOLVER, solverVersion: 1, nodeCount: 0, edgeCount: 0, checkCount: 0, completedAt: 3 },
  });
  assert.equal(workspace.availability, "available");
  assert.equal(workspace.alignments[0]?.name, "Front Avenue");
  assert.equal(workspace.alignments[0]?.horizontalStatus, "review");
  assert.equal(workspace.selectedAlignment?.controlPoints[0]?.northing.value, 7810374.812);
  assert.equal(workspace.selectedAlignment?.evidence[0]?.documentId, "document-1");
  assert.equal(workspace.selectedAlignment?.evidence[0]?.physicalPageNumber, 2);
});
