export const HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION = 1;
export const HELIOS_ENGINEERING_PARITY_VERSION = 1;

export const HELIOS_ENGINEERING_PARITY_AREAS = [
  "sources",
  "document_intelligence",
  "evidence",
  "plan_pages",
  "plan_views",
  "plan_calibrations",
  "plan_references",
  "civil_geometry",
] as const;

export const HELIOS_ENGINEERING_PARITY_STATUSES = [
  "passed",
  "failed",
  "incomplete",
  "not_applicable",
] as const;

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

export type HeliosEngineeringParityArea =
  (typeof HELIOS_ENGINEERING_PARITY_AREAS)[number];
export type HeliosEngineeringParityStatus =
  (typeof HELIOS_ENGINEERING_PARITY_STATUSES)[number];
export type HeliosEngineeringParityIdentity = {
  id: string;
  fingerprint: string;
};
export type HeliosEngineeringParityAreaInput = {
  area: HeliosEngineeringParityArea;
  readiness: "ready" | "incomplete" | "not_applicable";
  authoritative: HeliosEngineeringParityIdentity[];
  canonical: HeliosEngineeringParityIdentity[];
};
export type HeliosEngineeringParityAreaResult = {
  area: HeliosEngineeringParityArea;
  status: HeliosEngineeringParityStatus;
  authoritativeCount: number;
  canonicalCount: number;
  missingIds: string[];
  unexpectedIds: string[];
  fingerprintMismatchIds: string[];
};
export type HeliosEngineeringParityResult = {
  status: Exclude<HeliosEngineeringParityStatus, "not_applicable">;
  areas: HeliosEngineeringParityAreaResult[];
  issues: string[];
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

function stableParityValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new HeliosEngineeringRecordError("Parity input contains a non-finite number.");
    }
    return Object.is(value, -0) ? "0" : String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableParityValue(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableParityValue(record[key])}`)
      .join(",")}}`;
  }
  throw new HeliosEngineeringRecordError("Parity input contains an unsupported value.");
}

function fnv32(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildHeliosEngineeringParityFingerprint(value: unknown) {
  const canonical = stableParityValue(value);
  const digest = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
    .map((seed) => fnv32(canonical, seed))
    .join("");
  return `helios-parity-v${HELIOS_ENGINEERING_PARITY_VERSION}:${digest}`;
}

function uniqueParityIdentities(
  identities: HeliosEngineeringParityIdentity[],
  label: string,
) {
  const result = new Map<string, string>();
  for (const identity of identities) {
    const id = boundedToken(identity.id, `${label} identity`, 300);
    const fingerprint = identity.fingerprint.trim();
    if (!fingerprint || fingerprint.length > 1_000 || /[\r\n]/.test(fingerprint)) {
      throw new HeliosEngineeringRecordError(`${label} fingerprint is invalid.`);
    }
    if (result.has(id)) {
      throw new HeliosEngineeringRecordError(`${label} contains duplicate identity ${id}.`);
    }
    result.set(id, fingerprint);
  }
  return result;
}

export function compareHeliosEngineeringParity(
  inputs: HeliosEngineeringParityAreaInput[],
): HeliosEngineeringParityResult {
  const seenAreas = new Set<HeliosEngineeringParityArea>();
  const areas = inputs.map((input): HeliosEngineeringParityAreaResult => {
    if (seenAreas.has(input.area)) {
      throw new HeliosEngineeringRecordError(`Parity area ${input.area} is duplicated.`);
    }
    seenAreas.add(input.area);
    const authoritative = uniqueParityIdentities(input.authoritative, `${input.area} authoritative`);
    const canonical = uniqueParityIdentities(input.canonical, `${input.area} canonical`);
    const missingIds = [...authoritative.keys()].filter((id) => !canonical.has(id)).sort();
    const unexpectedIds = [...canonical.keys()].filter((id) => !authoritative.has(id)).sort();
    const fingerprintMismatchIds = [...authoritative.entries()]
      .filter(([id, fingerprint]) => canonical.has(id) && canonical.get(id) !== fingerprint)
      .map(([id]) => id)
      .sort();
    const mismatch = missingIds.length || unexpectedIds.length || fingerprintMismatchIds.length;
    const status: HeliosEngineeringParityStatus =
      input.readiness === "not_applicable"
        ? authoritative.size || canonical.size
          ? "failed"
          : "not_applicable"
        : mismatch
          ? "failed"
          : input.readiness === "incomplete"
            ? "incomplete"
            : "passed";
    return {
      area: input.area,
      status,
      authoritativeCount: authoritative.size,
      canonicalCount: canonical.size,
      missingIds,
      unexpectedIds,
      fingerprintMismatchIds,
    };
  });
  for (const area of HELIOS_ENGINEERING_PARITY_AREAS) {
    if (!seenAreas.has(area)) {
      throw new HeliosEngineeringRecordError(`Parity area ${area} is missing.`);
    }
  }
  const status = areas.some((area) => area.status === "failed")
    ? "failed"
    : areas.some((area) => area.status === "incomplete")
      ? "incomplete"
      : "passed";
  const issues = areas.flatMap((area) => {
    const details = [
      area.missingIds.length ? `${area.missingIds.length} missing` : "",
      area.unexpectedIds.length ? `${area.unexpectedIds.length} unexpected` : "",
      area.fingerprintMismatchIds.length
        ? `${area.fingerprintMismatchIds.length} fingerprint mismatch`
        : "",
    ].filter(Boolean);
    if (details.length) return [`${area.area}: ${details.join(", ")}.`];
    if (area.status === "incomplete") return [`${area.area}: authoritative workflow is incomplete.`];
    return [];
  });
  return { status, areas, issues };
}

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
