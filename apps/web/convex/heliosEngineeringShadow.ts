import {
  HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION,
  buildHeliosEngineeringSourceFingerprint,
  deriveHeliosEngineeringShadowCoverage,
  deriveHeliosEngineeringShadowRecordStatus,
  type HeliosEngineeringArtifactKind,
  type HeliosEngineeringArtifactStatus,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { deriveProjectBidBasis } from "./heliosBidBasis";

const PROCESSING_VERSION = 1;
const SHADOW_EXTRACTOR_VERSION = "legacy-shadow-v1";
const SHADOW_PROMPT_VERSION = "legacy-authoritative-output-v1";
const SOURCE_MODEL_VERSION = "immutable-source-v1";

type ShadowContext = {
  project: Doc<"heliosProjects">;
  bidPackage: Doc<"heliosBidPackages">;
  record: Doc<"heliosEngineeringRecords">;
  sources: Map<string, Doc<"heliosEngineeringSources">>;
};

const syncPlanDocumentReference = makeFunctionReference<
  "mutation",
  { runId: Id<"heliosPlanRuns">; documentId: Id<"heliosDocuments"> },
  null
>("heliosEngineeringShadow:syncPlanDocumentShadow");

const syncDocumentSourceReference = makeFunctionReference<
  "mutation",
  {
    projectId: Id<"heliosProjects">;
    packageId: Id<"heliosBidPackages">;
    documentId: Id<"heliosDocuments">;
  },
  null
>("heliosEngineeringShadow:syncDocumentSourceShadow");

const syncPlanRunReference = makeFunctionReference<
  "mutation",
  { runId: Id<"heliosPlanRuns"> },
  null
>("heliosEngineeringShadow:syncPlanRunShadow");

const syncGeometryRunReference = makeFunctionReference<
  "mutation",
  { runId: Id<"heliosCivilGeometryRuns"> },
  null
>("heliosEngineeringShadow:syncGeometryRunShadow");

const syncGeometryDocumentReference = makeFunctionReference<
  "mutation",
  { runId: Id<"heliosCivilGeometryRuns">; documentId: Id<"heliosDocuments"> },
  null
>("heliosEngineeringShadow:syncGeometryDocumentShadow");

function sourceKey(documentId?: Id<"heliosDocuments">, writtenScopeId?: Id<"heliosWrittenScopes">) {
  return documentId ? `document:${documentId}` : `written-scope:${writtenScopeId}`;
}

function sourceStatus(document?: Doc<"heliosDocuments">) {
  if (!document) return "ready" as const;
  if (document.status === "completed") return "ready" as const;
  if (document.status === "failed") return "failed" as const;
  if (["queued", "uploading_to_openai", "analyzing"].includes(document.status)) {
    return "extracting" as const;
  }
  if (document.status === "superseded") return "superseded" as const;
  return "registered" as const;
}

async function packageFingerprint(
  ctx: MutationCtx,
  bidPackage: Doc<"heliosBidPackages">,
  fallback: string,
) {
  const envelopes = await ctx.db
    .query("heliosPackageEnvelopes")
    .withIndex("by_package", (query) => query.eq("packageId", bidPackage._id))
    .order("desc")
    .first();
  return envelopes?.manifestFingerprint || fallback;
}

async function ensureRecordAndSources(
  ctx: MutationCtx,
  projectId: Id<"heliosProjects">,
  packageId: Id<"heliosBidPackages">,
): Promise<ShadowContext | null> {
  const [project, bidPackage] = await Promise.all([
    ctx.db.get(projectId),
    ctx.db.get(packageId),
  ]);
  if (
    !project ||
    !bidPackage ||
    bidPackage.projectId !== project._id ||
    bidPackage.companyId !== project.companyId
  ) {
    return null;
  }
  const basis = await deriveProjectBidBasis(ctx, project, bidPackage);
  const sourceFingerprint = await packageFingerprint(ctx, bidPackage, basis.sourceFingerprint);
  const shouldBeCurrent =
    project.activePackageId === bidPackage._id && bidPackage.status !== "superseded";
  let record = await ctx.db
    .query("heliosEngineeringRecords")
    .withIndex("by_package_current", (query) =>
      query.eq("packageId", bidPackage._id).eq("isCurrent", shouldBeCurrent),
    )
    .first();
  const now = Date.now();
  if (!record) {
    const packageRecords = await ctx.db
      .query("heliosEngineeringRecords")
      .withIndex("by_package", (query) => query.eq("packageId", bidPackage._id))
      .collect();
    record = packageRecords.find((candidate) => candidate.packageRevision === bidPackage.revision) || null;
  }
  if (shouldBeCurrent) {
    const otherCurrent = await ctx.db
      .query("heliosEngineeringRecords")
      .withIndex("by_project_current", (query) =>
        query.eq("projectId", project._id).eq("isCurrent", true),
      )
      .collect();
    for (const candidate of otherCurrent) {
      if (record && candidate._id === record._id) continue;
      await ctx.db.patch(candidate._id, {
        isCurrent: false,
        status: "superseded",
        updatedAt: now,
      });
    }
  }
  if (!record) {
    const recordId = await ctx.db.insert("heliosEngineeringRecords", {
      companyId: project.companyId,
      projectId: project._id,
      packageId: bidPackage._id,
      packageRevision: bidPackage.revision,
      bidBasisFingerprint: basis.sourceFingerprint,
      sourceFingerprint,
      schemaVersion: HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION,
      processingVersion: PROCESSING_VERSION,
      status: "draft",
      isCurrent: shouldBeCurrent,
      coverage: {
        documentIntelligence: "pending",
        planReconstruction: "pending",
        civilGeometry: "pending",
      },
      sourceCount: 0,
      pageCount: 0,
      assetCount: 0,
      unresolvedIssueCount: 0,
      createdBy: bidPackage.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    record = await ctx.db.get(recordId);
    if (!record) return null;
  } else {
    await ctx.db.patch(record._id, {
      bidBasisFingerprint: basis.sourceFingerprint,
      sourceFingerprint,
      isCurrent: shouldBeCurrent,
      updatedAt: now,
    });
    record = (await ctx.db.get(record._id)) || record;
  }

  const entries = await ctx.db
    .query("heliosPackageEntries")
    .withIndex("by_package", (query) => query.eq("packageId", bidPackage._id))
    .collect();
  const acceptedEntries = entries.filter((entry) =>
    ["uploaded", "duplicate"].includes(entry.status),
  );
  const sources = new Map<string, Doc<"heliosEngineeringSources">>();
  for (const entry of acceptedEntries) {
    const [document, writtenScope] = await Promise.all([
      entry.documentId ? ctx.db.get(entry.documentId) : null,
      entry.writtenScopeId ? ctx.db.get(entry.writtenScopeId) : null,
    ]);
    if (!document && !writtenScope) continue;
    if (
      (document && (document.projectId !== project._id || document.companyId !== project.companyId)) ||
      (writtenScope && (writtenScope.projectId !== project._id || writtenScope.companyId !== project.companyId))
    ) {
      continue;
    }
    const key = sourceKey(document?._id, writtenScope?._id);
    if (sources.has(key)) continue;
    let source = document
      ? await ctx.db
          .query("heliosEngineeringSources")
          .withIndex("by_record_document", (query) =>
            query.eq("engineeringRecordId", record!._id).eq("documentId", document._id),
          )
          .first()
      : await ctx.db
          .query("heliosEngineeringSources")
          .withIndex("by_record_written_scope", (query) =>
            query.eq("engineeringRecordId", record!._id).eq("writtenScopeId", writtenScope!._id),
          )
          .first();
    const sha256 = document?.sha256 || writtenScope!.sha256;
    const version = document?.version || writtenScope!.version;
    const fingerprint = buildHeliosEngineeringSourceFingerprint({
      sha256,
      packageRevision: bidPackage.revision,
      sourceVersion: version,
      ingestionSchemaVersion: HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION,
      extractorVersion: SHADOW_EXTRACTOR_VERSION,
      promptVersion: SHADOW_PROMPT_VERSION,
      modelVersion: SOURCE_MODEL_VERSION,
    });
    const values = {
      status: sourceStatus(document || undefined),
      lastError: document?.lastError,
      updatedAt: now,
    };
    if (!source) {
      const sourceId = await ctx.db.insert("heliosEngineeringSources", {
        companyId: project.companyId,
        projectId: project._id,
        packageId: bidPackage._id,
        engineeringRecordId: record._id,
        sourceKind: document ? "pdf" : "written_scope",
        documentId: document?._id,
        writtenScopeId: writtenScope?._id,
        originalStorageId: document?.storageId,
        originalSha256: sha256,
        originalFileName: document?.fileName || writtenScope!.canonicalTitle,
        relativePath: entry.relativePath,
        contentType: document?.contentType || "text/plain",
        byteSize: document?.size || writtenScope!.size,
        sourceVersion: version,
        sourceFingerprint: fingerprint,
        immutable: true,
        createdAt: now,
        ...values,
      });
      source = await ctx.db.get(sourceId);
    } else {
      await ctx.db.patch(source._id, values);
      source = (await ctx.db.get(source._id)) || source;
    }
    if (source) sources.set(key, source);
  }
  return { project, bidPackage, record, sources };
}

async function refreshRecord(ctx: MutationCtx, shadow: ShadowContext) {
  const [basis, planRun, sources, pages, assets, artifacts] = await Promise.all([
    deriveProjectBidBasis(ctx, shadow.project, shadow.bidPackage),
    ctx.db
      .query("heliosPlanRuns")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", shadow.bidPackage._id).eq("isCurrent", true),
      )
      .first(),
    ctx.db
      .query("heliosEngineeringSources")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", shadow.record._id))
      .collect(),
    ctx.db
      .query("heliosEngineeringPages")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", shadow.record._id))
      .collect(),
    ctx.db
      .query("heliosEngineeringAssets")
      .withIndex("by_record", (query) => query.eq("engineeringRecordId", shadow.record._id))
      .collect(),
    ctx.db
      .query("heliosEngineeringArtifacts")
      .withIndex("by_record_kind", (query) =>
        query.eq("engineeringRecordId", shadow.record._id),
      )
      .collect(),
  ]);
  const pdfSources = sources.filter((source) => source.sourceKind === "pdf");
  const documents = (
    await Promise.all(pdfSources.map((source) => source.documentId && ctx.db.get(source.documentId)))
  ).filter((document): document is Doc<"heliosDocuments"> => Boolean(document));
  const geometryRun = planRun
    ? await ctx.db
        .query("heliosCivilGeometryRuns")
        .withIndex("by_plan_current", (query) =>
          query.eq("planRunId", planRun._id).eq("isCurrent", true),
        )
        .first()
    : null;
  const plansApplicable =
    basis.categories.find((category) => category.category === "plans")?.state === "received";
  const coverage = deriveHeliosEngineeringShadowCoverage({
    pdfSourceCount: documents.length,
    completedDocumentCount: documents.filter((document) => document.status === "completed").length,
    failedDocumentCount: documents.filter((document) => document.status === "failed").length,
    activeDocumentCount: documents.filter((document) =>
      ["queued", "uploading_to_openai", "analyzing", "ready_for_intelligence"].includes(document.status),
    ).length,
    plansApplicable,
    planRunStatus: planRun?.status,
    geometryRunStatus: geometryRun?.status,
  });
  const activeArtifacts = artifacts.filter((artifact) => artifact.status !== "superseded");
  const now = Date.now();
  await ctx.db.patch(shadow.record._id, {
    bidBasisFingerprint: basis.sourceFingerprint,
    coverage,
    status: deriveHeliosEngineeringShadowRecordStatus(coverage),
    sourceCount: sources.filter((source) => source.status !== "superseded").length,
    pageCount: pages.length,
    assetCount: assets.length,
    unresolvedIssueCount: activeArtifacts.reduce(
      (sum, artifact) => sum + artifact.unresolvedIssueCount,
      0,
    ),
    updatedAt: now,
    completedAt:
      Object.values(coverage).every((status) =>
        ["ready", "not_applicable", "partially_ready", "failed"].includes(status),
      )
        ? now
        : undefined,
  });
}

async function ensureArtifact(
  ctx: MutationCtx,
  shadow: ShadowContext,
  input: {
    source?: Doc<"heliosEngineeringSources">;
    kind: HeliosEngineeringArtifactKind;
    status: HeliosEngineeringArtifactStatus;
    sourceFingerprint: string;
    processingVersion: number;
    modelVersion: string;
    authoritativeRecordType: string;
    authoritativeRecordId: string;
    recordCount: number;
    unresolvedIssueCount: number;
    lastError?: string;
    completedAt?: number;
  },
) {
  let artifact = await ctx.db
    .query("heliosEngineeringArtifacts")
    .withIndex("by_authoritative_record", (query) =>
      query
        .eq("engineeringRecordId", shadow.record._id)
        .eq("authoritativeRecordType", input.authoritativeRecordType)
        .eq("authoritativeRecordId", input.authoritativeRecordId),
    )
    .first();
  const peers = input.source
    ? await ctx.db
        .query("heliosEngineeringArtifacts")
        .withIndex("by_source_kind", (query) =>
          query.eq("engineeringSourceId", input.source!._id).eq("kind", input.kind),
        )
        .collect()
    : await ctx.db
        .query("heliosEngineeringArtifacts")
        .withIndex("by_record_kind", (query) =>
          query.eq("engineeringRecordId", shadow.record._id).eq("kind", input.kind),
        )
        .collect();
  const now = Date.now();
  for (const peer of peers) {
    if (artifact && peer._id === artifact._id) continue;
    if (peer.status !== "superseded") {
      await ctx.db.patch(peer._id, { status: "superseded", updatedAt: now });
    }
  }
  const values = {
    status: input.status,
    sourceFingerprint: input.sourceFingerprint,
    schemaVersion: HELIOS_ENGINEERING_RECORD_SCHEMA_VERSION,
    processingVersion: input.processingVersion,
    extractorVersion: SHADOW_EXTRACTOR_VERSION,
    promptVersion: SHADOW_PROMPT_VERSION,
    modelVersion: input.modelVersion,
    authoritativeRecordType: input.authoritativeRecordType,
    authoritativeRecordId: input.authoritativeRecordId,
    shadowMode: true,
    recordCount: input.recordCount,
    unresolvedIssueCount: input.unresolvedIssueCount,
    lastError: input.lastError,
    updatedAt: now,
    completedAt: input.completedAt,
  };
  if (!artifact) {
    const artifactId = await ctx.db.insert("heliosEngineeringArtifacts", {
      companyId: shadow.project.companyId,
      projectId: shadow.project._id,
      packageId: shadow.bidPackage._id,
      engineeringRecordId: shadow.record._id,
      engineeringSourceId: input.source?._id,
      kind: input.kind,
      createdAt: now,
      ...values,
    });
    artifact = await ctx.db.get(artifactId);
  } else {
    await ctx.db.patch(artifact._id, values);
    artifact = (await ctx.db.get(artifact._id)) || artifact;
  }
  return artifact;
}

async function ensureProvenance(
  ctx: MutationCtx,
  shadow: ShadowContext,
  input: {
    source: Doc<"heliosEngineeringSources">;
    artifact: Doc<"heliosEngineeringArtifacts">;
    pageId?: Id<"heliosEngineeringPages">;
    evidenceId?: Id<"heliosEvidence">;
    provenanceKind: "source" | "page" | "text_span" | "visual_region";
    recordType: string;
    recordId: string;
    sourceLocator: string;
    confidence: number;
  },
) {
  const existing = await ctx.db
    .query("heliosEngineeringProvenance")
    .withIndex("by_artifact_record", (query) =>
      query
        .eq("artifactId", input.artifact._id)
        .eq("recordType", input.recordType)
        .eq("recordId", input.recordId),
    )
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, {
      pageId: input.pageId || existing.pageId,
      evidenceId: input.evidenceId || existing.evidenceId,
      sourceLocator: input.sourceLocator,
      confidence: input.confidence,
    });
    return existing._id;
  }
  return ctx.db.insert("heliosEngineeringProvenance", {
    companyId: shadow.project.companyId,
    projectId: shadow.project._id,
    engineeringRecordId: shadow.record._id,
    engineeringSourceId: input.source._id,
    artifactId: input.artifact._id,
    pageId: input.pageId,
    evidenceId: input.evidenceId,
    provenanceKind: input.provenanceKind,
    recordType: input.recordType,
    recordId: input.recordId,
    sourceLocator: input.sourceLocator,
    textSpanIds: [],
    confidence: input.confidence,
    createdAt: Date.now(),
  });
}

