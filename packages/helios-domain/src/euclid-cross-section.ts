import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  type HeliosEuclidLinearUnit,
  type HeliosEuclidModel,
  type HeliosEuclidProfileRole,
  type HeliosEuclidReviewState,
  type HeliosEuclidTypicalSection,
  type HeliosEuclidValue,
} from "./euclid-contract.ts";
import {
  evaluateHeliosEuclidStationOffsetPosition,
  type HeliosEuclidStationOffsetPosition,
} from "./euclid-station-offset.ts";
import type { HeliosEuclidAlignmentPositionRequest, HeliosEuclidAlignmentPositionStatus } from "./euclid-station.ts";

export const HELIOS_EUCLID_CROSS_SECTION_VERSION = 1;
export const HELIOS_EUCLID_CROSS_SECTION_SOLVER = "euclid-cross-section-template-v1";

export type HeliosEuclidCrossSectionRequest = HeliosEuclidAlignmentPositionRequest & {
  centerlineSurface?: "existing" | "proposed" | "subgrade" | "excavation_limit";
  includeTypicalSection?: boolean;
};
export type HeliosEuclidCrossSectionPointRole = "centerline" | "lane_edge" | "shoulder_edge" | "stored_cross_section";
export type HeliosEuclidCrossSectionPointOrigin = "canonical_profile" | "typical_section_rule" | "stored_cross_section";

