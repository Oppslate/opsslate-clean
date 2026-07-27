export const HELIOS_CIVIL_GEOMETRY_TYPES = ["horizontal_alignment", "vertical_alignment", "cross_section", "invert_network", "material_section"] as const;
export const HELIOS_CIVIL_GEOMETRY_AUTHORITIES = ["coordinate_control", "dimensioned_geometry", "profile_geometry", "cross_section_geometry", "invert_geometry", "material_note", "calibrated_scale_fallback"] as const;
export type HeliosCivilGeometryType = (typeof HELIOS_CIVIL_GEOMETRY_TYPES)[number];
export type HeliosCivilGeometryAuthority = (typeof HELIOS_CIVIL_GEOMETRY_AUTHORITIES)[number];

export type HeliosHorizontalPoint = { station: number; northing: number; easting: number; label: string };
export type HeliosHorizontalSegment = { kind: "tangent" | "curve"; stationStart: number; stationEnd: number; length: number; radius?: number; deltaDegrees?: number; bearing: string; label: string };
export type HeliosStationEquation = { backStation: number; aheadStation: number; label: string };
export type HeliosVerticalPoint = { station: number; elevation: number; label: string; gradePercent?: number };
export type HeliosCrossSectionPoint = { station: number; offset: number; elevation: number; surface: "existing" | "proposed" | "subgrade"; label: string };
export type HeliosInvertPoint = { structureId: string; station?: number; offset?: number; invertElevation: number; pipeSize: string; pipeMaterial: string };
export type HeliosMaterialLayer = { name: string; stationStart?: number; stationEnd?: number; offsetLeft?: number; offsetRight?: number; thickness: number; thicknessUnit: string };

export type HeliosCivilGeometryRecord = {
  id: string;
  geometryRunId: string;
  pageId: string;
  viewKey: string;
  sheetNumber: string;
  viewLabel: string;
  geometryType: HeliosCivilGeometryType;
  authority: HeliosCivilGeometryAuthority;
  alignmentName: string;
  sourceLocator: string;
  horizontalPoints: HeliosHorizontalPoint[];
  horizontalSegments: HeliosHorizontalSegment[];
  stationEquations: HeliosStationEquation[];
  verticalPoints: HeliosVerticalPoint[];
  crossSectionPoints: HeliosCrossSectionPoint[];
  invertPoints: HeliosInvertPoint[];
  materialLayers: HeliosMaterialLayer[];
  units: string;
  confidence: number;
  unresolvedIssues: string[];
  status: "proposed" | "accepted" | "rejected" | "superseded";
  reviewedByName?: string;
  reviewedAt?: number;
};

export type HeliosCivilGeometryModel = {
  id: string;
  planRunId: string;
  packageRevision: number;
  status: "queued" | "processing" | "ready_for_review" | "partially_ready" | "failed";
  sourceDocumentCount: number;
  recordCount: number;
  acceptedRecordCount: number;
  unresolvedIssueCount: number;
  records: HeliosCivilGeometryRecord[];
  createdAt: number;
  updatedAt: number;
};

export type HeliosCivilGeometryReviewInput = {
  action: "request_reconstruction" | "accept_geometry" | "reject_geometry";
  recordId?: string;
};

type RawGeometryDocument = {
  records: Array<Omit<HeliosCivilGeometryRecord, "id" | "geometryRunId" | "pageId" | "sheetNumber" | "viewLabel" | "status"> & { physicalPageNumber: number }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}
function numeric(value: unknown, minimum = -1_000_000_000, maximum = 1_000_000_000) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum ? value : undefined;
}
function enumValue<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === "string" && values.includes(value) ? value as T[number] : fallback;
}
function array(value: unknown, maximum: number) {
  return Array.isArray(value) ? value.slice(0, maximum) : [];
}

