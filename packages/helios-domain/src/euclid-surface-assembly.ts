import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  type HeliosEuclidModel,
  type HeliosEuclidProfileRole,
  type HeliosEuclidReviewState,
} from "./euclid-contract.ts";
import {
  evaluateHeliosEuclidCrossSection,
  type HeliosEuclidResolvedCrossSectionPoint,
} from "./euclid-cross-section.ts";
import type { HeliosEuclidAlignmentPositionStatus } from "./euclid-station.ts";

export const HELIOS_EUCLID_SURFACE_ASSEMBLY_VERSION = 1;
export const HELIOS_EUCLID_SURFACE_ASSEMBLY_SOLVER = "euclid-governed-surface-assembly-v1";
export const HELIOS_EUCLID_SURFACE_MAX_SECTIONS = 401;

export type HeliosEuclidSurfaceKind = "existing" | "proposed" | "subgrade" | "excavation_limit";
export type HeliosEuclidSurfaceAssemblyRequest = {
  alignmentId: string;
  chainageStart?: number;
  chainageEnd?: number;
  interval?: number;
};

export type HeliosEuclidSurfaceStationReason =
  | "range_boundary"
  | "regular_interval"
  | "horizontal_control"
  | "vertical_control"
  | "typical_section_boundary"
  | "cross_section_control"
  | "material_boundary";

export type HeliosEuclidSurfaceSlice = {
  id: string;
  chainage: number;
  displayedStation: number;
  printedStation: string;
  reasons: HeliosEuclidSurfaceStationReason[];
  status: HeliosEuclidAlignmentPositionStatus;
  points: HeliosEuclidResolvedCrossSectionPoint[];
  materialBandIds: string[];
};

export type HeliosEuclidSurfacePanel = {
  id: string;
  surface: HeliosEuclidSurfaceKind;
  stationStart: number;
  stationEnd: number;
  printedStationStart: string;
  printedStationEnd: string;
  offsetLeft: number;
  offsetRight: number;
  cornerPointIds: [string, string, string, string];
  trianglePointIds: [[string, string, string], [string, string, string]];
  inputValueIds: string[];
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidSurfaceGap = {
  id: string;
  surface: HeliosEuclidSurfaceKind;
  stationStart: number;
  stationEnd: number;
  printedStationStart: string;
  printedStationEnd: string;
  reason: "missing_3d_section" | "incompatible_section_topology";
  message: string;
};

export type HeliosEuclidAssembledSurface = {
  surface: HeliosEuclidSurfaceKind;
  status: HeliosEuclidAlignmentPositionStatus;
  sectionCount: number;
  pointCount: number;
  panelCount: number;
  stationStart?: number;
  stationEnd?: number;
  panels: HeliosEuclidSurfacePanel[];
  gaps: HeliosEuclidSurfaceGap[];
  inputValueIds: string[];
  provenanceIds: string[];
};

export type HeliosEuclidSurfaceAssemblyResult = {
  id: string;
  version: typeof HELIOS_EUCLID_SURFACE_ASSEMBLY_VERSION;
  solver: typeof HELIOS_EUCLID_SURFACE_ASSEMBLY_SOLVER;
  euclidModelId: string;
  sourceFingerprint: string;
  alignmentId: string;
  alignmentName: string;
  spatialReferenceId: string;
  horizontalUnit: string;
  verticalUnit: string;
  status: HeliosEuclidAlignmentPositionStatus;
  canAssembleSurface: boolean;
  canCompareSurfaces: boolean;
  sampling: {
    chainageStart: number;
    chainageEnd: number;
    requestedInterval: number;
    effectiveInterval: number;
    sectionCount: number;
    maximumSectionCount: number;
  };
  slices: HeliosEuclidSurfaceSlice[];
  surfaces: HeliosEuclidAssembledSurface[];
  unresolvedControls: string[];
  limitations: string[];
  fingerprint: string;
};

export class HeliosEuclidSurfaceAssemblyError extends Error {}

const EPSILON = 0.001;
const SURFACES: HeliosEuclidSurfaceKind[] = ["existing", "proposed", "subgrade", "excavation_limit"];
const accepted = (state: HeliosEuclidReviewState) => state === "accepted" || state === "corrected";
const excluded = (state: HeliosEuclidReviewState) => state === "rejected" || state === "stale" || state === "superseded";
const rounded = (value: number, digits = 6) => Number(value.toFixed(digits));
const unique = (values: string[]) => [...new Set(values)].sort();

function checkedNumber(value: number | undefined, fallback: number, label: string) {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) throw new HeliosEuclidSurfaceAssemblyError(`${label} must be finite.`);
  return value;
}

