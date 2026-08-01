import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import type { HeliosEuclidQuantityCapability } from "./euclid-integration.ts";
import type {
  HeliosEuclidDraftSurfaceQuantity,
  HeliosEuclidSurfaceQuantityCalculationType,
  HeliosEuclidSurfaceQuantityResult,
} from "./euclid-surface-quantities.ts";

export const HELIOS_EUCLID_SURFACE_QUANTITY_REVIEW_VERSION = 1;
export const HELIOS_EUCLID_SURFACE_QUANTITY_PUBLICATION_VERSION = 1;
export const HELIOS_EUCLID_SURFACE_QUANTITY_ADAPTER = "canonical-4p-to-4k-v1";

export type HeliosEuclidSurfaceQuantityReviewAction = "accept" | "defer" | "reject";
export type HeliosEuclidSurfaceQuantityReviewInput = {
  version: typeof HELIOS_EUCLID_SURFACE_QUANTITY_REVIEW_VERSION;
  requestId: string;
  euclidModelId: string;
  modelFingerprint: string;
  alignmentId: string;
  resultFingerprint: string;
  draftQuantityId: string;
  draftQuantityFingerprint: string;
  action: HeliosEuclidSurfaceQuantityReviewAction;
  reason?: string;
};

export type HeliosEuclidSurfaceDraftPublicationInput = {
  version: typeof HELIOS_EUCLID_SURFACE_QUANTITY_PUBLICATION_VERSION;
  requestId: string;
  euclidModelId: string;
  modelFingerprint: string;
  alignmentId: string;
  integrationSolutionId: string;
  integrationSolutionFingerprint: string;
  resultFingerprint: string;
  draftQuantityId: string;
  draftQuantityFingerprint: string;
  reviewId: string;
  reviewFingerprint: string;
  costCodeId: string;
  use: "comparative" | "production";
};

export type HeliosEuclidSurfaceQuantityReviewRecord = {
  id: string;
  decisionFingerprint: string;
  draftQuantityId: string;
  draftQuantityFingerprint: string;
  resultFingerprint: string;
  action: HeliosEuclidSurfaceQuantityReviewAction;
  reason?: string;
  reviewerName: string;
  createdAt: number;
};

export type HeliosEuclidSurfaceQuantityPublicationRecord = {
  id: string;
  estimateQuantityId: string;
  costCodeId: string;
  use: "comparative" | "production";
  publishedByName: string;
  createdAt: number;
};

export type HeliosEuclidSurfaceQuantityTarget = {
  costCodeId: string;
  code: string;
  description: string;
  payItemNumber?: string;
  payItemDescription: string;
  productionUnit: string;
  reviewStatus: "proposed" | "deferred" | "accepted" | "corrected";
};

export type HeliosEuclidReviewedSurfaceDraft = HeliosEuclidDraftSurfaceQuantity & {
  review?: HeliosEuclidSurfaceQuantityReviewRecord;
  publication?: HeliosEuclidSurfaceQuantityPublicationRecord;
};

export type HeliosEuclidSurfaceQuantityReviewBoundary = {
  status: "not_eligible" | "blocked" | "ready";
  reason?: string;
  euclidModelId: string;
  modelFingerprint: string;
  integrationSolutionId?: string;
  integrationSolutionFingerprint?: string;
  estimateId?: string;
  reviewedCount: number;
  acceptedCount: number;
  publishedCount: number;
  targets: HeliosEuclidSurfaceQuantityTarget[];
};

export type HeliosEuclidSurfaceQuantityReviewWorkspace = {
  result: Omit<HeliosEuclidSurfaceQuantityResult, "draftQuantities"> & {
    draftQuantities: HeliosEuclidReviewedSurfaceDraft[];
  };
  boundary: HeliosEuclidSurfaceQuantityReviewBoundary;
};

export class HeliosEuclidSurfaceQuantityReviewError extends Error {}

function boundedText(value: unknown, label: string, maximum = 2_000) {
  if (typeof value !== "string") throw new HeliosEuclidSurfaceQuantityReviewError(`${label} is required.`);
  const result = value.trim();
  if (!result || result.length > maximum || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result)) {
    throw new HeliosEuclidSurfaceQuantityReviewError(`${label} is invalid.`);
  }
  return result;
}

