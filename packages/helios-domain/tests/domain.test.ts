import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_ESTIMATE_WBS,
  HELIOS_MANIFEST_VERSION,
  HELIOS_MAX_WRITTEN_SCOPE_BYTES,
  HELIOS_MAX_PDF_BYTES,
  calculateAllocationBalance,
  calculateCostCodeDirectCost,
  calculateDerivedUnitCost,
  calculateEstimateReviewSummary,
  calculateEstimateTotals,
  calculatePricingStatus,
  calculateResourceCost,
  calculateRiskExpectedExposure,
  classifyEstimateWbsSection,
  deriveAllocationValues,
  canonicalPdfFileName,
  hasPdfMagicBytes,
  normalizeProjectInput,
  normalizePackageInput,
  normalizeEstimateReviewInput,
  normalizeEstimateBuildInput,
  normalizeEstimateSupportInput,
  parseDocumentIntelligence,
  parseEstimateProposal,
  parseProjectSynthesis,
  parseAssistantAnswer,
  parseStationNotation,
  interpolateVerticalElevation,
  reconcileAllocations,
  sha256HexToBase64,
  sha256MatchesStorageDigest,
  validatePdfCandidate,
} from "../src/index.ts";

test("Ask Helios parses station notation and interpolates profile elevation deterministically", () => {
  assert.equal(parseStationNotation("What is the elevation at Sta. 12+50?"), 1250);
  assert.equal(parseStationNotation("station not supplied"), undefined);
  assert.deepEqual(
    interpolateVerticalElevation([
      { station: 1200, elevation: 100 },
      { station: 1300, elevation: 104 },
    ], 1250),
    { elevation: 102, method: "linear_interpolation", lowerStation: 1200, upperStation: 1300 },
  );
});

test("Ask Helios accepts only canonical citations and requires support for available answers", () => {
  const source = {
    sourceId: "geometry:1", kind: "civil_geometry" as const,
    label: "Mainline elevation", locator: "PR-2", status: "accepted",
    content: "Elevation 102.0 FT at Station 12+50.",
  };
  const answer = {
    directAnswer: "The elevation is 102.0 FT.", explanation: "Stored profile geometry controls.",
    answerType: "geometry", answerStatus: "accepted", method: "Exact profile lookup",
    assumptions: [], limitations: [], confidence: 98, citations: [{ sourceId: source.sourceId }],
  };
  assert.equal(parseAssistantAnswer(answer, [source]).citations[0]?.label, "Mainline elevation");
  assert.throws(() => parseAssistantAnswer({ ...answer, citations: [{ sourceId: "outside" }] }, [source]), /not a valid project source/i);
  assert.throws(() => parseAssistantAnswer({ ...answer, citations: [] }, [source]), /must cite/i);
});

test("Ask Helios preserves complete bounded assumption and limitation sentences", () => {
  const sentence = "This is a complete engineering qualification that remains readable on bid day and retains enough context to explain why the answer is advisory rather than accepted.";
  const answer = parseAssistantAnswer({
    directAnswer: "The stored value is advisory.",
    explanation: "Human review remains required.",
    answerType: "mixed",
    answerStatus: "proposed",
    method: "Canonical project record lookup",
    assumptions: [sentence],
    limitations: [sentence],
    confidence: 80,
    citations: [{ sourceId: "risk:1" }],
  }, [{
    sourceId: "risk:1",
    kind: "risk",
    label: "Project risk",
    locator: "Risk register",
    status: "proposed",
    content: "Stored risk evidence.",
  }]);
  assert.equal(answer.assumptions[0], sentence);
  assert.equal(answer.limitations[0], sentence);
});

test("compares browser hexadecimal SHA-256 with Convex Base64 storage metadata", () => {
  const hexadecimal =
    "eaabc4702f84ca61f1b74631cf405b4cdb64598618cc39edbc429644f06b2ab1";
  const base64 = "6qvEcC+EymHxt0Yxz0BbTNtkWYYYzDntvEKWRPBrKrE=";
  assert.equal(sha256HexToBase64(hexadecimal), base64);
  assert.equal(sha256MatchesStorageDigest(hexadecimal, base64), true);
  assert.equal(sha256MatchesStorageDigest(hexadecimal, `${base64.slice(0, -2)}A=`), false);
});

