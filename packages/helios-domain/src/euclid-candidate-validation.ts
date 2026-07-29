import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  solveHeliosEuclidHorizontalControl,
  heliosEuclidHorizontalSolutionFingerprint,
  type HeliosEuclidHorizontalCheck,
  type HeliosEuclidHorizontalSolution,
} from "./euclid-horizontal.ts";
import {
  solveHeliosEuclidVerticalProfiles,
  heliosEuclidVerticalSolutionFingerprint,
  type HeliosEuclidVerticalCheck,
  type HeliosEuclidVerticalSolution,
} from "./euclid-vertical.ts";
import {
  solveHeliosEuclidEngineeringGraph,
  heliosEuclidIntegrationSolutionFingerprint,
  type HeliosEuclidControlGate,
  type HeliosEuclidIntegrationCheck,
  type HeliosEuclidIntegrationSolution,
  type HeliosEuclidQuantityReadiness,
} from "./euclid-integration.ts";
import { euclidModelFingerprint } from "./euclid-shadow.ts";
import { validateHeliosEuclidContract, type HeliosEuclidModel } from "./euclid-contract.ts";

export const HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION = 1;
export const HELIOS_EUCLID_CANDIDATE_VALIDATOR = "helios-euclid-candidate-validation";
export const HELIOS_EUCLID_CANDIDATE_VALIDATOR_VERSION = 1;

export type HeliosEuclidCandidateValidationStatus =
  | "passed"
  | "review"
  | "blocked"
  | "not_applicable";

export type HeliosEuclidCandidateValidationInput = {
  version: typeof HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION;
  requestId: string;
  candidateId: string;
  candidateFingerprint: string;
  reviewSetFingerprint: string;
};

export type HeliosEuclidValidationDelta = {
  id: string;
  domain: "horizontal" | "vertical" | "integration" | "readiness";
  scopeId: string;
  code: string;
  label: string;
  beforeStatus: string;
  afterStatus: string;
  beforeValue?: number;
  afterValue?: number;
  unit?: string;
  impact: "improved" | "degraded" | "changed";
  entityIds: string[];
  provenanceIds: string[];
};

export type HeliosEuclidCandidateValidation = {
  version: typeof HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION;
  validationKey: string;
  validationId: string;
  candidateId: string;
  sourceEuclidModelId: string;
  sourceModelFingerprint: string;
  candidateFingerprint: string;
  sourceFingerprint: string;
  reviewSetFingerprint: string;
  validator: typeof HELIOS_EUCLID_CANDIDATE_VALIDATOR;
  validatorVersion: typeof HELIOS_EUCLID_CANDIDATE_VALIDATOR_VERSION;
  status: HeliosEuclidCandidateValidationStatus;
  validationPassed: boolean;
  promotionEligible: false;
  downstreamEligible: false;
  sourceHorizontalFingerprint: string;
  candidateHorizontalFingerprint: string;
  sourceVerticalFingerprint: string;
  candidateVerticalFingerprint: string;
  sourceIntegrationFingerprint: string;
  candidateIntegrationFingerprint: string;
  changedCount: number;
  improvedCount: number;
  degradedCount: number;
  blockingReasons: string[];
  deltas: HeliosEuclidValidationDelta[];
  candidateHorizontal: HeliosEuclidHorizontalSolution;
  candidateVertical: HeliosEuclidVerticalSolution;
  candidateIntegration: HeliosEuclidIntegrationSolution;
  validationFingerprint: string;
  createdAt: number;
};

export type HeliosEuclidCandidateValidationChunk = {
  resultType:
    | "horizontal_check"
    | "vertical_check"
    | "integration_check"
    | "readiness"
    | "delta";
  chunkIndex: number;
  itemCount: number;
  payloadJson: string;
  payloadFingerprint: string;
};

export class HeliosEuclidCandidateValidationError extends Error {}

function boundedText(value: unknown, label: string) {
  if (typeof value !== "string") throw new HeliosEuclidCandidateValidationError(`${label} is required.`);
  const result = value.trim();
  if (!result || result.length > 2_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result)) {
    throw new HeliosEuclidCandidateValidationError(`${label} is invalid.`);
  }
  return result;
}