function pointAuthority(point: HeliosEuclidResolvedCrossSectionPoint) {
  return (point.origin === "stored_cross_section" ? 100 : point.origin === "typical_section_rule" ? 50 : 20)
    + (accepted(point.reviewState) ? 10 : point.reviewState === "conflicted" ? -10 : 0);
}

function weakestState(points: HeliosEuclidResolvedCrossSectionPoint[]): HeliosEuclidReviewState {
  if (points.every((point) => accepted(point.reviewState))) return "accepted";
  if (points.some((point) => point.reviewState === "conflicted")) return "conflicted";
  return "proposed";
}

function reasonsFor(model: HeliosEuclidModel, alignmentId: string, chainage: number, start: number, end: number) {
  const reasons = new Set<HeliosEuclidSurfaceStationReason>();
  if (Math.abs(chainage - start) <= EPSILON || Math.abs(chainage - end) <= EPSILON) reasons.add("range_boundary");
  if (model.horizontalElements.some((row) => row.alignmentId === alignmentId && (Math.abs(row.startStation.chainage - chainage) <= EPSILON || Math.abs(row.endStation.chainage - chainage) <= EPSILON))) reasons.add("horizontal_control");
  const profileIds = new Set(model.profiles.filter((row) => row.alignmentId === alignmentId && !excluded(row.reviewState)).map((row) => row.id));
  const profilePointById = new Map(model.profilePoints.map((row) => [row.id, row]));
  if (model.profilePoints.some((row) => profileIds.has(row.profileId) && Math.abs(row.station.chainage - chainage) <= EPSILON)
    || model.verticalCurves.some((row) => profileIds.has(row.profileId) && [row.pvcPointId, row.pviPointId, row.pvtPointId]
      .map((id) => profilePointById.get(id)?.station.chainage)
      .some((station) => station !== undefined && Math.abs(station - chainage) <= EPSILON))) reasons.add("vertical_control");
  if (model.typicalSections.some((row) => row.alignmentId === alignmentId && (Math.abs(row.stationStart.chainage - chainage) <= EPSILON || Math.abs(row.stationEnd.chainage - chainage) <= EPSILON))) reasons.add("typical_section_boundary");
  if (model.crossSectionPoints.some((row) => row.alignmentId === alignmentId && Math.abs(row.station.chainage - chainage) <= EPSILON)) reasons.add("cross_section_control");
  if (model.materialLayers.some((row) => row.alignmentId === alignmentId && (Math.abs(row.stationStart.chainage - chainage) <= EPSILON || Math.abs(row.stationEnd.chainage - chainage) <= EPSILON))) reasons.add("material_boundary");
  if (!reasons.size) reasons.add("regular_interval");
  return [...reasons].sort();
}

function criticalChainages(model: HeliosEuclidModel, alignmentId: string, start: number, end: number) {
  const values = new Set<number>([rounded(start), rounded(end)]);
  const add = (chainage: number) => {
    if (chainage >= start - EPSILON && chainage <= end + EPSILON) values.add(rounded(chainage));
  };
  model.horizontalElements.filter((row) => row.alignmentId === alignmentId && !excluded(row.reviewState)).forEach((row) => { add(row.startStation.chainage); add(row.endStation.chainage); });
  const profileIds = new Set(model.profiles.filter((row) => row.alignmentId === alignmentId && !excluded(row.reviewState)).map((row) => row.id));
  const profilePointById = new Map(model.profilePoints.map((row) => [row.id, row]));
  model.profilePoints.filter((row) => profileIds.has(row.profileId) && !excluded(row.reviewState)).forEach((row) => add(row.station.chainage));
  model.verticalCurves.filter((row) => profileIds.has(row.profileId) && !excluded(row.reviewState)).forEach((row) => {
    [row.pvcPointId, row.pviPointId, row.pvtPointId].forEach((id) => {
      const station = profilePointById.get(id)?.station.chainage;
      if (station !== undefined) add(station);
    });
  });
  model.typicalSections.filter((row) => row.alignmentId === alignmentId && !excluded(row.reviewState)).forEach((row) => { add(row.stationStart.chainage); add(row.stationEnd.chainage); });
  model.crossSectionPoints.filter((row) => row.alignmentId === alignmentId && !excluded(row.reviewState)).forEach((row) => add(row.station.chainage));
  model.materialLayers.filter((row) => row.alignmentId === alignmentId && !excluded(row.reviewState)).forEach((row) => { add(row.stationStart.chainage); add(row.stationEnd.chainage); });
  return values;
}