async function mirrorDocumentSource(
  ctx: MutationCtx,
  shadow: ShadowContext,
  source: Doc<"heliosEngineeringSources">,
  documentId: Id<"heliosDocuments">,
) {
  const job = await ctx.db
    .query("heliosIntelligenceJobs")
    .withIndex("by_document", (query) => query.eq("documentId", documentId))
    .order("desc")
    .first();
  if (!job || job.kind !== "document") return;
  const [analysis, evidence] = await Promise.all([
    ctx.db
      .query("heliosDocumentIntelligence")
      .withIndex("by_document", (query) => query.eq("documentId", documentId))
      .first(),
    ctx.db
      .query("heliosEvidence")
      .withIndex("by_document", (query) => query.eq("documentId", documentId))
      .collect(),
  ]);
  const status: HeliosEngineeringArtifactStatus =
    job.status === "completed" && analysis
      ? "ready"
      : job.status === "failed"
        ? "failed"
        : "processing";
  const artifact = await ensureArtifact(ctx, shadow, {
    source,
    kind: "document_intelligence",
    status,
    sourceFingerprint: source.sourceFingerprint,
    processingVersion: analysis?.schemaVersion || PROCESSING_VERSION,
    modelVersion: analysis?.model || job.model || "unknown",
    authoritativeRecordType: "heliosIntelligenceJobs",
    authoritativeRecordId: String(job._id),
    recordCount: analysis ? analysis.findings.length + 1 : 0,
    unresolvedIssueCount: analysis?.findings.length || 0,
    lastError: job.error,
    completedAt: job.completedAt,
  });
  if (!artifact || !analysis) return;
  await ensureProvenance(ctx, shadow, {
    source,
    artifact,
    provenanceKind: "source",
    recordType: "heliosDocumentIntelligence",
    recordId: String(analysis._id),
    sourceLocator: source.relativePath,
    confidence: analysis.confidence,
  });
  for (const row of evidence) {
    await ensureProvenance(ctx, shadow, {
      source,
      artifact,
      evidenceId: row._id,
      provenanceKind: row.pageNumber ? "page" : "source",
      recordType: "heliosEvidence",
      recordId: String(row._id),
      sourceLocator: row.pageNumber
        ? `PDF page ${row.pageNumber} · ${row.locator}`
        : row.locator,
      confidence: analysis.confidence,
    });
  }
}

