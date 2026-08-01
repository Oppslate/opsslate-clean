import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  type HeliosEuclidAlignment,
  type HeliosEuclidHorizontalElement,
  type HeliosEuclidModel,
  type HeliosEuclidProfile,
  type HeliosEuclidProfileRole,
  type HeliosEuclidReviewState,
  type HeliosEuclidStationEquation,
} from "./euclid-contract.ts";
import {
  HELIOS_EUCLID_HORIZONTAL_SOLVER,
  parseHeliosEuclidBearing,
  solveHeliosEuclidHorizontalControl,
} from "./euclid-horizontal.ts";
import {
  HELIOS_EUCLID_VERTICAL_SOLVER,
  evaluateHeliosEuclidVerticalCurve,
  solveHeliosEuclidVerticalProfiles,
} from "./euclid-vertical.ts";

export const HELIOS_EUCLID_ALIGNMENT_POSITION_VERSION = 1;
export const HELIOS_EUCLID_ALIGNMENT_POSITION_SOLVER = "euclid-alignment-position-v1";

export type HeliosEuclidAlignmentPositionStatus = "verified" | "preliminary" | "unavailable";

export type HeliosEuclidAlignmentPositionRequest = {
  alignmentId: string;
  displayedStation?: number;
  chainage?: number;
  stationEquationId?: string;
  profileId?: string;
  profileRole?: HeliosEuclidProfileRole;
};

export type HeliosEuclidHorizontalPosition = {
  northing: number;
  easting: number;
  azimuthDegrees: number;
  elementId: string;
  elementType: HeliosEuclidHorizontalElement["elementType"];
  method: typeof HELIOS_EUCLID_HORIZONTAL_SOLVER;
  formula: string;
  inputValueIds: string[];
  provenanceIds: string[];
};

export type HeliosEuclidProfilePosition = {
  profileId: string;
  profileName: string;
  profileRole: HeliosEuclidProfileRole;
  elevation: number;
  gradePercent?: number;
  controlType: "exact_profile_point" | "vertical_tangent" | "parabolic_vertical_curve";
  controlId: string;
  method: "printed-profile-point" | "euclid-vertical-tangent-v1" | typeof HELIOS_EUCLID_VERTICAL_SOLVER;
  formula: string;
  inputValueIds: string[];
  provenanceIds: string[];
};

export type HeliosEuclidAlignmentPosition = {
  id: string;
  version: typeof HELIOS_EUCLID_ALIGNMENT_POSITION_VERSION;
  solver: typeof HELIOS_EUCLID_ALIGNMENT_POSITION_SOLVER;
  euclidModelId: string;
  sourceFingerprint: string;
  alignmentId: string;
  alignmentName: string;
  alignmentType: HeliosEuclidAlignment["alignmentType"];
  spatialReferenceId: string;
  coordinateBasis: string;
  horizontalUnit: string;
  verticalUnit: string;
  chainage: number;
  displayedStation: number;
  printedStation: string;
  stationEquationId?: string;
  status: HeliosEuclidAlignmentPositionStatus;
  horizontal?: HeliosEuclidHorizontalPosition;
  profiles: HeliosEuclidProfilePosition[];
  limitations: string[];
  fingerprint: string;
};

const EPSILON = 1e-7;

function round(value: number, places = 10) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function normalizeAngle(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function formatStation(value: number) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const major = Math.floor(absolute / 100);
  const minor = (absolute - major * 100).toFixed(2).padStart(5, "0");
  return `${sign}${major}+${minor}`;
}

function accepted(state: HeliosEuclidReviewState) {
  return state === "accepted" || state === "corrected";
}

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

function coordinateAzimuth(
  start: { northing: number; easting: number },
  end: { northing: number; easting: number },
) {
  return normalizeAngle(Math.atan2(end.easting - start.easting, end.northing - start.northing) * 180 / Math.PI);
}

type StationBranch = {
  id?: string;
  startChainage: number;
  endChainage: number;
  offset: number;
};

