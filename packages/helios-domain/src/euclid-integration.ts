import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  validateHeliosEuclidContract,
  type HeliosEuclidModel,
  type HeliosEuclidReviewState,
} from "./euclid-contract.ts";

export const HELIOS_EUCLID_INTEGRATION_SOLVER = "euclid-engineering-graph-v1";
export const HELIOS_EUCLID_INTEGRATION_SOLVER_VERSION = 1;

export const HELIOS_EUCLID_QUANTITY_CAPABILITIES = [
  "horizontal_length",
  "profile_elevation",
  "corridor_3d",
  "earthwork_volume",
  "material_area",
  "material_volume",
  "structure_count",
  "drainage_3d_length",
] as const;

export type HeliosEuclidQuantityCapability = typeof HELIOS_EUCLID_QUANTITY_CAPABILITIES[number];
export type HeliosEuclidGateStatus = "passed" | "review" | "blocked" | "not_applicable" | "failed";
export type HeliosEuclidReadinessStatus = "ready" | "review" | "blocked" | "not_available";

export type HeliosEuclidControlGate = {
  euclidModelId: string;
  sourceFingerprint: string;
  solutionFingerprint: string;
  status: HeliosEuclidGateStatus;
  scopes: Array<{ id: string; status: Exclude<HeliosEuclidGateStatus, "failed"> }>;
};

export type HeliosEuclidEngineeringGraphNode = {
  id: string;
  entityId: string;
  entityType:
    | "alignment"
    | "control_point"
    | "horizontal_element"
    | "station_equation"
    | "profile"
    | "profile_point"
    | "vertical_tangent"
    | "vertical_curve"
    | "typical_section"
    | "cross_section_point"
    | "structure"
    | "invert"
    | "material_layer";
  alignmentId?: string;
  profileId?: string;
  reviewState: HeliosEuclidReviewState;
  provenanceIds: string[];
};

export type HeliosEuclidEngineeringGraphEdge = {
  id: string;
  edgeType:
    | "alignment_contains_profile"
    | "alignment_contains_control_point"
    | "alignment_contains_horizontal_element"
    | "alignment_contains_station_equation"
    | "horizontal_element_starts_at_control"
    | "horizontal_element_ends_at_control"
    | "profile_contains_point"
    | "profile_contains_tangent"
    | "profile_contains_curve"
    | "alignment_contains_typical_section"
    | "alignment_contains_cross_section_point"
    | "alignment_contains_structure"
    | "alignment_contains_invert"
    | "structure_contains_invert"
    | "alignment_contains_material_layer"
    | "explicit_alignment_crossing"
    | "explicit_relationship";
  sourceNodeId: string;
  targetNodeId: string;
  relationshipId?: string;
  origin: "canonical_parent" | "explicit_relationship";
  provenanceIds: string[];
};

export type HeliosEuclidIntegrationCheck = {
  id: string;
  code: string;
  status: "pass" | "review" | "block";
  message: string;
  entityIds: string[];
  alignmentId?: string;
  provenanceIds: string[];
};

export type HeliosEuclidQuantityReadiness = {
  id: string;
  alignmentId: string;
  capability: HeliosEuclidQuantityCapability;
  status: HeliosEuclidReadinessStatus;
  method: string;
  inputEntityIds: string[];
  provenanceIds: string[];
  reasons: string[];
};

export type HeliosEuclidIntegrationSolution = {
  id: string;
  euclidModelId: string;
  sourceFingerprint: string;
  modelFingerprint: string;
  horizontalSolutionFingerprint: string;
  verticalSolutionFingerprint: string;
  solver: typeof HELIOS_EUCLID_INTEGRATION_SOLVER;
  solverVersion: typeof HELIOS_EUCLID_INTEGRATION_SOLVER_VERSION;
  status: "passed" | "review" | "blocked" | "not_applicable";
  nodes: HeliosEuclidEngineeringGraphNode[];
  edges: HeliosEuclidEngineeringGraphEdge[];
  readiness: HeliosEuclidQuantityReadiness[];
  checks: HeliosEuclidIntegrationCheck[];
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  unavailableCount: number;
};