export const syncProjectShadow = internalMutation({
  args: { projectId: v.id("heliosProjects"), packageId: v.id("heliosBidPackages") },
  handler: async (ctx, args) => {
    const shadow = await ensureRecordAndSources(ctx, args.projectId, args.packageId);
    if (shadow) {
      for (const source of shadow.sources.values()) {
        if (source.documentId) {
          await ctx.scheduler.runAfter(0, syncDocumentSourceReference, {
            projectId: shadow.project._id,
            packageId: shadow.bidPackage._id,
            documentId: source.documentId,
          });
        }
      }
      await refreshRecord(ctx, shadow);
    }
    return null;
  },
});

export const syncActiveProjectShadow = internalMutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) return null;
    const shadow = await ensureRecordAndSources(ctx, project._id, project.activePackageId);
    if (!shadow) return null;
    for (const source of shadow.sources.values()) {
      if (source.documentId) {
        await ctx.scheduler.runAfter(0, syncDocumentSourceReference, {
          projectId: shadow.project._id,
          packageId: shadow.bidPackage._id,
          documentId: source.documentId,
        });
      }
    }
    const planRun = await ctx.db
      .query("heliosPlanRuns")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first();
    if (planRun) {
      await ctx.scheduler.runAfter(0, syncPlanRunReference, { runId: planRun._id });
      const geometryRun = await ctx.db
        .query("heliosCivilGeometryRuns")
        .withIndex("by_plan_current", (query) =>
          query.eq("planRunId", planRun._id).eq("isCurrent", true),
        )
        .first();
      if (geometryRun) {
        await ctx.scheduler.runAfter(0, syncGeometryRunReference, { runId: geometryRun._id });
      }
    }
    await refreshRecord(ctx, shadow);
    return String(shadow.record._id);
  },
});

