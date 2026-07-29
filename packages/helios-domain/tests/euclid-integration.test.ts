import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_EUCLID_SCHEMA_VERSION,
  HELIOS_EUCLID_QUANTITY_PUBLICATION_VERSION,
  buildHeliosEuclidQuantityCandidates,
  buildHeliosEuclidIntegrationSolutionChunks,
  heliosEuclidIntegrationSolutionFingerprint,
  solveHeliosEuclidEngineeringGraph,
  solveHeliosEuclidHorizontalControl,
  solveHeliosEuclidVerticalProfiles,
  normalizeHeliosEuclidQuantityPublicationInput,
  type HeliosEuclidControlGate,
  type HeliosEuclidModel,
  type HeliosEuclidStation,
  type HeliosEuclidValue,
} from "../src/index.ts";

const provenanceId = "prov-4e";

function station(chainage: number): HeliosEuclidStation {
  return { chainage, displayedStation: chainage, printedStation: `${Math.floor(chainage / 100)}+${(chainage % 100).toFixed(2).padStart(5, "0")}`, chainageOrigin: "printed", inputValueIds: [], provenanceIds: [provenanceId], reviewState: "accepted" };
}

function value<T>(id: string, normalized: T): HeliosEuclidValue<T> {
  return { id, value: normalized, origin: "printed", printedValue: String(normalized), inputValueIds: [], provenanceIds: [provenanceId], reviewState: "accepted" };
}