test("defines the ordered contractor WBS independently of owner specification groupings", () => {
  assert.deepEqual(
    HELIOS_ESTIMATE_WBS.map(({ id, displayName }) => [id, displayName]),
    [
      ["01", "Mobilization"],
      ["02", "Site Preparation"],
      ["03", "Earthwork"],
      ["04", "Fill & Embankment"],
      ["05", "Drainage"],
      ["06", "Utilities"],
      ["07", "Concrete"],
      ["08", "Asphalt"],
      ["09", "Structures"],
      ["10", "Traffic Control"],
      ["11", "Restoration"],
      ["12", "Miscellaneous"],
    ],
  );
});

test("classifies NYSDOT owner items into contractor work phases", () => {
  const cases = [
    ["201.06", "Clearing & Grubbing", "02"],
    ["203.02", "Unclassified Excavation", "03"],
    ["203.03", "Embankment", "04"],
    ["203.21", "Select Structure Fill", "04"],
    ["206.01", "Structural Excavation", "03"],
    ["603.1715", "Culvert Pipe", "05"],
    ["", "Install water main", "06"],
    ["", "Precast box culvert", "09"],
    ["999.99", "Special owner requirement", "12"],
  ] as const;
  for (const [officialItemNumber, description, expectedId] of cases) {
    assert.equal(
      classifyEstimateWbsSection({ officialItemNumber, description }).id,
      expectedId,
      `${officialItemNumber} ${description}`,
    );
  }
});

test("normalizes evidence-linked RFQ, submittal, and risk actions", () => {
  assert.deepEqual(normalizeEstimateSupportInput({ action: "generate_rfq", costCodeId: "code-1" }), {
    action: "generate_rfq",
    costCodeId: "code-1",
    rfqId: undefined,
    submittalId: undefined,
    riskId: undefined,
    evidenceId: undefined,
    recordType: undefined,
    recordId: undefined,
    comment: undefined,
    rfqStatus: undefined,
    submittalStatus: undefined,
    riskCarryDecision: undefined,
    rfq: undefined,
    submittal: undefined,
    risk: undefined,
  });
  assert.equal(normalizeEstimateSupportInput({
    action: "set_risk_decision",
    riskId: "risk-1",
    riskCarryDecision: "qualification",
  }).riskCarryDecision, "qualification");
  assert.throws(() => normalizeEstimateSupportInput({ action: "dispute_evidence", evidenceId: "e-1", recordType: "risk", recordId: "r-1" }), /reason is required/i);
});

test("validates three-point risk exposure and expected monetary exposure", () => {
  const input = normalizeEstimateSupportInput({
    action: "update_risk",
    riskId: "risk-1",
    risk: {
      category: "site_conditions",
      severity: "high",
      title: "Groundwater above invert",
      detail: "Dewatering duration may exceed the planned operation.",
      probabilityPercent: 40,
      lowCostCents: 100_000,
      mostLikelyCostCents: 250_000,
      highCostCents: 500_000,
      lowScheduleDays: 1,
      mostLikelyScheduleDays: 4,
      highScheduleDays: 10,
      mitigationCostCents: 50_000,
      mitigation: "Carry standby pumping and verify borings.",
      owner: "Lead estimator",
      disposition: "open",
      linkedPayItemIds: ["item-1"],
      linkedCostCodeIds: ["code-1"],
      linkedQuantityIds: [],
    },
  });
  assert.equal(input.risk?.mostLikelyCostCents, 250_000);
  assert.equal(calculateRiskExpectedExposure(40, 250_000), 100_000);
  assert.throws(() => normalizeEstimateSupportInput({
    ...input,
    risk: { ...input.risk, lowCostCents: 600_000, mostLikelyCostCents: 250_000 },
  }), /Low cost exposure cannot exceed/i);
});

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

