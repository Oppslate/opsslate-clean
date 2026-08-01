import assert from "node:assert/strict";
import test from "node:test";

import {
  averageEndAreaVolume,
  horizontalAlignmentLength,
  materialLayerVolumeCubicYards,
  parseCivilGeometryDocument,
  verticalAlignmentLength,
  deriveCivilGeometryQuantity,
} from "../src/civil-geometry.ts";

test("uses horizontal control coordinates as the primary alignment length", () => {
  assert.equal(horizontalAlignmentLength([
    { station: 0, northing: 1000, easting: 1000, label: "PC" },
    { station: 500, northing: 1300, easting: 1400, label: "PT" },
  ]), 500);
});

test("uses printed tangent and curve lengths instead of coordinate chords", () => {
  const length = horizontalAlignmentLength([], [
    { kind: "tangent", stationStart: 0, stationEnd: 100, length: 100, bearing: "N 00 E", label: "T-1" },
    { kind: "curve", stationStart: 100, stationEnd: 257.08, length: 157.08, radius: 300, deltaDegrees: 30, bearing: "", label: "C-1" },
  ]);
  assert.ok(Math.abs(length - 257.08) < 0.000001);
});

test("uses profile station and elevation to calculate true vertical alignment length", () => {
  assert.equal(verticalAlignmentLength([
    { station: 0, elevation: 100, label: "PVI-1" },
    { station: 100, elevation: 110, label: "PVI-2" },
  ]), Math.hypot(100, 10));
});

test("calculates earthwork by deterministic average end area", () => {
  assert.equal(averageEndAreaVolume([
    { station: 0, areaSquareFeet: 54 },
    { station: 100, areaSquareFeet: 108 },
  ]), 300);
});

test("calculates material layer volume from alignment, width, and depth", () => {
  assert.equal(materialLayerVolumeCubicYards({ lengthFeet: 270, widthFeet: 12, thickness: 6, thicknessUnit: "IN" }), 60);
});

test("derives plan quantity from accepted coordinate geometry instead of paper scale", () => {
  const result = deriveCivilGeometryQuantity([{
    geometryType: "horizontal_alignment",
    horizontalPoints: [
      { station: 0, northing: 1000, easting: 1000, label: "POB" },
      { station: 500, northing: 1300, easting: 1400, label: "PT" },
    ],
    horizontalSegments: [],
    verticalPoints: [], crossSectionPoints: [], invertPoints: [], materialLayers: [],
  }], "length");
  assert.equal(result.value, 500);
  assert.equal(result.unit, "FT");
  assert.match(result.formula, /horizontal control coordinates/);
});

test("parses explicit civil geometry without inventing missing coordinate records", () => {
  const parsed = parseCivilGeometryDocument({ records: [{
    physicalPageNumber: 3,
    viewKey: "horizontal-control",
    geometryType: "horizontal_alignment",
    authority: "coordinate_control",
    alignmentName: "Route 12 baseline",
    sourceLocator: "Control point table",
    horizontalPoints: [
      { station: 0, northing: 1000, easting: 1000, label: "POB" },
      { station: 500, northing: 1300, easting: 1400, label: "PT" },
    ],
    horizontalSegments: [], stationEquations: [],
    verticalPoints: [], typicalSections: [{ name: "Roadway typical", stationStart: 0, stationEnd: 500, laneWidthLeft: 12, laneWidthRight: 12, shoulderWidthLeft: 4, shoulderWidthRight: 4, crossSlopeLeftPercent: -2, crossSlopeRightPercent: -2 }], crossSectionPoints: [], invertPoints: [], materialLayers: [],
    units: "FT", confidence: 98, unresolvedIssues: [],
  }, {
    physicalPageNumber: 4,
    viewKey: "empty",
    geometryType: "cross_section",
    authority: "cross_section_geometry",
    alignmentName: "",
    sourceLocator: "",
    horizontalPoints: [], horizontalSegments: [], stationEquations: [], verticalPoints: [], crossSectionPoints: [], invertPoints: [], materialLayers: [],
    units: "FT", confidence: 50, unresolvedIssues: ["No readable values"],
  }] }, 5);
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0]?.horizontalPoints.length, 2);
  assert.equal(parsed.records[0]?.typicalSections?.[0]?.crossSlopeLeftPercent, -2);
});
