import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  validateHeliosEuclidContract,
  type HeliosEuclidModel,
  type HeliosEuclidProfile,
  type HeliosEuclidProfilePoint,
  type HeliosEuclidVerticalCurve,
} from "./euclid-contract.ts";

export const HELIOS_EUCLID_VERTICAL_SOLVER_VERSION = 1;
export const HELIOS_EUCLID_VERTICAL_SOLVER = "euclid-vertical-parabolic-v1";
export const HELIOS_EUCLID_VERTICAL_TOLERANCE_VERSION = "estimating-profile-v1";

export type HeliosEuclidVerticalTolerances = {
  elevationPass: number;
  elevationBlock: number;
  stationPass: number;
  stationBlock: number;
  gradePassPercent: number;
  gradeBlockPercent: number;
  kValuePass: number;
  kValueBlock: number;
};

/** Helios estimating thresholds; they are not survey or agency standards. */
export const HELIOS_EUCLID_VERTICAL_DEFAULT_TOLERANCES: HeliosEuclidVerticalTolerances = {
  elevationPass: 0.02,
  elevationBlock: 0.10,
  stationPass: 0.02,
  stationBlock: 0.10,
  gradePassPercent: 0.01,
  gradeBlockPercent: 0.05,
  kValuePass: 0.10,
  kValueBlock: 0.50,
};

export type HeliosEuclidVerticalCheckStatus = "pass" | "review" | "block" | "not_applicable";

export type HeliosEuclidVerticalCheck = {
  id: string;
  alignmentId: string;
  profileId: string;
  entityIds: string[];
  code: string;
  status: HeliosEuclidVerticalCheckStatus;
  message: string;
  observed?: number;
  expected?: number;
  residual?: number;
  unit?: string;
  passTolerance?: number;
  blockTolerance?: number;
  provenanceIds: string[];
};

export type HeliosEuclidVerticalCurveEvaluation = {
  curveId: string;
  profileId: string;
  chainage: number;
  displayedStation: number;
  elevation: number;
  gradePercent: number;
  method: typeof HELIOS_EUCLID_VERTICAL_SOLVER;
  formula: string;
  inputValueIds: string[];
  provenanceIds: string[];
};

export type HeliosEuclidVerticalCurveResult = {
  curveId: string;
  pvcChainage: number;
  pviChainage: number;
  pvtChainage: number;
  length: number;
  incomingGradePercent: number;
  outgoingGradePercent: number;
  algebraicGradeDifferencePercent: number;
  kValue?: number;
  highLowPoint?: HeliosEuclidVerticalCurveEvaluation;
};

export type HeliosEuclidVerticalProfileSolution = {
  profileId: string;
  alignmentId: string;
  role: HeliosEuclidProfile["role"];
  status: "passed" | "review" | "blocked" | "not_applicable";
  pointCount: number;
  tangentCount: number;
  curveCount: number;
  curveResults: HeliosEuclidVerticalCurveResult[];
  checkCount: number;
  reviewCount: number;
  blockingCount: number;
  checks: HeliosEuclidVerticalCheck[];
};

export type HeliosEuclidVerticalSolution = {
  id: string;
  euclidModelId: string;
  sourceFingerprint: string;
  modelFingerprint: string;
  solver: typeof HELIOS_EUCLID_VERTICAL_SOLVER;
  solverVersion: typeof HELIOS_EUCLID_VERTICAL_SOLVER_VERSION;
  toleranceVersion: typeof HELIOS_EUCLID_VERTICAL_TOLERANCE_VERSION;
  tolerances: HeliosEuclidVerticalTolerances;
  status: "passed" | "review" | "blocked" | "not_applicable";
  profileSolutions: HeliosEuclidVerticalProfileSolution[];
  checkCount: number;
  reviewCount: number;
  blockingCount: number;
};