function stationBranches(alignment: HeliosEuclidAlignment, equations: HeliosEuclidStationEquation[]): StationBranch[] {
  const ordered = [...equations].sort((left, right) => left.physicalChainage.value - right.physicalChainage.value);
  const branches: StationBranch[] = [];
  let startChainage = alignment.startStation.chainage;
  let offset = alignment.startStation.displayedStation - alignment.startStation.chainage;
  let id = alignment.startStation.stationEquationId;
  for (const equation of ordered) {
    branches.push({ id, startChainage, endChainage: equation.physicalChainage.value, offset });
    startChainage = equation.physicalChainage.value;
    offset = equation.aheadStation.value - equation.physicalChainage.value;
    id = equation.id;
  }
  branches.push({ id, startChainage, endChainage: alignment.endStation.chainage, offset });
  return branches;
}

function resolveStation(
  alignment: HeliosEuclidAlignment,
  equations: HeliosEuclidStationEquation[],
  request: HeliosEuclidAlignmentPositionRequest,
) {
  const hasChainage = Number.isFinite(request.chainage);
  const hasDisplayed = Number.isFinite(request.displayedStation);
  if (hasChainage === hasDisplayed) throw new Error("Provide exactly one of chainage or displayed station.");
  const branches = stationBranches(alignment, equations);
  if (hasChainage) {
    const chainage = request.chainage!;
    if (chainage < alignment.startStation.chainage - EPSILON || chainage > alignment.endStation.chainage + EPSILON) {
      throw new Error("Requested chainage is outside the alignment range.");
    }
    const candidates = branches.filter((branch, index) =>
      chainage >= branch.startChainage - EPSILON
      && (index === branches.length - 1 ? chainage <= branch.endChainage + EPSILON : chainage < branch.endChainage - EPSILON),
    );
    const branch = candidates[0] || branches.find((row) => Math.abs(row.endChainage - chainage) <= EPSILON) || branches.at(-1)!;
    const displayedStation = chainage + branch.offset;
    return { chainage: round(chainage), displayedStation: round(displayedStation), stationEquationId: branch.id };
  }
  const displayedStation = request.displayedStation!;
  const candidates = branches
    .filter((branch) => !request.stationEquationId || branch.id === request.stationEquationId)
    .map((branch) => ({ branch, chainage: displayedStation - branch.offset }))
    .filter(({ branch, chainage }) => chainage >= branch.startChainage - EPSILON && chainage <= branch.endChainage + EPSILON);
  const uniqueCandidates = candidates.filter((candidate, index) =>
    candidates.findIndex((row) => Math.abs(row.chainage - candidate.chainage) <= EPSILON) === index,
  );
  if (!uniqueCandidates.length) throw new Error("Displayed station is outside every valid alignment station branch.");
  if (uniqueCandidates.length > 1) throw new Error("Displayed station is ambiguous across station-equation branches; select the governing equation branch.");
  const candidate = uniqueCandidates[0]!;
  return {
    chainage: round(candidate.chainage),
    displayedStation: round(displayedStation),
    stationEquationId: candidate.branch.id,
  };
}

function controllingHorizontalElement(model: HeliosEuclidModel, alignmentId: string, chainage: number) {
  const elements = model.horizontalElements
    .filter((row) => row.alignmentId === alignmentId)
    .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
  return elements.find((element, index) =>
    chainage >= element.startStation.chainage - EPSILON
    && (index === elements.length - 1
      ? chainage <= element.endStation.chainage + EPSILON
      : chainage < element.endStation.chainage - EPSILON),
  ) || elements.find((element) => Math.abs(element.endStation.chainage - chainage) <= EPSILON);
}

