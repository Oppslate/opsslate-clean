import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  validateHeliosEuclidContract,
  type HeliosEuclidAlignment,
  type HeliosEuclidHorizontalElement,
  type HeliosEuclidModel,
  type HeliosEuclidReviewState,
  type HeliosEuclidStationEquation,
  type HeliosEuclidValue,
} from "./euclid-contract.ts";

export const HELIOS_EUCLID_HORIZONTAL_SOLVER_VERSION = 1;
export const HELIOS_EUCLID_HORIZONTAL_SOLVER = "euclid-horizontal-v1";
export const HELIOS_EUCLID_HORIZONTAL_TOLERANCE_VERSION = "estimating-control-v1";

export type HeliosEuclidHorizontalTolerances = {
  duplicatePointPass: number;
  duplicatePointBlock: number;
  endpointClosurePass: number;
  endpointClosureBlock: number;
  curveLengthPass: number;
  curveLengthBlock: number;
  stationLengthPass: number;
  stationLengthBlock: number;
  bearingPassDegrees: number;
  bearingBlockDegrees: number;
};

/**
 * Estimating-grade defaults. These are Helios validation thresholds, not
 * survey or agency standards. Projects may supply stricter reviewed values.
 */
export const HELIOS_EUCLID_HORIZONTAL_DEFAULT_TOLERANCES: HeliosEuclidHorizontalTolerances = {
  duplicatePointPass: 0.02,
  duplicatePointBlock: 0.10,
  endpointClosurePass: 0.05,
  endpointClosureBlock: 0.20,
  curveLengthPass: 0.02,
  curveLengthBlock: 0.10,
  stationLengthPass: 0.02,
  stationLengthBlock: 0.10,
  bearingPassDegrees: 0.01,
  bearingBlockDegrees: 0.05,
};

export type HeliosEuclidHorizontalCheckStatus = "pass" | "review" | "block" | "not_applicable";

export type HeliosEuclidHorizontalCheck = {
  id: string;
  alignmentId: string;
  entityIds: string[];
  code: string;
  status: HeliosEuclidHorizontalCheckStatus;
  message: string;
  observed?: number;
  expected?: number;
  residual?: number;
  unit?: string;
  passTolerance?: number;
  blockTolerance?: number;
  provenanceIds: string[];
};

export type HeliosEuclidHorizontalAlignmentSolution = {
  alignmentId: string;
  status: "passed" | "review" | "blocked" | "not_applicable";
  orderedElementIds: string[];
  controlPointCount: number;
  elementCount: number;
  stationEquationCount: number;
  solvedLength: number;
  startChainage: number;
  endChainage: number;
  checkCount: number;
  reviewCount: number;
  blockingCount: number;
  checks: HeliosEuclidHorizontalCheck[];
};

export type HeliosEuclidHorizontalSolution = {
  id: string;
  euclidModelId: string;
  sourceFingerprint: string;
  modelFingerprint: string;
  solver: typeof HELIOS_EUCLID_HORIZONTAL_SOLVER;
  solverVersion: typeof HELIOS_EUCLID_HORIZONTAL_SOLVER_VERSION;
  toleranceVersion: typeof HELIOS_EUCLID_HORIZONTAL_TOLERANCE_VERSION;
  tolerances: HeliosEuclidHorizontalTolerances;
  status: "passed" | "review" | "blocked" | "not_applicable";
  alignmentSolutions: HeliosEuclidHorizontalAlignmentSolution[];
  checkCount: number;
  reviewCount: number;
  blockingCount: number;
};

export type HeliosEuclidRawStationEquation = {
  id: string;
  alignmentId: string;
  backStation: number;
  aheadStation: number;
  printedEquation: string;
  provenanceIds: string[];
  reviewState: HeliosEuclidReviewState;
};

export type HeliosEuclidStationEquationResolution = {
  equations: HeliosEuclidStationEquation[];
  issues: Array<{ code: string; message: string; equationIds: string[] }>;
};

function finite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function round(value: number, places = 12) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function printedStation(value: number) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const major = Math.floor(absolute / 100);
  const minor = (absolute - major * 100).toFixed(2).padStart(5, "0");
  return `${sign}${major}+${minor}`;
}

