import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_MAX_PDF_BYTES,
  canonicalPdfFileName,
  hasPdfMagicBytes,
  normalizeProjectInput,
  parseDocumentIntelligence,
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
