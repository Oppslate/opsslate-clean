import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_CANONICAL_WORKFLOW_CONTRACTS,
  evaluateHeliosCanonicalCutover,
} from "../src/canonical-cutover.ts";

const passedAreas = Object.fromEntries([
  "sources",
  "document_intelligence",
  "evidence",
  "plan_pages",
  "plan_views",
  "plan_calibrations",
  "plan_references",
  "civil_geometry",
].map((area) => [area, "passed"])) as Parameters<typeof evaluateHeliosCanonicalCutover>[0]["parityAreas"];

function completeInput(): Parameters<typeof evaluateHeliosCanonicalCutover>[0] {
  return {
    engineeringRecordAvailable: true,
    engineeringRecordCurrent: true,
    sourceCount: 2,
    immutableSourceCount: 2,
    canonicalPageCount: 20,
    canonicalTextSpanCount: 100,
    canonicalAssetCount: 40,
    unresolvedDrawingAuthorityCount: 0,
    coverage: {
      documentIntelligence: "ready",
      planReconstruction: "ready",
      civilGeometry: "ready",
    },
    parityStatus: "passed",
    parityAreas: passedAreas,
  };
}

test("permits the original PDF only at first ingestion and human review", () => {
  assert.equal(HELIOS_CANONICAL_WORKFLOW_CONTRACTS.find((row) => row.id === "source_ingestion")?.originalPdfPolicy, "required_once");
  for (const workflow of HELIOS_CANONICAL_WORKFLOW_CONTRACTS.filter((row) => row.id !== "source_ingestion" && row.id !== "document_intelligence")) {
    assert.equal(workflow.originalPdfPolicy, "forbidden");
  }
});

test("reports a fully populated and parity-verified record as shadow ready", () => {
  const result = evaluateHeliosCanonicalCutover(completeInput());
  assert.equal(result.status, "shadow_ready");
  assert.equal(result.blockedWorkflowCount, 0);
  assert.equal(result.duplicatePdfUploadWorkflowCount, 2);
});

test("blocks plan and civil cutover when canonical visual channels are missing", () => {
  const result = evaluateHeliosCanonicalCutover({
    ...completeInput(),
    canonicalTextSpanCount: 0,
    canonicalAssetCount: 0,
  });
  assert.equal(result.status, "blocked");
  assert.match(result.workflows.find((row) => row.id === "plan_reconstruction")!.blockers.join(" "), /text spans/);
  assert.match(result.workflows.find((row) => row.id === "civil_geometry")!.blockers.join(" "), /canonical page or view assets/);
  assert.equal(result.workflows.find((row) => row.id === "estimate")!.status, "shadow_ready");
});

test("drawing authority blocks geometry consumers without blocking document intelligence", () => {
  const result = evaluateHeliosCanonicalCutover({
    ...completeInput(),
    unresolvedDrawingAuthorityCount: 3,
  });
  assert.equal(result.workflows.find((row) => row.id === "document_intelligence")!.status, "shadow_ready");
  assert.equal(result.workflows.find((row) => row.id === "civil_geometry")!.status, "blocked");
  assert.equal(result.workflows.find((row) => row.id === "takeoff")!.status, "blocked");
  assert.equal(result.workflows.find((row) => row.id === "ask_helios")!.status, "blocked");
});
