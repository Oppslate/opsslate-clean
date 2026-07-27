export const HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION = 1;

export const HELIOS_ENGINEERING_RECORD_STATUSES = [
  "draft",
  "indexing",
  "ready",
  "partially_ready",
  "failed",
  "superseded",
] as const;

export const HELIOS_ENGINEERING_COVERAGE_AREAS = [
  "document_intelligence",
  "plan_reconstruction",
  "civil_geometry",
] as const;

export const HELIOS_ENGINEERING_COVERAGE_STATUSES = [
  "not_applicable",
  "pending",
  "processing",
  "ready",
  "partially_ready",
  "failed",
] as const;

export const HELIOS_ENGINEERING_SOURCE_KINDS = ["pdf", "written_scope"] as const;
export const HELIOS_ENGINEERING_SOURCE_STATUSES = [
  "registered",
  "extracting",
  "ready",
  "failed",
  "superseded",
] as const;
export const HELIOS_ENGINEERING_PAGE_MODALITIES = [
  "vector",
  "scanned",
  "hybrid",
  "unusable",
] as const;
export const HELIOS_ENGINEERING_CHANNEL_STATUSES = [
  "not_applicable",
  "pending",
  "ready",
  "failed",
] as const;
export const HELIOS_ENGINEERING_TEXT_CHANNELS = ["native", "ocr"] as const;
export const HELIOS_ENGINEERING_ASSET_KINDS = [
  "page_render",
  "page_thumbnail",
  "view_crop",
] as const;
export const HELIOS_ENGINEERING_ARTIFACT_KINDS = [
  "document_intelligence",
  "plan_inventory",
  "civil_geometry",
] as const;
export const HELIOS_ENGINEERING_ARTIFACT_STATUSES = [
  "pending",
  "processing",
  "ready",
  "partially_ready",
  "failed",
  "superseded",
] as const;
export const HELIOS_ENGINEERING_PROVENANCE_KINDS = [
  "source",
  "page",
  "text_span",
  "visual_region",
] as const;
export const HELIOS_ENGINEERING_REMOTE_FILE_STATUSES = [
  "uploaded",
  "active",
  "deleting",
  "deleted",
  "delete_failed",
  "expired",
] as const;

export type HeliosEngineeringRecordStatus =
  (typeof HELIOS_ENGINEERING_RECORD_STATUSES)[number];
export type HeliosEngineeringCoverageArea =
  (typeof HELIOS_ENGINEERING_COVERAGE_AREAS)[number];
export type HeliosEngineeringCoverageStatus =
  (typeof HELIOS_ENGINEERING_COVERAGE_STATUSES)[number];
export type HeliosEngineeringSourceKind =
  (typeof HELIOS_ENGINEERING_SOURCE_KINDS)[number];
export type HeliosEngineeringSourceStatus =
  (typeof HELIOS_ENGINEERING_SOURCE_STATUSES)[number];
export type HeliosEngineeringPageModality =
  (typeof HELIOS_ENGINEERING_PAGE_MODALITIES)[number];
export type HeliosEngineeringChannelStatus =
  (typeof HELIOS_ENGINEERING_CHANNEL_STATUSES)[number];
export type HeliosEngineeringTextChannel =
  (typeof HELIOS_ENGINEERING_TEXT_CHANNELS)[number];
export type HeliosEngineeringAssetKind =
  (typeof HELIOS_ENGINEERING_ASSET_KINDS)[number];
export type HeliosEngineeringArtifactKind =
  (typeof HELIOS_ENGINEERING_ARTIFACT_KINDS)[number];
export type HeliosEngineeringArtifactStatus =
  (typeof HELIOS_ENGINEERING_ARTIFACT_STATUSES)[number];
export type HeliosEngineeringProvenanceKind =
  (typeof HELIOS_ENGINEERING_PROVENANCE_KINDS)[number];
export type HeliosEngineeringRemoteFileStatus =
  (typeof HELIOS_ENGINEERING_REMOTE_FILE_STATUSES)[number];

export type HeliosEngineeringBoundary = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HeliosEngineeringCoverage = Record<
  HeliosEngineeringCoverageArea,
  HeliosEngineeringCoverageStatus
>;

export type HeliosEngineeringRecordCoverage = {
  documentIntelligence: HeliosEngineeringCoverageStatus;
  planReconstruction: HeliosEngineeringCoverageStatus;
  civilGeometry: HeliosEngineeringCoverageStatus;
};

export type HeliosEngineeringSourceFingerprintInput = {
  sha256: string;
  packageRevision: number;
  sourceVersion: number;
  ingestionSchemaVersion: number;
  extractorVersion: string;
  promptVersion: string;
  modelVersion: string;
};

export type HeliosEngineeringCompatibilityIdentity = {
  companyId: string;
  projectId: string;
  packageId: string;
  packageRevision: number;
  documentId?: string;
  writtenScopeId?: string;
  sha256: string;
  sourceVersion: number;
};

export type HeliosEngineeringShadowCoverageInput = {
  pdfSourceCount: number;
  completedDocumentCount: number;
  failedDocumentCount: number;
  activeDocumentCount: number;
  plansApplicable: boolean;
  planRunStatus?: string;
  geometryRunStatus?: string;
};

export class HeliosEngineeringRecordError extends Error {}

