import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import type { HeliosEuclidModel } from "./euclid-contract.ts";

export const HELIOS_EUCLID_REVIEW_VERSION = 1;

export const HELIOS_EUCLID_REVIEW_ACTIONS = [
  "accept",
  "correct",
  "defer",
  "reject",
] as const;

export const HELIOS_EUCLID_REVIEW_ENTITY_TYPES = [
  "alignment",
  "control_point",
  "horizontal_element",
  "station_equation",
  "profile",
  "profile_point",
  "vertical_tangent",
  "vertical_curve",
  "typical_section",
  "structure",
  "invert",
  "material_layer",
] as const;

export type HeliosEuclidReviewAction = (typeof HELIOS_EUCLID_REVIEW_ACTIONS)[number];
export type HeliosEuclidReviewEntityType = (typeof HELIOS_EUCLID_REVIEW_ENTITY_TYPES)[number];
export type HeliosEuclidCorrectionValueType = "number" | "string" | "boolean";

export type HeliosEuclidCorrectionChange = {
  field: string;
  valueType: HeliosEuclidCorrectionValueType;
  numberValue?: number;
  stringValue?: string;
  booleanValue?: boolean;
  unit?: string;
};

export type HeliosEuclidReviewInput = {
  version: typeof HELIOS_EUCLID_REVIEW_VERSION;
  requestId: string;
  action: HeliosEuclidReviewAction;
  euclidModelId: string;
  modelFingerprint: string;
  sourceFingerprint: string;
  targetEntityType: HeliosEuclidReviewEntityType;
  targetEntityId: string;
  targetFingerprint: string;
  reason?: string;
  changes?: HeliosEuclidCorrectionChange[];
};

export type HeliosEuclidReviewDecision = HeliosEuclidReviewInput & {
  id: string;
  decisionFingerprint: string;
  reviewerName: string;
  createdAt: number;
};

export type HeliosEuclidReviewSummary = {
  total: number;
  accepted: number;
  corrected: number;
  deferred: number;
  rejected: number;
  currentDecisions: HeliosEuclidReviewDecision[];
};

const CORRECTABLE_FIELDS: Record<HeliosEuclidReviewEntityType, ReadonlySet<string>> = {
  alignment: new Set(["printedName", "startStation.chainage", "startStation.printedStation", "endStation.chainage", "endStation.printedStation", "increasingDirection"]),
  control_point: new Set(["name", "station.chainage", "station.printedStation", "northing.value", "easting.value", "elevation.value"]),
  horizontal_element: new Set(["startStation.chainage", "startStation.printedStation", "endStation.chainage", "endStation.printedStation", "length.value", "bearing.value", "radius.value", "deltaDegrees.value", "rotation"]),
  station_equation: new Set(["physicalChainage.value", "backStation.value", "aheadStation.value", "printedEquation"]),
  profile: new Set(["printedName", "startStation.chainage", "startStation.printedStation", "endStation.chainage", "endStation.printedStation", "verticalDatum"]),
  profile_point: new Set(["station.chainage", "station.printedStation", "elevation.value"]),
  vertical_tangent: new Set(["gradePercent.value"]),
  vertical_curve: new Set(["incomingGradePercent.value", "outgoingGradePercent.value", "length.value", "incomingLength.value", "outgoingLength.value", "kValue.value"]),
  typical_section: new Set(["name", "stationStart.chainage", "stationStart.printedStation", "stationEnd.chainage", "stationEnd.printedStation", "laneWidthLeft.value", "laneWidthRight.value", "shoulderWidthLeft.value", "shoulderWidthRight.value", "crossSlopeLeftPercent.value", "crossSlopeRightPercent.value"]),
  structure: new Set(["printedName", "station.chainage", "station.printedStation", "offset.value", "skewDegrees.value", "length.value", "width.value", "height.value"]),
  invert: new Set(["station.chainage", "station.printedStation", "offset.value", "rimElevation.value", "invertElevation.value", "pipeSize.value", "pipeMaterial.value", "pipeSlopePercent.value"]),
  material_layer: new Set(["name", "stationStart.chainage", "stationStart.printedStation", "stationEnd.chainage", "stationEnd.printedStation", "offsetLeft.value", "offsetRight.value", "thickness.value", "thicknessUnit"]),
};

export function heliosEuclidCorrectableFields(entityType: HeliosEuclidReviewEntityType) {
  return [...CORRECTABLE_FIELDS[entityType]];
}

const entityCollection: Record<HeliosEuclidReviewEntityType, keyof HeliosEuclidModel> = {
  alignment: "alignments",
  control_point: "controlPoints",
  horizontal_element: "horizontalElements",
  station_equation: "stationEquations",
  profile: "profiles",
  profile_point: "profilePoints",
  vertical_tangent: "verticalTangents",
  vertical_curve: "verticalCurves",
  typical_section: "typicalSections",
  structure: "structures",
  invert: "inverts",
  material_layer: "materialLayers",
};

