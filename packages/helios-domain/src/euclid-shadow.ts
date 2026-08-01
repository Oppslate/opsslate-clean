import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  HELIOS_EUCLID_HORIZONTAL_DEFAULT_TOLERANCES,
  resolveHeliosEuclidStationEquations,
} from "./euclid-horizontal.ts";
import {
  HELIOS_EUCLID_SCHEMA_VERSION,
  validateHeliosEuclidContract,
  type HeliosEuclidAlignment,
  type HeliosEuclidAuthority,
  type HeliosEuclidControlPoint,
  type HeliosEuclidCrossSectionPoint,
  type HeliosEuclidHorizontalElement,
  type HeliosEuclidInvert,
  type HeliosEuclidIssue,
  type HeliosEuclidLinearUnit,
  type HeliosEuclidMaterialLayer,
  type HeliosEuclidModel,
  type HeliosEuclidProfile,
  type HeliosEuclidProfilePoint,
  type HeliosEuclidProvenance,
  type HeliosEuclidRelationship,
  type HeliosEuclidReviewState,
  type HeliosEuclidStation,
  type HeliosEuclidStationEquation,
  type HeliosEuclidStructure,
  type HeliosEuclidTypicalSection,
  type HeliosEuclidValue,
  type HeliosEuclidVerticalCurve,
  type HeliosEuclidVerticalTangent,
} from "./euclid-contract.ts";
import { HELIOS_EUCLID_VERTICAL_SOLVER } from "./euclid-vertical.ts";

export const HELIOS_EUCLID_SHADOW_VERSION = 3;
export const HELIOS_EUCLID_SHADOW_ADAPTER = "canonical-civil-geometry-v3";

export const HELIOS_EUCLID_ENTITY_TYPES = [
  "spatial_reference",
  "alignment",
  "control_point",
  "horizontal_element",
  "station_equation",
  "profile",
  "profile_point",
  "vertical_tangent",
  "vertical_curve",
  "typical_section",
  "cross_section_point",
  "structure",
  "invert",
  "material_layer",
  "relationship",
  "issue",
] as const;

export type HeliosEuclidEntityType = (typeof HELIOS_EUCLID_ENTITY_TYPES)[number];

export type HeliosEuclidLegacyGeometryRecord = {
  id: string;
  documentId?: string;
  engineeringSourceId: string;
  engineeringPageId: string;
  physicalPageNumber: number;
  sheetNumber?: string;
  viewKey?: string;
  geometryType: "horizontal_alignment" | "vertical_alignment" | "cross_section" | "invert_network" | "material_section";
  authority: HeliosEuclidAuthority;
  alignmentName: string;
  sourceLocator: string;
  verticalDatum?: string;
  units: string;
  confidence: number;
  status: "proposed" | "accepted" | "rejected" | "superseded";
  unresolvedIssues: string[];
  horizontalPoints: Array<{ station: number; northing: number; easting: number; label: string }>;
  horizontalSegments: Array<{
    kind: "tangent" | "curve";
    stationStart: number;
    stationEnd: number;
    length: number;
    radius?: number;
    deltaDegrees?: number;
    bearing: string;
    label: string;
  }>;
  stationEquations: Array<{ backStation: number; aheadStation: number; label: string }>;
  verticalPoints: Array<{ station: number; elevation: number; label: string; gradePercent?: number }>;
  typicalSections?: Array<{
    name: string;
    stationStart: number;
    stationEnd: number;
    laneWidthLeft?: number;
    laneWidthRight?: number;
    shoulderWidthLeft?: number;
    shoulderWidthRight?: number;
    crossSlopeLeftPercent?: number;
    crossSlopeRightPercent?: number;
  }>;
  crossSectionPoints: Array<{
    station: number;
    offset: number;
    elevation: number;
    surface: "existing" | "proposed" | "subgrade";
    label: string;
  }>;
  invertPoints: Array<{
    structureId: string;
    station?: number;
    offset?: number;
    invertElevation: number;
    pipeSize: string;
    pipeMaterial: string;
  }>;
  materialLayers: Array<{
    name: string;
    stationStart?: number;
    stationEnd?: number;
    offsetLeft?: number;
    offsetRight?: number;
    thickness: number;
    thicknessUnit: string;
  }>;
};

export type BuildHeliosEuclidShadowInput = {
  id: string;
  companyId: string;
  projectId: string;
  packageId: string;
  packageRevision: number;
  engineeringRecordId: string;
  geometryRunId: string;
  sourceFingerprint: string;
  processingVersion: number;
  records: HeliosEuclidLegacyGeometryRecord[];
  createdAt: number;
};

export type HeliosEuclidEntityChunk = {
  entityType: HeliosEuclidEntityType;
  chunkIndex: number;
  entityCount: number;
  payloadJson: string;
  payloadFingerprint: string;
};

export class HeliosEuclidShadowError extends Error {}

function stableKey(value: unknown) {
  return buildHeliosEngineeringParityFingerprint(value).split(":")[1]!.slice(0, 20);
}

function boundedText(value: string, fallback: string, maximum = 300) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return (normalized || fallback).slice(0, maximum);
}

