import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import { validateHeliosEuclidContract, type HeliosEuclidModel } from "./euclid-contract.ts";
import { euclidModelFingerprint } from "./euclid-shadow.ts";

export const HELIOS_EUCLID_PROMOTION_VERSION = 1;
export const HELIOS_EUCLID_PROMOTER = "helios-euclid-governed-promotion";
export const HELIOS_EUCLID_PROMOTER_VERSION = 1;
export const HELIOS_EUCLID_PROMOTION_ADAPTER = "reviewed-candidate-promotion-v1";

export type HeliosEuclidPromotionInput = {
  version: typeof HELIOS_EUCLID_PROMOTION_VERSION;
  requestId: string;
  sourceEuclidModelId: string;
  sourceModelFingerprint: string;
  candidateId: string;
  candidateFingerprint: string;
  reviewSetFingerprint: string;
  validationId: string;
  validationFingerprint: string;
};

export type HeliosEuclidPromotionValidationBasis = {
  sourceEuclidModelId: string;
  sourceModelFingerprint: string;
  candidateId: string;
  candidateFingerprint: string;
  reviewSetFingerprint: string;
  validationFingerprint: string;
  status: "passed" | "review" | "blocked" | "not_applicable";
  validationPassed: boolean;
  degradedCount: number;
};

export type HeliosEuclidPromotion = {
  version: typeof HELIOS_EUCLID_PROMOTION_VERSION;
  promotionKey: string;
  promotionId: string;
  sourceEuclidModelId: string;
  sourceModelFingerprint: string;
  candidateId: string;
  candidateFingerprint: string;
  reviewSetFingerprint: string;
  validationId: string;
  validationFingerprint: string;
  canonicalVersion: number;
  promotedModelFingerprint: string;
  promoter: typeof HELIOS_EUCLID_PROMOTER;
  promoterVersion: typeof HELIOS_EUCLID_PROMOTER_VERSION;
  adapterVersion: typeof HELIOS_EUCLID_PROMOTION_ADAPTER;
  status: "promoted";
  downstreamEligible: false;
  model: HeliosEuclidModel;
  createdAt: number;
};

export class HeliosEuclidPromotionError extends Error {}

function boundedText(value: unknown, label: string) {
  if (typeof value !== "string") throw new HeliosEuclidPromotionError(`${label} is required.`);
  const result = value.trim();
  if (!result || result.length > 2_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result)) {
    throw new HeliosEuclidPromotionError(`${label} is invalid.`);
  }
  return result;
}

export function normalizeHeliosEuclidPromotionInput(value: unknown): HeliosEuclidPromotionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HeliosEuclidPromotionError("Euclid promotion request is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.version !== HELIOS_EUCLID_PROMOTION_VERSION) {
    throw new HeliosEuclidPromotionError("Euclid promotion version is not supported.");
  }
  return {
    version: HELIOS_EUCLID_PROMOTION_VERSION,
    requestId: boundedText(input.requestId, "Promotion request"),
    sourceEuclidModelId: boundedText(input.sourceEuclidModelId, "Source Euclid model"),
    sourceModelFingerprint: boundedText(input.sourceModelFingerprint, "Source model fingerprint"),
    candidateId: boundedText(input.candidateId, "Reviewed candidate"),
    candidateFingerprint: boundedText(input.candidateFingerprint, "Candidate fingerprint"),
    reviewSetFingerprint: boundedText(input.reviewSetFingerprint, "Review-set fingerprint"),
    validationId: boundedText(input.validationId, "Candidate validation"),
    validationFingerprint: boundedText(input.validationFingerprint, "Validation fingerprint"),
  };
}