function boundedText(value: unknown, label: string, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} is required.`);
    return undefined;
  }
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const result = value.trim();
  if ((required && !result) || result.length > 2_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result)) {
    throw new Error(`${label} is invalid.`);
  }
  return result || undefined;
}

export function getHeliosEuclidReviewTarget(
  model: HeliosEuclidModel,
  entityType: HeliosEuclidReviewEntityType,
  entityId: string,
) {
  const rows = model[entityCollection[entityType]] as unknown as Array<{ id: string }>;
  return rows.find((row) => row.id === entityId);
}

export function listHeliosEuclidReviewTargets(model: HeliosEuclidModel) {
  return HELIOS_EUCLID_REVIEW_ENTITY_TYPES.flatMap((entityType) => {
    const rows = model[entityCollection[entityType]] as unknown as Array<{ id: string }>;
    return rows.map((target) => ({ entityType, target }));
  });
}

export function heliosEuclidReviewTargetFingerprint(target: unknown) {
  return buildHeliosEngineeringParityFingerprint(target);
}

export function normalizeHeliosEuclidReviewInput(value: unknown): HeliosEuclidReviewInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Euclid review request is invalid.");
  const input = value as Record<string, unknown>;
  if (input.version !== HELIOS_EUCLID_REVIEW_VERSION) throw new Error("Euclid review version is not supported.");
  if (!HELIOS_EUCLID_REVIEW_ACTIONS.includes(input.action as HeliosEuclidReviewAction)) throw new Error("Euclid review action is invalid.");
  if (!HELIOS_EUCLID_REVIEW_ENTITY_TYPES.includes(input.targetEntityType as HeliosEuclidReviewEntityType)) throw new Error("Euclid review target is invalid.");

  const action = input.action as HeliosEuclidReviewAction;
  const targetEntityType = input.targetEntityType as HeliosEuclidReviewEntityType;
  const reason = boundedText(input.reason, "Review reason", action !== "accept");
  const rawChanges = input.changes === undefined ? [] : input.changes;
  if (!Array.isArray(rawChanges) || rawChanges.length > 20) throw new Error("Euclid correction changes are invalid.");
  const changes = rawChanges.map((raw): HeliosEuclidCorrectionChange => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Euclid correction change is invalid.");
    const change = raw as Record<string, unknown>;
    const field = boundedText(change.field, "Correction field", true)!;
    if (!CORRECTABLE_FIELDS[targetEntityType].has(field)) throw new Error(`Correction field ${field} is not allowed for ${targetEntityType}.`);
    if (!(["number", "string", "boolean"] as const).includes(change.valueType as HeliosEuclidCorrectionValueType)) throw new Error("Correction value type is invalid.");
    const valueType = change.valueType as HeliosEuclidCorrectionValueType;
    const normalized: HeliosEuclidCorrectionChange = { field, valueType };
    if (valueType === "number") {
      if (typeof change.numberValue !== "number" || !Number.isFinite(change.numberValue)) throw new Error(`Correction ${field} requires a finite number.`);
      normalized.numberValue = change.numberValue;
    } else if (valueType === "string") {
      normalized.stringValue = boundedText(change.stringValue, `Correction ${field}`, true)!;
    } else {
      if (typeof change.booleanValue !== "boolean") throw new Error(`Correction ${field} requires a boolean.`);
      normalized.booleanValue = change.booleanValue;
    }
    normalized.unit = boundedText(change.unit, "Correction unit");
    return normalized;
  });
  if (action === "correct" && changes.length === 0) throw new Error("A correction requires at least one changed field.");
  if (action !== "correct" && changes.length > 0) throw new Error("Only a correction can include changed fields.");

  return {
    version: HELIOS_EUCLID_REVIEW_VERSION,
    requestId: boundedText(input.requestId, "Review request", true)!,
    action,
    euclidModelId: boundedText(input.euclidModelId, "Euclid model", true)!,
    modelFingerprint: boundedText(input.modelFingerprint, "Model fingerprint", true)!,
    sourceFingerprint: boundedText(input.sourceFingerprint, "Source fingerprint", true)!,
    targetEntityType,
    targetEntityId: boundedText(input.targetEntityId, "Target entity", true)!,
    targetFingerprint: boundedText(input.targetFingerprint, "Target fingerprint", true)!,
    reason,
    changes: changes.length ? changes : undefined,
  };
}

export function heliosEuclidReviewDecisionFingerprint(input: HeliosEuclidReviewInput) {
  return buildHeliosEngineeringParityFingerprint(input);
}

export function summarizeHeliosEuclidReviewDecisions(
  decisions: HeliosEuclidReviewDecision[],
): HeliosEuclidReviewSummary {
  const latest = new Map<string, HeliosEuclidReviewDecision>();
  for (const decision of [...decisions].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))) {
    latest.set(`${decision.targetEntityType}:${decision.targetEntityId}`, decision);
  }
  const currentDecisions = [...latest.values()].sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id));
  return {
    total: currentDecisions.length,
    accepted: currentDecisions.filter((row) => row.action === "accept").length,
    corrected: currentDecisions.filter((row) => row.action === "correct").length,
    deferred: currentDecisions.filter((row) => row.action === "defer").length,
    rejected: currentDecisions.filter((row) => row.action === "reject").length,
    currentDecisions,
  };
}
