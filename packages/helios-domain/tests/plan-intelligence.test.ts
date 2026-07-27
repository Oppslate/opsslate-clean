import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePlanReviewInput,
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