export function buildHeliosEuclidPromotion(input: {
  sourceModel: HeliosEuclidModel;
  candidateModel: HeliosEuclidModel;
  sourceEuclidModelId: string;
  candidateId: string;
  validationId: string;
  validation: HeliosEuclidPromotionValidationBasis;
  canonicalVersion: number;
  createdAt: number;
}): HeliosEuclidPromotion {
  if (!Number.isSafeInteger(input.canonicalVersion) || input.canonicalVersion < 2) {
    throw new HeliosEuclidPromotionError("Canonical Euclid version is invalid.");
  }
  if (!Number.isSafeInteger(input.createdAt) || input.createdAt < 1) {
    throw new HeliosEuclidPromotionError("Promotion timestamp is invalid.");
  }
  const sourceContract = validateHeliosEuclidContract(input.sourceModel);
  const candidateContract = validateHeliosEuclidContract(input.candidateModel);
  if (!sourceContract.valid) throw new HeliosEuclidPromotionError("Source Euclid model is not contract-valid.");
  if (!candidateContract.valid) throw new HeliosEuclidPromotionError("Reviewed Euclid candidate is not contract-valid.");

  const sourceFingerprint = euclidModelFingerprint(input.sourceModel);
  const candidateFingerprint = euclidModelFingerprint(input.candidateModel);
  if (
    input.validation.sourceEuclidModelId !== input.sourceEuclidModelId ||
    input.validation.sourceModelFingerprint !== sourceFingerprint ||
    input.validation.candidateId !== input.candidateId ||
    input.validation.candidateFingerprint !== candidateFingerprint ||
    input.validation.validationFingerprint.length < 1
  ) throw new HeliosEuclidPromotionError("Promotion lineage does not match the validated source and candidate.");
  if (input.sourceModel.sourceFingerprint !== input.candidateModel.sourceFingerprint) {
    throw new HeliosEuclidPromotionError("Candidate source fingerprint does not match the canonical source model.");
  }
  if (!input.validation.validationPassed || input.validation.status !== "passed") {
    throw new HeliosEuclidPromotionError("Only a passing Stage 4I validation can be promoted.");
  }
  if (input.validation.degradedCount !== 0) {
    throw new HeliosEuclidPromotionError("A candidate with degraded engineering results cannot be promoted.");
  }

  const promotionBasis = {
    sourceEuclidModelId: input.sourceEuclidModelId,
    sourceModelFingerprint: sourceFingerprint,
    candidateId: input.candidateId,
    candidateFingerprint,
    reviewSetFingerprint: input.validation.reviewSetFingerprint,
    validationId: input.validationId,
    validationFingerprint: input.validation.validationFingerprint,
    canonicalVersion: input.canonicalVersion,
    promoter: HELIOS_EUCLID_PROMOTER,
    promoterVersion: HELIOS_EUCLID_PROMOTER_VERSION,
  };
  const promotionKey = buildHeliosEngineeringParityFingerprint(promotionBasis);
  const model = JSON.parse(JSON.stringify(input.candidateModel)) as HeliosEuclidModel;
  model.id = `euclid-canonical:${promotionKey.split(":")[1]!.slice(0, 32)}`;
  model.status = "accepted";
  model.createdAt = input.createdAt;
  model.updatedAt = input.createdAt;
  const promotedContract = validateHeliosEuclidContract(model);
  if (!promotedContract.valid) {
    throw new HeliosEuclidPromotionError(`Promoted Euclid model failed its frozen contract: ${promotedContract.issues.map((row) => row.code).join(", ")}`);
  }
  const promotedModelFingerprint = euclidModelFingerprint(model);
  return {
    version: HELIOS_EUCLID_PROMOTION_VERSION,
    promotionKey,
    promotionId: `euclid-promotion:${promotionKey.split(":")[1]!.slice(0, 32)}`,
    sourceEuclidModelId: input.sourceEuclidModelId,
    sourceModelFingerprint: sourceFingerprint,
    candidateId: input.candidateId,
    candidateFingerprint,
    reviewSetFingerprint: input.validation.reviewSetFingerprint,
    validationId: input.validationId,
    validationFingerprint: input.validation.validationFingerprint,
    canonicalVersion: input.canonicalVersion,
    promotedModelFingerprint,
    promoter: HELIOS_EUCLID_PROMOTER,
    promoterVersion: HELIOS_EUCLID_PROMOTER_VERSION,
    adapterVersion: HELIOS_EUCLID_PROMOTION_ADAPTER,
    status: "promoted",
    downstreamEligible: false,
    model,
    createdAt: input.createdAt,
  };
}