function integratedModel(): HeliosEuclidModel {
  return {
    id: "euclid:4e-golden",
    companyId: "company-1",
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 1,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: 1,
    sourceFingerprint: "4e-golden-source-v1",
    status: "accepted",
    spatialReferences: [{ id: "crs-1", name: "Controlled grid", referenceState: "known", coordinateBasis: "grid", axisOrder: "northing_easting", horizontalUnit: "us_survey_foot", verticalUnit: "us_survey_foot", horizontalDatum: "Controlled datum", verticalDatum: "Controlled vertical datum", projectedCoordinateSystem: "Controlled projection", provenanceIds: [provenanceId], reviewState: "accepted" }],
    provenance: [{ id: provenanceId, engineeringSourceId: "source-1", documentId: "document-1", pageId: "page-1", physicalPageNumber: 1, sheetNumber: "4E-1", viewKey: "integrated-control", locator: "Controlled Stage 4E mathematical fixture", textSpanIds: [], authority: "coordinate_control", confidence: 100 }],
    alignments: [{ id: "alignment-road", printedName: "ROAD", normalizedName: "Road centerline", alignmentType: "roadway_centerline", spatialReferenceId: "crs-1", startStation: station(0), endStation: station(100), increasingDirection: "north", sourceSheetNumbers: ["4E-1"], reviewState: "accepted", completeness: "complete" }],
    controlPoints: [
      { id: "road-start", alignmentId: "alignment-road", pointType: "pob", name: "Start", station: station(0), northing: value("road-start-n", 0), easting: value("road-start-e", 0), reviewState: "accepted" },
      { id: "road-end", alignmentId: "alignment-road", pointType: "pot", name: "End", station: station(100), northing: value("road-end-n", 100), easting: value("road-end-e", 0), reviewState: "accepted" },
    ],
    horizontalElements: [{ id: "road-line", alignmentId: "alignment-road", sequence: 1, elementType: "line", startStation: station(0), endStation: station(100), startPointId: "road-start", endPointId: "road-end", length: value("road-line-length", 100), bearing: value("road-line-bearing", "N 00 00 00 E"), reviewState: "accepted" }],
    stationEquations: [],
    profiles: [{ id: "road-grade", alignmentId: "alignment-road", printedName: "GRADE", normalizedName: "Proposed finished grade", role: "proposed_finished_grade", startStation: station(0), endStation: station(100), verticalDatum: "Controlled vertical datum", sourceSheetNumbers: ["4E-1"], reviewState: "accepted", completeness: "complete" }],
    profilePoints: [
      { id: "grade-start", profileId: "road-grade", pointType: "profile_start", station: station(0), elevation: value("grade-start-e", 100), reviewState: "accepted" },
      { id: "grade-end", profileId: "road-grade", pointType: "profile_end", station: station(100), elevation: value("grade-end-e", 101), reviewState: "accepted" },
    ],
    verticalTangents: [{ id: "grade-tangent", profileId: "road-grade", sequence: 1, startPointId: "grade-start", endPointId: "grade-end", gradePercent: value("grade-percent", 1), reviewState: "accepted" }],
    verticalCurves: [],
    typicalSections: [],
    crossSectionPoints: [
      { id: "xs20-eg-l", alignmentId: "alignment-road", station: station(20), offset: value("xs20-eg-l-o", -10), elevation: value("xs20-eg-l-e", 102), surface: "existing", reviewState: "accepted" },
      { id: "xs20-eg-r", alignmentId: "alignment-road", station: station(20), offset: value("xs20-eg-r-o", 10), elevation: value("xs20-eg-r-e", 102), surface: "existing", reviewState: "accepted" },
      { id: "xs20-sg-l", alignmentId: "alignment-road", station: station(20), offset: value("xs20-sg-l-o", -10), elevation: value("xs20-sg-l-e", 100), surface: "subgrade", reviewState: "accepted" },
      { id: "xs20-sg-r", alignmentId: "alignment-road", station: station(20), offset: value("xs20-sg-r-o", 10), elevation: value("xs20-sg-r-e", 100), surface: "subgrade", reviewState: "accepted" },
      { id: "xs80-eg-l", alignmentId: "alignment-road", station: station(80), offset: value("xs80-eg-l-o", -10), elevation: value("xs80-eg-l-e", 103), surface: "existing", reviewState: "accepted" },
      { id: "xs80-eg-r", alignmentId: "alignment-road", station: station(80), offset: value("xs80-eg-r-o", 10), elevation: value("xs80-eg-r-e", 103), surface: "existing", reviewState: "accepted" },
      { id: "xs80-sg-l", alignmentId: "alignment-road", station: station(80), offset: value("xs80-sg-l-o", -10), elevation: value("xs80-sg-l-e", 101), surface: "subgrade", reviewState: "accepted" },
      { id: "xs80-sg-r", alignmentId: "alignment-road", station: station(80), offset: value("xs80-sg-r-o", 10), elevation: value("xs80-sg-r-e", 101), surface: "subgrade", reviewState: "accepted" },
    ],
    structures: [{ id: "structure-1", structureType: "drainage_structure", printedName: "Drainage structure 1", primaryAlignmentId: "alignment-road", station: station(25), offset: value("structure-1-offset", 0), provenanceIds: [provenanceId], reviewState: "accepted" }],
    inverts: [{ id: "invert-1", alignmentId: "alignment-road", structureId: "structure-1", station: station(25), offset: value("invert-1-offset", 0), invertElevation: value("invert-1-elevation", 95), pipeSize: value("invert-1-size", "24 IN"), pipeMaterial: value("invert-1-material", "RCP"), reviewState: "accepted" }],
    materialLayers: [{ id: "base-layer", alignmentId: "alignment-road", name: "Aggregate base", stationStart: station(0), stationEnd: station(100), offsetLeft: value("base-left", -10), offsetRight: value("base-right", 10), thickness: value("base-depth", 12), thicknessUnit: "inch", reviewState: "accepted" }],
    relationships: [],
    issues: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

function gates(model: HeliosEuclidModel) {
  const horizontal = solveHeliosEuclidHorizontalControl(model);
  const vertical = solveHeliosEuclidVerticalProfiles(model);
  const horizontalGate: HeliosEuclidControlGate = { euclidModelId: model.id, sourceFingerprint: model.sourceFingerprint, solutionFingerprint: `horizontal:${horizontal.id}`, status: horizontal.status, scopes: horizontal.alignmentSolutions.map((row) => ({ id: row.alignmentId, status: row.status })) };
  const verticalGate: HeliosEuclidControlGate = { euclidModelId: model.id, sourceFingerprint: model.sourceFingerprint, solutionFingerprint: `vertical:${vertical.id}`, status: vertical.status, scopes: vertical.profileSolutions.map((row) => ({ id: row.profileId, status: row.status })) };
  return { horizontal: horizontalGate, vertical: verticalGate };
}

test("Stage 4E joins canonical parent identities and reports method-specific readiness", () => {
  const model = integratedModel();
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  assert.equal(solution.status, "passed");
  assert.ok(solution.edges.some((row) => row.edgeType === "alignment_contains_profile" && row.targetNodeId === "node:road-grade"));
  assert.ok(solution.edges.some((row) => row.edgeType === "horizontal_element_starts_at_control" && row.targetNodeId === "node:road-start"));
  assert.ok(solution.edges.some((row) => row.edgeType === "structure_contains_invert" && row.targetNodeId === "node:invert-1"));
  for (const capability of ["horizontal_length", "profile_elevation", "corridor_3d", "earthwork_volume", "material_area", "material_volume", "structure_count"]) {
    assert.equal(solution.readiness.find((row) => row.capability === capability)?.status, "ready");
  }
  assert.equal(solution.readiness.find((row) => row.capability === "drainage_3d_length")?.status, "not_available");
});

test("Stage 4E blocks stationed geometry outside its parent alignment", () => {
  const model = integratedModel();
  model.materialLayers[0]!.stationEnd = station(120);
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  assert.equal(solution.status, "blocked");
  assert.ok(solution.checks.some((row) => row.code === "alignment_station_extent" && row.status === "block" && row.entityIds.includes("base-layer")));
});

test("Stage 4E validates explicit relationship semantics instead of trusting labels", () => {
  const model = integratedModel();
  model.relationships.push({ id: "bad-profile-link", relationshipType: "profile_for_alignment", sourceEntityId: "base-layer", targetEntityId: "alignment-road", provenanceIds: [provenanceId], reviewState: "accepted" });
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  assert.equal(solution.status, "blocked");
  assert.ok(solution.checks.some((row) => row.code === "relationship_semantics" && row.status === "block"));
});

test("Stage 4E refuses control solutions from another canonical model", () => {
  const model = integratedModel();
  const control = gates(model);
  control.horizontal.euclidModelId = "other-model";
  assert.throws(() => solveHeliosEuclidEngineeringGraph({ model, ...control }), /do not match the canonical model identity/);
});

test("Stage 4E keeps drainage length in review until connectivity is explicit", () => {
  const model = integratedModel();
  model.structures.push({ id: "structure-2", structureType: "drainage_structure", printedName: "Drainage structure 2", primaryAlignmentId: "alignment-road", station: station(75), offset: value("structure-2-offset", 0), provenanceIds: [provenanceId], reviewState: "accepted" });
  model.inverts.push({ id: "invert-2", alignmentId: "alignment-road", structureId: "structure-2", station: station(75), offset: value("invert-2-offset", 0), invertElevation: value("invert-2-elevation", 94), pipeSize: value("invert-2-size", "24 IN"), pipeMaterial: value("invert-2-material", "RCP"), reviewState: "accepted" });
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  const drainage = solution.readiness.find((row) => row.capability === "drainage_3d_length");
  assert.equal(solution.status, "review");
  assert.equal(drainage?.status, "review");
  assert.match(drainage?.reasons[0] || "", /connectivity/);
});

test("Stage 4E never promotes proposed horizontal control to quantity-ready", () => {
  const model = integratedModel();
  model.alignments[0]!.reviewState = "proposed";
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  assert.equal(solution.readiness.find((row) => row.capability === "horizontal_length")?.status, "review");
});

test("Stage 4E requires station, offset, and invert controls before drainage review", () => {
  const model = integratedModel();
  model.structures.push({ id: "structure-2", structureType: "drainage_structure", printedName: "Drainage structure 2", primaryAlignmentId: "alignment-road", station: station(75), provenanceIds: [provenanceId], reviewState: "accepted" });
  model.inverts.push({ id: "invert-2", alignmentId: "alignment-road", structureId: "structure-2", station: station(75), invertElevation: value("invert-2-elevation", 94), reviewState: "accepted" });
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  assert.equal(solution.readiness.find((row) => row.capability === "drainage_3d_length")?.status, "not_available");
});

test("Stage 4E fingerprints and bounded chunks are deterministic", () => {
  const model = integratedModel();
  const first = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  const second = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  assert.equal(heliosEuclidIntegrationSolutionFingerprint(first), heliosEuclidIntegrationSolutionFingerprint(second));
  const chunks = buildHeliosEuclidIntegrationSolutionChunks(first, 5);
  assert.equal(chunks.reduce((sum, row) => sum + row.itemCount, 0), first.nodes.length + first.edges.length + first.readiness.length + first.checks.length);
  assert.ok(chunks.every((row) => row.payloadFingerprint.startsWith("helios-parity-v1:")));
});

test("Stage 4K derives deterministic, evidence-backed quantities only from ready Euclid capabilities", () => {
  const model = integratedModel();
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  const first = buildHeliosEuclidQuantityCandidates({ model, solution });
  const second = buildHeliosEuclidQuantityCandidates({ model, solution });
  assert.deepEqual(first, second);

  const byType = new Map(first.map((row) => [row.calculationType, row]));
  assert.equal(byType.get("horizontal_length")?.value, 100);
  assert.equal(byType.get("horizontal_length")?.unit, "FT");
  assert.equal(byType.get("material_area")?.value, 2_000);
  assert.equal(byType.get("material_area")?.unit, "SF");
  assert.equal(byType.get("material_volume")?.value, 74.074074);
  assert.equal(byType.get("material_volume")?.unit, "CY");
  assert.equal(byType.get("earthwork_excavation_volume")?.value, 88.888889);
  assert.equal(byType.get("structure_count")?.value, 1);
  assert.ok(first.every((row) => row.fingerprint.startsWith("helios-parity-v1:") && row.confidence === 100));
  assert.ok(!first.some((row) => row.capability === "profile_elevation" || row.capability === "drainage_3d_length"));
});

test("Stage 4K separates excavation and embankment at cross-section sign changes", () => {
  const model = integratedModel();
  for (const row of model.crossSectionPoints.filter((candidate) => candidate.surface === "existing" && candidate.offset.value === 10)) {
    row.elevation.value = row.station.chainage === 20 ? 98 : 99;
  }
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  const candidates = buildHeliosEuclidQuantityCandidates({ model, solution });
  assert.equal(candidates.find((row) => row.calculationType === "earthwork_excavation_volume")?.value, 22.222222);
  assert.equal(candidates.find((row) => row.calculationType === "earthwork_embankment_volume")?.value, 22.222222);
});

test("Stage 4K refuses non-passing solutions and validates the publication boundary", () => {
  const model = integratedModel();
  const solution = solveHeliosEuclidEngineeringGraph({ model, ...gates(model) });
  solution.status = "review";
  assert.throws(
    () => buildHeliosEuclidQuantityCandidates({ model, solution }),
    /Only a passing solution/,
  );
  assert.deepEqual(normalizeHeliosEuclidQuantityPublicationInput({
    version: HELIOS_EUCLID_QUANTITY_PUBLICATION_VERSION,
    requestId: "request-1",
    euclidModelId: "model-1",
    modelFingerprint: "model-fingerprint",
    integrationSolutionId: "solution-1",
    integrationSolutionFingerprint: "solution-fingerprint",
    candidateId: "candidate-1",
    candidateFingerprint: "candidate-fingerprint",
    costCodeId: "cost-code-1",
    use: "comparative",
  }).use, "comparative");
  assert.throws(
    () => normalizeHeliosEuclidQuantityPublicationInput({ version: 1, use: "authoritative" }),
    /comparative or production/,
  );
});