function round(value: number, places = 12) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function residualStatus(residual: number, pass: number, block: number): HeliosEuclidVerticalCheckStatus {
  if (residual <= pass) return "pass";
  if (residual <= block) return "review";
  return "block";
}

function check(input: Omit<HeliosEuclidVerticalCheck, "id">): HeliosEuclidVerticalCheck {
  return {
    ...input,
    id: `vertical-check:${buildHeliosEngineeringParityFingerprint(input).split(":")[1]!.slice(0, 24)}`,
  };
}

function toleranceCheck(input: {
  alignmentId: string;
  profileId: string;
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
  return check({
    alignmentId: input.alignmentId,
    profileId: input.profileId,
    entityIds: input.entityIds,
    code: input.code,
    status: residualStatus(residual, input.passTolerance, input.blockTolerance),
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

function curvePoints(
  curve: HeliosEuclidVerticalCurve,
  pointById: Map<string, HeliosEuclidProfilePoint>,
) {
  const pvc = pointById.get(curve.pvcPointId);
  const pvi = pointById.get(curve.pviPointId);
  const pvt = pointById.get(curve.pvtPointId);
  return pvc && pvi && pvt ? { pvc, pvi, pvt } : undefined;
}

function curveProvenance(curve: HeliosEuclidVerticalCurve, points: HeliosEuclidProfilePoint[]) {
  return [...new Set([
    ...curve.incomingGradePercent.provenanceIds,
    ...curve.outgoingGradePercent.provenanceIds,
    ...curve.length.provenanceIds,
    ...points.flatMap((point) => [...point.station.provenanceIds, ...point.elevation.provenanceIds]),
  ])].sort();
}

/**
 * Evaluates a normal parabolic vertical curve. It never extrapolates beyond
 * PVC/PVT and never reads plotted pixels.
 */
export function evaluateHeliosEuclidVerticalCurve(input: {
  curve: HeliosEuclidVerticalCurve;
  pvc: HeliosEuclidProfilePoint;
  pvi: HeliosEuclidProfilePoint;
  pvt: HeliosEuclidProfilePoint;
  chainage: number;
}): HeliosEuclidVerticalCurveEvaluation {
  const { curve, pvc, pvi, pvt } = input;
  if (![pvc, pvi, pvt].every((point) => point.profileId === curve.profileId)) throw new Error("Vertical curve controls must belong to the curve profile.");
  const start = pvc.station.chainage;
  const end = pvt.station.chainage;
  if (!Number.isFinite(input.chainage) || input.chainage < start - 1e-9 || input.chainage > end + 1e-9) {
    throw new Error("Vertical curve evaluation cannot extrapolate beyond PVC/PVT.");
  }
  const length = curve.length.value;
  if (!(length > 0) || Math.abs((end - start) - length) > 1e-6) throw new Error("Vertical curve length must match its PVC/PVT chainage range before evaluation.");
  const g1 = curve.incomingGradePercent.value / 100;
  const g2 = curve.outgoingGradePercent.value / 100;
  const x = input.chainage - start;
  const elevation = pvc.elevation.value + g1 * x + ((g2 - g1) / (2 * length)) * x * x;
  const gradePercent = (g1 + ((g2 - g1) / length) * x) * 100;
  const displayedStation = pvc.station.displayedStation + x;
  return {
    curveId: curve.id,
    profileId: curve.profileId,
    chainage: round(input.chainage),
    displayedStation: round(displayedStation),
    elevation: round(elevation),
    gradePercent: round(gradePercent),
    method: HELIOS_EUCLID_VERTICAL_SOLVER,
    formula: "elevation = elevationPVC + g1*x + ((g2-g1)/(2*L))*x^2; grade = g1 + ((g2-g1)/L)*x",
    inputValueIds: [pvc.elevation.id, pvi.elevation.id, pvt.elevation.id, curve.incomingGradePercent.id, curve.outgoingGradePercent.id, curve.length.id],
    provenanceIds: curveProvenance(curve, [pvc, pvi, pvt]),
  };
}

function solveCurve(
  profile: HeliosEuclidProfile,
  curve: HeliosEuclidVerticalCurve,
  pointById: Map<string, HeliosEuclidProfilePoint>,
  tolerances: HeliosEuclidVerticalTolerances,
  checks: HeliosEuclidVerticalCheck[],
): HeliosEuclidVerticalCurveResult | undefined {
  const points = curvePoints(curve, pointById);
  if (!points) {
    checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id], code: "vertical_curve_controls_missing", status: "block", message: "The vertical curve does not have canonical PVC, PVI, and PVT controls.", provenanceIds: curve.length.provenanceIds }));
    return undefined;
  }
  const { pvc, pvi, pvt } = points;
  const provenanceIds = curveProvenance(curve, [pvc, pvi, pvt]);
  const ordered = pvc.station.chainage < pvi.station.chainage && pvi.station.chainage < pvt.station.chainage;
  checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id, pvc.id, pvi.id, pvt.id], code: "vertical_curve_station_order", status: ordered ? "pass" : "block", message: ordered ? "PVC, PVI, and PVT chainage is ordered." : "Vertical curve controls are not ordered PVC < PVI < PVT.", provenanceIds }));
  if (!ordered) return undefined;

  const rangeLength = pvt.station.chainage - pvc.station.chainage;
  checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id, pvc.id, pvt.id], code: "vertical_curve_length", label: "Printed curve length versus PVC/PVT range", observed: curve.length.value, expected: rangeLength, unit: "linear units", passTolerance: tolerances.stationPass, blockTolerance: tolerances.stationBlock, provenanceIds }));
  const midpoint = (pvc.station.chainage + pvt.station.chainage) / 2;
  if (curve.symmetry === "symmetric") {
    checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id, pvi.id], code: "vertical_curve_symmetry", label: "Symmetric PVI midpoint", observed: pvi.station.chainage, expected: midpoint, unit: "linear units", passTolerance: tolerances.stationPass, blockTolerance: tolerances.stationBlock, provenanceIds }));
  } else {
    checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id], code: "asymmetric_vertical_curve_not_certified", status: "block", message: "Stage 4D does not certify an asymmetric curve without accepted unequal leg lengths.", provenanceIds }));
  }

  const g1 = curve.incomingGradePercent.value / 100;
  const g2 = curve.outgoingGradePercent.value / 100;
  const expectedPviFromPvc = pvc.elevation.value + g1 * (pvi.station.chainage - pvc.station.chainage);
  const expectedPvtFromPvi = pvi.elevation.value + g2 * (pvt.station.chainage - pvi.station.chainage);
  checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id, pvc.id, pvi.id], code: "incoming_tangent_closure", label: "Incoming tangent elevation at PVI", observed: pvi.elevation.value, expected: expectedPviFromPvc, unit: "vertical units", passTolerance: tolerances.elevationPass, blockTolerance: tolerances.elevationBlock, provenanceIds }));
  checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id, pvi.id, pvt.id], code: "outgoing_tangent_closure", label: "Outgoing tangent elevation at PVT", observed: pvt.elevation.value, expected: expectedPvtFromPvi, unit: "vertical units", passTolerance: tolerances.elevationPass, blockTolerance: tolerances.elevationBlock, provenanceIds }));

  const expectedType = g2 > g1 ? "sag" : g2 < g1 ? "crest" : "unclassified";
  checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id], code: "vertical_curve_type", status: curve.curveType === expectedType ? "pass" : "block", message: curve.curveType === expectedType ? `Curve type ${expectedType} agrees with signed grades.` : `Printed curve type ${curve.curveType} conflicts with signed grades (${expectedType}).`, provenanceIds }));
  const algebraicDifference = curve.outgoingGradePercent.value - curve.incomingGradePercent.value;
  if (curve.algebraicGradeDifferencePercent) {
    checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id], code: "algebraic_grade_difference", label: "Algebraic grade difference", observed: curve.algebraicGradeDifferencePercent.value, expected: algebraicDifference, unit: "percent", passTolerance: tolerances.gradePassPercent, blockTolerance: tolerances.gradeBlockPercent, provenanceIds }));
  }
  const kValue = Math.abs(algebraicDifference) > 1e-12 ? curve.length.value / Math.abs(algebraicDifference) : undefined;
  if (curve.kValue && kValue !== undefined) {
    checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id], code: "vertical_curve_k_value", label: "Vertical curve K value", observed: curve.kValue.value, expected: kValue, unit: "length per percent", passTolerance: tolerances.kValuePass, blockTolerance: tolerances.kValueBlock, provenanceIds }));
  }

  let highLowPoint: HeliosEuclidVerticalCurveEvaluation | undefined;
  const denominator = g2 - g1;
  if (Math.abs(denominator) > 1e-12) {
    const x = -g1 * curve.length.value / denominator;
    if (x >= 0 && x <= curve.length.value) {
      highLowPoint = evaluateHeliosEuclidVerticalCurve({ curve, pvc, pvi, pvt, chainage: pvc.station.chainage + x });
      if (curve.computedHighLowPointId) {
        const printed = pointById.get(curve.computedHighLowPointId);
        if (printed) {
          checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id, printed.id], code: "vertical_curve_high_low_station", label: "High/low station", observed: printed.station.chainage, expected: highLowPoint.chainage, unit: "linear units", passTolerance: tolerances.stationPass, blockTolerance: tolerances.stationBlock, provenanceIds }));
          checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id, printed.id], code: "vertical_curve_high_low_elevation", label: "High/low elevation", observed: printed.elevation.value, expected: highLowPoint.elevation, unit: "vertical units", passTolerance: tolerances.elevationPass, blockTolerance: tolerances.elevationBlock, provenanceIds }));
        }
      }
    }
  }
  if (curve.reviewState === "accepted" && curve.solverVersion !== HELIOS_EUCLID_VERTICAL_SOLVER) {
    checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [curve.id], code: "vertical_solver_version", status: "block", message: `Accepted vertical curve solver must be ${HELIOS_EUCLID_VERTICAL_SOLVER}.`, provenanceIds }));
  }
  return {
    curveId: curve.id,
    pvcChainage: pvc.station.chainage,
    pviChainage: pvi.station.chainage,
    pvtChainage: pvt.station.chainage,
    length: curve.length.value,
    incomingGradePercent: curve.incomingGradePercent.value,
    outgoingGradePercent: curve.outgoingGradePercent.value,
    algebraicGradeDifferencePercent: round(algebraicDifference),
    kValue: kValue === undefined ? undefined : round(kValue),
    highLowPoint,
  };
}

