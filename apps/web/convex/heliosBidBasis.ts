import {
  HELIOS_BID_BASIS_AVAILABILITY_STATES,
  HELIOS_BID_BASIS_CATEGORIES,
  HELIOS_BID_BASIS_PROFILES,
  deriveHeliosBidBasis,
  normalizeBidBasisReviewInput,
  type HeliosBidBasisAvailabilityState,
  type HeliosBidBasisCategory,
  type HeliosBidBasisProfile,
  type HeliosBidBasisProfileType,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  heliosPrincipalValidator,
  requireHeliosPrincipal,
} from "./heliosAuthorization";

type BidBasisContext = QueryCtx | MutationCtx;

function validCategory(value: string): value is HeliosBidBasisCategory {
  return HELIOS_BID_BASIS_CATEGORIES.includes(value as HeliosBidBasisCategory);
}

function validState(value: string): value is HeliosBidBasisAvailabilityState {
  return HELIOS_BID_BASIS_AVAILABILITY_STATES.includes(
    value as HeliosBidBasisAvailabilityState,
  );
}

function validProfile(value?: string): value is HeliosBidBasisProfileType {
  return Boolean(value) && HELIOS_BID_BASIS_PROFILES.includes(
    value as HeliosBidBasisProfileType,
  );
}

export async function deriveProjectBidBasis(
  ctx: BidBasisContext,
  project: Doc<"heliosProjects">,
  bidPackage: Doc<"heliosBidPackages">,
): Promise<HeliosBidBasisProfile> {
  const [entries, allDocuments, writtenScopes, storedProfile, classifications, projectIntelligence] =
    await Promise.all([
      ctx.db
        .query("heliosPackageEntries")
        .withIndex("by_package", (query) =>
          query.eq("packageId", bidPackage._id),
        )
        .collect(),
      ctx.db
        .query("heliosDocuments")
        .withIndex("by_project", (query) =>
          query.eq("projectId", project._id),
        )
        .collect(),
      ctx.db
        .query("heliosWrittenScopes")
        .withIndex("by_package", (query) =>
          query.eq("packageId", bidPackage._id),
        )
        .collect(),
      ctx.db
        .query("heliosBidBasisProfiles")
        .withIndex("by_package", (query) =>
          query.eq("packageId", bidPackage._id),
        )
        .first(),
      ctx.db
        .query("heliosDocumentClassifications")
        .withIndex("by_project", (query) =>
          query.eq("projectId", project._id),
        )
        .collect(),
      ctx.db
        .query("heliosProjectIntelligence")
        .withIndex("by_project", (query) =>
          query.eq("projectId", project._id),
        )
        .order("desc")
        .first(),
    ]);
  const documentIds = new Set(
    entries
      .map((entry) => entry.documentId && String(entry.documentId))
      .filter((id): id is string => Boolean(id)),
  );
  const documents = allDocuments.filter((document) =>
    documentIds.has(String(document._id)),
  );
  const analyses = await Promise.all(
    documents.map((document) =>
      ctx.db
        .query("heliosDocumentIntelligence")
        .withIndex("by_document", (query) =>
          query.eq("documentId", document._id),
        )
        .first(),
    ),
  );
  const evidence = await Promise.all(
    documents.map((document) =>
      ctx.db
        .query("heliosEvidence")
        .withIndex("by_document", (query) =>
          query.eq("documentId", document._id),
        )
        .collect(),
    ),
  );
  const confirmedUser = storedProfile?.confirmedBy
    ? await ctx.db.get(storedProfile.confirmedBy)
    : null;
  const categoryOverrides = (storedProfile?.categoryOverrides || [])
    .filter(
      (override): override is {
        category: HeliosBidBasisCategory;
        state: HeliosBidBasisAvailabilityState;
      } => validCategory(override.category) && validState(override.state),
    );
  const documentOverrides = classifications
    .filter(
      (classification) =>
        classification.packageId === bidPackage._id &&
        documentIds.has(String(classification.documentId)) &&
        validCategory(classification.category),
    )
    .map((classification) => ({
      documentId: String(classification.documentId),
      category: classification.category as HeliosBidBasisCategory,
    }));
  const profile = deriveHeliosBidBasis({
    projectId: String(project._id),
    packageId: String(bidPackage._id),
    packageRevision: bidPackage.revision,
    packageStatus: bidPackage.status,
    documents: documents.map((document, index) => ({
      id: String(document._id),
      fileName: document.fileName,
      relativePath: document.relativePath,
      status: document.status,
      documentType: analyses[index]?.documentType,
      findingCategories: analyses[index]?.findings.map(
        (finding) => finding.category,
      ),
      findingText: analyses[index]?.findings
        .map((finding) => `${finding.title} ${finding.detail}`)
        .join(" "),
      indexedPageNumbers: evidence[index]
        .map((row) => row.pageNumber)
        .filter((page): page is number => page !== undefined),
    })),
    entries: entries.map((entry) => ({
      documentId: entry.documentId ? String(entry.documentId) : undefined,
      sourceCategory: entry.sourceCategory,
      relativePath: entry.relativePath,
      status: entry.status,
    })),
    writtenScopeCount: writtenScopes.length,
    projectFindingText:
      projectIntelligence &&
      projectIntelligence.isCurrent !== false &&
      projectIntelligence.packageId === bidPackage._id
        ? projectIntelligence.findings
            .map((finding) => `${finding.title} ${finding.detail}`)
            .join(" ")
        : undefined,
    categoryOverrides,
    documentOverrides,
    profileOverride: validProfile(storedProfile?.profileOverride)
      ? storedProfile.profileOverride
      : undefined,
    classificationStatus: storedProfile?.classificationStatus,
    proceededAt: storedProfile?.proceededAt,
    confirmedAt: storedProfile?.confirmedAt,
    confirmedBy: confirmedUser?.name,
    now: storedProfile?.updatedAt || Date.now(),
  });
  return {
    ...profile,
    id: storedProfile ? String(storedProfile._id) : undefined,
  };
}

