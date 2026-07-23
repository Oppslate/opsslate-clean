export const HELIOS_MAX_PDF_BYTES = 250 * 1024 * 1024;
export const HELIOS_MAX_UPLOAD_BATCH = 20;
export const HELIOS_UPLOAD_INTENT_LIFETIME_MS = 60 * 60 * 1000;

export const HELIOS_PROJECT_STATUSES = [
  "draft",
  "intake",
  "documents_ready",
  "archived",
] as const;

export const HELIOS_INTELLIGENCE_STATUSES = [
  "awaiting_documents",
  "ready_for_intelligence",
] as const;

export const HELIOS_DOCUMENT_STATUSES = [
  "ready_for_intelligence",
  "failed",
  "superseded",
] as const;

export type HeliosProjectStatus = (typeof HELIOS_PROJECT_STATUSES)[number];
export type HeliosIntelligenceStatus =
  (typeof HELIOS_INTELLIGENCE_STATUSES)[number];
export type HeliosDocumentStatus = (typeof HELIOS_DOCUMENT_STATUSES)[number];

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
  createdAt: number;
  updatedAt: number;
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
      "PDFs must be 250 MB or smaller.",
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
