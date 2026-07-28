import type {
  HeliosEuclidAlignment,
  HeliosEuclidAuthority,
  HeliosEuclidHorizontalElement,
  HeliosEuclidInvert,
  HeliosEuclidIssue,
  HeliosEuclidMaterialLayer,
  HeliosEuclidModel,
  HeliosEuclidModelStatus,
  HeliosEuclidProfile,
  HeliosEuclidProfilePoint,
  HeliosEuclidReviewState,
  HeliosEuclidSpatialReference,
  HeliosEuclidStructure,
  HeliosEuclidTypicalSection,
  HeliosEuclidValue,
  HeliosEuclidVerticalCurve,
} from "./euclid-contract.ts";
import type {
  HeliosEuclidIntegrationCheck,
  HeliosEuclidIntegrationSolution,
  HeliosEuclidQuantityReadiness,
  HeliosEuclidReadinessStatus,
} from "./euclid-integration.ts";

export const HELIOS_EUCLID_COCKPIT_VERSION = 1;

type HeliosEuclidCompleteness = "incomplete" | "complete" | "complete_with_limitations";

export type HeliosEuclidCockpitAvailability =
  | "awaiting_model"
  | "awaiting_solution"
  | "available"
  | "failed";

export type HeliosEuclidCockpitProject = {
  id: string;
  name: string;
  projectNumber?: string;
  ownerClient?: string;
  bidDate?: string;
  location?: string;
};

export type HeliosEuclidCockpitEvidence = {
  id: string;
  documentId?: string;
  physicalPageNumber: number;
  sheetNumber?: string;
  viewKey?: string;
  locator: string;
  authority: HeliosEuclidAuthority;
  confidence: number;
};

export type HeliosEuclidCockpitValue<T> = {
  value: T;
  printedValue?: string;
  origin: "printed" | "computed" | "corrected";
  reviewState: HeliosEuclidReviewState;
  provenanceIds: string[];
};

export type HeliosEuclidCockpitAlignmentSummary = {
  id: string;
  name: string;
  type: HeliosEuclidAlignment["alignmentType"];
  startStation: string;
  endStation: string;
  sourceSheetNumbers: string[];
  reviewState: HeliosEuclidReviewState;
  completeness: HeliosEuclidCompleteness;
  horizontalStatus: HeliosEuclidReadinessStatus;
  profileStatus: HeliosEuclidReadinessStatus;
  corridorStatus: HeliosEuclidReadinessStatus;
  controlPointCount: number;
  horizontalElementCount: number;
  profileCount: number;
  issueCount: number;
};

