import { buildHeliosEngineeringParityFingerprint } from "./engineering-record.ts";
import {
  evaluateHeliosEuclidAlignmentPosition,
  type HeliosEuclidAlignmentPosition,
  type HeliosEuclidAlignmentPositionRequest,
  type HeliosEuclidAlignmentPositionStatus,
  type HeliosEuclidProfilePosition,
} from "./euclid-station.ts";

export const HELIOS_EUCLID_STATION_OFFSET_VERSION = 1;
export const HELIOS_EUCLID_STATION_OFFSET_SOLVER = "euclid-station-offset-v1";

export type HeliosEuclidStationOffsetRequest = HeliosEuclidAlignmentPositionRequest & {
  /** Positive is right of increasing station; negative is left. */
  offset: number;
  /** Explicit elevation at the requested offset point. */
  pointElevation?: number;
  /** Signed elevation difference from the one selected canonical profile. */
  verticalOffset?: number;
};

export type HeliosEuclidStationOffsetElevation = {
  elevation: number;
  basis: "explicit_point_elevation" | "profile_at_centerline" | "profile_plus_vertical_offset";
  referenceProfile?: HeliosEuclidProfilePosition;
  verticalOffset?: number;
  formula: string;
  inputValueIds: string[];
  provenanceIds: string[];
};

export type HeliosEuclidStationOffsetPosition = {
  id: string;
  version: typeof HELIOS_EUCLID_STATION_OFFSET_VERSION;
  solver: typeof HELIOS_EUCLID_STATION_OFFSET_SOLVER;
  euclidModelId: string;
  sourceFingerprint: string;
  alignmentId: string;
  alignmentName: string;
  alignmentType: HeliosEuclidAlignmentPosition["alignmentType"];
  spatialReferenceId: string;
  coordinateBasis: string;
  horizontalUnit: string;
  verticalUnit: string;
  chainage: number;
  displayedStation: number;
  printedStation: string;
  stationEquationId?: string;
  offset: number;
  side: "left" | "right" | "centerline";
  status: HeliosEuclidAlignmentPositionStatus;
  centerlinePosition: HeliosEuclidAlignmentPosition;
  horizontal?: {
    northing: number;
    easting: number;
    centerlineNorthing: number;
    centerlineEasting: number;
    azimuthDegrees: number;
    perpendicularAzimuthDegrees: number;
    formula: string;
    method: typeof HELIOS_EUCLID_STATION_OFFSET_SOLVER;
    inputValueIds: string[];
    provenanceIds: string[];
  };
  elevation?: HeliosEuclidStationOffsetElevation;
  referenceProfiles: HeliosEuclidProfilePosition[];
  limitations: string[];
  fingerprint: string;
};

const EPSILON = 1e-9;

function round(value: number, places = 10) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

/**
 * Resolves a plan point normal to a canonical Euclid alignment. This is a
 * pure deterministic transform over the 4L result. Positive offsets are to
 * the right of increasing station; negative offsets are to the left.
 */