export function normalizeHeliosEuclidCandidateValidationInput(
  value: unknown,
): HeliosEuclidCandidateValidationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HeliosEuclidCandidateValidationError("Euclid candidate validation request is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.version !== HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION) {
    throw new HeliosEuclidCandidateValidationError("Euclid candidate validation version is not supported.");
  }
  return {
    version: HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION,
    requestId: boundedText(input.requestId, "Validation request"),
    candidateId: boundedText(input.candidateId, "Reviewed candidate"),
    candidateFingerprint: boundedText(input.candidateFingerprint, "Candidate fingerprint"),
    reviewSetFingerprint: boundedText(input.reviewSetFingerprint, "Review-set fingerprint"),
  };
}

function gate(
  solution: HeliosEuclidHorizontalSolution | HeliosEuclidVerticalSolution,
): HeliosEuclidControlGate {
  const scopes = "alignmentSolutions" in solution
    ? solution.alignmentSolutions.map((row) => ({ id: row.alignmentId, status: row.status }))
    : solution.profileSolutions.map((row) => ({ id: row.profileId, status: row.status }));
  return {
    euclidModelId: solution.euclidModelId,
    sourceFingerprint: solution.sourceFingerprint,
    solutionFingerprint: "alignmentSolutions" in solution
      ? heliosEuclidHorizontalSolutionFingerprint(solution)
      : heliosEuclidVerticalSolutionFingerprint(solution),
    status: solution.status,
    scopes,
  };
}

function run(model: HeliosEuclidModel) {
  const horizontal = solveHeliosEuclidHorizontalControl(model);
  const vertical = solveHeliosEuclidVerticalProfiles(model);
  const integration = solveHeliosEuclidEngineeringGraph({
    model,
    horizontal: gate(horizontal),
    vertical: gate(vertical),
  });
  return { horizontal, vertical, integration };
}

const statusRank: Record<string, number> = {
  not_present: 0,
  blocked: 1,
  block: 1,
  not_available: 2,
  review: 3,
  not_applicable: 4,
  passed: 5,
  pass: 5,
  ready: 5,
};

function impact(beforeStatus: string, afterStatus: string): HeliosEuclidValidationDelta["impact"] {
  const before = statusRank[beforeStatus] ?? 0;
  const after = statusRank[afterStatus] ?? 0;
  return after > before ? "improved" : after < before ? "degraded" : "changed";
}

function delta(input: Omit<HeliosEuclidValidationDelta, "id" | "impact">): HeliosEuclidValidationDelta {
  const normalized = {
    ...input,
    entityIds: [...new Set(input.entityIds)].sort(),
    provenanceIds: [...new Set(input.provenanceIds)].sort(),
  };
  return {
    ...normalized,
    id: `validation-delta:${buildHeliosEngineeringParityFingerprint(normalized).split(":")[1]!.slice(0, 24)}`,
    impact: impact(input.beforeStatus, input.afterStatus),
  };
}

function checkKey(
  domain: "horizontal" | "vertical" | "integration",
  row: HeliosEuclidHorizontalCheck | HeliosEuclidVerticalCheck | HeliosEuclidIntegrationCheck,
) {
  const scope = "profileId" in row ? row.profileId : row.alignmentId || "project";
  return `${domain}:${scope}:${row.code}:${[...row.entityIds].sort().join(",")}`;
}