export async function ensureBidBasisProfile(
  ctx: MutationCtx,
  project: Doc<"heliosProjects">,
  bidPackage: Doc<"heliosBidPackages">,
) {
  const existing = await ctx.db
    .query("heliosBidBasisProfiles")
    .withIndex("by_package", (query) =>
      query.eq("packageId", bidPackage._id),
    )
    .first();
  if (existing) {
    const refreshed = await deriveProjectBidBasis(ctx, project, bidPackage);
    const now = Date.now();
    await ctx.db.patch(existing._id, {
      profile: validProfile(existing.profileOverride)
        ? existing.profileOverride
        : refreshed.profile,
      sourceFingerprint: refreshed.sourceFingerprint,
      updatedAt: now,
    });
    const updated = await ctx.db.get(existing._id);
    if (!updated) throw new Error("Bid-basis profile could not be refreshed.");
    return updated;
  }
  const inferred = await deriveProjectBidBasis(ctx, project, bidPackage);
  const now = Date.now();
  const id = await ctx.db.insert("heliosBidBasisProfiles", {
    companyId: project.companyId,
    projectId: project._id,
    packageId: bidPackage._id,
    packageRevision: bidPackage.revision,
    profile: inferred.profile,
    classificationStatus: "inferred",
    categoryOverrides: [],
    sourceFingerprint: inferred.sourceFingerprint,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Bid-basis profile could not be created.");
  return created;
}

export const reviewBidBasis = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args): Promise<HeliosBidBasisProfile> => {
    const { user, companyId } = await requireHeliosPrincipal(
      ctx,
      args.principal,
    );
    const projectId = ctx.db.normalizeId("heliosProjects", args.projectId);
    if (!projectId) throw new Error("Project not found.");
    const project = await ctx.db.get(projectId);
    if (!project || project.companyId !== companyId) {
      throw new Error("Project not found.");
    }
    if (!project.activePackageId) {
      throw new Error("Finalize a bid package before reviewing the bid basis.");
    }
    const bidPackage = await ctx.db.get(project.activePackageId);
    if (!bidPackage || bidPackage.projectId !== project._id) {
      throw new Error("Active bid package not found.");
    }
    const input = normalizeBidBasisReviewInput(args.input);
    const profile = await ensureBidBasisProfile(ctx, project, bidPackage);
    const before = await deriveProjectBidBasis(ctx, project, bidPackage);
    const now = Date.now();
    let previousValue: string | undefined;
    let decisionValue: string = input.action;

    if (input.action === "proceed") {
      if (before.workspaceState === "no_usable_scope_basis") {
        throw new Error("A usable scope basis is required before the estimate can proceed.");
      }
      previousValue = profile.proceededAt ? String(profile.proceededAt) : undefined;
      decisionValue = before.workspaceState;
      await ctx.db.patch(profile._id, {
        profile: before.profile,
        classificationStatus:
          profile.classificationStatus === "corrected" ? "corrected" : "confirmed",
        sourceFingerprint: before.sourceFingerprint,
        proceededAt: now,
        confirmedAt: profile.confirmedAt || now,
        confirmedBy: user._id,
        updatedAt: now,
      });
    } else if (input.action === "confirm_profile") {
      previousValue = profile.classificationStatus;
      decisionValue = before.profile;
      await ctx.db.patch(profile._id, {
        profile: before.profile,
        classificationStatus: "confirmed",
        sourceFingerprint: before.sourceFingerprint,
        confirmedAt: now,
        confirmedBy: user._id,
        updatedAt: now,
      });
    } else if (input.action === "correct_profile") {
      previousValue = before.profile;
      decisionValue = input.profile!;
      await ctx.db.patch(profile._id, {
        profile: input.profile!,
        profileOverride: input.profile!,
        classificationStatus: "corrected",
        confirmedAt: now,
        confirmedBy: user._id,
        updatedAt: now,
      });
    } else if (input.action === "set_category_state") {
      const existing = profile.categoryOverrides.find(
        (override) => override.category === input.category,
      );
      previousValue = existing?.state || before.categories.find(
        (category) => category.category === input.category,
      )?.state;
      decisionValue = input.state!;
      const nextOverrides = [
        ...profile.categoryOverrides.filter(
          (override) => override.category !== input.category,
        ),
        { category: input.category!, state: input.state! },
      ];
      await ctx.db.patch(profile._id, {
        categoryOverrides: nextOverrides,
        classificationStatus: "corrected",
        confirmedAt: now,
        confirmedBy: user._id,
        updatedAt: now,
      });
    } else if (input.action === "classify_document") {
      const documentId = ctx.db.normalizeId("heliosDocuments", input.documentId!);
      if (!documentId) throw new Error("Document not found.");
      const document = await ctx.db.get(documentId);
      const packageEntries = await ctx.db
        .query("heliosPackageEntries")
        .withIndex("by_package", (query) => query.eq("packageId", bidPackage._id))
        .collect();
      if (
        !document ||
        document.companyId !== companyId ||
        document.projectId !== project._id ||
        !packageEntries.some((entry) => entry.documentId === document._id)
      ) {
        throw new Error("Document not found.");
      }
      const existing = await ctx.db
        .query("heliosDocumentClassifications")
        .withIndex("by_package_document", (query) =>
          query.eq("packageId", bidPackage._id).eq("documentId", document._id),
        )
        .first();
      previousValue = before.categories.find((category) =>
        category.documentIds.includes(String(document._id)),
      )?.category;
      decisionValue = input.category!;
      if (existing) {
        await ctx.db.patch(existing._id, {
          category: input.category!,
          reason: input.reason!,
          classifiedBy: user._id,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("heliosDocumentClassifications", {
          companyId,
          projectId: project._id,
          packageId: bidPackage._id,
          documentId: document._id,
          category: input.category!,
          reason: input.reason!,
          classifiedBy: user._id,
          createdAt: now,
          updatedAt: now,
        });
      }
      await ctx.db.patch(profile._id, {
        classificationStatus: "corrected",
        confirmedAt: now,
        confirmedBy: user._id,
        updatedAt: now,
      });
    }

    await ctx.db.insert("heliosBidBasisEvents", {
      companyId,
      projectId: project._id,
      packageId: bidPackage._id,
      profileId: profile._id,
      action: input.action,
      category: input.category,
      documentId:
        input.documentId && ctx.db.normalizeId("heliosDocuments", input.documentId)
          ? ctx.db.normalizeId("heliosDocuments", input.documentId)!
          : undefined,
      previousValue,
      decisionValue,
      reason: input.reason,
      reviewerUserId: user._id,
      reviewerName: user.name,
      createdAt: now,
    });
    const refreshed = await deriveProjectBidBasis(ctx, project, bidPackage);
    await ctx.db.patch(profile._id, {
      profile: refreshed.profile,
      sourceFingerprint: refreshed.sourceFingerprint,
      updatedAt: now,
    });
    return { ...refreshed, id: String(profile._id), updatedAt: now };
  },
});
