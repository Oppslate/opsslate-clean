export const HELIOS_BID_BASIS_PROFILES = [
  "plans_and_specs",
  "plans_only",
  "specs_only",
  "written_scope_only",
  "mixed_or_other",
] as const;

export const HELIOS_BID_BASIS_CATEGORIES = [
  "plans",
  "specifications",
  "written_scope",
  "owner_bid_schedule",
  "proposal_bid_forms",
  "addenda",
  "geotechnical",
  "utilities",
  "environmental_permits",
  "referenced_standards_details",
] as const;

export const HELIOS_BID_BASIS_AVAILABILITY_STATES = [
  "received",
  "not_issued",
  "expected_missing",
  "unknown",
  "not_applicable",
  "superseded",
] as const;

export const HELIOS_BID_BASIS_PROCESSING_STATES = [
  "uploaded",
  "validated",
  "classified",
  "indexed",
  "ready",
] as const;

export const HELIOS_BID_BASIS_WORKSPACE_STATES = [
  "estimate_ready",
  "estimate_ready_with_limitations",
  "no_usable_scope_basis",
] as const;

export const HELIOS_BID_BASIS_CAPABILITIES = [
  "estimate_workspace",
  "plan_takeoff_spatial",
  "specification_compliance",
  "owner_item_reconciliation",
  "bid_submission_review",
] as const;

export const HELIOS_BID_BASIS_CAPABILITY_STATES = [
  "available",
  "limited",
  "unavailable",
] as const;

export const HELIOS_BID_BASIS_REVIEW_ACTIONS = [
  "proceed",
  "confirm_profile",
  "correct_profile",
  "set_category_state",
  "classify_document",
] as const;

export type HeliosBidBasisProfileType =
  (typeof HELIOS_BID_BASIS_PROFILES)[number];
export type HeliosBidBasisCategory =
  (typeof HELIOS_BID_BASIS_CATEGORIES)[number];
export type HeliosBidBasisAvailabilityState =
  (typeof HELIOS_BID_BASIS_AVAILABILITY_STATES)[number];
export type HeliosBidBasisProcessingState =
  (typeof HELIOS_BID_BASIS_PROCESSING_STATES)[number];
export type HeliosBidBasisWorkspaceState =
  (typeof HELIOS_BID_BASIS_WORKSPACE_STATES)[number];
export type HeliosBidBasisCapability =
  (typeof HELIOS_BID_BASIS_CAPABILITIES)[number];
export type HeliosBidBasisCapabilityState =
  (typeof HELIOS_BID_BASIS_CAPABILITY_STATES)[number];
export type HeliosBidBasisReviewAction =
  (typeof HELIOS_BID_BASIS_REVIEW_ACTIONS)[number];

export type HeliosBidBasisCategorySummary = {
  category: HeliosBidBasisCategory;
  state: HeliosBidBasisAvailabilityState;
  processingState: HeliosBidBasisProcessingState;
  fileCount: number;
  indexedPageCount?: number;
  sheetCount?: number;
  documentIds: string[];
  sourceLabels: string[];
  exceptions: string[];
  decisionSource: "system" | "estimator";
};

export type HeliosBidBasisCapabilitySummary = {
  capability: HeliosBidBasisCapability;
  state: HeliosBidBasisCapabilityState;
  reason: string;
  fastestAction?: string;
};

export type HeliosBidBasisProfile = {
  id?: string;
  projectId: string;
  packageId: string;
  packageRevision: number;
  profile: HeliosBidBasisProfileType;
  classificationStatus: "inferred" | "confirmed" | "corrected";
  workspaceState: HeliosBidBasisWorkspaceState;
  categories: HeliosBidBasisCategorySummary[];
  capabilities: HeliosBidBasisCapabilitySummary[];
  sourceFingerprint: string;
  proceededAt?: number;
  confirmedAt?: number;
  confirmedBy?: string;
  updatedAt: number;
};

export type HeliosBidBasisReviewInput = {
  action: HeliosBidBasisReviewAction;
  profile?: HeliosBidBasisProfileType;
  category?: HeliosBidBasisCategory;
  state?: HeliosBidBasisAvailabilityState;
  documentId?: string;
  reason?: string;
};

