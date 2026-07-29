import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  validateHeliosEuclidContract,
  type HeliosEuclidModel,
  type HeliosEuclidReviewState,
} from "./euclid-contract.ts";
import {
  heliosEuclidReviewTargetFingerprint,
  listHeliosEuclidReviewTargets,
  summarizeHeliosEuclidReviewDecisions,
  type HeliosEuclidCorrectionChange,
  type HeliosEuclidReviewDecision,
} from "./euclid-review.ts";
import { euclidModelFingerprint } from "./euclid-shadow.ts";

export const HELIOS_EUCLID_CANDIDATE_VERSION = 1;
export const HELIOS_EUCLID_CANDIDATE_BUILDER = "helios-euclid-reviewed-candidate";
export const HELIOS_EUCLID_CANDIDATE_BUILDER_VERSION = 1;

export const HELIOS_EUCLID_CANDIDATE_STATUSES = [
  "incomplete_review",
  "blocked",
  "ready_for_validation",
] as const;

export type HeliosEuclidCandidateStatus =
  (typeof HELIOS_EUCLID_CANDIDATE_STATUSES)[number];

export type HeliosEuclidCandidateBuildInput = {
  version: typeof HELIOS_EUCLID_CANDIDATE_VERSION;
  requestId: string;
  euclidModelId: string;
  modelFingerprint: string;
  sourceFingerprint: string;
};

export type HeliosEuclidReviewCandidate = {
  version: typeof HELIOS_EUCLID_CANDIDATE_VERSION;
  candidateKey: string;
  candidateId: string;
  sourceEuclidModelId: string;
  sourceModelFingerprint: string;
  sourceFingerprint: string;
  reviewSetFingerprint: string;
  candidateFingerprint: string;
  builder: typeof HELIOS_EUCLID_CANDIDATE_BUILDER;
  builderVersion: typeof HELIOS_EUCLID_CANDIDATE_BUILDER_VERSION;
  status: HeliosEuclidCandidateStatus;
  validationEligible: boolean;
  downstreamEligible: false;
  totalTargetCount: number;
  acceptedCount: number;
  correctedCount: number;
  deferredCount: number;
  rejectedCount: number;
  unreviewedCount: number;
  blockingReasons: string[];
  decisionIds: string[];
  model: HeliosEuclidModel;
  createdAt: number;
};

export class HeliosEuclidCandidateError extends Error {}

function boundedText(value: unknown, label: string) {
  if (typeof value !== "string") throw new HeliosEuclidCandidateError(`${label} is required.`);
  const result = value.trim();
  if (!result || result.length > 2_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result)) {
    throw new HeliosEuclidCandidateError(`${label} is invalid.`);
  }
  return result;
}

export function normalizeHeliosEuclidCandidateBuildInput(
  value: unknown,
): HeliosEuclidCandidateBuildInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HeliosEuclidCandidateError("Euclid candidate request is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.version !== HELIOS_EUCLID_CANDIDATE_VERSION) {
    throw new HeliosEuclidCandidateError("Euclid candidate version is not supported.");
  }
  return {
    version: HELIOS_EUCLID_CANDIDATE_VERSION,
    requestId: boundedText(input.requestId, "Candidate request"),
    euclidModelId: boundedText(input.euclidModelId, "Euclid model"),
    modelFingerprint: boundedText(input.modelFingerprint, "Model fingerprint"),
    sourceFingerprint: boundedText(input.sourceFingerprint, "Source fingerprint"),
  };
}

export function heliosEuclidReviewSetFingerprint(
  decisions: HeliosEuclidReviewDecision[],
) {
  const latest = summarizeHeliosEuclidReviewDecisions(decisions).currentDecisions;
  return buildHeliosEngineeringParityFingerprint(
    latest
      .map((row) => ({
        targetEntityType: row.targetEntityType,
        targetEntityId: row.targetEntityId,
        decisionFingerprint: row.decisionFingerprint,
      }))
      .sort((left, right) =>
        left.targetEntityType.localeCompare(right.targetEntityType) ||
        left.targetEntityId.localeCompare(right.targetEntityId),
      ),
  );
}

function correctionValue(change: HeliosEuclidCorrectionChange) {
  if (change.valueType === "number") return change.numberValue;
  if (change.valueType === "boolean") return change.booleanValue;
  return change.stringValue;
}

function applyChange(target: Record<string, unknown>, change: HeliosEuclidCorrectionChange) {
  const parts = change.field.split(".");
  let parent: Record<string, unknown> = target;
  for (const part of parts.slice(0, -1)) {
    const next = parent[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      throw new HeliosEuclidCandidateError(`Correction path ${change.field} is not present in the source entity.`);
    }
    parent = next as Record<string, unknown>;
  }
  const leaf = parts.at(-1)!;
  if (!(leaf in parent)) {
    throw new HeliosEuclidCandidateError(`Correction path ${change.field} is not present in the source entity.`);
  }
  parent[leaf] = correctionValue(change);

  if ("origin" in parent && "reviewState" in parent) {
    parent.origin = "corrected";
    parent.reviewState = "corrected";
  }
  if (leaf === "chainage" && "chainageOrigin" in parent && "reviewState" in parent) {
    parent.chainageOrigin = "corrected";
    parent.reviewState = "corrected";
  }
}

function setEntityReviewState(target: Record<string, unknown>, state: HeliosEuclidReviewState) {
  if ("reviewState" in target) target.reviewState = state;
}