export type HeliosEuclidResolvedCrossSectionPoint = {
  id: string;
  role: HeliosEuclidCrossSectionPointRole;
  origin: HeliosEuclidCrossSectionPointOrigin;
  surface: "existing" | "proposed" | "subgrade" | "excavation_limit";
  side: "left" | "right" | "centerline";
  offset: number;
  northing?: number;
  easting?: number;
  elevation?: number;
  formula: string;
  inputValueIds: string[];
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidResolvedMaterialBand = {
  id: string;
  name: string;
  offsetLeft?: number;
  offsetRight?: number;
  thickness: number;
  thicknessUnit: HeliosEuclidLinearUnit | "inch";
  thicknessInVerticalUnit?: number;
  verticalPlacement: "unresolved";
  inputValueIds: string[];
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidCrossSectionResult = {
  id: string;
  version: typeof HELIOS_EUCLID_CROSS_SECTION_VERSION;
  solver: typeof HELIOS_EUCLID_CROSS_SECTION_SOLVER;
  euclidModelId: string;
  sourceFingerprint: string;
  alignmentId: string;
  alignmentName: string;
  spatialReferenceId: string;
  horizontalUnit: string;
  verticalUnit: string;
  chainage: number;
  displayedStation: number;
  printedStation: string;
  stationEquationId?: string;
  status: HeliosEuclidAlignmentPositionStatus;
  canBuildSurface: boolean;
  centerlinePosition: HeliosEuclidStationOffsetPosition;
  controllingTemplate?: {
    id: string;
    name: string;
    stationStart: string;
    stationEnd: string;
    reviewState: HeliosEuclidReviewState;
    slopeConvention: "signed_rise_outward_percent";
  };
  points: HeliosEuclidResolvedCrossSectionPoint[];
  materialBands: HeliosEuclidResolvedMaterialBand[];
  unresolvedControls: string[];
  limitations: string[];
  fingerprint: string;
};

const EPSILON = 0.001;
const excluded = new Set<HeliosEuclidReviewState>(["rejected", "stale", "superseded"]);
const accepted = (state: HeliosEuclidReviewState) => state === "accepted" || state === "corrected";
const unique = (values: string[]) => [...new Set(values)].sort();
const round = (value: number, places = 10) => Number(value.toFixed(places));

function valueIds(values: Array<HeliosEuclidValue<unknown> | undefined>) {
  return unique(values.flatMap((value) => value ? [value.id, ...value.inputValueIds] : []));
}

function provenanceIds(values: Array<HeliosEuclidValue<unknown> | undefined>) {
  return unique(values.flatMap((value) => value?.provenanceIds || []));
}

function weakestReviewState(values: Array<{ reviewState: HeliosEuclidReviewState } | undefined>): HeliosEuclidReviewState {
  const states = values.flatMap((value) => value ? [value.reviewState] : []);
  return states.every(accepted) ? "accepted" : states.includes("conflicted") ? "conflicted" : "proposed";
}

function convertLinear(value: number, from: HeliosEuclidLinearUnit | "inch", to: HeliosEuclidLinearUnit) {
  if (to === "unknown") return undefined;
  const meters = from === "meter"
    ? value
    : from === "inch"
      ? value * 0.0254
      : from === "us_survey_foot" || from === "international_foot"
        ? value * 0.3048
        : undefined;
  if (meters === undefined) return undefined;
  return round(to === "meter" ? meters : meters / 0.3048);
}

function controllingProfileRequest(model: HeliosEuclidModel, request: HeliosEuclidCrossSectionRequest, first: HeliosEuclidStationOffsetPosition) {
  if (request.profileId || request.profileRole) return request;
  const proposed = first.referenceProfiles.filter((profile) => profile.profileRole === "proposed_finished_grade");
  if (proposed.length === 1) return { ...request, profileId: proposed[0]!.profileId };
  if (first.referenceProfiles.length === 1) return { ...request, profileId: first.referenceProfiles[0]!.profileId };
  const projectProfiles = model.profiles.filter((profile) => profile.alignmentId === request.alignmentId && profile.role === "proposed_finished_grade" && !excluded.has(profile.reviewState));
  return projectProfiles.length === 1 ? { ...request, profileId: projectProfiles[0]!.id } : request;
}

function activeTemplate(model: HeliosEuclidModel, alignmentId: string, chainage: number) {
  return model.typicalSections.filter((section) =>
    section.alignmentId === alignmentId
    && !excluded.has(section.reviewState)
    && chainage >= section.stationStart.chainage - EPSILON
    && chainage <= section.stationEnd.chainage + EPSILON,
  );
}

function pointFromPosition(input: {
  position: HeliosEuclidStationOffsetPosition;
  role: HeliosEuclidCrossSectionPointRole;
  origin: HeliosEuclidCrossSectionPointOrigin;
  surface: HeliosEuclidResolvedCrossSectionPoint["surface"];
  elevation?: number;
  formula: string;
  inputValueIds: string[];
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
}) : HeliosEuclidResolvedCrossSectionPoint {
  const base = {
    role: input.role,
    origin: input.origin,
    surface: input.surface,
    side: input.position.side,
    offset: input.position.offset,
    northing: input.position.horizontal?.northing,
    easting: input.position.horizontal?.easting,
    elevation: input.elevation,
    formula: input.formula,
    inputValueIds: unique(input.inputValueIds),
    provenanceIds: unique(input.provenanceIds),
    reviewState: input.reviewState,
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(base);
  return { id: `section-point:${fingerprint.split(":")[1]!.slice(0, 24)}`, ...base };
}

function templatePoint(input: {
  model: HeliosEuclidModel;
  request: HeliosEuclidCrossSectionRequest;
  centerline: HeliosEuclidStationOffsetPosition;
  section: HeliosEuclidTypicalSection;
  side: "left" | "right";
  role: "lane_edge" | "shoulder_edge";
  offset: number;
  widthValues: Array<HeliosEuclidValue<number> | undefined>;
  slope?: HeliosEuclidValue<number>;
}) {
  const position = evaluateHeliosEuclidStationOffsetPosition(input.model, { ...input.request, offset: input.side === "left" ? -input.offset : input.offset });
  const centerlineElevation = input.centerline.elevation?.elevation;
  const elevation = input.slope !== undefined && centerlineElevation !== undefined
    ? round(centerlineElevation + input.offset * input.slope.value / 100)
    : undefined;
  const values = [...input.widthValues, input.slope];
  return pointFromPosition({
    position,
    role: input.role,
    origin: "typical_section_rule",
    surface: "proposed",
    elevation,
    formula: elevation === undefined
      ? "horizontal offset from canonical centerline; lateral elevation unresolved"
      : "elevation=centerline proposed grade+outward distance*signed outward cross slope/100",
    inputValueIds: valueIds(values),
    provenanceIds: provenanceIds(values),
    reviewState: weakestReviewState([input.section, ...values]),
  });
}

/**
 * Builds one governed roadway section slice from the immutable Euclid record.
 * Negative offsets are left and positive offsets are right. Cross slopes are
 * signed vertical rise moving outward from centerline; a falling 2% lane is -2.
 */
export function evaluateHeliosEuclidCrossSection(
  model: HeliosEuclidModel,
  request: HeliosEuclidCrossSectionRequest,
): HeliosEuclidCrossSectionResult {
  const first = evaluateHeliosEuclidStationOffsetPosition(model, { ...request, offset: 0 });
  const governedRequest = controllingProfileRequest(model, request, first);
  const centerline = governedRequest === request ? first : evaluateHeliosEuclidStationOffsetPosition(model, { ...governedRequest, offset: 0 });
  const templates = activeTemplate(model, request.alignmentId, centerline.chainage);
  const centerlineSurface = request.centerlineSurface
    ?? (request.profileRole === "existing_ground" ? "existing" : "proposed");
  const useTypicalSection = request.includeTypicalSection !== false && centerlineSurface === "proposed";
  const applicableTemplates = useTypicalSection ? templates : [];
  const section = applicableTemplates.length === 1 ? applicableTemplates[0] : undefined;
  const unresolvedControls: string[] = [];
  const limitations = [...centerline.limitations];
  const points: HeliosEuclidResolvedCrossSectionPoint[] = [];

  if (centerline.horizontal) {
    points.push(pointFromPosition({
      position: centerline,
      role: "centerline",
      origin: "canonical_profile",
      surface: centerlineSurface,
      elevation: centerline.elevation?.elevation,
      formula: centerline.elevation ? "canonical proposed centerline profile elevation" : "canonical centerline horizontal position; proposed elevation unresolved",
      inputValueIds: centerline.elevation?.inputValueIds || [],
      provenanceIds: centerline.elevation?.provenanceIds || centerline.horizontal.provenanceIds,
      reviewState: centerline.status === "verified" ? "accepted" : "proposed",
    }));
  }

  if (useTypicalSection && applicableTemplates.length > 1) unresolvedControls.push("Multiple typical sections overlap this station; select or correct the controlling template.");
  if (useTypicalSection && !section) unresolvedControls.push(applicableTemplates.length ? "No unambiguous typical section controls this station." : "No typical section controls this station.");
  if (section) {
    for (const side of ["left", "right"] as const) {
      const laneWidth = side === "left" ? section.laneWidthLeft : section.laneWidthRight;
      const shoulderWidth = side === "left" ? section.shoulderWidthLeft : section.shoulderWidthRight;
      const slope = side === "left" ? section.crossSlopeLeftPercent : section.crossSlopeRightPercent;
      if (laneWidth) {
        points.push(templatePoint({ model, request: governedRequest, centerline, section, side, role: "lane_edge", offset: laneWidth.value, widthValues: [laneWidth], slope }));
        if (!slope) unresolvedControls.push(`${side === "left" ? "Left" : "Right"} lane width is stored, but its signed outward cross slope is not established.`);
      } else if (slope) {
        unresolvedControls.push(`${side === "left" ? "Left" : "Right"} cross slope is stored, but lane width is not established.`);
      }
      if (shoulderWidth && laneWidth) {
        const totalWidth = laneWidth.value + shoulderWidth.value;
        points.push(templatePoint({ model, request: governedRequest, centerline, section, side, role: "shoulder_edge", offset: totalWidth, widthValues: [laneWidth, shoulderWidth] }));
        unresolvedControls.push(`${side === "left" ? "Left" : "Right"} shoulder edge elevation is unresolved because the canonical contract has no shoulder-slope control.`);
      } else if (shoulderWidth) {
        unresolvedControls.push(`${side === "left" ? "Left" : "Right"} shoulder width is stored, but lane width is not established, so the shoulder edge offset cannot be calculated.`);
      }
    }
  }

  const stored = model.crossSectionPoints.filter((point) =>
    point.alignmentId === request.alignmentId
    && !excluded.has(point.reviewState)
    && Math.abs(point.station.chainage - centerline.chainage) <= EPSILON,
  );
  for (const point of stored) {
    const position = evaluateHeliosEuclidStationOffsetPosition(model, { ...governedRequest, offset: point.offset.value });
    const resolved = pointFromPosition({
      position,
      role: "stored_cross_section",
      origin: "stored_cross_section",
      surface: point.surface,
      elevation: point.elevation.value,
      formula: "canonical stored cross-section offset and elevation",
      inputValueIds: valueIds([point.offset, point.elevation]),
      provenanceIds: provenanceIds([point.offset, point.elevation]),
      reviewState: weakestReviewState([point, point.offset, point.elevation]),
    });
    const duplicate = points.findIndex((candidate) => candidate.surface === resolved.surface && Math.abs(candidate.offset - resolved.offset) <= EPSILON);
    if (duplicate >= 0) points.splice(duplicate, 1, resolved); else points.push(resolved);
  }

  const spatialReference = model.spatialReferences.find((row) => row.id === centerline.spatialReferenceId);
  const materialBands = model.materialLayers.filter((layer) =>
    layer.alignmentId === request.alignmentId
    && !excluded.has(layer.reviewState)
    && centerline.chainage >= layer.stationStart.chainage - EPSILON
    && centerline.chainage <= layer.stationEnd.chainage + EPSILON,
  ).map((layer): HeliosEuclidResolvedMaterialBand => ({
    id: layer.id,
    name: layer.name,
    offsetLeft: layer.offsetLeft?.value,
    offsetRight: layer.offsetRight?.value,
    thickness: layer.thickness.value,
    thicknessUnit: layer.thicknessUnit,
    thicknessInVerticalUnit: spatialReference ? convertLinear(layer.thickness.value, layer.thicknessUnit, spatialReference.verticalUnit) : undefined,
    verticalPlacement: "unresolved",
    inputValueIds: valueIds([layer.offsetLeft, layer.offsetRight, layer.thickness]),
    provenanceIds: provenanceIds([layer.offsetLeft, layer.offsetRight, layer.thickness]),
    reviewState: weakestReviewState([layer, layer.offsetLeft, layer.offsetRight, layer.thickness]),
  }));
  for (const layer of materialBands) {
    if (layer.offsetLeft === undefined || layer.offsetRight === undefined) unresolvedControls.push(`${layer.name} has no complete lateral limits.`);
    unresolvedControls.push(`${layer.name} thickness is stored, but its vertical placement relative to the proposed surface is not established.`);
  }

  const orderedPoints = points.sort((left, right) => left.offset - right.offset || left.surface.localeCompare(right.surface) || left.role.localeCompare(right.role));
  const surfaceGroups = new Map<string, Set<number>>();
  for (const point of orderedPoints.filter((row) => row.elevation !== undefined && row.northing !== undefined && row.easting !== undefined)) {
    const offsets = surfaceGroups.get(point.surface) || new Set<number>();
    offsets.add(round(point.offset, 6));
    surfaceGroups.set(point.surface, offsets);
  }
  const canBuildSurface = [...surfaceGroups.values()].some((offsets) => offsets.size >= 3);
  if (!canBuildSurface) limitations.push("At least three governed 3D points on one surface are required before a section surface can be built.");
  if (!stored.length) limitations.push("No exact-station canonical cross-section points are stored at this station.");
  limitations.push("Superelevation, ditches, and daylight limits are used only when represented by canonical cross-section points; none are inferred from plan scale.");

  const status: HeliosEuclidAlignmentPositionStatus = !centerline.horizontal || orderedPoints.length <= 1
    ? "unavailable"
    : canBuildSurface && centerline.status === "verified" && orderedPoints.every((point) => accepted(point.reviewState))
      ? "verified"
      : "preliminary";
  const base: Omit<HeliosEuclidCrossSectionResult, "id" | "fingerprint"> = {
    version: HELIOS_EUCLID_CROSS_SECTION_VERSION,
    solver: HELIOS_EUCLID_CROSS_SECTION_SOLVER,
    euclidModelId: centerline.euclidModelId,
    sourceFingerprint: centerline.sourceFingerprint,
    alignmentId: centerline.alignmentId,
    alignmentName: centerline.alignmentName,
    spatialReferenceId: centerline.spatialReferenceId,
    horizontalUnit: centerline.horizontalUnit,
    verticalUnit: centerline.verticalUnit,
    chainage: centerline.chainage,
    displayedStation: centerline.displayedStation,
    printedStation: centerline.printedStation,
    stationEquationId: centerline.stationEquationId,
    status,
    canBuildSurface,
    centerlinePosition: centerline,
    controllingTemplate: section ? {
      id: section.id,
      name: section.name,
      stationStart: section.stationStart.printedStation,
      stationEnd: section.stationEnd.printedStation,
      reviewState: section.reviewState,
      slopeConvention: "signed_rise_outward_percent",
    } : undefined,
    points: orderedPoints,
    materialBands,
    unresolvedControls: unique(unresolvedControls),
    limitations: unique(limitations),
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(base);
  return { ...base, id: `cross-section:${fingerprint.split(":")[1]!.slice(0, 32)}`, fingerprint };
}