function checkDeltas(
  domain: "horizontal" | "vertical" | "integration",
  beforeRows: Array<HeliosEuclidHorizontalCheck | HeliosEuclidVerticalCheck | HeliosEuclidIntegrationCheck>,
  afterRows: Array<HeliosEuclidHorizontalCheck | HeliosEuclidVerticalCheck | HeliosEuclidIntegrationCheck>,
) {
  const before = new Map(beforeRows.map((row) => [checkKey(domain, row), row]));
  const after = new Map(afterRows.map((row) => [checkKey(domain, row), row]));
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
  return keys.flatMap((key) => {
    const left = before.get(key);
    const right = after.get(key);
    const leftResidual = left && "residual" in left ? left.residual : undefined;
    const rightResidual = right && "residual" in right ? right.residual : undefined;
    if (left?.status === right?.status && leftResidual === rightResidual) return [];
    const row = right || left!;
    const scopeId = "profileId" in row && typeof row.profileId === "string"
      ? row.profileId
      : "alignmentId" in row && typeof row.alignmentId === "string"
        ? row.alignmentId
        : "project";
    return [delta({
      domain,
      scopeId,
      code: row.code,
      label: row.message,
      beforeStatus: left?.status || "not_present",
      afterStatus: right?.status || "not_present",
      beforeValue: leftResidual,
      afterValue: rightResidual,
      unit: "unit" in row ? row.unit : undefined,
      entityIds: row.entityIds,
      provenanceIds: row.provenanceIds,
    })];
  });
}

function validationDeltas(
  source: ReturnType<typeof run>,
  candidate: ReturnType<typeof run>,
) {
  const deltas: HeliosEuclidValidationDelta[] = [];
  const sourceAlignments = new Map(source.horizontal.alignmentSolutions.map((row) => [row.alignmentId, row]));
  const candidateAlignments = new Map(candidate.horizontal.alignmentSolutions.map((row) => [row.alignmentId, row]));
  for (const alignmentId of [...new Set([...sourceAlignments.keys(), ...candidateAlignments.keys()])].sort()) {
    const before = sourceAlignments.get(alignmentId);
    const after = candidateAlignments.get(alignmentId);
    if (before?.status !== after?.status) deltas.push(delta({ domain: "horizontal", scopeId: alignmentId, code: "alignment_status", label: "Horizontal alignment validation status", beforeStatus: before?.status || "not_present", afterStatus: after?.status || "not_present", entityIds: [alignmentId], provenanceIds: [] }));
    if (before?.solvedLength !== after?.solvedLength) deltas.push(delta({ domain: "horizontal", scopeId: alignmentId, code: "solved_length", label: "Solved horizontal alignment length", beforeStatus: before?.status || "not_present", afterStatus: after?.status || "not_present", beforeValue: before?.solvedLength, afterValue: after?.solvedLength, unit: "model linear units", entityIds: [alignmentId], provenanceIds: [] }));
  }
  const sourceProfiles = new Map(source.vertical.profileSolutions.map((row) => [row.profileId, row]));
  const candidateProfiles = new Map(candidate.vertical.profileSolutions.map((row) => [row.profileId, row]));
  for (const profileId of [...new Set([...sourceProfiles.keys(), ...candidateProfiles.keys()])].sort()) {
    const before = sourceProfiles.get(profileId);
    const after = candidateProfiles.get(profileId);
    if (before?.status !== after?.status) deltas.push(delta({ domain: "vertical", scopeId: profileId, code: "profile_status", label: "Vertical profile validation status", beforeStatus: before?.status || "not_present", afterStatus: after?.status || "not_present", entityIds: [profileId], provenanceIds: [] }));
  }
  const sourceReadiness = new Map(source.integration.readiness.map((row) => [row.id, row]));
  const candidateReadiness = new Map(candidate.integration.readiness.map((row) => [row.id, row]));
  for (const id of [...new Set([...sourceReadiness.keys(), ...candidateReadiness.keys()])].sort()) {
    const before = sourceReadiness.get(id);
    const after = candidateReadiness.get(id);
    if (before?.status === after?.status) continue;
    const row = after || before!;
    deltas.push(delta({ domain: "readiness", scopeId: row.alignmentId, code: row.capability, label: row.method, beforeStatus: before?.status || "not_present", afterStatus: after?.status || "not_present", entityIds: row.inputEntityIds, provenanceIds: row.provenanceIds }));
  }
  deltas.push(
    ...checkDeltas("horizontal", source.horizontal.alignmentSolutions.flatMap((row) => row.checks), candidate.horizontal.alignmentSolutions.flatMap((row) => row.checks)),
    ...checkDeltas("vertical", source.vertical.profileSolutions.flatMap((row) => row.checks), candidate.vertical.profileSolutions.flatMap((row) => row.checks)),
    ...checkDeltas("integration", source.integration.checks, candidate.integration.checks),
  );
  return deltas.sort((left, right) => left.domain.localeCompare(right.domain) || left.scopeId.localeCompare(right.scopeId) || left.code.localeCompare(right.code));
}