function mergePoints(groups: HeliosEuclidResolvedCrossSectionPoint[][]) {
  const points = new Map<string, HeliosEuclidResolvedCrossSectionPoint>();
  for (const point of groups.flat()) {
    const key = `${point.surface}:${rounded(point.offset)}`;
    const current = points.get(key);
    if (!current || pointAuthority(point) > pointAuthority(current)) points.set(key, point);
  }
  return [...points.values()].sort((left, right) => left.surface.localeCompare(right.surface) || left.offset - right.offset);
}

function completePoints(slice: HeliosEuclidSurfaceSlice, surface: HeliosEuclidSurfaceKind) {
  return slice.points.filter((point) => point.surface === surface
    && point.northing !== undefined && point.easting !== undefined && point.elevation !== undefined)
    .sort((left, right) => left.offset - right.offset);
}

function gap(input: Omit<HeliosEuclidSurfaceGap, "id">): HeliosEuclidSurfaceGap {
  const fingerprint = buildHeliosEngineeringParityFingerprint(input);
  return { id: `surface-gap:${fingerprint.split(":")[1]!.slice(0, 24)}`, ...input };
}

function panel(input: Omit<HeliosEuclidSurfacePanel, "id">): HeliosEuclidSurfacePanel {
  const fingerprint = buildHeliosEngineeringParityFingerprint(input);
  return { id: `surface-panel:${fingerprint.split(":")[1]!.slice(0, 24)}`, ...input };
}

function assembleSurface(surface: HeliosEuclidSurfaceKind, slices: HeliosEuclidSurfaceSlice[]): HeliosEuclidAssembledSurface {
  const panels: HeliosEuclidSurfacePanel[] = [];
  const gaps: HeliosEuclidSurfaceGap[] = [];
  const surfaceSections = slices.map((slice) => ({ slice, points: completePoints(slice, surface) }));
  for (let index = 1; index < surfaceSections.length; index += 1) {
    const previous = surfaceSections[index - 1]!;
    const current = surfaceSections[index]!;
    if (previous.points.length < 3 || current.points.length < 3) {
      gaps.push(gap({
        surface,
        stationStart: previous.slice.chainage,
        stationEnd: current.slice.chainage,
        printedStationStart: previous.slice.printedStation,
        printedStationEnd: current.slice.printedStation,
        reason: "missing_3d_section",
        message: `${surface.replaceAll("_", " ")} lacks three governed 3D points at one or both bounding stations.`,
      }));
      continue;
    }
    const previousByOffset = new Map(previous.points.map((point) => [rounded(point.offset), point]));
    const currentByOffset = new Map(current.points.map((point) => [rounded(point.offset), point]));
    const offsets = [...previousByOffset.keys()].filter((offset) => currentByOffset.has(offset)).sort((left, right) => left - right);
    if (offsets.length < 3) {
      gaps.push(gap({
        surface,
        stationStart: previous.slice.chainage,
        stationEnd: current.slice.chainage,
        printedStationStart: previous.slice.printedStation,
        printedStationEnd: current.slice.printedStation,
        reason: "incompatible_section_topology",
        message: `${surface.replaceAll("_", " ")} sections do not share at least three governed offsets.`,
      }));
      continue;
    }
    for (let offsetIndex = 1; offsetIndex < offsets.length; offsetIndex += 1) {
      const leftOffset = offsets[offsetIndex - 1]!;
      const rightOffset = offsets[offsetIndex]!;
      const startLeft = previousByOffset.get(leftOffset)!;
      const startRight = previousByOffset.get(rightOffset)!;
      const endLeft = currentByOffset.get(leftOffset)!;
      const endRight = currentByOffset.get(rightOffset)!;
      const cornerPointIds: [string, string, string, string] = [startLeft.id, startRight.id, endRight.id, endLeft.id];
      const points = [startLeft, startRight, endRight, endLeft];
      panels.push(panel({
        surface,
        stationStart: previous.slice.chainage,
        stationEnd: current.slice.chainage,
        printedStationStart: previous.slice.printedStation,
        printedStationEnd: current.slice.printedStation,
        offsetLeft: leftOffset,
        offsetRight: rightOffset,
        cornerPointIds,
        trianglePointIds: [[startLeft.id, startRight.id, endRight.id], [startLeft.id, endRight.id, endLeft.id]],
        inputValueIds: unique(points.flatMap((point) => point.inputValueIds)),
        provenanceIds: unique(points.flatMap((point) => point.provenanceIds)),
        reviewState: weakestState(points),
      }));
    }
  }
  const usableSections = surfaceSections.filter((row) => row.points.length >= 3);
  const points = usableSections.flatMap((row) => row.points);
  const status: HeliosEuclidAlignmentPositionStatus = !panels.length
    ? "unavailable"
    : !gaps.length && panels.every((row) => accepted(row.reviewState))
      ? "verified"
      : "preliminary";
  return {
    surface,
    status,
    sectionCount: usableSections.length,
    pointCount: points.length,
    panelCount: panels.length,
    stationStart: usableSections[0]?.slice.chainage,
    stationEnd: usableSections.at(-1)?.slice.chainage,
    panels,
    gaps,
    inputValueIds: unique(points.flatMap((point) => point.inputValueIds)),
    provenanceIds: unique(points.flatMap((point) => point.provenanceIds)),
  };
}

