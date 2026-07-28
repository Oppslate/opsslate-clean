import {
  HELIOS_MAX_PDF_BYTES,
  HELIOS_UPLOAD_INTENT_LIFETIME_MS,
  HELIOS_BID_BASIS_AVAILABILITY_STATES,
  HELIOS_BID_BASIS_CATEGORIES,
  HELIOS_BID_BASIS_PROFILES,
  canonicalPdfFileName,
  deriveHeliosBidBasis,
  normalizeProjectInput,
  sha256MatchesStorageDigest,
  type HeliosBidBasisAvailabilityState,
  type HeliosBidBasisCategory,
  type HeliosBidBasisProfileType,
  type HeliosFindingReviewStatus,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

const queueDocumentReference = makeFunctionReference<
  "mutation",
  { documentId: Id<"heliosDocuments"> },
  Id<"heliosIntelligenceJobs"> | null
>("heliosIntelligence:queueDocument");

const projectInputValidator = v.object({
  name: v.string(),
  projectNumber: v.optional(v.string()),
  ownerClient: v.optional(v.string()),
  engineer: v.optional(v.string()),
  bidDate: v.optional(v.string()),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
});

function projectSummary(
  project: Doc<"heliosProjects">,
  documentCount: number,
) {
  return {
    id: project._id,
    name: project.name,
    projectNumber: project.projectNumber,
    ownerClient: project.ownerClient,
    engineer: project.engineer,
    bidDate: project.bidDate,
    location: project.location,
    notes: project.notes,
    status: project.status,
    intelligenceStatus: project.intelligenceStatus,
    documentCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function documentSummary(document: Doc<"heliosDocuments">) {
  return {
    id: document._id,
    projectId: document.projectId,
    fileName: document.fileName,
    contentType: document.contentType,
    size: document.size,
    sha256: document.sha256,
    status: document.status,
    attemptCount: document.attemptCount || 0,
    lastError: document.lastError,
    packageId: document.packageId ? String(document.packageId) : undefined,
    relativePath: document.relativePath,
    processingStartedAt: document.processingStartedAt,
    processingCompletedAt: document.processingCompletedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function ownedProject(
  ctx: QueryCtx | MutationCtx,
  companyId: Doc<"users">["companyId"],
  projectIdValue: string,
) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  if (!projectId) throw new Error("Project not found.");
  const project = await ctx.db.get(projectId);
  if (!project || project.companyId !== companyId) {
    throw new Error("Project not found.");
  }
  return project;
}

export const listCockpit = internalQuery({
  args: { principal: heliosPrincipalValidator },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const projects = await ctx.db
      .query("heliosProjects")
      .withIndex("by_company_updated", (query) =>
        query.eq("companyId", companyId),
      )
      .order("desc")
      .take(25);

    const projectRows = await Promise.all(
      projects.map(async (project) => {
        const documents = await ctx.db
          .query("heliosDocuments")
          .withIndex("by_project", (query) =>
            query.eq("projectId", project._id),
          )
          .collect();
        return {
          project: projectSummary(project, documents.length),
          documents,
        };
      }),
    );

    const processingQueue = projectRows
      .flatMap(({ project, documents }) =>
        documents
          .filter((document) =>
            [
              "ready_for_intelligence",
              "queued",
              "uploading_to_openai",
              "analyzing",
              "failed",
            ].includes(document.status),
          )
          .map((document) => ({
            document: documentSummary(document),
            projectName: project.name,
          })),
      )
      .sort((left, right) => right.document.updatedAt - left.document.updatedAt)
      .slice(0, 20);

    return {
      recentProjects: projectRows.map(({ project }) => project),
      processingQueue,
    };
  },
});

export const createProject = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    input: projectInputValidator,
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const input = normalizeProjectInput(args.input);
    const now = Date.now();
    const projectId = await ctx.db.insert("heliosProjects", {
      companyId,
      createdBy: user._id,
      ...input,
      status: "draft",
      intelligenceStatus: "awaiting_documents",
      createdAt: now,
      updatedAt: now,
    });
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project could not be created.");
    return projectSummary(project, 0);
  },
});

