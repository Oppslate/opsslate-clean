export const HELIOS_MAX_PDF_BYTES = 50 * 1024 * 1024;
export const HELIOS_MAX_UPLOAD_BATCH = 250;
export const HELIOS_UPLOAD_INTENT_LIFETIME_MS = 60 * 60 * 1000;
export const HELIOS_MAX_PACKAGE_ENTRIES = 500;
export const HELIOS_MAX_PACKAGE_BYTES = 5 * 1024 * 1024 * 1024;
export const HELIOS_MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
export const HELIOS_MAX_ARCHIVE_EXPANDED_BYTES = 1024 * 1024 * 1024;
export const HELIOS_MAX_ARCHIVE_EXPANSION_RATIO = 100;
export const HELIOS_MAX_PACKAGE_PATH_LENGTH = 512;
export const HELIOS_MAX_PACKAGE_DEPTH = 12;

export const HELIOS_PROJECT_STATUSES = [
  "draft",
  "intake",
  "documents_ready",
  "archived",
] as const;

export const HELIOS_INTELLIGENCE_STATUSES = [
  "awaiting_documents",
  "ready_for_intelligence",
  "queued",
  "processing",
  "ready_for_review",
  "partially_ready",
  "failed",
] as const;

export const HELIOS_DOCUMENT_STATUSES = [
  "ready_for_intelligence",
  "queued",
  "uploading_to_openai",
  "analyzing",
  "completed",
  "failed",
  "superseded",
] as const;

export const HELIOS_INTELLIGENCE_CATEGORIES = [
  "project_metadata",
  "document_control",
  "contract_requirements",
  "required_forms",
  "addenda",
  "drawing_index",
  "specification_sections",
  "bid_items",
  "allowances",
  "alternates",
  "unit_price_items",
  "known_risks",
  "missing_information",
  "required_subcontractors",
  "required_suppliers",
  "scope_conflicts",
  "addendum_impacts",
] as const;

export const HELIOS_PACKAGE_SOURCE_TYPES = [
  "files",
  "folder",
  "zip",
] as const;

export const HELIOS_PACKAGE_STATUSES = [
  "uploading",
  "ready_for_analysis",
  "processing",
  "ready_for_review",
  "partially_ready",
  "failed",
  "superseded",
] as const;

export const HELIOS_PACKAGE_ENTRY_STATUSES = [
  "pending",
  "uploaded",
  "duplicate",
  "rejected",
  "failed",
] as const;

export const HELIOS_FINDING_SEVERITIES = [
  "information",
  "warning",
  "critical",
] as const;

export const HELIOS_JOB_STATUSES = [
  "queued",
  "uploading",
  "analyzing",
  "synthesizing",
  "completed",
  "failed",
] as const;

export const HELIOS_FINDING_REVIEW_ACTIONS = [
  "approve",
  "correct",
  "reject",
  "request_reanalysis",
  "supersede",
] as const;

export const HELIOS_FINDING_REVIEW_STATUSES = [
  "needs_review",
  "approved",
  "corrected",
  "rejected",
  "reanalysis_requested",
  "superseded",
] as const;

export const HELIOS_ESTIMATE_STATUSES = [
  "draft",
  "proposal_processing",
  "ready_for_review",
  "accepted",
  "superseded",
  "failed",
] as const;

export const HELIOS_ESTIMATE_REVIEW_STATUSES = [
  "proposed",
  "accepted",
  "corrected",
  "rejected",
] as const;

export const HELIOS_ESTIMATE_QUANTITY_STATUSES = [
  "owner_provided",
  "ai_preliminary",
  "takeoff_required",
] as const;

export const HELIOS_ESTIMATE_RESOURCE_CLASSES = [
  "labor",
  "equipment",
  "material",
  "subcontract",
  "trucking",
  "disposal",
  "other",
] as const;

export const HELIOS_ESTIMATE_SCOPE_OWNERSHIP = [
  "self_perform",
  "subcontract",
  "supplier",
  "allowance",
  "unassigned",
] as const;

export const HELIOS_ESTIMATE_RATE_STATUSES = [
  "unpriced",
  "user_entered",
  "cost_database",
  "vendor_quote",
] as const;

export type HeliosProjectStatus = (typeof HELIOS_PROJECT_STATUSES)[number];
export type HeliosIntelligenceStatus =
  (typeof HELIOS_INTELLIGENCE_STATUSES)[number];
export type HeliosDocumentStatus = (typeof HELIOS_DOCUMENT_STATUSES)[number];
export type HeliosIntelligenceCategory =
  (typeof HELIOS_INTELLIGENCE_CATEGORIES)[number];
export type HeliosFindingSeverity =
  (typeof HELIOS_FINDING_SEVERITIES)[number];
export type HeliosJobStatus = (typeof HELIOS_JOB_STATUSES)[number];
export type HeliosFindingReviewAction =
  (typeof HELIOS_FINDING_REVIEW_ACTIONS)[number];
export type HeliosFindingReviewStatus =
  (typeof HELIOS_FINDING_REVIEW_STATUSES)[number];
export type HeliosPackageSourceType =
  (typeof HELIOS_PACKAGE_SOURCE_TYPES)[number];
