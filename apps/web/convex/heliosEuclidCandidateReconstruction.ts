import {
  HELIOS_EUCLID_ENTITY_TYPES,
  buildHeliosEngineeringParityFingerprint,
  euclidModelFingerprint,
  validateHeliosEuclidContract,
  type HeliosEuclidEntityType,
  type HeliosEuclidModel,
} from "@opsslate/helios-domain";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function reconstructEuclidCandidate(
  ctx: MutationCtx | QueryCtx,
  candidate: Doc<"heliosEuclidReviewCandidates">,
  source: HeliosEuclidModel,
) {
  const chunks = await ctx.db
    .query("heliosEuclidReviewCandidateChunks")
    .withIndex("by_candidate", (query) => query.eq("candidateId", candidate._id))
    .collect();
  if (chunks.length !== candidate.chunkCount) throw new Error("Reviewed candidate chunks are incomplete.");
  const groups = {} as Record<HeliosEuclidEntityType, unknown[]>;
  for (const entityType of HELIOS_EUCLID_ENTITY_TYPES) groups[entityType] = [];
  for (const chunk of [...chunks].sort((left, right) => left.entityType.localeCompare(right.entityType) || left.chunkIndex - right.chunkIndex)) {
    const payload = JSON.parse(chunk.payloadJson) as unknown;
    if (!Array.isArray(payload) || payload.length !== chunk.entityCount) throw new Error(`Reviewed candidate ${chunk.entityType} chunk count is invalid.`);
    if (buildHeliosEngineeringParityFingerprint(payload) !== chunk.payloadFingerprint) throw new Error(`Reviewed candidate ${chunk.entityType} chunk fingerprint is invalid.`);
    groups[chunk.entityType as HeliosEuclidEntityType].push(...payload);
  }
  const entityCount = Object.values(groups).reduce((sum, rows) => sum + rows.length, 0);
  if (entityCount !== candidate.entityCount) throw new Error("Reviewed candidate entity total is inconsistent.");
  const model: HeliosEuclidModel = {
    id: `review-candidate:${candidate.candidateKey.split(":")[1]!.slice(0, 32)}`,
    companyId: source.companyId,
    projectId: source.projectId,
    packageId: source.packageId,
    packageRevision: source.packageRevision,
    schemaVersion: source.schemaVersion,
    processingVersion: source.processingVersion,
    sourceFingerprint: source.sourceFingerprint,
    status: "partially_accepted",
    spatialReferences: groups.spatial_reference as HeliosEuclidModel["spatialReferences"],
    provenance: source.provenance,
    alignments: groups.alignment as HeliosEuclidModel["alignments"],
    controlPoints: groups.control_point as HeliosEuclidModel["controlPoints"],
    horizontalElements: groups.horizontal_element as HeliosEuclidModel["horizontalElements"],
    stationEquations: groups.station_equation as HeliosEuclidModel["stationEquations"],
    profiles: groups.profile as HeliosEuclidModel["profiles"],
    profilePoints: groups.profile_point as HeliosEuclidModel["profilePoints"],
    verticalTangents: groups.vertical_tangent as HeliosEuclidModel["verticalTangents"],
    verticalCurves: groups.vertical_curve as HeliosEuclidModel["verticalCurves"],
    typicalSections: groups.typical_section as HeliosEuclidModel["typicalSections"],
    crossSectionPoints: groups.cross_section_point as HeliosEuclidModel["crossSectionPoints"],
    structures: groups.structure as HeliosEuclidModel["structures"],
    inverts: groups.invert as HeliosEuclidModel["inverts"],
    materialLayers: groups.material_layer as HeliosEuclidModel["materialLayers"],
    relationships: groups.relationship as HeliosEuclidModel["relationships"],
    issues: groups.issue as HeliosEuclidModel["issues"],
    createdAt: candidate.createdAt,
    updatedAt: candidate.createdAt,
  };
  const contract = validateHeliosEuclidContract(model);
  if (!contract.valid) throw new Error(`Reviewed candidate failed its frozen contract: ${contract.issues.map((row) => row.code).join(", ")}`);
  if (euclidModelFingerprint(model) !== candidate.candidateFingerprint) throw new Error("Reviewed candidate failed end-to-end fingerprint validation.");
  return model;
}
