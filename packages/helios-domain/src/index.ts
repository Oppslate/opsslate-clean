export * from "./wbs.ts";
export * from "./bid-basis.ts";
export * from "./plan-intelligence.ts";

import {
  classifyEstimateWbsSection,
  HELIOS_ESTIMATE_WBS,
} from "./wbs.ts";

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
export const HELIOS_MANIFEST_VERSION = 1;
export const HELIOS_MAX_WRITTEN_SCOPE_BYTES = 128 * 1024;

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
  "written_scope",
] as const;

export const HELIOS_PACKAGE_ADAPTERS = ["manual", "bid_scout"] as const;

export const HELIOS_PACKAGE_REVISION_KINDS = [
  "initial",
  "addendum",
  "revision",
  "supplemental",
] as const;

export const HELIOS_PACKAGE_ENTRY_KINDS = ["pdf", "written_scope"] as const;

export const HELIOS_PACKAGE_SOURCE_CATEGORIES = [
  "plans",
  "specifications",
  "bid_schedule",
  "bid_forms",
  "addendum",
  "written_scope",
  "supporting",
  "unknown",
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
  "deferred",
  "accepted",
  "corrected",
  "rejected",
] as const;

export const HELIOS_ESTIMATE_REVIEW_ACTIONS = [
  "accept",
  "correct",
  "reject",
  "defer",
  "merge",
  "split",
  "map",
] as const;

export const HELIOS_OWNER_PAY_ITEM_TYPES = [
  "unit_price",
  "lump_sum",
  "fixed_price",
  "allowance",
] as const;

export const HELIOS_ESTIMATE_IMPORT_CHANGE_TYPES = [
  "new",
  "unchanged",
  "changed",
  "conflict",
  "missing",
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
  "owner_responsibility",
  "undecided",
  "unassigned",
] as const;

export const HELIOS_ESTIMATE_RATE_STATUSES = [
  "unpriced",
  "user_entered",
  "cost_database",
  "vendor_quote",
  "approved_historical",
  "approved_crew",
] as const;

export const HELIOS_ESTIMATE_PRICING_STATUSES = [
  "unpriced",
  "partial",
  "priced",
] as const;

export const HELIOS_QUANTITY_RECORD_TYPES = [
  "official_contract",
  "plan",
  "estimator_calculated",
  "preliminary_ai_takeoff",
  "vendor",
  "allowance",
  "estimator_assumption",
  "takeoff_required",
  "included_in_another_item",
] as const;

export const HELIOS_QUANTITY_RECORD_USES = [
  "authoritative",
  "comparative",
  "production",
] as const;

export const HELIOS_QUANTITY_RECORD_STATUSES = [
  "current",
  "conflicting",
  "superseded",
  "takeoff_required",
] as const;

export const HELIOS_ALLOCATION_BALANCE_STATUSES = [
  "balanced",
  "unbalanced",
  "incomplete",
  "duplicate",
  "orphan",
] as const;

export const HELIOS_ESTIMATE_BUILD_ACTIONS = [
  "create_cost_code",
  "update_cost_code",
  "accept_cost_code",
  "reject_cost_code",
  "create_resource",
  "update_resource",
  "accept_resource",
  "reject_resource",
  "create_quantity",
  "accept_quantity",
  "reject_quantity",
  "mark_takeoff_required",
  "set_allocation_required",
  "create_allocation",
  "update_allocation",
  "accept_allocation",
  "reject_allocation",
] as const;

export const HELIOS_ESTIMATE_EVIDENCE_RECORD_TYPES = [
  "section",
  "pay_item",
  "cost_code",
  "resource",
  "quantity",
  "rfq",
  "submittal",
  "risk",
] as const;

export const HELIOS_ESTIMATE_EVIDENCE_RELATIONSHIPS = [
  "scope",
  "quantity",
  "pricing",
  "procurement",
  "submittal",
  "risk",
] as const;

export const HELIOS_EVIDENCE_VERIFICATION_STATUSES = [
  "proposed",
  "verified",
  "disputed",
  "superseded",
] as const;

export const HELIOS_RFQ_STATUSES = [
  "draft",
  "ready_to_send",
  "sent",
  "quote_received",
  "quote_accepted",
  "closed",
] as const;

export const HELIOS_SUBMITTAL_TYPES = [
  "product_data",
  "shop_drawing",
  "sample",
  "mix_design",
  "procedure",
  "certification",
  "other",
] as const;

export const HELIOS_SUBMITTAL_STATUSES = [
  "draft",
  "required",
  "assigned",
  "submitted",
  "accepted",
  "closed",
] as const;

export const HELIOS_RISK_CATEGORIES = [
  "document_control",
  "contract",
  "scope",
  "quantity",
  "pricing",
  "schedule",
  "procurement",
  "site_conditions",
  "utilities",
  "safety",
  "regulatory",
  "environmental",
  "other",
] as const;

