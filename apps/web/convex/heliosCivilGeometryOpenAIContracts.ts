import { HELIOS_CIVIL_GEOMETRY_AUTHORITIES, HELIOS_CIVIL_GEOMETRY_TYPES } from "@opsslate/helios-domain";

const nullableNumber = { anyOf: [{ type: "number", minimum: -1_000_000_000, maximum: 1_000_000_000 }, { type: "null" }] } as const;
const horizontalPoint = { type: "object", additionalProperties: false, required: ["station", "northing", "easting", "label"], properties: { station: { type: "number" }, northing: { type: "number" }, easting: { type: "number" }, label: { type: "string", maxLength: 160 } } } as const;
const horizontalSegment = { type: "object", additionalProperties: false, required: ["kind", "stationStart", "stationEnd", "length", "radius", "deltaDegrees", "bearing", "label"], properties: { kind: { type: "string", enum: ["tangent", "curve"] }, stationStart: { type: "number" }, stationEnd: { type: "number" }, length: { type: "number", exclusiveMinimum: 0 }, radius: nullableNumber, deltaDegrees: nullableNumber, bearing: { type: "string", maxLength: 120 }, label: { type: "string", maxLength: 160 } } } as const;
const stationEquation = { type: "object", additionalProperties: false, required: ["backStation", "aheadStation", "label"], properties: { backStation: { type: "number" }, aheadStation: { type: "number" }, label: { type: "string", maxLength: 160 } } } as const;
const verticalPoint = { type: "object", additionalProperties: false, required: ["station", "elevation", "label", "gradePercent"], properties: { station: { type: "number" }, elevation: { type: "number" }, label: { type: "string", maxLength: 160 }, gradePercent: nullableNumber } } as const;
const crossSectionPoint = { type: "object", additionalProperties: false, required: ["station", "offset", "elevation", "surface", "label"], properties: { station: { type: "number" }, offset: { type: "number" }, elevation: { type: "number" }, surface: { type: "string", enum: ["existing", "proposed", "subgrade"] }, label: { type: "string", maxLength: 160 } } } as const;
const invertPoint = { type: "object", additionalProperties: false, required: ["structureId", "station", "offset", "invertElevation", "pipeSize", "pipeMaterial"], properties: { structureId: { type: "string", maxLength: 160 }, station: nullableNumber, offset: nullableNumber, invertElevation: { type: "number" }, pipeSize: { type: "string", maxLength: 120 }, pipeMaterial: { type: "string", maxLength: 160 } } } as const;
const materialLayer = { type: "object", additionalProperties: false, required: ["name", "stationStart", "stationEnd", "offsetLeft", "offsetRight", "thickness", "thicknessUnit"], properties: { name: { type: "string", maxLength: 200 }, stationStart: nullableNumber, stationEnd: nullableNumber, offsetLeft: nullableNumber, offsetRight: nullableNumber, thickness: { type: "number", exclusiveMinimum: 0 }, thicknessUnit: { type: "string", maxLength: 40 } } } as const;

export const heliosCivilGeometryFormat = {
  type: "json_schema" as const,
  name: "helios_civil_geometry",
  strict: true,
  schema: {
    type: "object", additionalProperties: false, required: ["records"],
    properties: {
      records: { type: "array", maxItems: 2000, items: {
        type: "object", additionalProperties: false,
        required: ["physicalPageNumber", "viewKey", "geometryType", "authority", "alignmentName", "sourceLocator", "verticalDatum", "horizontalPoints", "horizontalSegments", "stationEquations", "verticalPoints", "crossSectionPoints", "invertPoints", "materialLayers", "units", "confidence", "unresolvedIssues"],
        properties: {
          physicalPageNumber: { type: "integer", minimum: 1, maximum: 2000 }, viewKey: { type: "string", maxLength: 120 },
          geometryType: { type: "string", enum: HELIOS_CIVIL_GEOMETRY_TYPES }, authority: { type: "string", enum: HELIOS_CIVIL_GEOMETRY_AUTHORITIES },
          alignmentName: { type: "string", maxLength: 240 }, sourceLocator: { type: "string", maxLength: 500 },
          verticalDatum: { anyOf: [{ type: "string", maxLength: 120 }, { type: "null" }] },
          horizontalPoints: { type: "array", maxItems: 10000, items: horizontalPoint }, horizontalSegments: { type: "array", maxItems: 10000, items: horizontalSegment },
          stationEquations: { type: "array", maxItems: 1000, items: stationEquation }, verticalPoints: { type: "array", maxItems: 10000, items: verticalPoint },
          crossSectionPoints: { type: "array", maxItems: 30000, items: crossSectionPoint }, invertPoints: { type: "array", maxItems: 10000, items: invertPoint },
          materialLayers: { type: "array", maxItems: 2000, items: materialLayer }, units: { type: "string", maxLength: 40 },
          confidence: { type: "integer", minimum: 0, maximum: 100 }, unresolvedIssues: { type: "array", maxItems: 40, items: { type: "string", maxLength: 500 } },
        },
      } },
    },
  },
};

export const HELIOS_CIVIL_GEOMETRY_PROMPT = `
You are the civil-geometry reconstruction engine for Helios, a heavy-highway
estimating platform. Read the complete supplied construction-plan source
(pinned canonical page images and text, or a legacy PDF) and extract only
explicit geometry that can be verified on the source sheet.

Authority order:
1. Horizontal control coordinates, station equations, bearings, tangents and curve tables.
2. Vertical profile station/elevation, grades, PVC/PVI/PVT and vertical-curve data.
   Treat T.G.L. and Theoretical Grade Line as the proposed roadway centerline
   grade/profile for the named horizontal alignment; T.G.L., centerline,
   roadway profile line, and proposed grade line are equivalent alignment-role
   labels unless the source explicitly distinguishes them.
   Record the printed vertical datum (for example NAVD88) when the profile or
   project control sheets establish it; otherwise return null rather than infer it.
3. Cross-section and typical-section offsets, elevations, lane/shoulder widths and cross slopes.
4. Drainage structure stations, offsets, inverts, pipe sizes and materials.
5. Explicit pavement, aggregate, subgrade and other material layer depths.
6. Dimensioned geometry.
7. Calibrated scale is fallback only; do not use it here unless no coordinate or dimension geometry exists, and flag that limitation.

Return one record for each coherent alignment/view/type combination. For every
explicit tangent or curve table row, preserve its printed length as a
horizontalSegment; for curves also preserve radius and delta when printed.
Record every printed station equation so station arithmetic never silently
changes the physical alignment length. Connect each record
to the exact 1-based physical PDF page and the viewKey when visible. Preserve
the printed station values as decimal feet (10+50 becomes 1050) without
changing the coordinate datum. For cross sections, distinguish existing,
proposed, and subgrade surfaces. Never interpolate missing points, infer an
unprinted elevation, invent a coordinate, or calculate a bid quantity. Leave
inapplicable arrays empty and record ambiguity in unresolvedIssues. Values are
proposals until an estimator accepts them. Return only the strict result.
`.trim();