function profileStatus(checks: HeliosEuclidVerticalCheck[], hasGeometry: boolean): HeliosEuclidVerticalProfileSolution["status"] {
  if (!hasGeometry) return "not_applicable";
  if (checks.some((row) => row.status === "block")) return "blocked";
  if (checks.some((row) => row.status === "review")) return "review";
  return "passed";
}

function solveProfile(model: HeliosEuclidModel, profile: HeliosEuclidProfile, tolerances: HeliosEuclidVerticalTolerances): HeliosEuclidVerticalProfileSolution {
  const points = model.profilePoints.filter((row) => row.profileId === profile.id);
  const pointById = new Map(points.map((row) => [row.id, row]));
  const tangents = model.verticalTangents.filter((row) => row.profileId === profile.id).sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
  const curves = model.verticalCurves.filter((row) => row.profileId === profile.id).sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
  const checks: HeliosEuclidVerticalCheck[] = [];
  const profileProvenance = [...new Set([profile.startStation, profile.endStation].flatMap((row) => row.provenanceIds))].sort();
  if (points.length < 2) checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [profile.id], code: "vertical_geometry_not_available", status: "not_applicable", message: "The profile does not contain at least two canonical control points.", provenanceIds: profileProvenance }));

  const curveControlTypes = new Set(points.map((row) => row.pointType));
  if (["pvc", "pvi", "pvt"].some((type) => curveControlTypes.has(type as HeliosEuclidProfilePoint["pointType"])) && !curves.length) {
    checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [profile.id, ...points.filter((row) => ["pvc", "pvi", "pvt"].includes(row.pointType)).map((row) => row.id)], code: "curve_controls_unmodeled", status: "block", message: "PVC/PVI/PVT controls exist, but no complete canonical vertical-curve record is available.", provenanceIds: [...new Set(points.flatMap((row) => [...row.station.provenanceIds, ...row.elevation.provenanceIds]))].sort() }));
  }

  for (const tangent of tangents) {
    const start = pointById.get(tangent.startPointId);
    const end = pointById.get(tangent.endPointId);
    const provenanceIds = [...new Set([...(start?.elevation.provenanceIds || []), ...(end?.elevation.provenanceIds || []), ...tangent.gradePercent.provenanceIds])].sort();
    if (!start || !end || end.station.chainage <= start.station.chainage) {
      checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [tangent.id], code: "vertical_tangent_controls_invalid", status: "block", message: "The tangent requires ordered canonical start and end controls.", provenanceIds }));
      continue;
    }
    const calculatedGrade = (end.elevation.value - start.elevation.value) / (end.station.chainage - start.station.chainage) * 100;
    checks.push(toleranceCheck({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [tangent.id, start.id, end.id], code: "vertical_tangent_grade", label: "Printed tangent grade versus station/elevation grade", observed: tangent.gradePercent.value, expected: calculatedGrade, unit: "percent", passTolerance: tolerances.gradePassPercent, blockTolerance: tolerances.gradeBlockPercent, provenanceIds }));
  }

  const curveResults = curves.flatMap((curve) => {
    const result = solveCurve(profile, curve, pointById, tolerances, checks);
    return result ? [result] : [];
  });
  if (!profile.verticalDatum) {
    checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [profile.id], code: "vertical_datum_unestablished", status: "review", message: "The profile vertical datum is not established; relative profile math is reviewable but exchange is not certified.", provenanceIds: profileProvenance }));
  }
  const parentEquations = model.stationEquations.filter((row) => row.alignmentId === profile.alignmentId);
  if (parentEquations.length) {
    const firstEquation = Math.min(...parentEquations.map((row) => row.physicalChainage.value));
    const unassigned = points.filter((row) => row.station.chainage > firstEquation + tolerances.stationPass && !row.station.stationEquationId);
    if (unassigned.length) checks.push(check({ alignmentId: profile.alignmentId, profileId: profile.id, entityIds: [profile.id, ...unassigned.map((row) => row.id)], code: "profile_station_branch_unassigned", status: "block", message: `${unassigned.length} profile points beyond a station equation do not identify their branch.`, observed: unassigned.length, unit: "profile points", provenanceIds: [...new Set(unassigned.flatMap((row) => row.station.provenanceIds))].sort() }));
  }
  const hasGeometry = points.length >= 2 && Boolean(tangents.length || curves.length);
  const status = profileStatus(checks, hasGeometry);
  return {
    profileId: profile.id,
    alignmentId: profile.alignmentId,
    role: profile.role,
    status,
    pointCount: points.length,
    tangentCount: tangents.length,
    curveCount: curves.length,
    curveResults,
    checkCount: checks.length,
    reviewCount: checks.filter((row) => row.status === "review").length,
    blockingCount: checks.filter((row) => row.status === "block").length,
    checks,
  };
}

