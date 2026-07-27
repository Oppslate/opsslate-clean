import {
  HELIOS_ESTIMATE_WBS,
  HELIOS_ESTIMATE_QUANTITY_STATUSES,
  HELIOS_ESTIMATE_RESOURCE_CLASSES,
  HELIOS_ESTIMATE_SCOPE_OWNERSHIP,
  HELIOS_OWNER_PAY_ITEM_TYPES,
} from "@opsslate/helios-domain";

const heliosWbsPrompt = HELIOS_ESTIMATE_WBS
  .map((section) => `${section.id} - ${section.displayName}`)
  .join("\n");

const evidenceIds = {
  type: "array",
  minItems: 1,
  maxItems: 80,
  items: { type: "string", minLength: 1, maxLength: 128 },
} as const;

const nullableQuantity = {
  anyOf: [{ type: "number", exclusiveMinimum: 0 }, { type: "null" }],
} as const;

const resourceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "resourceClass",
    "description",
    "quantity",
    "unit",
    "rateCents",
    "rateStatus",
    "taxStatus",
  ],
  properties: {
    resourceClass: { type: "string", enum: HELIOS_ESTIMATE_RESOURCE_CLASSES },
    description: { type: "string", minLength: 1, maxLength: 240 },
    quantity: nullableQuantity,
    unit: { type: "string", minLength: 1, maxLength: 40 },
    rateCents: { type: "null" },
    rateStatus: { type: "string", enum: ["unpriced"] },
    taxStatus: { type: "string", enum: ["taxable", "exempt", "unknown"] },
  },
} as const;

const costCodeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "code",
    "description",
    "scopeOwnership",
    "productionQuantity",
    "productionUnit",
    "confidence",
    "evidenceIds",
    "resources",
  ],
  properties: {
    code: { type: "string", minLength: 1, maxLength: 80 },
    description: { type: "string", minLength: 1, maxLength: 240 },
    scopeOwnership: { type: "string", enum: HELIOS_ESTIMATE_SCOPE_OWNERSHIP },
    productionQuantity: nullableQuantity,
    productionUnit: { type: "string", minLength: 1, maxLength: 40 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    evidenceIds,
    resources: { type: "array", maxItems: 100, items: resourceSchema },
  },
} as const;

const ownerPayItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "officialSequence",
    "officialItemNumber",
    "description",
    "estimatorDescription",
    "bidQuantity",
    "bidUnit",
    "itemType",
    "fixedAmountCents",
    "quantityStatus",
    "confidence",
    "evidenceIds",
    "costCodes",
  ],
  properties: {
    officialSequence: { type: "integer", minimum: 0 },
    officialItemNumber: { type: "string", minLength: 1, maxLength: 80 },
    description: { type: "string", minLength: 1, maxLength: 400 },
    estimatorDescription: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 240 }, { type: "null" }],
    },
    bidQuantity: nullableQuantity,
    bidUnit: { type: "string", minLength: 1, maxLength: 40 },
    itemType: { type: "string", enum: HELIOS_OWNER_PAY_ITEM_TYPES },
    fixedAmountCents: {
      anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }],
    },
    quantityStatus: { type: "string", enum: HELIOS_ESTIMATE_QUANTITY_STATUSES },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    evidenceIds,
    costCodes: {
      type: "array",
      minItems: 1,
      maxItems: 80,
      items: costCodeSchema,
    },
  },
} as const;

const sectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["key", "name", "sequence", "evidenceIds", "payItems"],
  properties: {
    key: { type: "string", minLength: 1, maxLength: 80 },
    name: { type: "string", minLength: 1, maxLength: 160 },
    sequence: { type: "integer", minimum: 0 },
    evidenceIds,
    payItems: {
      type: "array",
      minItems: 1,
      maxItems: 250,
      items: ownerPayItemSchema,
    },
  },
} as const;

const riskSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "detail",
    "probabilityPercent",
    "scheduleDays",
    "mitigation",
    "owner",
    "disposition",
    "confidence",
    "evidenceIds",
  ],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 240 },
    detail: { type: "string", minLength: 1, maxLength: 1600 },
    probabilityPercent: { type: "integer", minimum: 0, maximum: 100 },
    scheduleDays: nullableQuantity,
    mitigation: { type: "string", minLength: 1, maxLength: 800 },
    owner: { type: "string", minLength: 1, maxLength: 160 },
    disposition: {
      type: "string",
      enum: ["open", "mitigated", "accepted", "transferred"],
    },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    evidenceIds,
  },
} as const;

export const heliosEstimateProposalFormat = {
  type: "json_schema" as const,
  name: "helios_estimate_proposal",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["sections", "risks"],
    properties: {
      sections: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: sectionSchema,
      },
      risks: { type: "array", maxItems: 150, items: riskSchema },
    },
  },
};

export const HELIOS_ESTIMATE_PROPOSAL_PROMPT = `
You are Helios, creating a professional heavy-highway estimate breakdown from
evidence already extracted from a New York public-work bid package.

Build the estimate around the owner's official pay items. Keep the official
NYSDOT or owner item number, description, sequence, quantity, unit, and item
type as the parent record. Preserve an official fixed price or allowance in
fixedAmountCents only when the cited bid schedule states it; otherwise return
null. Never infer a fixed amount. Under each owner item, create
the operational cost codes an estimator needs to build the work: engineering,
survey, mobilization, maintenance and protection of traffic, removals,
earthwork, excavation, dewatering, utilities, drainage, structures, concrete,
reinforcing, fill, paving, restoration, testing, trucking, disposal, temporary
works, and subcontract or supplier scope when supported by evidence.

Organize every owner pay item into this exact Helios contractor work breakdown
structure. Use the two-digit ID as the section key, the exact display name, and
the listed order. Do not preserve the owner's specification grouping:

${heliosWbsPrompt}

Classify by the construction operation the contractor will estimate and build.
Examples: 201.06 Clearing & Grubbing belongs in 02 Site Preparation; 203.02
Unclassified Excavation and 206.01 Structural Excavation belong in 03
Earthwork; 203.03 Embankment and 203.21 Select Structure Fill belong in 04 Fill
& Embankment; and 603-series culvert pipe belongs in 05 Drainage. The server
will validate and deterministically reclassify every item against the same WBS.

For every cost code, identify the expected labor, equipment, material,
subcontract, trucking, disposal, and other resources needed to price it. Never
invent a price, rate, quote, or cost. Every resource must have rateCents null
and rateStatus "unpriced". Keep an unknown quantity null. Use
"takeoff_required" when an owner bid quantity is not established; use
"ai_preliminary" only for a clearly supported preliminary plan quantity.

Every section, owner pay item, cost code, and risk must cite one or more of the
provided evidence IDs. Do not cite any identifier that is not in the supplied
evidence register. Separate risks from base estimate scope. Risks must include
probability, schedule exposure when supported, mitigation, owner, disposition,
confidence, and evidence. Do not return alternate bids in this release.

Return only the strict structured result. This is a proposal for human review;
it is not an accepted estimate and must not overwrite estimator decisions.
`;