export function evaluateHeliosEuclidStationOffsetPosition(
  model: Parameters<typeof evaluateHeliosEuclidAlignmentPosition>[0],
  request: HeliosEuclidStationOffsetRequest,
): HeliosEuclidStationOffsetPosition {
  if (!Number.isFinite(request.offset)) throw new Error("Offset must be a finite number.");
  if (request.pointElevation !== undefined && !Number.isFinite(request.pointElevation)) throw new Error("Point elevation must be a finite number.");
  if (request.verticalOffset !== undefined && !Number.isFinite(request.verticalOffset)) throw new Error("Vertical offset must be a finite number.");
  if (Math.abs(request.offset) > 100_000) throw new Error("Offset exceeds the supported engineering range.");
  if (request.pointElevation !== undefined && Math.abs(request.pointElevation) > 1_000_000) throw new Error("Point elevation exceeds the supported engineering range.");
  if (request.verticalOffset !== undefined && Math.abs(request.verticalOffset) > 100_000) throw new Error("Vertical offset exceeds the supported engineering range.");
  if (request.pointElevation !== undefined && request.verticalOffset !== undefined) {
    throw new Error("Provide either a point elevation or a vertical offset, not both.");
  }

  const centerlinePosition = evaluateHeliosEuclidAlignmentPosition(model, request);
  const offset = round(request.offset);
  const side = Math.abs(offset) <= EPSILON ? "centerline" : offset > 0 ? "right" : "left";
  const limitations = [...centerlinePosition.limitations];
  const horizontal = centerlinePosition.horizontal
    ? (() => {
        const radians = centerlinePosition.horizontal.azimuthDegrees * Math.PI / 180;
        return {
          northing: round(centerlinePosition.horizontal.northing - offset * Math.sin(radians)),
          easting: round(centerlinePosition.horizontal.easting + offset * Math.cos(radians)),
          centerlineNorthing: centerlinePosition.horizontal.northing,
          centerlineEasting: centerlinePosition.horizontal.easting,
          azimuthDegrees: centerlinePosition.horizontal.azimuthDegrees,
          perpendicularAzimuthDegrees: round((centerlinePosition.horizontal.azimuthDegrees + (offset < 0 ? 270 : 90)) % 360),
          formula: "N=Ncl-offset*sin(azimuth); E=Ecl+offset*cos(azimuth); positive offset is right",
          method: HELIOS_EUCLID_STATION_OFFSET_SOLVER as typeof HELIOS_EUCLID_STATION_OFFSET_SOLVER,
          inputValueIds: centerlinePosition.horizontal.inputValueIds,
          provenanceIds: centerlinePosition.horizontal.provenanceIds,
        };
      })()
    : undefined;

  const selectedProfile = centerlinePosition.profiles.length === 1 ? centerlinePosition.profiles[0] : undefined;
  let elevation: HeliosEuclidStationOffsetElevation | undefined;
  if (request.pointElevation !== undefined) {
    elevation = {
      elevation: round(request.pointElevation),
      basis: "explicit_point_elevation",
      formula: "elevation=explicit point elevation",
      inputValueIds: [],
      provenanceIds: [],
    };
    limitations.push("Point elevation is explicit query input and is not governed canonical geometry.");
  } else if (request.verticalOffset !== undefined) {
    if (!selectedProfile) {
      limitations.push("A vertical offset requires exactly one selected canonical reference profile at this station.");
    } else {
      elevation = {
        elevation: round(selectedProfile.elevation + request.verticalOffset),
        basis: "profile_plus_vertical_offset",
        referenceProfile: selectedProfile,
        verticalOffset: round(request.verticalOffset),
        formula: "elevation=reference profile elevation+vertical offset",
        inputValueIds: selectedProfile.inputValueIds,
        provenanceIds: selectedProfile.provenanceIds,
      };
      limitations.push("Vertical offset is explicit query input and is not a governed cross-slope or surface rule.");
    }
  } else if (side === "centerline" && selectedProfile) {
    elevation = {
      elevation: selectedProfile.elevation,
      basis: "profile_at_centerline",
      referenceProfile: selectedProfile,
      formula: "elevation=selected canonical profile elevation at centerline",
      inputValueIds: selectedProfile.inputValueIds,
      provenanceIds: selectedProfile.provenanceIds,
    };
  } else if (side !== "centerline") {
    limitations.push("Lateral elevation is not established; no cross slope, template, or surface rule was assumed.");
  } else if (centerlinePosition.profiles.length > 1) {
    limitations.push("Multiple profiles control this station; select one profile before assigning elevation.");
  }

  const status: HeliosEuclidAlignmentPositionStatus = !horizontal
    ? "unavailable"
    : centerlinePosition.status === "verified" && elevation?.basis === "profile_at_centerline"
      ? "verified"
      : "preliminary";
  const base: Omit<HeliosEuclidStationOffsetPosition, "id" | "fingerprint"> = {
    version: HELIOS_EUCLID_STATION_OFFSET_VERSION,
    solver: HELIOS_EUCLID_STATION_OFFSET_SOLVER,
    euclidModelId: centerlinePosition.euclidModelId,
    sourceFingerprint: centerlinePosition.sourceFingerprint,
    alignmentId: centerlinePosition.alignmentId,
    alignmentName: centerlinePosition.alignmentName,
    alignmentType: centerlinePosition.alignmentType,
    spatialReferenceId: centerlinePosition.spatialReferenceId,
    coordinateBasis: centerlinePosition.coordinateBasis,
    horizontalUnit: centerlinePosition.horizontalUnit,
    verticalUnit: centerlinePosition.verticalUnit,
    chainage: centerlinePosition.chainage,
    displayedStation: centerlinePosition.displayedStation,
    printedStation: centerlinePosition.printedStation,
    stationEquationId: centerlinePosition.stationEquationId,
    offset,
    side,
    status,
    centerlinePosition,
    horizontal,
    elevation,
    referenceProfiles: centerlinePosition.profiles,
    limitations: unique(limitations),
  };
  const fingerprint = buildHeliosEngineeringParityFingerprint(base);
  return { ...base, id: `station-offset:${fingerprint.split(":")[1]!.slice(0, 32)}`, fingerprint };
}
