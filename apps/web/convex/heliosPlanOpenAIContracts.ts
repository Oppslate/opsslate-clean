import {
  HELIOS_PLAN_CALIBRATION_SOURCES,
  HELIOS_PLAN_MODALITIES,
  HELIOS_PLAN_PAGE_KINDS,
  HELIOS_PLAN_REFERENCE_TYPES,
  HELIOS_PLAN_VIEW_TYPES,
} from "@opsslate/helios-domain";

const boundarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y", "width", "height"],
  properties: {
    x: { type: "number", minimum: 0, maximum: 1 },
    y: { type: "number", minimum: 0, maximum: 1 },
    width: { type: "number", exclusiveMinimum: 0, maximum: 1 },
    height: { type: "number", exclusiveMinimum: 0, maximum: 1 },
  },
} as const;

const scaleCandidateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["source", "scale", "units", "sourceRegion", "confidence"],
  properties: {
    source: { type: "string", enum: HELIOS_PLAN_CALIBRATION_SOURCES },
    scale: { type: "string", minLength: 1, maxLength: 120 },
    units: { type: "string", maxLength: 80 },
    sourceRegion: { type: "string", maxLength: 240 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
} as const;

const viewSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "viewKey", "viewType", "label", "boundary", "northOrientation",
    "measurable", "scaleCandidates", "unresolvedIssues",
  ],
  properties: {
    viewKey: { type: "string", minLength: 1, maxLength: 120 },
    viewType: { type: "string", enum: HELIOS_PLAN_VIEW_TYPES },
    label: { type: "string", minLength: 1, maxLength: 240 },
    boundary: boundarySchema,
    northOrientation: { type: "string", maxLength: 120 },
    measurable: { type: "boolean" },
    scaleCandidates: { type: "array", maxItems: 10, items: scaleCandidateSchema },
    unresolvedIssues: { type: "array", maxItems: 40, items: { type: "string", maxLength: 500 } },
  },
} as const;

const pageSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "physicalPageNumber", "pageKind", "printedPageNumber", "sheetNumber",
    "title", "discipline", "subdiscipline", "issueDate", "revisionMarker",
    "addendumAssociation", "modality", "titleBlockBoundary", "titleBlockText",
    "confidence", "unresolvedIssues", "views",
  ],
  properties: {
    physicalPageNumber: { type: "integer", minimum: 1, maximum: 2000 },
    pageKind: { type: "string", enum: HELIOS_PLAN_PAGE_KINDS },
    printedPageNumber: { type: "string", maxLength: 120 },
    sheetNumber: { type: "string", maxLength: 120 },
    title: { type: "string", maxLength: 300 },
    discipline: { type: "string", maxLength: 160 },
    subdiscipline: { type: "string", maxLength: 160 },
    issueDate: { type: "string", maxLength: 80 },
    revisionMarker: { type: "string", maxLength: 120 },
    addendumAssociation: { type: "string", maxLength: 160 },
    modality: { type: "string", enum: HELIOS_PLAN_MODALITIES },
    titleBlockBoundary: { anyOf: [boundarySchema, { type: "null" }] },
    titleBlockText: { type: "string", maxLength: 1200 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    unresolvedIssues: { type: "array", maxItems: 40, items: { type: "string", maxLength: 500 } },
    views: { type: "array", maxItems: 80, items: viewSchema },
  },
} as const;

const referenceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sourcePageNumber", "sourceSheetNumber", "sourceViewKey", "referenceType",
    "label", "targetSheetNumber", "targetDetail", "targetSpecification",
    "locator", "confidence",
  ],
  properties: {
    sourcePageNumber: { type: "integer", minimum: 1, maximum: 2000 },
    sourceSheetNumber: { type: "string", maxLength: 120 },
    sourceViewKey: { type: "string", maxLength: 120 },
    referenceType: { type: "string", enum: HELIOS_PLAN_REFERENCE_TYPES },
    label: { type: "string", maxLength: 300 },
    targetSheetNumber: { type: "string", maxLength: 120 },
    targetDetail: { type: "string", maxLength: 160 },
    targetSpecification: { type: "string", maxLength: 160 },
    locator: { type: "string", maxLength: 300 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
} as const;

export const heliosPlanDocumentFormat = {
  type: "json_schema" as const,
  name: "helios_plan_document_intelligence",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["sourcePageCount", "documentSummary", "pages", "references"],
    properties: {
      sourcePageCount: { type: "integer", minimum: 1, maximum: 2000 },
      documentSummary: { type: "string", minLength: 1, maxLength: 2400 },
      pages: { type: "array", minItems: 1, maxItems: 2000, items: pageSchema },
      references: { type: "array", maxItems: 5000, items: referenceSchema },
    },
  },
};