export const getProject = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const documents = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project", (query) =>
        query.eq("projectId", project._id),
      )
      .order("desc")
      .collect();
    const documentAnalyses = await Promise.all(
      documents.map((document) =>
        ctx.db
          .query("heliosDocumentIntelligence")
          .withIndex("by_document", (query) =>
            query.eq("documentId", document._id),
          )
          .first(),
      ),
    );
    const documentSummaries = documents.map((document, index) => ({
      ...documentSummary(document),
      documentType: documentAnalyses[index]?.documentType,
    }));
    const packages = await ctx.db
      .query("heliosBidPackages")
      .withIndex("by_project_revision", (query) =>
        query.eq("projectId", project._id),
      )
      .order("desc")
      .collect();
    const packageRows = await Promise.all(
      packages.map(async (bidPackage) => {
        const [entries, envelopes] = await Promise.all([
          ctx.db
            .query("heliosPackageEntries")
            .withIndex("by_package", (query) =>
              query.eq("packageId", bidPackage._id),
            )
            .collect(),
          ctx.db
            .query("heliosPackageEnvelopes")
            .withIndex("by_package", (query) =>
              query.eq("packageId", bidPackage._id),
            )
            .collect(),
        ]);
        return {
          id: String(bidPackage._id),
          projectId: String(project._id),
          name: bidPackage.name,
          sourceType: bidPackage.sourceType,
          adapter: bidPackage.adapter || ("manual" as const),
          manifestVersion: bidPackage.manifestVersion || 1,
          revisionKind:
            bidPackage.revisionKind ||
            (bidPackage.revision === 1
              ? ("initial" as const)
              : ("supplemental" as const)),
          revisionLabel: bidPackage.revisionLabel,
          revision: bidPackage.revision,
          status: bidPackage.status,
          entryCount: bidPackage.entryCount,
          pdfCount: bidPackage.pdfCount,
          rejectedCount: bidPackage.rejectedCount,
          uploadedCount: bidPackage.uploadedCount,
          duplicateCount: bidPackage.duplicateCount,
          failedCount: bidPackage.failedCount,
          writtenScopeCount: bidPackage.writtenScopeCount || 0,
          totalBytes: bidPackage.totalBytes,
          lastError: bidPackage.lastError,
          finalizedAt: bidPackage.finalizedAt,
          analysisCompletedAt: bidPackage.analysisCompletedAt,
          createdAt: bidPackage.createdAt,
          updatedAt: bidPackage.updatedAt,
          entries: entries.map((entry) => ({
            id: String(entry._id),
            packageId: String(entry.packageId),
            envelopeId: entry.envelopeRecordId
              ? envelopes.find(
                  (envelope) => envelope._id === entry.envelopeRecordId,
                )?.envelopeId
              : undefined,
            kind: entry.kind || ("pdf" as const),
            sourceCategory: entry.sourceCategory || ("unknown" as const),
            relativePath: entry.relativePath,
            size: entry.size,
            sha256: entry.sha256,
            status: entry.status,
            reason: entry.reason,
            documentId: entry.documentId
              ? String(entry.documentId)
              : undefined,
            writtenScopeId: entry.writtenScopeId
              ? String(entry.writtenScopeId)
              : undefined,
          })),
          envelopes: envelopes.map((envelope) => ({
            id: String(envelope._id),
            envelopeId: envelope.envelopeId,
            adapter: envelope.adapter,
            sourceType: envelope.sourceType,
            manifestVersion: envelope.manifestVersion,
            revisionKind: envelope.revisionKind,
            revisionLabel: envelope.revisionLabel,
            status: envelope.status,
            entryCount: envelope.entryCount,
            acceptedCount: envelope.acceptedCount,
            rejectedCount: envelope.rejectedCount,
            totalBytes: envelope.totalBytes,
            createdAt: envelope.createdAt,
            updatedAt: envelope.updatedAt,
          })),
        };
      }),
    );
    const writtenScopes = await ctx.db
      .query("heliosWrittenScopes")
      .withIndex("by_project", (query) =>
        query.eq("projectId", project._id),
      )
      .order("desc")
      .collect();
    const intelligence = await ctx.db
      .query("heliosProjectIntelligence")
      .withIndex("by_project", (query) =>
        query.eq("projectId", project._id),
      )
      .order("desc")
      .first();
    const evidence = intelligence
      ? await ctx.db
          .query("heliosEvidence")
          .withIndex("by_project", (query) =>
            query.eq("projectId", project._id),
          )
          .collect()
      : [];
    const reviewEvents = intelligence
      ? await ctx.db
          .query("heliosFindingReviewEvents")
          .withIndex("by_intelligence_created", (query) =>
            query.eq("intelligenceId", intelligence._id),
          )
          .order("asc")
          .collect()
      : [];
    const reviewEventsByFinding = new Map<
      string,
      typeof reviewEvents
    >();
    for (const event of reviewEvents) {
      const existing = reviewEventsByFinding.get(event.findingId) || [];
      reviewEventsByFinding.set(event.findingId, [...existing, event]);
    }
    const findings =
      intelligence?.findings.map((finding, index) => {
        const findingId = `${intelligence._id}:finding:${index}`;
        const history = reviewEventsByFinding.get(findingId) || [];
        const latest = history[history.length - 1];
        let correctedTitle: string | undefined;
        let correctedDetail: string | undefined;
        let trade: string | undefined;
        for (const event of history) {
          correctedTitle = event.correctedTitle || correctedTitle;
          correctedDetail = event.correctedDetail || correctedDetail;
          trade = event.trade || trade;
        }
        return {
          id: findingId,
          ...finding,
          evidenceIds: finding.evidenceIds.map(String),
          review: {
            status: (latest?.status ||
              "needs_review") as HeliosFindingReviewStatus,
            correctedTitle,
            correctedDetail,
            trade,
            reviewerName: latest?.reviewerName,
            latestComment: latest?.comment,
            updatedAt: latest?.createdAt,
            history: history.map((event) => ({
              id: String(event._id),
              action: event.action,
              status: event.status,
              reviewerName: event.reviewerName,
              correctedTitle: event.correctedTitle,
              correctedDetail: event.correctedDetail,
              trade: event.trade,
              comment: event.comment,
              createdAt: event.createdAt,
            })),
          },
        };
      }) || [];
    const reviewSummary = {
      total: findings.length,
      needsReview: findings.filter(
        (finding) => finding.review.status === "needs_review",
      ).length,
      approved: findings.filter(
        (finding) => finding.review.status === "approved",
      ).length,
      corrected: findings.filter(
        (finding) => finding.review.status === "corrected",
      ).length,
      rejected: findings.filter(
        (finding) => finding.review.status === "rejected",
      ).length,
      reanalysisRequested: findings.filter(
        (finding) => finding.review.status === "reanalysis_requested",
      ).length,
      superseded: findings.filter(
        (finding) => finding.review.status === "superseded",
      ).length,
    };
    const documentsById = new Map(
      documents.map((document) => [document._id, document]),
    );
    const activePackage = project.activePackageId
      ? packages.find((bidPackage) => bidPackage._id === project.activePackageId)
      : undefined;
    const activePackageSummary = activePackage
      ? packageRows.find((row) => row.id === String(activePackage._id))
      : undefined;
    const [storedBidBasis, documentClassifications] = activePackage
      ? await Promise.all([
          ctx.db
            .query("heliosBidBasisProfiles")
            .withIndex("by_package", (query) =>
              query.eq("packageId", activePackage._id),
            )
            .first(),
          ctx.db
            .query("heliosDocumentClassifications")
            .withIndex("by_project", (query) =>
              query.eq("projectId", project._id),
            )
            .collect(),
        ])
      : [null, []];
    const activeDocumentIds = new Set(
      (activePackageSummary?.entries || [])
        .map((entry) => entry.documentId)
        .filter((id): id is string => Boolean(id)),
    );
    const validCategory = (value: string): value is HeliosBidBasisCategory =>
      HELIOS_BID_BASIS_CATEGORIES.includes(value as HeliosBidBasisCategory);
    const validState = (value: string): value is HeliosBidBasisAvailabilityState =>
      HELIOS_BID_BASIS_AVAILABILITY_STATES.includes(
        value as HeliosBidBasisAvailabilityState,
      );
    const validProfile = (value?: string): value is HeliosBidBasisProfileType =>
      Boolean(value) && HELIOS_BID_BASIS_PROFILES.includes(
        value as HeliosBidBasisProfileType,
      );
    const bidBasis = activePackage && activePackageSummary
      ? {
          ...deriveHeliosBidBasis({
            projectId: String(project._id),
            packageId: String(activePackage._id),
            packageRevision: activePackage.revision,
            packageStatus: activePackage.status,
            documents: documents
              .map((document, index) => ({ document, analysis: documentAnalyses[index] }))
              .filter(({ document }) => activeDocumentIds.has(String(document._id)))
              .map(({ document, analysis }) => ({
                id: String(document._id),
                fileName: document.fileName,
                relativePath: document.relativePath,
                status: document.status,
                documentType: analysis?.documentType,
                findingCategories: analysis?.findings.map((finding) => finding.category),
                findingText: analysis?.findings
                  .map((finding) => `${finding.title} ${finding.detail}`)
                  .join(" "),
                indexedPageNumbers: evidence
                  .filter((row) => row.documentId === document._id)
                  .map((row) => row.pageNumber)
                  .filter((page): page is number => page !== undefined),
              })),
            entries: activePackageSummary.entries.map((entry) => ({
              documentId: entry.documentId,
              sourceCategory: entry.sourceCategory,
              relativePath: entry.relativePath,
              status: entry.status,
            })),
            writtenScopeCount: writtenScopes.filter(
              (scope) => scope.packageId === activePackage._id,
            ).length,
            projectFindingText:
              intelligence &&
              intelligence.isCurrent !== false &&
              intelligence.packageId === activePackage._id
                ? intelligence.findings
                    .map((finding) => `${finding.title} ${finding.detail}`)
                    .join(" ")
                : undefined,
            categoryOverrides: (storedBidBasis?.categoryOverrides || [])
              .filter((override) => validCategory(override.category) && validState(override.state))
              .map((override) => ({
                category: override.category as HeliosBidBasisCategory,
                state: override.state as HeliosBidBasisAvailabilityState,
              })),
            documentOverrides: documentClassifications
              .filter(
                (classification) =>
                  classification.packageId === activePackage._id &&
                  activeDocumentIds.has(String(classification.documentId)) &&
                  validCategory(classification.category),
              )
              .map((classification) => ({
                documentId: String(classification.documentId),
                category: classification.category as HeliosBidBasisCategory,
              })),
            profileOverride: validProfile(storedBidBasis?.profileOverride)
              ? storedBidBasis.profileOverride
              : undefined,
            classificationStatus: storedBidBasis?.classificationStatus,
            proceededAt: storedBidBasis?.proceededAt,
            confirmedAt: storedBidBasis?.confirmedAt,
            confirmedBy: storedBidBasis?.confirmedBy
              ? String(storedBidBasis.confirmedBy)
              : undefined,
            now: storedBidBasis?.updatedAt || Date.now(),
          }),
          id: storedBidBasis ? String(storedBidBasis._id) : undefined,
        }
      : undefined;
    const planRun = activePackage
      ? await ctx.db
          .query("heliosPlanRuns")
          .withIndex("by_package_current", (query) =>
            query.eq("packageId", activePackage._id).eq("isCurrent", true),
          )
          .first()
      : null;
    const [planPages, planReferences, planCalibrations] = planRun
      ? await Promise.all([
          ctx.db
            .query("heliosPlanPages")
            .withIndex("by_run_page", (query) => query.eq("runId", planRun._id))
            .take(250),
          ctx.db
            .query("heliosPlanReferences")
            .withIndex("by_run", (query) => query.eq("runId", planRun._id))
            .take(250),
          ctx.db
            .query("heliosPlanCalibrations")
            .withIndex("by_run", (query) => query.eq("runId", planRun._id))
            .take(500),
        ])
      : [[], [], []];
    const planSet = planRun
      ? {
          id: String(planRun._id),
          projectId: String(planRun.projectId),
          packageId: String(planRun.packageId),
          packageRevision: planRun.packageRevision,
          status: planRun.status,
          processingVersion: planRun.processingVersion,
          model: planRun.model,
          sourceDocumentCount: planRun.sourceDocumentCount,
          sourcePageCount: planRun.sourcePageCount,
          registeredPageCount: planRun.registeredPageCount,
          sheetCount: planRun.sheetCount,
          nonSheetPageCount: planRun.nonSheetPageCount,
          exceptionPageCount: planRun.exceptionPageCount,
          measurableViewCount: planRun.measurableViewCount,
          approvedCalibrationCount: planRun.approvedCalibrationCount,
          blockedMeasurementCount: planRun.blockedMeasurementCount,
          unresolvedReferenceCount: planRun.unresolvedReferenceCount,
          issues: planRun.issues,
          pages: planPages.map((page) => ({
            id: String(page._id),
            documentId: String(page.documentId),
            documentName: page.documentName,
            physicalPageNumber: page.physicalPageNumber,
            pageKind: page.pageKind,
            printedPageNumber: page.printedPageNumber,
            sheetNumber: page.sheetNumber,
            title: page.title,
            discipline: page.discipline,
            subdiscipline: page.subdiscipline,
            issueDate: page.issueDate,
            revisionMarker: page.revisionMarker,
            addendumAssociation: page.addendumAssociation,
            modality: page.modality,
            titleBlockBoundary: page.titleBlockBoundary,
            titleBlockText: page.titleBlockText,
            confidence: page.confidence,
            unresolvedIssues: page.unresolvedIssues,
            views: page.views.map((view) => ({ ...view, scaleCandidates: [] })),
          })),
          references: planReferences.map((reference) => ({
            id: String(reference._id),
            sourcePageId: String(reference.sourcePageId),
            sourceSheetNumber: reference.sourceSheetNumber,
            sourceViewKey: reference.sourceViewKey,
            referenceType: reference.referenceType as import("@opsslate/helios-domain").HeliosPlanReferenceType,
            label: reference.label,
            targetSheetNumber: reference.targetSheetNumber,
            targetDetail: reference.targetDetail,
            targetSpecification: reference.targetSpecification,
            locator: reference.locator,
            status: reference.status,
            targetPageId: reference.targetPageId ? String(reference.targetPageId) : undefined,
            confidence: reference.confidence,
          })),
          calibrations: planCalibrations.map((calibration) => ({
            id: String(calibration._id),
            pageId: String(calibration.pageId),
            viewKey: calibration.viewKey,
            source: calibration.source,
            scale: calibration.scale,
            units: calibration.units,
            sourceRegion: calibration.sourceRegion,
            confidence: calibration.confidence,
            status: calibration.status,
            approvedBy: calibration.approvedBy ? String(calibration.approvedBy) : undefined,
            approvedAt: calibration.approvedAt,
            updatedAt: calibration.updatedAt,
          })),
          createdAt: planRun.createdAt,
          updatedAt: planRun.updatedAt,
          completedAt: planRun.completedAt,
        }
      : undefined;
    return {
      project: projectSummary(project, documents.length),
      documents: documentSummaries,
      writtenScopes: writtenScopes.map((scope) => ({
        id: String(scope._id),
        projectId: String(scope.projectId),
        packageId: String(scope.packageId),
        packageEntryId: String(scope.packageEntryId),
        title: scope.title,
        relativePath: scope.relativePath,
        content: scope.content,
        sourceLocation: scope.sourceLocation,
        size: scope.size,
        sha256: scope.sha256,
        version: scope.version,
        supersedesWrittenScopeId: scope.supersedesWrittenScopeId
          ? String(scope.supersedesWrittenScopeId)
          : undefined,
        createdAt: scope.createdAt,
        updatedAt: scope.updatedAt,
      })),
      packages: packageRows,
      activePackageId: project.activePackageId
        ? String(project.activePackageId)
        : undefined,
      latestIntelligenceError: project.latestIntelligenceError,
      bidBasis,
      planSet,
      intelligence: intelligence
        ? {
            id: intelligence._id,
            projectId: project._id,
            model: intelligence.model,
            schemaVersion: intelligence.schemaVersion,
            summary: intelligence.summary,
            summaryEvidenceIds: intelligence.summaryEvidenceIds.map(String),
            projectType: {
              ...intelligence.projectType,
              evidenceIds: intelligence.projectType.evidenceIds.map(String),
            },
            fundingSource: {
              ...intelligence.fundingSource,
              evidenceIds: intelligence.fundingSource.evidenceIds.map(String),
            },
            projectMetadata: intelligence.projectMetadata
              ? {
                  projectNumber: {
                    ...intelligence.projectMetadata.projectNumber,
                    evidenceIds: intelligence.projectMetadata.projectNumber.evidenceIds.map(String),
                  },
                  ownerClient: {
                    ...intelligence.projectMetadata.ownerClient,
                    evidenceIds: intelligence.projectMetadata.ownerClient.evidenceIds.map(String),
                  },
                  engineer: {
                    ...intelligence.projectMetadata.engineer,
                    evidenceIds: intelligence.projectMetadata.engineer.evidenceIds.map(String),
                  },
                  bidDate: {
                    ...intelligence.projectMetadata.bidDate,
                    evidenceIds: intelligence.projectMetadata.bidDate.evidenceIds.map(String),
                  },
                  location: {
                    ...intelligence.projectMetadata.location,
                    evidenceIds: intelligence.projectMetadata.location.evidenceIds.map(String),
                  },
                }
              : undefined,
            confidence: intelligence.confidence,
            findings,
            reviewSummary,
            evidence: evidence.map((row) => ({
              id: row._id,
              documentId: row.documentId,
              documentName:
                documentsById.get(row.documentId)?.fileName ||
                "Project document",
              pageNumber: row.pageNumber,
              locator: row.locator,
              excerpt: row.excerpt,
            })),
            packageId: intelligence.packageId
              ? String(intelligence.packageId)
              : undefined,
            packageRevision: intelligence.packageRevision,
            generationId: intelligence.generationId
              ? String(intelligence.generationId)
              : undefined,
            isStale:
              Boolean(project.currentPackageRevision) &&
              (intelligence.packageRevision || 0) <
                (project.currentPackageRevision || 0),
            generatedAt: intelligence.generatedAt,
          }
        : undefined,
    };
  },
});