export const syncDocumentShadow = internalMutation({
  args: { jobId: v.id("heliosIntelligenceJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job?.documentId || !job.packageId || job.kind !== "document") return null;
    const latestJob = await ctx.db
      .query("heliosIntelligenceJobs")
      .withIndex("by_document", (query) => query.eq("documentId", job.documentId!))
      .order("desc")
      .first();
    if (latestJob?._id !== job._id) return null;
    const project = await ctx.db.get(job.projectId);
    const targetPackageIds = new Set<Id<"heliosBidPackages">>([job.packageId]);
    if (project?.activePackageId) targetPackageIds.add(project.activePackageId);
    for (const packageId of targetPackageIds) {
      const shadow = await ensureRecordAndSources(ctx, job.projectId, packageId);
      const source = shadow?.sources.get(sourceKey(job.documentId));
      if (!shadow || !source) continue;
      await mirrorDocumentSource(ctx, shadow, source, job.documentId);
      await refreshRecord(ctx, shadow);
    }
    return null;
  },
});

export const syncDocumentSourceShadow = internalMutation({
  args: {
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    documentId: v.id("heliosDocuments"),
  },
  handler: async (ctx, args) => {
    const shadow = await ensureRecordAndSources(ctx, args.projectId, args.packageId);
    const source = shadow?.sources.get(sourceKey(args.documentId));
    if (!shadow || !source) return null;
    await mirrorDocumentSource(ctx, shadow, source, args.documentId);
    await refreshRecord(ctx, shadow);
    return null;
  },
});

function artifactStatus(status: string): HeliosEngineeringArtifactStatus {
  if (status === "ready_for_review") return "ready";
  if (status === "partially_ready") return "partially_ready";
  if (status === "failed") return "failed";
  if (status === "not_applicable_to_current_basis") return "ready";
  return status === "queued" ? "pending" : "processing";
}

export const syncPlanRunShadow = internalMutation({
  args: { runId: v.id("heliosPlanRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.isCurrent) return null;
    const shadow = await ensureRecordAndSources(ctx, run.projectId, run.packageId);
    if (!shadow) return null;
    await ensureArtifact(ctx, shadow, {
      kind: "plan_inventory",
      status: artifactStatus(run.status),
      sourceFingerprint: run.sourceFingerprint,
      processingVersion: run.processingVersion,
      modelVersion: run.model || "unknown",
      authoritativeRecordType: "heliosPlanRuns",
      authoritativeRecordId: String(run._id),
      recordCount: run.registeredPageCount + run.unresolvedReferenceCount,
      unresolvedIssueCount: run.issues.length + run.unresolvedReferenceCount + run.blockedMeasurementCount,
      completedAt: run.completedAt,
    });
    const jobs = await ctx.db
      .query("heliosPlanJobs")
      .withIndex("by_run", (query) => query.eq("runId", run._id))
      .collect();
    for (const documentId of new Set(jobs.filter((job) => job.status === "completed").map((job) => job.documentId))) {
      await ctx.scheduler.runAfter(0, syncPlanDocumentReference, { runId: run._id, documentId });
    }
    await refreshRecord(ctx, shadow);
    return null;
  },
});

export const syncPlanDocumentShadow = internalMutation({
  args: { runId: v.id("heliosPlanRuns"), documentId: v.id("heliosDocuments") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.isCurrent) return null;
    const shadow = await ensureRecordAndSources(ctx, run.projectId, run.packageId);
    const source = shadow?.sources.get(sourceKey(args.documentId));
    if (!shadow || !source) return null;
    const artifact = await ctx.db
      .query("heliosEngineeringArtifacts")
      .withIndex("by_authoritative_record", (query) =>
        query
          .eq("engineeringRecordId", shadow.record._id)
          .eq("authoritativeRecordType", "heliosPlanRuns")
          .eq("authoritativeRecordId", String(run._id)),
      )
      .first();
    if (!artifact) return null;
    const pages = (
      await ctx.db
        .query("heliosPlanPages")
        .withIndex("by_run_page", (query) => query.eq("runId", run._id))
        .collect()
    ).filter((page) => page.documentId === args.documentId);
    const pageMap = new Map<string, Id<"heliosEngineeringPages">>();
    for (const page of pages) {
      let canonical = await ctx.db
        .query("heliosEngineeringPages")
        .withIndex("by_source_page", (query) =>
          query.eq("engineeringSourceId", source._id).eq("physicalPageNumber", page.physicalPageNumber),
        )
        .first();
      const channelState = page.modality === "unusable" ? "failed" as const : "pending" as const;
      const values = {
        sourcePlanPageId: page._id,
        printedPageNumber: page.printedPageNumber,
        sheetNumber: page.sheetNumber,
        title: page.title,
        confidence: page.confidence,
        modality: page.modality,
        nativeTextStatus: page.modality === "scanned" ? "not_applicable" as const : channelState,
        ocrStatus: page.modality === "vector" ? "not_applicable" as const : channelState,
        updatedAt: Date.now(),
      };
      if (!canonical) {
        const id = await ctx.db.insert("heliosEngineeringPages", {
          companyId: shadow.project.companyId,
          projectId: shadow.project._id,
          engineeringRecordId: shadow.record._id,
          engineeringSourceId: source._id,
          physicalPageNumber: page.physicalPageNumber,
          createdAt: Date.now(),
          ...values,
        });
        canonical = await ctx.db.get(id);
      } else {
        await ctx.db.patch(canonical._id, values);
        canonical = (await ctx.db.get(canonical._id)) || canonical;
      }
      if (!canonical) continue;
      pageMap.set(String(page._id), canonical._id);
      await ensureProvenance(ctx, shadow, {
        source,
        artifact,
        pageId: canonical._id,
        provenanceKind: "page",
        recordType: "heliosPlanPages",
        recordId: String(page._id),
        sourceLocator: `${page.sheetNumber || `PDF page ${page.physicalPageNumber}`} · ${page.title}`,
        confidence: page.confidence,
      });
    }
    const [references, calibrations] = await Promise.all([
      ctx.db.query("heliosPlanReferences").withIndex("by_run", (query) => query.eq("runId", run._id)).collect(),
      ctx.db.query("heliosPlanCalibrations").withIndex("by_run", (query) => query.eq("runId", run._id)).collect(),
    ]);
    for (const reference of references.filter((row) => pageMap.has(String(row.sourcePageId)))) {
      await ensureProvenance(ctx, shadow, {
        source,
        artifact,
        pageId: pageMap.get(String(reference.sourcePageId)),
        provenanceKind: "page",
        recordType: "heliosPlanReferences",
        recordId: String(reference._id),
        sourceLocator: reference.locator,
        confidence: reference.confidence,
      });
    }
    for (const calibration of calibrations.filter((row) => pageMap.has(String(row.pageId)))) {
      await ensureProvenance(ctx, shadow, {
        source,
        artifact,
        pageId: pageMap.get(String(calibration.pageId)),
        provenanceKind: "visual_region",
        recordType: "heliosPlanCalibrations",
        recordId: String(calibration._id),
        sourceLocator: calibration.sourceRegion || calibration.viewKey,
        confidence: calibration.confidence,
      });
    }
    await refreshRecord(ctx, shadow);
    return null;
  },
});

export const syncGeometryRunShadow = internalMutation({
  args: { runId: v.id("heliosCivilGeometryRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.isCurrent) return null;
    const shadow = await ensureRecordAndSources(ctx, run.projectId, run.packageId);
    if (!shadow) return null;
    const planRun = await ctx.db.get(run.planRunId);
    await ensureArtifact(ctx, shadow, {
      kind: "civil_geometry",
      status: artifactStatus(run.status),
      sourceFingerprint: `${planRun?.sourceFingerprint || shadow.record.sourceFingerprint}|civil:${run.processingVersion}`,
      processingVersion: run.processingVersion,
      modelVersion: run.model || "unknown",
      authoritativeRecordType: "heliosCivilGeometryRuns",
      authoritativeRecordId: String(run._id),
      recordCount: run.recordCount,
      unresolvedIssueCount: run.unresolvedIssueCount,
      completedAt: run.completedAt,
    });
    const jobs = await ctx.db
      .query("heliosCivilGeometryJobs")
      .withIndex("by_run", (query) => query.eq("geometryRunId", run._id))
      .collect();
    for (const documentId of new Set(jobs.filter((job) => job.status === "completed").map((job) => job.documentId))) {
      await ctx.scheduler.runAfter(0, syncGeometryDocumentReference, { runId: run._id, documentId });
    }
    await refreshRecord(ctx, shadow);
    return null;
  },
});

export const syncGeometryDocumentShadow = internalMutation({
  args: { runId: v.id("heliosCivilGeometryRuns"), documentId: v.id("heliosDocuments") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.isCurrent) return null;
    const shadow = await ensureRecordAndSources(ctx, run.projectId, run.packageId);
    const source = shadow?.sources.get(sourceKey(args.documentId));
    if (!shadow || !source) return null;
    const artifact = await ctx.db
      .query("heliosEngineeringArtifacts")
      .withIndex("by_authoritative_record", (query) =>
        query
          .eq("engineeringRecordId", shadow.record._id)
          .eq("authoritativeRecordType", "heliosCivilGeometryRuns")
          .eq("authoritativeRecordId", String(run._id)),
      )
      .first();
    if (!artifact) return null;
    const records = (
      await ctx.db
        .query("heliosCivilGeometryRecords")
        .withIndex("by_run_created", (query) => query.eq("geometryRunId", run._id))
        .collect()
    ).filter((record) => record.documentId === args.documentId);
    for (const record of records) {
      const canonicalPage = await ctx.db
        .query("heliosEngineeringPages")
        .withIndex("by_source_plan_page", (query) => query.eq("sourcePlanPageId", record.pageId))
        .first();
      await ensureProvenance(ctx, shadow, {
        source,
        artifact,
        pageId: canonicalPage?._id,
        provenanceKind: "visual_region",
        recordType: "heliosCivilGeometryRecords",
        recordId: String(record._id),
        sourceLocator: record.sourceLocator,
        confidence: record.confidence,
      });
    }
    await refreshRecord(ctx, shadow);
    return null;
  },
});

export const getShadowParity = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project?.activePackageId) return null;
    const record = await ctx.db
      .query("heliosEngineeringRecords")
      .withIndex("by_package_current", (query) =>
        query.eq("packageId", project.activePackageId!).eq("isCurrent", true),
      )
      .first();
    if (!record) return null;
    const [entries, sources, artifacts, pages, provenance, planRun] = await Promise.all([
      ctx.db.query("heliosPackageEntries").withIndex("by_package", (query) => query.eq("packageId", project.activePackageId!)).collect(),
      ctx.db.query("heliosEngineeringSources").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosEngineeringArtifacts").withIndex("by_record_kind", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosEngineeringPages").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosEngineeringProvenance").withIndex("by_record", (query) => query.eq("engineeringRecordId", record._id)).collect(),
      ctx.db.query("heliosPlanRuns").withIndex("by_package_current", (query) => query.eq("packageId", project.activePackageId!).eq("isCurrent", true)).first(),
    ]);
    const authoritativePlanPages = planRun
      ? await ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", planRun._id)).collect()
      : [];
    return {
      recordId: String(record._id),
      shadowMode: true,
      authoritativeSourceCount: new Set(
        entries
          .filter((entry) => ["uploaded", "duplicate"].includes(entry.status))
          .map((entry) => entry.documentId || entry.writtenScopeId)
          .filter(Boolean)
          .map(String),
      ).size,
      canonicalSourceCount: sources.length,
      authoritativePlanPageCount: authoritativePlanPages.length,
      canonicalPlanPageCount: pages.length,
      documentArtifactCount: artifacts.filter((artifact) => artifact.kind === "document_intelligence" && artifact.status !== "superseded").length,
      planArtifactCount: artifacts.filter((artifact) => artifact.kind === "plan_inventory" && artifact.status !== "superseded").length,
      geometryArtifactCount: artifacts.filter((artifact) => artifact.kind === "civil_geometry" && artifact.status !== "superseded").length,
      provenanceCount: provenance.length,
      coverage: record.coverage,
      status: record.status,
    };
  },
});