function optionalReason(value: unknown, required: boolean) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HeliosEuclidSurfaceQuantityReviewError("A reason is required to defer or reject a quantity.");
    return undefined;
  }
  return boundedText(value, "Review reason");
}

export function normalizeHeliosEuclidSurfaceQuantityReviewInput(value: unknown): HeliosEuclidSurfaceQuantityReviewInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HeliosEuclidSurfaceQuantityReviewError("Surface quantity review request is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.version !== HELIOS_EUCLID_SURFACE_QUANTITY_REVIEW_VERSION) {
    throw new HeliosEuclidSurfaceQuantityReviewError("Surface quantity review version is not supported.");
  }
  if (input.action !== "accept" && input.action !== "defer" && input.action !== "reject") {
    throw new HeliosEuclidSurfaceQuantityReviewError("Surface quantity review action is invalid.");
  }
  return {
    version: HELIOS_EUCLID_SURFACE_QUANTITY_REVIEW_VERSION,
    requestId: boundedText(input.requestId, "Review request"),
    euclidModelId: boundedText(input.euclidModelId, "Euclid model"),
    modelFingerprint: boundedText(input.modelFingerprint, "Model fingerprint"),
    alignmentId: boundedText(input.alignmentId, "Alignment"),
    resultFingerprint: boundedText(input.resultFingerprint, "Surface quantity result fingerprint"),
    draftQuantityId: boundedText(input.draftQuantityId, "Draft quantity"),
    draftQuantityFingerprint: boundedText(input.draftQuantityFingerprint, "Draft quantity fingerprint"),
    action: input.action,
    reason: optionalReason(input.reason, input.action !== "accept"),
  };
}

export function normalizeHeliosEuclidSurfaceDraftPublicationInput(value: unknown): HeliosEuclidSurfaceDraftPublicationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HeliosEuclidSurfaceQuantityReviewError("Surface draft publication request is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.version !== HELIOS_EUCLID_SURFACE_QUANTITY_PUBLICATION_VERSION) {
    throw new HeliosEuclidSurfaceQuantityReviewError("Surface draft publication version is not supported.");
  }
  if (input.use !== "comparative" && input.use !== "production") {
    throw new HeliosEuclidSurfaceQuantityReviewError("Quantity use must be comparative or production.");
  }
  return {
    version: HELIOS_EUCLID_SURFACE_QUANTITY_PUBLICATION_VERSION,
    requestId: boundedText(input.requestId, "Publication request"),
    euclidModelId: boundedText(input.euclidModelId, "Euclid model"),
    modelFingerprint: boundedText(input.modelFingerprint, "Model fingerprint"),
    alignmentId: boundedText(input.alignmentId, "Alignment"),
    integrationSolutionId: boundedText(input.integrationSolutionId, "Integration solution"),
    integrationSolutionFingerprint: boundedText(input.integrationSolutionFingerprint, "Integration solution fingerprint"),
    resultFingerprint: boundedText(input.resultFingerprint, "Surface quantity result fingerprint"),
    draftQuantityId: boundedText(input.draftQuantityId, "Draft quantity"),
    draftQuantityFingerprint: boundedText(input.draftQuantityFingerprint, "Draft quantity fingerprint"),
    reviewId: boundedText(input.reviewId, "Surface quantity review"),
    reviewFingerprint: boundedText(input.reviewFingerprint, "Surface quantity review fingerprint"),
    costCodeId: boundedText(input.costCodeId, "Estimate cost code"),
    use: input.use,
  };
}

export function heliosEuclidSurfaceQuantityReviewFingerprint(input: {
  modelFingerprint: string;
  resultFingerprint: string;
  draftQuantityId: string;
  draftQuantityFingerprint: string;
  action: HeliosEuclidSurfaceQuantityReviewAction;
  reason?: string;
  reviewerUserId: string;
  createdAt: number;
}) {
  return buildHeliosEngineeringParityFingerprint(input);
}

export function heliosEuclidSurfaceQuantityCapability(
  calculationType: HeliosEuclidSurfaceQuantityCalculationType,
): HeliosEuclidQuantityCapability {
  if (calculationType === "material_area") return "material_area";
  if (calculationType === "material_volume") return "material_volume";
  return "earthwork_volume";
}
