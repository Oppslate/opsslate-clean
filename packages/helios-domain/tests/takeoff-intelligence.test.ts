import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateQuantityVariance,
  calculateTakeoffMeasurement,
  normalizeTakeoffReviewInput,
} from "../src/takeoff-intelligence.ts";

test("calculates a takeoff only from the stored raw value and explicit factors", () => {
  assert.deepEqual(
    calculateTakeoffMeasurement({
      rawValue: 125,
      rawUnit: "LF",
      outputUnit: "LF",
      factors: [
        { label: "parallel runs", value: 2, unit: "runs" },
        { label: "waste", value: 1.05, unit: "factor" },
      ],
    }),
    {
      calculatedValue: 262.5,
      formula: "125 LF × parallel runs 2 runs × waste 1.05 factor = 262.5 LF",
    },
  );
});

test("never converts an unknown or zero measurement into a quantity", () => {
  assert.throws(
    () => calculateTakeoffMeasurement({ rawValue: 0, rawUnit: "LF", outputUnit: "LF", factors: [] }),
    /greater than zero/,
  );
});

test("requires approved calibration references for dimensional plan measurements", () => {
  assert.throws(
    () => normalizeTakeoffReviewInput({
      action: "create_measurement",
      measurement: {
        costCodeId: "code-1",
        pageId: "page-1",
        viewKey: "plan-a",
        geometryRecordIds: [],
        sourceBasis: "calibrated_scale_fallback",
        measurementType: "length",
        label: "Culvert run",
        geometryKind: "estimator_measurement",
        geometry: [],
        objectReferences: ["C-101 alignment A-B"],
        rawValue: 125,
        rawUnit: "LF",
        outputUnit: "LF",
        factors: [],
        includedScope: "Pipe centerline",
        excludedScope: "End sections",
        assumptions: [],
        confidence: 90,
      },
    }),
    /approved view calibration/,
  );
});

test("allows plan counts without scale but preserves recognized-object evidence", () => {
  const input = normalizeTakeoffReviewInput({
    action: "create_measurement",
    measurement: {
      costCodeId: "code-1",
      pageId: "page-1",
      viewKey: "drainage-plan",
      geometryRecordIds: [],
      sourceBasis: "dimensioned_geometry",
      measurementType: "count",
      label: "Catch basins",
      geometryKind: "recognized_objects",
      geometry: [],
      objectReferences: ["CB-1", "CB-2", "CB-3"],
      rawValue: 3,
      rawUnit: "EA",
      outputUnit: "EA",
      factors: [],
      includedScope: "New catch basins",
      excludedScope: "Existing structures",
      assumptions: [],
      confidence: 96,
    },
  });
  assert.equal(input.measurement?.rawValue, 3);
  assert.equal(input.measurement?.calibrationId, undefined);
});

test("keeps owner and measured quantities separate while calculating variance", () => {
  assert.deepEqual(calculateQuantityVariance(110, 100), {
    variancePercent: 10,
    reconciliationStatus: "variance",
  });
  assert.deepEqual(calculateQuantityVariance(110, undefined), {
    reconciliationStatus: "not_comparable",
  });
});