export type HeliosPackageStatus = (typeof HELIOS_PACKAGE_STATUSES)[number];
export type HeliosPackageEntryStatus =
  (typeof HELIOS_PACKAGE_ENTRY_STATUSES)[number];
export type HeliosEstimateStatus = (typeof HELIOS_ESTIMATE_STATUSES)[number];
export type HeliosEstimateReviewStatus =
  (typeof HELIOS_ESTIMATE_REVIEW_STATUSES)[number];
export type HeliosEstimateQuantityStatus =
  (typeof HELIOS_ESTIMATE_QUANTITY_STATUSES)[number];
export type HeliosEstimateResourceClass =
  (typeof HELIOS_ESTIMATE_RESOURCE_CLASSES)[number];
export type HeliosEstimateScopeOwnership =
  (typeof HELIOS_ESTIMATE_SCOPE_OWNERSHIP)[number];
export type HeliosEstimateRateStatus =
  (typeof HELIOS_ESTIMATE_RATE_STATUSES)[number];

export type HeliosProjectInput = {
  name: string;
  projectNumber?: string;
  ownerClient?: string;
  engineer?: string;
  bidDate?: string;
  location?: string;
  notes?: string;
};

export type HeliosProjectSummary = HeliosProjectInput & {
  id: string;
  status: HeliosProjectStatus;
  intelligenceStatus: HeliosIntelligenceStatus;
  documentCount: number;
  createdAt: number;
  updatedAt: number;
};

