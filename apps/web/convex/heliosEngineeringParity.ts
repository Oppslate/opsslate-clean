import {
  HELIOS_ENGINEERING_PARITY_VERSION,
  buildHeliosEngineeringParityFingerprint,
  compareHeliosEngineeringParity,
  type HeliosEngineeringParityAreaInput,
  type HeliosEngineeringParityIdentity,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import {
  fingerprintEngineeringRecord,
  fingerprintEngineeringSource,
  fingerprintPlanView,
} from "./heliosEngineeringParityPayloads";

type ParityReadiness = HeliosEngineeringParityAreaInput["readiness"];

function readiness(
  coverage: "not_applicable" | "pending" | "processing" | "ready" | "partially_ready" | "failed",
): ParityReadiness {
  if (coverage === "not_applicable") return "not_applicable";
  return coverage === "ready" ? "ready" : "incomplete";
}

function identity(id: string, fingerprint: string): HeliosEngineeringParityIdentity {
  return { id, fingerprint };
}

function canonicalRecords(
  provenance: Doc<"heliosEngineeringProvenance">[],
  recordType: string,
) {
  return provenance
    .filter((row) => row.recordType === recordType)
    .map((row) =>
      identity(
        row.recordId,
        row.recordFingerprint || `missing-fingerprint:${row.recordId}`,
      ),
    );
}

async function currentParityContext(ctx: QueryCtx, projectIdValue: string) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  const project = projectId ? await ctx.db.get(projectId) : null;
  if (!project?.activePackageId) return null;
  const [bidPackage, record] = await Promise.all([
    ctx.db.get(project.activePackageId),
    ctx.db
      .query("heliosEngineeringRecords")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first(),
  ]);
  if (!bidPackage || !record || record.projectId !== project._id) return null;
  return { project, bidPackage, record };
}

