import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_MAX_PDF_BYTES,
  calculateAllocationBalance,
  calculateCostCodeDirectCost,
  calculateDerivedUnitCost,
  calculateEstimateReviewSummary,
  calculateEstimateTotals,
  canonicalPdfFileName,
  hasPdfMagicBytes,
  normalizeProjectInput,
  normalizeEstimateReviewInput,
  parseDocumentIntelligence,
  parseEstimateProposal,
  parseProjectSynthesis,
  validatePdfCandidate,
} from "../src/index.ts";

test("normalizes the project intake contract", () => {
  assert.deepEqual(
    normalizeProjectInput({
      name: "  NY Water Main  ",
      projectNumber: "  HW-24-01 ",
      ownerClient: "",
      bidDate: "2026-09-30",
    }),
    {
      name: "NY Water Main",
      projectNumber: "HW-24-01",
      ownerClient: undefined,
      engineer: undefined,
      bidDate: "2026-09-30",
      location: undefined,
      notes: undefined,
    },
  );
});

test("rejects missing names and impossible dates", () => {
  assert.throws(() => normalizeProjectInput({ name: " " }), /required/);
  assert.throws(
    () => normalizeProjectInput({ name: "Project", bidDate: "2026-02-30" }),
    /valid bid date/,
  );
});

test("validates PDF candidates and canonical names", () => {
  assert.equal(
    validatePdfCandidate({
      name: " Plans\\ADDENDUM 01.PDF ",
      type: "application/pdf",
      size: 1024,
    }),
    "addendum 01.pdf",
  );
  assert.equal(canonicalPdfFileName("../Bid.PDF"), "bid.pdf");
  assert.throws(
    () =>
      validatePdfCandidate({
        name: "bid.docx",
        type: "application/pdf",
        size: 100,
      }),
    /Only PDF/,
  );
});

test("recognizes the required PDF signature", () => {
  assert.equal(
    hasPdfMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
    true,
  );
  assert.equal(hasPdfMagicBytes(new Uint8Array([0x50, 0x44, 0x46])), false);
});

test("keeps accepted PDFs within the OpenAI file-input boundary", () => {
  assert.equal(HELIOS_MAX_PDF_BYTES, 50 * 1024 * 1024);
  assert.doesNotThrow(() =>
    validatePdfCandidate({
      name: "specifications.pdf",
      type: "application/pdf",
      size: HELIOS_MAX_PDF_BYTES,
    }),
  );
  assert.throws(
    () =>
      validatePdfCandidate({
        name: "oversized.pdf",
        type: "application/pdf",
        size: HELIOS_MAX_PDF_BYTES + 1,
      }),
    /50 MB/,
  );
});

const validDocumentIntelligence = {
  documentType: "New York public works contract specifications",
  summary: "The bid requires a five-percent bid bond.",
  summaryEvidenceKeys: ["bond"],
  confidence: 94,
  evidence: [
    {
      key: "bond",
      pageNumber: 12,
      locator: "Instructions to Bidders § 7",
      excerpt: "Each bid shall include a bid bond in the amount of five percent.",
    },
  ],
  findings: [
    {
      category: "contract_requirements",
      title: "Bid bond",
      detail: "Include a five-percent bid bond with the public works bid.",
      confidence: 94,
      severity: "critical",
      evidenceKeys: ["bond"],
    },
  ],
};

test("accepts cited document intelligence and rejects uncited findings", () => {
  assert.equal(
    parseDocumentIntelligence(validDocumentIntelligence).findings.length,
    1,
  );
  assert.throws(
    () =>
      parseDocumentIntelligence({
        ...validDocumentIntelligence,
        findings: [
          {
            ...validDocumentIntelligence.findings[0],
            evidenceKeys: [],
          },
        ],
      }),
    /must cite valid document evidence/,
  );
});

test("rejects project synthesis that cites evidence outside the project", () => {
  const synthesis = {
    summary: "A public water-main replacement bid.",
    summaryEvidenceIds: ["evidence-1"],
    projectType: {
      value: "Heavy highway / water infrastructure",
      confidence: 92,
      evidenceIds: ["evidence-1"],
    },
    fundingSource: {
      value: "",
      confidence: 0,
      evidenceIds: [],
    },
    confidence: 88,
    findings: [
      {
        category: "known_risks",
        title: "Traffic maintenance",
        detail: "The contract includes staged traffic maintenance.",
        confidence: 88,
        severity: "warning",
        evidenceIds: ["evidence-1"],
      },
    ],
  };
  assert.equal(
    parseProjectSynthesis(synthesis, ["evidence-1"]).findings.length,
    1,
  );
  assert.throws(
    () => parseProjectSynthesis(synthesis, ["different-evidence"]),
    /summary must cite valid evidence/i,
  );
});