function evaluateHorizontal(model: HeliosEuclidModel, element: HeliosEuclidHorizontalElement, chainage: number): HeliosEuclidHorizontalPosition {
  const pointById = new Map(model.controlPoints.map((row) => [row.id, row]));
  const start = pointById.get(element.startPointId);
  const end = pointById.get(element.endPointId);
  if (!start || !end) throw new Error("The controlling horizontal element is missing a canonical endpoint.");
  const provenanceIds = unique([
    ...start.northing.provenanceIds,
    ...start.easting.provenanceIds,
    ...end.northing.provenanceIds,
    ...end.easting.provenanceIds,
    ...element.length.provenanceIds,
  ]);
  const length = element.endStation.chainage - element.startStation.chainage;
  if (!(length > 0)) throw new Error("The controlling horizontal element has an invalid chainage range.");
  const distance = Math.max(0, Math.min(length, chainage - element.startStation.chainage));
  if (element.elementType === "spiral") throw new Error("Spiral interpolation is unavailable until an accepted clothoid solution exists.");
  if (element.elementType === "line") {
    const azimuth = parseHeliosEuclidBearing(element.bearing.value)
      ?? coordinateAzimuth({ northing: start.northing.value, easting: start.easting.value }, { northing: end.northing.value, easting: end.easting.value });
    const radians = azimuth * Math.PI / 180;
    return {
      northing: round(start.northing.value + distance * Math.cos(radians)),
      easting: round(start.easting.value + distance * Math.sin(radians)),
      azimuthDegrees: round(azimuth),
      elementId: element.id,
      elementType: element.elementType,
      method: HELIOS_EUCLID_HORIZONTAL_SOLVER,
      formula: "N=N0+s*cos(azimuth); E=E0+s*sin(azimuth)",
      inputValueIds: [start.northing.id, start.easting.id, element.bearing.id, element.length.id],
      provenanceIds: unique([...provenanceIds, ...element.bearing.provenanceIds]),
    };
  }
  const radius = element.radius.value;
  const signedDirection = element.rotation === "right" ? 1 : -1;
  const chordAzimuth = coordinateAzimuth(
    { northing: start.northing.value, easting: start.easting.value },
    { northing: end.northing.value, easting: end.easting.value },
  );
  const startAzimuth = normalizeAngle(chordAzimuth - signedDirection * element.deltaDegrees.value / 2);
  const theta = signedDirection * (distance / radius);
  const startRadians = startAzimuth * Math.PI / 180;
  const endRadians = startRadians + theta;
  return {
    northing: round(start.northing.value + radius / signedDirection * (Math.sin(endRadians) - Math.sin(startRadians))),
    easting: round(start.easting.value + radius / signedDirection * (Math.cos(startRadians) - Math.cos(endRadians))),
    azimuthDegrees: round(normalizeAngle(endRadians * 180 / Math.PI)),
    elementId: element.id,
    elementType: element.elementType,
    method: HELIOS_EUCLID_HORIZONTAL_SOLVER,
    formula: "arc angle=s/R; N=N0+(R/d)*(sin(A+s*d/R)-sin(A)); E=E0+(R/d)*(cos(A)-cos(A+s*d/R))",
    inputValueIds: [start.northing.id, start.easting.id, end.northing.id, end.easting.id, element.radius.id, element.deltaDegrees.id, element.length.id],
    provenanceIds: unique([...provenanceIds, ...element.radius.provenanceIds, ...element.deltaDegrees.provenanceIds]),
  };
}

