import {
  HELIOS_FINDING_SEVERITIES,
  HELIOS_INTELLIGENCE_CATEGORIES,
} from "@opsslate/helios-domain";

const evidenceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["key", "pageNumber", "locator", "excerpt"],
  properties: {
    key: { type: "string", minLength: 1, maxLength: 128 },
    pageNumber: {
      anyOf: [
        { type: "integer", minimum: 1, maximum: 100000 },
        { type: "null" },
      ],
    },
    locator: { type: "string", maxLength: 240 },
    excerpt: { type: "string", minLength: 1, maxLength: 800 },
  },
} as const;

const documentFindingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "category",
    "title",
    "detail",
    "confidence",
    "severity",
    "evidenceKeys",
  ],
  properties: {
    category: { type: "string", enum: HELIOS_INTELLIGENCE_CATEGORIES },
    title: { type: "string", minLength: 1, maxLength: 240 },
    detail: { type: "string", minLength: 1, maxLength: 2400 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    severity: { type: "string", enum: HELIOS_FINDING_SEVERITIES },
    evidenceKeys: {
      type: "array",
      minItems: 1,
      maxItems: 40,
      items: { type: "string", minLength: 1, maxLength: 128 },
    },
  },
} as const;

const evidenceBackedValueSchema = {
  type: "object",
  additionalProperties: false,
  required: ["value", "confidence", "evidenceIds"],
  properties: {
    value: { type: "string", maxLength: 240 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    evidenceIds: {
      type: "array",
      maxItems: 40,
      items: { type: "string", minLength: 1, maxLength: 128 },
    },
  },
} as const;

const projectFindingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "category",
    "title",
    "detail",
    "confidence",
    "severity",
    "evidenceIds",
  ],
  properties: {
    category: { type: "string", enum: HELIOS_INTELLIGENCE_CATEGORIES },
    title: { type: "string", minLength: 1, maxLength: 240 },
    detail: { type: "string", minLength: 1, maxLength: 2400 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    severity: { type: "string", enum: HELIOS_FINDING_SEVERITIES },
    evidenceIds: {
      type: "array",
      minItems: 1,
      maxItems: 40,
      items: { type: "string", minLength: 1, maxLength: 128 },
    },
  },
} as const;

export const heliosDocumentIntelligenceFormat = {
  type: "json_schema" as const,
  name: "helios_document_intelligence",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "documentType",
      "summary",
      "summaryEvidenceKeys",
      "confidence",
      "evidence",
      "findings",
    ],
    properties: {
      documentType: { type: "string", minLength: 1, maxLength: 160 },
      summary: { type: "string", minLength: 1, maxLength: 2400 },
      summaryEvidenceKeys: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: { type: "string", minLength: 1, maxLength: 128 },
      },
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      evidence: {
        type: "array",
        minItems: 1,
        maxItems: 250,
        items: evidenceSchema,
      },
      findings: {
        type: "array",
        maxItems: 200,
        items: documentFindingSchema,
      },
    },
  },
};

export const heliosProjectSynthesisFormat = {
  type: "json_schema" as const,
  name: "helios_project_intelligence",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "summary",
      "summaryEvidenceIds",
      "projectType",
      "fundingSource",
      "confidence",
      "findings",
    ],
    properties: {
      summary: { type: "string", minLength: 1, maxLength: 4000 },
      summaryEvidenceIds: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: { type: "string", minLength: 1, maxLength: 128 },
      },
      projectType: evidenceBackedValueSchema,
      fundingSource: evidenceBackedValueSchema,
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      findings: {
        type: "array",
        maxItems: 300,
        items: projectFindingSchema,
      },
    },
  },
};

export const HELIOS_DOCUMENT_PROMPT = `
You are Helios, the construction-intelligence reasoning engine for a heavy
highway general contractor. Read the entire PDF, including text, tables,
drawings, schedules, notes, forms, and addenda. This contractor commonly bids
New York public, institutional, industrial, water, wastewater, transportation,
utility, and municipal work.

Return only the required structured result. Do not estimate prices or invent
requirements. Distinguish explicit requirements from reasonable construction
interpretation through the confidence score. Capture requirements that affect
bid responsiveness, scope, schedule, procurement, risk, or subcontracting,
including bonds, insurance, prevailing wage, MWBE/DBE goals, permits, traffic
control, environmental controls, utility work, dewatering, temporary works,
liquidated damages, bid forms, alternates, allowances, unit prices, drawing
indexes, specification sections, and addenda.

Document-control rules:
- Classify the document by its construction purpose, such as plans,
  specifications, proposal, addendum, general conditions, wage schedule,
  geotechnical report, permit, bid form, or supporting reference.
- Identify issue status and watermarks including "Not For Bidding",
  "Preliminary", "Issued for Bid", revisions, and addendum references.
- Treat filename information as context only; base conclusions on document
  content and cited evidence.

Confidence rules:
- Every confidence score is an integer percentage from 0 to 100.
- Never return a decimal fraction between 0 and 1.
- Use 90-100 for explicit, unambiguous evidence; 70-89 for strong evidence
  requiring limited interpretation; 40-69 for partial or ambiguous evidence;
  and 0-39 when the source is weak, incomplete, or unreadable.

Evidence rules:
- Every finding must cite one or more evidence keys from the evidence array.
- The summary must cite evidence keys.
- Use the 1-based physical PDF page number, not a printed page label.
- Put printed sheet numbers, specification sections, bid-form labels, or
  schedule references in locator.
- Excerpts must be short, exact, and sufficient to verify the conclusion.
- Never create a finding from absence alone unless the document establishes
  that the missing item is required.
- If the PDF is unreadable or supplies little useful information, say so with
  low confidence and cite the evidence that supports that assessment.
`.trim();

export const HELIOS_SYNTHESIS_PROMPT = `
You are Helios, consolidating evidence-backed document intelligence into one
heavy-highway preconstruction record. Use only the supplied document analyses
and evidence. Reconcile relationships among plans, specifications, proposal
forms, addenda, schedules, and contract documents.

Return only the required structured result. Do not estimate costs. Do not
invent or silently resolve conflicts. Preserve conflicting requirements as
separate warnings. Every summary statement and finding must cite one or more
evidence IDs supplied in the input. Project type and funding source must cite
evidence when populated; use an empty value and an empty evidence list when
the source documents do not establish them.

Package-control rules:
- Evaluate the supplied document register as one bid package.
- Identify missing referenced plans, specifications, forms, conditions,
  addenda, wage schedules, permits, and supporting reports.
- Identify contradictions across documents as scope_conflicts findings.
- Identify revisions or addenda that change dates, quantities, scope,
  requirements, or bid responsiveness as addendum_impacts findings.
- Identify preliminary, superseded, or "Not For Bidding" material as
  document_control findings.
- Do not imply that the package is complete when controlling documents are
  missing or the evidence is inconsistent.

Every confidence score must be an integer percentage from 0 to 100, never a
decimal fraction between 0 and 1. Use 90-100 for explicit, consistent evidence;
70-89 for strong evidence requiring limited interpretation; 40-69 for partial
or conflicting evidence; and 0-39 when the supplied record is weak or
incomplete.
`.trim();