const accepted = (state: HeliosEuclidReviewState) => state === "accepted" || state === "corrected";
const unique = (values: Array<string | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();

function stationProvenance(row: { provenanceIds: string[] }) {
  return row.provenanceIds;
}

function engineeringCheck(input: Omit<HeliosEuclidIntegrationCheck, "id">): HeliosEuclidIntegrationCheck {
  return {
    ...input,
    entityIds: [...new Set(input.entityIds)].sort(),
    provenanceIds: [...new Set(input.provenanceIds)].sort(),
    id: `integration-check:${buildHeliosEngineeringParityFingerprint(input).split(":")[1]!.slice(0, 24)}`,
  };
}

function readiness(input: Omit<HeliosEuclidQuantityReadiness, "id">): HeliosEuclidQuantityReadiness {
  const normalized = {
    ...input,
    inputEntityIds: [...new Set(input.inputEntityIds)].sort(),
    provenanceIds: [...new Set(input.provenanceIds)].sort(),
    reasons: [...new Set(input.reasons)],
  };
  return {
    ...normalized,
    id: `readiness:${input.alignmentId}:${input.capability}`,
  };
}

function nodeProvenance(model: HeliosEuclidModel, entityId: string): string[] {
  const alignment = model.alignments.find((row) => row.id === entityId);
  if (alignment) return unique([...alignment.startStation.provenanceIds, ...alignment.endStation.provenanceIds]);
  const controlPoint = model.controlPoints.find((row) => row.id === entityId);
  if (controlPoint) return unique([...controlPoint.station.provenanceIds, ...controlPoint.northing.provenanceIds, ...controlPoint.easting.provenanceIds]);
  const horizontalElement = model.horizontalElements.find((row) => row.id === entityId);
  if (horizontalElement) return unique([...horizontalElement.startStation.provenanceIds, ...horizontalElement.endStation.provenanceIds, ...horizontalElement.length.provenanceIds]);
  const stationEquation = model.stationEquations.find((row) => row.id === entityId);
  if (stationEquation) return unique([...stationEquation.physicalChainage.provenanceIds, ...stationEquation.backStation.provenanceIds, ...stationEquation.aheadStation.provenanceIds]);
  const profile = model.profiles.find((row) => row.id === entityId);
  if (profile) return unique([...profile.startStation.provenanceIds, ...profile.endStation.provenanceIds]);
  const point = model.profilePoints.find((row) => row.id === entityId);
  if (point) return unique([...point.station.provenanceIds, ...point.elevation.provenanceIds]);
  const tangent = model.verticalTangents.find((row) => row.id === entityId);
  if (tangent) return unique(tangent.gradePercent.provenanceIds);
  const curve = model.verticalCurves.find((row) => row.id === entityId);
  if (curve) return unique([...curve.length.provenanceIds, ...curve.incomingGradePercent.provenanceIds, ...curve.outgoingGradePercent.provenanceIds]);
  const section = model.typicalSections.find((row) => row.id === entityId);
  if (section) return unique([...section.stationStart.provenanceIds, ...section.stationEnd.provenanceIds]);
  const cross = model.crossSectionPoints.find((row) => row.id === entityId);
  if (cross) return unique([...cross.station.provenanceIds, ...cross.offset.provenanceIds, ...cross.elevation.provenanceIds]);
  const structure = model.structures.find((row) => row.id === entityId);
  if (structure) return unique(structure.provenanceIds);
  const invert = model.inverts.find((row) => row.id === entityId);
  if (invert) return unique([...invert.station.provenanceIds, ...invert.invertElevation.provenanceIds]);
  const material = model.materialLayers.find((row) => row.id === entityId);
  if (material) return unique([...material.stationStart.provenanceIds, ...material.stationEnd.provenanceIds, ...material.thickness.provenanceIds]);
  return [];
}

function addNode(nodes: HeliosEuclidEngineeringGraphNode[], node: HeliosEuclidEngineeringGraphNode) {
  nodes.push({ ...node, provenanceIds: unique(node.provenanceIds) });
}

function addEdge(edges: HeliosEuclidEngineeringGraphEdge[], edge: Omit<HeliosEuclidEngineeringGraphEdge, "id">) {
  const key = `${edge.edgeType}:${edge.sourceNodeId}:${edge.targetNodeId}:${edge.relationshipId || "canonical"}`;
  edges.push({ ...edge, id: `edge:${key}`, provenanceIds: unique(edge.provenanceIds) });
}

function sourceGateReadiness(gate: HeliosEuclidGateStatus | undefined, label: string) {
  if (gate === "passed") return { status: "ready" as const, reasons: [] as string[] };
  if (gate === "review") return { status: "review" as const, reasons: [`${label} requires engineering review.`] };
  if (gate === "blocked" || gate === "failed") return { status: "blocked" as const, reasons: [`${label} is blocked.`] };
  return { status: "not_available" as const, reasons: [`${label} is not available.`] };
}

function validCrossSectionStations(model: HeliosEuclidModel, alignmentId: string) {
  const acceptedPoints = model.crossSectionPoints.filter((row) => row.alignmentId === alignmentId && accepted(row.reviewState));
  const stations = [...new Set(acceptedPoints.map((row) => row.station.chainage))].sort((a, b) => a - b);
  return stations.flatMap((chainage) => {
    const rows = acceptedPoints.filter((row) => row.station.chainage === chainage);
    const existing = new Set(rows.filter((row) => row.surface === "existing").map((row) => row.offset.value));
    const designRows = rows.filter((row) => row.surface === "subgrade").length
      ? rows.filter((row) => row.surface === "subgrade")
      : rows.filter((row) => row.surface === "proposed");
    const matching = designRows.filter((row) => existing.has(row.offset.value));
    return matching.length >= 2 ? [{ chainage, rows }] : [];
  });
}

function buildReadiness(
  model: HeliosEuclidModel,
  horizontal: HeliosEuclidControlGate,
  vertical: HeliosEuclidControlGate,
): HeliosEuclidQuantityReadiness[] {
  const horizontalScopes = new Map(horizontal.scopes.map((row) => [row.id, row.status]));
  const verticalScopes = new Map(vertical.scopes.map((row) => [row.id, row.status]));
  const result: HeliosEuclidQuantityReadiness[] = [];
  for (const alignment of [...model.alignments].sort((left, right) => left.id.localeCompare(right.id))) {
    const alignmentProvenance = nodeProvenance(model, alignment.id);
    const alignmentElements = model.horizontalElements.filter((row) => row.alignmentId === alignment.id);
    const alignmentPointIds = new Set(alignmentElements.flatMap((row) => [row.startPointId, row.endPointId]));
    const alignmentControls = model.controlPoints.filter((row) => alignmentPointIds.has(row.id));
    const rawHorizontalState = sourceGateReadiness(horizontalScopes.get(alignment.id), "Horizontal control");
    const horizontalAccepted = accepted(alignment.reviewState) && alignmentElements.length > 0 && alignmentElements.every((row) => accepted(row.reviewState)) && alignmentControls.every((row) => accepted(row.reviewState));
    const horizontalState = rawHorizontalState.status === "blocked"
      ? rawHorizontalState
      : !alignmentElements.length || alignment.completeness === "incomplete"
        ? { status: "not_available" as const, reasons: ["The alignment does not have a complete horizontal element chain."] }
        : !horizontalAccepted || alignment.completeness === "complete_with_limitations" || rawHorizontalState.status === "review"
          ? { status: "review" as const, reasons: ["Horizontal control or its canonical entities require acceptance or review."] }
          : rawHorizontalState;
    const horizontalInputs = [alignment.id, ...alignmentControls.map((row) => row.id), ...alignmentElements.map((row) => row.id)];
    result.push(readiness({ alignmentId: alignment.id, capability: "horizontal_length", status: horizontalState.status, method: "accepted horizontal element chain", inputEntityIds: horizontalInputs, provenanceIds: unique(horizontalInputs.flatMap((id) => nodeProvenance(model, id))), reasons: horizontalState.reasons }));

    const profiles = model.profiles.filter((row) => row.alignmentId === alignment.id && accepted(row.reviewState) && row.completeness !== "incomplete");
    const profileStates = profiles.map((row) => verticalScopes.get(row.id));
    const profileStatus = profileStates.some((row) => row === "blocked")
      ? "blocked"
      : profileStates.some((row) => row === "review")
        ? "review"
        : profileStates.some((row) => row === "passed")
          ? profiles.some((row) => row.completeness === "complete_with_limitations") ? "review" : "ready"
          : "not_available";
    const profileInputs = profiles.flatMap((row) => [row.id, ...model.profilePoints.filter((point) => point.profileId === row.id).map((point) => point.id), ...model.verticalTangents.filter((tangent) => tangent.profileId === row.id).map((tangent) => tangent.id), ...model.verticalCurves.filter((curve) => curve.profileId === row.id).map((curve) => curve.id)]);
    result.push(readiness({ alignmentId: alignment.id, capability: "profile_elevation", status: profileStatus, method: "accepted tangent and parabolic profile", inputEntityIds: profileInputs, provenanceIds: unique(profileInputs.flatMap((id) => nodeProvenance(model, id))), reasons: profileStatus === "ready" ? [] : [profiles.length ? "No accepted profile has passed vertical validation." : "No accepted profile is available."] }));

    const sections = model.typicalSections.filter((row) => row.alignmentId === alignment.id && accepted(row.reviewState) && ((row.laneWidthLeft && row.crossSlopeLeftPercent) || (row.laneWidthRight && row.crossSlopeRightPercent)));
    const crossSections = validCrossSectionStations(model, alignment.id);
    const corridorSectionAvailable = sections.length > 0 || crossSections.length > 0;
    const corridorProfiles = profiles.filter((row) => row.role === "proposed_finished_grade" || row.role === "proposed_subgrade");
    const corridorProfileStates = corridorProfiles.map((row) => verticalScopes.get(row.id));
    const corridorProfileStatus: HeliosEuclidReadinessStatus = corridorProfileStates.some((row) => row === "blocked") ? "blocked" : corridorProfileStates.some((row) => row === "review") ? "review" : corridorProfileStates.some((row) => row === "passed") ? "ready" : "not_available";
    const corridorStatus: HeliosEuclidReadinessStatus = horizontalState.status === "blocked" || corridorProfileStatus === "blocked"
      ? "blocked"
      : horizontalState.status === "ready" && corridorProfileStatus === "ready" && corridorSectionAvailable
        ? "ready"
        : horizontalState.status === "review" || corridorProfileStatus === "review"
          ? "review"
          : "not_available";
    const corridorInputs = [alignment.id, ...corridorProfiles.map((row) => row.id), ...sections.map((row) => row.id), ...crossSections.flatMap((row) => row.rows.map((point) => point.id))];
    result.push(readiness({ alignmentId: alignment.id, capability: "corridor_3d", status: corridorStatus, method: "horizontal alignment + proposed vertical profile + stationed section", inputEntityIds: corridorInputs, provenanceIds: unique(corridorInputs.flatMap((id) => nodeProvenance(model, id))), reasons: corridorStatus === "ready" ? [] : [!corridorProfiles.length ? "No accepted proposed grade or subgrade profile is available." : !corridorSectionAvailable ? "No accepted stationed section coverage is available." : "The corridor depends on unresolved horizontal or vertical control."] }));

    const earthworkStatus: HeliosEuclidReadinessStatus = horizontalState.status === "blocked"
      ? "blocked"
      : crossSections.length >= 2 && horizontalState.status === "ready"
        ? "ready"
        : horizontalState.status === "review" && crossSections.length >= 2
          ? "review"
          : "not_available";
    result.push(readiness({ alignmentId: alignment.id, capability: "earthwork_volume", status: earthworkStatus, method: "average end area from matching existing and design offsets", inputEntityIds: crossSections.flatMap((row) => row.rows.map((point) => point.id)), provenanceIds: unique(crossSections.flatMap((row) => row.rows.flatMap((point) => nodeProvenance(model, point.id)))), reasons: earthworkStatus === "ready" ? [] : [crossSections.length < 2 ? "At least two accepted cross sections with matching existing and design offsets are required." : "Horizontal control requires review."] }));

    const layers = model.materialLayers.filter((row) => row.alignmentId === alignment.id && accepted(row.reviewState));
    const completeLayers = layers.filter((row) => row.stationEnd.chainage > row.stationStart.chainage && row.offsetLeft && row.offsetRight && row.offsetRight.value !== row.offsetLeft.value && row.thickness.value > 0 && row.thicknessUnit !== "unknown");
    const materialStatus: HeliosEuclidReadinessStatus = horizontalState.status === "blocked"
      ? "blocked"
      : completeLayers.length && horizontalState.status === "ready"
        ? completeLayers.length === layers.length ? "ready" : "review"
        : completeLayers.length && horizontalState.status === "review"
          ? "review"
          : "not_available";
    const materialInputs = completeLayers.map((row) => row.id);
    const materialReasons = materialStatus === "ready" ? [] : [layers.length ? "One or more material layers lack accepted station, width, thickness, or unit controls." : "No accepted material layer is available."];
    result.push(readiness({ alignmentId: alignment.id, capability: "material_area", status: materialStatus, method: "station interval × accepted layer width", inputEntityIds: materialInputs, provenanceIds: unique(materialInputs.flatMap((id) => nodeProvenance(model, id))), reasons: materialReasons }));
    result.push(readiness({ alignmentId: alignment.id, capability: "material_volume", status: materialStatus, method: "station interval × accepted layer width × thickness", inputEntityIds: materialInputs, provenanceIds: unique(materialInputs.flatMap((id) => nodeProvenance(model, id))), reasons: materialReasons }));

    const structures = model.structures.filter((row) => row.primaryAlignmentId === alignment.id && accepted(row.reviewState));
    result.push(readiness({ alignmentId: alignment.id, capability: "structure_count", status: structures.length ? "ready" : "not_available", method: "unique accepted structure identity", inputEntityIds: structures.map((row) => row.id), provenanceIds: unique(structures.flatMap((row) => row.provenanceIds)), reasons: structures.length ? [] : ["No accepted structure is attached to this alignment."] }));

    const inverts = model.inverts.filter((row) => row.alignmentId === alignment.id && accepted(row.reviewState)).sort((left, right) => left.station.chainage - right.station.chainage);
    const positionedInverts = inverts.filter((row) => row.offset);
    const drainageStatus: HeliosEuclidReadinessStatus = horizontalState.status === "blocked"
      ? "blocked"
      : positionedInverts.length >= 2
        ? "review"
        : "not_available";
    result.push(readiness({ alignmentId: alignment.id, capability: "drainage_3d_length", status: drainageStatus, method: "station/offset/invert 3D path after connectivity confirmation", inputEntityIds: positionedInverts.map((row) => row.id), provenanceIds: unique(positionedInverts.flatMap((row) => nodeProvenance(model, row.id))), reasons: positionedInverts.length >= 2 ? ["Invert controls are available, but pipe connectivity must be explicitly confirmed before length calculation."] : ["At least two accepted station, offset, and invert controls with explicit connectivity are required."] }));
  }
  return result;
}

function relationshipExpectedTypes(type: HeliosEuclidModel["relationships"][number]["relationshipType"]) {
  if (type === "alignment_crossing") return ["alignment", "alignment"] as const;
  if (type === "profile_for_alignment") return ["profile", "alignment"] as const;
  if (type === "structure_on_alignment") return ["structure", "alignment"] as const;
  if (type === "section_for_alignment") return ["section", "alignment"] as const;
  if (type === "invert_for_alignment") return ["invert", "alignment"] as const;
  return ["material", "alignment"] as const;
}

export function solveHeliosEuclidEngineeringGraph(input: {
  model: HeliosEuclidModel;
  horizontal: HeliosEuclidControlGate;
  vertical: HeliosEuclidControlGate;
}): HeliosEuclidIntegrationSolution {
  const { model, horizontal, vertical } = input;
  const validation = validateHeliosEuclidContract(model);
  if (!validation.valid) throw new Error(`Euclid integration requires a contract-valid model: ${validation.issues.map((row) => row.code).join(", ")}`);
  for (const gate of [horizontal, vertical]) {
    if (gate.euclidModelId !== model.id || gate.sourceFingerprint !== model.sourceFingerprint) throw new Error("Euclid integration controls do not match the canonical model identity.");
  }
  const nodes: HeliosEuclidEngineeringGraphNode[] = [];
  const edges: HeliosEuclidEngineeringGraphEdge[] = [];
  const checks: HeliosEuclidIntegrationCheck[] = [];
  const nodeKinds = new Map<string, string>();
  const register = (entityId: string, entityType: HeliosEuclidEngineeringGraphNode["entityType"], reviewState: HeliosEuclidReviewState, alignmentId?: string, profileId?: string) => {
    addNode(nodes, { id: `node:${entityId}`, entityId, entityType, alignmentId, profileId, reviewState, provenanceIds: nodeProvenance(model, entityId) });
    nodeKinds.set(entityId, entityType === "typical_section" || entityType === "cross_section_point" ? "section" : entityType === "material_layer" ? "material" : entityType);
  };
  model.alignments.forEach((row) => register(row.id, "alignment", row.reviewState, row.id));
  model.controlPoints.forEach((row) => { register(row.id, "control_point", row.reviewState, row.alignmentId); addEdge(edges, { edgeType: "alignment_contains_control_point", sourceNodeId: `node:${row.alignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.horizontalElements.forEach((row) => {
    register(row.id, "horizontal_element", row.reviewState, row.alignmentId);
    addEdge(edges, { edgeType: "alignment_contains_horizontal_element", sourceNodeId: `node:${row.alignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) });
    addEdge(edges, { edgeType: "horizontal_element_starts_at_control", sourceNodeId: `node:${row.id}`, targetNodeId: `node:${row.startPointId}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.startPointId) });
    addEdge(edges, { edgeType: "horizontal_element_ends_at_control", sourceNodeId: `node:${row.id}`, targetNodeId: `node:${row.endPointId}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.endPointId) });
  });
  model.stationEquations.forEach((row) => { register(row.id, "station_equation", row.reviewState, row.alignmentId); addEdge(edges, { edgeType: "alignment_contains_station_equation", sourceNodeId: `node:${row.alignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.profiles.forEach((row) => { register(row.id, "profile", row.reviewState, row.alignmentId, row.id); addEdge(edges, { edgeType: "alignment_contains_profile", sourceNodeId: `node:${row.alignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.profilePoints.forEach((row) => { const profile = model.profiles.find((candidate) => candidate.id === row.profileId)!; register(row.id, "profile_point", row.reviewState, profile.alignmentId, row.profileId); addEdge(edges, { edgeType: "profile_contains_point", sourceNodeId: `node:${row.profileId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.verticalTangents.forEach((row) => { const profile = model.profiles.find((candidate) => candidate.id === row.profileId)!; register(row.id, "vertical_tangent", row.reviewState, profile.alignmentId, row.profileId); addEdge(edges, { edgeType: "profile_contains_tangent", sourceNodeId: `node:${row.profileId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.verticalCurves.forEach((row) => { const profile = model.profiles.find((candidate) => candidate.id === row.profileId)!; register(row.id, "vertical_curve", row.reviewState, profile.alignmentId, row.profileId); addEdge(edges, { edgeType: "profile_contains_curve", sourceNodeId: `node:${row.profileId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.typicalSections.forEach((row) => { register(row.id, "typical_section", row.reviewState, row.alignmentId); addEdge(edges, { edgeType: "alignment_contains_typical_section", sourceNodeId: `node:${row.alignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.crossSectionPoints.forEach((row) => { register(row.id, "cross_section_point", row.reviewState, row.alignmentId); addEdge(edges, { edgeType: "alignment_contains_cross_section_point", sourceNodeId: `node:${row.alignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.structures.forEach((row) => { register(row.id, "structure", row.reviewState, row.primaryAlignmentId); if (row.primaryAlignmentId) addEdge(edges, { edgeType: "alignment_contains_structure", sourceNodeId: `node:${row.primaryAlignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: row.provenanceIds }); });
  model.inverts.forEach((row) => { register(row.id, "invert", row.reviewState, row.alignmentId); addEdge(edges, { edgeType: "alignment_contains_invert", sourceNodeId: `node:${row.alignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); addEdge(edges, { edgeType: "structure_contains_invert", sourceNodeId: `node:${row.structureId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });
  model.materialLayers.forEach((row) => { register(row.id, "material_layer", row.reviewState, row.alignmentId); addEdge(edges, { edgeType: "alignment_contains_material_layer", sourceNodeId: `node:${row.alignmentId}`, targetNodeId: `node:${row.id}`, origin: "canonical_parent", provenanceIds: nodeProvenance(model, row.id) }); });

  for (const relationship of model.relationships) {
    const [expectedSource, expectedTarget] = relationshipExpectedTypes(relationship.relationshipType);
    const valid = nodeKinds.get(relationship.sourceEntityId) === expectedSource && nodeKinds.get(relationship.targetEntityId) === expectedTarget;
    checks.push(engineeringCheck({ code: "relationship_semantics", status: valid ? "pass" : "block", message: valid ? `Relationship ${relationship.relationshipType} has valid entity roles.` : `Relationship ${relationship.relationshipType} conflicts with its source or target entity role.`, entityIds: [relationship.id, relationship.sourceEntityId, relationship.targetEntityId], provenanceIds: relationship.provenanceIds }));
    addEdge(edges, { edgeType: relationship.relationshipType === "alignment_crossing" ? "explicit_alignment_crossing" : "explicit_relationship", sourceNodeId: `node:${relationship.sourceEntityId}`, targetNodeId: `node:${relationship.targetEntityId}`, relationshipId: relationship.id, origin: "explicit_relationship", provenanceIds: relationship.provenanceIds });
  }

  const alignmentById = new Map(model.alignments.map((row) => [row.id, row]));
  const stationedEntities = [
    ...model.controlPoints.map((row) => ({ id: row.id, alignmentId: row.alignmentId, start: row.station.chainage, end: row.station.chainage, provenanceIds: row.station.provenanceIds })),
    ...model.horizontalElements.map((row) => ({ id: row.id, alignmentId: row.alignmentId, start: row.startStation.chainage, end: row.endStation.chainage, provenanceIds: unique([...row.startStation.provenanceIds, ...row.endStation.provenanceIds]) })),
    ...model.stationEquations.map((row) => ({ id: row.id, alignmentId: row.alignmentId, start: row.physicalChainage.value, end: row.physicalChainage.value, provenanceIds: row.physicalChainage.provenanceIds })),
    ...model.crossSectionPoints.map((row) => ({ id: row.id, alignmentId: row.alignmentId, start: row.station.chainage, end: row.station.chainage, provenanceIds: row.station.provenanceIds })),
    ...model.inverts.map((row) => ({ id: row.id, alignmentId: row.alignmentId, start: row.station.chainage, end: row.station.chainage, provenanceIds: row.station.provenanceIds })),
    ...model.materialLayers.map((row) => ({ id: row.id, alignmentId: row.alignmentId, start: row.stationStart.chainage, end: row.stationEnd.chainage, provenanceIds: unique([...row.stationStart.provenanceIds, ...row.stationEnd.provenanceIds]) })),
    ...model.typicalSections.map((row) => ({ id: row.id, alignmentId: row.alignmentId, start: row.stationStart.chainage, end: row.stationEnd.chainage, provenanceIds: unique([...row.stationStart.provenanceIds, ...row.stationEnd.provenanceIds]) })),
    ...model.structures.flatMap((row) => row.primaryAlignmentId && row.station ? [{ id: row.id, alignmentId: row.primaryAlignmentId, start: row.station.chainage, end: row.station.chainage, provenanceIds: row.station.provenanceIds }] : []),
  ];
  for (const entity of stationedEntities) {
    const alignment = alignmentById.get(entity.alignmentId)!;
    const within = entity.start >= alignment.startStation.chainage && entity.end <= alignment.endStation.chainage && entity.end >= entity.start;
    checks.push(engineeringCheck({ code: "alignment_station_extent", status: within ? "pass" : "block", message: within ? "Stationed entity lies within its parent alignment range." : "Stationed entity lies outside or reverses its parent alignment range.", entityIds: [entity.id, entity.alignmentId], alignmentId: entity.alignmentId, provenanceIds: entity.provenanceIds }));
  }
  for (const issue of model.issues.filter((row) => row.status === "open" && row.severity === "blocking")) checks.push(engineeringCheck({ code: "canonical_blocking_issue", status: "block", message: issue.message, entityIds: issue.entityIds, provenanceIds: issue.provenanceIds }));
  for (const gate of [{ name: "Horizontal", value: horizontal }, { name: "Vertical", value: vertical }]) if (gate.value.status === "failed") checks.push(engineeringCheck({ code: `${gate.name.toLowerCase()}_solver_failed`, status: "block", message: `${gate.name} solver failed for the canonical model.`, entityIds: [model.id], provenanceIds: [] }));

  const readinessRows = buildReadiness(model, horizontal, vertical);
  const readyCount = readinessRows.filter((row) => row.status === "ready").length;
  const reviewCount = readinessRows.filter((row) => row.status === "review").length;
  const blockedCount = readinessRows.filter((row) => row.status === "blocked").length;
  const unavailableCount = readinessRows.filter((row) => row.status === "not_available").length;
  const status = checks.some((row) => row.status === "block") || blockedCount
    ? "blocked" as const
    : checks.some((row) => row.status === "review") || reviewCount
      ? "review" as const
      : model.alignments.length ? "passed" as const : "not_applicable" as const;
  const modelFingerprint = buildHeliosEngineeringParityFingerprint({ modelId: model.id, sourceFingerprint: model.sourceFingerprint, alignments: model.alignments, profiles: model.profiles, typicalSections: model.typicalSections, crossSectionPoints: model.crossSectionPoints, structures: model.structures, inverts: model.inverts, materialLayers: model.materialLayers, relationships: model.relationships, issues: model.issues });
  const fingerprintBasis = { modelFingerprint, horizontal: horizontal.solutionFingerprint, vertical: vertical.solutionFingerprint, solver: HELIOS_EUCLID_INTEGRATION_SOLVER };
  return {
    id: `integration-solution:${buildHeliosEngineeringParityFingerprint(fingerprintBasis).split(":")[1]!.slice(0, 32)}`,
    euclidModelId: model.id,
    sourceFingerprint: model.sourceFingerprint,
    modelFingerprint,
    horizontalSolutionFingerprint: horizontal.solutionFingerprint,
    verticalSolutionFingerprint: vertical.solutionFingerprint,
    solver: HELIOS_EUCLID_INTEGRATION_SOLVER,
    solverVersion: HELIOS_EUCLID_INTEGRATION_SOLVER_VERSION,
    status,
    nodes: nodes.sort((left, right) => left.id.localeCompare(right.id)),
    edges: edges.sort((left, right) => left.id.localeCompare(right.id)),
    readiness: readinessRows.sort((left, right) => left.id.localeCompare(right.id)),
    checks: checks.sort((left, right) => left.id.localeCompare(right.id)),
    readyCount,
    reviewCount,
    blockedCount,
    unavailableCount,
  };
}

export function heliosEuclidIntegrationSolutionFingerprint(solution: HeliosEuclidIntegrationSolution) {
  return buildHeliosEngineeringParityFingerprint(solution);
}

export type HeliosEuclidIntegrationSolutionChunk = { chunkIndex: number; itemCount: number; payloadJson: string; payloadFingerprint: string };

export function buildHeliosEuclidIntegrationSolutionChunks(solution: HeliosEuclidIntegrationSolution, maximumItemsPerChunk = 100): HeliosEuclidIntegrationSolutionChunk[] {
  if (!Number.isSafeInteger(maximumItemsPerChunk) || maximumItemsPerChunk < 1 || maximumItemsPerChunk > 200) throw new Error("Integration chunk size must be between 1 and 200.");
  const items = [
    ...solution.nodes.map((payload) => ({ kind: "node" as const, payload })),
    ...solution.edges.map((payload) => ({ kind: "edge" as const, payload })),
    ...solution.readiness.map((payload) => ({ kind: "readiness" as const, payload })),
    ...solution.checks.map((payload) => ({ kind: "check" as const, payload })),
  ];
  const chunks: HeliosEuclidIntegrationSolutionChunk[] = [];
  for (let index = 0; index < Math.max(1, items.length); index += maximumItemsPerChunk) {
    const payload = items.slice(index, index + maximumItemsPerChunk);
    const payloadJson = JSON.stringify(payload);
    if (payloadJson.length > 700_000) throw new Error("Integration solution chunk exceeds the storage safety limit.");
    chunks.push({ chunkIndex: chunks.length, itemCount: payload.length, payloadJson, payloadFingerprint: buildHeliosEngineeringParityFingerprint(payload) });
  }
  return chunks;
}
