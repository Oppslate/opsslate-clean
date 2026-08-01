import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  type HeliosEuclidLinearUnit,
  type HeliosEuclidModel,
  type HeliosEuclidReviewState,
} from "./euclid-contract.ts";
import type { HeliosEuclidResolvedCrossSectionPoint } from "./euclid-cross-section.ts";
import type { HeliosEuclidAlignmentPositionStatus } from "./euclid-station.ts";
import {
  assembleHeliosEuclidSurfaces,
  type HeliosEuclidSurfaceAssemblyRequest,
  type HeliosEuclidSurfaceAssemblyResult,
  type HeliosEuclidSurfaceKind,
  type HeliosEuclidSurfaceSlice,
} from "./euclid-surface-assembly.ts";

export const HELIOS_EUCLID_SURFACE_QUANTITY_VERSION = 1;
export const HELIOS_EUCLID_SURFACE_QUANTITY_SOLVER = "euclid-governed-surface-quantity-v1";

export type HeliosEuclidSurfaceComparisonType = "earthwork" | "structural_section" | "excavation_limit";
export type HeliosEuclidSurfaceQuantityCalculationType =
  | "earthwork_excavation_volume"
  | "earthwork_embankment_volume"
  | "structural_section_volume"
  | "excavation_limit_volume"
  | "material_area"
  | "material_volume";