const culvertProposal = {
  sections: [
    {
      key: "culvert-replacement",
      name: "Culvert Replacement",
      sequence: 10,
      evidenceIds: ["pay-item"],
      payItems: [
        {
          officialSequence: 1,
          officialItemNumber: "619.0501",
          description: "Culvert replacement, complete",
          estimatorDescription: null,
          bidQuantity: 1,
          bidUnit: "LS",
          itemType: "lump_sum",
          fixedAmountCents: null,
          quantityStatus: "owner_provided",
          confidence: 96,
          evidenceIds: ["pay-item"],
          costCodes: [
            {
              code: "ENG",
              description: "Engineering and layout",
              scopeOwnership: "self_perform",
              productionQuantity: 1,
              productionUnit: "LS",
              confidence: 90,
              evidenceIds: ["general"],
              resources: [
                {
                  resourceClass: "labor",
                  description: "Project engineer",
                  quantity: 100,
                  unit: "HR",
                  rateCents: null,
                  rateStatus: "unpriced",
                  taxStatus: "exempt",
                },
              ],
            },
            ...["EW", "FILL", "PAVE", "MAINT", "REM"].map((code) => ({
              code,
              description: `${code} culvert operation`,
              scopeOwnership: "self_perform",
              productionQuantity: null,
              productionUnit: "LS",
              confidence: 82,
              evidenceIds: ["scope"],
              resources: [],
            })),
          ],
        },
      ],
    },
  ],
  risks: [
    {
      title: "Unknown subsurface conditions",
      detail: "Rock and unsuitable material quantities require field verification.",
      probabilityPercent: 45,
      scheduleDays: 5,
      mitigation: "Review borings and carry a pre-bid clarification.",
      owner: "Chief estimator",
      disposition: "open",
      confidence: 78,
      evidenceIds: ["risk"],
    },
  ],
};

test("parses the evidence-backed culvert estimate proposal without inventing prices", () => {
  const proposal = parseEstimateProposal(culvertProposal, [
    "pay-item",
    "general",
    "scope",
    "risk",
  ]);
  assert.equal(proposal.sections[0]?.payItems[0]?.officialItemNumber, "619.0501");
  assert.equal(proposal.sections[0]?.payItems[0]?.officialSequence, 1);
  assert.equal(proposal.sections[0]?.payItems[0]?.itemType, "lump_sum");
  assert.deepEqual(
    proposal.sections[0]?.payItems[0]?.costCodes.map((item) => item.code),
    ["ENG", "EW", "FILL", "PAVE", "MAINT", "REM"],
  );
  assert.equal(
    proposal.sections[0]?.payItems[0]?.costCodes[0]?.resources[0]?.rateCents,
    undefined,
  );
});

test("protects official sequence and fixed owner amounts", () => {
  const allowance = structuredClone(culvertProposal);
  allowance.sections[0].payItems[0].itemType = "allowance";
  assert.throws(
    () => parseEstimateProposal(allowance, ["pay-item", "general", "scope", "risk"]),
    /requires its official fixed amount/,
  );
  (allowance.sections[0].payItems[0] as { fixedAmountCents: number | null }).fixedAmountCents = 2_000_000;
  assert.equal(
    parseEstimateProposal(allowance, ["pay-item", "general", "scope", "risk"]).sections[0]?.payItems[0]?.fixedAmountCents,
    2_000_000,
  );
});