export function parseCivilGeometryDocument(value: unknown, sourcePageCount: number): RawGeometryDocument {
  if (!isRecord(value)) throw new Error("Civil geometry result must be an object.");
  const records: RawGeometryDocument["records"] = [];
  for (const candidate of array(value.records, 2_000)) {
    if (!isRecord(candidate)) continue;
    const physicalPageNumber = numeric(candidate.physicalPageNumber, 1, sourcePageCount);
    if (!physicalPageNumber || !Number.isInteger(physicalPageNumber)) continue;
    const geometryType = enumValue(candidate.geometryType, HELIOS_CIVIL_GEOMETRY_TYPES, "horizontal_alignment");
    const horizontalPoints = array(candidate.horizontalPoints, 10_000).flatMap((point) => {
      if (!isRecord(point)) return [];
      const station = numeric(point.station); const northing = numeric(point.northing); const easting = numeric(point.easting);
      return station === undefined || northing === undefined || easting === undefined ? [] : [{ station, northing, easting, label: text(point.label, 160) }];
    });
    const horizontalSegments = array(candidate.horizontalSegments, 10_000).flatMap((segment) => {
      if (!isRecord(segment)) return [];
      const stationStart = numeric(segment.stationStart); const stationEnd = numeric(segment.stationEnd); const length = numeric(segment.length, Number.EPSILON);
      if (stationStart === undefined || stationEnd === undefined || length === undefined) return [];
      return [{ kind: enumValue(segment.kind, ["tangent", "curve"] as const, "tangent"), stationStart, stationEnd, length, radius: numeric(segment.radius, Number.EPSILON), deltaDegrees: numeric(segment.deltaDegrees, Number.EPSILON, 360), bearing: text(segment.bearing, 120), label: text(segment.label, 160) }];
    });
    const stationEquations = array(candidate.stationEquations, 1_000).flatMap((equation) => {
      if (!isRecord(equation)) return [];
      const backStation = numeric(equation.backStation); const aheadStation = numeric(equation.aheadStation);
      return backStation === undefined || aheadStation === undefined ? [] : [{ backStation, aheadStation, label: text(equation.label, 160) }];
    });
    const verticalPoints = array(candidate.verticalPoints, 10_000).flatMap((point) => {
      if (!isRecord(point)) return [];
      const station = numeric(point.station); const elevation = numeric(point.elevation); const gradePercent = numeric(point.gradePercent, -100, 100);
      return station === undefined || elevation === undefined ? [] : [{ station, elevation, label: text(point.label, 160), gradePercent }];
    });
    const crossSectionPoints = array(candidate.crossSectionPoints, 30_000).flatMap((point) => {
      if (!isRecord(point)) return [];
      const station = numeric(point.station); const offset = numeric(point.offset); const elevation = numeric(point.elevation);
      if (station === undefined || offset === undefined || elevation === undefined) return [];
      return [{ station, offset, elevation, surface: enumValue(point.surface, ["existing", "proposed", "subgrade"] as const, "proposed"), label: text(point.label, 160) }];
    });
    const invertPoints = array(candidate.invertPoints, 10_000).flatMap((point) => {
      if (!isRecord(point)) return [];
      const invertElevation = numeric(point.invertElevation);
      if (invertElevation === undefined) return [];
      return [{ structureId: text(point.structureId, 160), station: numeric(point.station), offset: numeric(point.offset), invertElevation, pipeSize: text(point.pipeSize, 120), pipeMaterial: text(point.pipeMaterial, 160) }];
    });
    const materialLayers = array(candidate.materialLayers, 2_000).flatMap((layer) => {
      if (!isRecord(layer)) return [];
      const thickness = numeric(layer.thickness, Number.EPSILON, 10_000);
      if (thickness === undefined) return [];
      return [{ name: text(layer.name, 200), stationStart: numeric(layer.stationStart), stationEnd: numeric(layer.stationEnd), offsetLeft: numeric(layer.offsetLeft), offsetRight: numeric(layer.offsetRight), thickness, thicknessUnit: text(layer.thicknessUnit, 40) }];
    });
    const hasGeometry = horizontalPoints.length || horizontalSegments.length || stationEquations.length || verticalPoints.length || crossSectionPoints.length || invertPoints.length || materialLayers.length;
    if (!hasGeometry) continue;
    records.push({
      physicalPageNumber,
      viewKey: text(candidate.viewKey, 120),
      geometryType,
      authority: enumValue(candidate.authority, HELIOS_CIVIL_GEOMETRY_AUTHORITIES, "dimensioned_geometry"),
      alignmentName: text(candidate.alignmentName, 240),
      sourceLocator: text(candidate.sourceLocator, 500),
      horizontalPoints,
      horizontalSegments,
      stationEquations,
      verticalPoints,
      crossSectionPoints,
      invertPoints,
      materialLayers,
      units: text(candidate.units, 40),
      confidence: numeric(candidate.confidence, 0, 100) ?? 0,
      unresolvedIssues: array(candidate.unresolvedIssues, 40).map((item) => text(item, 500)).filter(Boolean),
      reviewedByName: undefined,
      reviewedAt: undefined,
    });
  }
  return { records };
}

