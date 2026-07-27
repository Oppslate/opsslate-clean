export const HELIOS_MEASUREMENT_TYPES = ["count", "length", "area", "volume", "derived"] as const;
export const HELIOS_MEASUREMENT_STATUSES = ["proposed", "accepted", "rejected", "superseded", "blocked"] as const;
export const HELIOS_TAKEOFF_QUANTITY_USES = ["comparative", "production", "purchasing", "risk"] as const;
export const HELIOS_TAKEOFF_REVIEW_ACTIONS = [
  "create_measurement",
  "accept_measurement",
  "reject_measurement",
  "propose_quantity_to_estimate",
  "reject_quantity",
] as const;

export type HeliosMeasurementType = (typeof HELIOS_MEASUREMENT_TYPES)[number];
export type HeliosMeasurementStatus = (typeof HELIOS_MEASUREMENT_STATUSES)[number];
export type HeliosTakeoffQuantityUse = (typeof HELIOS_TAKEOFF_QUANTITY_USES)[number];
export type HeliosTakeoffReviewAction = (typeof HELIOS_TAKEOFF_REVIEW_ACTIONS)[number];

export type HeliosTakeoffPoint = { x: number; y: number };
export type HeliosTakeoffFactor = { label: string; value: number; unit: string };

export type HeliosTakeoffMeasurementDraft = {
  costCodeId: string;
  pageId: string;
  viewKey: string;
  calibrationId?: string;
  geometryRecordIds: string[];
  sourceBasis: "coordinate_geometry" | "dimensioned_geometry" | "calibrated_scale_fallback" | "estimator_measurement";
  measurementType: HeliosMeasurementType;
  label: string;
  geometryKind: "recognized_objects" | "polyline" | "polygon" | "formula" | "estimator_measurement";
  geometry: HeliosTakeoffPoint[];
  objectReferences: string[];
  rawValue: number;
  rawUnit: string;
  outputUnit: string;
  factors: HeliosTakeoffFactor[];
  includedScope: string;
  excludedScope: string;
  assumptions: string[];
  confidence: number;
};

