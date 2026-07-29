import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  companies: defineTable({
    name: v.string(),
    plan: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    planExpiresAt: v.optional(v.number()),
    // Branding
    logoStorageId: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    tagline: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
  }).index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),

  users: defineTable({
    companyId: v.id("companies"),
    email: v.string(),
    name: v.string(),
    role: v.optional(v.string()),
    identityIssuer: v.optional(v.string()),
    identitySubject: v.optional(v.string()),
    identityLinkedAt: v.optional(v.number()),
    passwordHash: v.string(),
    sessionToken: v.optional(v.string()),
    resetToken: v.optional(v.string()),
    resetTokenExpiry: v.optional(v.number()),
    mustChangePassword: v.optional(v.boolean()),
  }).index("by_email", ["email"])
    .index("by_identity", ["identityIssuer", "identitySubject"])
    .index("by_session", ["sessionToken"]),

  projects: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    code: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    county: v.optional(v.string()),
    fabricator: v.optional(v.string()),
    contractor: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    style: v.optional(v.string()),
    contractDate: v.optional(v.string()),
    orderDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    foundationType: v.optional(v.string()),
    projectManager: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    status: v.optional(v.string()),
    // Financial
    contractValue: v.optional(v.number()),
    retainagePercent: v.optional(v.number()),
    billingMethod: v.optional(v.string()), // "fixed" | "time-materials" | "cost-plus" | "unit-price"
    clientPO: v.optional(v.string()),
    contingencyPercent: v.optional(v.number()),
  }).index("by_company", ["companyId"]),

  heliosProjects: defineTable({
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    name: v.string(),
    projectNumber: v.optional(v.string()),
    ownerClient: v.optional(v.string()),
    engineer: v.optional(v.string()),
    bidDate: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("intake"),
      v.literal("documents_ready"),
      v.literal("archived"),
    ),
    intelligenceStatus: v.union(
      v.literal("awaiting_documents"),
      v.literal("ready_for_intelligence"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("ready_for_review"),
      v.literal("partially_ready"),
      v.literal("failed"),
    ),
    activePackageId: v.optional(v.id("heliosBidPackages")),
    currentPackageRevision: v.optional(v.number()),
    latestIntelligenceError: v.optional(v.string()),
    intelligenceUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company_updated", ["companyId", "updatedAt"])
    .index("by_company_status", ["companyId", "status"]),

  heliosBidPackages: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    createdBy: v.id("users"),
    name: v.string(),
    sourceType: v.union(
      v.literal("files"),
      v.literal("folder"),
      v.literal("zip"),
      v.literal("written_scope"),
    ),
    adapter: v.optional(v.union(v.literal("manual"), v.literal("bid_scout"))),
    manifestVersion: v.optional(v.number()),
    revisionKind: v.optional(
      v.union(
        v.literal("initial"),
        v.literal("addendum"),
        v.literal("revision"),
        v.literal("supplemental"),
      ),
    ),
    revisionLabel: v.optional(v.string()),
    predecessorPackageId: v.optional(v.id("heliosBidPackages")),
    revision: v.number(),
    status: v.union(
      v.literal("uploading"),
      v.literal("ready_for_analysis"),
      v.literal("processing"),
      v.literal("ready_for_review"),
      v.literal("partially_ready"),
      v.literal("failed"),
      v.literal("abandoned"),
      v.literal("superseded"),
    ),
    entryCount: v.number(),
    pdfCount: v.number(),
    rejectedCount: v.number(),
    uploadedCount: v.number(),
    duplicateCount: v.number(),
    failedCount: v.number(),
    writtenScopeCount: v.optional(v.number()),
    totalBytes: v.number(),
    lastError: v.optional(v.string()),
    finalizedAt: v.optional(v.number()),
    analysisCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_revision", ["projectId", "revision"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_company_updated", ["companyId", "updatedAt"]),

  heliosPackageEnvelopes: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    createdBy: v.id("users"),
    envelopeId: v.string(),
    adapter: v.union(v.literal("manual"), v.literal("bid_scout")),
    sourceType: v.union(
      v.literal("files"),
      v.literal("folder"),
      v.literal("zip"),
      v.literal("written_scope"),
    ),
    manifestVersion: v.number(),
    revisionKind: v.union(
      v.literal("initial"),
      v.literal("addendum"),
      v.literal("revision"),
      v.literal("supplemental"),
    ),
    revisionLabel: v.optional(v.string()),
    manifestFingerprint: v.string(),
    status: v.union(v.literal("building"), v.literal("terminal")),
    entryCount: v.number(),
    acceptedCount: v.number(),
    rejectedCount: v.number(),
    totalBytes: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_envelope", ["projectId", "envelopeId"])
    .index("by_package", ["packageId", "createdAt"]),

  heliosPackageEntries: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    envelopeRecordId: v.optional(v.id("heliosPackageEnvelopes")),
    kind: v.optional(v.union(v.literal("pdf"), v.literal("written_scope"))),
    sourceCategory: v.optional(
      v.union(
        v.literal("plans"),
        v.literal("specifications"),
        v.literal("bid_schedule"),
        v.literal("bid_forms"),
        v.literal("addendum"),
        v.literal("written_scope"),
        v.literal("supporting"),
        v.literal("unknown"),
      ),
    ),
    relativePath: v.string(),
    canonicalPath: v.string(),
    size: v.number(),
    sha256: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("uploaded"),
      v.literal("duplicate"),
      v.literal("rejected"),
      v.literal("failed"),
    ),
    reason: v.optional(v.string()),
    documentId: v.optional(v.id("heliosDocuments")),
    writtenScopeId: v.optional(v.id("heliosWrittenScopes")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_package", ["packageId", "createdAt"])
    .index("by_package_path", ["packageId", "canonicalPath"])
    .index("by_project", ["projectId", "createdAt"]),

  heliosWrittenScopes: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageEntryId: v.id("heliosPackageEntries"),
    createdBy: v.id("users"),
    title: v.string(),
    canonicalTitle: v.string(),
    relativePath: v.string(),
    content: v.string(),
    sourceLocation: v.optional(v.string()),
    size: v.number(),
    sha256: v.string(),
    version: v.number(),
    supersedesWrittenScopeId: v.optional(v.id("heliosWrittenScopes")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId", "createdAt"])
    .index("by_project_hash", ["projectId", "sha256"])
    .index("by_package", ["packageId", "createdAt"]),

  heliosDocuments: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    uploadedBy: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    canonicalFileName: v.string(),
    contentType: v.literal("application/pdf"),
    size: v.number(),
    sha256: v.string(),
    status: v.union(
      v.literal("ready_for_intelligence"),
      v.literal("queued"),
      v.literal("uploading_to_openai"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("superseded"),
    ),
    attemptCount: v.optional(v.number()),
    lastError: v.optional(v.string()),
    packageId: v.optional(v.id("heliosBidPackages")),
    packageEntryId: v.optional(v.id("heliosPackageEntries")),
    relativePath: v.optional(v.string()),
    processingStartedAt: v.optional(v.number()),
    processingCompletedAt: v.optional(v.number()),
    version: v.number(),
    supersedesDocumentId: v.optional(v.id("heliosDocuments")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId", "createdAt"])
    .index("by_project_hash", ["projectId", "sha256"])
    .index("by_company_updated", ["companyId", "updatedAt"]),

  // Foundation 5A: additive canonical engineering-record boundary. Existing
  // document, plan, and geometry tables remain authoritative until an explicit
  // shadow-mode comparison and cutover milestone is approved.
  heliosEngineeringRecords: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    bidBasisFingerprint: v.string(),
    sourceFingerprint: v.string(),
    schemaVersion: v.number(),
    processingVersion: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("indexing"),
      v.literal("ready"),
      v.literal("partially_ready"),
      v.literal("failed"),
      v.literal("superseded"),
    ),
    isCurrent: v.boolean(),
    coverage: v.object({
      documentIntelligence: v.union(
        v.literal("not_applicable"), v.literal("pending"), v.literal("processing"),
        v.literal("ready"), v.literal("partially_ready"), v.literal("failed"),
      ),
      planReconstruction: v.union(
        v.literal("not_applicable"), v.literal("pending"), v.literal("processing"),
        v.literal("ready"), v.literal("partially_ready"), v.literal("failed"),
      ),
      civilGeometry: v.union(
        v.literal("not_applicable"), v.literal("pending"), v.literal("processing"),
        v.literal("ready"), v.literal("partially_ready"), v.literal("failed"),
      ),
    }),
    sourceCount: v.number(),
    pageCount: v.number(),
    assetCount: v.number(),
    unresolvedIssueCount: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_project_current", ["projectId", "isCurrent"])
    .index("by_package", ["packageId", "createdAt"])
    .index("by_package_current", ["packageId", "isCurrent"])
    .index("by_source_fingerprint", ["sourceFingerprint"]),

  heliosEngineeringSources: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    sourceKind: v.union(v.literal("pdf"), v.literal("written_scope")),
    documentId: v.optional(v.id("heliosDocuments")),
    writtenScopeId: v.optional(v.id("heliosWrittenScopes")),
    originalStorageId: v.optional(v.id("_storage")),
    originalSha256: v.string(),
    originalFileName: v.string(),
    relativePath: v.string(),
    contentType: v.string(),
    byteSize: v.number(),
    sourceVersion: v.number(),
    sourceFingerprint: v.string(),
    status: v.union(
      v.literal("registered"),
      v.literal("extracting"),
      v.literal("ready"),
      v.literal("failed"),
      v.literal("superseded"),
    ),
    immutable: v.boolean(),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_record", ["engineeringRecordId", "createdAt"])
    .index("by_document", ["documentId"])
    .index("by_written_scope", ["writtenScopeId"])
    .index("by_record_document", ["engineeringRecordId", "documentId"])
    .index("by_record_written_scope", ["engineeringRecordId", "writtenScopeId"])
    .index("by_record_fingerprint", ["engineeringRecordId", "sourceFingerprint"]),

  heliosEngineeringPages: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    engineeringSourceId: v.id("heliosEngineeringSources"),
    sourcePlanPageId: v.optional(v.id("heliosPlanPages")),
    physicalPageNumber: v.number(),
    widthPoints: v.optional(v.number()),
    heightPoints: v.optional(v.number()),
    rotationDegrees: v.optional(v.number()),
    pageSha256: v.optional(v.string()),
    printedPageNumber: v.optional(v.string()),
    sheetNumber: v.optional(v.string()),
    title: v.optional(v.string()),
    confidence: v.optional(v.number()),
    modality: v.union(
      v.literal("vector"),
      v.literal("scanned"),
      v.literal("hybrid"),
      v.literal("unusable"),
    ),
    nativeTextStatus: v.union(
      v.literal("not_applicable"), v.literal("pending"),
      v.literal("ready"), v.literal("failed"),
    ),
    ocrStatus: v.union(
      v.literal("not_applicable"), v.literal("pending"),
      v.literal("ready"), v.literal("failed"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source_page", ["engineeringSourceId", "physicalPageNumber"])
    .index("by_source_plan_page", ["sourcePlanPageId"])
    .index("by_record", ["engineeringRecordId", "physicalPageNumber"]),

  heliosEngineeringTextSpans: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    engineeringSourceId: v.id("heliosEngineeringSources"),
    pageId: v.id("heliosEngineeringPages"),
    channel: v.union(v.literal("native"), v.literal("ocr")),
    readingOrder: v.number(),
    text: v.string(),
    boundary: v.object({
      x: v.number(), y: v.number(), width: v.number(), height: v.number(),
    }),
    confidence: v.number(),
    createdAt: v.number(),
  })
    .index("by_page_channel", ["pageId", "channel", "readingOrder"])
    .index("by_record", ["engineeringRecordId", "createdAt"])
    .index("by_source", ["engineeringSourceId", "createdAt"]),

  heliosEngineeringAssets: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    engineeringSourceId: v.id("heliosEngineeringSources"),
    pageId: v.id("heliosEngineeringPages"),
    viewKey: v.optional(v.string()),
    kind: v.union(
      v.literal("page_render"),
      v.literal("page_thumbnail"),
      v.literal("view_crop"),
    ),
    storageId: v.id("_storage"),
    contentType: v.string(),
    sha256: v.string(),
    boundary: v.optional(v.object({
      x: v.number(), y: v.number(), width: v.number(), height: v.number(),
    })),
    pixelWidth: v.number(),
    pixelHeight: v.number(),
    dpi: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_page_kind", ["pageId", "kind"])
    .index("by_record", ["engineeringRecordId", "createdAt"])
    .index("by_source", ["engineeringSourceId", "createdAt"]),

  heliosEngineeringArtifacts: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    engineeringSourceId: v.optional(v.id("heliosEngineeringSources")),
    kind: v.union(
      v.literal("document_intelligence"),
      v.literal("plan_inventory"),
      v.literal("civil_geometry"),
    ),
    status: v.union(
      v.literal("pending"), v.literal("processing"), v.literal("ready"),
      v.literal("partially_ready"), v.literal("failed"), v.literal("superseded"),
    ),
    sourceFingerprint: v.string(),
    schemaVersion: v.number(),
    processingVersion: v.number(),
    extractorVersion: v.string(),
    promptVersion: v.string(),
    modelVersion: v.string(),
    authoritativeRecordType: v.string(),
    authoritativeRecordId: v.string(),
    shadowMode: v.boolean(),
    recordCount: v.number(),
    unresolvedIssueCount: v.number(),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_record_kind", ["engineeringRecordId", "kind", "createdAt"])
    .index("by_source_kind", ["engineeringSourceId", "kind", "createdAt"])
    .index("by_authoritative_record", [
      "engineeringRecordId",
      "authoritativeRecordType",
      "authoritativeRecordId",
    ]),

  heliosEngineeringProvenance: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    engineeringSourceId: v.id("heliosEngineeringSources"),
    artifactId: v.id("heliosEngineeringArtifacts"),
    pageId: v.optional(v.id("heliosEngineeringPages")),
    evidenceId: v.optional(v.id("heliosEvidence")),
    provenanceKind: v.union(
      v.literal("source"),
      v.literal("page"),
      v.literal("text_span"),
      v.literal("visual_region"),
    ),
    recordType: v.string(),
    recordId: v.string(),
    recordFingerprint: v.optional(v.string()),
    sourceLocator: v.string(),
    boundary: v.optional(v.object({
      x: v.number(), y: v.number(), width: v.number(), height: v.number(),
    })),
    textSpanIds: v.array(v.id("heliosEngineeringTextSpans")),
    confidence: v.number(),
    createdAt: v.number(),
  })
    .index("by_artifact", ["artifactId", "createdAt"])
    .index("by_record", ["engineeringRecordId", "createdAt"])
    .index("by_artifact_record", ["artifactId", "recordType", "recordId"])
    .index("by_source_record", ["engineeringSourceId", "recordType", "recordId"]),

  heliosEngineeringRemoteFiles: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    engineeringSourceId: v.id("heliosEngineeringSources"),
    provider: v.literal("openai"),
    remoteFileId: v.string(),
    purpose: v.literal("user_data"),
    status: v.union(
      v.literal("uploaded"), v.literal("active"), v.literal("deleting"),
      v.literal("deleted"), v.literal("delete_failed"), v.literal("expired"),
    ),
    referenceCount: v.number(),
    uploadedAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.number(),
    deletedAt: v.optional(v.number()),
    cleanupAttempts: v.number(),
    lastError: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_source_status", ["engineeringSourceId", "status"])
    .index("by_provider_file", ["provider", "remoteFileId"])
    .index("by_status_expiration", ["status", "expiresAt"]),

  heliosEngineeringParityRuns: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    packageRevision: v.number(),
    comparisonVersion: v.number(),
    inputFingerprint: v.string(),
    status: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("incomplete"),
    ),
    isCurrent: v.boolean(),
    areas: v.array(v.object({
      area: v.union(
        v.literal("sources"),
        v.literal("document_intelligence"),
        v.literal("evidence"),
        v.literal("plan_pages"),
        v.literal("plan_views"),
        v.literal("plan_calibrations"),
        v.literal("plan_references"),
        v.literal("civil_geometry"),
      ),
      status: v.union(
        v.literal("passed"),
        v.literal("failed"),
        v.literal("incomplete"),
        v.literal("not_applicable"),
      ),
      authoritativeCount: v.number(),
      canonicalCount: v.number(),
      missingIds: v.array(v.string()),
      unexpectedIds: v.array(v.string()),
      fingerprintMismatchIds: v.array(v.string()),
    })),
    issues: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    completedAt: v.number(),
  })
    .index("by_project_current", ["projectId", "isCurrent"])
    .index("by_record_created", ["engineeringRecordId", "createdAt"])
    .index("by_package_created", ["packageId", "createdAt"]),

  // Stage 1 canonical-reader cutover control plane. These immutable audits do
  // not switch readers; they prove eligibility and preserve every blocker.
  heliosCanonicalCutoverRuns: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    engineeringRecordId: v.optional(v.id("heliosEngineeringRecords")),
    parityRunId: v.optional(v.id("heliosEngineeringParityRuns")),
    contractVersion: v.number(),
    sourceFingerprint: v.optional(v.string()),
    status: v.union(v.literal("blocked"), v.literal("shadow_ready")),
    isCurrent: v.boolean(),
    eligibleWorkflowCount: v.number(),
    blockedWorkflowCount: v.number(),
    duplicatePdfUploadWorkflowCount: v.number(),
    sourceCount: v.number(),
    immutableSourceCount: v.number(),
    canonicalPageCount: v.number(),
    canonicalTextSpanCount: v.number(),
    canonicalAssetCount: v.number(),
    unresolvedDrawingAuthorityCount: v.number(),
    workflows: v.array(v.object({
      id: v.union(
        v.literal("source_ingestion"),
        v.literal("document_intelligence"),
        v.literal("project_synthesis"),
        v.literal("plan_reconstruction"),
        v.literal("civil_geometry"),
        v.literal("euclid"),
        v.literal("takeoff"),
        v.literal("estimate"),
        v.literal("ask_helios"),
      ),
      label: v.string(),
      cutoverStage: v.number(),
      currentMode: v.union(
        v.literal("first_ingestion"),
        v.literal("legacy_authoritative"),
        v.literal("canonical_shadow"),
        v.literal("canonical_required"),
      ),
      targetMode: v.union(
        v.literal("first_ingestion"),
        v.literal("legacy_authoritative"),
        v.literal("canonical_shadow"),
        v.literal("canonical_required"),
      ),
      originalPdfPolicy: v.union(
        v.literal("required_once"),
        v.literal("review_only"),
        v.literal("forbidden"),
      ),
      status: v.union(
        v.literal("ingestion_boundary"),
        v.literal("blocked"),
        v.literal("shadow_ready"),
      ),
      blockers: v.array(v.string()),
      legacyImplementation: v.array(v.string()),
    })),
    blockers: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project_current", ["projectId", "isCurrent"])
    .index("by_record_created", ["engineeringRecordId", "createdAt"])
    .index("by_package_created", ["packageId", "createdAt"]),

  heliosUploadIntents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    createdBy: v.id("users"),
    packageId: v.optional(v.id("heliosBidPackages")),
    packageEntryId: v.optional(v.id("heliosPackageEntries")),
    status: v.union(
      v.literal("pending"),
      v.literal("consumed"),
      v.literal("failed"),
    ),
    failureReason: v.optional(v.string()),
    duplicateDocumentId: v.optional(v.id("heliosDocuments")),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId", "createdAt"])
    .index("by_company_status", ["companyId", "status"]),

  heliosIntelligenceJobs: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    documentId: v.optional(v.id("heliosDocuments")),
    packageId: v.optional(v.id("heliosBidPackages")),
    packageRevision: v.optional(v.number()),
    kind: v.union(v.literal("document"), v.literal("project")),
    status: v.union(
      v.literal("queued"),
      v.literal("uploading"),
      v.literal("analyzing"),
      v.literal("synthesizing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    attempt: v.number(),
    openaiFileId: v.optional(v.string()),
    openaiResponseId: v.optional(v.string()),
    model: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_document", ["documentId", "createdAt"])
    .index("by_project_status", ["projectId", "status", "createdAt"])
    .index("by_company_updated", ["companyId", "updatedAt"]),

  heliosEvidence: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    documentId: v.id("heliosDocuments"),
    evidenceKey: v.string(),
    pageNumber: v.optional(v.number()),
    locator: v.string(),
    excerpt: v.string(),
    createdAt: v.number(),
  })
    .index("by_document", ["documentId", "createdAt"])
    .index("by_document_key", ["documentId", "evidenceKey"])
    .index("by_project", ["projectId", "createdAt"]),

  heliosDocumentIntelligence: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    documentId: v.id("heliosDocuments"),
    model: v.string(),
    schemaVersion: v.number(),
    documentType: v.string(),
    summary: v.string(),
    summaryEvidenceIds: v.array(v.id("heliosEvidence")),
    confidence: v.number(),
    findings: v.array(
      v.object({
        category: v.union(
          v.literal("project_metadata"),
          v.literal("document_control"),
          v.literal("contract_requirements"),
          v.literal("required_forms"),
          v.literal("addenda"),
          v.literal("drawing_index"),
          v.literal("specification_sections"),
          v.literal("bid_items"),
          v.literal("allowances"),
          v.literal("alternates"),
          v.literal("unit_price_items"),
          v.literal("known_risks"),
          v.literal("missing_information"),
          v.literal("required_subcontractors"),
          v.literal("required_suppliers"),
          v.literal("scope_conflicts"),
          v.literal("addendum_impacts"),
        ),
        title: v.string(),
        detail: v.string(),
        confidence: v.number(),
        severity: v.union(
          v.literal("information"),
          v.literal("warning"),
          v.literal("critical"),
        ),
        evidenceIds: v.array(v.id("heliosEvidence")),
      }),
    ),
    generatedAt: v.number(),
  }).index("by_document", ["documentId"]),

  heliosDocumentClassifications: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    documentId: v.id("heliosDocuments"),
    category: v.union(
      v.literal("plans"),
      v.literal("specifications"),
      v.literal("written_scope"),
      v.literal("owner_bid_schedule"),
      v.literal("proposal_bid_forms"),
      v.literal("addenda"),
      v.literal("geotechnical"),
      v.literal("utilities"),
      v.literal("environmental_permits"),
      v.literal("referenced_standards_details"),
    ),
    reason: v.string(),
    classifiedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_package_document", ["packageId", "documentId"])
    .index("by_project", ["projectId", "createdAt"]),

  heliosBidBasisProfiles: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    profile: v.union(
      v.literal("plans_and_specs"),
      v.literal("plans_only"),
      v.literal("specs_only"),
      v.literal("written_scope_only"),
      v.literal("mixed_or_other"),
    ),
    profileOverride: v.optional(v.string()),
    classificationStatus: v.union(
      v.literal("inferred"),
      v.literal("confirmed"),
      v.literal("corrected"),
    ),
    categoryOverrides: v.array(
      v.object({ category: v.string(), state: v.string() }),
    ),
    sourceFingerprint: v.string(),
    proceededAt: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
    confirmedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_package", ["packageId"])
    .index("by_project_revision", ["projectId", "packageRevision"]),

  // Civil Geometry 2.0, Euclid Stage 4B: versioned write-only shadow storage.
  // Existing plan, civil-geometry, estimate, cockpit, and assistant readers do
  // not consume these tables until a separately approved cutover milestone.
  heliosEuclidModels: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    engineeringRecordId: v.id("heliosEngineeringRecords"),
    engineeringArtifactId: v.id("heliosEngineeringArtifacts"),
    planRunId: v.id("heliosPlanRuns"),
    geometryRunId: v.id("heliosCivilGeometryRuns"),
    modelKey: v.string(),
    schemaVersion: v.number(),
    processingVersion: v.number(),
    adapterVersion: v.string(),
    canonicalVersion: v.optional(v.number()),
    canonicalOrigin: v.optional(v.union(v.literal("ingestion"), v.literal("reviewed_candidate"))),
    sourceFingerprint: v.string(),
    modelFingerprint: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("building"),
      v.literal("proposed"),
      v.literal("conflicted"),
      v.literal("partially_accepted"),
      v.literal("accepted"),
      v.literal("export_eligible"),
      v.literal("stale"),
      v.literal("superseded"),
      v.literal("failed"),
    ),
    isCurrent: v.boolean(),
    shadowMode: v.boolean(),
    sourceRecordCount: v.number(),
    acceptedSourceRecordCount: v.number(),
    provenanceCount: v.number(),
    entityCount: v.number(),
    entityChunkCount: v.number(),
    issueCount: v.number(),
    blockingIssueCount: v.number(),
    validationStatus: v.union(v.literal("valid"), v.literal("invalid")),
    validationIssues: v.array(v.object({
      code: v.string(),
      message: v.string(),
      entityId: v.optional(v.string()),
    })),
    lastError: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_project_current", ["projectId", "isCurrent"])
    .index("by_package_current", ["packageId", "isCurrent"])
    .index("by_geometry_run", ["geometryRunId", "createdAt"])
    .index("by_model_key", ["modelKey"])
    .index("by_model_fingerprint", ["modelFingerprint"]),

  heliosEuclidProvenance: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    euclidModelId: v.id("heliosEuclidModels"),
    provenanceKey: v.string(),
    engineeringSourceId: v.id("heliosEngineeringSources"),
    engineeringProvenanceId: v.id("heliosEngineeringProvenance"),
    engineeringPageId: v.id("heliosEngineeringPages"),
    sourceGeometryRecordId: v.id("heliosCivilGeometryRecords"),
    documentId: v.optional(v.id("heliosDocuments")),
    physicalPageNumber: v.number(),
    sheetNumber: v.optional(v.string()),
    viewKey: v.optional(v.string()),
    locator: v.string(),
    authority: v.union(
      v.literal("coordinate_control"),
      v.literal("dimensioned_geometry"),
      v.literal("profile_geometry"),
      v.literal("cross_section_geometry"),
      v.literal("invert_geometry"),
      v.literal("material_note"),
      v.literal("calibrated_scale_fallback"),
    ),
    confidence: v.number(),
    provenanceFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_model", ["euclidModelId", "createdAt"])
    .index("by_model_key", ["euclidModelId", "provenanceKey"])
    .index("by_source_geometry", ["sourceGeometryRecordId"])
    .index("by_engineering_provenance", ["engineeringProvenanceId"]),

  heliosEuclidEntityChunks: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    euclidModelId: v.id("heliosEuclidModels"),
    entityType: v.union(
      v.literal("spatial_reference"),
      v.literal("alignment"),
      v.literal("control_point"),
      v.literal("horizontal_element"),
      v.literal("station_equation"),
      v.literal("profile"),
      v.literal("profile_point"),
      v.literal("vertical_tangent"),
      v.literal("vertical_curve"),
      v.literal("typical_section"),
      v.literal("cross_section_point"),
      v.literal("structure"),
      v.literal("invert"),
      v.literal("material_layer"),
      v.literal("relationship"),
      v.literal("issue"),
    ),
    chunkIndex: v.number(),
    entityCount: v.number(),
    payloadJson: v.string(),
    payloadFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_model", ["euclidModelId", "entityType", "chunkIndex"])
    .index("by_model_chunk", ["euclidModelId", "chunkIndex"]),

  // Euclid Stage 4C: immutable deterministic horizontal-control results.
  // These remain shadow-only and do not replace existing geometry readers.
  heliosEuclidHorizontalSolutions: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    euclidModelId: v.id("heliosEuclidModels"),
    solutionKey: v.string(),
    solver: v.string(),
    solverVersion: v.number(),
    toleranceVersion: v.string(),
    tolerances: v.object({
      duplicatePointPass: v.number(),
      duplicatePointBlock: v.number(),
      endpointClosurePass: v.number(),
      endpointClosureBlock: v.number(),
      curveLengthPass: v.number(),
      curveLengthBlock: v.number(),
      stationLengthPass: v.number(),
      stationLengthBlock: v.number(),
      bearingPassDegrees: v.number(),
      bearingBlockDegrees: v.number(),
    }),
    sourceFingerprint: v.string(),
    modelFingerprint: v.string(),
    solutionFingerprint: v.string(),
    status: v.union(
      v.literal("passed"),
      v.literal("review"),
      v.literal("blocked"),
      v.literal("not_applicable"),
      v.literal("failed"),
      v.literal("superseded"),
    ),
    isCurrent: v.boolean(),
    shadowMode: v.boolean(),
    alignmentCount: v.number(),
    passedAlignmentCount: v.number(),
    reviewAlignmentCount: v.number(),
    blockedAlignmentCount: v.number(),
    notApplicableAlignmentCount: v.number(),
    checkCount: v.number(),
    reviewCount: v.number(),
    blockingCount: v.number(),
    chunkCount: v.number(),
    lastError: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_project_current", ["projectId", "isCurrent"])
    .index("by_package_current", ["packageId", "isCurrent"])
    .index("by_model", ["euclidModelId", "createdAt"])
    .index("by_solution_key", ["solutionKey"])
    .index("by_solution_fingerprint", ["solutionFingerprint"]),

  heliosEuclidHorizontalSolutionChunks: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    solutionId: v.id("heliosEuclidHorizontalSolutions"),
    alignmentId: v.string(),
    chunkIndex: v.number(),
    checkCount: v.number(),
    payloadJson: v.string(),
    payloadFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_solution", ["solutionId", "alignmentId", "chunkIndex"])
    .index("by_solution_chunk", ["solutionId", "chunkIndex"]),

  // Euclid Stage 4D: immutable deterministic vertical/profile results.
  // These remain shadow-only and do not replace existing geometry readers.
  heliosEuclidVerticalSolutions: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    euclidModelId: v.id("heliosEuclidModels"),
    solutionKey: v.string(),
    solver: v.string(),
    solverVersion: v.number(),
    toleranceVersion: v.string(),
    tolerances: v.object({
      elevationPass: v.number(),
      elevationBlock: v.number(),
      stationPass: v.number(),
      stationBlock: v.number(),
      gradePassPercent: v.number(),
      gradeBlockPercent: v.number(),
      kValuePass: v.number(),
      kValueBlock: v.number(),
    }),
    sourceFingerprint: v.string(),
    modelFingerprint: v.string(),
    solutionFingerprint: v.string(),
    status: v.union(
      v.literal("passed"),
      v.literal("review"),
      v.literal("blocked"),
      v.literal("not_applicable"),
      v.literal("failed"),
      v.literal("superseded"),
    ),
    isCurrent: v.boolean(),
    shadowMode: v.boolean(),
    profileCount: v.number(),
    passedProfileCount: v.number(),
    reviewProfileCount: v.number(),
    blockedProfileCount: v.number(),
    notApplicableProfileCount: v.number(),
    checkCount: v.number(),
    reviewCount: v.number(),
    blockingCount: v.number(),
    chunkCount: v.number(),
    lastError: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_project_current", ["projectId", "isCurrent"])
    .index("by_package_current", ["packageId", "isCurrent"])
    .index("by_model", ["euclidModelId", "createdAt"])
    .index("by_solution_key", ["solutionKey"])
    .index("by_solution_fingerprint", ["solutionFingerprint"]),

  heliosEuclidVerticalSolutionChunks: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    solutionId: v.id("heliosEuclidVerticalSolutions"),
    profileId: v.string(),
    chunkIndex: v.number(),
    checkCount: v.number(),
    payloadJson: v.string(),
    payloadFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_solution", ["solutionId", "profileId", "chunkIndex"])
    .index("by_solution_chunk", ["solutionId", "chunkIndex"]),

  // Euclid Stage 4E: immutable relationship graph and quantity-readiness results.
  // These remain shadow-only and do not drive existing quantity or UI readers.
  heliosEuclidIntegrationSolutions: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    euclidModelId: v.id("heliosEuclidModels"),
    horizontalSolutionId: v.id("heliosEuclidHorizontalSolutions"),
    verticalSolutionId: v.id("heliosEuclidVerticalSolutions"),
    solutionKey: v.string(),
    solver: v.string(),
    solverVersion: v.number(),
    sourceFingerprint: v.string(),
    modelFingerprint: v.string(),
    horizontalSolutionFingerprint: v.string(),
    verticalSolutionFingerprint: v.string(),
    solutionFingerprint: v.string(),
    status: v.union(
      v.literal("passed"),
      v.literal("review"),
      v.literal("blocked"),
      v.literal("not_applicable"),
      v.literal("failed"),
      v.literal("superseded"),
    ),
    isCurrent: v.boolean(),
    shadowMode: v.boolean(),
    nodeCount: v.number(),
    edgeCount: v.number(),
    alignmentCount: v.number(),
    readinessCount: v.number(),
    readyCount: v.number(),
    reviewCount: v.number(),
    blockedCount: v.number(),
    unavailableCount: v.number(),
    checkCount: v.number(),
    chunkCount: v.number(),
    lastError: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_project_current", ["projectId", "isCurrent"])
    .index("by_package_current", ["packageId", "isCurrent"])
    .index("by_model", ["euclidModelId", "createdAt"])
    .index("by_solution_key", ["solutionKey"])
    .index("by_solution_fingerprint", ["solutionFingerprint"]),

  heliosEuclidIntegrationSolutionChunks: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    solutionId: v.id("heliosEuclidIntegrationSolutions"),
    chunkIndex: v.number(),
    itemCount: v.number(),
    payloadJson: v.string(),
    payloadFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_solution", ["solutionId", "chunkIndex"]),

  // Euclid Stage 4G: append-only estimator decisions. These records never
  // rewrite canonical model chunks or deterministic solver outputs.
  heliosEuclidReviewDecisions: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    euclidModelId: v.id("heliosEuclidModels"),
    requestId: v.string(),
    modelFingerprint: v.string(),
    sourceFingerprint: v.string(),
    targetEntityType: v.union(
      v.literal("alignment"),
      v.literal("control_point"),
      v.literal("horizontal_element"),
      v.literal("station_equation"),
      v.literal("profile"),
      v.literal("profile_point"),
      v.literal("vertical_tangent"),
      v.literal("vertical_curve"),
      v.literal("typical_section"),
      v.literal("structure"),
      v.literal("invert"),
      v.literal("material_layer"),
    ),
    targetEntityId: v.string(),
    targetFingerprint: v.string(),
    action: v.union(
      v.literal("accept"),
      v.literal("correct"),
      v.literal("defer"),
      v.literal("reject"),
    ),
    reason: v.optional(v.string()),
    correctionJson: v.optional(v.string()),
    beforeJson: v.string(),
    decisionFingerprint: v.string(),
    reviewerUserId: v.id("users"),
    reviewerName: v.string(),
    createdAt: v.number(),
  })
    .index("by_project_created", ["projectId", "createdAt"])
    .index("by_model_created", ["euclidModelId", "createdAt"])
    .index("by_model_request", ["euclidModelId", "requestId"])
    .index("by_target_created", ["euclidModelId", "targetEntityType", "targetEntityId", "createdAt"])
    .index("by_decision_fingerprint", ["decisionFingerprint"]),

  // Euclid Stage 4H: immutable reviewed candidates. These are derived overlays
  // only and never replace heliosEuclidModels or drive quantity readers.
  heliosEuclidReviewCandidates: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    sourceEuclidModelId: v.id("heliosEuclidModels"),
    requestId: v.string(),
    candidateKey: v.string(),
    sourceModelFingerprint: v.string(),
    sourceFingerprint: v.string(),
    reviewSetFingerprint: v.string(),
    candidateFingerprint: v.string(),
    builder: v.string(),
    builderVersion: v.number(),
    status: v.union(
      v.literal("incomplete_review"),
      v.literal("blocked"),
      v.literal("ready_for_validation"),
    ),
    validationEligible: v.boolean(),
    downstreamEligible: v.boolean(),
    totalTargetCount: v.number(),
    acceptedCount: v.number(),
    correctedCount: v.number(),
    deferredCount: v.number(),
    rejectedCount: v.number(),
    unreviewedCount: v.number(),
    blockingReasons: v.array(v.string()),
    decisionCount: v.number(),
    entityCount: v.number(),
    chunkCount: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project_created", ["projectId", "createdAt"])
    .index("by_model_created", ["sourceEuclidModelId", "createdAt"])
    .index("by_model_request", ["sourceEuclidModelId", "requestId"])
    .index("by_candidate_key", ["candidateKey"]),

  heliosEuclidReviewCandidateChunks: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    candidateId: v.id("heliosEuclidReviewCandidates"),
    entityType: v.union(
      v.literal("spatial_reference"),
      v.literal("alignment"),
      v.literal("control_point"),
      v.literal("horizontal_element"),
      v.literal("station_equation"),
      v.literal("profile"),
      v.literal("profile_point"),
      v.literal("vertical_tangent"),
      v.literal("vertical_curve"),
      v.literal("typical_section"),
      v.literal("cross_section_point"),
      v.literal("structure"),
      v.literal("invert"),
      v.literal("material_layer"),
      v.literal("relationship"),
      v.literal("issue"),
    ),
    chunkIndex: v.number(),
    entityCount: v.number(),
    payloadJson: v.string(),
    payloadFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_candidate", ["candidateId", "entityType", "chunkIndex"]),

  heliosEuclidReviewCandidateDecisions: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    candidateId: v.id("heliosEuclidReviewCandidates"),
    decisionId: v.id("heliosEuclidReviewDecisions"),
    targetEntityType: v.string(),
    targetEntityId: v.string(),
    action: v.string(),
    decisionFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_candidate", ["candidateId", "createdAt"])
    .index("by_decision", ["decisionId", "createdAt"]),

  // Euclid Stage 4I: immutable deterministic validation results for reviewed
  // candidates. They remain non-promotable and cannot drive downstream work.
  heliosEuclidCandidateValidations: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    sourceEuclidModelId: v.id("heliosEuclidModels"),
    candidateId: v.id("heliosEuclidReviewCandidates"),
    requestId: v.string(),
    validationKey: v.string(),
    sourceModelFingerprint: v.string(),
    candidateFingerprint: v.string(),
    sourceFingerprint: v.string(),
    reviewSetFingerprint: v.string(),
    validator: v.string(),
    validatorVersion: v.number(),
    status: v.union(
      v.literal("passed"),
      v.literal("review"),
      v.literal("blocked"),
      v.literal("not_applicable"),
    ),
    validationPassed: v.boolean(),
    promotionEligible: v.boolean(),
    downstreamEligible: v.boolean(),
    sourceHorizontalFingerprint: v.string(),
    candidateHorizontalFingerprint: v.string(),
    sourceVerticalFingerprint: v.string(),
    candidateVerticalFingerprint: v.string(),
    sourceIntegrationFingerprint: v.string(),
    candidateIntegrationFingerprint: v.string(),
    validationFingerprint: v.string(),
    horizontalStatus: v.string(),
    verticalStatus: v.string(),
    integrationStatus: v.string(),
    changedCount: v.number(),
    improvedCount: v.number(),
    degradedCount: v.number(),
    horizontalCheckCount: v.number(),
    verticalCheckCount: v.number(),
    integrationCheckCount: v.number(),
    readinessCount: v.number(),
    readyCount: v.number(),
    reviewCount: v.number(),
    blockedCount: v.number(),
    unavailableCount: v.number(),
    blockingReasons: v.array(v.string()),
    chunkCount: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_candidate_created", ["candidateId", "createdAt"])
    .index("by_candidate_request", ["candidateId", "requestId"])
    .index("by_validation_key", ["validationKey"])
    .index("by_project_created", ["projectId", "createdAt"]),

  heliosEuclidCandidateValidationChunks: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    validationId: v.id("heliosEuclidCandidateValidations"),
    resultType: v.union(
      v.literal("horizontal_check"),
      v.literal("vertical_check"),
      v.literal("integration_check"),
      v.literal("readiness"),
      v.literal("delta"),
    ),
    chunkIndex: v.number(),
    itemCount: v.number(),
    payloadJson: v.string(),
    payloadFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_validation", ["validationId", "resultType", "chunkIndex"]),

  // Euclid Stage 4J: append-only governed promotion lineage. The promoted
  // model is stored as a new canonical Euclid version; downstream use remains
  // separately gated.
  heliosEuclidPromotions: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    sourceEuclidModelId: v.id("heliosEuclidModels"),
    candidateId: v.id("heliosEuclidReviewCandidates"),
    validationId: v.id("heliosEuclidCandidateValidations"),
    promotedEuclidModelId: v.id("heliosEuclidModels"),
    requestId: v.string(),
    promotionKey: v.string(),
    canonicalVersion: v.number(),
    sourceModelFingerprint: v.string(),
    candidateFingerprint: v.string(),
    reviewSetFingerprint: v.string(),
    validationFingerprint: v.string(),
    promotedModelFingerprint: v.string(),
    promoter: v.string(),
    promoterVersion: v.number(),
    adapterVersion: v.string(),
    status: v.literal("promoted"),
    downstreamEligible: v.boolean(),
    createdBy: v.id("users"),
    promotedByName: v.string(),
    createdAt: v.number(),
  })
    .index("by_project_created", ["projectId", "createdAt"])
    .index("by_source_request", ["sourceEuclidModelId", "requestId"])
    .index("by_validation", ["validationId"])
    .index("by_promotion_key", ["promotionKey"])
    .index("by_promoted_model", ["promotedEuclidModelId"]),

  // Euclid Stage 4K: append-only lineage from a deterministic quantity
  // candidate into a new proposed estimate quantity. Owner quantities,
  // accepted estimator decisions, resources, and pricing remain untouched.
  heliosEuclidQuantityPublications: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    euclidModelId: v.id("heliosEuclidModels"),
    canonicalVersion: v.number(),
    integrationSolutionId: v.id("heliosEuclidIntegrationSolutions"),
    estimateId: v.id("heliosEstimates"),
    costCodeId: v.id("heliosEstimateCostCodes"),
    estimateQuantityId: v.id("heliosEstimateQuantities"),
    requestId: v.string(),
    publicationKey: v.string(),
    candidateId: v.string(),
    candidateFingerprint: v.string(),
    sourceFingerprint: v.string(),
    modelFingerprint: v.string(),
    integrationSolutionFingerprint: v.string(),
    readinessId: v.string(),
    capability: v.string(),
    calculationType: v.string(),
    alignmentId: v.string(),
    label: v.string(),
    value: v.number(),
    unit: v.string(),
    formula: v.string(),
    method: v.string(),
    inputEntityIds: v.array(v.string()),
    provenanceKeys: v.array(v.string()),
    confidence: v.number(),
    use: v.union(v.literal("comparative"), v.literal("production")),
    status: v.literal("published"),
    reviewStatus: v.literal("proposed"),
    publisher: v.string(),
    publisherVersion: v.number(),
    adapterVersion: v.string(),
    createdBy: v.id("users"),
    publishedByName: v.string(),
    createdAt: v.number(),
  })
    .index("by_model_created", ["euclidModelId", "createdAt"])
    .index("by_model_request", ["euclidModelId", "requestId"])
    .index("by_model_candidate", ["euclidModelId", "candidateId"])
    .index("by_estimate_created", ["estimateId", "createdAt"])
    .index("by_estimate_quantity", ["estimateQuantityId"])
    .index("by_publication_key", ["publicationKey"]),

  heliosBidBasisEvents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    profileId: v.id("heliosBidBasisProfiles"),
    action: v.union(
      v.literal("proceed"),
      v.literal("confirm_profile"),
      v.literal("correct_profile"),
      v.literal("set_category_state"),
      v.literal("classify_document"),
    ),
    category: v.optional(v.string()),
    documentId: v.optional(v.id("heliosDocuments")),
    previousValue: v.optional(v.string()),
    decisionValue: v.string(),
    reason: v.optional(v.string()),
    reviewerUserId: v.id("users"),
    reviewerName: v.string(),
    createdAt: v.number(),
  })
    .index("by_profile_created", ["profileId", "createdAt"])
    .index("by_project_created", ["projectId", "createdAt"]),

  heliosPlanRuns: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    isCurrent: v.boolean(),
    status: v.union(
      v.literal("not_applicable_to_current_basis"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("ready_for_review"),
      v.literal("partially_ready"),
      v.literal("failed"),
    ),
    processingVersion: v.number(),
    sourceFingerprint: v.string(),
    model: v.optional(v.string()),
    sourceDocumentCount: v.number(),
    sourcePageCount: v.number(),
    registeredPageCount: v.number(),
    sheetCount: v.number(),
    nonSheetPageCount: v.number(),
    exceptionPageCount: v.number(),
    measurableViewCount: v.number(),
    approvedCalibrationCount: v.number(),
    blockedMeasurementCount: v.number(),
    unresolvedReferenceCount: v.number(),
    issues: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_package_current", ["packageId", "isCurrent"])
    .index("by_project_created", ["projectId", "createdAt"]),

  heliosPlanJobs: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosPlanRuns"),
    documentId: v.id("heliosDocuments"),
    status: v.union(
      v.literal("queued"),
      v.literal("uploading"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    attempt: v.number(),
    openaiFileId: v.optional(v.string()),
    openaiResponseId: v.optional(v.string()),
    model: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_run", ["runId", "createdAt"])
    .index("by_document", ["documentId", "createdAt"]),

  heliosPlanPages: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosPlanRuns"),
    documentId: v.id("heliosDocuments"),
    documentName: v.string(),
    physicalPageNumber: v.number(),
    pageKind: v.union(v.literal("sheet"), v.literal("non_sheet"), v.literal("exception")),
    printedPageNumber: v.string(),
    sheetNumber: v.string(),
    title: v.string(),
    discipline: v.string(),
    subdiscipline: v.string(),
    issueDate: v.string(),
    revisionMarker: v.string(),
    addendumAssociation: v.string(),
    modality: v.union(v.literal("vector"), v.literal("scanned"), v.literal("hybrid"), v.literal("unusable")),
    processingVersion: v.number(),
    titleBlockBoundary: v.optional(v.object({ x: v.number(), y: v.number(), width: v.number(), height: v.number() })),
    titleBlockText: v.string(),
    confidence: v.number(),
    unresolvedIssues: v.array(v.string()),
    views: v.array(v.object({
      viewKey: v.string(),
      viewType: v.string(),
      label: v.string(),
      boundary: v.object({ x: v.number(), y: v.number(), width: v.number(), height: v.number() }),
      northOrientation: v.string(),
      measurable: v.boolean(),
      unresolvedIssues: v.array(v.string()),
    })),
    createdAt: v.number(),
  })
    .index("by_run_page", ["runId", "physicalPageNumber"])
    .index("by_run_sheet", ["runId", "sheetNumber"]),

  heliosPlanReferences: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosPlanRuns"),
    sourcePageId: v.id("heliosPlanPages"),
    sourceSheetNumber: v.string(),
    sourceViewKey: v.string(),
    referenceType: v.string(),
    label: v.string(),
    targetSheetNumber: v.string(),
    targetDetail: v.string(),
    targetSpecification: v.string(),
    locator: v.string(),
    status: v.union(v.literal("resolved"), v.literal("unresolved")),
    targetPageId: v.optional(v.id("heliosPlanPages")),
    confidence: v.number(),
    createdAt: v.number(),
  })
    .index("by_run", ["runId", "createdAt"])
    .index("by_source_page", ["sourcePageId", "createdAt"]),

  heliosPlanCalibrations: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosPlanRuns"),
    pageId: v.id("heliosPlanPages"),
    viewKey: v.string(),
    source: v.union(v.literal("stated_numeric"), v.literal("graphic_scale"), v.literal("known_dimension"), v.literal("estimator")),
    scale: v.string(),
    units: v.string(),
    sourceRegion: v.string(),
    confidence: v.number(),
    status: v.union(v.literal("proposed"), v.literal("approved"), v.literal("conflicted"), v.literal("blocked"), v.literal("superseded")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run", ["runId", "createdAt"])
    .index("by_page_view", ["pageId", "viewKey"]),

  heliosPlanReviewEvents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosPlanRuns"),
    calibrationId: v.optional(v.id("heliosPlanCalibrations")),
    action: v.union(
      v.literal("request_reconstruction"),
      v.literal("approve_calibration"),
      v.literal("block_calibration"),
      v.literal("resolve_sheet_conflict"),
    ),
    sheetNumber: v.optional(v.string()),
    primaryPageId: v.optional(v.id("heliosPlanPages")),
    reviewerUserId: v.id("users"),
    reviewerName: v.string(),
    previousValue: v.optional(v.string()),
    decisionValue: v.string(),
    createdAt: v.number(),
  })
    .index("by_run_created", ["runId", "createdAt"]),

  heliosPlanSheetDecisions: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosPlanRuns"),
    normalizedSheetNumber: v.string(),
    sheetNumber: v.string(),
    decision: v.union(
      v.literal("apply_recommended"),
      v.literal("use_as_current"),
      v.literal("keep_both"),
      v.literal("escalate"),
    ),
    status: v.union(
      v.literal("resolved"),
      v.literal("review_required"),
      v.literal("escalated"),
    ),
    primaryPageId: v.optional(v.id("heliosPlanPages")),
    referencePageIds: v.array(v.id("heliosPlanPages")),
    reason: v.string(),
    reviewerUserId: v.id("users"),
    reviewerName: v.string(),
    isCurrent: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run_current", ["runId", "isCurrent"])
    .index("by_run_sheet_current", ["runId", "normalizedSheetNumber", "isCurrent"]),

  heliosCivilGeometryRuns: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    planRunId: v.id("heliosPlanRuns"),
    isCurrent: v.boolean(),
    status: v.union(v.literal("queued"), v.literal("processing"), v.literal("ready_for_review"), v.literal("partially_ready"), v.literal("failed")),
    sourceDocumentCount: v.number(),
    model: v.optional(v.string()),
    recordCount: v.number(),
    acceptedRecordCount: v.number(),
    unresolvedIssueCount: v.number(),
    processingVersion: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_plan_current", ["planRunId", "isCurrent"])
    .index("by_project_created", ["projectId", "createdAt"]),

  heliosCivilGeometryJobs: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    geometryRunId: v.id("heliosCivilGeometryRuns"),
    planRunId: v.id("heliosPlanRuns"),
    documentId: v.id("heliosDocuments"),
    status: v.union(v.literal("queued"), v.literal("uploading"), v.literal("analyzing"), v.literal("completed"), v.literal("failed")),
    openaiFileId: v.optional(v.string()),
    openaiResponseId: v.optional(v.string()),
    model: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_run", ["geometryRunId", "createdAt"])
    .index("by_document", ["documentId", "createdAt"]),

  heliosCivilGeometryRecords: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    geometryRunId: v.id("heliosCivilGeometryRuns"),
    planRunId: v.id("heliosPlanRuns"),
    documentId: v.id("heliosDocuments"),
    pageId: v.id("heliosPlanPages"),
    viewKey: v.string(),
    geometryType: v.union(v.literal("horizontal_alignment"), v.literal("vertical_alignment"), v.literal("cross_section"), v.literal("invert_network"), v.literal("material_section")),
    authority: v.union(v.literal("coordinate_control"), v.literal("dimensioned_geometry"), v.literal("profile_geometry"), v.literal("cross_section_geometry"), v.literal("invert_geometry"), v.literal("material_note"), v.literal("calibrated_scale_fallback")),
    alignmentName: v.string(),
    sourceLocator: v.string(),
    horizontalPoints: v.array(v.object({ station: v.number(), northing: v.number(), easting: v.number(), label: v.string() })),
    horizontalSegments: v.array(v.object({ kind: v.union(v.literal("tangent"), v.literal("curve")), stationStart: v.number(), stationEnd: v.number(), length: v.number(), radius: v.optional(v.number()), deltaDegrees: v.optional(v.number()), bearing: v.string(), label: v.string() })),
    stationEquations: v.array(v.object({ backStation: v.number(), aheadStation: v.number(), label: v.string() })),
    verticalPoints: v.array(v.object({ station: v.number(), elevation: v.number(), label: v.string(), gradePercent: v.optional(v.number()) })),
    crossSectionPoints: v.array(v.object({ station: v.number(), offset: v.number(), elevation: v.number(), surface: v.union(v.literal("existing"), v.literal("proposed"), v.literal("subgrade")), label: v.string() })),
    invertPoints: v.array(v.object({ structureId: v.string(), station: v.optional(v.number()), offset: v.optional(v.number()), invertElevation: v.number(), pipeSize: v.string(), pipeMaterial: v.string() })),
    materialLayers: v.array(v.object({ name: v.string(), stationStart: v.optional(v.number()), stationEnd: v.optional(v.number()), offsetLeft: v.optional(v.number()), offsetRight: v.optional(v.number()), thickness: v.number(), thicknessUnit: v.string() })),
    units: v.string(),
    confidence: v.number(),
    unresolvedIssues: v.array(v.string()),
    status: v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected"), v.literal("superseded")),
    reviewedBy: v.optional(v.id("users")),
    reviewedByName: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run_created", ["geometryRunId", "createdAt"])
    .index("by_page", ["pageId", "createdAt"]),

  heliosCivilGeometryReviewEvents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    geometryRunId: v.id("heliosCivilGeometryRuns"),
    recordId: v.optional(v.id("heliosCivilGeometryRecords")),
    action: v.union(v.literal("request_reconstruction"), v.literal("accept_geometry"), v.literal("reject_geometry")),
    reviewerUserId: v.id("users"),
    reviewerName: v.string(),
    previousValue: v.optional(v.string()),
    decisionValue: v.string(),
    createdAt: v.number(),
  }).index("by_run_created", ["geometryRunId", "createdAt"]),

  heliosTakeoffRuns: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    packageRevision: v.number(),
    planRunId: v.id("heliosPlanRuns"),
    estimateId: v.id("heliosEstimates"),
    isCurrent: v.boolean(),
    status: v.union(v.literal("ready"), v.literal("blocked"), v.literal("not_applicable")),
    blockedReason: v.optional(v.string()),
    processingVersion: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_current", ["projectId", "isCurrent"])
    .index("by_plan_estimate", ["planRunId", "estimateId"]),

  heliosTakeoffMeasurements: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosTakeoffRuns"),
    planRunId: v.id("heliosPlanRuns"),
    estimateId: v.id("heliosEstimates"),
    costCodeId: v.id("heliosEstimateCostCodes"),
    pageId: v.id("heliosPlanPages"),
    viewKey: v.string(),
    calibrationId: v.optional(v.id("heliosPlanCalibrations")),
    geometryRecordIds: v.array(v.id("heliosCivilGeometryRecords")),
    sourceBasis: v.union(v.literal("coordinate_geometry"), v.literal("dimensioned_geometry"), v.literal("calibrated_scale_fallback"), v.literal("estimator_measurement")),
    measurementType: v.union(v.literal("count"), v.literal("length"), v.literal("area"), v.literal("volume"), v.literal("derived")),
    label: v.string(),
    geometryKind: v.union(v.literal("recognized_objects"), v.literal("polyline"), v.literal("polygon"), v.literal("formula"), v.literal("estimator_measurement")),
    geometry: v.array(v.object({ x: v.number(), y: v.number() })),
    objectReferences: v.array(v.string()),
    rawValue: v.number(),
    rawUnit: v.string(),
    outputUnit: v.string(),
    factors: v.array(v.object({ label: v.string(), value: v.number(), unit: v.string() })),
    calculatedValue: v.number(),
    formula: v.string(),
    includedScope: v.string(),
    excludedScope: v.string(),
    assumptions: v.array(v.string()),
    confidence: v.number(),
    status: v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected"), v.literal("superseded"), v.literal("blocked")),
    createdBy: v.id("users"),
    createdByName: v.string(),
    reviewedBy: v.optional(v.id("users")),
    reviewedByName: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run_created", ["runId", "createdAt"])
    .index("by_cost_code", ["costCodeId", "createdAt"])
    .index("by_calibration", ["calibrationId", "createdAt"]),

  heliosTakeoffQuantities: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosTakeoffRuns"),
    planRunId: v.id("heliosPlanRuns"),
    estimateId: v.id("heliosEstimates"),
    costCodeId: v.id("heliosEstimateCostCodes"),
    measurementIds: v.array(v.id("heliosTakeoffMeasurements")),
    value: v.number(),
    unit: v.string(),
    use: v.union(v.literal("comparative"), v.literal("production"), v.literal("purchasing"), v.literal("risk")),
    formula: v.string(),
    ownerQuantity: v.optional(v.number()),
    ownerUnit: v.optional(v.string()),
    variancePercent: v.optional(v.number()),
    reconciliationStatus: v.union(v.literal("not_comparable"), v.literal("matching"), v.literal("variance")),
    status: v.union(v.literal("proposed"), v.literal("sent_to_estimate"), v.literal("rejected"), v.literal("superseded")),
    estimateQuantityId: v.optional(v.id("heliosEstimateQuantities")),
    createdBy: v.id("users"),
    createdByName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run_created", ["runId", "createdAt"])
    .index("by_cost_code", ["costCodeId", "createdAt"]),

  heliosTakeoffReviewEvents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.id("heliosBidPackages"),
    runId: v.id("heliosTakeoffRuns"),
    measurementId: v.optional(v.id("heliosTakeoffMeasurements")),
    quantityId: v.optional(v.id("heliosTakeoffQuantities")),
    action: v.union(
      v.literal("create_measurement"),
      v.literal("accept_measurement"),
      v.literal("reject_measurement"),
      v.literal("propose_quantity_to_estimate"),
      v.literal("reject_quantity"),
    ),
    reviewerUserId: v.id("users"),
    reviewerName: v.string(),
    previousValue: v.optional(v.string()),
    decisionValue: v.string(),
    createdAt: v.number(),
  })
    .index("by_run_created", ["runId", "createdAt"]),

  heliosProjectIntelligence: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    packageId: v.optional(v.id("heliosBidPackages")),
    packageRevision: v.optional(v.number()),
    generationId: v.optional(v.id("heliosIntelligenceJobs")),
    isCurrent: v.optional(v.boolean()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    model: v.string(),
    schemaVersion: v.number(),
    summary: v.string(),
    summaryEvidenceIds: v.array(v.id("heliosEvidence")),
    projectType: v.object({
      value: v.string(),
      confidence: v.number(),
      evidenceIds: v.array(v.id("heliosEvidence")),
    }),
    fundingSource: v.object({
      value: v.string(),
      confidence: v.number(),
      evidenceIds: v.array(v.id("heliosEvidence")),
    }),
    projectMetadata: v.optional(v.object({
      projectNumber: v.object({
        value: v.string(),
        confidence: v.number(),
        evidenceIds: v.array(v.id("heliosEvidence")),
      }),
      ownerClient: v.object({
        value: v.string(),
        confidence: v.number(),
        evidenceIds: v.array(v.id("heliosEvidence")),
      }),
      engineer: v.object({
        value: v.string(),
        confidence: v.number(),
        evidenceIds: v.array(v.id("heliosEvidence")),
      }),
      bidDate: v.object({
        value: v.string(),
        confidence: v.number(),
        evidenceIds: v.array(v.id("heliosEvidence")),
      }),
      location: v.object({
        value: v.string(),
        confidence: v.number(),
        evidenceIds: v.array(v.id("heliosEvidence")),
      }),
    })),
    confidence: v.number(),
    findings: v.array(
      v.object({
        category: v.union(
          v.literal("project_metadata"),
          v.literal("document_control"),
          v.literal("contract_requirements"),
          v.literal("required_forms"),
          v.literal("addenda"),
          v.literal("drawing_index"),
          v.literal("specification_sections"),
          v.literal("bid_items"),
          v.literal("allowances"),
          v.literal("alternates"),
          v.literal("unit_price_items"),
          v.literal("known_risks"),
          v.literal("missing_information"),
          v.literal("required_subcontractors"),
          v.literal("required_suppliers"),
          v.literal("scope_conflicts"),
          v.literal("addendum_impacts"),
        ),
        title: v.string(),
        detail: v.string(),
        confidence: v.number(),
        severity: v.union(
          v.literal("information"),
          v.literal("warning"),
          v.literal("critical"),
        ),
        evidenceIds: v.array(v.id("heliosEvidence")),
      }),
    ),
    generatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  heliosFindingReviewEvents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    intelligenceId: v.id("heliosProjectIntelligence"),
    generationId: v.optional(v.id("heliosIntelligenceJobs")),
    findingId: v.string(),
    findingIndex: v.number(),
    action: v.union(
      v.literal("approve"),
      v.literal("correct"),
      v.literal("reject"),
      v.literal("request_reanalysis"),
      v.literal("supersede"),
    ),
    status: v.union(
      v.literal("approved"),
      v.literal("corrected"),
      v.literal("rejected"),
      v.literal("reanalysis_requested"),
      v.literal("superseded"),
    ),
    correctedTitle: v.optional(v.string()),
    correctedDetail: v.optional(v.string()),
    trade: v.optional(v.string()),
    comment: v.optional(v.string()),
    reviewerUserId: v.id("users"),
    reviewerName: v.string(),
    createdAt: v.number(),
  })
    .index("by_intelligence_created", ["intelligenceId", "createdAt"])
    .index("by_intelligence_finding_created", [
      "intelligenceId",
      "findingId",
      "createdAt",
    ])
    .index("by_project_created", ["projectId", "createdAt"]),

  heliosEstimates: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    createdBy: v.id("users"),
    sourceIntelligenceId: v.id("heliosProjectIntelligence"),
    sourcePackageRevision: v.optional(v.number()),
    version: v.number(),
    schemaVersion: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("proposal_processing"),
      v.literal("ready_for_review"),
      v.literal("accepted"),
      v.literal("superseded"),
      v.literal("failed"),
    ),
    model: v.optional(v.string()),
    error: v.optional(v.string()),
    overheadBasisPoints: v.number(),
    profitBasisPoints: v.number(),
    bondBasisPoints: v.number(),
    taxProfileStatus: v.union(
      v.literal("not_configured"),
      v.literal("configured"),
    ),
    importReviewedBy: v.optional(v.id("users")),
    importReviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_version", ["projectId", "version"])
    .index("by_project_status", ["projectId", "status", "updatedAt"])
    .index("by_company_updated", ["companyId", "updatedAt"]),

  heliosEstimateJobs: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    sourceIntelligenceId: v.id("heliosProjectIntelligence"),
    packageRevision: v.optional(v.number()),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    openaiResponseId: v.optional(v.string()),
    model: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_estimate", ["estimateId", "createdAt"])
    .index("by_project_status", ["projectId", "status", "createdAt"]),

  heliosEstimateSections: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    key: v.string(),
    name: v.string(),
    sequence: v.number(),
    reviewStatus: v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    ),
    evidenceIds: v.array(v.id("heliosEvidence")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_estimate_sequence", ["estimateId", "sequence"]),

  heliosOwnerPayItems: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    sectionId: v.id("heliosEstimateSections"),
    officialSequence: v.optional(v.number()),
    officialItemNumber: v.string(),
    description: v.string(),
    estimatorDescription: v.optional(v.string()),
    sequence: v.number(),
    bidQuantity: v.optional(v.number()),
    bidUnit: v.string(),
    itemType: v.optional(
      v.union(
        v.literal("unit_price"),
        v.literal("lump_sum"),
        v.literal("fixed_price"),
        v.literal("allowance"),
      ),
    ),
    fixedAmountCents: v.optional(v.number()),
    importChangeType: v.optional(
      v.union(
        v.literal("new"),
        v.literal("unchanged"),
        v.literal("changed"),
        v.literal("conflict"),
        v.literal("missing"),
      ),
    ),
    quantityStatus: v.union(
      v.literal("owner_provided"),
      v.literal("ai_preliminary"),
      v.literal("takeoff_required"),
    ),
    confidence: v.number(),
    reviewStatus: v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    ),
    evidenceIds: v.array(v.id("heliosEvidence")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estimate", ["estimateId", "sequence"])
    .index("by_section", ["sectionId", "sequence"]),

  heliosEstimateCostCodes: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    payItemId: v.id("heliosOwnerPayItems"),
    code: v.string(),
    description: v.string(),
    sequence: v.number(),
    scopeOwnership: v.union(
      v.literal("self_perform"),
      v.literal("subcontract"),
      v.literal("supplier"),
      v.literal("allowance"),
      v.literal("owner_responsibility"),
      v.literal("undecided"),
      v.literal("unassigned"),
    ),
    productionQuantity: v.optional(v.number()),
    productionUnit: v.string(),
    allocationRequired: v.optional(v.boolean()),
    confidence: v.number(),
    reviewStatus: v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    ),
    evidenceIds: v.array(v.id("heliosEvidence")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estimate", ["estimateId", "sequence"])
    .index("by_pay_item", ["payItemId", "sequence"]),

  heliosEstimateResources: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    costCodeId: v.id("heliosEstimateCostCodes"),
    sequence: v.number(),
    resourceClass: v.union(
      v.literal("labor"),
      v.literal("equipment"),
      v.literal("material"),
      v.literal("subcontract"),
      v.literal("trucking"),
      v.literal("disposal"),
      v.literal("other"),
    ),
    description: v.string(),
    quantity: v.optional(v.number()),
    unit: v.string(),
    rateCents: v.optional(v.number()),
    rateStatus: v.union(
      v.literal("unpriced"),
      v.literal("user_entered"),
      v.literal("cost_database"),
      v.literal("vendor_quote"),
      v.literal("approved_historical"),
      v.literal("approved_crew"),
    ),
    priceSourceLabel: v.optional(v.string()),
    priceSourceReference: v.optional(v.string()),
    effectiveDate: v.optional(v.string()),
    wasteBasisPoints: v.optional(v.number()),
    durationHours: v.optional(v.number()),
    crewOrAssembly: v.optional(v.string()),
    escalationBasisPoints: v.optional(v.number()),
    overrideRateCents: v.optional(v.number()),
    overrideReason: v.optional(v.string()),
    overriddenBy: v.optional(v.id("users")),
    overriddenAt: v.optional(v.number()),
    reviewStatus: v.optional(v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    )),
    taxStatus: v.union(
      v.literal("taxable"),
      v.literal("exempt"),
      v.literal("unknown"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estimate", ["estimateId", "sequence"])
    .index("by_cost_code", ["costCodeId", "sequence"]),

  heliosEstimateQuantities: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    costCodeId: v.id("heliosEstimateCostCodes"),
    value: v.optional(v.number()),
    unit: v.string(),
    quantityType: v.union(
      v.literal("official_contract"),
      v.literal("plan"),
      v.literal("estimator_calculated"),
      v.literal("preliminary_ai_takeoff"),
      v.literal("vendor"),
      v.literal("allowance"),
      v.literal("estimator_assumption"),
      v.literal("takeoff_required"),
      v.literal("included_in_another_item"),
    ),
    sourceLabel: v.string(),
    sourceReference: v.optional(v.string()),
    method: v.string(),
    confidence: v.number(),
    use: v.union(
      v.literal("authoritative"),
      v.literal("comparative"),
      v.literal("production"),
    ),
    status: v.union(
      v.literal("current"),
      v.literal("conflicting"),
      v.literal("superseded"),
      v.literal("takeoff_required"),
    ),
    reviewStatus: v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    ),
    origin: v.union(v.literal("ai"), v.literal("human"), v.literal("import")),
    evidenceIds: v.array(v.id("heliosEvidence")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estimate", ["estimateId", "createdAt"])
    .index("by_cost_code", ["costCodeId", "createdAt"]),

  heliosEstimateAllocations: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    sourceCostCodeId: v.id("heliosEstimateCostCodes"),
    targetPayItemId: v.id("heliosOwnerPayItems"),
    targetCostCodeId: v.optional(v.id("heliosEstimateCostCodes")),
    allocationType: v.union(
      v.literal("quantity"),
      v.literal("percent"),
      v.literal("amount"),
    ),
    controllingValue: v.optional(v.number()),
    quantity: v.optional(v.number()),
    percentBasisPoints: v.optional(v.number()),
    amountCents: v.optional(v.number()),
    calculationBasis: v.optional(v.string()),
    balancingStatus: v.optional(v.union(
      v.literal("balanced"),
      v.literal("unbalanced"),
      v.literal("incomplete"),
      v.literal("duplicate"),
      v.literal("orphan"),
    )),
    reviewStatus: v.optional(v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    )),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estimate", ["estimateId", "createdAt"])
    .index("by_source_cost_code", ["sourceCostCodeId", "createdAt"]),

  heliosEstimateEvidenceLinks: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    evidenceId: v.id("heliosEvidence"),
    recordType: v.union(
      v.literal("section"),
      v.literal("pay_item"),
      v.literal("cost_code"),
      v.literal("resource"),
      v.literal("quantity"),
      v.literal("rfq"),
      v.literal("submittal"),
      v.literal("risk"),
    ),
    recordId: v.string(),
    relationship: v.union(
      v.literal("scope"),
      v.literal("quantity"),
      v.literal("pricing"),
      v.literal("procurement"),
      v.literal("submittal"),
      v.literal("risk"),
    ),
    origin: v.union(
      v.literal("ai"),
      v.literal("human"),
      v.literal("import"),
      v.literal("system"),
    ),
    verificationStatus: v.union(
      v.literal("proposed"),
      v.literal("verified"),
      v.literal("disputed"),
      v.literal("superseded"),
    ),
    verifierUserId: v.optional(v.id("users")),
    verifierName: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    comment: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estimate_created", ["estimateId", "createdAt"])
    .index("by_record", ["estimateId", "recordType", "recordId"])
    .index("by_evidence", ["estimateId", "evidenceId"]),

  heliosEstimateRfqs: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    title: v.string(),
    packageNumber: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("ready_to_send"),
      v.literal("sent"),
      v.literal("quote_received"),
      v.literal("quote_accepted"),
      v.literal("closed"),
    ),
    requiredQuoteDate: v.optional(v.string()),
    deliveryLocation: v.optional(v.string()),
    inclusions: v.array(v.string()),
    exclusions: v.array(v.string()),
    scheduleConstraints: v.array(v.string()),
    vendors: v.array(v.string()),
    linkedPayItemIds: v.array(v.id("heliosOwnerPayItems")),
    linkedCostCodeIds: v.array(v.id("heliosEstimateCostCodes")),
    linkedQuantityIds: v.array(v.id("heliosEstimateQuantities")),
    evidenceIds: v.array(v.id("heliosEvidence")),
    origin: v.union(v.literal("ai"), v.literal("human"), v.literal("system")),
    reviewStatus: v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estimate_created", ["estimateId", "createdAt"])
    .index("by_estimate_status", ["estimateId", "status", "updatedAt"]),

  heliosEstimateSubmittals: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    type: v.union(
      v.literal("product_data"),
      v.literal("shop_drawing"),
      v.literal("sample"),
      v.literal("mix_design"),
      v.literal("procedure"),
      v.literal("certification"),
      v.literal("other"),
    ),
    description: v.string(),
    specification: v.optional(v.string()),
    timing: v.optional(v.string()),
    responsibility: v.optional(v.string()),
    predecessor: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("required"),
      v.literal("assigned"),
      v.literal("submitted"),
      v.literal("accepted"),
      v.literal("closed"),
    ),
    linkedPayItemIds: v.array(v.id("heliosOwnerPayItems")),
    linkedCostCodeIds: v.array(v.id("heliosEstimateCostCodes")),
    evidenceIds: v.array(v.id("heliosEvidence")),
    origin: v.union(v.literal("ai"), v.literal("human"), v.literal("system")),
    reviewStatus: v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estimate_created", ["estimateId", "createdAt"])
    .index("by_estimate_status", ["estimateId", "status", "updatedAt"]),

  heliosEstimateRisks: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    category: v.optional(v.union(
      v.literal("document_control"),
      v.literal("contract"),
      v.literal("scope"),
      v.literal("quantity"),
      v.literal("pricing"),
      v.literal("schedule"),
      v.literal("procurement"),
      v.literal("site_conditions"),
      v.literal("utilities"),
      v.literal("safety"),
      v.literal("regulatory"),
      v.literal("environmental"),
      v.literal("other"),
    )),
    severity: v.optional(v.union(
      v.literal("information"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    )),
    title: v.string(),
    detail: v.string(),
    probabilityPercent: v.number(),
    lowCostCents: v.optional(v.number()),
    mostLikelyCostCents: v.optional(v.number()),
    highCostCents: v.optional(v.number()),
    scheduleDays: v.optional(v.number()),
    lowScheduleDays: v.optional(v.number()),
    mostLikelyScheduleDays: v.optional(v.number()),
    highScheduleDays: v.optional(v.number()),
    mitigationCostCents: v.optional(v.number()),
    mitigation: v.string(),
    contingencyResponse: v.optional(v.string()),
    owner: v.string(),
    responseDueDate: v.optional(v.string()),
    disposition: v.union(
      v.literal("open"),
      v.literal("mitigated"),
      v.literal("accepted"),
      v.literal("transferred"),
      v.literal("avoided"),
      v.literal("closed"),
    ),
    carryDecision: v.optional(v.union(
      v.literal("pending"),
      v.literal("base_estimate"),
      v.literal("contingency"),
      v.literal("qualification"),
      v.literal("transfer"),
      v.literal("no_carry"),
    )),
    linkedPayItemIds: v.optional(v.array(v.id("heliosOwnerPayItems"))),
    linkedCostCodeIds: v.optional(v.array(v.id("heliosEstimateCostCodes"))),
    linkedQuantityIds: v.optional(v.array(v.id("heliosEstimateQuantities"))),
    linkedDocumentIds: v.optional(v.array(v.id("heliosDocuments"))),
    confidence: v.number(),
    reviewStatus: v.union(
      v.literal("proposed"),
      v.literal("deferred"),
      v.literal("accepted"),
      v.literal("corrected"),
      v.literal("rejected"),
    ),
    evidenceIds: v.array(v.id("heliosEvidence")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_estimate", ["estimateId", "createdAt"]),

  heliosAssistantThreads: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    createdBy: v.id("users"),
    title: v.string(),
    status: v.union(v.literal("active"), v.literal("archived")),
    packageId: v.optional(v.id("heliosBidPackages")),
    packageRevision: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_updated", ["projectId", "updatedAt"])
    .index("by_company_updated", ["companyId", "updatedAt"]),

  heliosAssistantMessages: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    threadId: v.id("heliosAssistantThreads"),
    createdBy: v.id("users"),
    createdByName: v.string(),
    replyToMessageId: v.optional(v.id("heliosAssistantMessages")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    content: v.string(),
    answerType: v.optional(v.union(
      v.literal("document"),
      v.literal("geometry"),
      v.literal("quantity"),
      v.literal("estimate"),
      v.literal("risk"),
      v.literal("mixed"),
    )),
    answerStatus: v.optional(v.union(
      v.literal("accepted"),
      v.literal("proposed"),
      v.literal("inferred"),
      v.literal("conflicted"),
      v.literal("unavailable"),
    )),
    method: v.optional(v.string()),
    assumptions: v.array(v.string()),
    limitations: v.array(v.string()),
    confidence: v.optional(v.number()),
    citations: v.array(v.object({
      sourceId: v.string(),
      kind: v.union(
        v.literal("document_evidence"),
        v.literal("plan_sheet"),
        v.literal("civil_geometry"),
        v.literal("takeoff_quantity"),
        v.literal("estimate_quantity"),
        v.literal("estimate_item"),
        v.literal("risk"),
      ),
      label: v.string(),
      locator: v.string(),
      status: v.string(),
      documentId: v.optional(v.id("heliosDocuments")),
      pageNumber: v.optional(v.number()),
    })),
    packageId: v.optional(v.id("heliosBidPackages")),
    packageRevision: v.optional(v.number()),
    model: v.optional(v.string()),
    openaiResponseId: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_thread_created", ["threadId", "createdAt"])
    .index("by_project_created", ["projectId", "createdAt"])
    .index("by_reply", ["replyToMessageId"]),

  heliosEstimateDecisionEvents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("heliosProjects"),
    estimateId: v.id("heliosEstimates"),
    recordType: v.union(
      v.literal("section"),
      v.literal("pay_item"),
      v.literal("cost_code"),
      v.literal("resource"),
      v.literal("quantity"),
      v.literal("allocation"),
      v.literal("risk"),
      v.literal("rfq"),
      v.literal("submittal"),
      v.literal("evidence_link"),
      v.literal("estimate"),
    ),
    recordId: v.string(),
    action: v.union(
      v.literal("accept"),
      v.literal("correct"),
      v.literal("reject"),
      v.literal("defer"),
      v.literal("split"),
      v.literal("merge"),
      v.literal("map"),
      v.literal("accept_import"),
      v.literal("create"),
      v.literal("update"),
      v.literal("generate"),
      v.literal("status_change"),
      v.literal("verify"),
      v.literal("dispute"),
    ),
    comment: v.optional(v.string()),
    targetRecordId: v.optional(v.string()),
    previousValue: v.optional(v.any()),
    decisionValue: v.optional(v.any()),
    payload: v.optional(v.any()),
    reviewerUserId: v.id("users"),
    reviewerName: v.string(),
    createdAt: v.number(),
  })
    .index("by_estimate_created", ["estimateId", "createdAt"])
    .index("by_record_created", ["recordId", "createdAt"]),

  equipment: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    type: v.optional(v.string()),
    serial: v.optional(v.string()),
    hours: v.optional(v.number()),
    nextDue: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_company", ["companyId"]),

  rentals: defineTable({
    projectId: v.id("projects"),
    equipmentId: v.id("equipment"),
    vendor: v.optional(v.string()),
    po: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    rateType: v.optional(v.string()),
    rate: v.optional(v.number()),
    qty: v.optional(v.number()),
    deliveryFee: v.optional(v.number()),
    pickupFee: v.optional(v.number()),
    status: v.optional(v.string()),
    lastVerified: v.optional(v.string()),
    daysRented: v.optional(v.number()),
    totalCost: v.optional(v.number()),
  }).index("by_project", ["projectId"]),

  deliveries: defineTable({
    projectId: v.id("projects"),
    supplier: v.optional(v.string()),
    material: v.optional(v.string()),
    po: v.optional(v.string()),
    eta: v.optional(v.string()),
    status: v.optional(v.string()),
    confirmed: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  concretePours: defineTable({
    projectId: v.id("projects"),
    date: v.optional(v.string()),
    pour: v.optional(v.string()),
    cy: v.optional(v.number()),
    mixDesign: v.optional(v.string()),
    supplier: v.optional(v.string()),
    pump: v.optional(v.string()),
    crew: v.optional(v.string()),
    status: v.optional(v.string()),
    weatherRisk: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // submittals and rfis defined below with enhanced schemas

  risks: defineTable({
    projectId: v.id("projects"),
    description: v.optional(v.string()),
    probability: v.optional(v.string()),
    impact: v.optional(v.string()),
    mitigation: v.optional(v.string()),
    owner: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  personalEvents: defineTable({
    date: v.string(),
    time: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    recurring: v.optional(v.string()),
    done: v.optional(v.boolean()),
  }).index("by_date", ["date"]),

  feedback: defineTable({
    companyId: v.id("companies"),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    category: v.optional(v.string()),
    message: v.string(),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_company", ["companyId"])
    .index("by_status", ["status"]),

  vendors: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    category: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    emergency: v.optional(v.string()),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
  }).index("by_company", ["companyId"]),

  maintenance: defineTable({
    equipmentId: v.id("equipment"),
    date: v.optional(v.string()),
    service: v.optional(v.string()),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_equipment", ["equipmentId"]),

  // documents defined below with enhanced schema

  tasks: defineTable({
    projectId: v.id("projects"),
    task: v.string(),
    customTask: v.optional(v.string()),
    dateOrdered: v.optional(v.string()),
    dateScheduled: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dateComplete: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()), // "Not Started" | "In Progress" | "Blocked" | "Complete"
    impact: v.optional(v.string()),
    // New fields
    progress: v.optional(v.number()), // 0-100
    assignedTo: v.optional(v.string()), // contact name or company
    trade: v.optional(v.string()),
    phase: v.optional(v.string()), // "Pre-Construction" | "Foundation" | "Framing" | "Rough-In" | "Finish" | "Closeout"
    projectRole: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceItemId: v.optional(v.string()),
    sourceDocumentId: v.optional(v.string()),
    sourceSpecSection: v.optional(v.string()),
    sourcePage: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
    sourceCategory: v.optional(v.string()),
    blocker: v.optional(v.string()),
    lastReminderSentAt: v.optional(v.number()),
    reminderCount: v.optional(v.number()),
    lastReminderChannel: v.optional(v.string()),
    lastReminderStatus: v.optional(v.string()),
    lastReminderMessageId: v.optional(v.string()),
    lastReminderError: v.optional(v.string()),
    dependsOn: v.optional(v.array(v.string())), // task IDs
    activityLog: v.optional(v.array(v.object({
      date: v.string(),
      author: v.string(),
      note: v.string(),
      type: v.string(), // "note" | "status_change" | "date_change" | "progress" | "created"
    }))),
  }).index("by_project", ["projectId"]),

  scheduleConstraints: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    title: v.string(),
    constraintType: v.optional(v.string()),
    description: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    leadTimeDays: v.optional(v.number()),
    reviewPeriodDays: v.optional(v.number()),
    blockingRule: v.optional(v.string()),
    relatedTaskId: v.optional(v.string()),
    predecessorTaskId: v.optional(v.string()),
    successorTaskId: v.optional(v.string()),
    dependencyType: v.optional(v.string()),
    lagDays: v.optional(v.number()),
    dependencyStatus: v.optional(v.string()),
    dependencyNotes: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceItemId: v.optional(v.string()),
    sourceDocumentId: v.optional(v.string()),
    sourceSpecSection: v.optional(v.string()),
    sourcePage: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
    sourceCategory: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"]),

  paymentRules: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    title: v.string(),
    ruleType: v.optional(v.string()),
    description: v.optional(v.string()),
    measurementLanguage: v.optional(v.string()),
    backupDocumentation: v.optional(v.string()),
    storedMaterialRule: v.optional(v.string()),
    retainageRule: v.optional(v.string()),
    certifiedPayrollRequired: v.optional(v.boolean()),
    unitPriceRule: v.optional(v.string()),
    payItemNotes: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceItemId: v.optional(v.string()),
    sourceDocumentId: v.optional(v.string()),
    sourceSpecSection: v.optional(v.string()),
    sourcePage: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
    sourceCategory: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"]),

  fieldNotes: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    note: v.string(),
    author: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  customTrades: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
  }).index("by_company", ["companyId"]),

  contacts: defineTable({
    projectId: v.id("projects"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    company: v.optional(v.string()),
    title: v.optional(v.string()),
    role: v.optional(v.string()),
    trade: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  emails: defineTable({
    companyId: v.string(),
    projectId: v.optional(v.string()),
    subject: v.string(),
    from: v.string(),
    to: v.optional(v.string()),
    cc: v.optional(v.string()),
    date: v.string(),
    body: v.optional(v.string()),
    bodyPreview: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    hasAttachments: v.optional(v.boolean()),
    attachmentNames: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    threadId: v.optional(v.string()),
    importance: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.string())),
    aiTone: v.optional(v.string()),
    aiRiskFlags: v.optional(v.array(v.string())),
    aiActionItems: v.optional(v.array(v.string())),
    aiSummary: v.optional(v.string()),
    routingConfidence: v.optional(v.number()),
    communicationBucket: v.optional(v.string()),
    communicationCategory: v.optional(v.string()),
    suggestedNextAction: v.optional(v.string()),
    // Workflow pipeline
    pipelineStatus: v.optional(v.string()),   // "inbox" | "processing" | "assigned" | "filed"
    processedByPm: v.optional(v.string()),     // PM name that processed this
    processedAt: v.optional(v.number()),
    extractedContacts: v.optional(v.number()),
    extractedTasks: v.optional(v.number()),
    extractedDates: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"])
    .index("by_date", ["companyId", "date"]),

  inboundEmailAddresses: defineTable({
    companyId: v.string(),
    localPart: v.string(),
    domain: v.string(),
    fullAddress: v.string(),
    label: v.optional(v.string()),
    routeType: v.string(),
    projectId: v.optional(v.string()),
    projectName: v.optional(v.string()),
    status: v.optional(v.string()),
    provider: v.optional(v.string()),
    gmailVerificationStatus: v.optional(v.string()),
    gmailVerificationCode: v.optional(v.string()),
    gmailVerificationSubject: v.optional(v.string()),
    gmailVerificationReceivedAt: v.optional(v.number()),
    lastReceivedAt: v.optional(v.number()),
    lastSender: v.optional(v.string()),
    lastSubject: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_full_address", ["fullAddress"])
    .index("by_project", ["companyId", "projectId"]),

  crew: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    trade: v.optional(v.string()),
    task: v.optional(v.string()),
    phaseCode: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"]),

  changeOrders: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    number: v.optional(v.number()),
    title: v.string(),
    description: v.optional(v.string()),
    reason: v.optional(v.string()),
    requestedBy: v.optional(v.string()),
    requestedDate: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.string(),
    priority: v.optional(v.string()),
    // Cost
    costType: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    approvedCost: v.optional(v.number()),
    // Schedule
    scheduleDaysImpact: v.optional(v.number()),
    // Scope
    scopeDescription: v.optional(v.string()),
    affectedTrades: v.optional(v.array(v.string())),
    affectedArea: v.optional(v.string()),
    // Approval
    approvedBy: v.optional(v.string()),
    approvedDate: v.optional(v.string()),
    rejectedReason: v.optional(v.string()),
    // Crew
    notifyCrewIds: v.optional(v.array(v.string())),
    // Attachments / notes
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_status", ["projectId", "status"]),

  budget: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    originalContract: v.optional(v.number()),
    currentContract: v.optional(v.number()),
    totalCommitted: v.optional(v.number()),
    totalActual: v.optional(v.number()),
    contingency: v.optional(v.number()),
    updatedAt: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  voiceCommands: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    userId: v.string(),
    transcript: v.string(),
    action: v.string(),
    response: v.string(),
    timestamp: v.number(),
  }).index("by_project", ["projectId"]),

  delayPredictions: defineTable({
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    generatedAt: v.number(),
    overallRisk: v.string(),
    predictedDelayDays: v.number(),
    confidence: v.number(),
    predictions: v.any(),
    recommendations: v.any(),
    rawAnalysis: v.string(),
  }).index("by_project", ["projectId"]),

  bidDocuments: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(), // "bid_proposal" | "bid_breakdown" | "contract"
    fileName: v.string(),
    fileId: v.id("_storage"),
    uploadedAt: v.number(),
    status: v.string(), // "uploaded" | "processing" | "extracted" | "failed"
    extractedData: v.optional(v.any()), // AI-extracted JSON
  }).index("by_project", ["projectId"]),

  bidLineItems: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    documentId: v.id("bidDocuments"),
    costCode: v.optional(v.string()),
    description: v.string(),
    category: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    bidAmount: v.number(),
    committed: v.optional(v.number()),
    actual: v.optional(v.number()),
    variance: v.optional(v.number()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()), // "bid_proposal" | "bid_breakdown" | "contract"
  }).index("by_project", ["projectId"]),

  budgetLineItems: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    costCode: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    budgeted: v.number(),
    committed: v.optional(v.number()),
    actual: v.optional(v.number()),
    variance: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  subcontractors: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    trade: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    license: v.optional(v.string()),
    licenseExpiry: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    rating: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    projectIds: v.optional(v.array(v.string())),
  }).index("by_company", ["companyId"]),

  rfis: defineTable({
    companyId: v.optional(v.any()),
    projectId: v.id("projects"),
    number: v.optional(v.any()),
    subject: v.optional(v.string()),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    requestedBy: v.optional(v.string()),
    dateSubmitted: v.optional(v.string()),
    dateRequired: v.optional(v.string()),
    dateAnswered: v.optional(v.string()),
    costImpact: v.optional(v.any()),
    scheduleImpact: v.optional(v.any()),
    notes: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceItemId: v.optional(v.string()),
    sourceDocumentId: v.optional(v.string()),
    sourceSpecSection: v.optional(v.string()),
    sourcePage: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
    sourceCategory: v.optional(v.string()),
    lastReminderSentAt: v.optional(v.number()),
    reminderCount: v.optional(v.number()),
    lastReminderChannel: v.optional(v.string()),
    lastReminderStatus: v.optional(v.string()),
    lastReminderMessageId: v.optional(v.string()),
    lastReminderError: v.optional(v.string()),
    // Legacy fields
    sent: v.optional(v.string()),
    dateSent: v.optional(v.string()),
    responseRequired: v.optional(v.string()),
    ballInCourt: v.optional(v.string()),
    impactType: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  submittals: defineTable({
    companyId: v.optional(v.any()),
    projectId: v.id("projects"),
    number: v.optional(v.any()),
    title: v.optional(v.string()),
    specSection: v.optional(v.string()),
    description: v.optional(v.string()),
    submittedBy: v.optional(v.string()),
    submittedDate: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    reviewer: v.optional(v.string()),
    reviewDate: v.optional(v.string()),
    reviewAction: v.optional(v.string()),
    reviewComments: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    trade: v.optional(v.string()),
    notes: v.optional(v.string()),
    responsibleCompany: v.optional(v.string()),
    responsibleContact: v.optional(v.string()),
    responsibleEmail: v.optional(v.string()),
    responsiblePhone: v.optional(v.string()),
    responsibleSubcontractorId: v.optional(v.string()),
    requestStatus: v.optional(v.string()),
    requestedAt: v.optional(v.number()),
    requestedBy: v.optional(v.string()),
    procurementStatus: v.optional(v.string()),
    receivedAt: v.optional(v.number()),
    escalatedAt: v.optional(v.number()),
    escalationReason: v.optional(v.string()),
    lastReminderSentAt: v.optional(v.number()),
    reminderCount: v.optional(v.number()),
    lastReminderChannel: v.optional(v.string()),
    lastReminderStatus: v.optional(v.string()),
    lastReminderMessageId: v.optional(v.string()),
    lastReminderError: v.optional(v.string()),
    itemNumber: v.optional(v.string()),
    sourceDocumentId: v.optional(v.id("documents")),
    sourceDocumentName: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceItemId: v.optional(v.string()),
    sourceSpecSection: v.optional(v.string()),
    sourcePage: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
    sourceCategory: v.optional(v.string()),
    uploadDocumentId: v.optional(v.id("documents")),
    uploadDocumentName: v.optional(v.string()),
    uploadDate: v.optional(v.string()),
    adminDecisionBy: v.optional(v.string()),
    adminDecisionDate: v.optional(v.string()),
    // Legacy fields
    spec: v.optional(v.string()),
    dateSubmitted: v.optional(v.string()),
    dateRequired: v.optional(v.string()),
    ballInCourt: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  timeEntries: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    crewMemberId: v.optional(v.string()),
    crewMemberName: v.string(),
    trade: v.optional(v.string()),
    date: v.string(),
    hoursRegular: v.number(),
    hoursOvertime: v.optional(v.number()),
    hoursDouble: v.optional(v.number()),
    rateRegular: v.optional(v.number()),
    rateOvertime: v.optional(v.number()),
    costCode: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    // Clock in/out fields
    clockInTime: v.optional(v.number()),
    clockOutTime: v.optional(v.number()),
    clockedOut: v.optional(v.boolean()),
    clockedInBy: v.optional(v.string()),
    totalHours: v.optional(v.number()),
    totalCost: v.optional(v.number()),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"])
    .index("by_date", ["projectId", "date"]),

  documents: defineTable({
    companyId: v.id("companies"),
    projectId: v.optional(v.id("projects")),
    name: v.string(),
    category: v.string(),
    url: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.optional(v.string()),
    version: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    aiExtract: v.optional(v.string()),
    aiStatus: v.optional(v.string()),
    // Legacy fields
    description: v.optional(v.string()),
    fileName: v.optional(v.string()),
    storageId: v.optional(v.any()),
    status: v.optional(v.string()),
    createdAt: v.optional(v.any()),
    updatedAt: v.optional(v.any()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"]),

  specIntakeRuns: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    sourceDocumentId: v.id("documents"),
    sourceDocumentName: v.string(),
    status: v.string(),
    summary: v.optional(v.string()),
    model: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    committedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    stats: v.optional(v.any()),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"]),

  specIntelligenceItems: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    runId: v.id("specIntakeRuns"),
    category: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.string(),
    confidence: v.optional(v.number()),
    specSection: v.optional(v.string()),
    sourcePage: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    sourceDocumentId: v.id("documents"),
    destinationModules: v.optional(v.array(v.string())),
    suggestedRecord: v.optional(v.any()),
    relationships: v.optional(v.any()),
    createdRecordType: v.optional(v.string()),
    createdRecordId: v.optional(v.string()),
    resolutionStatus: v.optional(v.string()),
    resolvedByRfiId: v.optional(v.string()),
    resolvedAnswer: v.optional(v.string()),
    resolvedByRecordType: v.optional(v.string()),
    resolvedByRecordId: v.optional(v.string()),
    resolvedNote: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
    closedLoopSyncedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_run", ["runId"])
    .index("by_status", ["projectId", "status"]),

  autopilot: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    enabled: v.boolean(),
    // What AI controls
    managesCrew: v.optional(v.boolean()),
    managesSupplies: v.optional(v.boolean()),
    managesSchedule: v.optional(v.boolean()),
    monitorsWeather: v.optional(v.boolean()),
    monitorsSafety: v.optional(v.boolean()),
    autoSendEmails: v.optional(v.boolean()),
    generatesDailyLogs: v.optional(v.boolean()),
    // AI context
    projectGoals: v.optional(v.string()),
    constraints: v.optional(v.string()),
    budget: v.optional(v.number()),
    deadline: v.optional(v.string()),
    // Scope & Schedule
    scopeOfWork: v.optional(v.string()),
    phases: v.optional(v.string()),
    currentPhase: v.optional(v.string()),
    milestones: v.optional(v.string()),
    // State
    lastRunAt: v.optional(v.string()),
    lastRunSummary: v.optional(v.string()),
    totalActions: v.optional(v.number()),
    enabledAt: v.optional(v.string()),
    enabledBy: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"]),

  autopilotLog: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(),
    category: v.string(),
    title: v.string(),
    description: v.string(),
    actionTaken: v.optional(v.string()),
    status: v.string(),
    confidence: v.optional(v.number()),
    requiresApproval: v.optional(v.boolean()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    rejectedBy: v.optional(v.string()),
    rejectedReason: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"])
    .index("by_status", ["projectId", "status"]),

  weatherAlerts: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    date: v.string(),
    alertType: v.string(),
    severity: v.string(),
    message: v.string(),
    recommendation: v.string(),
    affectedWork: v.optional(v.array(v.string())),
    crewNotified: v.optional(v.boolean()),
    notifiedAt: v.optional(v.string()),
    dismissed: v.optional(v.boolean()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_date", ["companyId", "date"]),

  incidents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    number: v.optional(v.number()),
    // Incident details
    title: v.string(),
    type: v.string(),
    severity: v.string(),
    status: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.string(),
    // People involved
    injuredPerson: v.optional(v.string()),
    injuredPersonRole: v.optional(v.string()),
    injuredPersonCompany: v.optional(v.string()),
    injuryType: v.optional(v.string()),
    bodyPart: v.optional(v.string()),
    treatmentGiven: v.optional(v.string()),
    hospitalTransport: v.optional(v.boolean()),
    // Witnesses
    witnesses: v.optional(v.array(v.object({
      name: v.string(),
      company: v.optional(v.string()),
      statement: v.optional(v.string()),
    }))),
    // Root cause
    rootCause: v.optional(v.string()),
    contributingFactors: v.optional(v.array(v.string())),
    // Risk assessment
    riskLevel: v.optional(v.string()),
    likelihoodOfRecurrence: v.optional(v.string()),
    potentialConsequence: v.optional(v.string()),
    // Response path
    immediateActions: v.optional(v.array(v.object({
      action: v.string(),
      assignedTo: v.optional(v.string()),
      status: v.string(),
      completedDate: v.optional(v.string()),
    }))),
    correctiveActions: v.optional(v.array(v.object({
      action: v.string(),
      assignedTo: v.optional(v.string()),
      dueDate: v.optional(v.string()),
      status: v.string(),
      completedDate: v.optional(v.string()),
    }))),
    preventiveActions: v.optional(v.array(v.object({
      action: v.string(),
      assignedTo: v.optional(v.string()),
      dueDate: v.optional(v.string()),
      status: v.string(),
    }))),
    // OSHA
    oshaReportable: v.optional(v.boolean()),
    oshaRecordNumber: v.optional(v.string()),
    daysAwayFromWork: v.optional(v.number()),
    restrictedDutyDays: v.optional(v.number()),
    // Notifications
    notifiedParties: v.optional(v.array(v.string())),
    // Meta
    reportedBy: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedDate: v.optional(v.string()),
    closedBy: v.optional(v.string()),
    closedDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_severity", ["companyId", "severity"])
    .index("by_status", ["companyId", "status"]),

  incidentComments: defineTable({
    incidentId: v.id("incidents"),
    author: v.string(),
    text: v.string(),
    type: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_incident", ["incidentId"]),

  siteMedia: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(),
    fileName: v.string(),
    url: v.string(),
    thumbnailUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    // Metadata
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    capturedDate: v.optional(v.string()),
    capturedBy: v.optional(v.string()),
    // Drone specific
    altitude: v.optional(v.string()),
    gpsCoords: v.optional(v.string()),
    // Linked items
    linkedPunchId: v.optional(v.string()),
    linkedChangeOrderId: v.optional(v.string()),
    linkedDailyLogId: v.optional(v.string()),
    // Status
    status: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_category", ["projectId", "category"])
    .index("by_type", ["projectId", "type"]),

  changeOrderComments: defineTable({
    changeOrderId: v.id("changeOrders"),
    author: v.string(),
    text: v.string(),
    type: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_co", ["changeOrderId"]),

  punchList: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    number: v.optional(v.number()),
    title: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    trade: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedCompany: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.string(),
    dueDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_status", ["projectId", "status"]),

  dailyLogs: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    date: v.string(),
    createdBy: v.optional(v.string()),
    // Weather
    weatherCondition: v.optional(v.string()),
    tempHigh: v.optional(v.number()),
    tempLow: v.optional(v.number()),
    wind: v.optional(v.string()),
    precipitation: v.optional(v.string()),
    // Manpower
    manpower: v.optional(v.array(v.object({
      trade: v.string(),
      company: v.optional(v.string()),
      headcount: v.number(),
      hours: v.optional(v.number()),
    }))),
    totalManpower: v.optional(v.number()),
    // Equipment on site
    equipmentOnSite: v.optional(v.array(v.object({
      name: v.string(),
      status: v.optional(v.string()),
      hours: v.optional(v.number()),
    }))),
    // Work performed
    workPerformed: v.optional(v.string()),
    // Delays
    delays: v.optional(v.array(v.object({
      description: v.string(),
      cause: v.optional(v.string()),
      hoursLost: v.optional(v.number()),
    }))),
    // Visitors
    visitors: v.optional(v.array(v.object({
      name: v.string(),
      company: v.optional(v.string()),
      purpose: v.optional(v.string()),
    }))),
    // Safety
    safetyIncidents: v.optional(v.string()),
    toolboxTalk: v.optional(v.string()),
    // Notes
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_date", ["companyId", "date"]),

  contractAnalysis: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    rawText: v.optional(v.string()),
    summary: v.optional(v.string()),
    insuranceRequirements: v.optional(v.array(v.object({
      requirement: v.string(),
      limit: v.optional(v.string()),
    }))),
    criticalDates: v.optional(v.array(v.object({
      date: v.string(),
      description: v.string(),
    }))),
    schedulingMilestones: v.optional(v.array(v.object({
      milestone: v.string(),
      date: v.optional(v.string()),
    }))),
    risks: v.optional(v.array(v.object({
      risk: v.string(),
      severity: v.optional(v.string()),
    }))),
    status: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"]),

  notificationProfiles: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    email: v.string(),
    type: v.string(), // "full_dashboard" | "job_updates" | "crew_schedule" | "custom"
    projectIds: v.optional(v.array(v.string())), // specific projects (empty = all)
    includeCalendar: v.optional(v.boolean()),
    includeTodayPanel: v.optional(v.boolean()),
    includeCrewSchedule: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
  }).index("by_company", ["companyId"]),

  insuranceRequirements: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    extractedText: v.optional(v.string()),
    requirements: v.optional(v.array(v.object({
      category: v.string(),
      description: v.string(),
      limit: v.optional(v.string()),
      status: v.optional(v.string()),
    }))),
    status: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"]),

  teamMembers: defineTable({
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    email: v.string(),
    name: v.string(),
    role: v.string(), // owner, admin, pm, field
    status: v.string(), // active, invited, disabled
    assignedProjects: v.optional(v.array(v.string())),
    inviteToken: v.optional(v.string()),
    invitedBy: v.optional(v.string()),
    invitedAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    permissions: v.optional(v.object({
      // per-module overrides: "full" | "write" | "read" | "none"
      budget: v.optional(v.string()),
      bidTracker: v.optional(v.string()),
      crew: v.optional(v.string()),
      dailyLogs: v.optional(v.string()),
      timeTracking: v.optional(v.string()),
      punchList: v.optional(v.string()),
      safety: v.optional(v.string()),
      siteMedia: v.optional(v.string()),
      changeOrders: v.optional(v.string()),
      rfis: v.optional(v.string()),
      submittals: v.optional(v.string()),
      correspondence: v.optional(v.string()),
      documents: v.optional(v.string()),
      aiTools: v.optional(v.string()),
      reports: v.optional(v.string()),
    })),
  }).index("by_company", ["companyId"])
    .index("by_email", ["companyId", "email"])
    .index("by_user", ["userId"])
    .index("by_invite", ["inviteToken"]),

  activityLog: defineTable({
    companyId: v.id("companies"),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    action: v.string(),
    module: v.string(),
    projectId: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"])
    .index("by_user", ["companyId", "userId"]),

  // ========================================
  // ESTIMATING MODULE (OpsSlate Suite)
  // ========================================

  costItems: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    category: v.string(), // Labor, Equipment, Materials, Subcontractor
    unit: v.optional(v.string()),
    unitCost: v.number(),
    description: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_category", ["companyId", "category"]),

  estimates: defineTable({
    companyId: v.id("companies"),
    projectId: v.optional(v.id("projects")), // Link to OpsSlate project when won
    name: v.string(),
    client: v.optional(v.string()),
    location: v.optional(v.string()),
    bidDate: v.optional(v.string()),
    status: v.string(), // draft, submitted, won, lost
    bidType: v.optional(v.string()), // dot, building
    description: v.optional(v.string()),
    overhead: v.optional(v.number()),
    profit: v.optional(v.number()),
    bond: v.optional(v.number()),
    tax: v.optional(v.number()),
    notes: v.optional(v.string()),
    // DOT fields
    projectNumber: v.optional(v.string()),
    federalAid: v.optional(v.string()),
    dbeGoal: v.optional(v.number()),
    contractDays: v.optional(v.number()),
    liquidatedDamages: v.optional(v.number()),
    preBidMeeting: v.optional(v.string()),
    prevailingWage: v.optional(v.string()),
    bidBondRequired: v.optional(v.string()),
    // Building fields
    bidMethod: v.optional(v.string()),
    buildingType: v.optional(v.string()),
    squareFootage: v.optional(v.number()),
    floors: v.optional(v.number()),
    architect: v.optional(v.string()),
    addendaCount: v.optional(v.number()),
    alternates: v.optional(v.string()),
    trusses: v.optional(v.number()),
    ends: v.optional(v.number()),
  }).index("by_company", ["companyId"])
    .index("by_status", ["companyId", "status"])
    .index("by_project", ["projectId"]),

  estimateItems: defineTable({
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    section: v.optional(v.string()),
    description: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    unitCost: v.optional(v.number()),
    taxPct: v.optional(v.number()),
    costItemId: v.optional(v.id("costItems")),
    costCode: v.optional(v.string()),
    assemblyId: v.optional(v.string()),
    assemblyName: v.optional(v.string()),
    duplicateFingerprint: v.optional(v.string()),
    notes: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceRequirementId: v.optional(v.string()),
    sourcePaymentRuleId: v.optional(v.string()),
    sourceSpecSection: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    suggestionConfidence: v.optional(v.number()),
  }).index("by_estimate", ["estimateId"])
    .index("by_company", ["companyId"]),

  estimateSpecBooks: defineTable({
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    clientBookId: v.optional(v.string()),
    name: v.string(),
    fileName: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    status: v.optional(v.string()),
    sections: v.optional(v.any()),
    storageNote: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_estimate", ["estimateId"])
    .index("by_company", ["companyId"]),

  estimateRequirements: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    estimateId: v.optional(v.id("estimates")),
    title: v.string(),
    requirementType: v.optional(v.string()),
    description: v.optional(v.string()),
    allowance: v.optional(v.string()),
    alternate: v.optional(v.string()),
    exclusion: v.optional(v.string()),
    wageRule: v.optional(v.string()),
    bondRule: v.optional(v.string()),
    taxRule: v.optional(v.string()),
    dbeRule: v.optional(v.string()),
    liquidatedDamagesRule: v.optional(v.string()),
    scopeAssumption: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceItemId: v.optional(v.string()),
    sourceDocumentId: v.optional(v.string()),
    sourceSpecSection: v.optional(v.string()),
    sourcePage: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
    sourceCategory: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_estimate", ["estimateId"])
    .index("by_company", ["companyId"]),

  estimateCrews: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    items: v.optional(v.any()), // [{name, quantity, unitCost}]
  }).index("by_company", ["companyId"]),

  estimateAssemblies: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    items: v.optional(v.any()), // [{name, quantity, unit, unitCost}]
  }).index("by_company", ["companyId"]),

  estimateRfqs: defineTable({
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    vendorName: v.string(),
    amount: v.optional(v.number()),
    status: v.optional(v.string()), // draft, sent, received, accepted, rejected
    dueDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_estimate", ["estimateId"])
    .index("by_company", ["companyId"]),

  engineerEstimates: defineTable({
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    itemCode: v.optional(v.string()),
    description: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    unitCost: v.optional(v.number()),
  }).index("by_estimate", ["estimateId"])
    .index("by_company", ["companyId"]),

  udigTickets: defineTable({
    companyId: v.string(),
    projectId: v.optional(v.string()),
    dateCalled: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    ticketNumber: v.string(),
    emailCopy: v.optional(v.string()),
    completionDate: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"]),

  // ===== BUYOUT / PROCUREMENT =====
  buyoutItems: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    category: v.string(), // Concrete, Steel, Pipe, Electrical, Equipment Rental, Misc
    description: v.string(),
    budgetAmount: v.number(), // from estimate
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    // Vendor/Sub awards
    awardedVendor: v.optional(v.string()),
    awardedAmount: v.optional(v.number()),
    awardedDate: v.optional(v.string()),
    poNumber: v.optional(v.string()),
    // Tracking
    status: v.string(), // open, quoted, awarded, ordered, delivered, complete, cancelled
    quotesReceived: v.optional(v.number()),
    leadTime: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    // Savings
    savings: v.optional(v.number()), // budget - awarded
    savingsPercent: v.optional(v.number()),
    // Notes & docs
    notes: v.optional(v.string()),
    scope: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"]),

  buyoutQuotes: defineTable({
    companyId: v.id("companies"),
    buyoutItemId: v.id("buyoutItems"),
    vendorName: v.string(),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    amount: v.number(),
    unitPrice: v.optional(v.number()),
    leadTime: v.optional(v.string()),
    notes: v.optional(v.string()),
    quoteDate: v.optional(v.string()),
    expiresDate: v.optional(v.string()),
    status: v.string(), // pending, selected, rejected, expired
    createdAt: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_item", ["buyoutItemId"]),

  // Decision Intelligence
  decisionLog: defineTable({
    companyId: v.string(),
    type: v.string(),
    description: v.string(),
    action: v.string(),
    project: v.string(),
    confidence: v.number(),
    outcome: v.string(),
    date: v.string(),
    wasOverridden: v.boolean(),
    overrideReason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Client Portal
  clientPortalLinks: defineTable({
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    token: v.string(),
    clientName: v.string(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"])
    .index("by_token", ["token"]),

  // AI Project Manager System
  aiProjectManagers: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    name: v.string(),
    avatar: v.string(), // emoji avatar
    personality: v.string(), // "direct" | "detailed" | "friendly"
    voice: v.optional(v.string()),
    status: v.string(), // "active" | "paused"
    permissions: v.optional(v.object({
      contacts: v.optional(v.string()),       // "none" | "read" | "readwrite"
      tasks: v.optional(v.string()),          // "none" | "read" | "readwrite"
      emails: v.optional(v.string()),         // "none" | "read" | "readwrite"
      documents: v.optional(v.string()),      // "none" | "read" | "readwrite"
      budget: v.optional(v.string()),         // "none" | "read" | "readwrite"
      schedule: v.optional(v.string()),       // "none" | "read" | "readwrite"
      changeOrders: v.optional(v.string()),   // "none" | "read" | "readwrite"
      rfis: v.optional(v.string()),           // "none" | "read" | "readwrite"
      submittals: v.optional(v.string()),     // "none" | "read" | "readwrite"
      deliveries: v.optional(v.string()),     // "none" | "read" | "readwrite"
      crew: v.optional(v.string()),           // "none" | "read" | "readwrite"
      punchList: v.optional(v.string()),      // "none" | "read" | "readwrite"
    })),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"]),

  aiPmMessages: defineTable({
    pmId: v.id("aiProjectManagers"),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    role: v.string(), // "user" | "pm"
    message: v.string(),
    createdAt: v.number(),
  }).index("by_pm", ["pmId"])
    .index("by_project", ["projectId"]),

  aiPmTasks: defineTable({
    pmId: v.id("aiProjectManagers"),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    description: v.string(),
    type: v.string(), // "email_draft" | "follow_up" | "report" | "analysis" | "general"
    status: v.string(), // "pending" | "in_progress" | "waiting_approval" | "done" | "failed"
    result: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_pm", ["pmId"])
    .index("by_project", ["projectId"])
    .index("by_company", ["companyId"]),

  aiWarRoom: defineTable({
    companyId: v.id("companies"),
    fromPmId: v.id("aiProjectManagers"),
    fromPmName: v.string(),
    fromProject: v.string(),
    message: v.string(),
    type: v.string(), // "coordination" | "conflict" | "resource" | "update"
    resolved: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),
});