function printedValue(
  id: string,
  value: number,
  printed: string,
  provenanceIds: string[],
  reviewState: HeliosEuclidReviewState,
): HeliosEuclidValue<number> {
  return {
    id,
    value,
    origin: "printed",
    printedValue: printed,
    inputValueIds: [],
    provenanceIds,
    reviewState,
  };
}

/**
 * Resolves physical equation locations from the continuous chainage offset.
 * It never changes or assigns the branch of any other station record.
 */
export function resolveHeliosEuclidStationEquations(input: {
  alignmentId: string;
  startChainage: number;
  startDisplayedStation: number;
  equations: HeliosEuclidRawStationEquation[];
}): HeliosEuclidStationEquationResolution {
  finite(input.startChainage, "Station-equation start chainage");
  finite(input.startDisplayedStation, "Station-equation start display");
  const remaining = [...input.equations];
  const equations: HeliosEuclidStationEquation[] = [];
  const issues: HeliosEuclidStationEquationResolution["issues"] = [];
  let offset = input.startDisplayedStation - input.startChainage;
  let minimumChainage = input.startChainage;

  while (remaining.length) {
    const candidates = remaining
      .map((equation) => ({ equation, physicalChainage: equation.backStation - offset }))
      .filter((candidate) => Number.isFinite(candidate.physicalChainage) && candidate.physicalChainage >= minimumChainage - 1e-9)
      .sort((left, right) => left.physicalChainage - right.physicalChainage || left.equation.id.localeCompare(right.equation.id));
    if (!candidates.length) {
      issues.push({
        code: "station_equation_order_unresolved",
        message: "The remaining printed station equations cannot be placed after the prior physical equation location.",
        equationIds: remaining.map((row) => row.id).sort(),
      });
      break;
    }
    const candidate = candidates[0]!;
    const tied = candidates.filter((row) => Math.abs(row.physicalChainage - candidate.physicalChainage) <= 1e-9);
    if (tied.length > 1) {
      issues.push({
        code: "station_equation_location_ambiguous",
        message: "Multiple printed station equations resolve to the same physical chainage and require review.",
        equationIds: tied.map((row) => row.equation.id).sort(),
      });
      break;
    }

    const raw = candidate.equation;
    const backId = `${raw.id}:back`;
    const aheadId = `${raw.id}:ahead`;
    const physicalId = `${raw.id}:physical-chainage`;
    const prior = equations.at(-1);
    const inputValueIds = prior
      ? [backId, prior.physicalChainage.id, prior.aheadStation.id]
      : [backId];
    const formula = prior
      ? "back station - (prior ahead station - prior physical chainage)"
      : `back station - initial displayed/chainage offset (${round(offset)})`;
    const resolved: HeliosEuclidStationEquation = {
      id: raw.id,
      alignmentId: input.alignmentId,
      physicalChainage: {
        id: physicalId,
        value: round(candidate.physicalChainage),
        origin: "computed",
        formula,
        inputValueIds,
        provenanceIds: raw.provenanceIds,
        reviewState: raw.reviewState,
      },
      backStation: printedValue(backId, raw.backStation, printedStation(raw.backStation), raw.provenanceIds, raw.reviewState),
      aheadStation: printedValue(aheadId, raw.aheadStation, printedStation(raw.aheadStation), raw.provenanceIds, raw.reviewState),
      printedEquation: raw.printedEquation,
      reviewState: raw.reviewState,
    };
    equations.push(resolved);
    remaining.splice(remaining.indexOf(raw), 1);
    minimumChainage = candidate.physicalChainage + 1e-9;
    offset = raw.aheadStation - candidate.physicalChainage;
  }
  return { equations, issues };
}