export type HeliosEuclidCockpitControlPoint = {
  id: string;
  name: string;
  pointType: string;
  station: string;
  northing: HeliosEuclidCockpitValue<number>;
  easting: HeliosEuclidCockpitValue<number>;
  elevation?: HeliosEuclidCockpitValue<number>;
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidCockpitHorizontalElement = {
  id: string;
  sequence: number;
  elementType: HeliosEuclidHorizontalElement["elementType"];
  startStation: string;
  endStation: string;
  length: HeliosEuclidCockpitValue<number>;
  bearing?: HeliosEuclidCockpitValue<string>;
  radius?: HeliosEuclidCockpitValue<number>;
  deltaDegrees?: HeliosEuclidCockpitValue<number>;
  rotation?: "left" | "right";
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidCockpitProfile = {
  id: string;
  name: string;
  role: HeliosEuclidProfile["role"];
  startStation: string;
  endStation: string;
  verticalDatum?: string;
  sourceSheetNumbers: string[];
  reviewState: HeliosEuclidReviewState;
  completeness: HeliosEuclidCompleteness;
  points: Array<{
    id: string;
    pointType: HeliosEuclidProfilePoint["pointType"];
    station: string;
    elevation: HeliosEuclidCockpitValue<number>;
    reviewState: HeliosEuclidReviewState;
  }>;
  tangents: Array<{
    id: string;
    sequence: number;
    startPointId: string;
    endPointId: string;
    gradePercent: HeliosEuclidCockpitValue<number>;
    reviewState: HeliosEuclidReviewState;
  }>;
  curves: Array<{
    id: string;
    sequence: number;
    curveType: HeliosEuclidVerticalCurve["curveType"];
    symmetry: HeliosEuclidVerticalCurve["symmetry"];
    pvcPointId: string;
    pviPointId: string;
    pvtPointId: string;
    length: HeliosEuclidCockpitValue<number>;
    incomingGradePercent: HeliosEuclidCockpitValue<number>;
    outgoingGradePercent: HeliosEuclidCockpitValue<number>;
    kValue?: HeliosEuclidCockpitValue<number>;
    reviewState: HeliosEuclidReviewState;
  }>;
};

export type HeliosEuclidCockpitAlignmentDetail = {
  summary: HeliosEuclidCockpitAlignmentSummary;
  spatialReference?: HeliosEuclidSpatialReference;
  controlPoints: HeliosEuclidCockpitControlPoint[];
  horizontalElements: HeliosEuclidCockpitHorizontalElement[];
  stationEquations: HeliosEuclidModel["stationEquations"];
  profiles: HeliosEuclidCockpitProfile[];
  typicalSections: HeliosEuclidTypicalSection[];
  crossSectionStationCount: number;
  crossSectionPointCount: number;
  structures: HeliosEuclidStructure[];
  inverts: HeliosEuclidInvert[];
  materialLayers: HeliosEuclidMaterialLayer[];
  readiness: HeliosEuclidQuantityReadiness[];
  checks: HeliosEuclidIntegrationCheck[];
  issues: HeliosEuclidIssue[];
  evidence: HeliosEuclidCockpitEvidence[];
};

export type HeliosEuclidCockpitWorkspace = {
  version: typeof HELIOS_EUCLID_COCKPIT_VERSION;
  project: HeliosEuclidCockpitProject;
  availability: HeliosEuclidCockpitAvailability;
  message: string;
  model?: {
    id: string;
    packageRevision: number;
    status: HeliosEuclidModelStatus;
    shadowMode: true;
    sourceFingerprint: string;
    spatialReferenceCount: number;
    issueCount: number;
    blockingIssueCount: number;
    updatedAt: number;
  };
  solution?: {
    id: string;
    status: HeliosEuclidIntegrationSolution["status"] | "failed";
    solver: string;
    solverVersion: number;
    readyCount: number;
    reviewCount: number;
    blockedCount: number;
    unavailableCount: number;
    nodeCount: number;
    edgeCount: number;
    checkCount: number;
    completedAt?: number;
    lastError?: string;
  };
  alignments: HeliosEuclidCockpitAlignmentSummary[];
  selectedAlignment?: HeliosEuclidCockpitAlignmentDetail;
};

export type HeliosEuclidCockpitSource = {
  project: HeliosEuclidCockpitProject;
  model?: HeliosEuclidModel;
  modelRecord?: {
    packageRevision: number;
    shadowMode: true;
    issueCount: number;
    blockingIssueCount: number;
    updatedAt: number;
  };
  solution?: HeliosEuclidIntegrationSolution;
  solutionRecord?: {
    id: string;
    status: HeliosEuclidIntegrationSolution["status"] | "failed";
    solver: string;
    solverVersion: number;
    nodeCount: number;
    edgeCount: number;
    checkCount: number;
    completedAt?: number;
    lastError?: string;
  };
  selectedAlignmentId?: string;
};

const value = <T>(input: HeliosEuclidValue<T>): HeliosEuclidCockpitValue<T> => ({
  value: input.value,
  printedValue: input.printedValue,
  origin: input.origin,
  reviewState: input.reviewState,
  provenanceIds: [...input.provenanceIds],
});

function readinessFor(
  solution: HeliosEuclidIntegrationSolution | undefined,
  alignmentId: string,
  capability: HeliosEuclidQuantityReadiness["capability"],
) {
  return solution?.readiness.find(
    (row) => row.alignmentId === alignmentId && row.capability === capability,
  )?.status || "not_available";
}

function issueEntityIds(model: HeliosEuclidModel, alignmentId: string) {
  const profileIds = model.profiles.filter((row) => row.alignmentId === alignmentId).map((row) => row.id);
  return new Set([
    alignmentId,
    ...model.controlPoints.filter((row) => row.alignmentId === alignmentId).map((row) => row.id),
    ...model.horizontalElements.filter((row) => row.alignmentId === alignmentId).map((row) => row.id),
    ...model.stationEquations.filter((row) => row.alignmentId === alignmentId).map((row) => row.id),
    ...profileIds,
    ...model.profilePoints.filter((row) => profileIds.includes(row.profileId)).map((row) => row.id),
    ...model.verticalTangents.filter((row) => profileIds.includes(row.profileId)).map((row) => row.id),
    ...model.verticalCurves.filter((row) => profileIds.includes(row.profileId)).map((row) => row.id),
    ...model.typicalSections.filter((row) => row.alignmentId === alignmentId).map((row) => row.id),
    ...model.crossSectionPoints.filter((row) => row.alignmentId === alignmentId).map((row) => row.id),
    ...model.structures.filter((row) => row.primaryAlignmentId === alignmentId).map((row) => row.id),
    ...model.inverts.filter((row) => row.alignmentId === alignmentId).map((row) => row.id),
    ...model.materialLayers.filter((row) => row.alignmentId === alignmentId).map((row) => row.id),
  ]);
}

function summary(
  model: HeliosEuclidModel,
  solution: HeliosEuclidIntegrationSolution | undefined,
  alignment: HeliosEuclidAlignment,
): HeliosEuclidCockpitAlignmentSummary {
  const entities = issueEntityIds(model, alignment.id);
  return {
    id: alignment.id,
    name: alignment.printedName,
    type: alignment.alignmentType,
    startStation: alignment.startStation.printedStation,
    endStation: alignment.endStation.printedStation,
    sourceSheetNumbers: [...alignment.sourceSheetNumbers],
    reviewState: alignment.reviewState,
    completeness: alignment.completeness,
    horizontalStatus: readinessFor(solution, alignment.id, "horizontal_length"),
    profileStatus: readinessFor(solution, alignment.id, "profile_elevation"),
    corridorStatus: readinessFor(solution, alignment.id, "corridor_3d"),
    controlPointCount: model.controlPoints.filter((row) => row.alignmentId === alignment.id).length,
    horizontalElementCount: model.horizontalElements.filter((row) => row.alignmentId === alignment.id).length,
    profileCount: model.profiles.filter((row) => row.alignmentId === alignment.id).length,
    issueCount: model.issues.filter((row) => row.entityIds.some((id) => entities.has(id))).length,
  };
}

export function buildHeliosEuclidCockpitWorkspace(
  input: HeliosEuclidCockpitSource,
): HeliosEuclidCockpitWorkspace {
  if (!input.model || !input.modelRecord) {
    return {
      version: HELIOS_EUCLID_COCKPIT_VERSION,
      project: input.project,
      availability: "awaiting_model",
      message: "Civil Geometry has not produced a canonical Euclid model for this project yet.",
      alignments: [],
    };
  }

  const alignmentRows = [...input.model.alignments]
    .sort((left, right) => left.printedName.localeCompare(right.printedName))
    .map((row) => summary(input.model!, input.solution, row));
  const selectedSummary = alignmentRows.find((row) => row.id === input.selectedAlignmentId) || alignmentRows[0];
  const solutionRecord = input.solutionRecord;
  const base: HeliosEuclidCockpitWorkspace = {
    version: HELIOS_EUCLID_COCKPIT_VERSION,
    project: input.project,
    availability: solutionRecord?.status === "failed"
      ? "failed"
      : input.solution && solutionRecord
        ? "available"
        : "awaiting_solution",
    message: solutionRecord?.status === "failed"
      ? solutionRecord.lastError || "The Euclid engineering relationship graph needs attention."
      : input.solution && solutionRecord
        ? "Read-only engineering controls are available for estimator review."
        : "The canonical Euclid model is available while horizontal, vertical, and relationship validation finishes.",
    model: {
      id: input.model.id,
      packageRevision: input.modelRecord.packageRevision,
      status: input.model.status,
      shadowMode: true,
      sourceFingerprint: input.model.sourceFingerprint,
      spatialReferenceCount: input.model.spatialReferences.length,
      issueCount: input.modelRecord.issueCount,
      blockingIssueCount: input.modelRecord.blockingIssueCount,
      updatedAt: input.modelRecord.updatedAt,
    },
    solution: solutionRecord ? {
      ...solutionRecord,
      readyCount: input.solution?.readyCount || 0,
      reviewCount: input.solution?.reviewCount || 0,
      blockedCount: input.solution?.blockedCount || (solutionRecord.status === "failed" ? 1 : 0),
      unavailableCount: input.solution?.unavailableCount || 0,
    } : undefined,
    alignments: alignmentRows,
  };
  if (!selectedSummary) return base;

  const alignmentId = selectedSummary.id;
  const profileRows = input.model.profiles.filter((row) => row.alignmentId === alignmentId);
  const profileIds = new Set(profileRows.map((row) => row.id));
  const entities = issueEntityIds(input.model, alignmentId);
  const evidenceIds = new Set<string>();
  const collect = (ids: string[]) => ids.forEach((id) => evidenceIds.add(id));
  const controlPoints = input.model.controlPoints.filter((row) => row.alignmentId === alignmentId)
    .sort((left, right) => left.station.chainage - right.station.chainage)
    .map((row) => {
      collect([...row.station.provenanceIds, ...row.northing.provenanceIds, ...row.easting.provenanceIds, ...(row.elevation?.provenanceIds || [])]);
      return { id: row.id, name: row.name, pointType: row.pointType, station: row.station.printedStation, northing: value(row.northing), easting: value(row.easting), elevation: row.elevation ? value(row.elevation) : undefined, reviewState: row.reviewState };
    });
  const horizontalElements = input.model.horizontalElements.filter((row) => row.alignmentId === alignmentId)
    .sort((left, right) => left.sequence - right.sequence)
    .map((row): HeliosEuclidCockpitHorizontalElement => {
      collect([...row.startStation.provenanceIds, ...row.endStation.provenanceIds, ...row.length.provenanceIds]);
      return {
        id: row.id,
        sequence: row.sequence,
        elementType: row.elementType,
        startStation: row.startStation.printedStation,
        endStation: row.endStation.printedStation,
        length: value(row.length),
        bearing: row.elementType === "line" ? value(row.bearing) : undefined,
        radius: row.elementType === "circular_curve" ? value(row.radius) : undefined,
        deltaDegrees: row.elementType === "circular_curve" ? value(row.deltaDegrees) : undefined,
        rotation: row.elementType !== "line" ? row.rotation : undefined,
        reviewState: row.reviewState,
      };
    });
  const profiles = profileRows.sort((left, right) => left.printedName.localeCompare(right.printedName)).map((profile): HeliosEuclidCockpitProfile => {
    collect([...profile.startStation.provenanceIds, ...profile.endStation.provenanceIds]);
    const points = input.model!.profilePoints.filter((row) => row.profileId === profile.id).sort((left, right) => left.station.chainage - right.station.chainage).map((row) => {
      collect([...row.station.provenanceIds, ...row.elevation.provenanceIds]);
      return { id: row.id, pointType: row.pointType, station: row.station.printedStation, elevation: value(row.elevation), reviewState: row.reviewState };
    });
    const tangents = input.model!.verticalTangents.filter((row) => row.profileId === profile.id).sort((left, right) => left.sequence - right.sequence).map((row) => {
      collect(row.gradePercent.provenanceIds);
      return { id: row.id, sequence: row.sequence, startPointId: row.startPointId, endPointId: row.endPointId, gradePercent: value(row.gradePercent), reviewState: row.reviewState };
    });
    const curves = input.model!.verticalCurves.filter((row) => row.profileId === profile.id).sort((left, right) => left.sequence - right.sequence).map((row) => {
      collect([...row.length.provenanceIds, ...row.incomingGradePercent.provenanceIds, ...row.outgoingGradePercent.provenanceIds, ...(row.kValue?.provenanceIds || [])]);
      return { id: row.id, sequence: row.sequence, curveType: row.curveType, symmetry: row.symmetry, pvcPointId: row.pvcPointId, pviPointId: row.pviPointId, pvtPointId: row.pvtPointId, length: value(row.length), incomingGradePercent: value(row.incomingGradePercent), outgoingGradePercent: value(row.outgoingGradePercent), kValue: row.kValue ? value(row.kValue) : undefined, reviewState: row.reviewState };
    });
    return { id: profile.id, name: profile.printedName, role: profile.role, startStation: profile.startStation.printedStation, endStation: profile.endStation.printedStation, verticalDatum: profile.verticalDatum, sourceSheetNumbers: [...profile.sourceSheetNumbers], reviewState: profile.reviewState, completeness: profile.completeness, points, tangents, curves };
  });
  const typicalSections = input.model.typicalSections.filter((row) => row.alignmentId === alignmentId);
  typicalSections.forEach((row) => collect([...row.stationStart.provenanceIds, ...row.stationEnd.provenanceIds]));
  const crossSections = input.model.crossSectionPoints.filter((row) => row.alignmentId === alignmentId);
  crossSections.forEach((row) => collect([...row.station.provenanceIds, ...row.offset.provenanceIds, ...row.elevation.provenanceIds]));
  const structures = input.model.structures.filter((row) => row.primaryAlignmentId === alignmentId);
  structures.forEach((row) => collect(row.provenanceIds));
  const inverts = input.model.inverts.filter((row) => row.alignmentId === alignmentId);
  inverts.forEach((row) => collect([...row.station.provenanceIds, ...row.invertElevation.provenanceIds]));
  const materialLayers = input.model.materialLayers.filter((row) => row.alignmentId === alignmentId);
  materialLayers.forEach((row) => collect([...row.stationStart.provenanceIds, ...row.stationEnd.provenanceIds, ...row.thickness.provenanceIds]));
  const readiness = input.solution?.readiness.filter((row) => row.alignmentId === alignmentId) || [];
  readiness.forEach((row) => collect(row.provenanceIds));
  const checks = input.solution?.checks.filter((row) => row.alignmentId === alignmentId || row.entityIds.some((id) => entities.has(id))) || [];
  checks.forEach((row) => collect(row.provenanceIds));
  const issues = input.model.issues.filter((row) => row.entityIds.some((id) => entities.has(id)));
  issues.forEach((row) => collect(row.provenanceIds));

  base.selectedAlignment = {
    summary: selectedSummary,
    spatialReference: input.model.spatialReferences.find((row) => row.id === input.model!.alignments.find((alignment) => alignment.id === alignmentId)?.spatialReferenceId),
    controlPoints,
    horizontalElements,
    stationEquations: input.model.stationEquations.filter((row) => row.alignmentId === alignmentId),
    profiles,
    typicalSections,
    crossSectionStationCount: new Set(crossSections.map((row) => row.station.chainage)).size,
    crossSectionPointCount: crossSections.length,
    structures,
    inverts,
    materialLayers,
    readiness,
    checks,
    issues,
    evidence: input.model.provenance.filter((row) => evidenceIds.has(row.id)).map((row) => ({ id: row.id, documentId: row.documentId, physicalPageNumber: row.physicalPageNumber, sheetNumber: row.sheetNumber, viewKey: row.viewKey, locator: row.locator, authority: row.authority, confidence: row.confidence })).sort((left, right) => left.physicalPageNumber - right.physicalPageNumber || left.id.localeCompare(right.id)),
  };
  return base;
}