function normalizedAlignmentKey(name: string, recordId: string) {
  const normalized = boundedText(name, "")
    .toLocaleLowerCase()
    .replace(/\bt\s*\.?\s*g\s*\.?\s*l\s*\.?(?=\W|$)/g, " theoretical grade line ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bave\b/g, "avenue")
    .replace(/\brd\b/g, "road")
    .replace(/\brte\b/g, "route")
    .replace(/\b(?:final|proposed|finished|design)\b/g, " ")
    .replace(/\btheoretical grade line\b/g, " ")
    .replace(/\b(?:roadway|road) profile(?: line)?\b/g, " ")
    .replace(/\b(?:center ?line|station line)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized && !["unknown", "not stated", "n a", "na"].includes(normalized)
    ? normalized
    : `unnamed ${recordId}`;
}

function reviewState(status: HeliosEuclidLegacyGeometryRecord["status"]): HeliosEuclidReviewState {
  if (status === "accepted") return "accepted";
  if (status === "rejected") return "rejected";
  if (status === "superseded") return "superseded";
  return "proposed";
}

function linearUnit(units: string): HeliosEuclidLinearUnit {
  const normalized = units.trim().toLocaleLowerCase();
  if (normalized.includes("meter") || normalized === "m") return "meter";
  if (normalized.includes("international")) return "international_foot";
  if (normalized.includes("survey") && /foot|feet|\bft\b/.test(normalized)) return "us_survey_foot";
  return "unknown";
}

function printedStation(value: number) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const major = Math.floor(absolute / 100);
  const minor = (absolute - major * 100).toFixed(2).padStart(5, "0");
  return `${sign}${major}+${minor}`;
}

function station(
  value: number,
  record: HeliosEuclidLegacyGeometryRecord,
  suffix: string,
): HeliosEuclidStation {
  return {
    chainage: value,
    displayedStation: value,
    printedStation: printedStation(value),
    chainageOrigin: "computed",
    chainageFormula: "identity(displayed station); no accepted station equation applied",
    inputValueIds: [`legacy-station:${record.id}:${suffix}`],
    provenanceIds: [`provenance:${record.id}`],
    reviewState: reviewState(record.status),
  };
}

function engineeringValue<T>(
  value: T,
  record: HeliosEuclidLegacyGeometryRecord,
  suffix: string,
  printed?: string,
): HeliosEuclidValue<T> {
  return {
    id: `value:${record.id}:${suffix}`,
    value,
    origin: "printed",
    printedValue: boundedText(printed ?? String(value), String(value), 180),
    inputValueIds: [],
    provenanceIds: [`provenance:${record.id}`],
    reviewState: reviewState(record.status),
  };
}

function computedEngineeringValue(
  value: number,
  record: HeliosEuclidLegacyGeometryRecord,
  suffix: string,
  formula: string,
  inputValueIds: string[],
  provenanceIds: string[],
): HeliosEuclidValue<number> {
  return {
    id: `value:${record.id}:${suffix}`,
    value,
    origin: "computed",
    formula,
    inputValueIds: [...new Set(inputValueIds)].sort(),
    provenanceIds: [...new Set(provenanceIds)].sort(),
    reviewState: reviewState(record.status),
  };
}

function alignmentType(name: string, records: HeliosEuclidLegacyGeometryRecord[]): HeliosEuclidAlignment["alignmentType"] {
  const normalized = name.toLocaleLowerCase();
  if (/stream|creek|river|channel|run\b/.test(normalized)) return "stream_channel";
  if (/sewer|water|gas|electric|utility|fiber|communication/.test(normalized)) return "utility_alignment";
  if (/bridge|culvert|structure/.test(normalized)) return "structure_baseline";
  if (/survey|baseline|control/.test(normalized)) return "survey_baseline";
  if (/road|route|street|avenue|\bave\b|highway|parkway|boulevard|\bblvd\b/.test(normalized)) return "roadway_centerline";
  if (records.every((record) => record.geometryType === "vertical_alignment")) return "other";
  return "other";
}

function pointType(label: string): HeliosEuclidControlPoint["pointType"] {
  const token = label.toLocaleUpperCase().match(/\b(POB|POT|PC|PI|PT|PCC|PRC|TS|SC|CS|ST)\b/)?.[1]?.toLocaleLowerCase();
  return (token as HeliosEuclidControlPoint["pointType"] | undefined) || "other";
}

function profilePointType(label: string): HeliosEuclidProfilePoint["pointType"] {
  const normalized = label.toLocaleLowerCase();
  if (/\bpvc\b/.test(normalized)) return "pvc";
  if (/\bpvi\b/.test(normalized)) return "pvi";
  if (/\bpvt\b/.test(normalized)) return "pvt";
  if (/high point/.test(normalized)) return "high_point";
  if (/low point/.test(normalized)) return "low_point";
  if (/grade break/.test(normalized)) return "grade_break";
  return "spot_elevation";
}

function printedProfileNumber(label: string, token: "L" | "G1" | "G2") {
  const match = label.match(new RegExp(`\\b${token}\\s*=\\s*([+-]?\\d+(?:\\.\\d+)?)`, "i"));
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

function profileRole(record: HeliosEuclidLegacyGeometryRecord): HeliosEuclidProfile["role"] {
  const text = `${record.alignmentName} ${record.sourceLocator} ${record.verticalPoints.map((point) => point.label).join(" ")}`.toLocaleLowerCase();
  if (/existing ground|existing grade/.test(text)) return "existing_ground";
  if (/subgrade/.test(text)) return "proposed_subgrade";
  if (/streambed/.test(text)) return /existing/.test(text) ? "existing_streambed" : "proposed_streambed";
  if (/invert/.test(text)) return "culvert_invert";
  if (/proposed|finished|final grade|design grade|theoretical grade line|\bt\s*\.?\s*g\s*\.?\s*l\s*\.?(?=\W|$)/.test(text)) return "proposed_finished_grade";
  return "other";
}

type HeliosEuclidVerticalSeries = {
  key: string;
  role: HeliosEuclidProfile["role"];
  points: HeliosEuclidLegacyGeometryRecord["verticalPoints"];
};

function verticalProfileSeries(record: HeliosEuclidLegacyGeometryRecord): HeliosEuclidVerticalSeries[] {
  const isExistingGround = (label: string) => /\bexisting (?:ground|grade|roadway|surface)\b/i.test(label);
  const isProposedGrade = (label: string) =>
    /\b(?:final|proposed|finished|design) (?:t\s*\.?\s*g\s*\.?\s*l\s*\.?|grade|roadway|surface)\b|\btheoretical grade line\b|\bt\s*\.?\s*g\s*\.?\s*l\s*\.?(?=\W|$)|\b(?:pvc|pvi|pvt|high point|low point|grade break)\b/i.test(label);

  const hasExistingGround = record.verticalPoints.some((point) => isExistingGround(point.label));
  const hasProposedGrade = record.verticalPoints.some((point) => isProposedGrade(point.label));
  if (!hasExistingGround || !hasProposedGrade) {
    return [{ key: "profile", role: profileRole(record), points: record.verticalPoints }];
  }

  // Roadway profile sheets commonly print existing-ground and FINAL T.G.L.
  // ordinates in the same view. Existing labels remain their own surface; all
  // other design controls (PVC/PVI/PVT, grades, and T.G.L. ordinates) form the
  // proposed centerline profile.
  const existingGround = record.verticalPoints.filter((point) => isExistingGround(point.label));
  const proposedGrade = record.verticalPoints.filter((point) => !isExistingGround(point.label));
  const series: HeliosEuclidVerticalSeries[] = [
    { key: "existing-ground", role: "existing_ground", points: existingGround },
    { key: "proposed-finished-grade", role: "proposed_finished_grade", points: proposedGrade },
  ];
  return series.filter((row) => row.points.length > 0);
}

function stationCandidates(record: HeliosEuclidLegacyGeometryRecord) {
  return [
    ...record.horizontalPoints.map((point) => point.station),
    ...record.horizontalSegments.flatMap((segment) => [segment.stationStart, segment.stationEnd]),
    ...record.verticalPoints.map((point) => point.station),
    ...record.crossSectionPoints.map((point) => point.station),
    ...record.invertPoints.flatMap((point) => point.station === undefined ? [] : [point.station]),
    ...record.materialLayers.flatMap((layer) => [layer.stationStart, layer.stationEnd].filter((value): value is number => value !== undefined)),
  ].filter(Number.isFinite);
}

function provenance(record: HeliosEuclidLegacyGeometryRecord): HeliosEuclidProvenance {
  return {
    id: `provenance:${record.id}`,
    engineeringSourceId: record.engineeringSourceId,
    documentId: record.documentId,
    pageId: record.engineeringPageId,
    physicalPageNumber: record.physicalPageNumber,
    sheetNumber: record.sheetNumber,
    viewKey: record.viewKey,
    locator: boundedText(record.sourceLocator, `Physical PDF page ${record.physicalPageNumber}`),
    textSpanIds: [],
    authority: record.authority,
    confidence: Math.max(0, Math.min(100, record.confidence)),
  };
}

function addIssue(
  issues: HeliosEuclidIssue[],
  record: HeliosEuclidLegacyGeometryRecord,
  code: string,
  message: string,
  entityIds: string[],
  severity: HeliosEuclidIssue["severity"] = "warning",
) {
  issues.push({
    id: `issue:${record.id}:${code}:${issues.length + 1}`,
    severity,
    code,
    message: boundedText(message, code, 600),
    entityIds,
    provenanceIds: [`provenance:${record.id}`],
    status: "open",
  });
}

type HorizontalSegmentCandidate = {
  key: string;
  record: HeliosEuclidLegacyGeometryRecord;
  index: number;
  segment: HeliosEuclidLegacyGeometryRecord["horizontalSegments"][number];
  rotation?: "left" | "right";
};

type HorizontalChainPrimitive = {
  kind: "line" | "curve";
  stationStart: number;
  stationEnd: number;
  length: number;
  record: HeliosEuclidLegacyGeometryRecord;
  candidate?: HorizontalSegmentCandidate;
  rotation?: "left" | "right";
  radius?: number;
  deltaDegrees?: number;
  bearing?: string;
};

function curveRotation(label: string) {
  if (/\bleft\b|\blt\b/i.test(label)) return "left" as const;
  if (/\bright\b|\brt\b/i.test(label)) return "right" as const;
  return undefined;
}

function coordinateDistance(
  start: Pick<HeliosEuclidControlPoint, "northing" | "easting">,
  end: Pick<HeliosEuclidControlPoint, "northing" | "easting">,
) {
  return Math.hypot(end.northing.value - start.northing.value, end.easting.value - start.easting.value);
}

function relativeHorizontalChain(primitives: HorizontalChainPrimitive[]) {
  let northing = 0;
  let easting = 0;
  let headingRadians = 0;
  for (const primitive of primitives) {
    if (primitive.kind === "line") {
      northing += primitive.length * Math.cos(headingRadians);
      easting += primitive.length * Math.sin(headingRadians);
      continue;
    }
    const rotationSign = primitive.rotation === "right" ? 1 : -1;
    const radius = primitive.radius!;
    const endHeading = headingRadians + rotationSign * primitive.deltaDegrees! * Math.PI / 180;
    northing += radius / rotationSign * (Math.sin(endHeading) - Math.sin(headingRadians));
    easting += radius / rotationSign * (Math.cos(headingRadians) - Math.cos(endHeading));
    headingRadians = endHeading;
  }
  return { northing, easting, headingRadians };
}

function rotateHorizontalVector(northing: number, easting: number, headingRadians: number) {
  return {
    northing: northing * Math.cos(headingRadians) - easting * Math.sin(headingRadians),
    easting: northing * Math.sin(headingRadians) + easting * Math.cos(headingRadians),
  };
}

/**
 * Curve tables commonly print PC/PT stations, radius, arc length, delta and
 * direction without repeating PC/PT coordinates. When two authoritative
 * coordinate anchors bracket those controls, the complete intervening chain
 * has one deterministic rotation into the project grid. This preserves the
 * printed curve instead of silently dropping it, while retaining the anchor
 * closure residual as a review issue.
 */
function appendHorizontalGeometry(input: {
  alignment: HeliosEuclidAlignment;
  records: HeliosEuclidLegacyGeometryRecord[];
  controlPoints: HeliosEuclidControlPoint[];
  horizontalElements: HeliosEuclidHorizontalElement[];
  issues: HeliosEuclidIssue[];
}) {
  const { alignment, records, controlPoints, horizontalElements, issues } = input;
  const alignmentPoints = controlPoints
    .filter((point) => point.alignmentId === alignment.id)
    .sort((left, right) => left.station.chainage - right.station.chainage || left.id.localeCompare(right.id));
  const pointByStation = new Map<number, HeliosEuclidControlPoint>();
  for (const point of alignmentPoints) {
    if (!pointByStation.has(point.station.chainage)) pointByStation.set(point.station.chainage, point);
  }
  const anchors = [...pointByStation.values()].sort((left, right) => left.station.chainage - right.station.chainage);

  const candidates: HorizontalSegmentCandidate[] = [];
  for (const record of records.filter((row) => row.geometryType === "horizontal_alignment")) {
    record.horizontalSegments.forEach((segment, index) => {
      const key = `${record.id}:${index + 1}`;
      if (segment.stationEnd <= segment.stationStart || segment.length <= 0) {
        addIssue(issues, record, "horizontal_segment_station_order_invalid", `Segment ${segment.label || index + 1} does not have increasing stations and positive length.`, [alignment.id], "blocking");
        return;
      }
      if (segment.kind === "curve") {
        if (!["coordinate_control", "dimensioned_geometry"].includes(record.authority)) return;
        if (!(segment.radius && segment.deltaDegrees)) {
          addIssue(issues, record, "curve_definition_incomplete", `Curve ${segment.label || index + 1} lacks a stored radius or delta.`, [alignment.id], "blocking");
          return;
        }
        const rotation = curveRotation(segment.label);
        if (!rotation) {
          addIssue(issues, record, "curve_rotation_missing", `Curve ${segment.label || index + 1} has no stored left/right direction.`, [alignment.id], "blocking");
          return;
        }
        candidates.push({ key, record, index, segment, rotation });
        return;
      }
      // A dimensioned bridge limit, railing run, or structure opening is not
      // a roadway tangent. Lines enter the alignment chain only when the
      // source explicitly carries coordinate-control authority.
      if (record.authority !== "coordinate_control") return;
      const lineContext = `${segment.label} ${record.sourceLocator}`;
      if (/bridge begins.*bridge ends|structure opening|guide rail|railing/i.test(lineContext)) return;
      if (!segment.bearing.trim()) {
        addIssue(issues, record, "tangent_bearing_missing", `Tangent ${segment.label || index + 1} lacks a stored bearing.`, [alignment.id]);
        return;
      }
      candidates.push({ key, record, index, segment });
    });
  }
  const curves = candidates
    .filter((candidate) => candidate.segment.kind === "curve")
    .sort((left, right) => left.segment.stationStart - right.segment.stationStart || left.key.localeCompare(right.key));
  const usedCandidates = new Set<string>();
  let sequence = 0;

  const addElement = (
    primitive: HorizontalChainPrimitive,
    startPoint: HeliosEuclidControlPoint,
    endPoint: HeliosEuclidControlPoint,
    bearingDegrees?: number,
  ) => {
    const candidate = primitive.candidate;
    const record = primitive.record;
    sequence += 1;
    const suffix = candidate ? `segment:${candidate.index + 1}` : `computed-segment:${sequence}`;
    const base = {
      id: `horizontal-element:${record.id}:${candidate ? candidate.index + 1 : `computed-${sequence}`}`,
      alignmentId: alignment.id,
      sequence,
      startStation: station(primitive.stationStart, record, `${suffix}:start`),
      endStation: station(primitive.stationEnd, record, `${suffix}:end`),
      startPointId: startPoint.id,
      endPointId: endPoint.id,
      length: candidate
        ? engineeringValue(primitive.length, record, `${suffix}:length`)
        : computedEngineeringValue(
          primitive.length,
          record,
          `${suffix}:length`,
          "displayed-station interval within the deterministic coordinate-anchor chain; no station equation applies",
          [startPoint.northing.id, startPoint.easting.id, endPoint.northing.id, endPoint.easting.id],
          [...startPoint.northing.provenanceIds, ...startPoint.easting.provenanceIds, ...endPoint.northing.provenanceIds, ...endPoint.easting.provenanceIds],
        ),
      reviewState: reviewState(record.status),
    };
    if (primitive.kind === "curve") {
      horizontalElements.push({
        ...base,
        elementType: "circular_curve",
        rotation: primitive.rotation!,
        radius: engineeringValue(primitive.radius!, record, `${suffix}:radius`),
        deltaDegrees: engineeringValue(primitive.deltaDegrees!, record, `${suffix}:delta`),
      });
    } else {
      const bearing = primitive.bearing?.trim() || `AZIMUTH ${bearingDegrees!.toFixed(8)}`;
      horizontalElements.push({
        ...base,
        elementType: "line",
        bearing: candidate
          ? engineeringValue(bearing, record, `${suffix}:bearing`, bearing)
          : {
            id: `value:${record.id}:${suffix}:bearing`,
            value: bearing,
            origin: "computed",
            formula: "azimuth of the deterministic coordinate-anchor chain",
            inputValueIds: [startPoint.northing.id, startPoint.easting.id, endPoint.northing.id, endPoint.easting.id],
            provenanceIds: [...new Set([...startPoint.northing.provenanceIds, ...startPoint.easting.provenanceIds, ...endPoint.northing.provenanceIds, ...endPoint.easting.provenanceIds])].sort(),
            reviewState: reviewState(record.status),
          },
      });
    }
    if (candidate) usedCandidates.add(candidate.key);
  };

  if (curves.length && anchors.length >= 2) {
    for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex += 1) {
      const startAnchor = anchors[anchorIndex]!;
      const endAnchor = anchors[anchorIndex + 1]!;
      const stationStart = startAnchor.station.chainage;
      const stationEnd = endAnchor.station.chainage;
      const intervalCurves = curves.filter((candidate) =>
        candidate.segment.stationStart >= stationStart - 1e-8 && candidate.segment.stationEnd <= stationEnd + 1e-8);
      const crossing = curves.filter((candidate) =>
        candidate.segment.stationStart < stationEnd - 1e-8 && candidate.segment.stationEnd > stationStart + 1e-8 && !intervalCurves.includes(candidate));
      if (crossing.length) {
        addIssue(issues, crossing[0]!.record, "curve_crosses_coordinate_anchor", "A printed curve crosses a coordinate anchor and requires estimator review before chain reconstruction.", [alignment.id], "blocking");
        continue;
      }
      const overlaps = intervalCurves.some((candidate, index) => index > 0 && candidate.segment.stationStart < intervalCurves[index - 1]!.segment.stationEnd - 1e-8);
      if (overlaps) {
        addIssue(issues, intervalCurves[0]!.record, "horizontal_curve_overlap", "Printed horizontal curves overlap within one coordinate-anchor interval.", [alignment.id], "blocking");
        continue;
      }
      const sourceRecord = intervalCurves[0]?.record || records.find((record) => record.horizontalPoints.some((point) => point.station === stationStart)) || records[0]!;
      const primitives: HorizontalChainPrimitive[] = [];
      let cursor = stationStart;
      for (const candidate of intervalCurves) {
        if (candidate.segment.stationStart > cursor + 1e-8) {
          primitives.push({ kind: "line", stationStart: cursor, stationEnd: candidate.segment.stationStart, length: candidate.segment.stationStart - cursor, record: candidate.record });
        }
        primitives.push({
          kind: "curve",
          stationStart: candidate.segment.stationStart,
          stationEnd: candidate.segment.stationEnd,
          length: candidate.segment.length,
          record: candidate.record,
          candidate,
          rotation: candidate.rotation,
          radius: candidate.segment.radius,
          deltaDegrees: candidate.segment.deltaDegrees,
        });
        cursor = candidate.segment.stationEnd;
      }
      if (stationEnd > cursor + 1e-8) {
        primitives.push({ kind: "line", stationStart: cursor, stationEnd, length: stationEnd - cursor, record: intervalCurves.at(-1)?.record || sourceRecord });
      }
      if (!primitives.length) continue;

      const relative = relativeHorizontalChain(primitives);
      const actualNorthing = endAnchor.northing.value - startAnchor.northing.value;
      const actualEasting = endAnchor.easting.value - startAnchor.easting.value;
      const relativeLength = Math.hypot(relative.northing, relative.easting);
      const actualLength = coordinateDistance(startAnchor, endAnchor);
      const closureResidual = Math.abs(relativeLength - actualLength);
      if (closureResidual > HELIOS_EUCLID_HORIZONTAL_DEFAULT_TOLERANCES.endpointClosureBlock) {
        addIssue(issues, sourceRecord, "horizontal_anchor_chain_closure", `Printed horizontal controls do not close between coordinate anchors; residual ${closureResidual.toFixed(4)} ${sourceRecord.units || "linear units"}.`, [alignment.id], "blocking");
        continue;
      }
      const initialHeading = Math.atan2(actualEasting, actualNorthing) - Math.atan2(relative.easting, relative.northing);
      const chainProvenanceIds = [...new Set([
        ...startAnchor.northing.provenanceIds,
        ...startAnchor.easting.provenanceIds,
        ...endAnchor.northing.provenanceIds,
        ...endAnchor.easting.provenanceIds,
        ...intervalCurves.map((candidate) => `provenance:${candidate.record.id}`),
      ])].sort();
      const chainInputValueIds = [startAnchor.northing.id, startAnchor.easting.id, endAnchor.northing.id, endAnchor.easting.id];
      let currentPoint = startAnchor;
      let currentNorthing = startAnchor.northing.value;
      let currentEasting = startAnchor.easting.value;
      let localHeading = 0;
      for (const primitive of primitives) {
        let localNorthing: number;
        let localEasting: number;
        let nextLocalHeading = localHeading;
        if (primitive.kind === "line") {
          localNorthing = primitive.length * Math.cos(localHeading);
          localEasting = primitive.length * Math.sin(localHeading);
        } else {
          const rotationSign = primitive.rotation === "right" ? 1 : -1;
          nextLocalHeading = localHeading + rotationSign * primitive.deltaDegrees! * Math.PI / 180;
          localNorthing = primitive.radius! / rotationSign * (Math.sin(nextLocalHeading) - Math.sin(localHeading));
          localEasting = primitive.radius! / rotationSign * (Math.cos(localHeading) - Math.cos(nextLocalHeading));
        }
        const gridVector = rotateHorizontalVector(localNorthing, localEasting, initialHeading);
        const calculatedNorthing = currentNorthing + gridVector.northing;
        const calculatedEasting = currentEasting + gridVector.easting;
        const existingEnd = pointByStation.get(primitive.stationEnd);
        const endPoint = existingEnd || (() => {
          const pointRecord = primitive.record;
          const id = `control-point:${alignment.id}:computed:${stableKey({ station: primitive.stationEnd })}`;
          const curveEnd = primitive.kind === "curve";
          const nextPrimitive = primitives[primitives.indexOf(primitive) + 1];
          const nextIsCurve = nextPrimitive?.kind === "curve";
          const entity: HeliosEuclidControlPoint = {
            id,
            alignmentId: alignment.id,
            pointType: curveEnd && nextIsCurve ? "pcc" : curveEnd ? "pt" : nextIsCurve ? "pc" : "other",
            name: curveEnd && nextIsCurve ? `Computed PCC ${printedStation(primitive.stationEnd)}` : curveEnd ? `Computed PT ${printedStation(primitive.stationEnd)}` : nextIsCurve ? `Computed PC ${printedStation(primitive.stationEnd)}` : `Computed control ${printedStation(primitive.stationEnd)}`,
            station: station(primitive.stationEnd, pointRecord, `computed-control:${primitive.stationEnd}`),
            northing: computedEngineeringValue(calculatedNorthing, pointRecord, `computed-control:${primitive.stationEnd}:northing`, "coordinate-anchor chain reconstruction from printed stations, radii, deltas, directions, and endpoint coordinates", chainInputValueIds, chainProvenanceIds),
            easting: computedEngineeringValue(calculatedEasting, pointRecord, `computed-control:${primitive.stationEnd}:easting`, "coordinate-anchor chain reconstruction from printed stations, radii, deltas, directions, and endpoint coordinates", chainInputValueIds, chainProvenanceIds),
            reviewState: reviewState(pointRecord.status),
          };
          controlPoints.push(entity);
          pointByStation.set(primitive.stationEnd, entity);
          return entity;
        })();
        addElement(primitive, currentPoint, endPoint, (initialHeading + localHeading) * 180 / Math.PI);
        currentPoint = endPoint;
        currentNorthing = endPoint.northing.value;
        currentEasting = endPoint.easting.value;
        localHeading = nextLocalHeading;
      }
      if (intervalCurves.length || closureResidual > HELIOS_EUCLID_HORIZONTAL_DEFAULT_TOLERANCES.endpointClosurePass) {
        addIssue(issues, sourceRecord, "horizontal_chain_computed_from_anchors", `Horizontal chain reconstructed between ${startAnchor.station.printedStation} and ${endAnchor.station.printedStation}; coordinate-anchor closure residual ${closureResidual.toFixed(4)} ${sourceRecord.units || "linear units"}.`, [alignment.id]);
      }
    }
  } else {
    for (const candidate of candidates.sort((left, right) => left.segment.stationStart - right.segment.stationStart || left.key.localeCompare(right.key))) {
      const startPoint = pointByStation.get(candidate.segment.stationStart);
      const endPoint = pointByStation.get(candidate.segment.stationEnd);
      if (!startPoint || !endPoint) continue;
      addElement({
        kind: candidate.segment.kind === "curve" ? "curve" : "line",
        stationStart: candidate.segment.stationStart,
        stationEnd: candidate.segment.stationEnd,
        length: candidate.segment.length,
        record: candidate.record,
        candidate,
        rotation: candidate.rotation,
        radius: candidate.segment.radius,
        deltaDegrees: candidate.segment.deltaDegrees,
        bearing: candidate.segment.bearing,
      }, startPoint, endPoint);
    }
  }

  for (const candidate of candidates.filter((row) => !usedCandidates.has(row.key))) {
    addIssue(issues, candidate.record, "segment_endpoint_coordinates_missing", `Segment ${candidate.segment.label || candidate.index + 1} could not be placed in a coordinate-anchored horizontal chain.`, [alignment.id]);
  }
}

export function buildHeliosEuclidShadowModel(input: BuildHeliosEuclidShadowInput): HeliosEuclidModel {
  if (!input.records.length) throw new HeliosEuclidShadowError("Euclid shadow population requires stored civil geometry records.");
  if (!input.engineeringRecordId || !input.geometryRunId || !input.sourceFingerprint) {
    throw new HeliosEuclidShadowError("Euclid shadow population requires canonical record, geometry run, and source identities.");
  }

  const activeRecords = input.records
    .filter((record) => !["rejected", "superseded"].includes(record.status))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (!activeRecords.length) throw new HeliosEuclidShadowError("Euclid shadow population has no active civil geometry records.");

  const provenanceRecords = activeRecords.map(provenance);
  const issues: HeliosEuclidIssue[] = [];
  const groups = new Map<string, HeliosEuclidLegacyGeometryRecord[]>();
  for (const record of activeRecords) {
    const key = normalizedAlignmentKey(record.alignmentName, record.id);
    groups.set(key, [...(groups.get(key) || []), record]);
  }

  const verticalDatums = [...new Set(activeRecords.map((record) => record.verticalDatum?.trim()).filter((value): value is string => Boolean(value)))];
  const projectVerticalDatum = verticalDatums.length === 1 ? verticalDatums[0] : undefined;
  const spatialReferences = [...new Set(activeRecords.map((record) => linearUnit(record.units)))].map((unit) => ({
    id: `spatial-reference:${unit}`,
    name: `Source coordinate reference (${unit}); datum and projection not established`,
    referenceState: "partially_known" as const,
    coordinateBasis: "unknown" as const,
    axisOrder: "northing_easting" as const,
    horizontalUnit: unit,
    verticalUnit: unit,
    verticalDatum: projectVerticalDatum,
    provenanceIds: activeRecords.filter((record) => linearUnit(record.units) === unit).map((record) => `provenance:${record.id}`),
    reviewState: "proposed" as const,
  }));

  const alignments: HeliosEuclidAlignment[] = [];
  const stationEquations: HeliosEuclidStationEquation[] = [];
  const alignmentRecords = new Map<string, HeliosEuclidLegacyGeometryRecord[]>();
  for (const [key, records] of groups) {
    const candidates = records.flatMap(stationCandidates);
    const start = Math.min(...candidates);
    const end = Math.max(...candidates);
    const first = records.find((record) => record.geometryType === "horizontal_alignment") || records[0]!;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      addIssue(issues, first, "insufficient_alignment_station_range", "The stored geometry does not establish two distinct stations for this alignment.", [], "blocking");
      continue;
    }
    const id = `alignment:${stableKey({ key })}`;
    const horizontalRecords = records.filter((record) => record.geometryType === "horizontal_alignment");
    alignments.push({
      id,
      printedName: boundedText(first.alignmentName, "Unnamed alignment"),
      normalizedName: boundedText(key, "Unnamed alignment"),
      alignmentType: alignmentType(key, records),
      spatialReferenceId: `spatial-reference:${linearUnit(first.units)}`,
      startStation: station(start, first, `${id}:start`),
      endStation: station(end, first, `${id}:end`),
      increasingDirection: "increasing station",
      sourceSheetNumbers: [...new Set(records.map((record) => record.sheetNumber).filter((value): value is string => Boolean(value)))],
      reviewState: horizontalRecords.length && horizontalRecords.every((record) => record.status === "accepted") ? "accepted" : "proposed",
      completeness: horizontalRecords.some((record) => record.horizontalPoints.length >= 2 || record.horizontalSegments.length > 0)
        ? "complete_with_limitations"
        : "incomplete",
    });
    alignmentRecords.set(id, records);
    const rawEquations = records.flatMap((record) => record.stationEquations.map((equation, index) => ({
      id: `station-equation:${record.id}:${index + 1}`,
      alignmentId: id,
      backStation: equation.backStation,
      aheadStation: equation.aheadStation,
      printedEquation: boundedText(equation.label, `${printedStation(equation.backStation)} BK = ${printedStation(equation.aheadStation)} AH`),
      provenanceIds: [`provenance:${record.id}`],
      reviewState: reviewState(record.status),
    })));
    if (rawEquations.length) {
      const resolution = resolveHeliosEuclidStationEquations({
        alignmentId: id,
        startChainage: start,
        startDisplayedStation: start,
        equations: rawEquations,
      });
      stationEquations.push(...resolution.equations);
      for (const problem of resolution.issues) {
        addIssue(issues, first, problem.code, `${problem.message} Source equations: ${problem.equationIds.join(", ")}.`, [id], "blocking");
      }
    }
  }

  const alignmentIdByRecord = new Map<string, string>();
  for (const alignment of alignments) {
    for (const record of alignmentRecords.get(alignment.id) || []) alignmentIdByRecord.set(record.id, alignment.id);
  }

  const controlPoints: HeliosEuclidControlPoint[] = [];
  const horizontalElements: HeliosEuclidHorizontalElement[] = [];
  const profiles: HeliosEuclidProfile[] = [];
  const profilePoints: HeliosEuclidProfilePoint[] = [];
  const verticalTangents: HeliosEuclidVerticalTangent[] = [];
  const verticalCurves: HeliosEuclidVerticalCurve[] = [];
  const typicalSections: HeliosEuclidTypicalSection[] = [];
  const crossSectionPoints: HeliosEuclidCrossSectionPoint[] = [];
  const structures: HeliosEuclidStructure[] = [];
  const inverts: HeliosEuclidInvert[] = [];
  const materialLayers: HeliosEuclidMaterialLayer[] = [];
  const relationships: HeliosEuclidRelationship[] = [];

  for (const record of activeRecords) {
    const alignmentId = alignmentIdByRecord.get(record.id);
    if (!alignmentId) continue;
    const recordReviewState = reviewState(record.status);
    record.horizontalPoints.forEach((point, index) => {
      const entity: HeliosEuclidControlPoint = {
        id: `control-point:${record.id}:${index + 1}`,
        alignmentId,
        pointType: pointType(point.label),
        name: boundedText(point.label, `Control point ${index + 1}`),
        station: station(point.station, record, `horizontal-point:${index + 1}`),
        northing: engineeringValue(point.northing, record, `northing:${index + 1}`),
        easting: engineeringValue(point.easting, record, `easting:${index + 1}`),
        reviewState: recordReviewState,
      };
      controlPoints.push(entity);
    });

    if (record.geometryType === "vertical_alignment" && record.verticalPoints.length) {
      let createdProfileCount = 0;
      for (const series of verticalProfileSeries(record)) {
        if (series.points.length < 2) continue;
        const sorted = [...series.points].sort((left, right) => left.station - right.station);
        const seriesSuffix = series.key === "profile" ? "" : `:${series.key}`;
        const profileId = `profile:${record.id}${seriesSuffix}`;
        profiles.push({
          id: profileId,
          alignmentId,
          printedName: boundedText(record.alignmentName, "Unnamed profile"),
          normalizedName: `${boundedText(record.alignmentName, "Unnamed alignment")} ${series.role.replaceAll("_", " ")}`,
          role: series.role,
          startStation: station(sorted[0]!.station, record, `${series.key}:start`),
          endStation: station(sorted.at(-1)!.station, record, `${series.key}:end`),
          verticalDatum: record.verticalDatum || projectVerticalDatum,
          sourceSheetNumbers: record.sheetNumber ? [record.sheetNumber] : [],
          reviewState: recordReviewState,
          completeness: "complete_with_limitations",
        });
        const createdPoints = sorted.map((point, index): HeliosEuclidProfilePoint => ({
          id: `profile-point:${record.id}:${series.key}:${index + 1}`,
          profileId,
          pointType: profilePointType(point.label),
          station: station(point.station, record, `${series.key}:point:${index + 1}`),
          elevation: engineeringValue(point.elevation, record, `${series.key}:elevation:${index + 1}`),
          reviewState: recordReviewState,
        }));
        profilePoints.push(...createdPoints);
        sorted.slice(0, -1).forEach((point, index) => {
          if (point.gradePercent === undefined) return;
          const endIndex = sorted.findIndex((candidate, candidateIndex) =>
            candidateIndex > index && profilePointType(candidate.label) !== "spot_elevation");
          // Two-decimal printed elevations can create a false grade failure on
          // very short tangents. Curve controls retain the signed grades; only
          // independently verify a tangent when its printed span is long
          // enough that ordinate rounding is not the dominant signal.
          if (endIndex < 0 || sorted[endIndex]!.station - point.station < 20) return;
          const tangent: HeliosEuclidVerticalTangent = {
            id: `vertical-tangent:${record.id}:${series.key}:${index + 1}`,
            profileId,
            sequence: index + 1,
            startPointId: createdPoints[index]!.id,
            endPointId: createdPoints[endIndex]!.id,
            gradePercent: engineeringValue(point.gradePercent, record, `${series.key}:grade:${index + 1}`, `${point.gradePercent}%`),
            reviewState: recordReviewState,
          };
          verticalTangents.push(tangent);
        });
        createdPoints.forEach((pvc, index) => {
          if (pvc.pointType !== "pvc") return;
          const nextPvcIndex = createdPoints.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.pointType === "pvc");
          const boundary = nextPvcIndex < 0 ? createdPoints.length : nextPvcIndex;
          const pviIndex = createdPoints.findIndex((candidate, candidateIndex) => candidateIndex > index && candidateIndex < boundary && candidate.pointType === "pvi");
          const pvtIndex = createdPoints.findIndex((candidate, candidateIndex) => candidateIndex > pviIndex && candidateIndex < boundary && candidate.pointType === "pvt");
          if (pviIndex < 0 || pvtIndex < 0) return;
          const sourcePoint = sorted[index]!;
          const length = printedProfileNumber(sourcePoint.label, "L");
          const incomingGrade = printedProfileNumber(sourcePoint.label, "G1");
          const outgoingGrade = printedProfileNumber(sourcePoint.label, "G2");
          if (length === undefined || incomingGrade === undefined || outgoingGrade === undefined) return;
          const curveId = `vertical-curve:${record.id}:${series.key}:${verticalCurves.filter((row) => row.profileId === profileId).length + 1}`;
          const highLowPoint = createdPoints.find((candidate, candidateIndex) =>
            candidateIndex > index && candidateIndex < pvtIndex && ["high_point", "low_point"].includes(candidate.pointType));
          verticalCurves.push({
            id: curveId,
            profileId,
            sequence: verticalCurves.filter((row) => row.profileId === profileId).length + 1,
            curveType: outgoingGrade > incomingGrade ? "sag" : outgoingGrade < incomingGrade ? "crest" : "unclassified",
            symmetry: "symmetric",
            pvcPointId: pvc.id,
            pviPointId: createdPoints[pviIndex]!.id,
            pvtPointId: createdPoints[pvtIndex]!.id,
            incomingGradePercent: engineeringValue(incomingGrade, record, `${series.key}:curve:${index + 1}:g1`, `${incomingGrade}%`),
            outgoingGradePercent: engineeringValue(outgoingGrade, record, `${series.key}:curve:${index + 1}:g2`, `${outgoingGrade}%`),
            length: engineeringValue(length, record, `${series.key}:curve:${index + 1}:length`, `${length} FT`),
            algebraicGradeDifferencePercent: engineeringValue(outgoingGrade - incomingGrade, record, `${series.key}:curve:${index + 1}:algebraic-difference`),
            computedHighLowPointId: highLowPoint?.id,
            solverVersion: HELIOS_EUCLID_VERTICAL_SOLVER,
            reviewState: recordReviewState,
          });
        });
        relationships.push({
          id: `relationship:${profileId}:alignment`,
          relationshipType: "profile_for_alignment",
          sourceEntityId: profileId,
          targetEntityId: alignmentId,
          provenanceIds: [`provenance:${record.id}`],
          reviewState: recordReviewState,
        });
        createdProfileCount += 1;
      }
      if (!createdProfileCount) {
        addIssue(issues, record, "profile_range_incomplete", "The stored vertical record does not contain at least two points on one profile surface.", [alignmentId], "blocking");
      }
    }

    (record.typicalSections || []).forEach((section, index) => {
      if (section.stationEnd <= section.stationStart) {
        addIssue(issues, record, "typical_section_station_range_invalid", `Typical section ${section.name || index + 1} has an invalid station range.`, [alignmentId]);
        return;
      }
      const id = `typical-section:${record.id}:${index + 1}`;
      typicalSections.push({
        id,
        alignmentId,
        name: boundedText(section.name, `Typical section ${index + 1}`),
        stationStart: station(section.stationStart, record, `typical-section:${index + 1}:start`),
        stationEnd: station(section.stationEnd, record, `typical-section:${index + 1}:end`),
        laneWidthLeft: section.laneWidthLeft === undefined ? undefined : engineeringValue(section.laneWidthLeft, record, `typical-section:${index + 1}:lane-left`),
        laneWidthRight: section.laneWidthRight === undefined ? undefined : engineeringValue(section.laneWidthRight, record, `typical-section:${index + 1}:lane-right`),
        shoulderWidthLeft: section.shoulderWidthLeft === undefined ? undefined : engineeringValue(section.shoulderWidthLeft, record, `typical-section:${index + 1}:shoulder-left`),
        shoulderWidthRight: section.shoulderWidthRight === undefined ? undefined : engineeringValue(section.shoulderWidthRight, record, `typical-section:${index + 1}:shoulder-right`),
        crossSlopeLeftPercent: section.crossSlopeLeftPercent === undefined ? undefined : engineeringValue(section.crossSlopeLeftPercent, record, `typical-section:${index + 1}:slope-left`, `${section.crossSlopeLeftPercent}% signed outward`),
        crossSlopeRightPercent: section.crossSlopeRightPercent === undefined ? undefined : engineeringValue(section.crossSlopeRightPercent, record, `typical-section:${index + 1}:slope-right`, `${section.crossSlopeRightPercent}% signed outward`),
        reviewState: recordReviewState,
      });
      relationships.push({
        id: `relationship:${id}:alignment`, relationshipType: "section_for_alignment", sourceEntityId: id, targetEntityId: alignmentId,
        provenanceIds: [`provenance:${record.id}`], reviewState: recordReviewState,
      });
    });

    record.crossSectionPoints.forEach((point, index) => {
      const id = `cross-section-point:${record.id}:${index + 1}`;
      crossSectionPoints.push({
        id,
        alignmentId,
        station: station(point.station, record, `cross-section:${index + 1}`),
        offset: engineeringValue(point.offset, record, `cross-section:${index + 1}:offset`),
        elevation: engineeringValue(point.elevation, record, `cross-section:${index + 1}:elevation`),
        surface: point.surface,
        reviewState: recordReviewState,
      });
      relationships.push({
        id: `relationship:${id}:alignment`,
        relationshipType: "section_for_alignment",
        sourceEntityId: id,
        targetEntityId: alignmentId,
        provenanceIds: [`provenance:${record.id}`],
        reviewState: recordReviewState,
      });
    });

    const structureByPrintedId = new Map<string, HeliosEuclidStructure>();
    record.invertPoints.forEach((point, index) => {
      let structure = structureByPrintedId.get(point.structureId);
      if (!structure) {
        structure = {
          id: `structure:${record.id}:${stableKey(point.structureId)}`,
          structureType: /culvert/i.test(point.structureId) ? "pipe_culvert" : "drainage_structure",
          printedName: boundedText(point.structureId, `Structure ${structureByPrintedId.size + 1}`),
          primaryAlignmentId: alignmentId,
          station: point.station === undefined ? undefined : station(point.station, record, `structure:${index + 1}`),
          offset: point.offset === undefined ? undefined : engineeringValue(point.offset, record, `structure:${index + 1}:offset`),
          provenanceIds: [`provenance:${record.id}`],
          reviewState: recordReviewState,
        };
        structures.push(structure);
        structureByPrintedId.set(point.structureId, structure);
      }
      if (point.station === undefined) {
        addIssue(issues, record, "invert_station_missing", `Invert ${point.structureId} has no stored station.`, [structure.id], "blocking");
        return;
      }
      const id = `invert:${record.id}:${index + 1}`;
      inverts.push({
        id,
        alignmentId,
        structureId: structure.id,
        station: station(point.station, record, `invert:${index + 1}`),
        offset: point.offset === undefined ? undefined : engineeringValue(point.offset, record, `invert:${index + 1}:offset`),
        invertElevation: engineeringValue(point.invertElevation, record, `invert:${index + 1}:elevation`),
        pipeSize: point.pipeSize.trim() ? engineeringValue(point.pipeSize, record, `invert:${index + 1}:pipe-size`, point.pipeSize) : undefined,
        pipeMaterial: point.pipeMaterial.trim() ? engineeringValue(point.pipeMaterial, record, `invert:${index + 1}:pipe-material`, point.pipeMaterial) : undefined,
        reviewState: recordReviewState,
      });
      relationships.push({
        id: `relationship:${id}:alignment`,
        relationshipType: "invert_for_alignment",
        sourceEntityId: id,
        targetEntityId: alignmentId,
        sourceStation: station(point.station, record, `invert-relationship:${index + 1}`),
        provenanceIds: [`provenance:${record.id}`],
        reviewState: recordReviewState,
      });
    });

    record.materialLayers.forEach((layer, index) => {
      if (layer.stationStart === undefined || layer.stationEnd === undefined || layer.stationEnd <= layer.stationStart) {
        addIssue(issues, record, "material_station_range_missing", `Material layer ${layer.name || index + 1} lacks a valid stored station range.`, [alignmentId]);
        return;
      }
      const id = `material-layer:${record.id}:${index + 1}`;
      materialLayers.push({
        id,
        alignmentId,
        name: boundedText(layer.name, `Material layer ${index + 1}`),
        stationStart: station(layer.stationStart, record, `material:${index + 1}:start`),
        stationEnd: station(layer.stationEnd, record, `material:${index + 1}:end`),
        offsetLeft: layer.offsetLeft === undefined ? undefined : engineeringValue(layer.offsetLeft, record, `material:${index + 1}:left`),
        offsetRight: layer.offsetRight === undefined ? undefined : engineeringValue(layer.offsetRight, record, `material:${index + 1}:right`),
        thickness: engineeringValue(layer.thickness, record, `material:${index + 1}:thickness`),
        thicknessUnit: layer.thicknessUnit.toLocaleLowerCase().includes("inch") ? "inch" : linearUnit(layer.thicknessUnit),
        reviewState: recordReviewState,
      });
      relationships.push({
        id: `relationship:${id}:alignment`,
        relationshipType: "material_for_alignment",
        sourceEntityId: id,
        targetEntityId: alignmentId,
        provenanceIds: [`provenance:${record.id}`],
        reviewState: recordReviewState,
      });
    });

    record.unresolvedIssues.forEach((message, index) => {
      addIssue(issues, record, `legacy_unresolved_${index + 1}`, message, [alignmentId]);
    });
  }

  for (const alignment of alignments) {
    appendHorizontalGeometry({
      alignment,
      records: alignmentRecords.get(alignment.id) || [],
      controlPoints,
      horizontalElements,
      issues,
    });
  }

  const acceptedCount = activeRecords.filter((record) => record.status === "accepted").length;
  const model: HeliosEuclidModel = {
    id: input.id,
    companyId: input.companyId,
    projectId: input.projectId,
    packageId: input.packageId,
    packageRevision: input.packageRevision,
    schemaVersion: HELIOS_EUCLID_SCHEMA_VERSION,
    processingVersion: HELIOS_EUCLID_SHADOW_VERSION,
    sourceFingerprint: input.sourceFingerprint,
    status: issues.some((issue) => issue.severity === "blocking")
      ? "conflicted"
      : acceptedCount === activeRecords.length
        ? "accepted"
        : acceptedCount
          ? "partially_accepted"
          : "proposed",
    spatialReferences,
    provenance: provenanceRecords,
    alignments,
    controlPoints,
    horizontalElements,
    stationEquations,
    profiles,
    profilePoints,
    verticalTangents,
    verticalCurves,
    typicalSections,
    crossSectionPoints,
    structures,
    inverts,
    materialLayers,
    relationships,
    issues,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
  const validation = validateHeliosEuclidContract(model);
  if (!validation.valid) {
    throw new HeliosEuclidShadowError(`Euclid shadow contract validation failed: ${validation.issues.map((issue) => issue.code).join(", ")}`);
  }
  return model;
}

