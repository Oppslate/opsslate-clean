export const HELIOS_EUCLID_SCHEMA_VERSION = 2;

export const HELIOS_EUCLID_MODEL_STATUSES = [
  "draft",
  "building",
  "proposed",
  "conflicted",
  "partially_accepted",
  "accepted",
  "export_eligible",
  "stale",
  "superseded",
  "failed",
] as const;

export const HELIOS_EUCLID_REVIEW_STATES = [
  "proposed",
  "accepted",
  "corrected",
  "conflicted",
  "rejected",
  "stale",
  "superseded",
] as const;

export const HELIOS_EUCLID_LINEAR_UNITS = [
  "us_survey_foot",
  "international_foot",
  "meter",
  "unknown",
] as const;

export const HELIOS_EUCLID_COORDINATE_BASES = [
  "grid",
  "ground",
  "local",
  "unknown",
] as const;

export const HELIOS_EUCLID_REFERENCE_STATES = [
  "known",
  "partially_known",
  "local_only",
  "unknown",
  "conflicted",
] as const;

export const HELIOS_EUCLID_ALIGNMENT_TYPES = [
  "roadway_centerline",
  "survey_baseline",
  "stream_channel",
  "structure_baseline",
  "utility_alignment",
  "temporary_alignment",
  "other",
] as const;

export const HELIOS_EUCLID_CONTROL_POINT_TYPES = [
  "pob",
  "pot",
  "pc",
  "pi",
  "pt",
  "pcc",
  "prc",
  "ts",
  "sc",
  "cs",
  "st",
  "monument",
  "baseline_point",
  "tie",
  "intersection",
  "other",
] as const;

export const HELIOS_EUCLID_HORIZONTAL_ELEMENT_TYPES = [
  "line",
  "circular_curve",
  "spiral",
] as const;

export const HELIOS_EUCLID_PROFILE_ROLES = [
  "existing_ground",
  "proposed_finished_grade",
  "proposed_subgrade",
  "milling_surface",
  "excavation_limit",
  "existing_streambed",
  "proposed_streambed",
  "culvert_invert",
  "utility_invert",
  "structural_control",
  "temporary_construction",
  "other",
] as const;

export const HELIOS_EUCLID_PROFILE_POINT_TYPES = [
  "profile_start",
  "profile_end",
  "pvc",
  "pvi",
  "pvt",
  "grade_break",
  "high_point",
  "low_point",
  "spot_elevation",
  "structure_limit",
  "construction_limit",
  "other",
] as const;

export const HELIOS_EUCLID_STRUCTURE_TYPES = [
  "bridge",
  "box_culvert",
  "pipe_culvert",
  "retaining_wall",
  "headwall",
  "drainage_structure",
  "utility_structure",
  "other",
] as const;

export const HELIOS_EUCLID_VALUE_ORIGINS = [
  "printed",
  "computed",
  "corrected",
] as const;

export const HELIOS_EUCLID_AUTHORITIES = [
  "coordinate_control",
  "dimensioned_geometry",
  "profile_geometry",
  "cross_section_geometry",
  "invert_geometry",
  "material_note",
  "calibrated_scale_fallback",
] as const;

export type HeliosEuclidModelStatus = (typeof HELIOS_EUCLID_MODEL_STATUSES)[number];
export type HeliosEuclidReviewState = (typeof HELIOS_EUCLID_REVIEW_STATES)[number];
export type HeliosEuclidLinearUnit = (typeof HELIOS_EUCLID_LINEAR_UNITS)[number];
export type HeliosEuclidCoordinateBasis = (typeof HELIOS_EUCLID_COORDINATE_BASES)[number];
export type HeliosEuclidReferenceState = (typeof HELIOS_EUCLID_REFERENCE_STATES)[number];
export type HeliosEuclidAlignmentType = (typeof HELIOS_EUCLID_ALIGNMENT_TYPES)[number];
export type HeliosEuclidControlPointType = (typeof HELIOS_EUCLID_CONTROL_POINT_TYPES)[number];
export type HeliosEuclidHorizontalElementType = (typeof HELIOS_EUCLID_HORIZONTAL_ELEMENT_TYPES)[number];
export type HeliosEuclidProfileRole = (typeof HELIOS_EUCLID_PROFILE_ROLES)[number];
export type HeliosEuclidProfilePointType = (typeof HELIOS_EUCLID_PROFILE_POINT_TYPES)[number];
export type HeliosEuclidStructureType = (typeof HELIOS_EUCLID_STRUCTURE_TYPES)[number];
export type HeliosEuclidValueOrigin = (typeof HELIOS_EUCLID_VALUE_ORIGINS)[number];
export type HeliosEuclidAuthority = (typeof HELIOS_EUCLID_AUTHORITIES)[number];