function evaluateProfile(model: HeliosEuclidModel, profile: HeliosEuclidProfile, chainage: number): HeliosEuclidProfilePosition | undefined {
  if (chainage < profile.startStation.chainage - EPSILON || chainage > profile.endStation.chainage + EPSILON) return undefined;
  const points = model.profilePoints.filter((row) => row.profileId === profile.id);
  const pointById = new Map(points.map((row) => [row.id, row]));
  const exact = points.find((point) => Math.abs(point.station.chainage - chainage) <= EPSILON);
  if (exact) return {
    profileId: profile.id,
    profileName: profile.printedName,
    profileRole: profile.role,
    elevation: round(exact.elevation.value),
    controlType: "exact_profile_point",
    controlId: exact.id,
    method: "printed-profile-point",
    formula: "canonical profile control point elevation",
    inputValueIds: [exact.elevation.id],
    provenanceIds: unique([...exact.station.provenanceIds, ...exact.elevation.provenanceIds]),
  };
  for (const curve of model.verticalCurves.filter((row) => row.profileId === profile.id)) {
    const pvc = pointById.get(curve.pvcPointId);
    const pvi = pointById.get(curve.pviPointId);
    const pvt = pointById.get(curve.pvtPointId);
    if (!pvc || !pvi || !pvt || chainage < pvc.station.chainage - EPSILON || chainage > pvt.station.chainage + EPSILON) continue;
    const evaluated = evaluateHeliosEuclidVerticalCurve({ curve, pvc, pvi, pvt, chainage });
    return {
      profileId: profile.id,
      profileName: profile.printedName,
      profileRole: profile.role,
      elevation: evaluated.elevation,
      gradePercent: evaluated.gradePercent,
      controlType: "parabolic_vertical_curve",
      controlId: curve.id,
      method: evaluated.method,
      formula: evaluated.formula,
      inputValueIds: evaluated.inputValueIds,
      provenanceIds: evaluated.provenanceIds,
    };
  }
  for (const tangent of model.verticalTangents.filter((row) => row.profileId === profile.id)) {
    const start = pointById.get(tangent.startPointId);
    const end = pointById.get(tangent.endPointId);
    if (!start || !end || chainage < start.station.chainage - EPSILON || chainage > end.station.chainage + EPSILON) continue;
    const distance = chainage - start.station.chainage;
    return {
      profileId: profile.id,
      profileName: profile.printedName,
      profileRole: profile.role,
      elevation: round(start.elevation.value + distance * tangent.gradePercent.value / 100),
      gradePercent: round(tangent.gradePercent.value),
      controlType: "vertical_tangent",
      controlId: tangent.id,
      method: "euclid-vertical-tangent-v1",
      formula: "elevation=elevationStart+(chainage-chainageStart)*(gradePercent/100)",
      inputValueIds: [start.elevation.id, tangent.gradePercent.id],
      provenanceIds: unique([...start.station.provenanceIds, ...start.elevation.provenanceIds, ...tangent.gradePercent.provenanceIds]),
    };
  }
  return undefined;
}

