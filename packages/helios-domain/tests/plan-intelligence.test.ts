import assert from "node:assert/strict";
import test from "node:test";

import {
  derivePlanSheetConflicts,
  normalizePlanReviewInput,
  planSheetAuthorityByPage,
  parsePlanDocumentIntelligence,
} from "../src/plan-intelligence.ts";

test("registers omitted source pages as explicit exceptions", () => {
  const result = parsePlanDocumentIntelligence({
    sourcePageCount: 3,
    documentSummary: "Three-page plan set.",
    pages: [
      {
        physicalPageNumber: 1,
        pageKind: "sheet",
        printedPageNumber: "1",
        sheetNumber: "G-001",
        title: "Cover",
        discipline: "General",
        subdiscipline: "",
        issueDate: "2026-07-01",
        revisionMarker: "0",
        addendumAssociation: "",
        modality: "vector",
        titleBlockBoundary: { x: 0.8, y: 0.7, width: 0.19, height: 0.29 },
        titleBlockText: "G-001",
        confidence: 98,
        unresolvedIssues: [],
        views: [],
      },
      {
        physicalPageNumber: 3,
        pageKind: "non_sheet",
        printedPageNumber: "",
        sheetNumber: "",
        title: "Transmittal",
        discipline: "",
        subdiscipline: "",
        issueDate: "",
        revisionMarker: "",
        addendumAssociation: "",
        modality: "scanned",
        titleBlockBoundary: null,
        titleBlockText: "",
        confidence: 90,
        unresolvedIssues: [],
        views: [],
      },
    ],
    references: [],
  });

  assert.equal(result.pages.length, 3);
  assert.equal(result.pages[1].pageKind, "exception");
  assert.equal(result.pages[1].modality, "unusable");
  assert.match(result.pages[1].unresolvedIssues[0], /Reanalyze/);
});
test("keeps scales at the view level and validates normalized boundaries", () => {
  const result = parsePlanDocumentIntelligence({
    sourcePageCount: 1,
    documentSummary: "Plan and profile.",
    pages: [{
      physicalPageNumber: 1,
      pageKind: "sheet",
      printedPageNumber: "1",
      sheetNumber: "C-101",
      title: "Culvert Plan and Profile",
      discipline: "Civil",
      subdiscipline: "Drainage",
      issueDate: "",
      revisionMarker: "",
      addendumAssociation: "",
      modality: "hybrid",
      titleBlockBoundary: null,
      titleBlockText: "",
      confidence: 91,
      unresolvedIssues: [],
      views: [{
        viewKey: "plan-1",
        viewType: "plan",
        label: "Plan view",
        boundary: { x: 0.05, y: 0.05, width: 0.9, height: 0.4 },
        northOrientation: "up",
        measurable: true,
        scaleCandidates: [{
          source: "graphic_scale",
          scale: "1 in = 20 ft",
          units: "feet",
          sourceRegion: "lower left",
          confidence: 94,
        }],
        unresolvedIssues: [],
      }],
    }],
    references: [],
  });

  assert.equal(result.pages[0].views[0].scaleCandidates[0].scale, "1 in = 20 ft");
  assert.equal(result.pages[0].views[0].measurable, true);
});

test("requires calibration identity for calibration decisions", () => {
  assert.deepEqual(normalizePlanReviewInput({ action: "request_reconstruction" }), {
    action: "request_reconstruction",
    calibrationId: undefined,
  });
  assert.throws(
    () => normalizePlanReviewInput({ action: "approve_calibration" }),
    /Select a view calibration/,
  );
});