function overallStatus(result: ReturnType<typeof run>): HeliosEuclidCandidateValidationStatus {
  if ([result.horizontal.status, result.vertical.status, result.integration.status].includes("blocked")) return "blocked";
  if ([result.horizontal.status, result.vertical.status, result.integration.status].includes("review")) return "review";
  if ([result.horizontal.status, result.vertical.status, result.integration.status].every((row) => row === "not_applicable")) return "not_applicable";
  return "passed";
}

export function validateHeliosEuclidReviewCandidate(input: {
  sourceModel: HeliosEuclidModel;
  candidateModel: HeliosEuclidModel;
  candidateId: string;
  candidateFingerprint: string;
  reviewSetFingerprint: string;
  createdAt: number;
}): HeliosEuclidCandidateValidation {
  const sourceValidation = validateHeliosEuclidContract(input.sourceModel);
  const candidateValidation = validateHeliosEuclidContract(input.candidateModel);
  if (!sourceValidation.valid) throw new HeliosEuclidCandidateValidationError("Source Euclid model is not contract-valid.");
  if (!candidateValidation.valid) throw new HeliosEuclidCandidateValidationError("Reviewed Euclid candidate is not contract-valid.");
  if (input.sourceModel.sourceFingerprint !== input.candidateModel.sourceFingerprint) throw new HeliosEuclidCandidateValidationError("Candidate source fingerprint does not match the source model.");
  if (input.sourceModel.id === input.candidateModel.id) throw new HeliosEuclidCandidateValidationError("Candidate validation requires a derivative model identity.");
  const actualCandidateFingerprint = euclidModelFingerprint(input.candidateModel);
  if (actualCandidateFingerprint !== input.candidateFingerprint) throw new HeliosEuclidCandidateValidationError("Reviewed Euclid candidate fingerprint is stale.");

  const source = run(input.sourceModel);
  const candidate = run(input.candidateModel);
  const deltas = validationDeltas(source, candidate);
  const status = overallStatus(candidate);
  const validationPassed = status === "passed" || status === "not_applicable";
  const blockingReasons = [
    ...candidate.horizontal.alignmentSolutions.flatMap((row) => row.checks.filter((check) => check.status === "block").map((check) => check.message)),
    ...candidate.vertical.profileSolutions.flatMap((row) => row.checks.filter((check) => check.status === "block").map((check) => check.message)),
    ...candidate.integration.checks.filter((check) => check.status === "block").map((check) => check.message),
    ...candidate.integration.readiness.filter((row) => row.status === "blocked").flatMap((row) => row.reasons),
  ].filter((reason, index, rows) => rows.indexOf(reason) === index).slice(0, 100);
  if (!validationPassed && !blockingReasons.length) blockingReasons.push("The reviewed candidate still requires engineering review.");
  blockingReasons.push("Stage 4I validation cannot promote geometry or publish quantities, estimates, schedules, or LandXML.");

  const sourceModelFingerprint = euclidModelFingerprint(input.sourceModel);
  const candidateHorizontalFingerprint = heliosEuclidHorizontalSolutionFingerprint(candidate.horizontal);
  const candidateVerticalFingerprint = heliosEuclidVerticalSolutionFingerprint(candidate.vertical);
  const candidateIntegrationFingerprint = heliosEuclidIntegrationSolutionFingerprint(candidate.integration);
  const fingerprintBasis = {
    candidateId: input.candidateId,
    sourceModelFingerprint,
    candidateFingerprint: input.candidateFingerprint,
    reviewSetFingerprint: input.reviewSetFingerprint,
    sourceHorizontalFingerprint: heliosEuclidHorizontalSolutionFingerprint(source.horizontal),
    candidateHorizontalFingerprint,
    sourceVerticalFingerprint: heliosEuclidVerticalSolutionFingerprint(source.vertical),
    candidateVerticalFingerprint,
    sourceIntegrationFingerprint: heliosEuclidIntegrationSolutionFingerprint(source.integration),
    candidateIntegrationFingerprint,
    validator: HELIOS_EUCLID_CANDIDATE_VALIDATOR,
    validatorVersion: HELIOS_EUCLID_CANDIDATE_VALIDATOR_VERSION,
  };
  const validationKey = buildHeliosEngineeringParityFingerprint(fingerprintBasis);
  const stableResult = {
    ...fingerprintBasis,
    status,
    validationPassed,
    deltas,
    blockingReasons,
  };
  return {
    version: HELIOS_EUCLID_CANDIDATE_VALIDATION_VERSION,
    validationKey,
    validationId: `candidate-validation:${validationKey.split(":")[1]!.slice(0, 32)}`,
    candidateId: input.candidateId,
    sourceEuclidModelId: input.sourceModel.id,
    sourceModelFingerprint,
    candidateFingerprint: input.candidateFingerprint,
    sourceFingerprint: input.sourceModel.sourceFingerprint,
    reviewSetFingerprint: input.reviewSetFingerprint,
    validator: HELIOS_EUCLID_CANDIDATE_VALIDATOR,
    validatorVersion: HELIOS_EUCLID_CANDIDATE_VALIDATOR_VERSION,
    status,
    validationPassed,
    promotionEligible: false,
    downstreamEligible: false,
    sourceHorizontalFingerprint: fingerprintBasis.sourceHorizontalFingerprint,
    candidateHorizontalFingerprint,
    sourceVerticalFingerprint: fingerprintBasis.sourceVerticalFingerprint,
    candidateVerticalFingerprint,
    sourceIntegrationFingerprint: fingerprintBasis.sourceIntegrationFingerprint,
    candidateIntegrationFingerprint,
    changedCount: deltas.length,
    improvedCount: deltas.filter((row) => row.impact === "improved").length,
    degradedCount: deltas.filter((row) => row.impact === "degraded").length,
    blockingReasons,
    deltas,
    candidateHorizontal: candidate.horizontal,
    candidateVertical: candidate.vertical,
    candidateIntegration: candidate.integration,
    validationFingerprint: buildHeliosEngineeringParityFingerprint(stableResult),
    createdAt: input.createdAt,
  };
}