test("normalizes all seven estimator import decisions and requires reasons for structural changes", () => {
  for (const action of ["accept", "correct", "reject", "defer", "merge", "split", "map"] as const) {
    const input: Record<string, unknown> = {
      recordType: "pay_item",
      recordId: "item-1",
      action,
      comment: action === "accept" || action === "correct" ? undefined : "Estimator review note.",
    };
    if (action === "correct") input.correction = { description: "Corrected owner description" };
    if (action === "merge" || action === "map") input.targetRecordId = "target-1";
    if (action === "split") input.split = {
      officialSequence: 2,
      officialItemNumber: "619.0502",
      description: "Second culvert",
    };
    assert.equal(normalizeEstimateReviewInput(input).action, action);
  }
  assert.throws(
    () => normalizeEstimateReviewInput({ recordType: "pay_item", recordId: "item-1", action: "merge", targetRecordId: "target-1" }),
    /review note is required/i,
  );
});

test("calculates deterministic import-review readiness", () => {
  assert.deepEqual(
    calculateEstimateReviewSummary([
      { reviewStatus: "accepted" },
      { reviewStatus: "corrected" },
      { reviewStatus: "rejected" },
      { reviewStatus: "deferred" },
    ]),
    {
      total: 4,
      proposed: 0,
      deferred: 1,
      accepted: 1,
      corrected: 1,
      rejected: 1,
      reviewed: 3,
      percentComplete: 75,
      canAcceptImport: false,
      blockers: [],
    },
  );
  assert.equal(
    calculateEstimateReviewSummary([
      { reviewStatus: "accepted" },
      { reviewStatus: "corrected" },
    ]).canAcceptImport,
    true,
  );
});

test("rejects duplicate owner items, invalid evidence, and AI-generated prices", () => {
  assert.throws(
    () => parseEstimateProposal(culvertProposal, ["different"]),
    /valid project evidence/,
  );
  assert.throws(
    () =>
      parseEstimateProposal(
        {
          ...culvertProposal,
          sections: [
            culvertProposal.sections[0],
            { ...culvertProposal.sections[0], key: "duplicate" },
          ],
        },
        ["pay-item", "general", "scope", "risk"],
      ),
    /duplicated/,
  );
  const priced = structuredClone(culvertProposal);
  (priced.sections[0].payItems[0].costCodes[0].resources[0] as {
    rateCents: number | null;
  }).rateCents = 12_500;
  assert.throws(
    () => parseEstimateProposal(priced, ["pay-item", "general", "scope", "risk"]),
    /cannot contain prices/,
  );
});

test("keeps unknown quantities unknown instead of treating them as zero", () => {
  const proposal = parseEstimateProposal(culvertProposal, [
    "pay-item",
    "general",
    "scope",
    "risk",
  ]);
  assert.equal(
    proposal.sections[0]?.payItems[0]?.costCodes[1]?.productionQuantity,
    undefined,
  );
  assert.equal(calculateCostCodeDirectCost([{ quantity: 4, rateCents: undefined }]), undefined);
});

test("calculates the golden culvert direct cost, allocation, and independent global markups", () => {
  const directCosts = [
    calculateCostCodeDirectCost([{ quantity: 100, rateCents: 10_000 }]),
    calculateCostCodeDirectCost([{ quantity: 200, rateCents: 15_000 }]),
    calculateCostCodeDirectCost([{ quantity: 1_000, rateCents: 2_500 }]),
    calculateCostCodeDirectCost([{ quantity: 500, rateCents: 8_000 }]),
    calculateCostCodeDirectCost([{ quantity: 1, rateCents: 1_200_000 }]),
    calculateCostCodeDirectCost([{ quantity: 1, rateCents: 800_000 }]),
  ];
  assert.deepEqual(directCosts, [1_000_000, 3_000_000, 2_500_000, 4_000_000, 1_200_000, 800_000]);
  const directCostCents = directCosts.reduce<number>((sum, value) => sum + (value || 0), 0);
  assert.equal(calculateDerivedUnitCost(directCostCents, 1), 12_500_000);
  assert.deepEqual(
    calculateAllocationBalance([
      { allocationType: "percent", percentBasisPoints: 4_000 },
      { allocationType: "percent", percentBasisPoints: 6_000 },
    ]),
    { quantity: 0, percentBasisPoints: 10_000, amountCents: 0 },
  );
  assert.deepEqual(
    calculateEstimateTotals({
      directCostCents,
      overheadBasisPoints: 1_000,
      profitBasisPoints: 800,
      bondBasisPoints: 200,
    }),
    {
      directCostCents: 12_500_000,
      overheadCents: 1_250_000,
      profitCents: 1_000_000,
      bondCents: 250_000,
      grandTotalCents: 15_000_000,
    },
  );
});