export function normalizeCivilGeometryReviewInput(value: unknown): HeliosCivilGeometryReviewInput {
  if (!isRecord(value)) throw new Error("Civil-geometry action must be an object.");
  const action = enumValue(value.action, ["request_reconstruction", "accept_geometry", "reject_geometry"] as const, "" as HeliosCivilGeometryReviewInput["action"]);
  if (!action) throw new Error("Select a valid civil-geometry action.");
  const recordId = text(value.recordId, 128) || undefined;
  if (action !== "request_reconstruction" && !recordId) throw new Error("Select a civil-geometry record.");
  return { action, recordId };
}

export function horizontalAlignmentLength(points: HeliosHorizontalPoint[], segments: HeliosHorizontalSegment[] = []) {
  if (segments.length) {
    if (segments.some((segment) => segment.length <= 0 || segment.stationEnd <= segment.stationStart)) throw new Error("Horizontal alignment segments must have valid stationing and positive lengths.");
    return segments.reduce((sum, segment) => sum + segment.length, 0);
  }
  if (points.length < 2) throw new Error("Horizontal alignment requires at least two accepted control points.");
  const sorted = [...points].sort((a, b) => a.station - b.station);
  return sorted.slice(1).reduce((sum, point, index) => {
    const prior = sorted[index];
    return sum + Math.hypot(point.northing - prior.northing, point.easting - prior.easting);
  }, 0);
}

export function verticalAlignmentLength(points: HeliosVerticalPoint[]) {
  if (points.length < 2) throw new Error("Vertical alignment requires at least two accepted profile points.");
  const sorted = [...points].sort((a, b) => a.station - b.station);
  return sorted.slice(1).reduce((sum, point, index) => {
    const prior = sorted[index];
    return sum + Math.hypot(point.station - prior.station, point.elevation - prior.elevation);
  }, 0);
}

export function averageEndAreaVolume(sections: Array<{ station: number; areaSquareFeet: number }>) {
  if (sections.length < 2) throw new Error("Average-end-area volume requires at least two cross sections.");
  const sorted = [...sections].sort((a, b) => a.station - b.station);
  return sorted.slice(1).reduce((sum, section, index) => {
    const prior = sorted[index];
    if (section.station <= prior.station || section.areaSquareFeet < 0 || prior.areaSquareFeet < 0) throw new Error("Cross-section stationing and areas must be valid.");
    return sum + ((prior.areaSquareFeet + section.areaSquareFeet) / 2) * (section.station - prior.station) / 27;
  }, 0);
}

export function materialLayerVolumeCubicYards(input: { lengthFeet: number; widthFeet: number; thickness: number; thicknessUnit: "IN" | "FT" }) {
  if (input.lengthFeet <= 0 || input.widthFeet <= 0 || input.thickness <= 0) throw new Error("Material geometry must be greater than zero.");
  const thicknessFeet = input.thicknessUnit === "IN" ? input.thickness / 12 : input.thickness;
  return input.lengthFeet * input.widthFeet * thicknessFeet / 27;
}

function crossSectionArea(points: HeliosCrossSectionPoint[]) {
  const existing = new Map(points.filter((point) => point.surface === "existing").map((point) => [point.offset, point.elevation]));
  const designPoints = points.filter((point) => point.surface === "subgrade").length
    ? points.filter((point) => point.surface === "subgrade")
    : points.filter((point) => point.surface === "proposed");
  const pairs = designPoints.flatMap((point) => {
    const existingElevation = existing.get(point.offset);
    return existingElevation === undefined ? [] : [{ offset: point.offset, depth: Math.abs(existingElevation - point.elevation) }];
  }).sort((a, b) => a.offset - b.offset);
  if (pairs.length < 2) throw new Error("Cross-section quantity requires matching existing and design offsets.");
  return pairs.slice(1).reduce((sum, point, index) => {
    const prior = pairs[index];
    return sum + ((prior.depth + point.depth) / 2) * (point.offset - prior.offset);
  }, 0);
}

