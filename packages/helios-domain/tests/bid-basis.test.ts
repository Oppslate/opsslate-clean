import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveHeliosBidBasis,
  normalizeBidBasisReviewInput,
  type HeliosBidBasisDerivationDocument,
} from "../src/index.ts";

function document(
  id: string,
  fileName: string,
  documentType?: string,
): HeliosBidBasisDerivationDocument {
  return {
    id,
    fileName,
    status: "completed",
    documentType,
    findingCategories: [],
    indexedPageNumbers: [1, 2],
  };
}

function derive(
  documents: HeliosBidBasisDerivationDocument[],
  writtenScopeCount = 0,
) {
  return deriveHeliosBidBasis({
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 1,
    packageStatus: "ready_for_review",
    documents,
    entries: documents.map((row) => ({
      documentId: row.id,
      relativePath: row.fileName,
      status: "uploaded",
    })),
    writtenScopeCount,
    now: 1,
  });
}

test("classifies all supported scope-basis profiles", () => {
  assert.equal(
    derive([
      document("plans", "Contract Plans.pdf", "Drawing set"),
      document("specs", "Project Specifications.pdf", "Technical specifications"),
    ]).profile,
    "plans_and_specs",
  );
  assert.equal(derive([document("plans", "Contract Plans.pdf")]).profile, "plans_only");
  assert.equal(derive([document("specs", "Special Provisions.pdf")]).profile, "specs_only");
  assert.equal(derive([], 1).profile, "written_scope_only");
  assert.equal(derive([document("forms", "Bid Bond.pdf")]).profile, "mixed_or_other");
});

test("primary plan and permit identities outrank incidental findings", () => {
  const roadwayProfile = document(
    "pro-1",
    "023^PRO-1 ROADWAY PROFILE .pdf",
    "Issued-for-bid plan drawing – roadway profile",
  );
  roadwayProfile.findingCategories = ["bid_items", "contract_requirements"];
  const streamProfile = document(
    "pro-2",
    "024^PRO-2 STREAM PROFILE.pdf",
    "Bid-phase plan drawing — stream profile",
  );
  streamProfile.findingCategories = ["bid_items", "missing_information"];
  const permitPackage = document(
    "permit",
    "920000 Permits.pdf",
    "Project-specific permit package and supporting bid reference containing agency approvals",
  );
  permitPackage.findingCategories = ["drawing_index", "contract_requirements"];

  const basis = derive([roadwayProfile, streamProfile, permitPackage]);
  assert.deepEqual(
    basis.categories.find((row) => row.category === "plans")?.documentIds,
    ["pro-1", "pro-2"],
  );
  assert.deepEqual(
    basis.categories.find((row) => row.category === "environmental_permits")?.documentIds,
    ["permit"],
  );
  assert.equal(basis.categories.find((row) => row.category === "owner_bid_schedule")?.fileCount, 0);
});

test("one usable scope basis opens the estimate and limits only dependent capabilities", () => {
  const basis = derive([document("specs", "Project Manual and Specifications.pdf")]);
  assert.equal(basis.workspaceState, "estimate_ready_with_limitations");
  assert.equal(
    basis.capabilities.find((row) => row.capability === "estimate_workspace")?.state,
    "limited",
  );
  assert.equal(
    basis.capabilities.find((row) => row.capability === "plan_takeoff_spatial")?.state,
    "unavailable",
  );
  assert.equal(
    basis.capabilities.find((row) => row.capability === "specification_compliance")?.state,
    "available",
  );
});

test("forms alone do not establish a usable scope basis", () => {
  const basis = derive([document("forms", "Proposal and Bid Forms.pdf")]);
  assert.equal(basis.workspaceState, "no_usable_scope_basis");
  assert.equal(
    basis.capabilities.find((row) => row.capability === "estimate_workspace")?.state,
    "unavailable",
  );
});

test("missing referenced plans are warnings and never become not issued automatically", () => {
  const specs = document("specs", "Technical Specifications.pdf");
  specs.findingText = "The referenced contract plans were not supplied in this package.";
  const basis = derive([specs]);
  assert.equal(
    basis.categories.find((row) => row.category === "plans")?.state,
    "expected_missing",
  );
  assert.equal(basis.workspaceState, "estimate_ready_with_limitations");
});

test("estimator category and document corrections are deterministic", () => {
  const plan = document("file-1", "Volume 1.pdf", "General document");
  const basis = deriveHeliosBidBasis({
    projectId: "project-1",
    packageId: "package-1",
    packageRevision: 2,
    packageStatus: "ready_for_review",
    documents: [plan],
    entries: [{ documentId: plan.id, relativePath: plan.fileName, status: "uploaded" }],
    writtenScopeCount: 0,
    documentOverrides: [{ documentId: plan.id, category: "plans" }],
    categoryOverrides: [{ category: "specifications", state: "not_issued" }],
    profileOverride: "plans_only",
    classificationStatus: "corrected",
    now: 1,
  });
  assert.equal(basis.profile, "plans_only");
  assert.equal(basis.categories.find((row) => row.category === "plans")?.fileCount, 1);
  assert.equal(
    basis.categories.find((row) => row.category === "specifications")?.state,
    "not_issued",
  );
});

test("review input requires reasons for consequential corrections", () => {
  assert.deepEqual(normalizeBidBasisReviewInput({ action: "proceed" }), {
    action: "proceed",
  });
  assert.throws(
    () => normalizeBidBasisReviewInput({ action: "set_category_state", category: "plans", state: "not_issued" }),
    /reason/i,
  );
  assert.deepEqual(
    normalizeBidBasisReviewInput({
      action: "set_category_state",
      category: "plans",
      state: "not_issued",
      reason: "Estimator confirmed plans were not issued.",
    }),
    {
      action: "set_category_state",
      category: "plans",
      state: "not_issued",
      reason: "Estimator confirmed plans were not issued.",
    },
  );
});