test("normalizes a canonical manual written-scope intake envelope", () => {
  const content = "Replace the existing culvert and restore the roadway.";
  const input = normalizePackageInput({
    envelopeId: "manual:09be7b57-ef58-43fd-8404-20c6b540fd84",
    adapter: "manual",
    manifestVersion: HELIOS_MANIFEST_VERSION,
    name: "Emergency culvert scope",
    sourceType: "written_scope",
    revisionKind: "initial",
    entries: [
      {
        kind: "written_scope",
        sourceCategory: "written_scope",
        relativePath: "written-scope/emergency-culvert-scope.txt",
        size: new TextEncoder().encode(content).byteLength,
        sha256: "a".repeat(64),
        title: "Emergency culvert scope",
        content,
        sourceLocation: "Owner email dated July 27, 2026",
        accepted: true,
      },
    ],
  });

  assert.equal(input.adapter, "manual");
  assert.equal(input.revisionKind, "initial");
  assert.equal(input.entries[0]?.content, content);
});

test("rejects altered or oversized written-scope manifests", () => {
  const base = {
    envelopeId: "manual:7042153b-0fa2-4934-9830-d62aafc77729",
    adapter: "manual",
    manifestVersion: HELIOS_MANIFEST_VERSION,
    name: "Written scope",
    sourceType: "written_scope",
    revisionKind: "initial",
  } as const;
  assert.throws(
    () =>
      normalizePackageInput({
        ...base,
        entries: [
          {
            kind: "written_scope",
            relativePath: "written-scope/scope.txt",
            size: 1,
            sha256: "b".repeat(64),
            title: "Scope",
            content: "longer than one byte",
            accepted: true,
          },
        ],
      }),
    /size does not match/i,
  );
  assert.equal(HELIOS_MAX_WRITTEN_SCOPE_BYTES, 128 * 1024);
});

test("keeps the disabled Bid Scout fixture manifest-compatible with manual intake", () => {
  const entries = [
    {
      kind: "pdf" as const,
      sourceCategory: "plans" as const,
      relativePath: "Plans/C-101.pdf",
      size: 4_096,
      sha256: "c".repeat(64),
      accepted: true,
    },
  ];
  const manual = normalizePackageInput({
    envelopeId: "manual:dc096550-30b4-47c6-9d1b-90c8a09494ee",
    adapter: "manual",
    manifestVersion: HELIOS_MANIFEST_VERSION,
    name: "Culvert bid package",
    sourceType: "folder",
    revisionKind: "initial",
    entries,
  });
  const bidScout = normalizePackageInput({
    envelopeId: "bid-scout:opportunity-42:revision-1",
    adapter: "bid_scout",
    manifestVersion: HELIOS_MANIFEST_VERSION,
    name: "Culvert bid package",
    sourceType: "folder",
    revisionKind: "initial",
    entries,
  });

  assert.deepEqual(bidScout.entries, manual.entries);
  assert.equal(bidScout.manifestVersion, manual.manifestVersion);
  assert.equal(bidScout.revisionKind, manual.revisionKind);
  assert.notEqual(bidScout.adapter, manual.adapter);
});

test("normalizes all seven 3E.2 resource classes and traceable price sources", () => {
  for (const resourceClass of ["labor", "equipment", "material", "subcontract", "trucking", "disposal", "other"] as const) {
    const input = normalizeEstimateBuildInput({
      action: "create_resource",
      costCodeId: "cost-code-1",
      resource: {
        resourceClass,
        description: `${resourceClass} resource`,
        quantity: 2,
        unit: "HR",
        rateStatus: "user_entered",
        rateCents: 10_000,
        priceSourceLabel: "Chief estimator",
        effectiveDate: "2026-07-26",
        taxStatus: "unknown",
        wasteBasisPoints: 0,
        escalationBasisPoints: 0,
      },
    });
    assert.equal(input.resource?.resourceClass, resourceClass);
  }
  assert.throws(() => normalizeEstimateBuildInput({
    action: "create_resource",
    costCodeId: "cost-code-1",
    resource: {
      resourceClass: "labor",
      description: "Foreperson",
      quantity: 8,
      unit: "HR",
      rateStatus: "user_entered",
      rateCents: 9_500,
      taxStatus: "exempt",
    },
  }), /source label, and effective date/i);
});