function invertNetworkLength(points: HeliosInvertPoint[]) {
  const positioned = points.filter((point): point is HeliosInvertPoint & { station: number; offset: number } => point.station !== undefined && point.offset !== undefined).sort((a, b) => a.station - b.station);
  if (positioned.length < 2) throw new Error("Invert geometry requires at least two station-and-offset points.");
  return positioned.slice(1).reduce((sum, point, index) => {
    const prior = positioned[index];
    return sum + Math.hypot(point.station - prior.station, point.offset - prior.offset, point.invertElevation - prior.invertElevation);
  }, 0);
}

export function deriveCivilGeometryQuantity(
  records: Array<Pick<HeliosCivilGeometryRecord, "geometryType" | "horizontalPoints" | "horizontalSegments" | "verticalPoints" | "crossSectionPoints" | "invertPoints" | "materialLayers">>,
  measurementType: "count" | "length" | "area" | "volume",
) {
  if (!records.length) throw new Error("Select accepted civil geometry.");
  if (measurementType === "count") {
    const identifiers = new Set(records.flatMap((record) => record.invertPoints.map((point) => point.structureId).filter(Boolean)));
    if (!identifiers.size) throw new Error("The accepted geometry does not contain countable object identifiers.");
    return { value: identifiers.size, unit: "EA", formula: `${identifiers.size} unique accepted structure identifiers` };
  }
  if (measurementType === "length") {
    const parts = records.flatMap((record) => {
      if (record.horizontalSegments.length || record.horizontalPoints.length >= 2) return [{ value: horizontalAlignmentLength(record.horizontalPoints, record.horizontalSegments), basis: record.horizontalSegments.length ? "control-sheet tangent/curve lengths" : "horizontal control coordinates" }];
      if (record.verticalPoints.length >= 2) return [{ value: verticalAlignmentLength(record.verticalPoints), basis: "profile station/elevation" }];
      if (record.invertPoints.length >= 2) return [{ value: invertNetworkLength(record.invertPoints), basis: "station/offset/invert geometry" }];
      return [];
    });
    if (!parts.length) throw new Error("The accepted geometry does not contain a complete linear alignment.");
    const value = parts.reduce((sum, part) => sum + part.value, 0);
    return { value, unit: "FT", formula: parts.map((part) => `${part.value} FT from ${part.basis}`).join(" + ") };
  }
  if (measurementType === "area") {
    const areas = records.flatMap((record) => record.materialLayers.flatMap((layer) => {
      if (layer.stationStart === undefined || layer.stationEnd === undefined || layer.offsetLeft === undefined || layer.offsetRight === undefined) return [];
      return [Math.abs(layer.stationEnd - layer.stationStart) * Math.abs(layer.offsetRight - layer.offsetLeft)];
    }));
    if (!areas.length) throw new Error("The accepted material geometry does not contain station and width limits.");
    const value = areas.reduce((sum, area) => sum + area, 0);
    return { value, unit: "SF", formula: `${value} SF from accepted station limits × section widths` };
  }
  const materialVolumes = records.flatMap((record) => record.materialLayers.flatMap((layer) => {
    if (layer.stationStart === undefined || layer.stationEnd === undefined || layer.offsetLeft === undefined || layer.offsetRight === undefined || !["IN", "FT"].includes(layer.thicknessUnit.toUpperCase())) return [];
    const value = materialLayerVolumeCubicYards({ lengthFeet: Math.abs(layer.stationEnd - layer.stationStart), widthFeet: Math.abs(layer.offsetRight - layer.offsetLeft), thickness: layer.thickness, thicknessUnit: layer.thicknessUnit.toUpperCase() as "IN" | "FT" });
    return [{ station: layer.stationStart, value, label: layer.name }];
  }));
  if (materialVolumes.length) {
    const value = materialVolumes.reduce((sum, row) => sum + row.value, 0);
    return { value, unit: "CY", formula: materialVolumes.map((row) => `${row.label} ${row.value} CY`).join(" + ") };
  }
  const sectionAreas = records.flatMap((record) => {
    const stations = [...new Set(record.crossSectionPoints.map((point) => point.station))];
    return stations.map((station) => ({ station, areaSquareFeet: crossSectionArea(record.crossSectionPoints.filter((point) => point.station === station)) }));
  });
  if (sectionAreas.length >= 2) {
    const value = averageEndAreaVolume(sectionAreas);
    return { value, unit: "CY", formula: `${value} CY by average end area from ${sectionAreas.length} accepted cross sections` };
  }
  throw new Error("The accepted geometry does not support this deterministic volume calculation.");
}