async function buildParityInputs(
  ctx: QueryCtx,
  context: NonNullable<Awaited<ReturnType<typeof currentParityContext>>>,
) {
  const { bidPackage, record } = context;
  const [entries, sources, artifacts, allProvenance, planRun] = await Promise.all([
    ctx.db
      .query("heliosPackageEntries")
      .withIndex("by_package", (query) => query.eq("packageId", bidPackage._id))
      .collect(),
    ctx.db
      .query("heliosEngineeringSources")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id))
      .collect(),
    ctx.db
      .query("heliosEngineeringArtifacts")
      .withIndex("by_record_kind", (query) => query.eq("engineeringRecordId", record._id))
      .collect(),
    ctx.db
      .query("heliosEngineeringProvenance")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id))
      .collect(),
    ctx.db
      .query("heliosPlanRuns")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", bidPackage._id).eq("isCurrent", true),
      )
      .first(),
  ]);
  const activeArtifactIds = new Set(
    artifacts.filter((artifact) => artifact.status !== "superseded").map((artifact) => String(artifact._id)),
  );
  const provenance = allProvenance.filter((row) => activeArtifactIds.has(String(row.artifactId)));
  const acceptedEntries = entries.filter((entry) =>
    ["uploaded", "duplicate"].includes(entry.status),
  );
  const sourceRecords = await Promise.all(
    acceptedEntries.map(async (entry) => ({
      entry,
      document: entry.documentId ? await ctx.db.get(entry.documentId) : null,
      writtenScope: entry.writtenScopeId ? await ctx.db.get(entry.writtenScopeId) : null,
    })),
  );
  const authoritativeSources = new Map<string, HeliosEngineeringParityIdentity>();
  const documents = new Map<string, Doc<"heliosDocuments">>();
  for (const item of sourceRecords) {
    if (item.document) {
      const key = `document:${item.document._id}`;
      authoritativeSources.set(
        key,
        identity(
          key,
          fingerprintEngineeringSource({
            sha256: item.document.sha256,
            packageRevision: bidPackage.revision,
            sourceVersion: item.document.version,
          }),
        ),
      );
      documents.set(String(item.document._id), item.document);
    } else if (item.writtenScope) {
      const key = `written-scope:${item.writtenScope._id}`;
      authoritativeSources.set(
        key,
        identity(
          key,
          fingerprintEngineeringSource({
            sha256: item.writtenScope.sha256,
            packageRevision: bidPackage.revision,
            sourceVersion: item.writtenScope.version,
          }),
        ),
      );
    }
  }
  const canonicalSources = sources
    .filter((source) => source.status !== "superseded")
    .map((source) => {
      const key = source.documentId
        ? `document:${source.documentId}`
        : `written-scope:${source.writtenScopeId}`;
      return identity(key, source.sourceFingerprint);
    });

  const analyses = (
    await Promise.all(
      [...documents.values()].map((document) =>
        ctx.db
          .query("heliosDocumentIntelligence")
          .withIndex("by_document", (query) => query.eq("documentId", document._id))
          .first(),
      ),
    )
  ).filter((row): row is Doc<"heliosDocumentIntelligence"> => Boolean(row));
  const evidence = (
    await Promise.all(
      [...documents.values()].map((document) =>
        ctx.db
          .query("heliosEvidence")
          .withIndex("by_document", (query) => query.eq("documentId", document._id))
          .collect(),
      ),
    )
  ).flat();

  const planPages = planRun
    ? await ctx.db
        .query("heliosPlanPages")
        .withIndex("by_run_page", (query) => query.eq("runId", planRun._id))
        .collect()
    : [];
  const [planCalibrations, planReferences] = planRun
    ? await Promise.all([
        ctx.db
          .query("heliosPlanCalibrations")
          .withIndex("by_run", (query) => query.eq("runId", planRun._id))
          .collect(),
        ctx.db
          .query("heliosPlanReferences")
          .withIndex("by_run", (query) => query.eq("runId", planRun._id))
          .collect(),
      ])
    : [[], []];
  const geometryRun = planRun
    ? await ctx.db
        .query("heliosCivilGeometryRuns")
        .withIndex("by_plan_current", (query) =>
          query.eq("planRunId", planRun._id).eq("isCurrent", true),
        )
        .first()
    : null;
  const geometry = geometryRun
    ? await ctx.db
        .query("heliosCivilGeometryRecords")
        .withIndex("by_run_created", (query) => query.eq("geometryRunId", geometryRun._id))
        .collect()
    : [];

  const documentReadiness = readiness(record.coverage.documentIntelligence);
  const planReadiness =
    planRun && planRun.status === "ready_for_review"
      ? "ready"
      : readiness(record.coverage.planReconstruction) === "not_applicable"
        ? "not_applicable"
        : "incomplete";
  const geometryReadiness =
    geometryRun && geometryRun.status === "ready_for_review"
      ? "ready"
      : readiness(record.coverage.civilGeometry) === "not_applicable"
        ? "not_applicable"
        : "incomplete";
  const inputs: HeliosEngineeringParityAreaInput[] = [
    {
      area: "sources",
      readiness: authoritativeSources.size ? "ready" : "incomplete",
      authoritative: [...authoritativeSources.values()],
      canonical: canonicalSources,
    },
    {
      area: "document_intelligence",
      readiness: documentReadiness,
      authoritative: analyses.map((row) => identity(String(row._id), fingerprintEngineeringRecord(row))),
      canonical: canonicalRecords(provenance, "heliosDocumentIntelligence"),
    },
    {
      area: "evidence",
      readiness: documentReadiness,
      authoritative: evidence.map((row) => identity(String(row._id), fingerprintEngineeringRecord(row))),
      canonical: canonicalRecords(provenance, "heliosEvidence"),
    },
    {
      area: "plan_pages",
      readiness: planReadiness,
      authoritative: planPages.map((row) => identity(String(row._id), fingerprintEngineeringRecord(row))),
      canonical: canonicalRecords(provenance, "heliosPlanPages"),
    },
    {
      area: "plan_views",
      readiness: planReadiness,
      authoritative: planPages.flatMap((page) =>
        page.views.map((view) =>
          identity(
            `${page._id}:${view.viewKey}`,
            fingerprintPlanView({
              pageId: String(page._id),
              physicalPageNumber: page.physicalPageNumber,
              view,
            }),
          ),
        ),
      ),
      canonical: canonicalRecords(provenance, "heliosPlanPageViews"),
    },
    {
      area: "plan_calibrations",
      readiness: planReadiness,
      authoritative: planCalibrations.map((row) =>
        identity(String(row._id), fingerprintEngineeringRecord(row)),
      ),
      canonical: canonicalRecords(provenance, "heliosPlanCalibrations"),
    },
    {
      area: "plan_references",
      readiness: planReadiness,
      authoritative: planReferences.map((row) =>
        identity(String(row._id), fingerprintEngineeringRecord(row)),
      ),
      canonical: canonicalRecords(provenance, "heliosPlanReferences"),
    },
    {
      area: "civil_geometry",
      readiness: geometryReadiness,
      authoritative: geometry.map((row) => identity(String(row._id), fingerprintEngineeringRecord(row))),
      canonical: canonicalRecords(provenance, "heliosCivilGeometryRecords"),
    },
  ];
  return inputs;
}

export const runGoldenParity = internalMutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const context = await currentParityContext(ctx, args.projectId);
    if (!context) throw new Error("Current canonical engineering record not found.");
    const inputs = await buildParityInputs(ctx, context);
    const result = compareHeliosEngineeringParity(inputs);
    const currentRuns = await ctx.db
      .query("heliosEngineeringParityRuns")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", context.project._id).eq("isCurrent", true),
      )
      .collect();
    const now = Date.now();
    for (const run of currentRuns) await ctx.db.patch(run._id, { isCurrent: false });
    const parityRunId = await ctx.db.insert("heliosEngineeringParityRuns", {
      companyId: context.project.companyId,
      projectId: context.project._id,
      packageId: context.bidPackage._id,
      engineeringRecordId: context.record._id,
      packageRevision: context.bidPackage.revision,
      comparisonVersion: HELIOS_ENGINEERING_PARITY_VERSION,
      inputFingerprint: buildHeliosEngineeringParityFingerprint(inputs),
      status: result.status,
      isCurrent: true,
      areas: result.areas,
      issues: result.issues,
      createdBy: context.record.createdBy,
      createdAt: now,
      completedAt: now,
    });
    return { parityRunId: String(parityRunId), ...result };
  },
});

export const getGoldenParity = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) return null;
    return ctx.db
      .query("heliosEngineeringParityRuns")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", projectId).eq("isCurrent", true),
      )
      .first();
  },
});