export function solveHeliosEuclidVerticalProfiles(
  model: HeliosEuclidModel,
  options: { tolerances?: Partial<HeliosEuclidVerticalTolerances> } = {},
): HeliosEuclidVerticalSolution {
  const validation = validateHeliosEuclidContract(model);
  if (!validation.valid) throw new Error(`Euclid vertical control requires a contract-valid model: ${validation.issues.map((row) => row.code).join(", ")}`);
  const tolerances = { ...HELIOS_EUCLID_VERTICAL_DEFAULT_TOLERANCES, ...options.tolerances };
  for (const [name, value] of Object.entries(tolerances)) if (!Number.isFinite(value) || value < 0) throw new Error(`Vertical tolerance ${name} must be a non-negative finite number.`);
  const profileSolutions = [...model.profiles].sort((left, right) => left.id.localeCompare(right.id)).map((profile) => solveProfile(model, profile, tolerances));
  const checkCount = profileSolutions.reduce((sum, row) => sum + row.checkCount, 0);
  const reviewCount = profileSolutions.reduce((sum, row) => sum + row.reviewCount, 0);
  const blockingCount = profileSolutions.reduce((sum, row) => sum + row.blockingCount, 0);
  const applicable = profileSolutions.filter((row) => row.status !== "not_applicable");
  const status = !applicable.length ? "not_applicable" as const : blockingCount ? "blocked" as const : reviewCount ? "review" as const : "passed" as const;
  const modelFingerprint = buildHeliosEngineeringParityFingerprint({ id: model.id, sourceFingerprint: model.sourceFingerprint, schemaVersion: model.schemaVersion, processingVersion: model.processingVersion, alignments: model.alignments, stationEquations: model.stationEquations, profiles: model.profiles, profilePoints: model.profilePoints, verticalTangents: model.verticalTangents, verticalCurves: model.verticalCurves });
  return {
    id: `vertical-solution:${buildHeliosEngineeringParityFingerprint({ modelFingerprint, tolerances, solver: HELIOS_EUCLID_VERTICAL_SOLVER }).split(":")[1]!.slice(0, 32)}`,
    euclidModelId: model.id,
    sourceFingerprint: model.sourceFingerprint,
    modelFingerprint,
    solver: HELIOS_EUCLID_VERTICAL_SOLVER,
    solverVersion: HELIOS_EUCLID_VERTICAL_SOLVER_VERSION,
    toleranceVersion: HELIOS_EUCLID_VERTICAL_TOLERANCE_VERSION,
    tolerances,
    status,
    profileSolutions,
    checkCount,
    reviewCount,
    blockingCount,
  };
}