function boundedToken(value: string, label: string, maximum = 160) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum || /[\r\n|]/.test(normalized)) {
    throw new HeliosEngineeringRecordError(`${label} is invalid.`);
  }
  return normalized;
}

function positiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new HeliosEngineeringRecordError(`${label} must be a positive integer.`);
  }
  return value;
}

const ENGINEERING_BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function hexSha256ToBase64(value: string) {
  const bytes = Array.from({ length: 32 }, (_, index) =>
    Number.parseInt(value.slice(index * 2, index * 2 + 2), 16),
  );
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined = (first << 16) | ((second || 0) << 8) | (third || 0);
    encoded += ENGINEERING_BASE64_ALPHABET[(combined >> 18) & 63];
    encoded += ENGINEERING_BASE64_ALPHABET[(combined >> 12) & 63];
    encoded += second === undefined
      ? "="
      : ENGINEERING_BASE64_ALPHABET[(combined >> 6) & 63];
    encoded += third === undefined
      ? "="
      : ENGINEERING_BASE64_ALPHABET[combined & 63];
  }
  return encoded;
}

function normalizedSha256(value: string) {
  const normalized = value.trim();
  if (/^[a-f0-9]{64}$/i.test(normalized)) {
    return hexSha256ToBase64(normalized.toLowerCase());
  }
  if (/^[A-Za-z0-9+/]{43}=$/.test(normalized)) return normalized;
  throw new HeliosEngineeringRecordError(
    "Engineering source SHA-256 must be hexadecimal or Base64.",
  );
}

export function buildHeliosEngineeringSourceFingerprint(
  input: HeliosEngineeringSourceFingerprintInput,
) {
  const parts = [
    `schema:${positiveInteger(input.ingestionSchemaVersion, "Ingestion schema version")}`,
    `package:${positiveInteger(input.packageRevision, "Package revision")}`,
    `source:${positiveInteger(input.sourceVersion, "Source version")}`,
    `sha256:${normalizedSha256(input.sha256)}`,
    `extractor:${boundedToken(input.extractorVersion, "Extractor version")}`,
    `prompt:${boundedToken(input.promptVersion, "Prompt version")}`,
    `model:${boundedToken(input.modelVersion, "Model version")}`,
  ];
  return `helios-engineering|${parts.join("|")}`;
}

export function assertHeliosEngineeringCompatibility(
  existing: HeliosEngineeringCompatibilityIdentity,
  candidate: HeliosEngineeringCompatibilityIdentity,
) {
  for (const identity of [existing, candidate]) {
    if (Boolean(identity.documentId) === Boolean(identity.writtenScopeId)) {
      throw new HeliosEngineeringRecordError(
        "Engineering source must identify exactly one immutable source record.",
      );
    }
  }
  const fields: Array<keyof HeliosEngineeringCompatibilityIdentity> = [
    "companyId",
    "projectId",
    "packageId",
    "packageRevision",
    "documentId",
    "writtenScopeId",
    "sourceVersion",
  ];
  for (const field of fields) {
    if (existing[field] !== candidate[field]) {
      throw new HeliosEngineeringRecordError(
        `Engineering source compatibility failed for ${field}.`,
      );
    }
  }
  if (normalizedSha256(existing.sha256) !== normalizedSha256(candidate.sha256)) {
    throw new HeliosEngineeringRecordError(
      "Engineering source compatibility failed for sha256.",
    );
  }
  return true;
}

function processingCoverageStatus(status?: string): HeliosEngineeringCoverageStatus {
  if (!status) return "pending";
  if (["queued", "uploading", "analyzing", "processing"].includes(status)) {
    return "processing";
  }
  if (["ready", "ready_for_review", "completed"].includes(status)) return "ready";
  if (status === "partially_ready") return "partially_ready";
  if (status === "failed") return "failed";
  if (status === "not_applicable_to_current_basis") return "not_applicable";
  return "pending";
}

export function deriveHeliosEngineeringShadowCoverage(
  input: HeliosEngineeringShadowCoverageInput,
): HeliosEngineeringRecordCoverage {
  const documentIntelligence: HeliosEngineeringCoverageStatus =
    input.pdfSourceCount === 0
      ? "not_applicable"
      : input.activeDocumentCount > 0
        ? "processing"
        : input.completedDocumentCount === input.pdfSourceCount
          ? "ready"
          : input.completedDocumentCount > 0
            ? "partially_ready"
            : input.failedDocumentCount === input.pdfSourceCount
              ? "failed"
              : "pending";
  const planReconstruction = input.plansApplicable
    ? processingCoverageStatus(input.planRunStatus)
    : "not_applicable";
  const civilGeometry = input.plansApplicable
    ? processingCoverageStatus(input.geometryRunStatus)
    : "not_applicable";
  return { documentIntelligence, planReconstruction, civilGeometry };
}

export function deriveHeliosEngineeringShadowRecordStatus(
  coverage: HeliosEngineeringRecordCoverage,
): HeliosEngineeringRecordStatus {
  const applicable = Object.values(coverage).filter(
    (status) => status !== "not_applicable",
  );
  if (!applicable.length) return "ready";
  if (applicable.every((status) => status === "ready")) return "ready";
  if (applicable.every((status) => status === "failed")) return "failed";
  if (applicable.some((status) => ["ready", "partially_ready", "failed"].includes(status))) {
    return "partially_ready";
  }
  return "indexing";
}