test("establishes deterministic authority for a newer bid sheet and older permit reference", () => {
  const base = {
    physicalPageNumber: 1,
    pageKind: "sheet" as const,
    printedPageNumber: "",
    sheetNumber: "EXB-1",
    title: "Excavation and Backfill Plan",
    discipline: "Civil",
    subdiscipline: "Earthwork",
    revisionMarker: "",
    addendumAssociation: "",
    modality: "vector" as const,
    confidence: 98,
    unresolvedIssues: [],
    views: [],
  };
  const pages = [
    {
      ...base,
      id: "bid-page",
      documentId: "bid-document",
      documentName: "026 EXB-1 EXCAVATION AND BACKFILL PLAN.pdf",
      issueDate: "June 2026",
      titleBlockText: "PHASE: BID; DRAWING NO: EXB-1",
    },
    {
      ...base,
      id: "permit-page",
      documentId: "permit-document",
      documentName: "920000 Permits.pdf",
      physicalPageNumber: 28,
      issueDate: "February 2024",
      titleBlockText: "FINAL; DRAWING NO: EXB-1",
    },
  ];

  const conflicts = derivePlanSheetConflicts(pages);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].conflictType, "version_conflict");
  assert.equal(conflicts[0].suggestedPrimaryPageId, "bid-page");
  assert.equal(conflicts[0].status, "resolved");
  assert.equal(conflicts[0].primaryPageId, "bid-page");
  assert.deepEqual(conflicts[0].referencePageIds, ["permit-page"]);
  const roles = planSheetAuthorityByPage(conflicts);
  assert.equal(roles.get("bid-page"), "current_bid");
  assert.equal(roles.get("permit-page"), "permit_reference");
});

test("keeps drawing authority unresolved when version signals are ambiguous", () => {
  const pages = ["generation-a", "generation-b"].map((id, index) => ({
    id,
    documentId: `${id}-document`,
    documentName: `${id}.pdf`,
    physicalPageNumber: index + 1,
    pageKind: "sheet" as const,
    printedPageNumber: "",
    sheetNumber: "C-101",
    title: "General Plan",
    discipline: "Civil",
    subdiscipline: "",
    issueDate: index ? "February 2024" : "June 2026",
    revisionMarker: "",
    addendumAssociation: "",
    modality: "vector" as const,
    titleBlockText: "FINAL",
    confidence: 98,
    unresolvedIssues: [],
    views: [],
  }));
  const conflicts = derivePlanSheetConflicts(pages);
  assert.equal(conflicts[0].status, "unresolved");
  assert.equal(conflicts[0].primaryPageId, undefined);
});

test("applies an audited drawing decision without changing source pages", () => {
  const pages = ["bid-page", "permit-page"].map((id, index) => ({
    id,
    documentId: `${id}-document`,
    documentName: index ? "920000 Permits.pdf" : "EXB-1.pdf",
    physicalPageNumber: index + 1,
    pageKind: "sheet" as const,
    printedPageNumber: "",
    sheetNumber: "EXB-1",
    title: "Excavation and Backfill Plan",
    discipline: "Civil",
    subdiscipline: "",
    issueDate: index ? "February 2024" : "June 2026",
    revisionMarker: "",
    addendumAssociation: "",
    modality: "vector" as const,
    titleBlockText: index ? "FINAL" : "PHASE: BID",
    confidence: 98,
    unresolvedIssues: [],
    views: [],
  }));
  const conflicts = derivePlanSheetConflicts(pages, [{
    id: "decision-1",
    normalizedSheetNumber: "EXB-1",
    sheetNumber: "EXB-1",
    decision: "apply_recommended",
    status: "resolved",
    primaryPageId: "bid-page",
    referencePageIds: ["permit-page"],
    reason: "Issued-for-bid drawing controls estimating.",
    reviewerName: "Estimator",
    reviewedAt: 1,
  }]);
  const roles = planSheetAuthorityByPage(conflicts);
  assert.equal(conflicts[0].status, "resolved");
  assert.equal(roles.get("bid-page"), "current_bid");
  assert.equal(roles.get("permit-page"), "permit_reference");
  assert.equal(pages[1].titleBlockText, "FINAL");
});

test("requires a page when manually selecting the current drawing", () => {
  assert.throws(
    () => normalizePlanReviewInput({
      action: "resolve_sheet_conflict",
      sheetNumber: "EXB-1",
      decision: "use_as_current",
    }),
    /Select the current bid drawing/,
  );
  assert.deepEqual(normalizePlanReviewInput({
    action: "resolve_sheet_conflict",
    sheetNumber: "EXB-1",
    decision: "use_as_current",
    primaryPageId: "page-1",
  }), {
    action: "resolve_sheet_conflict",
    sheetNumber: "EXB-1",
    decision: "use_as_current",
    primaryPageId: "page-1",
  });
});