export function heliosEuclidVerticalSolutionFingerprint(solution: HeliosEuclidVerticalSolution) {
  return buildHeliosEngineeringParityFingerprint(solution);
}

export type HeliosEuclidVerticalSolutionChunk = { profileId: string; chunkIndex: number; checkCount: number; payloadJson: string; payloadFingerprint: string };

export function buildHeliosEuclidVerticalSolutionChunks(solution: HeliosEuclidVerticalSolution, maximumChecksPerChunk = 75): HeliosEuclidVerticalSolutionChunk[] {
  if (!Number.isSafeInteger(maximumChecksPerChunk) || maximumChecksPerChunk < 1 || maximumChecksPerChunk > 200) throw new Error("Vertical solution chunk size must be between 1 and 200.");
  return solution.profileSolutions.flatMap((profile) => {
    const chunks: HeliosEuclidVerticalSolutionChunk[] = [];
    for (let index = 0; index < Math.max(1, profile.checks.length); index += maximumChecksPerChunk) {
      const payload = profile.checks.slice(index, index + maximumChecksPerChunk);
      const payloadJson = JSON.stringify(payload);
      if (payloadJson.length > 700_000) throw new Error("Vertical solution chunk exceeds the storage safety limit.");
      chunks.push({ profileId: profile.profileId, chunkIndex: chunks.length, checkCount: payload.length, payloadJson, payloadFingerprint: buildHeliosEngineeringParityFingerprint(payload) });
    }
    return chunks;
  });
}