export type HeliosTakeoffMeasurement = HeliosTakeoffMeasurementDraft & {
  id: string;
  runId: string;
  sheetNumber: string;
  viewLabel: string;
  calibrationLabel?: string;
  calculatedValue: number;
  formula: string;
  status: HeliosMeasurementStatus;
  createdByName: string;
  reviewedByName?: string;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type HeliosTakeoffQuantity = {
  id: string;
  runId: string;
  costCodeId: string;
  measurementIds: string[];
  value: number;
  unit: string;
  use: HeliosTakeoffQuantityUse;
  formula: string;
  ownerQuantity?: number;
  ownerUnit?: string;
  variancePercent?: number;
  reconciliationStatus: "not_comparable" | "matching" | "variance";
  status: "proposed" | "sent_to_estimate" | "rejected" | "superseded";
  estimateQuantityId?: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
};

export type HeliosTakeoffTarget = {
  sectionId: string;
  sectionName: string;
  payItemId: string;
  payItemNumber: string;
  payItemDescription: string;
  ownerQuantity?: number;
  ownerUnit: string;
  costCodeId: string;
  costCode: string;
  costCodeDescription: string;
  productionQuantity?: number;
  productionUnit: string;
};

export type HeliosTakeoffWorkspace = {
  id: string;
  projectId: string;
  packageId: string;
  packageRevision: number;
  planRunId: string;
  estimateId: string;
  status: "ready" | "blocked" | "not_applicable";
  measurementCount: number;
  acceptedMeasurementCount: number;
  proposedQuantityCount: number;
  estimateQuantityCount: number;
  blockedReason?: string;
  targets: HeliosTakeoffTarget[];
  measurements: HeliosTakeoffMeasurement[];
  quantities: HeliosTakeoffQuantity[];
  geometry?: import("./civil-geometry.ts").HeliosCivilGeometryModel;
  createdAt: number;
  updatedAt: number;
};

export type HeliosTakeoffReviewInput = {
  action: HeliosTakeoffReviewAction;
  measurementId?: string;
  quantityId?: string;
  measurement?: HeliosTakeoffMeasurementDraft;
  quantityUse?: HeliosTakeoffQuantityUse;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function number(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Enter a number between ${minimum} and ${maximum}.`);
  }
  return value;
}

function enumValue<T extends readonly string[]>(value: unknown, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw new Error("Select a valid takeoff option.");
  return value as T[number];
}

function strings(value: unknown, maximumItems: number, maximumLength: number) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maximumItems).map((item) => text(item, maximumLength)).filter(Boolean);
}

export function calculateTakeoffMeasurement(input: Pick<HeliosTakeoffMeasurementDraft, "rawValue" | "rawUnit" | "outputUnit" | "factors">) {
  if (!Number.isFinite(input.rawValue) || input.rawValue <= 0) throw new Error("Measured values must be greater than zero.");
  const factorProduct = input.factors.reduce((product, factor) => {
    if (!Number.isFinite(factor.value) || factor.value <= 0) throw new Error("Measurement factors must be greater than zero.");
    return product * factor.value;
  }, 1);
  const calculatedValue = input.rawValue * factorProduct;
  if (!Number.isFinite(calculatedValue) || calculatedValue <= 0) throw new Error("The deterministic quantity could not be calculated.");
  const factorText = input.factors.map((factor) => `${factor.label} ${factor.value}${factor.unit ? ` ${factor.unit}` : ""}`);
  return {
    calculatedValue,
    formula: [`${input.rawValue} ${input.rawUnit}`, ...factorText].join(" × ") + ` = ${calculatedValue} ${input.outputUnit}`,
  };
}

export function calculateQuantityVariance(measured: number, owner: number | undefined) {
  if (owner === undefined || owner <= 0) return { reconciliationStatus: "not_comparable" as const };
  const variancePercent = ((measured - owner) / owner) * 100;
  return {
    variancePercent,
    reconciliationStatus: Math.abs(variancePercent) <= 0.01 ? "matching" as const : "variance" as const,
  };
}

export function normalizeTakeoffReviewInput(value: unknown): HeliosTakeoffReviewInput {
  if (!isRecord(value)) throw new Error("Takeoff action must be an object.");
  const action = enumValue(value.action, HELIOS_TAKEOFF_REVIEW_ACTIONS);
  const measurementId = text(value.measurementId, 128) || undefined;
  const quantityId = text(value.quantityId, 128) || undefined;
  if (["accept_measurement", "reject_measurement"].includes(action) && !measurementId) {
    throw new Error("Select a measurement.");
  }
  if (["propose_quantity_to_estimate", "reject_quantity"].includes(action) && !quantityId) {
    throw new Error("Select a takeoff quantity.");
  }
  if (action !== "create_measurement") {
    return {
      action,
      measurementId,
      quantityId,
      quantityUse: value.quantityUse === undefined ? undefined : enumValue(value.quantityUse, HELIOS_TAKEOFF_QUANTITY_USES),
    };
  }
  if (!isRecord(value.measurement)) throw new Error("Enter the takeoff measurement.");
  const measurement = value.measurement;
  const measurementType = enumValue(measurement.measurementType, HELIOS_MEASUREMENT_TYPES);
  const rawValue = number(measurement.rawValue, Number.EPSILON, 1_000_000_000_000);
  const confidence = number(measurement.confidence, 0, 100);
  const geometry = Array.isArray(measurement.geometry)
    ? measurement.geometry.slice(0, 5_000).map((point) => {
        if (!isRecord(point)) throw new Error("Measurement geometry is invalid.");
        return { x: number(point.x, 0, 1), y: number(point.y, 0, 1) };
      })
    : [];
  const factors = Array.isArray(measurement.factors)
    ? measurement.factors.slice(0, 20).map((factor) => {
        if (!isRecord(factor)) throw new Error("Measurement factor is invalid.");
        const label = text(factor.label, 120);
        if (!label) throw new Error("Every factor needs a label.");
        return { label, value: number(factor.value, Number.EPSILON, 1_000_000_000), unit: text(factor.unit, 40) };
      })
    : [];
  const draft: HeliosTakeoffMeasurementDraft = {
    costCodeId: text(measurement.costCodeId, 128),
    pageId: text(measurement.pageId, 128),
    viewKey: text(measurement.viewKey, 128),
    calibrationId: text(measurement.calibrationId, 128) || undefined,
    geometryRecordIds: strings(measurement.geometryRecordIds, 200, 128),
    sourceBasis: enumValue(measurement.sourceBasis, ["coordinate_geometry", "dimensioned_geometry", "calibrated_scale_fallback", "estimator_measurement"] as const),
    measurementType,
    label: text(measurement.label, 240),
    geometryKind: enumValue(measurement.geometryKind, ["recognized_objects", "polyline", "polygon", "formula", "estimator_measurement"] as const),
    geometry,
    objectReferences: strings(measurement.objectReferences, 1_000, 160),
    rawValue,
    rawUnit: text(measurement.rawUnit, 40),
    outputUnit: text(measurement.outputUnit, 40),
    factors,
    includedScope: text(measurement.includedScope, 1_200),
    excludedScope: text(measurement.excludedScope, 1_200),
    assumptions: strings(measurement.assumptions, 40, 500),
    confidence,
  };
  if (!draft.costCodeId || !draft.pageId || !draft.viewKey || !draft.label || !draft.rawUnit || !draft.outputUnit) {
    throw new Error("Cost code, plan view, label, raw unit, and output unit are required.");
  }
  if (measurementType !== "count" && draft.sourceBasis === "calibrated_scale_fallback" && !draft.calibrationId) {
    throw new Error("Scale-fallback measurements require an approved view calibration.");
  }
  if (measurementType !== "count" && ["coordinate_geometry", "dimensioned_geometry"].includes(draft.sourceBasis) && !draft.geometryRecordIds.length) {
    throw new Error("Geometry-based measurements require accepted civil-geometry records.");
  }
  if (measurementType !== "count" && draft.sourceBasis === "estimator_measurement" && !draft.calibrationId && !draft.geometryRecordIds.length) {
    throw new Error("Dimensional measurements require accepted geometry or an approved scale fallback.");
  }
  if (!draft.geometry.length && !draft.objectReferences.length && !draft.includedScope) {
    throw new Error("Describe or identify the measured plan geometry.");
  }
  calculateTakeoffMeasurement(draft);
  return { action, measurement: draft };
}
