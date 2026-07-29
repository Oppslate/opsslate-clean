import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  validateHeliosEuclidContract,
  type HeliosEuclidLinearUnit,
  type HeliosEuclidModel,
  type HeliosEuclidReviewState,
} from "./euclid-contract.ts";
import {
  heliosEuclidIntegrationSolutionFingerprint,
  heliosEuclidIntegrationModelFingerprint,
  type HeliosEuclidIntegrationSolution,
  type HeliosEuclidQuantityCapability,
  type HeliosEuclidQuantityReadiness,
} from "./euclid-integration.ts";
import { euclidModelFingerprint } from "./euclid-shadow.ts";

export const HELIOS_EUCLID_QUANTITY_PUBLICATION_VERSION = 1;
export const HELIOS_EUCLID_QUANTITY_PUBLISHER = "helios-euclid-quantity-publication";
export const HELIOS_EUCLID_QUANTITY_PUBLISHER_VERSION = 1;
export const HELIOS_EUCLID_QUANTITY_ADAPTER = "canonical-euclid-quantity-v1";

export const HELIOS_EUCLID_QUANTITY_CALCULATION_TYPES = [
  "horizontal_length",
  "earthwork_excavation_volume",
  "earthwork_embankment_volume",
  "material_area",
  "material_volume",
  "structure_count",
] as const;

export type HeliosEuclidQuantityCalculationType =
  (typeof HELIOS_EUCLID_QUANTITY_CALCULATION_TYPES)[number];

export type HeliosEuclidQuantityPublicationUse = "comparative" | "production";

export type HeliosEuclidQuantityPublicationInput = {
  version: typeof HELIOS_EUCLID_QUANTITY_PUBLICATION_VERSION;
  requestId: string;
  euclidModelId: string;
  modelFingerprint: string;
  integrationSolutionId: string;
  integrationSolutionFingerprint: string;
  candidateId: string;
  candidateFingerprint: string;
  costCodeId: string;
  use: HeliosEuclidQuantityPublicationUse;
};

export type HeliosEuclidQuantityCandidate = {
  id: string;
  fingerprint: string;
  sourceFingerprint: string;
  modelFingerprint: string;
  solutionFingerprint: string;
  readinessId: string;
  capability: HeliosEuclidQuantityCapability;
  calculationType: HeliosEuclidQuantityCalculationType;
  alignmentId: string;
  label: string;
  value: number;
  unit: "FT" | "M" | "SF" | "SM" | "CY" | "M3" | "EA";
  method: string;
  formula: string;
  inputEntityIds: string[];
  provenanceIds: string[];
  confidence: number;
};

export class HeliosEuclidQuantityPublicationError extends Error {}

function boundedText(value: unknown, label: string) {
  if (typeof value !== "string") throw new HeliosEuclidQuantityPublicationError(`${label} is required.`);
  const result = value.trim();
  if (!result || result.length > 2_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result)) {
    throw new HeliosEuclidQuantityPublicationError(`${label} is invalid.`);
  }
  return result;
}

export function normalizeHeliosEuclidQuantityPublicationInput(
  value: unknown,
): HeliosEuclidQuantityPublicationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HeliosEuclidQuantityPublicationError("Euclid quantity publication request is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.version !== HELIOS_EUCLID_QUANTITY_PUBLICATION_VERSION) {
    throw new HeliosEuclidQuantityPublicationError("Euclid quantity publication version is not supported.");
  }
  if (input.use !== "comparative" && input.use !== "production") {
    throw new HeliosEuclidQuantityPublicationError("Quantity use must be comparative or production.");
  }
  return {
    version: HELIOS_EUCLID_QUANTITY_PUBLICATION_VERSION,
    requestId: boundedText(input.requestId, "Publication request"),
    euclidModelId: boundedText(input.euclidModelId, "Euclid model"),
    modelFingerprint: boundedText(input.modelFingerprint, "Model fingerprint"),
    integrationSolutionId: boundedText(input.integrationSolutionId, "Integration solution"),
    integrationSolutionFingerprint: boundedText(input.integrationSolutionFingerprint, "Integration solution fingerprint"),
    candidateId: boundedText(input.candidateId, "Quantity candidate"),
    candidateFingerprint: boundedText(input.candidateFingerprint, "Quantity candidate fingerprint"),
    costCodeId: boundedText(input.costCodeId, "Estimate cost code"),
    use: input.use,
  };
}

const accepted = (state: HeliosEuclidReviewState) => state === "accepted" || state === "corrected";
const unique = (values: string[]) => [...new Set(values)].sort();
const rounded = (value: number) => Number(value.toFixed(6));