export type HeliosDocumentSummary = {
  id: string;
  projectId: string;
  fileName: string;
  contentType: "application/pdf";
  size: number;
  sha256: string;
  status: HeliosDocumentStatus;
  attemptCount: number;
  lastError?: string;
  packageId?: string;
  relativePath?: string;
  documentType?: string;
  processingStartedAt?: number;
  processingCompletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type HeliosPackageEntry = {
  id: string;
  packageId: string;
  relativePath: string;
  size: number;
  status: HeliosPackageEntryStatus;
  reason?: string;
  documentId?: string;
};

export type HeliosBidPackage = {
  id: string;
  projectId: string;
  name: string;
  sourceType: HeliosPackageSourceType;
  revision: number;
  status: HeliosPackageStatus;
  entryCount: number;
  pdfCount: number;
  rejectedCount: number;
  uploadedCount: number;
  duplicateCount: number;
  failedCount: number;
  totalBytes: number;
  lastError?: string;
  finalizedAt?: number;
  analysisCompletedAt?: number;
  createdAt: number;
  updatedAt: number;
  entries: HeliosPackageEntry[];
};

export type HeliosPackageManifestEntryInput = {
  relativePath: string;
  size: number;
  accepted: boolean;
  reason?: string;
};

export type HeliosPackageInput = {
  name: string;
  sourceType: HeliosPackageSourceType;
  entries: HeliosPackageManifestEntryInput[];
};

export type HeliosEvidence = {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber?: number;
  locator: string;
  excerpt: string;
};

export type HeliosIntelligenceFinding = {
  id: string;
  category: HeliosIntelligenceCategory;
  title: string;
  detail: string;
  confidence: number;
  severity: HeliosFindingSeverity;
  evidenceIds: string[];
  review: HeliosFindingReviewState;
};

export type HeliosFindingReviewEvent = {
  id: string;
  action: HeliosFindingReviewAction;
  status: HeliosFindingReviewStatus;
  reviewerName: string;
  correctedTitle?: string;
  correctedDetail?: string;
  trade?: string;
  comment?: string;
  createdAt: number;
};

export type HeliosFindingReviewState = {
  status: HeliosFindingReviewStatus;
  correctedTitle?: string;
  correctedDetail?: string;
  trade?: string;
  reviewerName?: string;
  latestComment?: string;
  updatedAt?: number;
  history: HeliosFindingReviewEvent[];
};

export type HeliosFindingReviewInput = {
  action: HeliosFindingReviewAction;
  correctedTitle?: string;
  correctedDetail?: string;
  trade?: string;
  comment?: string;
};

export type HeliosFindingReviewSummary = {
  total: number;
  needsReview: number;
  approved: number;
  corrected: number;
  rejected: number;
  reanalysisRequested: number;
  superseded: number;
};

export type HeliosEvidenceBackedValue = {
  value: string;
  confidence: number;
  evidenceIds: string[];
};

export type HeliosProjectIntelligence = {
  id: string;
  projectId: string;
  model: string;
  schemaVersion: number;
  summary: string;
  summaryEvidenceIds: string[];
  projectType: HeliosEvidenceBackedValue;
  fundingSource: HeliosEvidenceBackedValue;
  confidence: number;
  findings: HeliosIntelligenceFinding[];
  reviewSummary: HeliosFindingReviewSummary;
  evidence: HeliosEvidence[];
  packageId?: string;
  packageRevision?: number;
  generationId?: string;
  isStale: boolean;
  generatedAt: number;
};

export type HeliosQueueItem = {
  document: HeliosDocumentSummary;
  projectName: string;
};

export type HeliosCockpitData = {
  recentProjects: HeliosProjectSummary[];
  processingQueue: HeliosQueueItem[];
};

export type HeliosProjectDetail = {
  project: HeliosProjectSummary;
  documents: HeliosDocumentSummary[];
  packages: HeliosBidPackage[];
  activePackageId?: string;
  latestIntelligenceError?: string;
  intelligence?: HeliosProjectIntelligence;
};

export type HeliosEstimateResource = {
  id: string;
  resourceClass: HeliosEstimateResourceClass;
  description: string;
  quantity?: number;
  unit: string;
  rateCents?: number;
  rateStatus: HeliosEstimateRateStatus;
  taxStatus: "taxable" | "exempt" | "unknown";
  directCostCents?: number;
};

export type HeliosEstimateCostCode = {
  id: string;
  code: string;
  description: string;
  scopeOwnership: HeliosEstimateScopeOwnership;
  productionQuantity?: number;
  productionUnit: string;
  confidence: number;
  reviewStatus: HeliosEstimateReviewStatus;
  evidenceIds: string[];
  resources: HeliosEstimateResource[];
  directCostCents?: number;
};

export type HeliosOwnerPayItem = {
  id: string;
  officialItemNumber: string;
  description: string;
  bidQuantity?: number;
  bidUnit: string;
  quantityStatus: HeliosEstimateQuantityStatus;
  confidence: number;
  reviewStatus: HeliosEstimateReviewStatus;
  evidenceIds: string[];
  costCodes: HeliosEstimateCostCode[];
  directCostCents?: number;
  derivedUnitCostCents?: number;
};

export type HeliosEstimateSection = {
  id: string;
  name: string;
  sequence: number;
  reviewStatus: HeliosEstimateReviewStatus;
  evidenceIds: string[];
  payItems: HeliosOwnerPayItem[];
};

export type HeliosEstimateRisk = {
  id: string;
  title: string;
  detail: string;
  probabilityPercent: number;
  lowCostCents?: number;
  mostLikelyCostCents?: number;
  highCostCents?: number;
  scheduleDays?: number;
  mitigation: string;
  owner: string;
  disposition: "open" | "mitigated" | "accepted" | "transferred";
  confidence: number;
  reviewStatus: HeliosEstimateReviewStatus;
  evidenceIds: string[];
};

export type HeliosEstimateWorkspace = {
  id: string;
  projectId: string;
  version: number;
  schemaVersion: number;
  status: HeliosEstimateStatus;
  sourceIntelligenceId: string;
  sourcePackageRevision?: number;
  model?: string;
  error?: string;
  overheadBasisPoints: number;
  profitBasisPoints: number;
  bondBasisPoints: number;
  taxProfileStatus: "not_configured" | "configured";
  sections: HeliosEstimateSection[];
  risks: HeliosEstimateRisk[];
  evidence: HeliosEvidence[];
  createdAt: number;
  updatedAt: number;
};

export type HeliosEstimateProposalResourceInput = Omit<
  HeliosEstimateResource,
  "id" | "directCostCents"
>;

export type HeliosEstimateProposalCostCodeInput = Omit<
  HeliosEstimateCostCode,
  "id" | "resources" | "directCostCents" | "reviewStatus"
> & { resources: HeliosEstimateProposalResourceInput[] };

export type HeliosEstimateProposalPayItemInput = Omit<
  HeliosOwnerPayItem,
  | "id"
  | "costCodes"
  | "directCostCents"
  | "derivedUnitCostCents"
  | "reviewStatus"
> & { costCodes: HeliosEstimateProposalCostCodeInput[] };

export type HeliosEstimateProposalSectionInput = Omit<
  HeliosEstimateSection,
  "id" | "payItems" | "reviewStatus"
> & { key: string; payItems: HeliosEstimateProposalPayItemInput[] };

export type HeliosEstimateProposalRiskInput = Omit<
  HeliosEstimateRisk,
  | "id"
  | "lowCostCents"
  | "mostLikelyCostCents"
  | "highCostCents"
  | "reviewStatus"
>;

export type HeliosEstimateProposalInput = {
  sections: HeliosEstimateProposalSectionInput[];
  risks: HeliosEstimateProposalRiskInput[];
};

export type HeliosEstimateAllocation = {
  allocationType: "quantity" | "percent" | "amount";
  quantity?: number;
  percentBasisPoints?: number;
  amountCents?: number;
};

export type HeliosEstimateTotals = {
  directCostCents: number;
  overheadCents: number;
  profitCents: number;
  bondCents: number;
  grandTotalCents: number;
};

export class HeliosValidationError extends Error {
  readonly field?: keyof HeliosProjectInput | "file";

  constructor(
    message: string,
    field?: keyof HeliosProjectInput | "file",
  ) {
    super(message);
    this.name = "HeliosValidationError";
    this.field = field;
  }
}

function optionalText(
  value: unknown,
  field: keyof HeliosProjectInput,
  maxLength: number,
) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new HeliosValidationError("Enter valid text.", field);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new HeliosValidationError(
      `Keep this field under ${maxLength} characters.`,
      field,
    );
  }
  return normalized;
}