function unavailable(input: {
  model: HeliosEuclidModel;
  alignment: HeliosEuclidAlignment;
  chainage: number;
  displayedStation: number;
  stationEquationId?: string;
  limitations: string[];
}) {
  const base: Omit<HeliosEuclidAlignmentPosition, "id" | "fingerprint"> = {
    version: HELIOS_EUCLID_ALIGNMENT_POSITION_VERSION,
    solver: HELIOS_EUCLID_ALIGNMENT_POSITION_SOLVER,
    euclidModelId: input.model.id,
    sourceFingerprint: input.model.sourceFingerprint,
    alignmentId: input.alignment.id,
    alignmentName: input.alignment.printedName,
    alignmentType: input.alignment.alignmentType,
    spatialReferenceId: input.alignment.spatialReferenceId,
    coordinateBasis: "unknown",
    horizontalUnit: "unknown",
    verticalUnit: "unknown",
    chainage: input.chainage,
    displayedStation: input.displayedStation,
    printedStation: formatStation(input.displayedStation),
    stationEquationId: input.stationEquationId,
    status: "unavailable" as const,
    profiles: [] as HeliosEuclidProfilePosition[],
    limitations: input.limitations,
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(base);
  return { ...base, id: `alignment-position:${fingerprint.split(":")[1]!.slice(0, 32)}`, fingerprint };
}

/**
 * Resolves a governed 3D position from the canonical Euclid record. It is a
 * pure deterministic calculator: it never reads a PDF, calls AI, or invents
 * missing geometry.
 */
export function evaluateHeliosEuclidAlignmentPosition(
  model: HeliosEuclidModel,
  request: HeliosEuclidAlignmentPositionRequest,
): HeliosEuclidAlignmentPosition {
  const alignment = model.alignments.find((row) => row.id === request.alignmentId);
  if (!alignment) throw new Error("Alignment not found in the canonical Euclid model.");
  const equations = model.stationEquations.filter((row) => row.alignmentId === alignment.id);
  const resolved = resolveStation(alignment, equations, request);
  const limitations: string[] = [];
  const spatialReference = model.spatialReferences.find((row) => row.id === alignment.spatialReferenceId);
  const horizontalSolution = solveHeliosEuclidHorizontalControl(model);
  const horizontalAlignment = horizontalSolution.alignmentSolutions.find((row) => row.alignmentId === alignment.id);
  if (!horizontalAlignment || horizontalAlignment.status === "blocked" || horizontalAlignment.status === "not_applicable") {
    return unavailable({ model, alignment, ...resolved, limitations: ["The canonical horizontal control chain is not calculation-ready."] });
  }
  const element = controllingHorizontalElement(model, alignment.id, resolved.chainage);
  if (!element) return unavailable({ model, alignment, ...resolved, limitations: ["No canonical horizontal element controls the requested station."] });
  let horizontal: HeliosEuclidHorizontalPosition;
  try {
    horizontal = evaluateHorizontal(model, element, resolved.chainage);
  } catch (error) {
    return unavailable({ model, alignment, ...resolved, limitations: [error instanceof Error ? error.message : "Horizontal position could not be evaluated."] });
  }
  let verticalSolutionStatus: "passed" | "review" | "blocked" | "not_applicable" = "not_applicable";
  try {
    verticalSolutionStatus = solveHeliosEuclidVerticalProfiles(model).status;
  } catch {
    limitations.push("Vertical contract validation failed; profile elevations are not certified.");
  }
  const selectedProfiles = model.profiles.filter((profile) =>
    profile.alignmentId === alignment.id
    && (!request.profileId || profile.id === request.profileId)
    && (!request.profileRole || profile.role === request.profileRole),
  );
  const profiles = selectedProfiles
    .map((profile) => evaluateProfile(model, profile, resolved.chainage))
    .filter((row): row is HeliosEuclidProfilePosition => Boolean(row))
    .sort((left, right) => left.profileRole.localeCompare(right.profileRole) || left.profileId.localeCompare(right.profileId));
  if (selectedProfiles.length && profiles.length !== selectedProfiles.length) limitations.push("One or more selected profiles do not have deterministic control at this station.");
  if (!selectedProfiles.length) limitations.push("No canonical vertical profile is attached to this alignment for the selected role.");
  if (spatialReference?.referenceState !== "known") limitations.push("Coordinates use a local or partially established project reference and are not survey-control deliverables.");
  if (horizontalAlignment.status === "review") limitations.push("Horizontal control has review-level validation findings.");
  if (verticalSolutionStatus === "review" || verticalSolutionStatus === "blocked") limitations.push("One or more vertical profiles have unresolved validation findings.");
  const relevantStates = [alignment.reviewState, element.reviewState, ...selectedProfiles.map((row) => row.reviewState)];
  const status: HeliosEuclidAlignmentPositionStatus =
    (model.status === "accepted" || model.status === "export_eligible")
    && horizontalAlignment.status === "passed"
    && (verticalSolutionStatus === "passed" || verticalSolutionStatus === "not_applicable")
    && relevantStates.every(accepted)
      ? "verified"
      : "preliminary";
  const base: Omit<HeliosEuclidAlignmentPosition, "id" | "fingerprint"> = {
    version: HELIOS_EUCLID_ALIGNMENT_POSITION_VERSION,
    solver: HELIOS_EUCLID_ALIGNMENT_POSITION_SOLVER,
    euclidModelId: model.id,
    sourceFingerprint: model.sourceFingerprint,
    alignmentId: alignment.id,
    alignmentName: alignment.printedName,
    alignmentType: alignment.alignmentType,
    spatialReferenceId: alignment.spatialReferenceId,
    coordinateBasis: spatialReference?.coordinateBasis || "unknown",
    horizontalUnit: spatialReference?.horizontalUnit || "unknown",
    verticalUnit: spatialReference?.verticalUnit || "unknown",
    chainage: resolved.chainage,
    displayedStation: resolved.displayedStation,
    printedStation: formatStation(resolved.displayedStation),
    stationEquationId: resolved.stationEquationId,
    status,
    horizontal,
    profiles,
    limitations: unique(limitations),
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(base);
  return { ...base, id: `alignment-position:${fingerprint.split(":")[1]!.slice(0, 32)}`, fingerprint };
}