function horizontalUnit(unit: HeliosEuclidLinearUnit) {
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
  return to === "M" ? meters : meters / 0.3048;
}

function confidence(model: HeliosEuclidModel, provenanceIds: string[]) {
  const values = unique(provenanceIds)
    .map((id) => model.provenance.find((row) => row.id === id)?.confidence)
    .filter((value): value is number => Number.isFinite(value));
  return values.length ? Math.max(0, Math.min(100, Math.min(...values))) : 0;
}

function candidate(
  model: HeliosEuclidModel,
  solutionFingerprint: string,
  input: Omit<HeliosEuclidQuantityCandidate, "id" | "fingerprint" | "sourceFingerprint" | "modelFingerprint" | "solutionFingerprint" | "confidence">,
): HeliosEuclidQuantityCandidate {
  const normalized = {
    ...input,
    value: rounded(input.value),
    inputEntityIds: unique(input.inputEntityIds),
    provenanceIds: unique(input.provenanceIds),
  };
  const lineage = {
    sourceFingerprint: model.sourceFingerprint,
    modelFingerprint: euclidModelFingerprint(model),
    solutionFingerprint,
    ...normalized,
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(lineage);
  return {
    id: `euclid-quantity:${fingerprint.split(":")[1]!.slice(0, 32)}`,
    fingerprint,
    confidence: confidence(model, normalized.provenanceIds),
    ...lineage,
  };
}

function ready(
  solution: HeliosEuclidIntegrationSolution,
  alignmentId: string,
  capability: HeliosEuclidQuantityCapability,
) {
  return solution.readiness.find(
    (row) => row.alignmentId === alignmentId && row.capability === capability && row.status === "ready",
  );
}

function baseInput(readiness: HeliosEuclidQuantityReadiness) {
  return {
    readinessId: readiness.id,
    capability: readiness.capability,
    alignmentId: readiness.alignmentId,
    inputEntityIds: readiness.inputEntityIds,
    provenanceIds: readiness.provenanceIds,
  };
}

type CrossSectionArea = {
  chainage: number;
  cutArea: number;
  fillArea: number;
  entityIds: string[];
  provenanceIds: string[];
};

function segmentAreas(leftOffset: number, rightOffset: number, leftDepth: number, rightDepth: number) {
  const width = rightOffset - leftOffset;
  if (width <= 0) return { cut: 0, fill: 0 };
  if (leftDepth >= 0 && rightDepth >= 0) return { cut: width * (leftDepth + rightDepth) / 2, fill: 0 };
  if (leftDepth <= 0 && rightDepth <= 0) return { cut: 0, fill: width * (-leftDepth - rightDepth) / 2 };
  const fraction = Math.abs(leftDepth) / (Math.abs(leftDepth) + Math.abs(rightDepth));
  const leftWidth = width * fraction;
  const rightWidth = width - leftWidth;
  return leftDepth > 0
    ? { cut: leftWidth * leftDepth / 2, fill: rightWidth * -rightDepth / 2 }
    : { cut: rightWidth * rightDepth / 2, fill: leftWidth * -leftDepth / 2 };
}

function crossSectionAreas(
  model: HeliosEuclidModel,
  alignmentId: string,
  horizontal: "FT" | "M",
  verticalUnit: HeliosEuclidLinearUnit,
) {
  const rows = model.crossSectionPoints.filter((row) => row.alignmentId === alignmentId && accepted(row.reviewState));
  const stations = [...new Set(rows.map((row) => row.station.chainage))].sort((a, b) => a - b);
  return stations.flatMap((chainage): CrossSectionArea[] => {
    const stationRows = rows.filter((row) => row.station.chainage === chainage);
    const existing = new Map(stationRows.filter((row) => row.surface === "existing").map((row) => [row.offset.value, row]));
    const subgrade = stationRows.filter((row) => row.surface === "subgrade");
    const design = subgrade.length ? subgrade : stationRows.filter((row) => row.surface === "proposed");
    const pairs = design.flatMap((row) => {
      const existingRow = existing.get(row.offset.value);
      if (!existingRow) return [];
      const existingElevation = convertLinear(existingRow.elevation.value, verticalUnit, horizontal);
      const designElevation = convertLinear(row.elevation.value, verticalUnit, horizontal);
      if (existingElevation === undefined || designElevation === undefined) return [];
      return [{ offset: row.offset.value, depth: existingElevation - designElevation, existingRow, designRow: row }];
    }).sort((left, right) => left.offset - right.offset);
    if (pairs.length < 2) return [];
    let cutArea = 0;
    let fillArea = 0;
    for (let index = 1; index < pairs.length; index += 1) {
      const left = pairs[index - 1]!;
      const right = pairs[index]!;
      const areas = segmentAreas(left.offset, right.offset, left.depth, right.depth);
      cutArea += areas.cut;
      fillArea += areas.fill;
    }
    const entityIds = unique(pairs.flatMap((row) => [row.existingRow.id, row.designRow.id]));
    const provenanceIds = unique(pairs.flatMap((row) => [
      ...row.existingRow.station.provenanceIds,
      ...row.existingRow.offset.provenanceIds,
      ...row.existingRow.elevation.provenanceIds,
      ...row.designRow.station.provenanceIds,
      ...row.designRow.offset.provenanceIds,
      ...row.designRow.elevation.provenanceIds,
    ]));
    return [{ chainage, cutArea, fillArea, entityIds, provenanceIds }];
  });
}

export function buildHeliosEuclidQuantityCandidates(input: {
  model: HeliosEuclidModel;
  solution: HeliosEuclidIntegrationSolution;
}) {
  const { model, solution } = input;
  const validation = validateHeliosEuclidContract(model);
  if (!validation.valid) throw new HeliosEuclidQuantityPublicationError("Canonical Euclid model is not contract-valid.");
  const modelFingerprint = euclidModelFingerprint(model);
  if (
    model.status !== "accepted" ||
    solution.status !== "passed" ||
    solution.sourceFingerprint !== model.sourceFingerprint ||
    solution.modelFingerprint !== heliosEuclidIntegrationModelFingerprint(model)
  ) {
    throw new HeliosEuclidQuantityPublicationError("Only a passing solution for the accepted canonical Euclid model can produce quantity candidates.");
  }
  const solutionFingerprint = heliosEuclidIntegrationSolutionFingerprint(solution);
  const result: HeliosEuclidQuantityCandidate[] = [];

  for (const alignment of [...model.alignments].sort((left, right) => left.id.localeCompare(right.id))) {
    const spatialReference = model.spatialReferences.find((row) => row.id === alignment.spatialReferenceId);
    const unit = spatialReference ? horizontalUnit(spatialReference.horizontalUnit) : undefined;
    if (!unit || !spatialReference || !accepted(spatialReference.reviewState) || !accepted(alignment.reviewState)) continue;

    const lengthReadiness = ready(solution, alignment.id, "horizontal_length");
    if (lengthReadiness) {
      const elements = model.horizontalElements.filter((row) => row.alignmentId === alignment.id && accepted(row.reviewState));
      const value = elements.reduce((sum, row) => sum + row.length.value, 0);
      if (elements.length && value > 0) result.push(candidate(model, solutionFingerprint, {
        ...baseInput(lengthReadiness),
        calculationType: "horizontal_length",
        label: `${alignment.printedName} horizontal alignment length`,
        value,
        unit,
        method: "Sum of accepted canonical horizontal element lengths",
        formula: "Σ accepted horizontal element length",
        inputEntityIds: unique([...lengthReadiness.inputEntityIds, ...elements.map((row) => row.id)]),
        provenanceIds: unique([...lengthReadiness.provenanceIds, ...elements.flatMap((row) => row.length.provenanceIds)]),
      }));
    }

    const structureReadiness = ready(solution, alignment.id, "structure_count");
    if (structureReadiness) {
      const structures = model.structures.filter((row) => row.primaryAlignmentId === alignment.id && accepted(row.reviewState));
      const types = [...new Set(structures.map((row) => row.structureType))].sort();
      for (const structureType of types) {
        const matching = structures.filter((row) => row.structureType === structureType);
        result.push(candidate(model, solutionFingerprint, {
          ...baseInput(structureReadiness),
          calculationType: "structure_count",
          label: `${alignment.printedName} ${structureType.replaceAll("_", " ")} count`,
          value: matching.length,
          unit: "EA",
          method: "Count of unique accepted canonical structures by type",
          formula: "COUNT(DISTINCT accepted structure id)",
          inputEntityIds: unique([...structureReadiness.inputEntityIds, ...matching.map((row) => row.id)]),
          provenanceIds: unique([...structureReadiness.provenanceIds, ...matching.flatMap((row) => row.provenanceIds)]),
        }));
      }
    }

    const areaReadiness = ready(solution, alignment.id, "material_area");
    const volumeReadiness = ready(solution, alignment.id, "material_volume");
    const layers = model.materialLayers.filter((row) => row.alignmentId === alignment.id && accepted(row.reviewState));
    for (const layer of layers) {
      if (!layer.offsetLeft || !layer.offsetRight) continue;
      const length = Math.abs(layer.stationEnd.chainage - layer.stationStart.chainage);
      const width = Math.abs(layer.offsetRight.value - layer.offsetLeft.value);
      const area = length * width;
      const layerProvenance = unique([
        ...layer.stationStart.provenanceIds,
        ...layer.stationEnd.provenanceIds,
        ...layer.offsetLeft.provenanceIds,
        ...layer.offsetRight.provenanceIds,
        ...layer.thickness.provenanceIds,
      ]);
      if (areaReadiness && area > 0) result.push(candidate(model, solutionFingerprint, {
        ...baseInput(areaReadiness),
        calculationType: "material_area",
        label: `${alignment.printedName} ${layer.name} area`,
        value: area,
        unit: unit === "FT" ? "SF" : "SM",
        method: "Accepted material-layer station range multiplied by accepted width",
        formula: "|end chainage - start chainage| × |right offset - left offset|",
        inputEntityIds: unique([...areaReadiness.inputEntityIds, layer.id]),
        provenanceIds: unique([...areaReadiness.provenanceIds, ...layerProvenance]),
      }));
      const thickness = convertLinear(layer.thickness.value, layer.thicknessUnit, unit);
      if (volumeReadiness && area > 0 && thickness !== undefined && thickness > 0) result.push(candidate(model, solutionFingerprint, {
        ...baseInput(volumeReadiness),
        calculationType: "material_volume",
        label: `${alignment.printedName} ${layer.name} volume`,
        value: unit === "FT" ? area * thickness / 27 : area * thickness,
        unit: unit === "FT" ? "CY" : "M3",
        method: "Accepted material-layer footprint multiplied by normalized accepted thickness",
        formula: unit === "FT" ? "length × width × thickness ÷ 27" : "length × width × thickness",
        inputEntityIds: unique([...volumeReadiness.inputEntityIds, layer.id]),
        provenanceIds: unique([...volumeReadiness.provenanceIds, ...layerProvenance]),
      }));
    }

    const earthworkReadiness = ready(solution, alignment.id, "earthwork_volume");
    if (earthworkReadiness) {
      const sections = crossSectionAreas(model, alignment.id, unit, spatialReference.verticalUnit);
      if (sections.length >= 2) {
        let cut = 0;
        let fill = 0;
        for (let index = 1; index < sections.length; index += 1) {
          const previous = sections[index - 1]!;
          const current = sections[index]!;
          const distance = current.chainage - previous.chainage;
          if (distance <= 0) continue;
          cut += distance * (previous.cutArea + current.cutArea) / 2;
          fill += distance * (previous.fillArea + current.fillArea) / 2;
        }
        const divisor = unit === "FT" ? 27 : 1;
        const quantityUnit = unit === "FT" ? "CY" as const : "M3" as const;
        const inputEntityIds = unique([...earthworkReadiness.inputEntityIds, ...sections.flatMap((row) => row.entityIds)]);
        const provenanceIds = unique([...earthworkReadiness.provenanceIds, ...sections.flatMap((row) => row.provenanceIds)]);
        if (cut > 0) result.push(candidate(model, solutionFingerprint, {
          ...baseInput(earthworkReadiness), calculationType: "earthwork_excavation_volume",
          label: `${alignment.printedName} excavation volume`, value: cut / divisor, unit: quantityUnit,
          method: "Average-end-area integration of positive existing-minus-design cross-section depth",
          formula: unit === "FT" ? "Σ(distance × (cut area₁ + cut area₂) ÷ 2) ÷ 27" : "Σ(distance × (cut area₁ + cut area₂) ÷ 2)",
          inputEntityIds, provenanceIds,
        }));
        if (fill > 0) result.push(candidate(model, solutionFingerprint, {
          ...baseInput(earthworkReadiness), calculationType: "earthwork_embankment_volume",
          label: `${alignment.printedName} embankment volume`, value: fill / divisor, unit: quantityUnit,
          method: "Average-end-area integration of negative existing-minus-design cross-section depth",
          formula: unit === "FT" ? "Σ(distance × (fill area₁ + fill area₂) ÷ 2) ÷ 27" : "Σ(distance × (fill area₁ + fill area₂) ÷ 2)",
          inputEntityIds, provenanceIds,
        }));
      }
    }
  }
  return result.sort((left, right) => left.alignmentId.localeCompare(right.alignmentId) || left.calculationType.localeCompare(right.calculationType) || left.label.localeCompare(right.label));
}
