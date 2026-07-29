import {
  derivePlanSheetConflicts,
  type HeliosPlanPage,
  type HeliosPlanSheetDecision,
  type HeliosPlanViewType,
} from "@opsslate/helios-domain";

import type { Doc } from "./_generated/dataModel";

function planAuthorityPage(page: Doc<"heliosPlanPages">): HeliosPlanPage {
  return {
    id: String(page._id),
    documentId: String(page.documentId),
    documentName: page.documentName,
    physicalPageNumber: page.physicalPageNumber,
    pageKind: page.pageKind,
    printedPageNumber: page.printedPageNumber,
    sheetNumber: page.sheetNumber,
    title: page.title,
    discipline: page.discipline,
    subdiscipline: page.subdiscipline,
    issueDate: page.issueDate,
    revisionMarker: page.revisionMarker,
    addendumAssociation: page.addendumAssociation,
    modality: page.modality,
    titleBlockBoundary: page.titleBlockBoundary,
    titleBlockText: page.titleBlockText,
    confidence: page.confidence,
    unresolvedIssues: page.unresolvedIssues,
    views: page.views.map((view) => ({
      ...view,
      viewType: view.viewType as HeliosPlanViewType,
      scaleCandidates: [],
    })),
  };
}

function planAuthorityDecision(
  decision: Doc<"heliosPlanSheetDecisions">,
): HeliosPlanSheetDecision {
  return {
    id: String(decision._id),
    normalizedSheetNumber: decision.normalizedSheetNumber,
    sheetNumber: decision.sheetNumber,
    decision: decision.decision,
    status: decision.status,
    primaryPageId: decision.primaryPageId
      ? String(decision.primaryPageId)
      : undefined,
    referencePageIds: decision.referencePageIds.map(String),
    reason: decision.reason,
    reviewerName: decision.reviewerName,
    reviewedAt: decision.updatedAt,
  };
}

/**
 * One drawing-authority interpretation for cutover, Euclid, and later
 * canonical consumers. This preserves deterministic bid-over-permit authority
 * even when no manual decision row is necessary.
 */
export function deriveStoredPlanSheetConflicts(
  pages: Doc<"heliosPlanPages">[],
  decisions: Doc<"heliosPlanSheetDecisions">[],
) {
  return derivePlanSheetConflicts(
    pages.map(planAuthorityPage),
    decisions.map(planAuthorityDecision),
  );
}