export type HeliosBidBasisDerivationDocument = {
  id: string;
  fileName: string;
  relativePath?: string;
  status: string;
  documentType?: string;
  findingCategories?: string[];
  findingText?: string;
  indexedPageNumbers?: number[];
};

export type HeliosBidBasisDerivationEntry = {
  documentId?: string;
  sourceCategory?: string;
  relativePath: string;
  status: string;
};

export type HeliosBidBasisOverride = {
  category: HeliosBidBasisCategory;
  state: HeliosBidBasisAvailabilityState;
};

export type HeliosDocumentCategoryOverride = {
  documentId: string;
  category: HeliosBidBasisCategory;
};

export type HeliosBidBasisDerivationInput = {
  projectId: string;
  packageId: string;
  packageRevision: number;
  packageStatus: string;
  documents: HeliosBidBasisDerivationDocument[];
  entries: HeliosBidBasisDerivationEntry[];
  writtenScopeCount: number;
  projectFindingText?: string;
  categoryOverrides?: HeliosBidBasisOverride[];
  documentOverrides?: HeliosDocumentCategoryOverride[];
  profileOverride?: HeliosBidBasisProfileType;
  classificationStatus?: "inferred" | "confirmed" | "corrected";
  proceededAt?: number;
  confirmedAt?: number;
  confirmedBy?: string;
  now?: number;
};

