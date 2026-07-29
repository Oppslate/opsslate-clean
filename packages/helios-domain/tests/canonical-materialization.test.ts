import assert from "node:assert/strict";
import test from "node:test";

import {
  HELIOS_CANONICAL_MATERIALIZATION_VERSION,
  HELIOS_CANONICAL_OCR_VERSION,
  buildHeliosCanonicalOcrSpans,
  buildHeliosCanonicalTextSpans,
} from "../src/canonical-materialization.ts";

test("materializes normalized coordinate text without inventing page content", () => {
  const spans = buildHeliosCanonicalTextSpans({
    pageWidth: 1000,
    pageHeight: 500,
    items: [
      { text: "STA.", x: 100, y: 50, width: 40, height: 10 },
      { text: "10+00", x: 145, y: 50, width: 55, height: 10, lineBreakAfter: true },
      { text: "EL. 1375.25", x: 100, y: 75, width: 100, height: 10 },
    ],
  });
  assert.equal(HELIOS_CANONICAL_MATERIALIZATION_VERSION, 1);
  assert.equal(spans.length, 2);
  assert.equal(spans[0].text, "STA. 10+00");
  assert.deepEqual(spans[0].boundary, { x: 0.1, y: 0.1, width: 0.1, height: 0.02 });
  assert.equal(spans[1].text, "EL. 1375.25");
  assert.equal(spans[1].spanKey, "native:1");
});

test("materializes OCR lines in stable reading order with normalized provenance geometry", () => {
  const spans = buildHeliosCanonicalOcrSpans({
    pixelWidth: 2_000,
    pixelHeight: 1_000,
    lines: [
      { text: "EL. 1375.25", confidence: 98.125, bbox: { x0: 200, y0: 200, x1: 500, y1: 240 } },
      { text: "STA. 10+00", confidence: 101, bbox: { x0: 100, y0: 100, x1: 400, y1: 140 } },
      { text: "   ", confidence: 50, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
    ],
  });
  assert.equal(HELIOS_CANONICAL_OCR_VERSION, 1);
  assert.equal(spans.length, 2);
  assert.equal(spans[0].text, "STA. 10+00");
  assert.equal(spans[0].confidence, 100);
  assert.equal(spans[0].spanKey, "ocr-v1:0");
  assert.deepEqual(spans[1].boundary, { x: 0.1, y: 0.2, width: 0.15, height: 0.04 });
});

test("rejects invalid geometry and omits empty or zero-area text", () => {
  assert.throws(
    () => buildHeliosCanonicalTextSpans({ pageWidth: 0, pageHeight: 100, items: [] }),
    /positive/,
  );
  assert.deepEqual(
    buildHeliosCanonicalTextSpans({
      pageWidth: 100,
      pageHeight: 100,
      items: [
        { text: "   ", x: 1, y: 1, width: 5, height: 5 },
        { text: "Hidden", x: 1, y: 1, width: 0, height: 5 },
      ],
    }),
    [],
  );
});