export const HELIOS_RISK_SEVERITIES = [
  "information",
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const HELIOS_RISK_DISPOSITIONS = [
  "open",
  "mitigated",
  "accepted",
  "transferred",
  "avoided",
  "closed",
] as const;

export const HELIOS_RISK_CARRY_DECISIONS = [
  "pending",
  "base_estimate",
  "contingency",
  "qualification",
  "transfer",
  "no_carry",
] as const;

export const HELIOS_ESTIMATE_SUPPORT_ACTIONS = [
  "generate_rfq",
  "update_rfq",
  "accept_rfq",
  "reject_rfq",
  "set_rfq_status",
  "generate_submittal",
  "update_submittal",
  "accept_submittal",
  "reject_submittal",
  "set_submittal_status",
  "update_risk",
  "accept_risk",
  "reject_risk",
  "set_risk_decision",
  "verify_evidence",
  "dispute_evidence",
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
export type HeliosPackageAdapter = (typeof HELIOS_PACKAGE_ADAPTERS)[number];
export type HeliosPackageRevisionKind =
  (typeof HELIOS_PACKAGE_REVISION_KINDS)[number];
export type HeliosPackageEntryKind =
  (typeof HELIOS_PACKAGE_ENTRY_KINDS)[number];
export type HeliosPackageSourceCategory =
  (typeof HELIOS_PACKAGE_SOURCE_CATEGORIES)[number];
export type HeliosPackageStatus = (typeof HELIOS_PACKAGE_STATUSES)[number];
export type HeliosPackageEntryStatus =
  (typeof HELIOS_PACKAGE_ENTRY_STATUSES)[number];
export type HeliosEstimateStatus = (typeof HELIOS_ESTIMATE_STATUSES)[number];
export type HeliosEstimateReviewStatus =
  (typeof HELIOS_ESTIMATE_REVIEW_STATUSES)[number];
export type HeliosEstimateReviewAction =
  (typeof HELIOS_ESTIMATE_REVIEW_ACTIONS)[number];
export type HeliosOwnerPayItemType =
  (typeof HELIOS_OWNER_PAY_ITEM_TYPES)[number];
export type HeliosEstimateImportChangeType =
  (typeof HELIOS_ESTIMATE_IMPORT_CHANGE_TYPES)[number];
export type HeliosEstimateQuantityStatus =
  (typeof HELIOS_ESTIMATE_QUANTITY_STATUSES)[number];
export type HeliosEstimateResourceClass =
  (typeof HELIOS_ESTIMATE_RESOURCE_CLASSES)[number];
export type HeliosEstimateScopeOwnership =
  (typeof HELIOS_ESTIMATE_SCOPE_OWNERSHIP)[number];
export type HeliosEstimateRateStatus =
  (typeof HELIOS_ESTIMATE_RATE_STATUSES)[number];
export type HeliosEstimatePricingStatus =
  (typeof HELIOS_ESTIMATE_PRICING_STATUSES)[number];
export type HeliosEstimateBuildAction =
  (typeof HELIOS_ESTIMATE_BUILD_ACTIONS)[number];
export type HeliosQuantityRecordType =
  (typeof HELIOS_QUANTITY_RECORD_TYPES)[number];
export type HeliosQuantityRecordUse =
  (typeof HELIOS_QUANTITY_RECORD_USES)[number];
export type HeliosQuantityRecordStatus =
  (typeof HELIOS_QUANTITY_RECORD_STATUSES)[number];
export type HeliosAllocationBalanceStatus =
  (typeof HELIOS_ALLOCATION_BALANCE_STATUSES)[number];
export type HeliosEstimateEvidenceRecordType =
  (typeof HELIOS_ESTIMATE_EVIDENCE_RECORD_TYPES)[number];
export type HeliosEstimateEvidenceRelationship =
  (typeof HELIOS_ESTIMATE_EVIDENCE_RELATIONSHIPS)[number];
export type HeliosEvidenceVerificationStatus =
  (typeof HELIOS_EVIDENCE_VERIFICATION_STATUSES)[number];
export type HeliosRfqStatus = (typeof HELIOS_RFQ_STATUSES)[number];
export type HeliosSubmittalType = (typeof HELIOS_SUBMITTAL_TYPES)[number];
export type HeliosSubmittalStatus = (typeof HELIOS_SUBMITTAL_STATUSES)[number];
export type HeliosRiskCategory = (typeof HELIOS_RISK_CATEGORIES)[number];
export type HeliosRiskSeverity = (typeof HELIOS_RISK_SEVERITIES)[number];
export type HeliosRiskDisposition = (typeof HELIOS_RISK_DISPOSITIONS)[number];
export type HeliosRiskCarryDecision =
  (typeof HELIOS_RISK_CARRY_DECISIONS)[number];
export type HeliosEstimateSupportAction =
  (typeof HELIOS_ESTIMATE_SUPPORT_ACTIONS)[number];

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
  envelopeId?: string;
  kind: HeliosPackageEntryKind;
  sourceCategory: HeliosPackageSourceCategory;
  relativePath: string;
  size: number;
  sha256?: string;
  status: HeliosPackageEntryStatus;
  reason?: string;
  documentId?: string;
  writtenScopeId?: string;
};

export type HeliosPackageEnvelope = {
  id: string;
  envelopeId: string;
  adapter: HeliosPackageAdapter;
  sourceType: HeliosPackageSourceType;
  manifestVersion: number;
  revisionKind: HeliosPackageRevisionKind;
  revisionLabel?: string;
  status: "building" | "terminal";
  entryCount: number;
  acceptedCount: number;
  rejectedCount: number;
  totalBytes: number;
  createdAt: number;
  updatedAt: number;
};

export type HeliosBidPackage = {
  id: string;
  projectId: string;
  name: string;
  sourceType: HeliosPackageSourceType;
  adapter: HeliosPackageAdapter;
  manifestVersion: number;
  revisionKind: HeliosPackageRevisionKind;
  revisionLabel?: string;
  revision: number;
  status: HeliosPackageStatus;
  entryCount: number;
  pdfCount: number;
  rejectedCount: number;
  uploadedCount: number;
  duplicateCount: number;
  failedCount: number;
  writtenScopeCount: number;
  totalBytes: number;
  lastError?: string;
  finalizedAt?: number;
  analysisCompletedAt?: number;
  createdAt: number;
  updatedAt: number;
  entries: HeliosPackageEntry[];
  envelopes: HeliosPackageEnvelope[];
};

export type HeliosPackageManifestEntryInput = {
  kind?: HeliosPackageEntryKind;
  sourceCategory?: HeliosPackageSourceCategory;
  relativePath: string;
  size: number;
  sha256?: string;
  title?: string;
  content?: string;
  sourceLocation?: string;
  accepted: boolean;
  reason?: string;
};

export type HeliosPackageInput = {
  envelopeId: string;
  adapter: HeliosPackageAdapter;
  manifestVersion: number;
  name: string;
  sourceType: HeliosPackageSourceType;
  revisionKind: HeliosPackageRevisionKind;
  revisionLabel?: string;
  entries: HeliosPackageManifestEntryInput[];
};

export type HeliosWrittenScopeSummary = {
  id: string;
  projectId: string;
  packageId: string;
  packageEntryId: string;
  title: string;
  relativePath: string;
  content: string;
  sourceLocation?: string;
  size: number;
  sha256: string;
  version: number;
  supersedesWrittenScopeId?: string;
  createdAt: number;
  updatedAt: number;
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
  writtenScopes: HeliosWrittenScopeSummary[];
  packages: HeliosBidPackage[];
  activePackageId?: string;
  latestIntelligenceError?: string;
  intelligence?: HeliosProjectIntelligence;
  bidBasis?: import("./bid-basis.ts").HeliosBidBasisProfile;
  planSet?: import("./plan-intelligence.ts").HeliosPlanSetIntelligence;
};

export type HeliosEstimateResource = {
  id: string;
  resourceClass: HeliosEstimateResourceClass;
  description: string;
  quantity?: number;
  unit: string;
  rateCents?: number;
  rateStatus: HeliosEstimateRateStatus;
  priceSourceLabel?: string;
  priceSourceReference?: string;
  effectiveDate?: string;
  wasteBasisPoints: number;
  durationHours?: number;
  crewOrAssembly?: string;
  escalationBasisPoints: number;
  overrideRateCents?: number;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: number;
  effectiveRateCents?: number;
  taxStatus: "taxable" | "exempt" | "unknown";
  reviewStatus: HeliosEstimateReviewStatus;
  pricingStatus: HeliosEstimatePricingStatus;
  directCostCents?: number;
};

export type HeliosEstimateQuantityRecord = {
  id: string;
  costCodeId: string;
  value?: number;
  unit: string;
  quantityType: HeliosQuantityRecordType;
  sourceLabel: string;
  sourceReference?: string;
  method: string;
  confidence: number;
  use: HeliosQuantityRecordUse;
  status: HeliosQuantityRecordStatus;
  reviewStatus: HeliosEstimateReviewStatus;
  origin: "ai" | "human" | "import";
  evidenceIds: string[];
};

export type HeliosEstimateAllocation = {
  id: string;
  sourceCostCodeId: string;
  targetPayItemId: string;
  targetCostCodeId?: string;
  allocationType: "quantity" | "percent" | "amount";
  controllingValue: number;
  quantity?: number;
  percentBasisPoints?: number;
  amountCents?: number;
  calculationBasis: string;
  balancingStatus: HeliosAllocationBalanceStatus;
  reviewStatus: HeliosEstimateReviewStatus;
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
  quantities: HeliosEstimateQuantityRecord[];
  allocations: HeliosEstimateAllocation[];
  allocationRequired: boolean;
  allocationStatus: HeliosAllocationBalanceStatus;
  reconciliationIssues: string[];
  pricingStatus: HeliosEstimatePricingStatus;
  directCostCents?: number;
};

export type HeliosOwnerPayItem = {
  id: string;
  officialSequence: number;
  officialItemNumber: string;
  description: string;
  estimatorDescription?: string;
  bidQuantity?: number;
  bidUnit: string;
  itemType: HeliosOwnerPayItemType;
  fixedAmountCents?: number;
  importChangeType: HeliosEstimateImportChangeType;
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
  key: string;
  name: string;
  sequence: number;
  reviewStatus: HeliosEstimateReviewStatus;
  evidenceIds: string[];
  payItems: HeliosOwnerPayItem[];
};

export type HeliosEstimateEvidenceLink = {
  id: string;
  evidenceId: string;
  recordType: HeliosEstimateEvidenceRecordType;
  recordId: string;
  recordLabel: string;
  relationship: HeliosEstimateEvidenceRelationship;
  origin: "ai" | "human" | "import" | "system";
  verificationStatus: HeliosEvidenceVerificationStatus;
  verifierName?: string;
  verifiedAt?: number;
  comment?: string;
};

export type HeliosEstimateRfq = {
  id: string;
  title: string;
  packageNumber?: string;
  status: HeliosRfqStatus;
  requiredQuoteDate?: string;
  deliveryLocation?: string;
  inclusions: string[];
  exclusions: string[];
  scheduleConstraints: string[];
  vendors: string[];
  linkedPayItemIds: string[];
  linkedCostCodeIds: string[];
  linkedQuantityIds: string[];
  evidenceIds: string[];
  origin: "ai" | "human" | "system";
  reviewStatus: HeliosEstimateReviewStatus;
  createdAt: number;
  updatedAt: number;
};

export type HeliosEstimateSubmittal = {
  id: string;
  type: HeliosSubmittalType;
  description: string;
  specification?: string;
  timing?: string;
  responsibility?: string;
  predecessor?: string;
  dueDate?: string;
  status: HeliosSubmittalStatus;
  linkedPayItemIds: string[];
  linkedCostCodeIds: string[];
  evidenceIds: string[];
  origin: "ai" | "human" | "system";
  reviewStatus: HeliosEstimateReviewStatus;
  createdAt: number;
  updatedAt: number;
};

export type HeliosEstimateRisk = {
  id: string;
  category: HeliosRiskCategory;
  severity: HeliosRiskSeverity;
  title: string;
  detail: string;
  probabilityPercent: number;
  lowCostCents?: number;
  mostLikelyCostCents?: number;
  highCostCents?: number;
  scheduleDays?: number;
  lowScheduleDays?: number;
  mostLikelyScheduleDays?: number;
  highScheduleDays?: number;
  mitigationCostCents?: number;
  mitigation: string;
  contingencyResponse?: string;
  owner: string;
  responseDueDate?: string;
  disposition: HeliosRiskDisposition;
  carryDecision: HeliosRiskCarryDecision;
  linkedPayItemIds: string[];
  linkedCostCodeIds: string[];
  linkedQuantityIds: string[];
  linkedDocumentIds: string[];
  expectedExposureCents?: number;
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
  reviewSummary: HeliosEstimateReviewSummary;
  decisionHistory: HeliosEstimateDecisionEvent[];
  sections: HeliosEstimateSection[];
  risks: HeliosEstimateRisk[];
  rfqs: HeliosEstimateRfq[];
  submittals: HeliosEstimateSubmittal[];
  evidenceLinks: HeliosEstimateEvidenceLink[];
  evidence: HeliosEvidence[];
  createdAt: number;
  updatedAt: number;
};

export type HeliosEstimateReviewSummary = {
  total: number;
  proposed: number;
  deferred: number;
  accepted: number;
  corrected: number;
  rejected: number;
  reviewed: number;
  percentComplete: number;
  canAcceptImport: boolean;
  blockers: string[];
};

export type HeliosEstimateDecisionEvent = {
  id: string;
  recordType: "section" | "pay_item" | "cost_code" | "resource" | "quantity" | "allocation" | "risk" | "rfq" | "submittal" | "evidence_link" | "estimate";
  recordId: string;
  action: HeliosEstimateReviewAction | "accept_import" | "create" | "update" | "generate" | "status_change" | "verify" | "dispute";
  comment?: string;
  targetRecordId?: string;
  previousValue?: unknown;
  decisionValue?: unknown;
  reviewerName: string;
  createdAt: number;
};

export type HeliosEstimateBuildInput = {
  action: HeliosEstimateBuildAction;
  payItemId?: string;
  costCodeId?: string;
  resourceId?: string;
  quantityId?: string;
  allocationId?: string;
  comment?: string;
  allocationRequired?: boolean;
  costCode?: {
    code: string;
    description: string;
    scopeOwnership: HeliosEstimateScopeOwnership;
    productionQuantity?: number;
    productionUnit: string;
  };
  resource?: {
    resourceClass: HeliosEstimateResourceClass;
    description: string;
    quantity?: number;
    unit: string;
    wasteBasisPoints: number;
    durationHours?: number;
    taxStatus: "taxable" | "exempt" | "unknown";
    rateStatus: HeliosEstimateRateStatus;
    rateCents?: number;
    priceSourceLabel?: string;
    priceSourceReference?: string;
    effectiveDate?: string;
    crewOrAssembly?: string;
    escalationBasisPoints: number;
    overrideRateCents?: number;
    overrideReason?: string;
  };
  quantity?: {
    value?: number;
    unit: string;
    quantityType: HeliosQuantityRecordType;
    sourceLabel: string;
    sourceReference?: string;
    method: string;
    confidence: number;
    use: HeliosQuantityRecordUse;
  };
  allocation?: {
    targetPayItemId: string;
    targetCostCodeId?: string;
    allocationType: "quantity" | "percent" | "amount";
    controllingValue: number;
  };
};

export type HeliosEstimateSupportInput = {
  action: HeliosEstimateSupportAction;
  costCodeId?: string;
  rfqId?: string;
  submittalId?: string;
  riskId?: string;
  evidenceId?: string;
  recordType?: HeliosEstimateEvidenceRecordType;
  recordId?: string;
  comment?: string;
  rfqStatus?: HeliosRfqStatus;
  submittalStatus?: HeliosSubmittalStatus;
  riskCarryDecision?: HeliosRiskCarryDecision;
  rfq?: {
    title: string;
    packageNumber?: string;
    requiredQuoteDate?: string;
    deliveryLocation?: string;
    inclusions: string[];
    exclusions: string[];
    scheduleConstraints: string[];
    vendors: string[];
  };
  submittal?: {
    type: HeliosSubmittalType;
    description: string;
    specification?: string;
    timing?: string;
    responsibility?: string;
    predecessor?: string;
    dueDate?: string;
  };
  risk?: {
    category: HeliosRiskCategory;
    severity: HeliosRiskSeverity;
    title: string;
    detail: string;
    probabilityPercent: number;
    lowCostCents?: number;
    mostLikelyCostCents?: number;
    highCostCents?: number;
    lowScheduleDays?: number;
    mostLikelyScheduleDays?: number;
    highScheduleDays?: number;
    mitigationCostCents?: number;
    mitigation: string;
    contingencyResponse?: string;
    owner: string;
    responseDueDate?: string;
    disposition: HeliosRiskDisposition;
    linkedPayItemIds: string[];
    linkedCostCodeIds: string[];
    linkedQuantityIds: string[];
  };
};

export type HeliosEstimateReviewInput = {
  recordType: "section" | "pay_item";
  recordId: string;
  action: HeliosEstimateReviewAction;
  comment?: string;
  targetRecordId?: string;
  correction?: {
    name?: string;
    sequence?: number;
    sectionId?: string;
    officialSequence?: number;
    officialItemNumber?: string;
    description?: string;
    estimatorDescription?: string;
    bidQuantity?: number;
    bidUnit?: string;
    itemType?: HeliosOwnerPayItemType;
    fixedAmountCents?: number;
  };
  split?: {
    name?: string;
    officialSequence?: number;
    officialItemNumber?: string;
    description?: string;
    bidQuantity?: number;
    bidUnit?: string;
    itemType?: HeliosOwnerPayItemType;
    fixedAmountCents?: number;
    moveRecordIds?: string[];
  };
};

export type HeliosEstimateProposalResourceInput = Pick<
  HeliosEstimateResource,
  | "resourceClass"
  | "description"
  | "quantity"
  | "unit"
  | "rateCents"
  | "rateStatus"
  | "taxStatus"
>;

export type HeliosEstimateProposalCostCodeInput = Omit<
  HeliosEstimateCostCode,
  | "id"
  | "resources"
  | "quantities"
  | "allocations"
  | "allocationRequired"
  | "allocationStatus"
  | "reconciliationIssues"
  | "pricingStatus"
  | "directCostCents"
  | "reviewStatus"
> & { resources: HeliosEstimateProposalResourceInput[] };

export type HeliosEstimateProposalPayItemInput = Omit<
  HeliosOwnerPayItem,
  | "id"
  | "costCodes"
  | "directCostCents"
  | "derivedUnitCostCents"
  | "reviewStatus"
  | "importChangeType"
> & { costCodes: HeliosEstimateProposalCostCodeInput[] };

export type HeliosEstimateProposalSectionInput = Omit<
  HeliosEstimateSection,
  "id" | "key" | "payItems" | "reviewStatus"
> & { key: string; payItems: HeliosEstimateProposalPayItemInput[] };

export type HeliosEstimateProposalRiskInput = Omit<
  HeliosEstimateRisk,
  | "id"
  | "category"
  | "severity"
  | "lowCostCents"
  | "mostLikelyCostCents"
  | "highCostCents"
  | "lowScheduleDays"
  | "mostLikelyScheduleDays"
  | "highScheduleDays"
  | "mitigationCostCents"
  | "contingencyResponse"
  | "responseDueDate"
  | "carryDecision"
  | "linkedPayItemIds"
  | "linkedCostCodeIds"
  | "linkedQuantityIds"
  | "linkedDocumentIds"
  | "expectedExposureCents"
  | "reviewStatus"
>;

export type HeliosEstimateProposalInput = {
  sections: HeliosEstimateProposalSectionInput[];
  risks: HeliosEstimateProposalRiskInput[];
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

function optionalLabeledText(
  value: unknown,
  label: string,
  maxLength: number,
) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new HeliosValidationError(`${label} must be valid text.`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new HeliosValidationError(
      `${label} must be under ${maxLength} characters.`,
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
  const envelopeId = textValue(input.envelopeId, "Envelope ID", 120);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,119}$/.test(envelopeId)) {
    throw new HeliosValidationError("Package envelope ID is invalid.");
  }
  if (
    typeof input.adapter !== "string" ||
    !HELIOS_PACKAGE_ADAPTERS.includes(input.adapter as HeliosPackageAdapter)
  ) {
    throw new HeliosValidationError("Package adapter is invalid.");
  }
  if (input.manifestVersion !== HELIOS_MANIFEST_VERSION) {
    throw new HeliosValidationError("Package manifest version is unsupported.");
  }
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
    typeof input.revisionKind !== "string" ||
    !HELIOS_PACKAGE_REVISION_KINDS.includes(
      input.revisionKind as HeliosPackageRevisionKind,
    )
  ) {
    throw new HeliosValidationError("Package revision purpose is invalid.");
  }
  const revisionKind = input.revisionKind as HeliosPackageRevisionKind;
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
  let acceptedPdfCount = 0;
  let writtenScopeCount = 0;
  let acceptedBytes = 0;
  const paths = new Set<string>();
  const entries = input.entries.map((value, index) => {
    const row = record(value, `Package entry ${index + 1}`);
    const kind =
      typeof row.kind === "string" &&
      HELIOS_PACKAGE_ENTRY_KINDS.includes(row.kind as HeliosPackageEntryKind)
        ? (row.kind as HeliosPackageEntryKind)
        : "pdf";
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
    const defaultCategory: HeliosPackageSourceCategory =
      kind === "written_scope"
        ? "written_scope"
        : revisionKind === "addendum"
          ? "addendum"
          : "unknown";
    const sourceCategory =
      typeof row.sourceCategory === "string" &&
      HELIOS_PACKAGE_SOURCE_CATEGORIES.includes(
        row.sourceCategory as HeliosPackageSourceCategory,
      )
        ? (row.sourceCategory as HeliosPackageSourceCategory)
        : defaultCategory;
    const sha256 =
      row.sha256 === undefined
        ? undefined
        : typeof row.sha256 === "string" && /^[a-f0-9]{64}$/.test(row.sha256)
          ? row.sha256
          : (() => {
              throw new HeliosValidationError("Package entry hash is invalid.");
            })();
    let title: string | undefined;
    let content: string | undefined;
    let sourceLocation: string | undefined;
    if (row.accepted) {
      if (kind === "written_scope") {
        title = textValue(row.title, "Written scope title", 160);
        if (typeof row.content !== "string" || !row.content.trim()) {
          throw new HeliosValidationError("Written scope content is required.");
        }
        const scopeBytes = new TextEncoder().encode(row.content).byteLength;
        if (
          scopeBytes <= 0 ||
          scopeBytes > HELIOS_MAX_WRITTEN_SCOPE_BYTES ||
          row.size !== scopeBytes
        ) {
          throw new HeliosValidationError(
            "Written scope size does not match the manifest or exceeds 128 KB.",
          );
        }
        if (!sha256) {
          throw new HeliosValidationError("Written scope hash is required.");
        }
        content = row.content;
        sourceLocation = optionalLabeledText(
          row.sourceLocation,
          "Written scope source",
          500,
        );
        writtenScopeCount += 1;
      } else {
        validatePdfCandidate({
          name: relativePath,
          type: "application/pdf",
          size: row.size,
        });
        if (!sha256) {
          throw new HeliosValidationError("PDF manifest hash is required.");
        }
        acceptedPdfCount += 1;
      }
      acceptedCount += 1;
      acceptedBytes += row.size;
    }
    return {
      kind,
      sourceCategory,
      relativePath,
      size: row.size,
      sha256,
      title,
      content,
      sourceLocation,
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
  if (!acceptedCount || acceptedPdfCount > HELIOS_MAX_UPLOAD_BATCH) {
    throw new HeliosValidationError(
      `A package must contain a written scope or up to ${HELIOS_MAX_UPLOAD_BATCH} valid PDFs.`,
    );
  }
  if (
    input.sourceType === "written_scope" &&
    writtenScopeCount !== acceptedCount
  ) {
    throw new HeliosValidationError(
      "A written-scope package can contain only written-scope evidence.",
    );
  }
  if (acceptedBytes > HELIOS_MAX_PACKAGE_BYTES) {
    throw new HeliosValidationError("The package is too large.");
  }
  return {
    envelopeId,
    adapter: input.adapter as HeliosPackageAdapter,
    manifestVersion: HELIOS_MANIFEST_VERSION,
    name,
    sourceType: input.sourceType as HeliosPackageSourceType,
    revisionKind,
    revisionLabel: optionalLabeledText(
      input.revisionLabel,
      "Revision label",
      120,
    ),
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
  const ownerItemSequences = new Set<number>();
  const sourceSections = input.sections.map((sectionValue, sectionIndex) => {
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
      const officialSequence = Math.round(
          finiteNonNegative(
            item.officialSequence ?? itemIndex,
            "Official item sequence",
          ),
        );
      if (ownerItemSequences.has(officialSequence)) {
        throw new HeliosValidationError(`Owner item sequence ${officialSequence} is duplicated.`);
      }
      ownerItemSequences.add(officialSequence);
      const itemType = allowedValue(
        item.itemType ?? (item.bidUnit === "LS" ? "lump_sum" : "unit_price"),
        HELIOS_OWNER_PAY_ITEM_TYPES,
        "Owner item type",
      );
      const fixedAmountCents =
        item.fixedAmountCents === null || item.fixedAmountCents === undefined
          ? undefined
          : safeCents(item.fixedAmountCents as number, "Official fixed amount");
      if (["fixed_price", "allowance"].includes(itemType) && fixedAmountCents === undefined) {
        throw new HeliosValidationError(
          `Owner item ${officialItemNumber} requires its official fixed amount.`,
        );
      }
      return {
        officialSequence,
        officialItemNumber,
        description: textValue(item.description, "Owner item description", 400),
        estimatorDescription:
          item.estimatorDescription === null || item.estimatorDescription === undefined
            ? undefined
            : textValue(item.estimatorDescription, "Estimator description", 240),
        bidQuantity,
        bidUnit: textValue(item.bidUnit, "Bid unit", 40),
        itemType,
        fixedAmountCents,
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

  const wbsBuckets = new Map<
    string,
    {
      key: string;
      name: string;
      sequence: number;
      evidenceIds: Set<string>;
      payItems: HeliosEstimateProposalPayItemInput[];
    }
  >();
  for (const sourceSection of sourceSections) {
    for (const payItem of sourceSection.payItems) {
      const wbsSection = classifyEstimateWbsSection({
        officialItemNumber: payItem.officialItemNumber,
        description: payItem.description,
        estimatorDescription: payItem.estimatorDescription,
        supportingText: payItem.costCodes.map(
          (code) => `${code.code} ${code.description}`,
        ),
      });
      const bucket = wbsBuckets.get(wbsSection.id) || {
        key: wbsSection.id,
        name: wbsSection.displayName,
        sequence: wbsSection.sortOrder,
        evidenceIds: new Set<string>(),
        payItems: [],
      };
      sourceSection.evidenceIds.forEach((id) => bucket.evidenceIds.add(id));
      payItem.evidenceIds.forEach((id) => bucket.evidenceIds.add(id));
      bucket.payItems.push(payItem);
      wbsBuckets.set(wbsSection.id, bucket);
    }
  }
  const sections = HELIOS_ESTIMATE_WBS.flatMap((wbsSection) => {
    const bucket = wbsBuckets.get(wbsSection.id);
    if (!bucket?.payItems.length) return [];
    return [
      {
        ...bucket,
        evidenceIds: [...bucket.evidenceIds],
        payItems: [...bucket.payItems].sort(
          (left, right) => left.officialSequence - right.officialSequence,
        ),
      },
    ];
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

export function normalizeEstimateReviewInput(
  value: unknown,
): HeliosEstimateReviewInput {
  const input = record(value, "Estimate review");
  const recordType = allowedValue(
    input.recordType,
    ["section", "pay_item"] as const,
    "Estimate record type",
  );
  const action = allowedValue(
    input.action,
    HELIOS_ESTIMATE_REVIEW_ACTIONS,
    "Estimate review action",
  );
  const recordId = textValue(input.recordId, "Estimate record", 128);
  const comment =
    input.comment === undefined || input.comment === null || input.comment === ""
      ? undefined
      : textValue(input.comment, "Review note", 2000);
  if (["reject", "defer", "merge", "split", "map"].includes(action) && !comment) {
    throw new HeliosValidationError("A review note is required for this action.");
  }
  const targetRecordId =
    input.targetRecordId === undefined || input.targetRecordId === null
      ? undefined
      : textValue(input.targetRecordId, "Target record", 128);
  if (["merge", "map"].includes(action) && !targetRecordId) {
    throw new HeliosValidationError("Select a target record for this action.");
  }
  const correctionValue = input.correction === undefined
    ? undefined
    : record(input.correction, "Estimate correction");
  if (action === "correct" && !correctionValue) {
    throw new HeliosValidationError("Corrected record values are required.");
  }
  const splitValue = input.split === undefined
    ? undefined
    : record(input.split, "Estimate split");
  if (action === "split" && !splitValue) {
    throw new HeliosValidationError("Split record values are required.");
  }
  const optionalString = (candidate: unknown, label: string, maximum: number) =>
    candidate === undefined || candidate === null || candidate === ""
      ? undefined
      : textValue(candidate, label, maximum);
  const optionalNumber = (candidate: unknown, label: string, cents = false) => {
    if (candidate === undefined || candidate === null || candidate === "") return undefined;
    return cents
      ? safeCents(candidate as number, label)
      : optionalPositiveQuantity(candidate, label);
  };
  const normalizeItemFields = (source: Record<string, unknown>) => ({
    officialSequence:
      source.officialSequence === undefined
        ? undefined
        : Math.round(finiteNonNegative(source.officialSequence, "Official sequence")),
    officialItemNumber: optionalString(source.officialItemNumber, "Official item number", 80),
    description: optionalString(source.description, "Owner item description", 400),
    estimatorDescription: optionalString(source.estimatorDescription, "Estimator description", 240),
    bidQuantity: optionalNumber(source.bidQuantity, "Bid quantity"),
    bidUnit: optionalString(source.bidUnit, "Bid unit", 40),
    itemType:
      source.itemType === undefined
        ? undefined
        : allowedValue(source.itemType, HELIOS_OWNER_PAY_ITEM_TYPES, "Owner item type"),
    fixedAmountCents: optionalNumber(source.fixedAmountCents, "Official fixed amount", true),
  });
  const correction = correctionValue
    ? {
        ...normalizeItemFields(correctionValue),
        name: optionalString(correctionValue.name, "Section name", 160),
        sequence:
          correctionValue.sequence === undefined
            ? undefined
            : Math.round(finiteNonNegative(correctionValue.sequence, "Section sequence")),
        sectionId: optionalString(correctionValue.sectionId, "Section", 128),
      }
    : undefined;
  const split = splitValue
    ? {
        ...normalizeItemFields(splitValue),
        name: optionalString(splitValue.name, "Section name", 160),
        moveRecordIds: Array.isArray(splitValue.moveRecordIds)
          ? splitValue.moveRecordIds.map((id) => textValue(id, "Moved record", 128))
          : undefined,
      }
    : undefined;
  return { recordType, recordId, action, comment, targetRecordId, correction, split };
}

export function normalizeEstimateBuildInput(value: unknown): HeliosEstimateBuildInput {
  const input = record(value, "Estimate build action");
  const action = allowedValue(input.action, HELIOS_ESTIMATE_BUILD_ACTIONS, "Build action");
  const optionalString = (candidate: unknown, label: string, maximum: number) =>
    candidate === undefined || candidate === null || candidate === ""
      ? undefined
      : textValue(candidate, label, maximum);
  const optionalQuantity = (candidate: unknown, label: string) =>
    candidate === undefined || candidate === null || candidate === ""
      ? undefined
      : optionalPositiveQuantity(candidate, label);
  const basisPoints = (candidate: unknown, label: string) => {
    const result = candidate === undefined || candidate === null || candidate === ""
      ? 0
      : Math.round(finiteNonNegative(candidate, label));
    if (result > 100_000) throw new HeliosValidationError(`${label} cannot exceed 1,000%.`);
    return result;
  };
  const payItemId = optionalString(input.payItemId, "Owner pay item", 128);
  const costCodeId = optionalString(input.costCodeId, "Cost code", 128);
  const resourceId = optionalString(input.resourceId, "Resource", 128);
  const quantityId = optionalString(input.quantityId, "Quantity record", 128);
  const allocationId = optionalString(input.allocationId, "Allocation", 128);
  const comment = optionalString(input.comment, "Build note", 1_000);
  const allocationRequired = input.allocationRequired === undefined
    ? undefined
    : input.allocationRequired;
  if (allocationRequired !== undefined && typeof allocationRequired !== "boolean") {
    throw new HeliosValidationError("Allocation-required state must be true or false.");
  }

  let costCode: HeliosEstimateBuildInput["costCode"];
  if (input.costCode !== undefined) {
    const source = record(input.costCode, "Cost code values");
    costCode = {
      code: textValue(source.code, "Cost code", 80),
      description: textValue(source.description, "Cost code description", 240),
      scopeOwnership: allowedValue(
        source.scopeOwnership,
        HELIOS_ESTIMATE_SCOPE_OWNERSHIP,
        "Scope ownership",
      ),
      productionQuantity: optionalQuantity(source.productionQuantity, "Production quantity"),
      productionUnit: textValue(source.productionUnit, "Production unit", 40),
    };
  }

  let resource: HeliosEstimateBuildInput["resource"];
  if (input.resource !== undefined) {
    const source = record(input.resource, "Resource values");
    const rateStatus = allowedValue(source.rateStatus, HELIOS_ESTIMATE_RATE_STATUSES, "Price source");
    const rateCents = source.rateCents === undefined || source.rateCents === null || source.rateCents === ""
      ? undefined
      : safeCents(source.rateCents as number, "Source rate");
    const overrideRateCents = source.overrideRateCents === undefined || source.overrideRateCents === null || source.overrideRateCents === ""
      ? undefined
      : safeCents(source.overrideRateCents as number, "Override rate");
    const priceSourceLabel = optionalString(source.priceSourceLabel, "Price source label", 160);
    const priceSourceReference = optionalString(source.priceSourceReference, "Price source reference", 240);
    const effectiveDate = optionalString(source.effectiveDate, "Effective date", 10);
    const overrideReason = optionalString(source.overrideReason, "Override reason", 500);
    if (rateStatus === "unpriced" && (rateCents !== undefined || overrideRateCents !== undefined)) {
      throw new HeliosValidationError("Unpriced resources cannot contain a source or override rate.");
    }
    if (rateStatus !== "unpriced") {
      if (rateCents === undefined || !priceSourceLabel || !effectiveDate) {
        throw new HeliosValidationError("Priced resources require a source rate, source label, and effective date.");
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || Number.isNaN(Date.parse(`${effectiveDate}T00:00:00Z`))) {
        throw new HeliosValidationError("Enter a valid effective date in YYYY-MM-DD format.");
      }
      if (rateStatus !== "user_entered" && !priceSourceReference) {
        throw new HeliosValidationError("Quotes, databases, crews, and historical prices require a source reference.");
      }
    }
    if (overrideRateCents !== undefined && !overrideReason) {
      throw new HeliosValidationError("A reason is required for every estimator rate override.");
    }
    resource = {
      resourceClass: allowedValue(source.resourceClass, HELIOS_ESTIMATE_RESOURCE_CLASSES, "Resource class"),
      description: textValue(source.description, "Resource description", 240),
      quantity: optionalQuantity(source.quantity, "Resource quantity"),
      unit: textValue(source.unit, "Resource unit", 40),
      wasteBasisPoints: basisPoints(source.wasteBasisPoints, "Waste"),
      durationHours: optionalQuantity(source.durationHours, "Duration"),
      taxStatus: allowedValue(source.taxStatus, ["taxable", "exempt", "unknown"] as const, "Tax status"),
      rateStatus,
      rateCents,
      priceSourceLabel,
      priceSourceReference,
      effectiveDate,
      crewOrAssembly: optionalString(source.crewOrAssembly, "Crew or assembly", 160),
      escalationBasisPoints: basisPoints(source.escalationBasisPoints, "Escalation"),
      overrideRateCents,
      overrideReason,
    };
  }

  let quantity: HeliosEstimateBuildInput["quantity"];
  if (input.quantity !== undefined) {
    const source = record(input.quantity, "Quantity values");
    const quantityType = allowedValue(source.quantityType, HELIOS_QUANTITY_RECORD_TYPES, "Quantity type");
    const use = allowedValue(source.use, HELIOS_QUANTITY_RECORD_USES, "Quantity use");
    const value = optionalQuantity(source.value, "Quantity");
    if (!["takeoff_required", "included_in_another_item"].includes(quantityType) && value === undefined) {
      throw new HeliosValidationError("A positive quantity is required for this quantity type.");
    }
    if (quantityType === "takeoff_required" && value !== undefined) {
      throw new HeliosValidationError("Takeoff Required must remain unknown; do not enter zero or a placeholder quantity.");
    }
    const confidence = Math.round(finiteNonNegative(source.confidence, "Quantity confidence"));
    if (confidence > 100) throw new HeliosValidationError("Quantity confidence cannot exceed 100%.");
    quantity = {
      value,
      unit: textValue(source.unit, "Quantity unit", 40),
      quantityType,
      sourceLabel: textValue(source.sourceLabel, "Quantity source", 160),
      sourceReference: optionalString(source.sourceReference, "Quantity source reference", 240),
      method: textValue(source.method, "Quantity method", 500),
      confidence,
      use,
    };
  }

  let allocation: HeliosEstimateBuildInput["allocation"];
  if (input.allocation !== undefined) {
    const source = record(input.allocation, "Allocation values");
    const allocationType = allowedValue(
      source.allocationType,
      ["quantity", "percent", "amount"] as const,
      "Allocation method",
    );
    const controllingValue = allocationType === "amount"
      ? safeCents(source.controllingValue as number, "Allocation amount")
      : optionalPositiveQuantity(source.controllingValue, "Allocation value");
    if (controllingValue === undefined || controllingValue <= 0) {
      throw new HeliosValidationError("Allocation value must be greater than zero.");
    }
    if (allocationType === "percent" && (!Number.isInteger(controllingValue) || controllingValue > 10_000)) {
      throw new HeliosValidationError("Allocation percent must be whole basis points between 1 and 10,000.");
    }
    allocation = {
      targetPayItemId: textValue(source.targetPayItemId, "Allocation destination", 128),
      targetCostCodeId: optionalString(source.targetCostCodeId, "Destination cost code", 128),
      allocationType,
      controllingValue,
    };
  }

  if (action === "create_cost_code" && (!payItemId || !costCode)) {
    throw new HeliosValidationError("Select an owner pay item and enter cost-code values.");
  }
  if (action === "update_cost_code" && (!costCodeId || !costCode)) {
    throw new HeliosValidationError("Select a cost code and enter its corrected values.");
  }
  if (["accept_cost_code", "reject_cost_code"].includes(action) && !costCodeId) {
    throw new HeliosValidationError("Select a cost code.");
  }
  if (action === "create_resource" && (!costCodeId || !resource)) {
    throw new HeliosValidationError("Select a cost code and enter resource values.");
  }
  if (action === "update_resource" && (!resourceId || !resource)) {
    throw new HeliosValidationError("Select a resource and enter its corrected values.");
  }
  if (["accept_resource", "reject_resource"].includes(action) && !resourceId) {
    throw new HeliosValidationError("Select a resource.");
  }
  if (action === "create_quantity" && (!costCodeId || !quantity)) {
    throw new HeliosValidationError("Select a cost code and enter quantity values.");
  }
  if (["accept_quantity", "reject_quantity"].includes(action) && !quantityId) {
    throw new HeliosValidationError("Select a quantity record.");
  }
  if (action === "mark_takeoff_required" && !costCodeId) {
    throw new HeliosValidationError("Select a cost code.");
  }
  if (action === "set_allocation_required" && (!costCodeId || allocationRequired === undefined)) {
    throw new HeliosValidationError("Select a cost code and allocation state.");
  }
  if (action === "create_allocation" && (!costCodeId || !allocation)) {
    throw new HeliosValidationError("Select a source cost code and enter allocation values.");
  }
  if (action === "update_allocation" && (!allocationId || !allocation)) {
    throw new HeliosValidationError("Select an allocation and enter its corrected values.");
  }
  if (["accept_allocation", "reject_allocation"].includes(action) && !allocationId) {
    throw new HeliosValidationError("Select an allocation.");
  }
  if (action.startsWith("reject_") && !comment) {
    throw new HeliosValidationError("A rejection reason is required.");
  }
  return {
    action,
    payItemId,
    costCodeId,
    resourceId,
    quantityId,
    allocationId,
    comment,
    allocationRequired,
    costCode,
    resource,
    quantity,
    allocation,
  };
}

export function normalizeEstimateSupportInput(value: unknown): HeliosEstimateSupportInput {
  const input = record(value, "Estimate supporting-record action");
  const action = allowedValue(input.action, HELIOS_ESTIMATE_SUPPORT_ACTIONS, "Supporting-record action");
  const optionalString = (candidate: unknown, label: string, maximum: number) =>
    candidate === undefined || candidate === null || candidate === ""
      ? undefined
      : textValue(candidate, label, maximum);
  const optionalId = (candidate: unknown, label: string) => optionalString(candidate, label, 128);
  const optionalDate = (candidate: unknown, label: string) => {
    const result = optionalString(candidate, label, 10);
    if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`)))) {
      throw new HeliosValidationError(`${label} must be a valid date in YYYY-MM-DD format.`);
    }
    return result;
  };
  const stringList = (candidate: unknown, label: string, maximumItems = 80) => {
    if (candidate === undefined || candidate === null) return [];
    if (!Array.isArray(candidate) || candidate.length > maximumItems) {
      throw new HeliosValidationError(`${label} must be a bounded list.`);
    }
    return candidate.map((item, index) => textValue(item, `${label} ${index + 1}`, 500));
  };
  const optionalCents = (candidate: unknown, label: string) =>
    candidate === undefined || candidate === null || candidate === ""
      ? undefined
      : safeCents(candidate as number, label);
  const optionalDays = (candidate: unknown, label: string) =>
    candidate === undefined || candidate === null || candidate === ""
      ? undefined
      : finiteNonNegative(candidate, label);

  const costCodeId = optionalId(input.costCodeId, "Cost code");
  const rfqId = optionalId(input.rfqId, "RFQ");
  const submittalId = optionalId(input.submittalId, "Submittal");
  const riskId = optionalId(input.riskId, "Risk");
  const evidenceId = optionalId(input.evidenceId, "Evidence");
  const recordType = input.recordType === undefined
    ? undefined
    : allowedValue(input.recordType, HELIOS_ESTIMATE_EVIDENCE_RECORD_TYPES, "Evidence record type");
  const recordId = optionalId(input.recordId, "Evidence record");
  const comment = optionalString(input.comment, "Supporting-record note", 2_000);
  const rfqStatus = input.rfqStatus === undefined
    ? undefined
    : allowedValue(input.rfqStatus, HELIOS_RFQ_STATUSES, "RFQ status");
  const submittalStatus = input.submittalStatus === undefined
    ? undefined
    : allowedValue(input.submittalStatus, HELIOS_SUBMITTAL_STATUSES, "Submittal status");
  const riskCarryDecision = input.riskCarryDecision === undefined
    ? undefined
    : allowedValue(input.riskCarryDecision, HELIOS_RISK_CARRY_DECISIONS, "Risk carry decision");

  let rfq: HeliosEstimateSupportInput["rfq"];
  if (input.rfq !== undefined) {
    const source = record(input.rfq, "RFQ values");
    rfq = {
      title: textValue(source.title, "RFQ title", 240),
      packageNumber: optionalString(source.packageNumber, "RFQ package number", 80),
      requiredQuoteDate: optionalDate(source.requiredQuoteDate, "Required quote date"),
      deliveryLocation: optionalString(source.deliveryLocation, "Delivery location", 240),
      inclusions: stringList(source.inclusions, "RFQ inclusion"),
      exclusions: stringList(source.exclusions, "RFQ exclusion"),
      scheduleConstraints: stringList(source.scheduleConstraints, "RFQ schedule constraint"),
      vendors: stringList(source.vendors, "RFQ vendor", 30),
    };
  }

  let submittal: HeliosEstimateSupportInput["submittal"];
  if (input.submittal !== undefined) {
    const source = record(input.submittal, "Submittal values");
    submittal = {
      type: allowedValue(source.type, HELIOS_SUBMITTAL_TYPES, "Submittal type"),
      description: textValue(source.description, "Submittal description", 400),
      specification: optionalString(source.specification, "Submittal specification", 160),
      timing: optionalString(source.timing, "Submittal timing", 240),
      responsibility: optionalString(source.responsibility, "Submittal responsibility", 160),
      predecessor: optionalString(source.predecessor, "Submittal predecessor", 240),
      dueDate: optionalDate(source.dueDate, "Submittal due date"),
    };
  }

  let risk: HeliosEstimateSupportInput["risk"];
  if (input.risk !== undefined) {
    const source = record(input.risk, "Risk values");
    const probabilityPercent = Math.round(finiteNonNegative(source.probabilityPercent, "Risk probability"));
    if (probabilityPercent > 100) throw new HeliosValidationError("Risk probability cannot exceed 100%.");
    const lowCostCents = optionalCents(source.lowCostCents, "Low cost exposure");
    const mostLikelyCostCents = optionalCents(source.mostLikelyCostCents, "Most-likely cost exposure");
    const highCostCents = optionalCents(source.highCostCents, "High cost exposure");
    const lowScheduleDays = optionalDays(source.lowScheduleDays, "Low schedule exposure");
    const mostLikelyScheduleDays = optionalDays(source.mostLikelyScheduleDays, "Most-likely schedule exposure");
    const highScheduleDays = optionalDays(source.highScheduleDays, "High schedule exposure");
    if (lowCostCents !== undefined && mostLikelyCostCents !== undefined && lowCostCents > mostLikelyCostCents) {
      throw new HeliosValidationError("Low cost exposure cannot exceed the most-likely exposure.");
    }
    if (mostLikelyCostCents !== undefined && highCostCents !== undefined && mostLikelyCostCents > highCostCents) {
      throw new HeliosValidationError("Most-likely cost exposure cannot exceed the high exposure.");
    }
    if (lowScheduleDays !== undefined && mostLikelyScheduleDays !== undefined && lowScheduleDays > mostLikelyScheduleDays) {
      throw new HeliosValidationError("Low schedule exposure cannot exceed the most-likely exposure.");
    }
    if (mostLikelyScheduleDays !== undefined && highScheduleDays !== undefined && mostLikelyScheduleDays > highScheduleDays) {
      throw new HeliosValidationError("Most-likely schedule exposure cannot exceed the high exposure.");
    }
    risk = {
      category: allowedValue(source.category, HELIOS_RISK_CATEGORIES, "Risk category"),
      severity: allowedValue(source.severity, HELIOS_RISK_SEVERITIES, "Risk severity"),
      title: textValue(source.title, "Risk title", 240),
      detail: textValue(source.detail, "Risk detail", 1_600),
      probabilityPercent,
      lowCostCents,
      mostLikelyCostCents,
      highCostCents,
      lowScheduleDays,
      mostLikelyScheduleDays,
      highScheduleDays,
      mitigationCostCents: optionalCents(source.mitigationCostCents, "Mitigation cost"),
      mitigation: textValue(source.mitigation, "Risk mitigation", 800),
      contingencyResponse: optionalString(source.contingencyResponse, "Contingency response", 800),
      owner: textValue(source.owner, "Risk owner", 160),
      responseDueDate: optionalDate(source.responseDueDate, "Risk response due date"),
      disposition: allowedValue(source.disposition, HELIOS_RISK_DISPOSITIONS, "Risk disposition"),
      linkedPayItemIds: stringList(source.linkedPayItemIds, "Linked owner item", 250),
      linkedCostCodeIds: stringList(source.linkedCostCodeIds, "Linked cost code", 500),
      linkedQuantityIds: stringList(source.linkedQuantityIds, "Linked quantity", 500),
    };
  }

  if (["generate_rfq", "generate_submittal"].includes(action) && !costCodeId) {
    throw new HeliosValidationError("Select an accepted cost code.");
  }
  if (action === "update_rfq" && (!rfqId || !rfq)) throw new HeliosValidationError("Select an RFQ and enter its values.");
  if (["accept_rfq", "reject_rfq", "set_rfq_status"].includes(action) && !rfqId) throw new HeliosValidationError("Select an RFQ.");
  if (action === "set_rfq_status" && !rfqStatus) throw new HeliosValidationError("Select an RFQ status.");
  if (action === "update_submittal" && (!submittalId || !submittal)) throw new HeliosValidationError("Select a submittal and enter its values.");
  if (["accept_submittal", "reject_submittal", "set_submittal_status"].includes(action) && !submittalId) throw new HeliosValidationError("Select a submittal.");
  if (action === "set_submittal_status" && !submittalStatus) throw new HeliosValidationError("Select a submittal status.");
  if (action === "update_risk" && (!riskId || !risk)) throw new HeliosValidationError("Select a risk and enter its values.");
  if (["accept_risk", "reject_risk", "set_risk_decision"].includes(action) && !riskId) throw new HeliosValidationError("Select a risk.");
  if (action === "set_risk_decision" && !riskCarryDecision) throw new HeliosValidationError("Select a risk carry decision.");
  if (["verify_evidence", "dispute_evidence"].includes(action) && (!evidenceId || !recordType || !recordId)) {
    throw new HeliosValidationError("Select evidence and its linked estimate record.");
  }
  if (["reject_rfq", "reject_submittal", "reject_risk", "dispute_evidence"].includes(action) && !comment) {
    throw new HeliosValidationError("A concise reason is required for this decision.");
  }
  return {
    action,
    costCodeId,
    rfqId,
    submittalId,
    riskId,
    evidenceId,
    recordType,
    recordId,
    comment,
    rfqStatus,
    submittalStatus,
    riskCarryDecision,
    rfq,
    submittal,
    risk,
  };
}

export function calculateRiskExpectedExposure(
  probabilityPercent: number,
  mostLikelyCostCents?: number,
) {
  if (mostLikelyCostCents === undefined) return undefined;
  return Math.round((mostLikelyCostCents * probabilityPercent) / 100);
}

export function calculateEstimateReviewSummary(
  records: Array<{ reviewStatus: HeliosEstimateReviewStatus }>,
  blockers: string[] = [],
): HeliosEstimateReviewSummary {
  const counts = { proposed: 0, deferred: 0, accepted: 0, corrected: 0, rejected: 0 };
  for (const record of records) counts[record.reviewStatus] += 1;
  const total = records.length;
  const reviewed = counts.accepted + counts.corrected + counts.rejected;
  return {
    total,
    ...counts,
    reviewed,
    percentComplete: total ? Math.round((reviewed / total) * 100) : 0,
    canAcceptImport: total > 0 && counts.proposed === 0 && counts.deferred === 0 && blockers.length === 0,
    blockers,
  };
}

function safeCents(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HeliosValidationError(`${label} must be a non-negative integer number of cents.`);
  }
  return value;
}

export function calculateResourceCost(resource: Pick<
  HeliosEstimateResource,
  "quantity" | "rateCents" | "overrideRateCents"
> & { wasteBasisPoints?: number; escalationBasisPoints?: number }) {
  const effectiveRateCents = resource.overrideRateCents ?? resource.rateCents;
  if (resource.quantity === undefined || effectiveRateCents === undefined) return undefined;
  safeCents(effectiveRateCents, "Resource rate");
  const wasteFactor = 1 + (resource.wasteBasisPoints || 0) / 10_000;
  const escalationFactor = 1 + (resource.escalationBasisPoints || 0) / 10_000;
  const total = Math.round(resource.quantity * wasteFactor * effectiveRateCents * escalationFactor);
  if (!Number.isSafeInteger(total)) throw new HeliosValidationError("Resource cost exceeds the supported range.");
  return total;
}

export function calculateCostCodeDirectCost(resources: Array<Pick<
  HeliosEstimateResource,
  "quantity" | "rateCents" | "overrideRateCents"
> & { wasteBasisPoints?: number; escalationBasisPoints?: number }>) {
  if (!resources.length) return undefined;
  let total = 0;
  for (const resource of resources) {
    const cost = calculateResourceCost(resource);
    if (cost === undefined) return undefined;
    total = safeCents(total + cost, "Cost code total");
  }
  return total;
}

export function calculatePricingStatus(
  resources: Array<Pick<HeliosEstimateResource, "quantity" | "rateCents" | "overrideRateCents">>,
): HeliosEstimatePricingStatus {
  if (!resources.length) return "unpriced";
  const priced = resources.filter(
    (resource) => resource.quantity !== undefined && (resource.overrideRateCents ?? resource.rateCents) !== undefined,
  ).length;
  if (priced === 0) return "unpriced";
  return priced === resources.length ? "priced" : "partial";
}

export function calculateDerivedUnitCost(directCostCents: number | undefined, bidQuantity: number | undefined) {
  if (directCostCents === undefined || bidQuantity === undefined || bidQuantity <= 0) return undefined;
  return Math.round(safeCents(directCostCents, "Direct cost") / bidQuantity);
}

export function calculateAllocationBalance(
  allocations: Array<Pick<HeliosEstimateAllocation, "quantity" | "percentBasisPoints" | "amountCents"> & { allocationType?: HeliosEstimateAllocation["allocationType"] }>,
): { quantity: number; percentBasisPoints: number; amountCents: number } {
  return allocations.reduce<{ quantity: number; percentBasisPoints: number; amountCents: number }>(
    (totals, allocation) => ({
      quantity: totals.quantity + (allocation.quantity || 0),
      percentBasisPoints: totals.percentBasisPoints + (allocation.percentBasisPoints || 0),
      amountCents: totals.amountCents + (allocation.amountCents || 0),
    }),
    { quantity: 0, percentBasisPoints: 0, amountCents: 0 },
  );
}

function roundedQuantity(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function deriveAllocationValues(input: {
  allocationType: "quantity" | "percent" | "amount";
  controllingValue: number;
  sourceQuantity?: number;
  sourceCostCents?: number;
}) {
  if (!Number.isFinite(input.controllingValue) || input.controllingValue <= 0) {
    throw new HeliosValidationError("Allocation value must be greater than zero.");
  }
  const sourceQuantity = input.sourceQuantity;
  const sourceCostCents = input.sourceCostCents;
  let ratio: number;
  if (input.allocationType === "quantity") {
    if (sourceQuantity === undefined || sourceQuantity <= 0) {
      throw new HeliosValidationError("A reviewed production quantity is required for quantity-based allocation.");
    }
    ratio = input.controllingValue / sourceQuantity;
  } else if (input.allocationType === "percent") {
    if (!Number.isInteger(input.controllingValue) || input.controllingValue > 10_000) {
      throw new HeliosValidationError("Allocation percent must be whole basis points between 1 and 10,000.");
    }
    ratio = input.controllingValue / 10_000;
  } else {
    safeCents(input.controllingValue, "Allocation amount");
    if (sourceCostCents === undefined || sourceCostCents <= 0) {
      throw new HeliosValidationError("A fully priced source cost code is required for amount-based allocation.");
    }
    ratio = input.controllingValue / sourceCostCents;
  }
  if (ratio > 1) throw new HeliosValidationError("An allocation cannot exceed its source quantity or cost.");
  return {
    quantity: sourceQuantity === undefined ? undefined : roundedQuantity(sourceQuantity * ratio),
    percentBasisPoints: Math.round(ratio * 10_000),
    amountCents: sourceCostCents === undefined ? undefined : Math.round(sourceCostCents * ratio),
  };
}

export function reconcileAllocations(input: {
  allocationRequired: boolean;
  sourceQuantity?: number;
  sourceCostCents?: number;
  allocations: Array<Pick<
    HeliosEstimateAllocation,
    "targetPayItemId" | "targetCostCodeId" | "quantity" | "percentBasisPoints" | "amountCents" | "reviewStatus"
  >>;
}) {
  if (!input.allocationRequired) {
    return { status: "balanced" as const, issues: [] as string[], totals: calculateAllocationBalance([]) };
  }
  const active = input.allocations.filter((allocation) => allocation.reviewStatus !== "rejected");
  if (!active.length) {
    return {
      status: "orphan" as const,
      issues: ["Shared cost has no allocation destinations."],
      totals: calculateAllocationBalance([]),
    };
  }
  const keys = new Set<string>();
  const duplicateDestinations = new Set<string>();
  for (const allocation of active) {
    const key = `${allocation.targetPayItemId}:${allocation.targetCostCodeId || "item"}`;
    if (keys.has(key)) duplicateDestinations.add(key);
    keys.add(key);
  }
  const totals = calculateAllocationBalance(active);
  if (duplicateDestinations.size) {
    return {
      status: "duplicate" as const,
      issues: ["The same destination receives this source cost more than once."],
      totals,
    };
  }
  const issues: string[] = [];
  if (input.sourceQuantity === undefined || input.sourceCostCents === undefined) {
    issues.push("Source production quantity and fully priced direct cost are required before allocations can balance.");
  }
  if (totals.percentBasisPoints !== 10_000) issues.push("Allocated percentages must total exactly 100%. ");
  if (input.sourceQuantity !== undefined && Math.abs(totals.quantity - input.sourceQuantity) > 0.000001) {
    issues.push("Allocated quantities do not reconcile to the source production quantity.");
  }
  if (input.sourceCostCents !== undefined && totals.amountCents !== input.sourceCostCents) {
    issues.push("Allocated dollars do not reconcile to the source direct cost.");
  }
  return {
    status: issues.length
      ? input.sourceQuantity === undefined || input.sourceCostCents === undefined
        ? "incomplete" as const
        : "unbalanced" as const
      : "balanced" as const,
    issues,
    totals,
  };
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