const CATEGORY_PATTERNS: ReadonlyArray<{
  category: HeliosBidBasisCategory;
  pattern: RegExp;
}> = [
  { category: "addenda", pattern: /\baddend(?:um|a)|bulletin|amendment\b/i },
  { category: "geotechnical", pattern: /geotech|boring|subsurface|soil report|test pit/i },
  { category: "environmental_permits", pattern: /environment|permit|wetland|nysdec|stormwater|swppp/i },
  { category: "owner_bid_schedule", pattern: /bid schedule|schedule of items|itemized proposal|engineer'?s estimate|pay item/i },
  { category: "proposal_bid_forms", pattern: /bid form|proposal|bid bond|non.?collusion|vendor responsibility|advertisement for bids/i },
  { category: "plans", pattern: /\bplan(?:s| set)?\b|drawing|sheet index|general plan|profile|typical section|detail sheet/i },
  { category: "specifications", pattern: /\bspec(?:ification|ifications|s)?\b|project manual|special provision|technical provision/i },
  { category: "utilities", pattern: /utility|water main|sanitary|storm sewer|gas main|electric|communications?|telecom/i },
  { category: "referenced_standards_details", pattern: /standard (?:sheet|detail|spec)|reference standard|typical detail/i },
];

const SOURCE_CATEGORY_MAP: Record<string, HeliosBidBasisCategory | undefined> = {
  plans: "plans",
  specifications: "specifications",
  written_scope: "written_scope",
  bid_schedule: "owner_bid_schedule",
  bid_forms: "proposal_bid_forms",
  addendum: "addenda",
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function classifyDocument(
  document: HeliosBidBasisDerivationDocument,
  entry?: HeliosBidBasisDerivationEntry,
): HeliosBidBasisCategory {
  const text = [
    document.relativePath,
    document.fileName,
    document.documentType,
  ]
    .filter(Boolean)
    .join(" \n ");
  // The document's primary identity outranks incidental content found inside it.
  // A plan sheet can contain bid-item callouts without becoming a bid schedule,
  // and a permit package can contain a drawing excerpt without becoming the
  // current contract plan set.
  if (/\baddend(?:um|a)|bulletin|amendment\b/i.test(text)) return "addenda";
  if (/\bpermit package\b|project-specific permit|agency approvals?|section 401|environmental permit/i.test(text)) {
    return "environmental_permits";
  }
  if (
    /issued[- ]for[- ]bid plan drawing|bid[- ]phase plan drawing|contract plans?|drawing set|roadway profile|stream profile|\bprofile drawing\b/i.test(text) ||
    /(?:^|[\\/])\d{3}\^[^\\/]*(?:PLAN|PROFILE|SECTION|DETAIL)[^\\/]*\.pdf$/i.test(text)
  ) return "plans";
  const findingCategories = new Set(document.findingCategories || []);
  if (findingCategories.has("addenda") || findingCategories.has("addendum_impacts")) return "addenda";
  if (findingCategories.has("drawing_index")) return "plans";
  if (findingCategories.has("specification_sections")) return "specifications";
  if (findingCategories.has("bid_items") || findingCategories.has("unit_price_items")) return "owner_bid_schedule";
  if (findingCategories.has("required_forms")) return "proposal_bid_forms";
  for (const rule of CATEGORY_PATTERNS) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return SOURCE_CATEGORY_MAP[entry?.sourceCategory || ""] || "referenced_standards_details";
}

function categoryProcessingState(
  documents: HeliosBidBasisDerivationDocument[],
  packageStatus: string,
): HeliosBidBasisProcessingState {
  if (!documents.length) return "uploaded";
  const terminal = documents.every((document) =>
    ["completed", "failed", "superseded"].includes(document.status),
  );
  if (terminal && ["ready_for_review", "partially_ready", "failed"].includes(packageStatus)) return "ready";
  if (documents.some((document) => document.findingCategories?.length || document.documentType)) return "indexed";
  if (documents.every((document) => document.status !== "ready_for_intelligence")) return "classified";
  return "validated";
}

function categoryState(
  category: HeliosBidBasisCategory,
  fileCount: number,
  hasWrittenScope: boolean,
  expectedMissing: Set<HeliosBidBasisCategory>,
): HeliosBidBasisAvailabilityState {
  if (category === "written_scope" && hasWrittenScope) return "received";
  if (fileCount > 0) return "received";
  if (expectedMissing.has(category)) return "expected_missing";
  return "unknown";
}

function capability(
  capabilityName: HeliosBidBasisCapability,
  state: HeliosBidBasisCapabilityState,
  reason: string,
  fastestAction?: string,
): HeliosBidBasisCapabilitySummary {
  return { capability: capabilityName, state, reason, fastestAction };
}

export function deriveHeliosBidBasis(
  input: HeliosBidBasisDerivationInput,
): HeliosBidBasisProfile {
  const overrideByDocument = new Map(
    (input.documentOverrides || []).map((override) => [override.documentId, override.category]),
  );
  const entryByDocument = new Map(
    input.entries.filter((entry) => entry.documentId).map((entry) => [entry.documentId!, entry]),
  );
  const documentsByCategory = new Map<HeliosBidBasisCategory, HeliosBidBasisDerivationDocument[]>();
  for (const category of HELIOS_BID_BASIS_CATEGORIES) documentsByCategory.set(category, []);
  for (const document of input.documents) {
    if (document.status === "superseded") continue;
    const category =
      overrideByDocument.get(document.id) || classifyDocument(document, entryByDocument.get(document.id));
    documentsByCategory.get(category)!.push(document);
  }

  const expectedMissing = new Set<HeliosBidBasisCategory>();
  const combinedFindingText = [
    input.projectFindingText || "",
    ...input.documents.map((document) => document.findingText || ""),
  ].join(" ");
  if (/plans? (?:were|was|are|is) (?:not (?:provided|supplied|included|issued)|unavailable)|missing (?:complete )?(?:construction )?plans?|complete construction plan set is unavailable/i.test(combinedFindingText)) expectedMissing.add("plans");
  if (/spec(?:ification)?s? (?:were|was|are|is) (?:not (?:provided|supplied|included|issued)|unavailable)|missing (?:complete )?spec/i.test(combinedFindingText)) expectedMissing.add("specifications");
  if (/bid schedule|schedule of items|owner pay items?/i.test(combinedFindingText) && !(documentsByCategory.get("owner_bid_schedule")?.length)) expectedMissing.add("owner_bid_schedule");

  const categoryOverrides = new Map(
    (input.categoryOverrides || []).map((override) => [override.category, override.state]),
  );
  const categories = HELIOS_BID_BASIS_CATEGORIES.map((category) => {
    const documents = documentsByCategory.get(category) || [];
    const indexedPages = unique(
      documents.flatMap((document) =>
        (document.indexedPageNumbers || []).filter((page) => Number.isFinite(page) && page > 0).map(String),
      ),
    ).map(Number);
    const systemState = categoryState(category, documents.length, input.writtenScopeCount > 0, expectedMissing);
    const overrideState = categoryOverrides.get(category);
    const exceptions: string[] = [];
    if (systemState === "received" && documents.some((document) => document.status === "failed")) {
      exceptions.push("One or more files require processing attention.");
    }
    if (documents.length && !indexedPages.length) {
      exceptions.push("Exact page or sheet count is not yet established.");
    }
    if (expectedMissing.has(category)) {
      exceptions.push("Referenced by the supplied basis but not found in this revision.");
    }
    return {
      category,
      state: overrideState || systemState,
      processingState:
        category === "written_scope" && input.writtenScopeCount > 0
          ? "ready" as const
          : categoryProcessingState(documents, input.packageStatus),
      fileCount: category === "written_scope" ? input.writtenScopeCount : documents.length,
      indexedPageCount: indexedPages.length ? Math.max(...indexedPages) : undefined,
      sheetCount: category === "plans" && indexedPages.length ? indexedPages.length : undefined,
      documentIds: documents.map((document) => document.id),
      sourceLabels: unique(documents.map((document) => document.relativePath || document.fileName)),
      exceptions,
      decisionSource: overrideState ? "estimator" as const : "system" as const,
    };
  });
  const stateOf = (category: HeliosBidBasisCategory) =>
    categories.find((summary) => summary.category === category)!.state;
  const received = (category: HeliosBidBasisCategory) => stateOf(category) === "received";
  const absentByDecision = (category: HeliosBidBasisCategory) =>
    ["not_issued", "not_applicable"].includes(stateOf(category));
  const hasPlans = received("plans");
  const hasSpecs = received("specifications");
  const hasWrittenScope = received("written_scope");
  const usableScope = hasPlans || hasSpecs || hasWrittenScope;

  const inferredProfile: HeliosBidBasisProfileType = hasPlans && hasSpecs
    ? "plans_and_specs"
    : hasPlans
      ? "plans_only"
      : hasSpecs
        ? "specs_only"
        : hasWrittenScope
          ? "written_scope_only"
          : "mixed_or_other";
  const profile = input.profileOverride || inferredProfile;
  const limitations = ["plans", "specifications", "owner_bid_schedule", "proposal_bid_forms"]
    .some((category) => !received(category as HeliosBidBasisCategory)) ||
    expectedMissing.has("plans") || expectedMissing.has("specifications");
  const workspaceState: HeliosBidBasisWorkspaceState = !usableScope
    ? "no_usable_scope_basis"
    : limitations
      ? "estimate_ready_with_limitations"
      : "estimate_ready";

  const capabilities: HeliosBidBasisCapabilitySummary[] = [
    capability(
      "estimate_workspace",
      usableScope ? (limitations ? "limited" : "available") : "unavailable",
      usableScope
        ? limitations
          ? "A verified scope basis exists; unsupported work remains explicitly unresolved."
          : "Plans, specifications, and owner documents support the full estimate workflow."
        : "No plans, specifications, or written scope have been received.",
      usableScope ? undefined : "Add any usable scope basis.",
    ),
    capability(
      "plan_takeoff_spatial",
      hasPlans ? (expectedMissing.has("plans") ? "limited" : "available") : "unavailable",
      hasPlans
        ? expectedMissing.has("plans")
          ? "Plan evidence exists, but referenced construction-plan information remains missing."
          : "Plan evidence is available for sheet interpretation and quantity takeoff."
        : "No plan set is available in this revision.",
      hasPlans || absentByDecision("plans") ? undefined : "Upload plans or mark them not issued.",
    ),
    capability(
      "specification_compliance",
      hasSpecs ? (expectedMissing.has("specifications") ? "limited" : "available") : "unavailable",
      hasSpecs
        ? expectedMissing.has("specifications")
          ? "Specification evidence exists, but referenced specification information remains missing."
          : "Specification evidence is available for requirements and scope review."
        : "No specification set is available in this revision.",
      hasSpecs || absentByDecision("specifications") ? undefined : "Upload specifications or mark them not issued.",
    ),
    capability(
      "owner_item_reconciliation",
      received("owner_bid_schedule") ? "available" : "unavailable",
      received("owner_bid_schedule") ? "The owner bid schedule can be reconciled to contractor WBS items." : "No owner bid schedule is available; contractor items remain independent.",
      received("owner_bid_schedule") || absentByDecision("owner_bid_schedule") ? undefined : "Upload the owner item schedule or mark it not issued.",
    ),
    capability(
      "bid_submission_review",
      received("proposal_bid_forms") ? "available" : "limited",
      received("proposal_bid_forms") ? "Proposal and bid forms are available for submission review." : "Estimate work may proceed, but final bid-form completeness cannot be verified.",
      received("proposal_bid_forms") || absentByDecision("proposal_bid_forms") ? undefined : "Upload proposal forms or mark them not issued.",
    ),
  ];
  const sourceFingerprint = [
    input.packageId,
    input.packageRevision,
    ...input.documents.map((document) => `${document.id}:${document.status}`).sort(),
    ...categories.map((category) => `${category.category}:${category.state}:${category.fileCount}`),
  ].join("|");

  return {
    projectId: input.projectId,
    packageId: input.packageId,
    packageRevision: input.packageRevision,
    profile,
    classificationStatus: input.classificationStatus || (input.profileOverride ? "corrected" : "inferred"),
    workspaceState,
    categories,
    capabilities,
    sourceFingerprint,
    proceededAt: input.proceededAt,
    confirmedAt: input.confirmedAt,
    confirmedBy: input.confirmedBy,
    updatedAt: input.now || Date.now(),
  };
}

export function bidBasisProfileLabel(profile: HeliosBidBasisProfileType) {
  return {
    plans_and_specs: "Plans and specifications",
    plans_only: "Plans only",
    specs_only: "Specifications only",
    written_scope_only: "Written scope only",
    mixed_or_other: "Mixed or other basis",
  }[profile];
}

export function bidBasisCategoryLabel(category: HeliosBidBasisCategory) {
  return {
    plans: "Plans",
    specifications: "Specifications",
    written_scope: "Written scope",
    owner_bid_schedule: "Owner bid schedule",
    proposal_bid_forms: "Proposal / bid forms",
    addenda: "Addenda",
    geotechnical: "Geotechnical",
    utilities: "Utilities",
    environmental_permits: "Environmental / permits",
    referenced_standards_details: "Referenced standards / details",
  }[category];
}

export function normalizeBidBasisReviewInput(
  value: unknown,
): HeliosBidBasisReviewInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Bid-basis review input is required.");
  }
  const record = value as Record<string, unknown>;
  if (!HELIOS_BID_BASIS_REVIEW_ACTIONS.includes(record.action as HeliosBidBasisReviewAction)) {
    throw new Error("Bid-basis review action is invalid.");
  }
  const result: HeliosBidBasisReviewInput = {
    action: record.action as HeliosBidBasisReviewAction,
  };
  if (record.profile !== undefined) {
    if (!HELIOS_BID_BASIS_PROFILES.includes(record.profile as HeliosBidBasisProfileType)) {
      throw new Error("Bid-basis profile is invalid.");
    }
    result.profile = record.profile as HeliosBidBasisProfileType;
  }
  if (record.category !== undefined) {
    if (!HELIOS_BID_BASIS_CATEGORIES.includes(record.category as HeliosBidBasisCategory)) {
      throw new Error("Bid-basis category is invalid.");
    }
    result.category = record.category as HeliosBidBasisCategory;
  }
  if (record.state !== undefined) {
    if (!HELIOS_BID_BASIS_AVAILABILITY_STATES.includes(record.state as HeliosBidBasisAvailabilityState)) {
      throw new Error("Bid-basis category state is invalid.");
    }
    result.state = record.state as HeliosBidBasisAvailabilityState;
  }
  if (record.documentId !== undefined) {
    if (typeof record.documentId !== "string" || !record.documentId || record.documentId.length > 256) {
      throw new Error("Bid-basis document identifier is invalid.");
    }
    result.documentId = record.documentId;
  }
  if (record.reason !== undefined) {
    if (typeof record.reason !== "string" || !record.reason.trim() || record.reason.length > 1_000) {
      throw new Error("Bid-basis decision reason is invalid.");
    }
    result.reason = record.reason.trim();
  }
  if (result.action === "correct_profile" && (!result.profile || !result.reason)) {
    throw new Error("Corrected profile and reason are required.");
  }
  if (result.action === "set_category_state" && (!result.category || !result.state || !result.reason)) {
    throw new Error("Category, state, and reason are required.");
  }
  if (result.action === "classify_document" && (!result.documentId || !result.category || !result.reason)) {
    throw new Error("Document, category, and reason are required.");
  }
  return result;
}
