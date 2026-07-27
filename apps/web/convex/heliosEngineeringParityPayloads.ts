import {
  HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION,
  buildHeliosEngineeringParityFingerprint,
  buildHeliosEngineeringSourceFingerprint,
} from "@opsslate/helios-domain";

export const SHADOW_EXTRACTOR_VERSION = "legacy-shadow-v1";
export const SHADOW_PROMPT_VERSION = "legacy-authoritative-output-v1";
export const SOURCE_MODEL_VERSION = "immutable-source-v1";

const NON_SEMANTIC_FIELDS = new Set([
  "_creationTime",
  "createdAt",
  "updatedAt",
]);

export function fingerprintEngineeringRecord(record: Record<string, unknown>) {
  return buildHeliosEngineeringParityFingerprint(
    Object.fromEntries(
      Object.entries(record).filter(([key]) => !NON_SEMANTIC_FIELDS.has(key)),
    ),
  );
}

export function fingerprintPlanView(input: {
  pageId: string;
  physicalPageNumber: number;
  view: unknown;
}) {
  return buildHeliosEngineeringParityFingerprint(input);
}

export function fingerprintEngineeringSource(input: {
  sha256: string;
  packageRevision: number;
  sourceVersion: number;
}) {
  return buildHeliosEngineeringSourceFingerprint({
    ...input,
    ingestionSchemaVersion: HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION,
    extractorVersion: SHADOW_EXTRACTOR_VERSION,
    promptVersion: SHADOW_PROMPT_VERSION,
    modelVersion: SOURCE_MODEL_VERSION,
  });
}