export type HeliosEuclidSurfaceComparisonSection = {
  id: string;
  chainage: number;
  displayedStation: number;
  printedStation: string;
  matchedOffsetCount: number;
  offsetStart: number;
  offsetEnd: number;
  positiveArea: number;
  negativeArea: number;
  maximumPositiveDepth: number;
  maximumNegativeDepth: number;
  inputValueIds: string[];
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidSurfaceComparisonInterval = {
  id: string;
  stationStart: number;
  stationEnd: number;
  printedStationStart: string;
  printedStationEnd: string;
  distance: number;
  positiveVolume: number;
  negativeVolume: number;
  inputValueIds: string[];
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidSurfaceComparisonGap = {
  id: string;
  comparison: HeliosEuclidSurfaceComparisonType;
  stationStart?: number;
  stationEnd?: number;
  printedStationStart?: string;
  printedStationEnd?: string;
  reason: "no_common_surface_span" | "insufficient_matching_offsets" | "unit_mismatch";
  message: string;
};

export type HeliosEuclidSurfaceComparison = {
  id: string;
  comparison: HeliosEuclidSurfaceComparisonType;
  baseSurface: HeliosEuclidSurfaceKind;
  targetSurface: HeliosEuclidSurfaceKind;
  status: HeliosEuclidAlignmentPositionStatus;
  sectionAreaUnit: "SF" | "SM";
  volumeUnit: "CY" | "M3";
  sections: HeliosEuclidSurfaceComparisonSection[];
  intervals: HeliosEuclidSurfaceComparisonInterval[];
  gaps: HeliosEuclidSurfaceComparisonGap[];
  positiveVolume: number;
  negativeVolume: number;
  inputValueIds: string[];
  provenanceIds: string[];
};

export type HeliosEuclidDraftSurfaceQuantity = {
  id: string;
  fingerprint: string;
  calculationType: HeliosEuclidSurfaceQuantityCalculationType;
  alignmentId: string;
  label: string;
  value: number;
  unit: "SF" | "SM" | "CY" | "M3";
  status: "draft";
  engineeringStatus: HeliosEuclidAlignmentPositionStatus;
  confidence: number;
  method: string;
  formula: string;
  comparisonId?: string;
  materialLayerId?: string;
  inputEntityIds: string[];
  provenanceIds: string[];
};

export type HeliosEuclidSurfaceQuantityResult = {
  id: string;
  fingerprint: string;
  version: typeof HELIOS_EUCLID_SURFACE_QUANTITY_VERSION;
  solver: typeof HELIOS_EUCLID_SURFACE_QUANTITY_SOLVER;
  euclidModelId: string;
  sourceFingerprint: string;
  alignmentId: string;
  alignmentName: string;
  status: HeliosEuclidAlignmentPositionStatus;
  canCalculate: boolean;
  surfaceAssembly: HeliosEuclidSurfaceAssemblyResult;
  comparisons: HeliosEuclidSurfaceComparison[];
  draftQuantities: HeliosEuclidDraftSurfaceQuantity[];
  gaps: HeliosEuclidSurfaceComparisonGap[];
  unresolvedControls: string[];
  limitations: string[];
};

export class HeliosEuclidSurfaceQuantityError extends Error {}

const EPSILON = 0.001;
const rounded = (value: number, digits = 6) => Number(value.toFixed(digits));
const unique = (values: string[]) => [...new Set(values)].sort();
const accepted = (state: HeliosEuclidReviewState) => state === "accepted" || state === "corrected";

function normalizedUnit(unit: string) {
  if (unit === "us_survey_foot" || unit === "international_foot") return "FT" as const;
  if (unit === "meter") return "M" as const;
  return undefined;
}

function convertLinear(value: number, from: HeliosEuclidLinearUnit | "inch", to: "FT" | "M") {
  const meters = from === "meter"
    ? value
    : from === "inch"
      ? value * 0.0254
      : from === "us_survey_foot" || from === "international_foot"
        ? value * 0.3048
        : Number.NaN;
  if (!Number.isFinite(meters)) return undefined;
  return rounded(to === "M" ? meters : meters / 0.3048, 10);
}

function weakestState(points: HeliosEuclidResolvedCrossSectionPoint[]) : HeliosEuclidReviewState {
  if (points.every((point) => accepted(point.reviewState))) return "accepted";
  if (points.some((point) => point.reviewState === "conflicted")) return "conflicted";
  return "proposed";
}

function segmentAreas(leftOffset: number, rightOffset: number, leftDepth: number, rightDepth: number) {
  const width = rightOffset - leftOffset;
  if (width <= 0) return { positive: 0, negative: 0 };
  if (leftDepth >= 0 && rightDepth >= 0) return { positive: width * (leftDepth + rightDepth) / 2, negative: 0 };
  if (leftDepth <= 0 && rightDepth <= 0) return { positive: 0, negative: width * (-leftDepth - rightDepth) / 2 };
  const fraction = Math.abs(leftDepth) / (Math.abs(leftDepth) + Math.abs(rightDepth));
  const leftWidth = width * fraction;
  const rightWidth = width - leftWidth;
  return leftDepth > 0
    ? { positive: leftWidth * leftDepth / 2, negative: rightWidth * -rightDepth / 2 }
    : { positive: rightWidth * rightDepth / 2, negative: leftWidth * -leftDepth / 2 };
}

function comparisonGap(input: Omit<HeliosEuclidSurfaceComparisonGap, "id">) {
  const fingerprint = buildHeliosEngineeringParityFingerprint(input);
  return { id: `surface-comparison-gap:${fingerprint.split(":")[1]!.slice(0, 24)}`, ...input };
}

function pointsFor(slice: HeliosEuclidSurfaceSlice, surface: HeliosEuclidSurfaceKind) {
  return slice.points.filter((point) => point.surface === surface
    && point.northing !== undefined && point.easting !== undefined && point.elevation !== undefined)
    .sort((left, right) => left.offset - right.offset);
}

function sectionComparison(input: {
  slice: HeliosEuclidSurfaceSlice;
  baseSurface: HeliosEuclidSurfaceKind;
  targetSurface: HeliosEuclidSurfaceKind;
  horizontal: "FT" | "M";
  vertical: HeliosEuclidLinearUnit;
}) {
  const base = pointsFor(input.slice, input.baseSurface);
  const targetByOffset = new Map(pointsFor(input.slice, input.targetSurface).map((point) => [rounded(point.offset), point]));
  const pairs = base.flatMap((basePoint) => {
    const targetPoint = targetByOffset.get(rounded(basePoint.offset));
    if (!targetPoint || basePoint.elevation === undefined || targetPoint.elevation === undefined) return [];
    const baseElevation = convertLinear(basePoint.elevation, input.vertical, input.horizontal);
    const targetElevation = convertLinear(targetPoint.elevation, input.vertical, input.horizontal);
    if (baseElevation === undefined || targetElevation === undefined) return [];
    return [{ offset: rounded(basePoint.offset), depth: baseElevation - targetElevation, basePoint, targetPoint }];
  }).sort((left, right) => left.offset - right.offset);
  if (pairs.length < 3) return undefined;
  let positiveArea = 0;
  let negativeArea = 0;
  for (let index = 1; index < pairs.length; index += 1) {
    const left = pairs[index - 1]!;
    const right = pairs[index]!;
    const areas = segmentAreas(left.offset, right.offset, left.depth, right.depth);
    positiveArea += areas.positive;
    negativeArea += areas.negative;
  }
  const allPoints = pairs.flatMap((pair) => [pair.basePoint, pair.targetPoint]);
  const sectionBase = {
    chainage: input.slice.chainage,
    displayedStation: input.slice.displayedStation,
    printedStation: input.slice.printedStation,
    matchedOffsetCount: pairs.length,
    offsetStart: pairs[0]!.offset,
    offsetEnd: pairs.at(-1)!.offset,
    positiveArea: rounded(positiveArea),
    negativeArea: rounded(negativeArea),
    maximumPositiveDepth: rounded(Math.max(0, ...pairs.map((pair) => pair.depth))),
    maximumNegativeDepth: rounded(Math.max(0, ...pairs.map((pair) => -pair.depth))),
    inputValueIds: unique(allPoints.flatMap((point) => [point.id, ...point.inputValueIds])),
    provenanceIds: unique(allPoints.flatMap((point) => point.provenanceIds)),
    reviewState: weakestState(allPoints),
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(sectionBase);
  return { id: `surface-comparison-section:${fingerprint.split(":")[1]!.slice(0, 24)}`, ...sectionBase };
}

function panelSpans(assembly: HeliosEuclidSurfaceAssemblyResult, surface: HeliosEuclidSurfaceKind) {
  const row = assembly.surfaces.find((candidate) => candidate.surface === surface);
  return new Set((row?.panels || []).map((panel) => `${panel.stationStart}:${panel.stationEnd}`));
}

function commonSpans(assembly: HeliosEuclidSurfaceAssemblyResult, base: HeliosEuclidSurfaceKind, target: HeliosEuclidSurfaceKind) {
  const baseSpans = panelSpans(assembly, base);
  return [...panelSpans(assembly, target)].filter((span) => baseSpans.has(span)).map((span) => {
    const [stationStart, stationEnd] = span.split(":").map(Number);
    return { stationStart: stationStart!, stationEnd: stationEnd! };
  }).sort((left, right) => left.stationStart - right.stationStart || left.stationEnd - right.stationEnd);
}

function buildComparison(input: {
  assembly: HeliosEuclidSurfaceAssemblyResult;
  comparison: HeliosEuclidSurfaceComparisonType;
  baseSurface: HeliosEuclidSurfaceKind;
  targetSurface: HeliosEuclidSurfaceKind;
  horizontal: "FT" | "M";
  vertical: HeliosEuclidLinearUnit;
}) : HeliosEuclidSurfaceComparison {
  const spans = commonSpans(input.assembly, input.baseSurface, input.targetSurface);
  const sliceByChainage = new Map(input.assembly.slices.map((slice) => [rounded(slice.chainage), slice]));
  const sections = new Map<number, HeliosEuclidSurfaceComparisonSection>();
  const intervals: HeliosEuclidSurfaceComparisonInterval[] = [];
  const gaps: HeliosEuclidSurfaceComparisonGap[] = [];
  if (!spans.length) gaps.push(comparisonGap({
    comparison: input.comparison,
    reason: "no_common_surface_span",
    message: `${input.baseSurface.replaceAll("_", " ")} and ${input.targetSurface.replaceAll("_", " ")} have no common governed panel span.`,
  }));
  for (const span of spans) {
    const startSlice = sliceByChainage.get(rounded(span.stationStart));
    const endSlice = sliceByChainage.get(rounded(span.stationEnd));
    const start = startSlice ? sectionComparison({ slice: startSlice, baseSurface: input.baseSurface, targetSurface: input.targetSurface, horizontal: input.horizontal, vertical: input.vertical }) : undefined;
    const end = endSlice ? sectionComparison({ slice: endSlice, baseSurface: input.baseSurface, targetSurface: input.targetSurface, horizontal: input.horizontal, vertical: input.vertical }) : undefined;
    if (!start || !end) {
      gaps.push(comparisonGap({
        comparison: input.comparison,
        stationStart: span.stationStart,
        stationEnd: span.stationEnd,
        printedStationStart: startSlice?.printedStation,
        printedStationEnd: endSlice?.printedStation,
        reason: "insufficient_matching_offsets",
        message: "Both bounding sections require at least three exact governed offsets shared by the compared surfaces.",
      }));
      continue;
    }
    sections.set(start.chainage, start);
    sections.set(end.chainage, end);
    const distance = span.stationEnd - span.stationStart;
    if (distance <= EPSILON) continue;
    const intervalBase = {
      stationStart: span.stationStart,
      stationEnd: span.stationEnd,
      printedStationStart: start.printedStation,
      printedStationEnd: end.printedStation,
      distance: rounded(distance),
      positiveVolume: rounded(distance * (start.positiveArea + end.positiveArea) / 2),
      negativeVolume: rounded(distance * (start.negativeArea + end.negativeArea) / 2),
      inputValueIds: unique([...start.inputValueIds, ...end.inputValueIds]),
      provenanceIds: unique([...start.provenanceIds, ...end.provenanceIds]),
      reviewState: accepted(start.reviewState) && accepted(end.reviewState) ? "accepted" as const : start.reviewState === "conflicted" || end.reviewState === "conflicted" ? "conflicted" as const : "proposed" as const,
    };
    const fingerprint = buildHeliosEngineeringParityFingerprint(intervalBase);
    intervals.push({ id: `surface-comparison-interval:${fingerprint.split(":")[1]!.slice(0, 24)}`, ...intervalBase });
  }
  const sectionRows = [...sections.values()].sort((left, right) => left.chainage - right.chainage);
  const status: HeliosEuclidAlignmentPositionStatus = !intervals.length
    ? "unavailable"
    : gaps.length || intervals.some((interval) => !accepted(interval.reviewState))
      ? "preliminary"
      : "verified";
  const comparisonBase = {
    comparison: input.comparison,
    baseSurface: input.baseSurface,
    targetSurface: input.targetSurface,
    status,
    sectionAreaUnit: input.horizontal === "FT" ? "SF" as const : "SM" as const,
    volumeUnit: input.horizontal === "FT" ? "CY" as const : "M3" as const,
    sections: sectionRows,
    intervals,
    gaps,
    positiveVolume: rounded(intervals.reduce((sum, interval) => sum + interval.positiveVolume, 0) / (input.horizontal === "FT" ? 27 : 1)),
    negativeVolume: rounded(intervals.reduce((sum, interval) => sum + interval.negativeVolume, 0) / (input.horizontal === "FT" ? 27 : 1)),
    inputValueIds: unique(intervals.flatMap((interval) => interval.inputValueIds)),
    provenanceIds: unique(intervals.flatMap((interval) => interval.provenanceIds)),
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(comparisonBase);
  return { id: `surface-comparison:${fingerprint.split(":")[1]!.slice(0, 24)}`, ...comparisonBase };
}

function confidence(model: HeliosEuclidModel, provenanceIds: string[]) {
  const values = unique(provenanceIds).map((id) => model.provenance.find((row) => row.id === id)?.confidence)
    .filter((value): value is number => Number.isFinite(value));
  return values.length ? Math.max(0, Math.min(100, Math.min(...values))) : 0;
}

function draftQuantity(model: HeliosEuclidModel, input: Omit<HeliosEuclidDraftSurfaceQuantity, "id" | "fingerprint" | "confidence" | "status">) {
  const normalized = {
    ...input,
    value: rounded(input.value),
    inputEntityIds: unique(input.inputEntityIds),
    provenanceIds: unique(input.provenanceIds),
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint({ sourceFingerprint: model.sourceFingerprint, ...normalized });
  return {
    id: `surface-draft-quantity:${fingerprint.split(":")[1]!.slice(0, 24)}`,
    fingerprint,
    confidence: confidence(model, normalized.provenanceIds),
    status: "draft" as const,
    ...normalized,
  };
}

function comparisonQuantities(model: HeliosEuclidModel, comparison: HeliosEuclidSurfaceComparison, alignmentId: string, alignmentName: string) {
  const rows: HeliosEuclidDraftSurfaceQuantity[] = [];
  const base = {
    alignmentId,
    engineeringStatus: comparison.status,
    comparisonId: comparison.id,
    inputEntityIds: comparison.inputValueIds,
    provenanceIds: comparison.provenanceIds,
    unit: comparison.volumeUnit,
    method: "Average-end-area integration over consecutive common governed 4O surface panels",
    formula: comparison.volumeUnit === "CY" ? "SUM(distance * (area start + area end) / 2) / 27" : "SUM(distance * (area start + area end) / 2)",
  };
  if (comparison.comparison === "earthwork") {
    if (comparison.positiveVolume > 0) rows.push(draftQuantity(model, { ...base, calculationType: "earthwork_excavation_volume", label: `${alignmentName} excavation volume`, value: comparison.positiveVolume }));
    if (comparison.negativeVolume > 0) rows.push(draftQuantity(model, { ...base, calculationType: "earthwork_embankment_volume", label: `${alignmentName} embankment volume`, value: comparison.negativeVolume }));
  } else if (comparison.comparison === "structural_section" && comparison.positiveVolume > 0) {
    rows.push(draftQuantity(model, { ...base, calculationType: "structural_section_volume", label: `${alignmentName} proposed-to-subgrade structural envelope`, value: comparison.positiveVolume }));
  } else if (comparison.comparison === "excavation_limit" && comparison.positiveVolume > 0) {
    rows.push(draftQuantity(model, { ...base, calculationType: "excavation_limit_volume", label: `${alignmentName} excavation-limit envelope`, value: comparison.positiveVolume }));
  }
  return rows;
}

function materialQuantities(model: HeliosEuclidModel, alignmentId: string, alignmentName: string, horizontal: "FT" | "M") {
  return model.materialLayers.filter((layer) => layer.alignmentId === alignmentId && accepted(layer.reviewState))
    .flatMap((layer): HeliosEuclidDraftSurfaceQuantity[] => {
      if (
        !layer.offsetLeft || !layer.offsetRight || layer.thickness.value <= 0
        || !accepted(layer.stationStart.reviewState) || !accepted(layer.stationEnd.reviewState)
        || !accepted(layer.offsetLeft.reviewState) || !accepted(layer.offsetRight.reviewState)
        || !accepted(layer.thickness.reviewState)
      ) return [];
      const length = layer.stationEnd.chainage - layer.stationStart.chainage;
      const width = Math.abs(layer.offsetRight.value - layer.offsetLeft.value);
      const thickness = convertLinear(layer.thickness.value, layer.thicknessUnit, horizontal);
      if (length <= 0 || width <= 0 || thickness === undefined || thickness <= 0) return [];
      const inputEntityIds = unique([layer.id, layer.offsetLeft.id, layer.offsetRight.id, layer.thickness.id]);
      const provenanceIds = unique([
        ...layer.stationStart.provenanceIds, ...layer.stationEnd.provenanceIds,
        ...layer.offsetLeft.provenanceIds, ...layer.offsetRight.provenanceIds, ...layer.thickness.provenanceIds,
      ]);
      const area = length * width;
      const volume = area * thickness / (horizontal === "FT" ? 27 : 1);
      return [
        draftQuantity(model, {
          calculationType: "material_area", alignmentId, label: `${alignmentName} ${layer.name} area`, value: area,
          unit: horizontal === "FT" ? "SF" : "SM", engineeringStatus: model.status === "accepted" ? "verified" : "preliminary", materialLayerId: layer.id,
          method: "Accepted material-layer chainage range multiplied by accepted lateral width",
          formula: "(end chainage - start chainage) * abs(right offset - left offset)", inputEntityIds, provenanceIds,
        }),
        draftQuantity(model, {
          calculationType: "material_volume", alignmentId, label: `${alignmentName} ${layer.name} volume`, value: volume,
          unit: horizontal === "FT" ? "CY" : "M3", engineeringStatus: model.status === "accepted" ? "verified" : "preliminary", materialLayerId: layer.id,
          method: "Accepted material-layer footprint multiplied by normalized accepted thickness",
          formula: horizontal === "FT" ? "length * width * thickness / 27" : "length * width * thickness", inputEntityIds, provenanceIds,
        }),
      ];
    });
}

/**
 * Calculates traceable draft quantities from one canonical model and its 4O
 * governed surfaces. Results are not persisted and cannot bypass Stage 4K.
 */
export function calculateHeliosEuclidSurfaceQuantities(model: HeliosEuclidModel, request: HeliosEuclidSurfaceAssemblyRequest): HeliosEuclidSurfaceQuantityResult {
  const assembly = assembleHeliosEuclidSurfaces(model, request);
  const horizontal = normalizedUnit(assembly.horizontalUnit);
  const vertical = assembly.verticalUnit as HeliosEuclidLinearUnit;
  if (!horizontal || normalizedUnit(vertical) === undefined) {
    const gap = comparisonGap({ comparison: "earthwork", reason: "unit_mismatch", message: "Known compatible horizontal and vertical units are required for area and volume calculations." });
    const base = {
      version: HELIOS_EUCLID_SURFACE_QUANTITY_VERSION,
      solver: HELIOS_EUCLID_SURFACE_QUANTITY_SOLVER,
      euclidModelId: model.id,
      sourceFingerprint: model.sourceFingerprint,
      alignmentId: assembly.alignmentId,
      alignmentName: assembly.alignmentName,
      status: "unavailable" as const,
      canCalculate: false,
      surfaceAssembly: assembly,
      comparisons: [],
      draftQuantities: [],
      gaps: [gap],
      unresolvedControls: unique([...assembly.unresolvedControls, gap.message]),
      limitations: ["4P cannot normalize unknown or incompatible engineering units.", "4P draft results are never published or applied to an estimate automatically."],
    } satisfies Omit<HeliosEuclidSurfaceQuantityResult, "id" | "fingerprint">;
    const fingerprint = buildHeliosEngineeringParityFingerprint(base);
    return { id: `surface-quantity-result:${fingerprint.split(":")[1]!.slice(0, 32)}`, fingerprint, ...base };
  }

  const comparisons: HeliosEuclidSurfaceComparison[] = [];
  const subgradeSpans = commonSpans(assembly, "existing", "subgrade");
  comparisons.push(buildComparison({ assembly, comparison: "earthwork", baseSurface: "existing", targetSurface: subgradeSpans.length ? "subgrade" : "proposed", horizontal, vertical }));
  if (commonSpans(assembly, "proposed", "subgrade").length) comparisons.push(buildComparison({ assembly, comparison: "structural_section", baseSurface: "proposed", targetSurface: "subgrade", horizontal, vertical }));
  if (commonSpans(assembly, "existing", "excavation_limit").length) comparisons.push(buildComparison({ assembly, comparison: "excavation_limit", baseSurface: "existing", targetSurface: "excavation_limit", horizontal, vertical }));

  const comparisonDrafts = comparisons.flatMap((comparison) => comparisonQuantities(model, comparison, assembly.alignmentId, assembly.alignmentName));
  const materials = materialQuantities(model, assembly.alignmentId, assembly.alignmentName, horizontal);
  const draftQuantities = [...comparisonDrafts, ...materials].sort((left, right) => left.calculationType.localeCompare(right.calculationType) || left.label.localeCompare(right.label));
  const gaps = comparisons.flatMap((comparison) => comparison.gaps);
  const unresolvedControls = unique([
    ...assembly.unresolvedControls,
    ...gaps.map((gap) => gap.message),
    ...(model.status === "accepted" ? [] : ["The current canonical Euclid model is not accepted, so every 4P quantity remains preliminary."]),
    ...comparisons.filter((comparison) => comparison.comparison !== "earthwork" && comparison.negativeVolume > 0)
      .map((comparison) => `${comparison.comparison.replaceAll("_", " ")} contains ${comparison.negativeVolume} ${comparison.volumeUnit} of reverse-sign volume requiring engineering review.`),
  ]);
  const canCalculate = draftQuantities.length > 0;
  const status: HeliosEuclidAlignmentPositionStatus = !canCalculate
    ? "unavailable"
    : model.status !== "accepted" || comparisons.some((comparison) => comparison.intervals.length && comparison.status !== "verified") || unresolvedControls.length
      ? "preliminary"
      : "verified";
  const limitations = unique([
    "4P calculates draft quantities only; it does not write, accept, price, or publish any estimate quantity.",
    "Surface comparisons use exact matching governed offsets and average-end-area integration only across common 4O panel spans.",
    "Material quantities use accepted station limits, lateral limits, and thickness; their vertical placement remains outside the surface comparison unless explicit subgrade geometry exists.",
    "Shrink, swell, waste, over-excavation, unsuitable material, and construction means-and-methods factors are not applied unless separately governed by the estimator.",
    ...assembly.limitations,
  ]);
  const base = {
    version: HELIOS_EUCLID_SURFACE_QUANTITY_VERSION,
    solver: HELIOS_EUCLID_SURFACE_QUANTITY_SOLVER,
    euclidModelId: model.id,
    sourceFingerprint: model.sourceFingerprint,
    alignmentId: assembly.alignmentId,
    alignmentName: assembly.alignmentName,
    status,
    canCalculate,
    surfaceAssembly: assembly,
    comparisons,
    draftQuantities,
    gaps,
    unresolvedControls,
    limitations,
  } satisfies Omit<HeliosEuclidSurfaceQuantityResult, "id" | "fingerprint">;
  const fingerprint = buildHeliosEngineeringParityFingerprint(base);
  return { id: `surface-quantity-result:${fingerprint.split(":")[1]!.slice(0, 32)}`, fingerprint, ...base };
}