export function normalizeProjectInput(value: unknown): HeliosProjectInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HeliosValidationError("Enter valid project information.");
  }

  const input = value as Record<string, unknown>;
  const name = optionalText(input.name, "name", 160);
  if (!name) {
    throw new HeliosValidationError("Project name is required.", "name");
  }

  let bidDate: string | undefined;
  if (input.bidDate !== undefined && input.bidDate !== "") {
    if (
      typeof input.bidDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.bidDate)
    ) {
      throw new HeliosValidationError(
        "Enter a valid bid date.",
        "bidDate",
      );
    }
    const parsed = new Date(`${input.bidDate}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== input.bidDate
    ) {
      throw new HeliosValidationError(
        "Enter a valid bid date.",
        "bidDate",
      );
    }
    bidDate = input.bidDate;
  }

  return {
    name,
    projectNumber: optionalText(input.projectNumber, "projectNumber", 80),
    ownerClient: optionalText(input.ownerClient, "ownerClient", 160),
    engineer: optionalText(input.engineer, "engineer", 160),
    bidDate,
    location: optionalText(input.location, "location", 240),
    notes: optionalText(input.notes, "notes", 4000),
  };
}

export function canonicalPdfFileName(value: string) {
  const leafName = value.split(/[\\/]/).pop()?.trim() || "";
  return leafName.normalize("NFKC").toLowerCase();
}

export function normalizePackagePath(value: unknown) {
  if (typeof value !== "string") {
    throw new HeliosValidationError("Package paths must be text.", "file");
  }
  const normalized = value
    .normalize("NFKC")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .trim();
  if (
    !normalized ||
    normalized.length > HELIOS_MAX_PACKAGE_PATH_LENGTH ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:\//.test(normalized)
  ) {
    throw new HeliosValidationError("The package contains an invalid path.", "file");
  }
  const segments = normalized.split("/");
  if (
    segments.length > HELIOS_MAX_PACKAGE_DEPTH ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        /[\u0000-\u001f\u007f]/.test(segment),
    )
  ) {
    throw new HeliosValidationError("The package contains an unsafe path.", "file");
  }
  return segments.join("/");
}

export function normalizePackageInput(value: unknown): HeliosPackageInput {
  const input = record(value, "Bid package");
  const name = textValue(input.name, "Package name", 160);
  if (
    typeof input.sourceType !== "string" ||
    !HELIOS_PACKAGE_SOURCE_TYPES.includes(
      input.sourceType as HeliosPackageSourceType,
    )
  ) {
    throw new HeliosValidationError("Package source is invalid.");
  }
  if (
    !Array.isArray(input.entries) ||
    input.entries.length === 0 ||
    input.entries.length > HELIOS_MAX_PACKAGE_ENTRIES
  ) {
    throw new HeliosValidationError(
      `A package must contain 1-${HELIOS_MAX_PACKAGE_ENTRIES} entries.`,
    );
  }
  let acceptedCount = 0;
  let acceptedBytes = 0;
  const paths = new Set<string>();
  const entries = input.entries.map((value, index) => {
    const row = record(value, `Package entry ${index + 1}`);
    const relativePath = normalizePackagePath(row.relativePath);
    const canonicalPath = relativePath.toLowerCase();
    if (paths.has(canonicalPath)) {
      throw new HeliosValidationError(
        `The package contains the same path more than once: ${relativePath}`,
      );
    }
    paths.add(canonicalPath);
    if (
      typeof row.size !== "number" ||
      !Number.isSafeInteger(row.size) ||
      row.size < 0
    ) {
      throw new HeliosValidationError("Package entry size is invalid.");
    }
    if (typeof row.accepted !== "boolean") {
      throw new HeliosValidationError("Package entry status is invalid.");
    }
    if (row.accepted) {
      validatePdfCandidate({
        name: relativePath,
        type: "application/pdf",
        size: row.size,
      });
      acceptedCount += 1;
      acceptedBytes += row.size;
    }
    return {
      relativePath,
      size: row.size,
      accepted: row.accepted,
      reason: row.accepted
        ? undefined
        : textValue(
            row.reason || "Unsupported file type.",
            "Rejection reason",
            240,
          ),
    };
  });
  if (!acceptedCount || acceptedCount > HELIOS_MAX_UPLOAD_BATCH) {
    throw new HeliosValidationError(
      `A package must contain 1-${HELIOS_MAX_UPLOAD_BATCH} valid PDFs.`,
    );
  }
  if (acceptedBytes > HELIOS_MAX_PACKAGE_BYTES) {
    throw new HeliosValidationError("The PDF package is too large.");
  }
  return {
    name,
    sourceType: input.sourceType as HeliosPackageSourceType,
    entries,
  };
}

export function normalizeFindingReviewInput(
  value: unknown,
): HeliosFindingReviewInput {
  const input = record(value, "Finding review");
  if (
    typeof input.action !== "string" ||
    !HELIOS_FINDING_REVIEW_ACTIONS.includes(
      input.action as HeliosFindingReviewAction,
    )
  ) {
    throw new HeliosValidationError("Finding review action is invalid.");
  }
  const action = input.action as HeliosFindingReviewAction;
  const optionalReviewText = (
    candidate: unknown,
    label: string,
    maximum: number,
  ) => {
    if (candidate === undefined || candidate === null || candidate === "") {
      return undefined;
    }
    return textValue(candidate, label, maximum);
  };
  const comment = optionalReviewText(input.comment, "Review note", 2000);
  if (
    ["reject", "request_reanalysis", "supersede"].includes(action) &&
    !comment
  ) {
    throw new HeliosValidationError(
      "A review note is required for this action.",
    );
  }
  if (action === "correct") {
    return {
      action,
      correctedTitle: textValue(
        input.correctedTitle,
        "Corrected finding title",
        240,
      ),
      correctedDetail: textValue(
        input.correctedDetail,
        "Corrected finding detail",
        2400,
      ),
      trade: optionalReviewText(input.trade, "Trade", 120),
      comment,
    };
  }
  return {
    action,
    trade: optionalReviewText(input.trade, "Trade", 120),
    comment,
  };
}

export function validatePdfCandidate(file: {
  name: string;
  type?: string;
  size: number;
}) {
  const canonicalName = canonicalPdfFileName(file.name);
  if (!canonicalName || !canonicalName.endsWith(".pdf")) {
    throw new HeliosValidationError("Only PDF files can be uploaded.", "file");
  }
  if (
    file.type &&
    file.type.toLowerCase() !== "application/pdf"
  ) {
    throw new HeliosValidationError(
      "The selected file is not identified as a PDF.",
      "file",
    );
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new HeliosValidationError("The selected PDF is empty.", "file");
  }
  if (file.size > HELIOS_MAX_PDF_BYTES) {
    throw new HeliosValidationError(
      "PDFs must be 50 MB or smaller.",
      "file",
    );
  }
  return canonicalName;
}

export function hasPdfMagicBytes(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UnknownRecord = Record<string, unknown>;

export type HeliosDocumentEvidenceInput = {
  key: string;
  pageNumber?: number;
  locator: string;
  excerpt: string;
};

export type HeliosDocumentFindingInput = Omit<
  HeliosIntelligenceFinding,
  "id" | "evidenceIds" | "review"
> & {
  evidenceKeys: string[];
};

export type HeliosDocumentIntelligenceInput = {
  documentType: string;
  summary: string;
  summaryEvidenceKeys: string[];
  confidence: number;
  evidence: HeliosDocumentEvidenceInput[];
  findings: HeliosDocumentFindingInput[];
};

export type HeliosProjectSynthesisInput = {
  summary: string;
  summaryEvidenceIds: string[];
  projectType: HeliosEvidenceBackedValue;
  fundingSource: HeliosEvidenceBackedValue;
  confidence: number;
  findings: Omit<HeliosIntelligenceFinding, "id" | "review">[];
};

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HeliosValidationError(`${label} must be an object.`);
  }
  return value as UnknownRecord;
}

function textValue(
  value: unknown,
  label: string,
  maximum: number,
  allowEmpty = false,
) {
  if (typeof value !== "string") {
    throw new HeliosValidationError(`${label} must be text.`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!allowEmpty && !normalized) {
    throw new HeliosValidationError(`${label} is required.`);
  }
  if (normalized.length > maximum) {
    throw new HeliosValidationError(`${label} is too long.`);
  }
  return normalized;
}

function confidenceValue(value: unknown, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new HeliosValidationError(`${label} must be between 0 and 100.`);
  }
  return Math.round(value);
}

function stringArray(
  value: unknown,
  label: string,
  maximumItems = 40,
) {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new HeliosValidationError(`${label} must be a bounded list.`);
  }
  return [...new Set(value.map((item) => textValue(item, label, 128)))];
}

function categoryValue(value: unknown): HeliosIntelligenceCategory {
  if (
    typeof value !== "string" ||
    !HELIOS_INTELLIGENCE_CATEGORIES.includes(
      value as HeliosIntelligenceCategory,
    )
  ) {
    throw new HeliosValidationError("Finding category is invalid.");
  }
  return value as HeliosIntelligenceCategory;
}

function severityValue(value: unknown): HeliosFindingSeverity {
  if (
    typeof value !== "string" ||
    !HELIOS_FINDING_SEVERITIES.includes(value as HeliosFindingSeverity)
  ) {
    throw new HeliosValidationError("Finding severity is invalid.");
  }
  return value as HeliosFindingSeverity;
}

export function parseDocumentIntelligence(
  value: unknown,
): HeliosDocumentIntelligenceInput {
  const input = record(value, "Document intelligence");
  if (!Array.isArray(input.evidence) || input.evidence.length > 250) {
    throw new HeliosValidationError("Evidence must be a bounded list.");
  }
  const evidence = input.evidence.map((item, index) => {
    const row = record(item, `Evidence ${index + 1}`);
    const rawPage = row.pageNumber;
    const pageNumber =
      rawPage === null
        ? undefined
        : typeof rawPage === "number" &&
            Number.isInteger(rawPage) &&
            rawPage > 0 &&
            rawPage <= 100_000
          ? rawPage
          : (() => {
              throw new HeliosValidationError(
                `Evidence ${index + 1} page is invalid.`,
              );
            })();
    return {
      key: textValue(row.key, `Evidence ${index + 1} key`, 128),
      pageNumber,
      locator: textValue(
        row.locator,
        `Evidence ${index + 1} locator`,
        240,
        true,
      ),
      excerpt: textValue(row.excerpt, `Evidence ${index + 1} excerpt`, 800),
    };
  });
  const evidenceKeys = new Set(evidence.map((item) => item.key));
  if (evidenceKeys.size !== evidence.length) {
    throw new HeliosValidationError("Evidence keys must be unique.");
  }

  if (!Array.isArray(input.findings) || input.findings.length > 200) {
    throw new HeliosValidationError("Findings must be a bounded list.");
  }
  const findings = input.findings.map((item, index) => {
    const row = record(item, `Finding ${index + 1}`);
    const citedKeys = stringArray(
      row.evidenceKeys,
      `Finding ${index + 1} evidence`,
    );
    if (!citedKeys.length || citedKeys.some((key) => !evidenceKeys.has(key))) {
      throw new HeliosValidationError(
        `Finding ${index + 1} must cite valid document evidence.`,
      );
    }
    return {
      category: categoryValue(row.category),
      title: textValue(row.title, `Finding ${index + 1} title`, 240),
      detail: textValue(row.detail, `Finding ${index + 1} detail`, 2400),
      confidence: confidenceValue(
        row.confidence,
        `Finding ${index + 1} confidence`,
      ),
      severity: severityValue(row.severity),
      evidenceKeys: citedKeys,
    };
  });
  const summaryEvidenceKeys = stringArray(
    input.summaryEvidenceKeys,
    "Summary evidence",
  );
  if (
    !summaryEvidenceKeys.length ||
    summaryEvidenceKeys.some((key) => !evidenceKeys.has(key))
  ) {
    throw new HeliosValidationError(
      "The document summary must cite valid evidence.",
    );
  }

  return {
    documentType: textValue(input.documentType, "Document type", 160),
    summary: textValue(input.summary, "Document summary", 2400),
    summaryEvidenceKeys,
    confidence: confidenceValue(input.confidence, "Document confidence"),
    evidence,
    findings,
  };
}

function evidenceBackedValue(
  value: unknown,
  label: string,
  validEvidenceIds: Set<string>,
): HeliosEvidenceBackedValue {
  const input = record(value, label);
  const evidenceIds = stringArray(input.evidenceIds, `${label} evidence`);
  const text = textValue(input.value, label, 240, true);
  if (
    text &&
    (!evidenceIds.length ||
      evidenceIds.some((id) => !validEvidenceIds.has(id)))
  ) {
    throw new HeliosValidationError(`${label} must cite valid evidence.`);
  }
  return {
    value: text,
    confidence: confidenceValue(input.confidence, `${label} confidence`),
    evidenceIds,
  };
}

export function parseProjectSynthesis(
  value: unknown,
  validEvidence: Iterable<string>,
): HeliosProjectSynthesisInput {
  const input = record(value, "Project synthesis");
  const validEvidenceIds = new Set(validEvidence);
  const summaryEvidenceIds = stringArray(
    input.summaryEvidenceIds,
    "Summary evidence",
  );
  if (
    !summaryEvidenceIds.length ||
    summaryEvidenceIds.some((id) => !validEvidenceIds.has(id))
  ) {
    throw new HeliosValidationError(
      "The project summary must cite valid evidence.",
    );
  }
  if (!Array.isArray(input.findings) || input.findings.length > 300) {
    throw new HeliosValidationError("Project findings must be a bounded list.");
  }
  const findings = input.findings.map((item, index) => {
    const row = record(item, `Project finding ${index + 1}`);
    const evidenceIds = stringArray(
      row.evidenceIds,
      `Project finding ${index + 1} evidence`,
    );
    if (
      !evidenceIds.length ||
      evidenceIds.some((id) => !validEvidenceIds.has(id))
    ) {
      throw new HeliosValidationError(
        `Project finding ${index + 1} must cite valid evidence.`,
      );
    }
    return {
      category: categoryValue(row.category),
      title: textValue(row.title, `Project finding ${index + 1} title`, 240),
      detail: textValue(
        row.detail,
        `Project finding ${index + 1} detail`,
        2400,
      ),
      confidence: confidenceValue(
        row.confidence,
        `Project finding ${index + 1} confidence`,
      ),
      severity: severityValue(row.severity),
      evidenceIds,
    };
  });
  return {
    summary: textValue(input.summary, "Project summary", 4000),
    summaryEvidenceIds,
    projectType: evidenceBackedValue(
      input.projectType,
      "Project type",
      validEvidenceIds,
    ),
    fundingSource: evidenceBackedValue(
      input.fundingSource,
      "Funding source",
      validEvidenceIds,
    ),
    confidence: confidenceValue(input.confidence, "Project confidence"),
    findings,
  };
}

function finiteNonNegative(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HeliosValidationError(`${label} must be a non-negative number.`);
  }
  return value;
}

function optionalPositiveQuantity(value: unknown, label: string) {
  if (value === null || value === undefined) return undefined;
  const quantity = finiteNonNegative(value, label);
  if (quantity === 0) {
    throw new HeliosValidationError(`${label} must be greater than zero when known.`);
  }
  return quantity;
}

function allowedValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new HeliosValidationError(`${label} is invalid.`);
  }
  return value as T[number];
}

function citedEvidence(
  value: unknown,
  label: string,
  validEvidenceIds: Set<string>,
) {
  const evidenceIds = stringArray(value, label, 80);
  if (!evidenceIds.length || evidenceIds.some((id) => !validEvidenceIds.has(id))) {
    throw new HeliosValidationError(`${label} must cite valid project evidence.`);
  }
  return evidenceIds;
}

/** Parse the untrusted model proposal. Prices are deliberately forbidden. */
export function parseEstimateProposal(
  value: unknown,
  validEvidence: Iterable<string>,
): HeliosEstimateProposalInput {
  const input = record(value, "Estimate proposal");
  const validEvidenceIds = new Set(validEvidence);
  if (!Array.isArray(input.sections) || !input.sections.length || input.sections.length > 80) {
    throw new HeliosValidationError("Estimate sections must be a bounded, non-empty list.");
  }
  const sectionKeys = new Set<string>();
  const ownerItemNumbers = new Set<string>();
  const sections = input.sections.map((sectionValue, sectionIndex) => {
    const section = record(sectionValue, `Estimate section ${sectionIndex + 1}`);
    const key = textValue(section.key, `Estimate section ${sectionIndex + 1} key`, 80);
    if (sectionKeys.has(key)) throw new HeliosValidationError("Estimate section keys must be unique.");
    sectionKeys.add(key);
    if (!Array.isArray(section.payItems) || !section.payItems.length || section.payItems.length > 250) {
      throw new HeliosValidationError(`Estimate section ${sectionIndex + 1} must contain pay items.`);
    }
    const payItems = section.payItems.map((itemValue, itemIndex) => {
      const item = record(itemValue, `Pay item ${itemIndex + 1}`);
      const officialItemNumber = textValue(item.officialItemNumber, "Official item number", 80);
      if (ownerItemNumbers.has(officialItemNumber)) {
        throw new HeliosValidationError(`Owner item ${officialItemNumber} is duplicated.`);
      }
      ownerItemNumbers.add(officialItemNumber);
      const quantityStatus = allowedValue(
        item.quantityStatus,
        HELIOS_ESTIMATE_QUANTITY_STATUSES,
        "Bid quantity status",
      );
      const bidQuantity = optionalPositiveQuantity(item.bidQuantity, "Bid quantity");
      if (quantityStatus === "takeoff_required" && bidQuantity !== undefined) {
        throw new HeliosValidationError("Takeoff-required items cannot contain a confirmed bid quantity.");
      }
      if (quantityStatus === "owner_provided" && bidQuantity === undefined) {
        throw new HeliosValidationError("Owner-provided quantities require a bid quantity.");
      }
      if (!Array.isArray(item.costCodes) || !item.costCodes.length || item.costCodes.length > 80) {
        throw new HeliosValidationError(`Owner item ${officialItemNumber} must contain cost codes.`);
      }
      const costCodeNames = new Set<string>();
      const costCodes = item.costCodes.map((codeValue, codeIndex) => {
        const code = record(codeValue, `Cost code ${codeIndex + 1}`);
        const codeName = textValue(code.code, "Cost code", 80);
        if (costCodeNames.has(codeName)) {
          throw new HeliosValidationError(`Cost code ${codeName} is duplicated within ${officialItemNumber}.`);
        }
        costCodeNames.add(codeName);
        if (!Array.isArray(code.resources) || code.resources.length > 100) {
          throw new HeliosValidationError(`Cost code ${codeName} resources are invalid.`);
        }
        const resources = code.resources.map((resourceValue, resourceIndex) => {
          const resource = record(resourceValue, `Resource ${resourceIndex + 1}`);
          if (resource.rateCents !== null && resource.rateCents !== undefined) {
            throw new HeliosValidationError("AI estimate proposals cannot contain prices.");
          }
          const rateStatus = allowedValue(resource.rateStatus, HELIOS_ESTIMATE_RATE_STATUSES, "Rate status");
          if (rateStatus !== "unpriced") {
            throw new HeliosValidationError("AI estimate proposal resources must remain unpriced.");
          }
          return {
            resourceClass: allowedValue(
              resource.resourceClass,
              HELIOS_ESTIMATE_RESOURCE_CLASSES,
              "Resource class",
            ),
            description: textValue(resource.description, "Resource description", 240),
            quantity: optionalPositiveQuantity(resource.quantity, "Resource quantity"),
            unit: textValue(resource.unit, "Resource unit", 40),
            rateCents: undefined,
            rateStatus,
            taxStatus: allowedValue(
              resource.taxStatus,
              ["taxable", "exempt", "unknown"] as const,
              "Tax status",
            ),
          };
        });
        return {
          code: codeName,
          description: textValue(code.description, "Cost code description", 240),
          scopeOwnership: allowedValue(
            code.scopeOwnership,
            HELIOS_ESTIMATE_SCOPE_OWNERSHIP,
            "Scope ownership",
          ),
          productionQuantity: optionalPositiveQuantity(
            code.productionQuantity,
            "Production quantity",
          ),
          productionUnit: textValue(code.productionUnit, "Production unit", 40),
          confidence: confidenceValue(code.confidence, "Cost code confidence"),
          evidenceIds: citedEvidence(code.evidenceIds, "Cost code evidence", validEvidenceIds),
          resources,
        };
      });
      return {
        officialItemNumber,
        description: textValue(item.description, "Owner item description", 400),
        bidQuantity,
        bidUnit: textValue(item.bidUnit, "Bid unit", 40),
        quantityStatus,
        confidence: confidenceValue(item.confidence, "Owner item confidence"),
        evidenceIds: citedEvidence(item.evidenceIds, "Owner item evidence", validEvidenceIds),
        costCodes,
      };
    });
    return {
      key,
      name: textValue(section.name, "Estimate section name", 160),
      sequence: Math.round(finiteNonNegative(section.sequence, "Estimate section sequence")),
      evidenceIds: citedEvidence(section.evidenceIds, "Estimate section evidence", validEvidenceIds),
      payItems,
    };
  });

  if (!Array.isArray(input.risks) || input.risks.length > 150) {
    throw new HeliosValidationError("Estimate risks must be a bounded list.");
  }
  const risks = input.risks.map((riskValue, riskIndex) => {
    const risk = record(riskValue, `Estimate risk ${riskIndex + 1}`);
    return {
      title: textValue(risk.title, "Risk title", 240),
      detail: textValue(risk.detail, "Risk detail", 1600),
      probabilityPercent: confidenceValue(risk.probabilityPercent, "Risk probability"),
      scheduleDays: risk.scheduleDays === null || risk.scheduleDays === undefined
        ? undefined
        : finiteNonNegative(risk.scheduleDays, "Risk schedule exposure"),
      mitigation: textValue(risk.mitigation, "Risk mitigation", 800),
      owner: textValue(risk.owner, "Risk owner", 160),
      disposition: allowedValue(
        risk.disposition,
        ["open", "mitigated", "accepted", "transferred"] as const,
        "Risk disposition",
      ),
      confidence: confidenceValue(risk.confidence, "Risk confidence"),
      evidenceIds: citedEvidence(risk.evidenceIds, "Risk evidence", validEvidenceIds),
    };
  });
  return { sections, risks };
}

function safeCents(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HeliosValidationError(`${label} must be a non-negative integer number of cents.`);
  }
  return value;
}

export function calculateResourceCost(resource: Pick<HeliosEstimateResource, "quantity" | "rateCents">) {
  if (resource.quantity === undefined || resource.rateCents === undefined) return undefined;
  safeCents(resource.rateCents, "Resource rate");
  const total = Math.round(resource.quantity * resource.rateCents);
  if (!Number.isSafeInteger(total)) throw new HeliosValidationError("Resource cost exceeds the supported range.");
  return total;
}

export function calculateCostCodeDirectCost(resources: Array<Pick<HeliosEstimateResource, "quantity" | "rateCents">>) {
  let total = 0;
  for (const resource of resources) {
    const cost = calculateResourceCost(resource);
    if (cost === undefined) return undefined;
    total = safeCents(total + cost, "Cost code total");
  }
  return total;
}

export function calculateDerivedUnitCost(directCostCents: number | undefined, bidQuantity: number | undefined) {
  if (directCostCents === undefined || bidQuantity === undefined || bidQuantity <= 0) return undefined;
  return Math.round(safeCents(directCostCents, "Direct cost") / bidQuantity);
}

export function calculateAllocationBalance(allocations: HeliosEstimateAllocation[]) {
  return allocations.reduce(
    (totals, allocation) => ({
      quantity: totals.quantity + (allocation.quantity || 0),
      percentBasisPoints: totals.percentBasisPoints + (allocation.percentBasisPoints || 0),
      amountCents: totals.amountCents + (allocation.amountCents || 0),
    }),
    { quantity: 0, percentBasisPoints: 0, amountCents: 0 },
  );
}

export function calculateEstimateTotals(input: {
  directCostCents: number;
  overheadBasisPoints: number;
  profitBasisPoints: number;
  bondBasisPoints: number;
}): HeliosEstimateTotals {
  const directCostCents = safeCents(input.directCostCents, "Estimate direct cost");
  const markup = (basisPoints: number, label: string) => {
    if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 100_000) {
      throw new HeliosValidationError(`${label} basis points are invalid.`);
    }
    return Math.round((directCostCents * basisPoints) / 10_000);
  };
  const overheadCents = markup(input.overheadBasisPoints, "Overhead");
  const profitCents = markup(input.profitBasisPoints, "Profit");
  const bondCents = markup(input.bondBasisPoints, "Bond");
  return {
    directCostCents,
    overheadCents,
    profitCents,
    bondCents,
    grandTotalCents: safeCents(
      directCostCents + overheadCents + profitCents + bondCents,
      "Estimate grand total",
    ),
  };
}
