import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalPdfFileName,
  hasPdfMagicBytes,
  normalizeProjectInput,
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
