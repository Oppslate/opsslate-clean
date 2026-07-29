export const HELIOS_PLAN_RUN_STATUSES = [
  "not_applicable_to_current_basis",
  "queued",
  "processing",
  "ready_for_review",
  "partially_ready",
  "failed",
] as const;

export const HELIOS_PLAN_PAGE_KINDS = ["sheet", "non_sheet", "exception"] as const;
export const HELIOS_PLAN_MODALITIES = ["vector", "scanned", "hybrid", "unusable"] as const;
export const HELIOS_PLAN_VIEW_TYPES = [
  "plan",
  "profile",
  "section",
  "detail",
  "schedule",
  "legend",
  "note",
  "calculation",
  "title_block",
  "other",
] as const;
export const HELIOS_PLAN_REFERENCE_TYPES = [
  "detail_callout",
  "section_callout",
  "match_line",
  "continuation",
  "plan_profile",
  "key_map",
  "schedule",
  "specification",
  "standard_detail",
  "other",
] as const;
export const HELIOS_PLAN_CALIBRATION_SOURCES = [
  "stated_numeric",
  "graphic_scale",
  "known_dimension",
  "estimator",
] as const;
export const HELIOS_PLAN_CALIBRATION_STATUSES = [
  "proposed",
  "approved",
  "conflicted",
  "blocked",
  "superseded",
] as const;
export const HELIOS_PLAN_REVIEW_ACTIONS = [
  "request_reconstruction",
  "approve_calibration",
  "block_calibration",
  "resolve_sheet_conflict",
] as const;
export const HELIOS_PLAN_SHEET_ROLES = [
  "current_bid",
  "permit_reference",
  "superseded",
  "unresolved",
] as const;
export const HELIOS_PLAN_SHEET_CONFLICT_TYPES = [
  "version_conflict",
  "identifier_collision",
] as const;
export const HELIOS_PLAN_SHEET_DECISIONS = [
  "apply_recommended",
  "use_as_current",
  "keep_both",
  "escalate",
] as const;

export type HeliosPlanRunStatus = (typeof HELIOS_PLAN_RUN_STATUSES)[number];
export type HeliosPlanPageKind = (typeof HELIOS_PLAN_PAGE_KINDS)[number];
export type HeliosPlanModality = (typeof HELIOS_PLAN_MODALITIES)[number];
export type HeliosPlanViewType = (typeof HELIOS_PLAN_VIEW_TYPES)[number];
export type HeliosPlanReferenceType = (typeof HELIOS_PLAN_REFERENCE_TYPES)[number];
export type HeliosPlanCalibrationSource = (typeof HELIOS_PLAN_CALIBRATION_SOURCES)[number];
export type HeliosPlanCalibrationStatus = (typeof HELIOS_PLAN_CALIBRATION_STATUSES)[number];
export type HeliosPlanReviewAction = (typeof HELIOS_PLAN_REVIEW_ACTIONS)[number];
export type HeliosPlanSheetRole = (typeof HELIOS_PLAN_SHEET_ROLES)[number];
export type HeliosPlanSheetConflictType = (typeof HELIOS_PLAN_SHEET_CONFLICT_TYPES)[number];
export type HeliosPlanSheetDecisionAction = (typeof HELIOS_PLAN_SHEET_DECISIONS)[number];

export type HeliosPlanBoundary = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HeliosPlanScaleCandidate = {
  source: HeliosPlanCalibrationSource;
  scale: string;
  units: string;
  sourceRegion: string;
  confidence: number;
};

export type HeliosPlanView = {
  viewKey: string;
  viewType: HeliosPlanViewType;
  label: string;
  boundary: HeliosPlanBoundary;
  northOrientation: string;
  measurable: boolean;
  scaleCandidates: HeliosPlanScaleCandidate[];
  unresolvedIssues: string[];
};