export const authorizeDocumentContent = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const documentId = ctx.db.normalizeId("heliosDocuments", args.documentId);
    if (!documentId) throw new Error("Document not found.");
    const document = await ctx.db.get(documentId);
    if (
      !document ||
      document.companyId !== companyId ||
      document.projectId !== project._id
    ) {
      throw new Error("Document not found.");
    }
    return {
      storageId: document.storageId,
      fileName: document.fileName,
      size: document.size,
    };
  },
});

export const createUploadIntent = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    packageId: v.optional(v.string()),
    packageEntryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const project = await ownedProject(ctx, companyId, args.projectId);
    if (project.status === "archived") {
      throw new Error("Archived projects cannot accept documents.");
    }
    if (Boolean(args.packageId) !== Boolean(args.packageEntryId)) {
      throw new Error("Package upload information is incomplete.");
    }

    let packageId: Id<"heliosBidPackages"> | undefined;
    let packageEntryId: Id<"heliosPackageEntries"> | undefined;
    if (args.packageId && args.packageEntryId) {
      packageId =
        ctx.db.normalizeId("heliosBidPackages", args.packageId) || undefined;
      packageEntryId =
        ctx.db.normalizeId("heliosPackageEntries", args.packageEntryId) ||
        undefined;
      if (!packageId || !packageEntryId) {
        throw new Error("Bid package upload is invalid.");
      }
      const [bidPackage, entry] = await Promise.all([
        ctx.db.get(packageId),
        ctx.db.get(packageEntryId),
      ]);
      if (
        !bidPackage ||
        !entry ||
        bidPackage.companyId !== companyId ||
        bidPackage.projectId !== project._id ||
        entry.companyId !== companyId ||
        entry.projectId !== project._id ||
        entry.packageId !== bidPackage._id ||
        (entry.kind && entry.kind !== "pdf") ||
        !["pending", "failed"].includes(entry.status) ||
        bidPackage.status !== "uploading"
      ) {
        throw new Error("Bid package entry cannot be uploaded.");
      }
      if (entry.status === "failed") {
        await ctx.db.patch(entry._id, {
          status: "pending",
          reason: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    const now = Date.now();
    const intentId = await ctx.db.insert("heliosUploadIntents", {
      companyId,
      projectId: project._id,
      createdBy: user._id,
      packageId,
      packageEntryId,
      status: "pending",
      expiresAt: now + HELIOS_UPLOAD_INTENT_LIFETIME_MS,
      createdAt: now,
      updatedAt: now,
    });
    const uploadUrl = await ctx.storage.generateUploadUrl();
    if (project.status === "draft") {
      await ctx.db.patch(project._id, { status: "intake", updatedAt: now });
    }
    return { intentId, uploadUrl };
  },
});

export const inspectUpload = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    intentId: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const project = await ownedProject(ctx, companyId, args.projectId);
    const intentId = ctx.db.normalizeId("heliosUploadIntents", args.intentId);
    if (!intentId) throw new Error("Upload authorization is invalid.");
    const intent = await ctx.db.get(intentId);
    if (
      !intent ||
      intent.companyId !== companyId ||
      intent.projectId !== project._id ||
      intent.createdBy !== user._id ||
      intent.status !== "pending" ||
      intent.expiresAt <= Date.now()
    ) {
      throw new Error("Upload authorization has expired.");
    }
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) throw new Error("Uploaded file was not found.");
    return {
      contentType: metadata.contentType,
      size: metadata.size,
      sha256: metadata.sha256,
    };
  },
});