export function buildHeliosEuclidReviewCandidate(input: {
  model: HeliosEuclidModel;
  euclidModelId: string;
  modelFingerprint: string;
  decisions: HeliosEuclidReviewDecision[];
  createdAt: number;
}): HeliosEuclidReviewCandidate {
  const current = summarizeHeliosEuclidReviewDecisions(input.decisions).currentDecisions;
  const decisionByTarget = new Map(
    current.map((row) => [`${row.targetEntityType}:${row.targetEntityId}`, row]),
  );
  const sourceTargets = listHeliosEuclidReviewTargets(input.model);
  const candidateModel = JSON.parse(JSON.stringify(input.model)) as HeliosEuclidModel;
  const candidateTargets = new Map(
    listHeliosEuclidReviewTargets(candidateModel).map(({ entityType, target }) => [
      `${entityType}:${target.id}`,
      target as Record<string, unknown>,
    ]),
  );

  let acceptedCount = 0;
  let correctedCount = 0;
  let deferredCount = 0;
  let rejectedCount = 0;
  let unreviewedCount = 0;
  const blockingReasons: string[] = [];
  const decisionIds: string[] = [];

  for (const { entityType, target } of sourceTargets) {
    const key = `${entityType}:${target.id}`;
    const decision = decisionByTarget.get(key);
    if (!decision) {
      unreviewedCount += 1;
      continue;
    }
    if (
      decision.euclidModelId !== input.euclidModelId ||
      decision.modelFingerprint !== input.modelFingerprint ||
      decision.sourceFingerprint !== input.model.sourceFingerprint ||
      decision.targetFingerprint !== heliosEuclidReviewTargetFingerprint(target)
    ) {
      throw new HeliosEuclidCandidateError(`Review decision for ${key} is stale.`);
    }
    const candidateTarget = candidateTargets.get(key);
    if (!candidateTarget) throw new HeliosEuclidCandidateError(`Candidate target ${key} is missing.`);
    decisionIds.push(decision.id);
    if (decision.action === "accept") {
      acceptedCount += 1;
      setEntityReviewState(candidateTarget, "accepted");
    } else if (decision.action === "correct") {
      correctedCount += 1;
      for (const change of decision.changes || []) applyChange(candidateTarget, change);
      setEntityReviewState(candidateTarget, "corrected");
      if ("printedName" in candidateTarget && "normalizedName" in candidateTarget) {
        candidateTarget.normalizedName = candidateTarget.printedName;
      }
    } else if (decision.action === "defer") {
      deferredCount += 1;
    } else {
      rejectedCount += 1;
      setEntityReviewState(candidateTarget, "rejected");
    }
  }

  const sourceKeys = new Set(sourceTargets.map(({ entityType, target }) => `${entityType}:${target.id}`));
  for (const decision of current) {
    const key = `${decision.targetEntityType}:${decision.targetEntityId}`;
    if (!sourceKeys.has(key)) throw new HeliosEuclidCandidateError(`Review decision target ${key} is not in the current source model.`);
  }

  if (unreviewedCount) blockingReasons.push(`${unreviewedCount} geometry records still require estimator review.`);
  if (deferredCount) blockingReasons.push(`${deferredCount} geometry records are deferred.`);
  if (rejectedCount) blockingReasons.push(`${rejectedCount} geometry records are rejected.`);

  const reviewSetFingerprint = heliosEuclidReviewSetFingerprint(current);
  const candidateBasis = {
    sourceEuclidModelId: input.euclidModelId,
    sourceModelFingerprint: input.modelFingerprint,
    sourceFingerprint: input.model.sourceFingerprint,
    reviewSetFingerprint,
    builder: HELIOS_EUCLID_CANDIDATE_BUILDER,
    builderVersion: HELIOS_EUCLID_CANDIDATE_BUILDER_VERSION,
  };
  const candidateKey = buildHeliosEngineeringParityFingerprint(candidateBasis);
  candidateModel.id = `review-candidate:${candidateKey.split(":")[1]!.slice(0, 32)}`;
  candidateModel.status = "partially_accepted";
  candidateModel.updatedAt = input.createdAt;

  const validation = validateHeliosEuclidContract(candidateModel);
  if (!validation.valid) {
    blockingReasons.push(
      ...validation.issues.map((row) => `Contract validation: ${row.code} — ${row.message}`),
    );
  }
  const reviewComplete =
    sourceTargets.length > 0 &&
    unreviewedCount === 0 &&
    deferredCount === 0 &&
    rejectedCount === 0;
  const validationEligible = reviewComplete && validation.valid;
  const status: HeliosEuclidCandidateStatus = validationEligible
    ? "ready_for_validation"
    : deferredCount || rejectedCount || !validation.valid
      ? "blocked"
      : "incomplete_review";
  if (validationEligible) {
    blockingReasons.push("Deterministic horizontal, vertical, and relationship validation has not run against this candidate.");
  }
  blockingReasons.push("Stage 4H candidates cannot publish quantities, estimates, or LandXML.");

  return {
    version: HELIOS_EUCLID_CANDIDATE_VERSION,
    candidateKey,
    candidateId: candidateModel.id,
    sourceEuclidModelId: input.euclidModelId,
    sourceModelFingerprint: input.modelFingerprint,
    sourceFingerprint: input.model.sourceFingerprint,
    reviewSetFingerprint,
    candidateFingerprint: euclidModelFingerprint(candidateModel),
    builder: HELIOS_EUCLID_CANDIDATE_BUILDER,
    builderVersion: HELIOS_EUCLID_CANDIDATE_BUILDER_VERSION,
    status,
    validationEligible,
    downstreamEligible: false,
    totalTargetCount: sourceTargets.length,
    acceptedCount,
    correctedCount,
    deferredCount,
    rejectedCount,
    unreviewedCount,
    blockingReasons,
    decisionIds: decisionIds.sort(),
    model: candidateModel,
    createdAt: input.createdAt,
  };
}