function normalizedAngle(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function angularDifference(left: number, right: number) {
  const delta = Math.abs(normalizedAngle(left) - normalizedAngle(right));
  return Math.min(delta, 360 - delta);
}

/** Parses quadrant bearings and azimuths into degrees clockwise from north. */
export function parseHeliosEuclidBearing(value: string): number | undefined {
  const normalized = value
    .toUpperCase()
    .replace(/[°º]/g, " ")
    .replace(/[′']/g, " ")
    .replace(/[″\"]/g, " ")
    .replace(/\bDEG(?:REE)?S?\b/g, " ")
    .replace(/\bMIN(?:UTE)?S?\b/g, " ")
    .replace(/\bSEC(?:OND)?S?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const quadrant = normalized.match(/^([NS])\s*([0-9]+(?:\.[0-9]+)?)(?:\s+([0-9]+(?:\.[0-9]+)?))?(?:\s+([0-9]+(?:\.[0-9]+)?))?\s*([EW])$/);
  if (quadrant) {
    const degrees = Number(quadrant[2]);
    const minutes = Number(quadrant[3] || 0);
    const seconds = Number(quadrant[4] || 0);
    if (degrees > 90 || minutes >= 60 || seconds >= 60) return undefined;
    const angle = degrees + minutes / 60 + seconds / 3600;
    if (quadrant[1] === "N" && quadrant[5] === "E") return angle;
    if (quadrant[1] === "S" && quadrant[5] === "E") return 180 - angle;
    if (quadrant[1] === "S" && quadrant[5] === "W") return 180 + angle;
    return 360 - angle;
  }
  const azimuth = normalized.match(/^(?:AZ(?:IMUTH)?\s*)?([0-9]+(?:\.[0-9]+)?)$/);
  if (!azimuth) return undefined;
  const result = Number(azimuth[1]);
  return result >= 0 && result <= 360 ? normalizedAngle(result) : undefined;
}

function coordinateAzimuth(start: { northing: number; easting: number }, end: { northing: number; easting: number }) {
  return normalizedAngle(Math.atan2(end.easting - start.easting, end.northing - start.northing) * 180 / Math.PI);
}

function coordinateDistance(start: { northing: number; easting: number }, end: { northing: number; easting: number }) {
  return Math.hypot(end.northing - start.northing, end.easting - start.easting);
}

function statusForResidual(residual: number, passTolerance: number, blockTolerance: number): HeliosEuclidHorizontalCheckStatus {
  if (residual <= passTolerance) return "pass";
  if (residual <= blockTolerance) return "review";
  return "block";
}

function check(input: Omit<HeliosEuclidHorizontalCheck, "id">): HeliosEuclidHorizontalCheck {
  return {
    ...input,
    id: `horizontal-check:${buildHeliosEngineeringParityFingerprint(input).split(":")[1]!.slice(0, 24)}`,
  };
}

function toleranceCheck(input: {
  alignmentId: string;
  entityIds: string[];
  code: string;
  label: string;
  observed: number;
  expected: number;
  unit: string;
  passTolerance: number;
  blockTolerance: number;
  provenanceIds: string[];
}) {
  const residual = Math.abs(input.observed - input.expected);
  const status = statusForResidual(residual, input.passTolerance, input.blockTolerance);
  return check({
    alignmentId: input.alignmentId,
    entityIds: input.entityIds,
    code: input.code,
    status,
    message: `${input.label}: residual ${round(residual, 8)} ${input.unit}.`,
    observed: round(input.observed),
    expected: round(input.expected),
    residual: round(residual),
    unit: input.unit,
    passTolerance: input.passTolerance,
    blockTolerance: input.blockTolerance,
    provenanceIds: [...new Set(input.provenanceIds)].sort(),
  });
}

function valueProvenance(element: HeliosEuclidHorizontalElement) {
  const ids = [
    ...element.startStation.provenanceIds,
    ...element.endStation.provenanceIds,
    ...element.length.provenanceIds,
  ];
  if (element.elementType === "line") ids.push(...element.bearing.provenanceIds);
  if (element.elementType === "circular_curve") ids.push(...element.radius.provenanceIds, ...element.deltaDegrees.provenanceIds);
  return [...new Set(ids)].sort();
}

function alignmentStatus(checks: HeliosEuclidHorizontalCheck[], hasGeometry: boolean): HeliosEuclidHorizontalAlignmentSolution["status"] {
  if (!hasGeometry) return "not_applicable";
  if (checks.some((row) => row.status === "block")) return "blocked";
  if (checks.some((row) => row.status === "review")) return "review";
  return "passed";
}

function solveAlignment(
  model: HeliosEuclidModel,
  alignment: HeliosEuclidAlignment,
  tolerances: HeliosEuclidHorizontalTolerances,
): HeliosEuclidHorizontalAlignmentSolution {
  const points = model.controlPoints.filter((row) => row.alignmentId === alignment.id);
  const pointById = new Map(points.map((row) => [row.id, row]));
  const elements = model.horizontalElements
    .filter((row) => row.alignmentId === alignment.id)
    .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
  const equations = model.stationEquations
    .filter((row) => row.alignmentId === alignment.id)
    .sort((left, right) => left.physicalChainage.value - right.physicalChainage.value || left.id.localeCompare(right.id));
  const checks: HeliosEuclidHorizontalCheck[] = [];

  if (!points.length || !elements.length) {
    checks.push(check({
      alignmentId: alignment.id,
      entityIds: [alignment.id],
      code: "horizontal_geometry_not_available",
      status: "not_applicable",
      message: "The canonical Euclid model has no complete horizontal control chain for this alignment.",
      provenanceIds: [...new Set([alignment.startStation, alignment.endStation].flatMap((row) => row.provenanceIds))].sort(),
    }));
  }

  const stations = new Map<number, typeof points>();
  for (const point of points) stations.set(point.station.chainage, [...(stations.get(point.station.chainage) || []), point]);
  for (const duplicates of stations.values()) {
    for (let index = 1; index < duplicates.length; index += 1) {
      const left = duplicates[0]!;
      const right = duplicates[index]!;
      checks.push(toleranceCheck({
        alignmentId: alignment.id,
        entityIds: [left.id, right.id],
        code: "duplicate_control_point_closure",
        label: "Duplicate control-point coordinate closure",
        observed: coordinateDistance({ northing: left.northing.value, easting: left.easting.value }, { northing: right.northing.value, easting: right.easting.value }),
        expected: 0,
        unit: "linear units",
        passTolerance: tolerances.duplicatePointPass,
        blockTolerance: tolerances.duplicatePointBlock,
        provenanceIds: [...left.northing.provenanceIds, ...left.easting.provenanceIds, ...right.northing.provenanceIds, ...right.easting.provenanceIds],
      }));
    }
  }

  let prior: HeliosEuclidHorizontalElement | undefined;
  for (const element of elements) {
    const provenanceIds = valueProvenance(element);
    const start = pointById.get(element.startPointId);
    const end = pointById.get(element.endPointId);
    if (!start || !end) {
      checks.push(check({ alignmentId: alignment.id, entityIds: [element.id], code: "element_control_missing", status: "block", message: "The element does not have both canonical control-point endpoints.", provenanceIds }));
      prior = element;
      continue;
    }
    if (prior) {
      const sequenceExpected = prior.sequence + 1;
      checks.push(check({
        alignmentId: alignment.id,
        entityIds: [prior.id, element.id],
        code: "element_sequence",
        status: element.sequence === sequenceExpected ? "pass" : "block",
        message: element.sequence === sequenceExpected ? "Element sequence is continuous." : `Expected sequence ${sequenceExpected}; found ${element.sequence}.`,
        observed: element.sequence,
        expected: sequenceExpected,
        unit: "sequence",
        provenanceIds: [...new Set([...valueProvenance(prior), ...provenanceIds])].sort(),
      }));
      const priorEnd = pointById.get(prior.endPointId);
      if (priorEnd) {
        checks.push(toleranceCheck({
          alignmentId: alignment.id,
          entityIds: [prior.id, element.id, priorEnd.id, start.id],
          code: "element_endpoint_closure",
          label: "Adjacent element endpoint closure",
          observed: coordinateDistance({ northing: priorEnd.northing.value, easting: priorEnd.easting.value }, { northing: start.northing.value, easting: start.easting.value }),
          expected: 0,
          unit: "linear units",
          passTolerance: tolerances.endpointClosurePass,
          blockTolerance: tolerances.endpointClosureBlock,
          provenanceIds: [...priorEnd.northing.provenanceIds, ...priorEnd.easting.provenanceIds, ...start.northing.provenanceIds, ...start.easting.provenanceIds],
        }));
      }
      const stationGap = element.startStation.chainage - prior.endStation.chainage;
      checks.push(toleranceCheck({
        alignmentId: alignment.id,
        entityIds: [prior.id, element.id],
        code: "element_station_continuity",
        label: "Adjacent element chainage continuity",
        observed: stationGap,
        expected: 0,
        unit: "linear units",
        passTolerance: tolerances.stationLengthPass,
        blockTolerance: tolerances.stationLengthBlock,
        provenanceIds: [...new Set([...prior.endStation.provenanceIds, ...element.startStation.provenanceIds])].sort(),
      }));
    }

    const chord = coordinateDistance({ northing: start.northing.value, easting: start.easting.value }, { northing: end.northing.value, easting: end.easting.value });
    const stationLength = element.endStation.chainage - element.startStation.chainage;
    checks.push(toleranceCheck({
      alignmentId: alignment.id,
      entityIds: [element.id],
      code: "element_station_length",
      label: "Element length versus continuous chainage",
      observed: stationLength,
      expected: element.length.value,
      unit: "linear units",
      passTolerance: tolerances.stationLengthPass,
      blockTolerance: tolerances.stationLengthBlock,
      provenanceIds,
    }));
    if (element.elementType === "line") {
      checks.push(toleranceCheck({
        alignmentId: alignment.id,
        entityIds: [element.id, start.id, end.id],
        code: "line_coordinate_length",
        label: "Line coordinate distance versus printed length",
        observed: chord,
        expected: element.length.value,
        unit: "linear units",
        passTolerance: tolerances.endpointClosurePass,
        blockTolerance: tolerances.endpointClosureBlock,
        provenanceIds,
      }));
      const parsed = parseHeliosEuclidBearing(element.bearing.value);
      if (parsed === undefined) {
        checks.push(check({ alignmentId: alignment.id, entityIds: [element.id], code: "bearing_unparseable", status: "block", message: `The printed bearing cannot be parsed deterministically: ${element.bearing.printedValue || element.bearing.value}.`, provenanceIds }));
      } else {
        const coordinate = coordinateAzimuth({ northing: start.northing.value, easting: start.easting.value }, { northing: end.northing.value, easting: end.easting.value });
        const residual = angularDifference(parsed, coordinate);
        checks.push({
          ...toleranceCheck({ alignmentId: alignment.id, entityIds: [element.id, start.id, end.id], code: "line_bearing_closure", label: "Printed bearing versus coordinate azimuth", observed: coordinate, expected: parsed, unit: "degrees", passTolerance: tolerances.bearingPassDegrees, blockTolerance: tolerances.bearingBlockDegrees, provenanceIds }),
          residual: round(residual),
          status: statusForResidual(residual, tolerances.bearingPassDegrees, tolerances.bearingBlockDegrees),
          message: `Printed bearing versus coordinate azimuth: angular residual ${round(residual, 8)} degrees.`,
        });
      }
    } else if (element.elementType === "circular_curve") {
      const arc = element.radius.value * element.deltaDegrees.value * Math.PI / 180;
      checks.push(toleranceCheck({ alignmentId: alignment.id, entityIds: [element.id], code: "curve_arc_length", label: "Printed curve length versus radius times delta", observed: element.length.value, expected: arc, unit: "linear units", passTolerance: tolerances.curveLengthPass, blockTolerance: tolerances.curveLengthBlock, provenanceIds }));
      const expectedChord = 2 * element.radius.value * Math.sin(element.deltaDegrees.value * Math.PI / 360);
      checks.push(toleranceCheck({ alignmentId: alignment.id, entityIds: [element.id, start.id, end.id], code: "curve_chord_closure", label: "Curve endpoint chord versus radius/delta chord", observed: chord, expected: expectedChord, unit: "linear units", passTolerance: tolerances.endpointClosurePass, blockTolerance: tolerances.endpointClosureBlock, provenanceIds }));
      if (element.chordLength) checks.push(toleranceCheck({ alignmentId: alignment.id, entityIds: [element.id], code: "curve_printed_chord", label: "Printed chord versus radius/delta chord", observed: element.chordLength.value, expected: expectedChord, unit: "linear units", passTolerance: tolerances.curveLengthPass, blockTolerance: tolerances.curveLengthBlock, provenanceIds }));
      if (element.tangentLength) {
        const expectedTangent = element.radius.value * Math.tan(element.deltaDegrees.value * Math.PI / 360);
        checks.push(toleranceCheck({ alignmentId: alignment.id, entityIds: [element.id], code: "curve_tangent_length", label: "Printed tangent versus radius/delta tangent", observed: element.tangentLength.value, expected: expectedTangent, unit: "linear units", passTolerance: tolerances.curveLengthPass, blockTolerance: tolerances.curveLengthBlock, provenanceIds }));
      }
    } else {
      checks.push(check({ alignmentId: alignment.id, entityIds: [element.id], code: "spiral_solver_pending", status: "block", message: "Stage 4C does not certify spiral geometry without complete clothoid parameters.", provenanceIds }));
    }
    prior = element;
  }

  let priorEquation: HeliosEuclidStationEquation | undefined;
  for (const equation of equations) {
    const provenanceIds = [...new Set([...equation.physicalChainage.provenanceIds, ...equation.backStation.provenanceIds, ...equation.aheadStation.provenanceIds])].sort();
    const expectedBack = priorEquation
      ? equation.physicalChainage.value + (priorEquation.aheadStation.value - priorEquation.physicalChainage.value)
      : equation.physicalChainage.value + (alignment.startStation.displayedStation - alignment.startStation.chainage);
    checks.push(toleranceCheck({ alignmentId: alignment.id, entityIds: [equation.id], code: "station_equation_chainage", label: "Station equation back station versus continuous-chainage mapping", observed: equation.backStation.value, expected: expectedBack, unit: "linear units", passTolerance: tolerances.stationLengthPass, blockTolerance: tolerances.stationLengthBlock, provenanceIds }));
    const inRange = equation.physicalChainage.value >= alignment.startStation.chainage - tolerances.stationLengthPass
      && equation.physicalChainage.value <= alignment.endStation.chainage + tolerances.stationLengthPass;
    checks.push(check({ alignmentId: alignment.id, entityIds: [equation.id], code: "station_equation_range", status: inRange ? "pass" : "block", message: inRange ? "Station equation lies within the alignment chainage range." : "Station equation lies outside the alignment chainage range.", observed: equation.physicalChainage.value, unit: "linear units", provenanceIds }));
    priorEquation = equation;
  }

  if (equations.length) {
    const unassigned = [
      ...points.map((row) => row.station),
      ...elements.flatMap((row) => [row.startStation, row.endStation]),
    ].filter((row) => row.chainage > equations[0]!.physicalChainage.value + tolerances.stationLengthPass && !row.stationEquationId);
    if (unassigned.length) {
      checks.push(check({
        alignmentId: alignment.id,
        entityIds: [alignment.id, ...equations.map((row) => row.id)],
        code: "station_branch_unassigned",
        status: "block",
        message: `${unassigned.length} station records beyond the first equation do not identify their station-equation branch; chainage-dependent use is blocked.`,
        observed: unassigned.length,
        unit: "station records",
        provenanceIds: [...new Set(unassigned.flatMap((row) => row.provenanceIds))].sort(),
      }));
    }
  }

  const solvedLength = elements.reduce((sum, element) => sum + element.length.value, 0);
  if (elements.length) {
    checks.push(toleranceCheck({ alignmentId: alignment.id, entityIds: [alignment.id, ...elements.map((row) => row.id)], code: "alignment_length_closure", label: "Element total versus alignment chainage range", observed: solvedLength, expected: alignment.endStation.chainage - alignment.startStation.chainage, unit: "linear units", passTolerance: tolerances.stationLengthPass, blockTolerance: tolerances.stationLengthBlock, provenanceIds: [...new Set(elements.flatMap(valueProvenance))].sort() }));
  }

  const status = alignmentStatus(checks, Boolean(points.length && elements.length));
  return {
    alignmentId: alignment.id,
    status,
    orderedElementIds: elements.map((row) => row.id),
    controlPointCount: points.length,
    elementCount: elements.length,
    stationEquationCount: equations.length,
    solvedLength: round(solvedLength),
    startChainage: alignment.startStation.chainage,
    endChainage: alignment.endStation.chainage,
    checkCount: checks.length,
    reviewCount: checks.filter((row) => row.status === "review").length,
    blockingCount: checks.filter((row) => row.status === "block").length,
    checks,
  };
}

export function solveHeliosEuclidHorizontalControl(
  model: HeliosEuclidModel,
  options: { tolerances?: Partial<HeliosEuclidHorizontalTolerances> } = {},
): HeliosEuclidHorizontalSolution {
  const validation = validateHeliosEuclidContract(model);
  if (!validation.valid) throw new Error(`Euclid horizontal control requires a contract-valid model: ${validation.issues.map((row) => row.code).join(", ")}`);
  const tolerances = { ...HELIOS_EUCLID_HORIZONTAL_DEFAULT_TOLERANCES, ...options.tolerances };
  for (const [name, value] of Object.entries(tolerances)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Horizontal tolerance ${name} must be a non-negative finite number.`);
  }
  const alignmentSolutions = [...model.alignments]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((alignment) => solveAlignment(model, alignment, tolerances));
  const checkCount = alignmentSolutions.reduce((sum, row) => sum + row.checkCount, 0);
  const reviewCount = alignmentSolutions.reduce((sum, row) => sum + row.reviewCount, 0);
  const blockingCount = alignmentSolutions.reduce((sum, row) => sum + row.blockingCount, 0);
  const applicable = alignmentSolutions.filter((row) => row.status !== "not_applicable");
  const status = !applicable.length
    ? "not_applicable" as const
    : blockingCount
      ? "blocked" as const
      : reviewCount
        ? "review" as const
        : "passed" as const;
  const modelFingerprint = buildHeliosEngineeringParityFingerprint({
    id: model.id,
    sourceFingerprint: model.sourceFingerprint,
    schemaVersion: model.schemaVersion,
    processingVersion: model.processingVersion,
    alignments: model.alignments,
    controlPoints: model.controlPoints,
    horizontalElements: model.horizontalElements,
    stationEquations: model.stationEquations,
  });
  return {
    id: `horizontal-solution:${buildHeliosEngineeringParityFingerprint({ modelFingerprint, tolerances, solver: HELIOS_EUCLID_HORIZONTAL_SOLVER }).split(":")[1]!.slice(0, 32)}`,
    euclidModelId: model.id,
    sourceFingerprint: model.sourceFingerprint,
    modelFingerprint,
    solver: HELIOS_EUCLID_HORIZONTAL_SOLVER,
    solverVersion: HELIOS_EUCLID_HORIZONTAL_SOLVER_VERSION,
    toleranceVersion: HELIOS_EUCLID_HORIZONTAL_TOLERANCE_VERSION,
    tolerances,
    status,
    alignmentSolutions,
    checkCount,
    reviewCount,
    blockingCount,
  };
}

export function heliosEuclidHorizontalSolutionFingerprint(solution: HeliosEuclidHorizontalSolution) {
  return buildHeliosEngineeringParityFingerprint(solution);
}

export type HeliosEuclidHorizontalSolutionChunk = {
  alignmentId: string;
  chunkIndex: number;
  checkCount: number;
  payloadJson: string;
  payloadFingerprint: string;
};

export function buildHeliosEuclidHorizontalSolutionChunks(
  solution: HeliosEuclidHorizontalSolution,
  maximumChecksPerChunk = 75,
): HeliosEuclidHorizontalSolutionChunk[] {
  if (!Number.isSafeInteger(maximumChecksPerChunk) || maximumChecksPerChunk < 1 || maximumChecksPerChunk > 200) {
    throw new Error("Horizontal solution chunk size must be between 1 and 200.");
  }
  return solution.alignmentSolutions.flatMap((alignment) => {
    const chunks: HeliosEuclidHorizontalSolutionChunk[] = [];
    const checks = alignment.checks.length ? alignment.checks : [];
    for (let index = 0; index < Math.max(1, checks.length); index += maximumChecksPerChunk) {
      const payload = checks.slice(index, index + maximumChecksPerChunk);
      const payloadJson = JSON.stringify(payload);
      if (payloadJson.length > 700_000) throw new Error("Horizontal solution chunk exceeds the storage safety limit.");
      chunks.push({
        alignmentId: alignment.alignmentId,
        chunkIndex: chunks.length,
        checkCount: payload.length,
        payloadJson,
        payloadFingerprint: buildHeliosEngineeringParityFingerprint(payload),
      });
    }
    return chunks;
  });
}