test("calculates 3E.2 waste, escalation, controlled overrides, and pricing status", () => {
  const resource = normalizeEstimateBuildInput({
    action: "update_resource",
    resourceId: "resource-1",
    resource: {
      resourceClass: "material",
      description: "Select granular material",
      quantity: 100,
      unit: "TON",
      wasteBasisPoints: 500,
      rateStatus: "vendor_quote",
      rateCents: 2_000,
      priceSourceLabel: "Vendor quote",
      priceSourceReference: "Q-1042",
      effectiveDate: "2026-07-26",
      escalationBasisPoints: 1_000,
      overrideRateCents: 2_500,
      overrideReason: "Delivered rate includes remote haul premium.",
      taxStatus: "exempt",
    },
  }).resource!;
  assert.equal(calculateResourceCost(resource), 288_750);
  assert.equal(calculateCostCodeDirectCost([resource]), 288_750);
  assert.equal(calculatePricingStatus([resource]), "priced");
  assert.equal(calculatePricingStatus([{ quantity: 1, rateCents: 100 }, { quantity: 1, rateCents: undefined }]), "partial");
  assert.throws(() => normalizeEstimateBuildInput({
    action: "update_resource",
    resourceId: "resource-1",
    resource: { ...resource, overrideReason: undefined },
  }), /reason is required/i);
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
    projectMetadata: {
      projectNumber: {
        value: "D040968",
        confidence: 98,
        evidenceIds: ["evidence-1"],
      },
      ownerClient: {
        value: "New York State Department of Transportation",
        confidence: 98,
        evidenceIds: ["evidence-1"],
      },
      engineer: { value: "", confidence: 0, evidenceIds: [] },
      bidDate: {
        value: "2026-09-30",
        confidence: 96,
        evidenceIds: ["evidence-1"],
      },
      location: {
        value: "Cattaraugus County, New York",
        confidence: 94,
        evidenceIds: ["evidence-1"],
      },
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
  const parsed = parseProjectSynthesis(synthesis, ["evidence-1"]);
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.projectMetadata.projectNumber.value, "D040968");
  assert.equal(parsed.projectMetadata.bidDate.value, "2026-09-30");
  assert.throws(
    () => parseProjectSynthesis(synthesis, ["different-evidence"]),
    /summary must cite valid evidence/i,
  );
  assert.throws(
    () => parseProjectSynthesis({
      ...synthesis,
      projectMetadata: {
        ...synthesis.projectMetadata,
        bidDate: {
          value: "09/30/2026",
          confidence: 96,
          evidenceIds: ["evidence-1"],
        },
      },
    }, ["evidence-1"]),
    /YYYY-MM-DD/,
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

test("regroups mixed owner sections into the Helios WBS", () => {
  const mixed = structuredClone(culvertProposal);
  const baseItem = mixed.sections[0].payItems[0];
  mixed.sections = [{
    ...mixed.sections[0],
    key: "owner-combined-site-work",
    name: "Site Preparation, Excavation, Fill and Drainage Layers",
    payItems: [
      { officialSequence: 1, officialItemNumber: "201.06", description: "Clearing & Grubbing" },
      { officialSequence: 2, officialItemNumber: "203.02", description: "Unclassified Excavation" },
      { officialSequence: 3, officialItemNumber: "203.03", description: "Embankment In Place" },
      { officialSequence: 4, officialItemNumber: "603.1715", description: "Culvert Pipe" },
    ].map(({ officialSequence, officialItemNumber, description }) => ({
      ...structuredClone(baseItem),
      officialSequence,
      officialItemNumber,
      description,
    })),
  }];
  const proposal = parseEstimateProposal(mixed, ["pay-item", "general", "scope", "risk"]);
  assert.deepEqual(
    proposal.sections.map((section) => [section.key, section.name, section.payItems[0]?.officialItemNumber]),
    [
      ["02", "Site Preparation", "201.06"],
      ["03", "Earthwork", "203.02"],
      ["04", "Fill & Embankment", "203.03"],
      ["05", "Drainage", "603.1715"],
    ],
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

test("keeps production quantity decisions separate and never converts Takeoff Required to zero", () => {
  assert.deepEqual(
    normalizeEstimateBuildInput({
      action: "create_quantity",
      costCodeId: "cost-1",
      quantity: {
        value: 125,
        unit: "CY",
        quantityType: "estimator_calculated",
        sourceLabel: "Estimator takeoff",
        sourceReference: "C-104, Sta. 10+00 to 12+50",
        method: "Average end area calculation",
        confidence: 95,
        use: "production",
      },
    }).quantity,
    {
      value: 125,
      unit: "CY",
      quantityType: "estimator_calculated",
      sourceLabel: "Estimator takeoff",
      sourceReference: "C-104, Sta. 10+00 to 12+50",
      method: "Average end area calculation",
      confidence: 95,
      use: "production",
    },
  );
  assert.throws(
    () => normalizeEstimateBuildInput({
      action: "create_quantity",
      costCodeId: "cost-1",
      quantity: {
        value: 0,
        unit: "CY",
        quantityType: "takeoff_required",
        sourceLabel: "Estimator review",
        method: "Detailed takeoff required",
        confidence: 100,
        use: "production",
      },
    }),
    /greater than zero|must remain unknown/,
  );
});

test("derives quantity, percent, and dollar allocations from one controlling method", () => {
  assert.deepEqual(
    deriveAllocationValues({
      allocationType: "percent",
      controllingValue: 4_000,
      sourceQuantity: 250,
      sourceCostCents: 1_000_000,
    }),
    { quantity: 100, percentBasisPoints: 4_000, amountCents: 400_000 },
  );
  assert.deepEqual(
    deriveAllocationValues({
      allocationType: "quantity",
      controllingValue: 150,
      sourceQuantity: 250,
      sourceCostCents: 1_000_000,
    }),
    { quantity: 150, percentBasisPoints: 6_000, amountCents: 600_000 },
  );
  assert.deepEqual(
    deriveAllocationValues({
      allocationType: "amount",
      controllingValue: 250_000,
      sourceQuantity: 250,
      sourceCostCents: 1_000_000,
    }),
    { quantity: 62.5, percentBasisPoints: 2_500, amountCents: 250_000 },
  );
});

test("blocks orphan, duplicate, and unbalanced shared costs and passes exact reconciliation", () => {
  const allocation = (targetPayItemId: string, quantity: number, percentBasisPoints: number, amountCents: number) => ({
    targetPayItemId,
    quantity,
    percentBasisPoints,
    amountCents,
    reviewStatus: "corrected" as const,
  });
  assert.equal(reconcileAllocations({ allocationRequired: true, sourceQuantity: 100, sourceCostCents: 1_000_000, allocations: [] }).status, "orphan");
  assert.equal(reconcileAllocations({
    allocationRequired: true,
    sourceQuantity: 100,
    sourceCostCents: 1_000_000,
    allocations: [allocation("item-1", 50, 5_000, 500_000), allocation("item-1", 50, 5_000, 500_000)],
  }).status, "duplicate");
  assert.equal(reconcileAllocations({
    allocationRequired: true,
    sourceQuantity: 100,
    sourceCostCents: 1_000_000,
    allocations: [allocation("item-1", 40, 4_000, 400_000)],
  }).status, "unbalanced");
  assert.deepEqual(reconcileAllocations({
    allocationRequired: true,
    sourceQuantity: 100,
    sourceCostCents: 1_000_000,
    allocations: [allocation("item-1", 40, 4_000, 400_000), allocation("item-2", 60, 6_000, 600_000)],
  }), {
    status: "balanced",
    issues: [],
    totals: { quantity: 100, percentBasisPoints: 10_000, amountCents: 1_000_000 },
  });
});