function comparisonReady(surfaces: HeliosEuclidAssembledSurface[]) {
  const existing = surfaces.find((row) => row.surface === "existing");
  const design = surfaces.find((row) => row.surface === "subgrade" && row.panelCount > 0)
    ?? surfaces.find((row) => row.surface === "proposed");
  if (!existing?.panelCount || !design?.panelCount) return false;
  const existingSpans = new Set(existing.panels.map((row) => `${row.stationStart}:${row.stationEnd}`));
  return design.panels.some((row) => existingSpans.has(`${row.stationStart}:${row.stationEnd}`));
}

/**
 * Connects canonical 4N section slices into reviewable longitudinal meshes.
 * It never interpolates missing section topology and never publishes quantity.
 */
export function assembleHeliosEuclidSurfaces(
  model: HeliosEuclidModel,
  request: HeliosEuclidSurfaceAssemblyRequest,
): HeliosEuclidSurfaceAssemblyResult {
  const alignment = model.alignments.find((row) => row.id === request.alignmentId);
  if (!alignment) throw new HeliosEuclidSurfaceAssemblyError("Alignment was not found in the canonical Euclid model.");
  const start = checkedNumber(request.chainageStart, alignment.startStation.chainage, "Start chainage");
  const end = checkedNumber(request.chainageEnd, alignment.endStation.chainage, "End chainage");
  if (end <= start) throw new HeliosEuclidSurfaceAssemblyError("Surface assembly end chainage must be greater than start chainage.");
  if (start < alignment.startStation.chainage - EPSILON || end > alignment.endStation.chainage + EPSILON) {
    throw new HeliosEuclidSurfaceAssemblyError("Surface assembly range must remain within the canonical alignment.");
  }
  const spatialReference = model.spatialReferences.find((row) => row.id === alignment.spatialReferenceId);
  const defaultInterval = spatialReference?.horizontalUnit === "meter" ? 10 : 25;
  const requestedInterval = checkedNumber(request.interval, defaultInterval, "Section interval");
  if (requestedInterval <= 0) throw new HeliosEuclidSurfaceAssemblyError("Section interval must be greater than zero.");

  const chainages = criticalChainages(model, alignment.id, start, end);
  if (chainages.size > HELIOS_EUCLID_SURFACE_MAX_SECTIONS) {
    throw new HeliosEuclidSurfaceAssemblyError("Canonical critical stations exceed the bounded 4O assembly limit; assemble a smaller station range.");
  }
  const regularBudget = Math.max(2, HELIOS_EUCLID_SURFACE_MAX_SECTIONS - chainages.size + 2);
  const effectiveInterval = Math.max(requestedInterval, (end - start) / (regularBudget - 1));
  for (let chainage = start; chainage < end - EPSILON; chainage += effectiveInterval) chainages.add(rounded(chainage));
  chainages.add(rounded(end));
  const orderedChainages = [...chainages].sort((left, right) => left - right);

  const activeProfiles = model.profiles.filter((row) => row.alignmentId === alignment.id && !excluded(row.reviewState));
  const proposedProfiles = activeProfiles.filter((row) => row.role === "proposed_finished_grade");
  const existingProfiles = activeProfiles.filter((row) => row.role === "existing_ground");
  const unresolvedControls: string[] = [];
  if (proposedProfiles.length !== 1) unresolvedControls.push(proposedProfiles.length ? "Multiple proposed finished-grade profiles require authority review." : "No proposed finished-grade profile is stored for this alignment.");
  if (existingProfiles.length !== 1) unresolvedControls.push(existingProfiles.length ? "Multiple existing-ground profiles require authority review." : "No existing-ground profile is stored for this alignment.");

  const slices = orderedChainages.map((chainage): HeliosEuclidSurfaceSlice => {
    const proposed = evaluateHeliosEuclidCrossSection(model, {
      alignmentId: alignment.id,
      chainage,
      profileId: proposedProfiles.length === 1 ? proposedProfiles[0]!.id : undefined,
      profileRole: proposedProfiles.length === 1 ? "proposed_finished_grade" satisfies HeliosEuclidProfileRole : undefined,
      centerlineSurface: "proposed",
      includeTypicalSection: proposedProfiles.length === 1,
    });
    const existing = existingProfiles.length === 1
      ? evaluateHeliosEuclidCrossSection(model, {
          alignmentId: alignment.id,
          chainage,
          profileId: existingProfiles[0]!.id,
          profileRole: "existing_ground",
          centerlineSurface: "existing",
          includeTypicalSection: false,
        })
      : undefined;
    const proposedPoints = proposedProfiles.length === 1
      ? proposed.points
      : proposed.points.filter((point) => point.origin !== "canonical_profile");
    const points = mergePoints([proposedPoints, existing?.points || []]);
    unresolvedControls.push(...proposed.unresolvedControls, ...(existing?.unresolvedControls || []));
    const status: HeliosEuclidAlignmentPositionStatus = points.some((point) => point.northing !== undefined && point.easting !== undefined && point.elevation !== undefined)
      ? points.every((point) => accepted(point.reviewState)) ? "verified" : "preliminary"
      : "unavailable";
    const sliceBase = {
      chainage: proposed.chainage,
      displayedStation: proposed.displayedStation,
      printedStation: proposed.printedStation,
      reasons: reasonsFor(model, alignment.id, chainage, start, end),
      status,
      points,
      materialBandIds: proposed.materialBands.map((row) => row.id).sort(),
    };
    const fingerprint = buildHeliosEngineeringParityFingerprint(sliceBase);
    return { id: `surface-slice:${fingerprint.split(":")[1]!.slice(0, 24)}`, ...sliceBase };
  });

  const surfaces = SURFACES.map((surface) => assembleSurface(surface, slices));
  const canAssembleSurface = surfaces.some((surface) => surface.panelCount > 0);
  const canCompareSurfaces = comparisonReady(surfaces);
  const limitations = [
    "4O assembles review geometry only; it does not publish estimate or production quantities.",
    "Only matching governed offsets at consecutive sampled stations are connected into surface panels.",
    "Daylight, ditch, superelevation, and material vertical placement remain unavailable unless the canonical record contains their explicit controls.",
  ];
  if (effectiveInterval > requestedInterval + EPSILON) limitations.push(`The requested interval was expanded to ${rounded(effectiveInterval, 3)} to remain within the bounded ${HELIOS_EUCLID_SURFACE_MAX_SECTIONS}-section assembly limit.`);
  if (!canCompareSurfaces) limitations.push("Existing and design surfaces do not yet share a governed panel span, so cut/fill comparison remains unavailable.");
  const status: HeliosEuclidAlignmentPositionStatus = !canAssembleSurface
    ? "unavailable"
    : surfaces.some((surface) => surface.panelCount > 0 && surface.status !== "verified") || unresolvedControls.length
      ? "preliminary"
      : "verified";
  const base: Omit<HeliosEuclidSurfaceAssemblyResult, "id" | "fingerprint"> = {
    version: HELIOS_EUCLID_SURFACE_ASSEMBLY_VERSION,
    solver: HELIOS_EUCLID_SURFACE_ASSEMBLY_SOLVER,
    euclidModelId: model.id,
    sourceFingerprint: model.sourceFingerprint,
    alignmentId: alignment.id,
    alignmentName: alignment.printedName,
    spatialReferenceId: alignment.spatialReferenceId,
    horizontalUnit: spatialReference?.horizontalUnit || "unknown",
    verticalUnit: spatialReference?.verticalUnit || "unknown",
    status,
    canAssembleSurface,
    canCompareSurfaces,
    sampling: {
      chainageStart: start,
      chainageEnd: end,
      requestedInterval,
      effectiveInterval: rounded(effectiveInterval),
      sectionCount: slices.length,
      maximumSectionCount: HELIOS_EUCLID_SURFACE_MAX_SECTIONS,
    },
    slices,
    surfaces,
    unresolvedControls: unique(unresolvedControls),
    limitations: unique(limitations),
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(base);
  return { ...base, id: `surface-assembly:${fingerprint.split(":")[1]!.slice(0, 32)}`, fingerprint };
}