export function buildHeliosEuclidCandidateValidationChunks(
  validation: HeliosEuclidCandidateValidation,
  maximumItemsPerChunk = 75,
): HeliosEuclidCandidateValidationChunk[] {
  if (!Number.isSafeInteger(maximumItemsPerChunk) || maximumItemsPerChunk < 1 || maximumItemsPerChunk > 200) {
    throw new HeliosEuclidCandidateValidationError("Candidate validation chunk size must be between 1 and 200.");
  }
  const groups: Record<HeliosEuclidCandidateValidationChunk["resultType"], unknown[]> = {
    horizontal_check: validation.candidateHorizontal.alignmentSolutions.flatMap((row) => row.checks),
    vertical_check: validation.candidateVertical.profileSolutions.flatMap((row) => row.checks),
    integration_check: validation.candidateIntegration.checks,
    readiness: validation.candidateIntegration.readiness,
    delta: validation.deltas,
  };
  return (Object.keys(groups) as Array<keyof typeof groups>).flatMap((resultType) => {
    const rows = groups[resultType];
    const chunks: HeliosEuclidCandidateValidationChunk[] = [];
    for (let index = 0; index < rows.length; index += maximumItemsPerChunk) {
      const payload = rows.slice(index, index + maximumItemsPerChunk);
      const payloadJson = JSON.stringify(payload);
      if (payloadJson.length > 700_000) throw new HeliosEuclidCandidateValidationError("Candidate validation chunk exceeds the storage safety limit.");
      chunks.push({ resultType, chunkIndex: chunks.length, itemCount: payload.length, payloadJson, payloadFingerprint: buildHeliosEngineeringParityFingerprint(payload) });
    }
    return chunks;
  });
}