async function refreshPackageCounts(
  ctx: MutationCtx,
  packageId: Id<"heliosBidPackages">,
  now: number,
) {
  const entries = await ctx.db
    .query("heliosPackageEntries")
    .withIndex("by_package", (query) => query.eq("packageId", packageId))
    .collect();
  await ctx.db.patch(packageId, {
    uploadedCount: entries.filter((entry) => entry.status === "uploaded").length,
    duplicateCount: entries.filter((entry) => entry.status === "duplicate")
      .length,
    failedCount: entries.filter((entry) => entry.status === "failed").length,
    updatedAt: now,
  });
  const envelopes = await ctx.db
    .query("heliosPackageEnvelopes")
    .withIndex("by_package", (query) => query.eq("packageId", packageId))
    .collect();
  for (const envelope of envelopes) {
    if (envelope.status === "terminal") continue;
    const envelopeEntries = entries.filter(
      (entry) => entry.envelopeRecordId === envelope._id,
    );
    if (
      envelopeEntries.length > 0 &&
      envelopeEntries.every((entry) =>
        ["uploaded", "duplicate", "rejected"].includes(entry.status),
      )
    ) {
      await ctx.db.patch(envelope._id, { status: "terminal", updatedAt: now });
    }
  }
}

export const registerDocument = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    intentId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    magicValid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const project = await ownedProject(ctx, companyId, args.projectId);
    const intentId = ctx.db.normalizeId("heliosUploadIntents", args.intentId);
    if (!intentId) throw new Error("Upload authorization is invalid.");
    const intent = await ctx.db.get(intentId);
    if (
      !intent ||
      intent.companyId !== companyId ||
      intent.projectId !== project._id ||
      intent.createdBy !== user._id ||
      intent.status !== "pending" ||
      intent.expiresAt <= Date.now()
    ) {
      throw new Error("Upload authorization has expired.");
    }

    const now = Date.now();
    const packageEntry = intent.packageEntryId
      ? await ctx.db.get(intent.packageEntryId)
      : null;
    const bidPackage = intent.packageId
      ? await ctx.db.get(intent.packageId)
      : null;
    if (
      Boolean(intent.packageId) !== Boolean(intent.packageEntryId) ||
      (intent.packageId &&
        (!bidPackage ||
          !packageEntry ||
          bidPackage.companyId !== companyId ||
          bidPackage.projectId !== project._id ||
          bidPackage.status !== "uploading" ||
          packageEntry.companyId !== companyId ||
          packageEntry.projectId !== project._id ||
          packageEntry.packageId !== bidPackage._id ||
          packageEntry._id !== intent.packageEntryId ||
          packageEntry.status !== "pending"))
    ) {
      throw new Error("Bid package upload is no longer valid.");
    }

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    const relativePath = packageEntry?.relativePath;
    const fileName =
      relativePath?.split("/").pop()?.trim() || args.fileName.trim();
    const canonicalFileName = canonicalPdfFileName(fileName);
    const invalidReason =
      !metadata
        ? "Uploaded file was not found."
        : packageEntry?.kind === "written_scope"
          ? "Written scope evidence does not use the PDF upload path."
        : metadata.contentType !== "application/pdf"
          ? "Uploaded file is not a PDF."
          : metadata.size <= 0 || metadata.size > HELIOS_MAX_PDF_BYTES
            ? "Uploaded PDF exceeds the allowed size."
            : packageEntry && metadata.size !== packageEntry.size
              ? "Uploaded PDF size does not match the package manifest."
            : packageEntry?.sha256 &&
                !sha256MatchesStorageDigest(packageEntry.sha256, metadata.sha256)
              ? "Uploaded PDF hash does not match the package manifest."
            : !args.magicValid
              ? "Uploaded file does not contain a valid PDF signature."
              : !canonicalFileName.endsWith(".pdf")
                ? "Uploaded filename must end in .pdf."
                : null;

    if (invalidReason || !metadata) {
      if (metadata) await ctx.storage.delete(args.storageId);
      await ctx.db.patch(intent._id, {
        status: "failed",
        failureReason: invalidReason || "Uploaded file is invalid.",
        updatedAt: now,
      });
      if (packageEntry && bidPackage) {
        await ctx.db.patch(packageEntry._id, {
          status: "failed",
          reason: invalidReason || "Uploaded file is invalid.",
          updatedAt: now,
        });
        await refreshPackageCounts(ctx, bidPackage._id, now);
      }
      return {
        kind: "rejected" as const,
        error: invalidReason || "Uploaded file is invalid.",
      };
    }

    const duplicate = await ctx.db
      .query("heliosDocuments")
      .withIndex("by_project_hash", (query) =>
        query.eq("projectId", project._id).eq("sha256", metadata.sha256),
      )
      .first();
    if (duplicate) {
      await ctx.storage.delete(args.storageId);
      await ctx.db.patch(intent._id, {
        status: "consumed",
        duplicateDocumentId: duplicate._id,
        updatedAt: now,
      });
      if (packageEntry && bidPackage) {
        await ctx.db.patch(packageEntry._id, {
          status: "duplicate",
          documentId: duplicate._id,
          sha256: metadata.sha256,
          reason: "Exact file already exists in this project.",
          updatedAt: now,
        });
        await refreshPackageCounts(ctx, bidPackage._id, now);
      }
      return { kind: "duplicate" as const, document: documentSummary(duplicate) };
    }

    const canonicalRelativePath = relativePath?.toLowerCase();
    const existingPathDocuments = canonicalRelativePath
      ? await ctx.db
          .query("heliosDocuments")
          .withIndex("by_project", (query) =>
            query.eq("projectId", project._id),
          )
          .collect()
      : [];
    const priorVersion = existingPathDocuments
      .filter(
        (document) =>
          document.status !== "superseded" &&
          document.relativePath?.toLowerCase() === canonicalRelativePath,
      )
      .sort((left, right) => right.version - left.version)[0];
    if (priorVersion) {
      await ctx.db.patch(priorVersion._id, {
        status: "superseded",
        updatedAt: now,
      });
    }

    const documentId = await ctx.db.insert("heliosDocuments", {
      companyId,
      projectId: project._id,
      uploadedBy: user._id,
      storageId: args.storageId,
      fileName,
      canonicalFileName,
      contentType: "application/pdf",
      size: metadata.size,
      sha256: metadata.sha256,
      status: "ready_for_intelligence",
      attemptCount: 0,
      packageId: bidPackage?._id,
      packageEntryId: packageEntry?._id,
      relativePath,
      version: (priorVersion?.version || 0) + 1,
      supersedesDocumentId: priorVersion?._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(intent._id, { status: "consumed", updatedAt: now });
    if (packageEntry && bidPackage) {
      await ctx.db.patch(packageEntry._id, {
        status: "uploaded",
        documentId,
        sha256: metadata.sha256,
        reason: undefined,
        updatedAt: now,
      });
      await refreshPackageCounts(ctx, bidPackage._id, now);
      await ctx.db.patch(project._id, { updatedAt: now });
    } else {
      await ctx.db.patch(project._id, {
        status: "documents_ready",
        intelligenceStatus: "ready_for_intelligence",
        updatedAt: now,
      });
    }
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document could not be registered.");
    if (!bidPackage) {
      await ctx.scheduler.runAfter(0, queueDocumentReference, { documentId });
    }
    return { kind: "created" as const, document: documentSummary(document) };
  },
});