export function euclidModelFingerprint(model: HeliosEuclidModel) {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...stableModel } = model;
  return buildHeliosEngineeringParityFingerprint(stableModel);
}

export function buildHeliosEuclidEntityChunks(
  model: HeliosEuclidModel,
  maximumEntitiesPerChunk = 75,
): HeliosEuclidEntityChunk[] {
  if (!Number.isSafeInteger(maximumEntitiesPerChunk) || maximumEntitiesPerChunk < 1 || maximumEntitiesPerChunk > 200) {
    throw new HeliosEuclidShadowError("Euclid entity chunk size must be between 1 and 200.");
  }
  const groups: Record<HeliosEuclidEntityType, unknown[]> = {
    spatial_reference: model.spatialReferences,
    alignment: model.alignments,
    control_point: model.controlPoints,
    horizontal_element: model.horizontalElements,
    station_equation: model.stationEquations,
    profile: model.profiles,
    profile_point: model.profilePoints,
    vertical_tangent: model.verticalTangents,
    vertical_curve: model.verticalCurves,
    typical_section: model.typicalSections,
    cross_section_point: model.crossSectionPoints,
    structure: model.structures,
    invert: model.inverts,
    material_layer: model.materialLayers,
    relationship: model.relationships,
    issue: model.issues,
  };
  return HELIOS_EUCLID_ENTITY_TYPES.flatMap((entityType) => {
    const entities = groups[entityType];
    const chunks: HeliosEuclidEntityChunk[] = [];
    for (let index = 0; index < entities.length; index += maximumEntitiesPerChunk) {
      const payload = entities.slice(index, index + maximumEntitiesPerChunk);
      const payloadJson = JSON.stringify(payload);
      if (payloadJson.length > 700_000) {
        throw new HeliosEuclidShadowError(`Euclid ${entityType} chunk exceeds the storage safety limit.`);
      }
      chunks.push({
        entityType,
        chunkIndex: chunks.length,
        entityCount: payload.length,
        payloadJson,
        payloadFingerprint: buildHeliosEngineeringParityFingerprint(payload),
      });
    }
    return chunks;
  });
}