export type HeliosEuclidBoundary = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HeliosEuclidProvenance = {
  id: string;
  engineeringSourceId: string;
  documentId?: string;
  pageId: string;
  physicalPageNumber: number;
  sheetNumber?: string;
  viewKey?: string;
  locator: string;
  boundary?: HeliosEuclidBoundary;
  textSpanIds: string[];
  authority: HeliosEuclidAuthority;
  confidence: number;
};

/**
 * Every engineering value retains the printed value or deterministic method
 * that produced it. Geometry consumers must never receive an unexplained
 * normalized number.
 */
export type HeliosEuclidValue<T> = {
  id: string;
  value: T;
  origin: HeliosEuclidValueOrigin;
  printedValue?: string;
  printedPrecision?: number;
  formula?: string;
  inputValueIds: string[];
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidSpatialReference = {
  id: string;
  name: string;
  referenceState: HeliosEuclidReferenceState;
  coordinateBasis: HeliosEuclidCoordinateBasis;
  axisOrder: "northing_easting" | "easting_northing";
  horizontalUnit: HeliosEuclidLinearUnit;
  verticalUnit: HeliosEuclidLinearUnit;
  horizontalDatum?: string;
  horizontalDatumEpoch?: string;
  projectedCoordinateSystem?: string;
  epsgCode?: string;
  statePlaneZone?: string;
  verticalDatum?: string;
  verticalDatumEpoch?: string;
  geoidModel?: string;
  combinedScaleFactor?: number;
  convergenceAngleDegrees?: number;
  translationNorthing?: number;
  translationEasting?: number;
  rotationDegrees?: number;
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidStation = {
  /** Continuous measured distance along the alignment. */
  chainage: number;
  /** Station displayed on the source documents after station equations. */
  displayedStation: number;
  printedStation: string;
  stationEquationId?: string;
  chainageOrigin: HeliosEuclidValueOrigin;
  chainageFormula?: string;
  inputValueIds: string[];
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidStationEquation = {
  id: string;
  alignmentId: string;
  physicalChainage: HeliosEuclidValue<number>;
  backStation: HeliosEuclidValue<number>;
  aheadStation: HeliosEuclidValue<number>;
  printedEquation: string;
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidAlignment = {
  id: string;
  printedName: string;
  normalizedName: string;
  alignmentType: HeliosEuclidAlignmentType;
  spatialReferenceId: string;
  startStation: HeliosEuclidStation;
  endStation: HeliosEuclidStation;
  increasingDirection: string;
  sourceSheetNumbers: string[];
  reviewState: HeliosEuclidReviewState;
  completeness: "incomplete" | "complete" | "complete_with_limitations";
};

export type HeliosEuclidControlPoint = {
  id: string;
  alignmentId: string;
  pointType: HeliosEuclidControlPointType;
  name: string;
  station: HeliosEuclidStation;
  northing: HeliosEuclidValue<number>;
  easting: HeliosEuclidValue<number>;
  elevation?: HeliosEuclidValue<number>;
  reviewState: HeliosEuclidReviewState;
};

type HeliosEuclidHorizontalElementBase = {
  id: string;
  alignmentId: string;
  sequence: number;
  startStation: HeliosEuclidStation;
  endStation: HeliosEuclidStation;
  startPointId: string;
  endPointId: string;
  length: HeliosEuclidValue<number>;
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidLineElement = HeliosEuclidHorizontalElementBase & {
  elementType: "line";
  bearing: HeliosEuclidValue<string>;
};

export type HeliosEuclidCircularCurveElement = HeliosEuclidHorizontalElementBase & {
  elementType: "circular_curve";
  piPointId?: string;
  centerPointId?: string;
  rotation: "left" | "right";
  radius: HeliosEuclidValue<number>;
  deltaDegrees: HeliosEuclidValue<number>;
  tangentLength?: HeliosEuclidValue<number>;
  chordLength?: HeliosEuclidValue<number>;
};

export type HeliosEuclidSpiralElement = HeliosEuclidHorizontalElementBase & {
  elementType: "spiral";
  rotation: "left" | "right";
  startRadius?: HeliosEuclidValue<number>;
  endRadius?: HeliosEuclidValue<number>;
  aParameter?: HeliosEuclidValue<number>;
};

export type HeliosEuclidHorizontalElement =
  | HeliosEuclidLineElement
  | HeliosEuclidCircularCurveElement
  | HeliosEuclidSpiralElement;

export type HeliosEuclidProfile = {
  id: string;
  alignmentId: string;
  printedName: string;
  normalizedName: string;
  role: HeliosEuclidProfileRole;
  startStation: HeliosEuclidStation;
  endStation: HeliosEuclidStation;
  verticalDatum?: string;
  sourceSheetNumbers: string[];
  reviewState: HeliosEuclidReviewState;
  completeness: "incomplete" | "complete" | "complete_with_limitations";
};

export type HeliosEuclidProfilePoint = {
  id: string;
  profileId: string;
  pointType: HeliosEuclidProfilePointType;
  station: HeliosEuclidStation;
  elevation: HeliosEuclidValue<number>;
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidVerticalTangent = {
  id: string;
  profileId: string;
  sequence: number;
  startPointId: string;
  endPointId: string;
  gradePercent: HeliosEuclidValue<number>;
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidVerticalCurve = {
  id: string;
  profileId: string;
  sequence: number;
  curveType: "crest" | "sag" | "unclassified";
  symmetry: "symmetric" | "asymmetric";
  pvcPointId: string;
  pviPointId: string;
  pvtPointId: string;
  incomingGradePercent: HeliosEuclidValue<number>;
  outgoingGradePercent: HeliosEuclidValue<number>;
  length: HeliosEuclidValue<number>;
  incomingLength?: HeliosEuclidValue<number>;
  outgoingLength?: HeliosEuclidValue<number>;
  algebraicGradeDifferencePercent?: HeliosEuclidValue<number>;
  kValue?: HeliosEuclidValue<number>;
  printedHighLowPointId?: string;
  computedHighLowPointId?: string;
  solverVersion?: string;
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidTypicalSection = {
  id: string;
  alignmentId: string;
  name: string;
  stationStart: HeliosEuclidStation;
  stationEnd: HeliosEuclidStation;
  laneWidthLeft?: HeliosEuclidValue<number>;
  laneWidthRight?: HeliosEuclidValue<number>;
  shoulderWidthLeft?: HeliosEuclidValue<number>;
  shoulderWidthRight?: HeliosEuclidValue<number>;
  crossSlopeLeftPercent?: HeliosEuclidValue<number>;
  crossSlopeRightPercent?: HeliosEuclidValue<number>;
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidCrossSectionPoint = {
  id: string;
  alignmentId: string;
  station: HeliosEuclidStation;
  offset: HeliosEuclidValue<number>;
  elevation: HeliosEuclidValue<number>;
  surface: "existing" | "proposed" | "subgrade" | "excavation_limit";
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidStructure = {
  id: string;
  structureType: HeliosEuclidStructureType;
  printedName: string;
  primaryAlignmentId?: string;
  station?: HeliosEuclidStation;
  offset?: HeliosEuclidValue<number>;
  skewDegrees?: HeliosEuclidValue<number>;
  length?: HeliosEuclidValue<number>;
  width?: HeliosEuclidValue<number>;
  height?: HeliosEuclidValue<number>;
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidInvert = {
  id: string;
  alignmentId: string;
  structureId: string;
  station: HeliosEuclidStation;
  offset?: HeliosEuclidValue<number>;
  rimElevation?: HeliosEuclidValue<number>;
  invertElevation: HeliosEuclidValue<number>;
  pipeSize?: HeliosEuclidValue<string>;
  pipeMaterial?: HeliosEuclidValue<string>;
  pipeSlopePercent?: HeliosEuclidValue<number>;
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidMaterialLayer = {
  id: string;
  alignmentId: string;
  name: string;
  stationStart: HeliosEuclidStation;
  stationEnd: HeliosEuclidStation;
  offsetLeft?: HeliosEuclidValue<number>;
  offsetRight?: HeliosEuclidValue<number>;
  thickness: HeliosEuclidValue<number>;
  thicknessUnit: HeliosEuclidLinearUnit | "inch";
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidRelationship = {
  id: string;
  relationshipType:
    | "alignment_crossing"
    | "profile_for_alignment"
    | "structure_on_alignment"
    | "section_for_alignment"
    | "invert_for_alignment"
    | "material_for_alignment";
  sourceEntityId: string;
  targetEntityId: string;
  sourceStation?: HeliosEuclidStation;
  targetStation?: HeliosEuclidStation;
  offset?: HeliosEuclidValue<number>;
  elevation?: HeliosEuclidValue<number>;
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidIssue = {
  id: string;
  severity: "information" | "warning" | "blocking";
  code: string;
  message: string;
  entityIds: string[];
  provenanceIds: string[];
  status: "open" | "acknowledged" | "resolved" | "superseded";
};

export type HeliosEuclidModel = {
  id: string;
  companyId: string;
  projectId: string;
  packageId: string;
  packageRevision: number;
  schemaVersion: typeof HELIOS_EUCLID_SCHEMA_VERSION;
  processingVersion: number;
  sourceFingerprint: string;
  status: HeliosEuclidModelStatus;
  spatialReferences: HeliosEuclidSpatialReference[];
  provenance: HeliosEuclidProvenance[];
  alignments: HeliosEuclidAlignment[];
  controlPoints: HeliosEuclidControlPoint[];
  horizontalElements: HeliosEuclidHorizontalElement[];
  stationEquations: HeliosEuclidStationEquation[];
  profiles: HeliosEuclidProfile[];
  profilePoints: HeliosEuclidProfilePoint[];
  verticalTangents: HeliosEuclidVerticalTangent[];
  verticalCurves: HeliosEuclidVerticalCurve[];
  typicalSections: HeliosEuclidTypicalSection[];
  crossSectionPoints: HeliosEuclidCrossSectionPoint[];
  structures: HeliosEuclidStructure[];
  inverts: HeliosEuclidInvert[];
  materialLayers: HeliosEuclidMaterialLayer[];
  relationships: HeliosEuclidRelationship[];
  issues: HeliosEuclidIssue[];
  createdAt: number;
  updatedAt: number;
};

export type HeliosEuclidContractValidation = {
  valid: boolean;
  issues: Array<{
    code: string;
    message: string;
    entityId?: string;
  }>;
};

export type HeliosEuclidExportQualification = {
  eligible: boolean;
  reasons: string[];
  alignmentIds: string[];
  profileIds: string[];
  coordinateMode: "published" | "local";
};

function uniqueIds<T extends { id: string }>(
  rows: T[],
  label: string,
  issues: HeliosEuclidContractValidation["issues"],
) {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.id.trim()) {
      issues.push({ code: "missing_id", message: `${label} has no stable identifier.` });
      continue;
    }
    if (ids.has(row.id)) {
      issues.push({ code: "duplicate_id", message: `${label} identifier is duplicated.`, entityId: row.id });
    }
    ids.add(row.id);
  }
  return ids;
}

function validStationRange(start: HeliosEuclidStation, end: HeliosEuclidStation) {
  return Number.isFinite(start.chainage) && Number.isFinite(end.chainage) && end.chainage > start.chainage;
}

function collectEuclidValues(model: HeliosEuclidModel): HeliosEuclidValue<unknown>[] {
  const values: HeliosEuclidValue<unknown>[] = [];
  const add = (...candidates: Array<HeliosEuclidValue<unknown> | undefined>) => {
    for (const candidate of candidates) if (candidate) values.push(candidate);
  };

  for (const equation of model.stationEquations) add(equation.physicalChainage, equation.backStation, equation.aheadStation);
  for (const point of model.controlPoints) add(point.northing, point.easting, point.elevation);
  for (const element of model.horizontalElements) {
    add(element.length);
    if (element.elementType === "line") add(element.bearing);
    if (element.elementType === "circular_curve") add(element.radius, element.deltaDegrees, element.tangentLength, element.chordLength);
    if (element.elementType === "spiral") add(element.startRadius, element.endRadius, element.aParameter);
  }
  for (const point of model.profilePoints) add(point.elevation);
  for (const tangent of model.verticalTangents) add(tangent.gradePercent);
  for (const curve of model.verticalCurves) {
    add(
      curve.incomingGradePercent,
      curve.outgoingGradePercent,
      curve.length,
      curve.incomingLength,
      curve.outgoingLength,
      curve.algebraicGradeDifferencePercent,
      curve.kValue,
    );
  }
  for (const section of model.typicalSections) {
    add(
      section.laneWidthLeft,
      section.laneWidthRight,
      section.shoulderWidthLeft,
      section.shoulderWidthRight,
      section.crossSlopeLeftPercent,
      section.crossSlopeRightPercent,
    );
  }
  for (const point of model.crossSectionPoints) add(point.offset, point.elevation);
  for (const structure of model.structures) add(structure.offset, structure.skewDegrees, structure.length, structure.width, structure.height);
  for (const invert of model.inverts) add(invert.offset, invert.rimElevation, invert.invertElevation, invert.pipeSize, invert.pipeMaterial, invert.pipeSlopePercent);
  for (const layer of model.materialLayers) add(layer.offsetLeft, layer.offsetRight, layer.thickness);
  for (const relationship of model.relationships) add(relationship.offset, relationship.elevation);
  return values;
}

function collectStations(model: HeliosEuclidModel): HeliosEuclidStation[] {
  return [
    ...model.alignments.flatMap((row) => [row.startStation, row.endStation]),
    ...model.controlPoints.map((row) => row.station),
    ...model.horizontalElements.flatMap((row) => [row.startStation, row.endStation]),
    ...model.profiles.flatMap((row) => [row.startStation, row.endStation]),
    ...model.profilePoints.map((row) => row.station),
    ...model.typicalSections.flatMap((row) => [row.stationStart, row.stationEnd]),
    ...model.crossSectionPoints.map((row) => row.station),
    ...model.structures.flatMap((row) => row.station ? [row.station] : []),
    ...model.inverts.map((row) => row.station),
    ...model.materialLayers.flatMap((row) => [row.stationStart, row.stationEnd]),
    ...model.relationships.flatMap((row) => [row.sourceStation, row.targetStation].filter((station): station is HeliosEuclidStation => Boolean(station))),
  ];
}

/**
 * Validates frozen cross-workstream invariants only. Horizontal closure,
 * vertical-curve math, and quantity calculations belong to later deterministic
 * solvers and are deliberately outside Stage 4A.
 */
export function validateHeliosEuclidContract(model: HeliosEuclidModel): HeliosEuclidContractValidation {
  const issues: HeliosEuclidContractValidation["issues"] = [];
  if (model.schemaVersion !== HELIOS_EUCLID_SCHEMA_VERSION) {
    issues.push({ code: "schema_version", message: `Euclid schema version must be ${HELIOS_EUCLID_SCHEMA_VERSION}.` });
  }
  if (!model.companyId || !model.projectId || !model.packageId || model.packageRevision < 1) {
    issues.push({ code: "scope", message: "Euclid must be company-, project-, package-, and revision-bound." });
  }
  if (!model.sourceFingerprint.trim()) {
    issues.push({ code: "source_fingerprint", message: "Euclid requires an immutable source fingerprint." });
  }

  const spatialReferenceIds = uniqueIds(model.spatialReferences, "Spatial reference", issues);
  const provenanceIds = uniqueIds(model.provenance, "Provenance record", issues);
  const alignmentIds = uniqueIds(model.alignments, "Alignment", issues);
  const controlPointIds = uniqueIds(model.controlPoints, "Control point", issues);
  const profileIds = uniqueIds(model.profiles, "Profile", issues);
  const profilePointIds = uniqueIds(model.profilePoints, "Profile point", issues);
  uniqueIds(model.horizontalElements, "Horizontal element", issues);
  uniqueIds(model.stationEquations, "Station equation", issues);
  uniqueIds(model.verticalTangents, "Vertical tangent", issues);
  uniqueIds(model.verticalCurves, "Vertical curve", issues);
  uniqueIds(model.typicalSections, "Typical section", issues);
  uniqueIds(model.crossSectionPoints, "Cross-section point", issues);
  const structureIds = uniqueIds(model.structures, "Structure", issues);
  uniqueIds(model.inverts, "Invert", issues);
  uniqueIds(model.materialLayers, "Material layer", issues);
  uniqueIds(model.relationships, "Relationship", issues);
  uniqueIds(model.issues, "Issue", issues);

  const entityRows: Array<{ id: string }> = [
    ...model.spatialReferences,
    ...model.alignments,
    ...model.controlPoints,
    ...model.horizontalElements,
    ...model.stationEquations,
    ...model.profiles,
    ...model.profilePoints,
    ...model.verticalTangents,
    ...model.verticalCurves,
    ...model.typicalSections,
    ...model.crossSectionPoints,
    ...model.structures,
    ...model.inverts,
    ...model.materialLayers,
    ...model.relationships,
  ];
  const globalEntityIds = new Set<string>();
  for (const entity of entityRows) {
    if (globalEntityIds.has(entity.id)) {
      issues.push({ code: "ambiguous_entity_id", message: "Engineering entity IDs must be unique across the Euclid model.", entityId: entity.id });
    }
    globalEntityIds.add(entity.id);
  }

  for (const provenance of model.provenance) {
    if (!provenance.engineeringSourceId || !provenance.pageId || !provenance.locator.trim()) {
      issues.push({ code: "incomplete_provenance", message: "Engineering provenance requires a source, physical page, and locator.", entityId: provenance.id });
    }
    if (!Number.isInteger(provenance.physicalPageNumber) || provenance.physicalPageNumber < 1) {
      issues.push({ code: "invalid_physical_page", message: "Engineering provenance requires a one-based physical PDF page number.", entityId: provenance.id });
    }
    if (!Number.isFinite(provenance.confidence) || provenance.confidence < 0 || provenance.confidence > 100) {
      issues.push({ code: "invalid_confidence", message: "Engineering provenance confidence must be between 0 and 100.", entityId: provenance.id });
    }
    const boundary = provenance.boundary;
    if (
      boundary
      && (
        [boundary.x, boundary.y, boundary.width, boundary.height].some((part) => !Number.isFinite(part) || part < 0 || part > 1)
        || boundary.x + boundary.width > 1
        || boundary.y + boundary.height > 1
      )
    ) {
      issues.push({ code: "invalid_boundary", message: "Engineering provenance boundaries must use normalized page coordinates.", entityId: provenance.id });
    }
  }

  const engineeringValues = collectEuclidValues(model);
  const engineeringValueIds = uniqueIds(engineeringValues, "Engineering value", issues);
  for (const engineeringValue of engineeringValues) {
    if (!engineeringValue.provenanceIds.length) {
      issues.push({ code: "missing_provenance", message: "Every engineering value requires page-level provenance.", entityId: engineeringValue.id });
    }
    for (const provenanceId of engineeringValue.provenanceIds) {
      if (!provenanceIds.has(provenanceId)) issues.push({ code: "missing_provenance", message: "Engineering value cites missing provenance.", entityId: engineeringValue.id });
    }
    if (engineeringValue.origin === "printed" && !engineeringValue.printedValue?.trim()) {
      issues.push({ code: "missing_printed_value", message: "A printed engineering value must retain the source notation.", entityId: engineeringValue.id });
    }
    if (engineeringValue.origin === "computed" && (!engineeringValue.formula?.trim() || !engineeringValue.inputValueIds.length)) {
      issues.push({ code: "incomplete_computation", message: "A computed engineering value requires a deterministic formula and input value IDs.", entityId: engineeringValue.id });
    }
    for (const inputValueId of engineeringValue.inputValueIds) {
      if (!engineeringValueIds.has(inputValueId)) issues.push({ code: "missing_input_value", message: "Computed engineering value cites a missing input value.", entityId: engineeringValue.id });
    }
  }

  for (const station of collectStations(model)) {
    if (!Number.isFinite(station.chainage) || !Number.isFinite(station.displayedStation) || !station.printedStation.trim()) {
      issues.push({ code: "invalid_station", message: "Station records require finite chainage, displayed station, and retained printed notation." });
    }
    if (!station.provenanceIds.length || station.provenanceIds.some((id) => !provenanceIds.has(id))) {
      issues.push({ code: "missing_station_provenance", message: "Every station requires valid page-level provenance." });
    }
    if (station.chainageOrigin === "computed" && (!station.chainageFormula?.trim() || !station.inputValueIds.length)) {
      issues.push({ code: "incomplete_station_computation", message: "Computed chainage requires a deterministic formula and input value IDs." });
    }
  }

  for (const reference of model.spatialReferences) {
    for (const provenanceId of reference.provenanceIds) {
      if (!provenanceIds.has(provenanceId)) issues.push({ code: "missing_provenance", message: "Spatial reference cites missing provenance.", entityId: reference.id });
    }
    if (reference.referenceState === "known" && (!reference.horizontalDatum || !reference.projectedCoordinateSystem)) {
      issues.push({ code: "incomplete_reference", message: "A known coordinate reference requires a datum and projected coordinate system.", entityId: reference.id });
    }
  }

  for (const alignment of model.alignments) {
    if (!spatialReferenceIds.has(alignment.spatialReferenceId)) issues.push({ code: "missing_spatial_reference", message: "Alignment references an unknown spatial reference.", entityId: alignment.id });
    if (!validStationRange(alignment.startStation, alignment.endStation)) issues.push({ code: "invalid_station_range", message: "Alignment chainage must increase from start to end.", entityId: alignment.id });
  }

  for (const point of model.controlPoints) {
    if (!alignmentIds.has(point.alignmentId)) issues.push({ code: "missing_alignment", message: "Control point references an unknown alignment.", entityId: point.id });
  }
  for (const element of model.horizontalElements) {
    if (!alignmentIds.has(element.alignmentId)) issues.push({ code: "missing_alignment", message: "Horizontal element references an unknown alignment.", entityId: element.id });
    if (!controlPointIds.has(element.startPointId) || !controlPointIds.has(element.endPointId)) issues.push({ code: "missing_control_point", message: "Horizontal element requires valid start and end control points.", entityId: element.id });
    if (!validStationRange(element.startStation, element.endStation)) issues.push({ code: "invalid_station_range", message: "Horizontal element chainage must increase.", entityId: element.id });
  }
  for (const equation of model.stationEquations) {
    if (!alignmentIds.has(equation.alignmentId)) issues.push({ code: "missing_alignment", message: "Station equation references an unknown alignment.", entityId: equation.id });
  }

  for (const profile of model.profiles) {
    if (!alignmentIds.has(profile.alignmentId)) issues.push({ code: "missing_parent_alignment", message: "Profile must reference a valid horizontal alignment.", entityId: profile.id });
    if (!validStationRange(profile.startStation, profile.endStation)) issues.push({ code: "invalid_station_range", message: "Profile chainage must increase from start to end.", entityId: profile.id });
  }
  for (const point of model.profilePoints) {
    if (!profileIds.has(point.profileId)) issues.push({ code: "missing_profile", message: "Profile point references an unknown profile.", entityId: point.id });
  }
  for (const tangent of model.verticalTangents) {
    if (!profileIds.has(tangent.profileId)) issues.push({ code: "missing_profile", message: "Vertical tangent references an unknown profile.", entityId: tangent.id });
    if (!profilePointIds.has(tangent.startPointId) || !profilePointIds.has(tangent.endPointId)) issues.push({ code: "missing_profile_point", message: "Vertical tangent requires valid profile endpoints.", entityId: tangent.id });
  }
  for (const curve of model.verticalCurves) {
    if (!profileIds.has(curve.profileId)) issues.push({ code: "missing_profile", message: "Vertical curve references an unknown profile.", entityId: curve.id });
    for (const pointId of [curve.pvcPointId, curve.pviPointId, curve.pvtPointId]) {
      if (!profilePointIds.has(pointId)) issues.push({ code: "missing_profile_point", message: "Vertical curve requires valid PVC, PVI, and PVT points.", entityId: curve.id });
    }
    if (!curve.solverVersion && curve.reviewState === "accepted") issues.push({ code: "missing_solver_version", message: "An accepted vertical curve requires a deterministic solver version.", entityId: curve.id });
  }

  const alignmentChildren = [
    ...model.typicalSections,
    ...model.crossSectionPoints,
    ...model.inverts,
    ...model.materialLayers,
  ];
  for (const child of alignmentChildren) {
    if (!alignmentIds.has(child.alignmentId)) issues.push({ code: "missing_alignment", message: "Alignment child references an unknown alignment.", entityId: child.id });
  }
  for (const structure of model.structures) {
    if (structure.primaryAlignmentId && !alignmentIds.has(structure.primaryAlignmentId)) {
      issues.push({ code: "missing_alignment", message: "Structure references an unknown primary alignment.", entityId: structure.id });
    }
    if (!structure.provenanceIds.length || structure.provenanceIds.some((id) => !provenanceIds.has(id))) {
      issues.push({ code: "missing_provenance", message: "Engineering structures require valid page-level provenance.", entityId: structure.id });
    }
  }
  for (const invert of model.inverts) {
    if (!structureIds.has(invert.structureId)) {
      issues.push({ code: "missing_structure", message: "Invert records require a valid parent structure.", entityId: invert.id });
    }
  }

  const relationshipEntityIds = new Set([
    ...alignmentIds,
    ...controlPointIds,
    ...profileIds,
    ...profilePointIds,
    ...model.horizontalElements.map((row) => row.id),
    ...model.verticalTangents.map((row) => row.id),
    ...model.verticalCurves.map((row) => row.id),
    ...model.typicalSections.map((row) => row.id),
    ...model.crossSectionPoints.map((row) => row.id),
    ...structureIds,
    ...model.inverts.map((row) => row.id),
    ...model.materialLayers.map((row) => row.id),
  ]);
  for (const relationship of model.relationships) {
    if (!relationshipEntityIds.has(relationship.sourceEntityId) || !relationshipEntityIds.has(relationship.targetEntityId)) {
      issues.push({ code: "missing_relationship_entity", message: "Engineering relationships require valid source and target entities.", entityId: relationship.id });
    }
    if (!relationship.provenanceIds.length || relationship.provenanceIds.some((id) => !provenanceIds.has(id))) {
      issues.push({ code: "missing_provenance", message: "Engineering relationships require valid page-level provenance.", entityId: relationship.id });
    }
  }
  for (const engineeringIssue of model.issues) {
    if (engineeringIssue.provenanceIds.some((id) => !provenanceIds.has(id))) {
      issues.push({ code: "missing_provenance", message: "Engineering issue cites missing provenance.", entityId: engineeringIssue.id });
    }
    if (engineeringIssue.entityIds.some((id) => !globalEntityIds.has(id))) {
      issues.push({ code: "missing_issue_entity", message: "Engineering issue cites a missing Euclid entity.", entityId: engineeringIssue.id });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function deriveHeliosEuclidExportQualification(
  model: HeliosEuclidModel,
  input: {
    alignmentIds: string[];
    profileIds?: string[];
    allowAcknowledgedLocalCoordinates?: boolean;
  },
): HeliosEuclidExportQualification {
  const reasons: string[] = [];
  const validation = validateHeliosEuclidContract(model);
  if (!validation.valid) reasons.push("The Euclid contract is invalid.");
  const requestedAlignmentIds = [...new Set(input.alignmentIds)];
  const requestedProfileIds = [...new Set(input.profileIds || [])];
  if (!requestedAlignmentIds.length) reasons.push("Select at least one alignment.");

  const alignments = requestedAlignmentIds.map((id) => model.alignments.find((row) => row.id === id));
  if (alignments.some((alignment) => !alignment)) reasons.push("One or more selected alignments do not exist.");
  if (alignments.some((alignment) => alignment && alignment.reviewState !== "accepted")) reasons.push("Only accepted alignments can be exported.");
  if (alignments.some((alignment) => alignment && alignment.completeness === "incomplete")) reasons.push("Incomplete alignments cannot be exported.");

  const profiles = requestedProfileIds.map((id) => model.profiles.find((row) => row.id === id));
  if (profiles.some((profile) => !profile)) reasons.push("One or more selected profiles do not exist.");
  if (profiles.some((profile) => profile && profile.reviewState !== "accepted")) reasons.push("Only accepted profiles can be exported.");
  if (profiles.some((profile) => profile && !requestedAlignmentIds.includes(profile.alignmentId))) reasons.push("Every exported profile requires its accepted parent alignment.");

  const selectedReferenceIds = new Set(alignments.flatMap((alignment) => alignment ? [alignment.spatialReferenceId] : []));
  const references = [...selectedReferenceIds].map((id) => model.spatialReferences.find((row) => row.id === id));
  if (references.some((reference) => !reference || reference.reviewState !== "accepted")) reasons.push("Coordinate references must be accepted before export.");
  const local = references.some((reference) => reference?.coordinateBasis === "local" || reference?.referenceState === "local_only");
  const unknown = references.some((reference) => reference?.coordinateBasis === "unknown" || ["unknown", "conflicted", "partially_known"].includes(reference?.referenceState || "unknown"));
  if (unknown) reasons.push("Unknown or conflicted coordinate references block export.");
  if (local && !input.allowAcknowledgedLocalCoordinates) reasons.push("Local-coordinate export requires explicit acknowledgment.");

  const selectedIds = new Set([...requestedAlignmentIds, ...requestedProfileIds]);
  if (model.issues.some((issue) => issue.severity === "blocking" && issue.status === "open" && issue.entityIds.some((id) => selectedIds.has(id)))) {
    reasons.push("Open blocking issues affect the selected geometry.");
  }
  if (["stale", "superseded", "failed"].includes(model.status)) reasons.push("The current Euclid model is not exportable.");

  return {
    eligible: reasons.length === 0,
    reasons: [...new Set(reasons)],
    alignmentIds: requestedAlignmentIds,
    profileIds: requestedProfileIds,
    coordinateMode: local ? "local" : "published",
  };
}