export type HeliosPlanPage = {
  id: string;
  documentId: string;
  documentName: string;
  physicalPageNumber: number;
  pageKind: HeliosPlanPageKind;
  printedPageNumber: string;
  sheetNumber: string;
  title: string;
  discipline: string;
  subdiscipline: string;
  issueDate: string;
  revisionMarker: string;
  addendumAssociation: string;
  modality: HeliosPlanModality;
  titleBlockBoundary?: HeliosPlanBoundary;
  titleBlockText: string;
  confidence: number;
  unresolvedIssues: string[];
  views: HeliosPlanView[];
  authorityRole?: HeliosPlanSheetRole;
};

export type HeliosPlanSheetDecision = {
  id: string;
  normalizedSheetNumber: string;
  sheetNumber: string;
  decision: HeliosPlanSheetDecisionAction;
  status: "resolved" | "review_required" | "escalated";
  primaryPageId?: string;
  referencePageIds: string[];
  reason: string;
  reviewerName: string;
  reviewedAt: number;
};

export type HeliosPlanSheetConflict = {
  id: string;
  normalizedSheetNumber: string;
  sheetNumber: string;
  conflictType: HeliosPlanSheetConflictType;
  status: "unresolved" | "resolved" | "review_required" | "escalated";
  pageIds: string[];
  suggestedPrimaryPageId?: string;
  primaryPageId?: string;
  referencePageIds: string[];
  reason: string;
  decision?: HeliosPlanSheetDecisionAction;
  reviewerName?: string;
  reviewedAt?: number;
};

export type HeliosPlanReference = {
  id: string;
  sourcePageId: string;
  sourceSheetNumber: string;
  sourceViewKey: string;
  referenceType: HeliosPlanReferenceType;
  label: string;
  targetSheetNumber: string;
  targetDetail: string;
  targetSpecification: string;
  locator: string;
  status: "resolved" | "unresolved";
  targetPageId?: string;
  confidence: number;
};

export type HeliosPlanCalibration = {
  id: string;
  pageId: string;
  viewKey: string;
  source: HeliosPlanCalibrationSource;
  scale: string;
  units: string;
  sourceRegion: string;
  confidence: number;
  status: HeliosPlanCalibrationStatus;
  approvedBy?: string;
  approvedAt?: number;
  updatedAt: number;
};