export const HELIOS_PLAN_DOCUMENT_PROMPT = `
You are Helios Plan Intelligence for a heavy-highway general contractor. Read
the complete attached PDF as a coordinated construction plan artifact. Handle
vector drawings, scanned sheets, and hybrid pages with OCR and visual
reasoning. Do not alter the source PDF and do not calculate bid quantities.

Inventory rules:
- sourcePageCount is the physical PDF page count you observe.
- Return exactly one page record for every physical PDF page, in order.
- pageKind is sheet for a construction sheet, non_sheet for a cover letter,
  transmittal, blank separator, or other intentional non-sheet, and exception
  only when the page is unreadable, corrupt, blank without context, or cannot
  be classified.
- Use the 1-based physical PDF page number separately from printed page and
  sheet numbers.
- Capture title-block metadata, revision/addendum marks, discipline, issue
  status, and explicit unresolved issues. Never infer a missing value; use an
  empty string.

View and scale rules:
- Identify bounded plan, profile, section, detail, schedule, legend, note,
  calculation, title-block, and other regions using normalized page
  coordinates from 0 to 1.
- A scale belongs to its individual view. Never apply a page-level scale.
- Mark a view measurable only when it depicts geometry that could support a
  takeoff after calibration.
- Capture every stated numeric or graphic scale as a candidate. Preserve its
  source region and confidence. Do not approve a scale.
- If scale signals conflict, record the conflict in unresolvedIssues.
- A measurable view with no reliable scale remains measurable but must explain
  the missing calibration in unresolvedIssues.

Relationship rules:
- Capture detail, section, match-line, continuation, plan/profile, key-map,
  schedule, specification, and standard-detail references.
- Preserve unresolved references; do not silently invent target sheets.
- Use concise visible labels and locators that an estimator can verify.

Every confidence is an integer from 0 to 100. Return only the strict structured
result. Do not estimate price, quantity, productivity, or means and methods.
`.trim();

export const HELIOS_CANONICAL_PLAN_BATCH_PROMPT = `
You are Helios Plan Intelligence for a heavy-highway general contractor. The
input contains a pinned batch of canonical engineering pages produced during
the project's single ingestion. Each page is supplied as canonical extracted
text followed by its immutable rendered-page image. Do not request, reopen, or
infer content from the original PDF. Do not calculate bid quantities.

Batch identity rules:
- sourcePageCount is the number of canonical pages in this batch.
- Return exactly one page record for every supplied batch page, in order.
- physicalPageNumber MUST use the 1-based BATCH PAGE number shown in the input,
  not the original PDF page number. Helios remaps it to the immutable source
  locator after validation.
- Use the canonical text as a reading aid and the rendered image as the visual
  authority. If they conflict, preserve the conflict in unresolvedIssues.
- Never merge pages, omit a page, or create a page that was not supplied.

Classification, view, scale, relationship, and confidence rules are identical
to the full-document Plan Intelligence contract:
- pageKind is sheet for a construction sheet, non_sheet for intentional
  non-drawing material, and exception only when the supplied canonical page
  cannot be classified.
- Capture title-block metadata, printed page and sheet numbers, issue status,
  discipline, revision/addendum marks, and explicit unresolved issues. Use an
  empty string for a missing value.
- Identify bounded plan, profile, section, detail, schedule, legend, note,
  calculation, title-block, and other regions with normalized coordinates.
- Keep scale candidates on their individual view. Never approve a scale.
- Capture detail, section, match-line, continuation, plan/profile, key-map,
  schedule, specification, and standard-detail references.
- Preserve unresolved references and never invent target sheets.
- Every confidence is an integer from 0 to 100.

Return only the strict structured result. Do not estimate price, quantity,
productivity, or means and methods.
`.trim();