export type HeliosPlanSetIntelligence = {
  id: string;
  projectId: string;
  packageId: string;
  packageRevision: number;
  status: HeliosPlanRunStatus;
  processingVersion: number;
  model?: string;
  sourceDocumentCount: number;
  sourcePageCount: number;
  registeredPageCount: number;
  sheetCount: number;
  nonSheetPageCount: number;
  exceptionPageCount: number;
  measurableViewCount: number;
  approvedCalibrationCount: number;
  blockedMeasurementCount: number;
  unresolvedReferenceCount: number;
  issues: string[];
  pages: HeliosPlanPage[];
  sheetConflicts: HeliosPlanSheetConflict[];
  references: HeliosPlanReference[];
  calibrations: HeliosPlanCalibration[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

export type HeliosPlanReviewInput = {
  action: HeliosPlanReviewAction;
  calibrationId?: string;
  sheetNumber?: string;
  decision?: HeliosPlanSheetDecisionAction;
  primaryPageId?: string;
};

function normalizedSheetNumber(value: string) {
  return value.trim().toUpperCase();
}

function normalizedTitle(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function issueDateRank(value: string) {
  const text = value.trim();
  const iso = /^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/.exec(text);
  if (iso) return Number(iso[1]) * 100 + Number(iso[2]);
  const month = /^(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\s+(\d{4})$/i.exec(text);
  if (!month) return 0;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return Number(month[2]) * 100 + months.indexOf(month[1].slice(0, 3).toUpperCase()) + 1;
}

function authorityScore(page: HeliosPlanPage) {
  const source = `${page.documentName}\n${page.titleBlockText}\n${page.revisionMarker}`;
  let score = issueDateRank(page.issueDate);
  if (/\b(?:ISSUED[ -]FOR[ -]BID|BID[ -]PHASE|PHASE:\s*BID|BID)\b/i.test(source)) score += 1_000_000;
  if (/PERMIT/i.test(page.documentName)) score -= 500_000;
  if (/\b(?:SUPERSEDED|VOID|NOT FOR BIDDING)\b/i.test(source)) score -= 2_000_000;
  return score;
}

function suggestedPrimary(pages: HeliosPlanPage[]) {
  return [...pages].sort((left, right) =>
    authorityScore(right) - authorityScore(left) ||
    right.confidence - left.confidence ||
    left.documentName.localeCompare(right.documentName),
  )[0];
}

export function derivePlanSheetConflicts(
  pages: HeliosPlanPage[],
  decisions: HeliosPlanSheetDecision[] = [],
): HeliosPlanSheetConflict[] {
  const pagesBySheet = new Map<string, HeliosPlanPage[]>();
  for (const page of pages) {
    if (page.pageKind !== "sheet" || !page.sheetNumber.trim()) continue;
    const key = normalizedSheetNumber(page.sheetNumber);
    pagesBySheet.set(key, [...(pagesBySheet.get(key) || []), page]);
  }
  const decisionBySheet = new Map(decisions.map((decision) => [decision.normalizedSheetNumber, decision]));
  return [...pagesBySheet.entries()].flatMap(([key, candidates]) => {
    if (candidates.length < 2) return [];
    const decision = decisionBySheet.get(key);
    const suggestion = suggestedPrimary(candidates);
    const titles = new Set(candidates.map((page) => normalizedTitle(page.title)).filter(Boolean));
    const dates = new Set(candidates.map((page) => page.issueDate.trim().toUpperCase()).filter(Boolean));
    const versionConflict = titles.size <= 1 && dates.size > 1;
    const defaultReason = versionConflict
      ? "The same drawing identifier and title occur in sources with different issue dates."
      : "The same drawing identifier occurs on multiple source pages and requires an authority decision.";
    const status = decision?.status === "resolved"
      ? "resolved" as const
      : decision?.status || "unresolved" as const;
    return [{
      id: decision?.id || `sheet-conflict:${key}`,
      normalizedSheetNumber: key,
      sheetNumber: candidates[0].sheetNumber,
      conflictType: versionConflict ? "version_conflict" as const : "identifier_collision" as const,
      status,
      pageIds: candidates.map((page) => page.id),
      suggestedPrimaryPageId: suggestion?.id,
      primaryPageId: decision?.primaryPageId,
      referencePageIds: decision?.referencePageIds || [],
      reason: decision?.reason || defaultReason,
      decision: decision?.decision,
      reviewerName: decision?.reviewerName,
      reviewedAt: decision?.reviewedAt,
    }];
  }).sort((left, right) => left.sheetNumber.localeCompare(right.sheetNumber));
}

export function planSheetAuthorityByPage(conflicts: HeliosPlanSheetConflict[]) {
  const roles = new Map<string, HeliosPlanSheetRole>();
  for (const conflict of conflicts) {
    for (const pageId of conflict.pageIds) roles.set(pageId, "unresolved");
    if (conflict.status !== "resolved" || !conflict.primaryPageId) continue;
    roles.set(conflict.primaryPageId, "current_bid");
    for (const pageId of conflict.referencePageIds) roles.set(pageId, "permit_reference");
  }
  return roles;
}

type RawPlanDocument = {
  sourcePageCount: number;
  documentSummary: string;
  pages: Array<{
    physicalPageNumber: number;
    pageKind: HeliosPlanPageKind;
    printedPageNumber: string;
    sheetNumber: string;
    title: string;
    discipline: string;
    subdiscipline: string;
    issueDate: string;
    revisionMarker: string;
    addendumAssociation: string;
    modality: HeliosPlanModality;
    titleBlockBoundary: HeliosPlanBoundary | null;
    titleBlockText: string;
    confidence: number;
    unresolvedIssues: string[];
    views: HeliosPlanView[];
  }>;
  references: Array<{
    sourcePageNumber: number;
    sourceSheetNumber: string;
    sourceViewKey: string;
    referenceType: HeliosPlanReferenceType;
    label: string;
    targetSheetNumber: string;
    targetDetail: string;
    targetSpecification: string;
    locator: string;
    confidence: number;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringValue(value: unknown, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function integer(value: unknown, minimum: number, maximum: number, fallback: number) {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : fallback;
}

function enumValue<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === "string" && values.includes(value) ? value as T[number] : fallback;
}

function stringArray(value: unknown, maximumItems = 40) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maximumItems).map((item) => stringValue(item, 500)).filter(Boolean);
}

function boundary(value: unknown): HeliosPlanBoundary | null {
  if (!isRecord(value)) return null;
  const values = [value.x, value.y, value.width, value.height];
  if (!values.every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0 && item <= 1)) return null;
  const result = { x: Number(value.x), y: Number(value.y), width: Number(value.width), height: Number(value.height) };
  if (result.width === 0 || result.height === 0 || result.x + result.width > 1.001 || result.y + result.height > 1.001) return null;
  return result;
}

export function parsePlanDocumentIntelligence(value: unknown): RawPlanDocument {
  if (!isRecord(value)) throw new Error("Plan intelligence must be an object.");
  const sourcePageCount = integer(value.sourcePageCount, 1, 2_000, 0);
  if (!sourcePageCount) throw new Error("Plan intelligence did not establish a valid source page count.");
  const rawPages = Array.isArray(value.pages) ? value.pages : [];
  const pagesByNumber = new Map<number, RawPlanDocument["pages"][number]>();
  for (const raw of rawPages) {
    if (!isRecord(raw)) continue;
    const physicalPageNumber = integer(raw.physicalPageNumber, 1, sourcePageCount, 0);
    if (!physicalPageNumber || pagesByNumber.has(physicalPageNumber)) continue;
    const rawViews = Array.isArray(raw.views) ? raw.views : [];
    const views: HeliosPlanView[] = rawViews.slice(0, 80).flatMap((candidate, index) => {
      if (!isRecord(candidate)) return [];
      const viewBoundary = boundary(candidate.boundary);
      if (!viewBoundary) return [];
      const rawScales = Array.isArray(candidate.scaleCandidates) ? candidate.scaleCandidates : [];
      const scaleCandidates = rawScales.slice(0, 10).flatMap((scale) => {
        if (!isRecord(scale)) return [];
        const scaleText = stringValue(scale.scale, 120);
        if (!scaleText) return [];
        return [{
          source: enumValue(scale.source, HELIOS_PLAN_CALIBRATION_SOURCES, "stated_numeric"),
          scale: scaleText,
          units: stringValue(scale.units, 80),
          sourceRegion: stringValue(scale.sourceRegion, 240),
          confidence: integer(scale.confidence, 0, 100, 0),
        }];
      });
      return [{
        viewKey: stringValue(candidate.viewKey, 120) || `view-${physicalPageNumber}-${index + 1}`,
        viewType: enumValue(candidate.viewType, HELIOS_PLAN_VIEW_TYPES, "other"),
        label: stringValue(candidate.label, 240) || `View ${index + 1}`,
        boundary: viewBoundary,
        northOrientation: stringValue(candidate.northOrientation, 120),
        measurable: candidate.measurable === true,
        scaleCandidates,
        unresolvedIssues: stringArray(candidate.unresolvedIssues),
      }];
    });
    const titleBlockBoundary = boundary(raw.titleBlockBoundary);
    pagesByNumber.set(physicalPageNumber, {
      physicalPageNumber,
      pageKind: enumValue(raw.pageKind, HELIOS_PLAN_PAGE_KINDS, "exception"),
      printedPageNumber: stringValue(raw.printedPageNumber, 120),
      sheetNumber: stringValue(raw.sheetNumber, 120),
      title: stringValue(raw.title, 300),
      discipline: stringValue(raw.discipline, 160),
      subdiscipline: stringValue(raw.subdiscipline, 160),
      issueDate: stringValue(raw.issueDate, 80),
      revisionMarker: stringValue(raw.revisionMarker, 120),
      addendumAssociation: stringValue(raw.addendumAssociation, 160),
      modality: enumValue(raw.modality, HELIOS_PLAN_MODALITIES, "unusable"),
      titleBlockBoundary,
      titleBlockText: stringValue(raw.titleBlockText, 1_200),
      confidence: integer(raw.confidence, 0, 100, 0),
      unresolvedIssues: stringArray(raw.unresolvedIssues),
      views,
    });
  }
  for (let physicalPageNumber = 1; physicalPageNumber <= sourcePageCount; physicalPageNumber += 1) {
    if (!pagesByNumber.has(physicalPageNumber)) {
      pagesByNumber.set(physicalPageNumber, {
        physicalPageNumber,
        pageKind: "exception",
        printedPageNumber: "",
        sheetNumber: "",
        title: "Page was not registered by the reasoning result",
        discipline: "",
        subdiscipline: "",
        issueDate: "",
        revisionMarker: "",
        addendumAssociation: "",
        modality: "unusable",
        titleBlockBoundary: null,
        titleBlockText: "",
        confidence: 0,
        unresolvedIssues: ["Reanalyze this source page before relying on the plan set."],
        views: [],
      });
    }
  }
  const references: RawPlanDocument["references"] = [];
  for (const raw of Array.isArray(value.references) ? value.references.slice(0, 5_000) : []) {
    if (!isRecord(raw)) continue;
    const sourcePageNumber = integer(raw.sourcePageNumber, 1, sourcePageCount, 0);
    if (!sourcePageNumber) continue;
    references.push({
      sourcePageNumber,
      sourceSheetNumber: stringValue(raw.sourceSheetNumber, 120),
      sourceViewKey: stringValue(raw.sourceViewKey, 120),
      referenceType: enumValue(raw.referenceType, HELIOS_PLAN_REFERENCE_TYPES, "other"),
      label: stringValue(raw.label, 300),
      targetSheetNumber: stringValue(raw.targetSheetNumber, 120),
      targetDetail: stringValue(raw.targetDetail, 160),
      targetSpecification: stringValue(raw.targetSpecification, 160),
      locator: stringValue(raw.locator, 300),
      confidence: integer(raw.confidence, 0, 100, 0),
    });
  }
  return {
    sourcePageCount,
    documentSummary: stringValue(value.documentSummary, 2_400),
    pages: [...pagesByNumber.values()].sort((a, b) => a.physicalPageNumber - b.physicalPageNumber),
    references,
  };
}

export function normalizePlanReviewInput(value: unknown): HeliosPlanReviewInput {
  if (!isRecord(value)) throw new Error("Plan-intelligence action must be an object.");
  const action = enumValue(value.action, HELIOS_PLAN_REVIEW_ACTIONS, "" as HeliosPlanReviewAction);
  if (!action) throw new Error("Select a valid plan-intelligence action.");
  const calibrationId = stringValue(value.calibrationId, 128) || undefined;
  const sheetNumber = stringValue(value.sheetNumber, 120) || undefined;
  const decision = enumValue(value.decision, HELIOS_PLAN_SHEET_DECISIONS, "" as HeliosPlanSheetDecisionAction) || undefined;
  const primaryPageId = stringValue(value.primaryPageId, 128) || undefined;
  if (["approve_calibration", "block_calibration"].includes(action) && !calibrationId) {
    throw new Error("Select a view calibration.");
  }
  if (action === "resolve_sheet_conflict") {
    if (!sheetNumber || !decision) throw new Error("Select a drawing conflict and decision.");
    if (decision === "use_as_current" && !primaryPageId) throw new Error("Select the current bid drawing.");
    return { action, sheetNumber, decision, primaryPageId };
  }
  return { action, calibrationId };
}
