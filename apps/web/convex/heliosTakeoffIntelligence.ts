import {
  calculateQuantityVariance,
  calculateTakeoffMeasurement,
  deriveCivilGeometryQuantity,
  normalizeTakeoffReviewInput,
  type HeliosTakeoffWorkspace,
} from "@opsslate/helios-domain";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { heliosPrincipalValidator, requireHeliosPrincipal } from "./heliosAuthorization";

const PROCESSING_VERSION = 1;

async function ownedProject(ctx: QueryCtx | MutationCtx, companyId: Id<"companies">, value: string) {
  const projectId = ctx.db.normalizeId("heliosProjects", value);
  const project = projectId ? await ctx.db.get(projectId) : null;
  if (!project || project.companyId !== companyId) throw new Error("Project not found.");
  return project;
}

async function currentBasis(ctx: QueryCtx | MutationCtx, companyId: Id<"companies">, projectIdValue: string) {
  const project = await ownedProject(ctx, companyId, projectIdValue);
  if (!project.activePackageId) throw new Error("Finalize a current bid package first.");
  const packageRecord = await ctx.db.get(project.activePackageId);
  if (!packageRecord || packageRecord.companyId !== companyId || packageRecord.projectId !== project._id) {
    throw new Error("Current bid package not found.");
  }
  const planRun = await ctx.db.query("heliosPlanRuns")
    .withIndex("by_package_current", (query) => query.eq("packageId", packageRecord._id).eq("isCurrent", true)).first();
  if (!planRun || planRun.companyId !== companyId || !["ready_for_review", "partially_ready"].includes(planRun.status)) {
    throw new Error("Build and review the current plan model before starting plan takeoff.");
  }
  const estimate = await ctx.db.query("heliosEstimates")
    .withIndex("by_project_version", (query) => query.eq("projectId", project._id)).order("desc").first();
  if (!estimate || estimate.companyId !== companyId || !["ready_for_review", "accepted"].includes(estimate.status)) {
    throw new Error("Build the current estimate before starting plan takeoff.");
  }
  return { project, packageRecord, planRun, estimate };
}

async function ensureRun(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  userId: Id<"users">,
  basis: Awaited<ReturnType<typeof currentBasis>>,
) {
  const existing = await ctx.db.query("heliosTakeoffRuns")
    .withIndex("by_plan_estimate", (query) => query.eq("planRunId", basis.planRun._id).eq("estimateId", basis.estimate._id)).first();
  if (existing && existing.companyId === companyId && existing.isCurrent) return existing;
  const now = Date.now();
  const current = await ctx.db.query("heliosTakeoffRuns")
    .withIndex("by_project_current", (query) => query.eq("projectId", basis.project._id).eq("isCurrent", true)).collect();
  await Promise.all(current.map((row) => ctx.db.patch(row._id, { isCurrent: false, updatedAt: now })));
  const id = await ctx.db.insert("heliosTakeoffRuns", {
    companyId,
    projectId: basis.project._id,
    packageId: basis.packageRecord._id,
    packageRevision: basis.packageRecord.revision,
    planRunId: basis.planRun._id,
    estimateId: basis.estimate._id,
    isCurrent: true,
    status: "ready",
    processingVersion: PROCESSING_VERSION,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Takeoff register could not be created.");
  return created;
}

async function ownedCostCode(ctx: QueryCtx | MutationCtx, companyId: Id<"companies">, estimateId: Id<"heliosEstimates">, value: string) {
  const id = ctx.db.normalizeId("heliosEstimateCostCodes", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.estimateId !== estimateId || record.reviewStatus === "rejected") {
    throw new Error("Estimate cost code not found.");
  }
  return record;
}

async function ownedMeasurement(ctx: QueryCtx | MutationCtx, companyId: Id<"companies">, runId: Id<"heliosTakeoffRuns">, value: string) {
  const id = ctx.db.normalizeId("heliosTakeoffMeasurements", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.runId !== runId) throw new Error("Takeoff measurement not found.");
  return record;
}

async function ownedQuantity(ctx: QueryCtx | MutationCtx, companyId: Id<"companies">, runId: Id<"heliosTakeoffRuns">, value: string) {
  const id = ctx.db.normalizeId("heliosTakeoffQuantities", value);
  const record = id ? await ctx.db.get(id) : null;
  if (!record || record.companyId !== companyId || record.runId !== runId) throw new Error("Takeoff quantity not found.");
  return record;
}

async function rebuildQuantity(ctx: MutationCtx, run: Doc<"heliosTakeoffRuns">, costCode: Doc<"heliosEstimateCostCodes">, unit: string, user: Doc<"users">) {
  const accepted = (await ctx.db.query("heliosTakeoffMeasurements")
    .withIndex("by_cost_code", (query) => query.eq("costCodeId", costCode._id)).collect())
    .filter((row) => row.runId === run._id && row.status === "accepted" && row.outputUnit.toLowerCase() === unit.toLowerCase());
  const prior = (await ctx.db.query("heliosTakeoffQuantities")
    .withIndex("by_cost_code", (query) => query.eq("costCodeId", costCode._id)).collect())
    .filter((row) => row.runId === run._id && row.unit.toLowerCase() === unit.toLowerCase() && row.status === "proposed");
  const now = Date.now();
  await Promise.all(prior.map((row) => ctx.db.patch(row._id, { status: "superseded", updatedAt: now })));
  if (!accepted.length) return null;
  const value = accepted.reduce((sum, row) => sum + row.calculatedValue, 0);
  const payItem = await ctx.db.get(costCode.payItemId);
  const comparable = payItem?.bidUnit.toLowerCase() === unit.toLowerCase();
  const ownerQuantity = comparable ? payItem?.bidQuantity : undefined;
  const variance = calculateQuantityVariance(value, ownerQuantity);
  const id = await ctx.db.insert("heliosTakeoffQuantities", {
    companyId: run.companyId,
    projectId: run.projectId,
    packageId: run.packageId,
    runId: run._id,
    planRunId: run.planRunId,
    estimateId: run.estimateId,
    costCodeId: costCode._id,
    measurementIds: accepted.map((row) => row._id),
    value,
    unit,
    use: "comparative",
    formula: accepted.map((row) => row.formula).join(" + "),
    ownerQuantity,
    ownerUnit: payItem?.bidUnit,
    ...variance,
    status: "proposed",
    createdBy: user._id,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  });
  return await ctx.db.get(id);
}

export const getWorkspace = internalQuery({
  args: { principal: heliosPrincipalValidator, projectId: v.string() },
  handler: async (ctx, args): Promise<HeliosTakeoffWorkspace | null> => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    let basis: Awaited<ReturnType<typeof currentBasis>>;
    try {
      basis = await currentBasis(ctx, companyId, args.projectId);
    } catch {
      return null;
    }
    const run = await ctx.db.query("heliosTakeoffRuns")
      .withIndex("by_plan_estimate", (query) => query.eq("planRunId", basis.planRun._id).eq("estimateId", basis.estimate._id)).first();
    const geometryRun = await ctx.db.query("heliosCivilGeometryRuns")
      .withIndex("by_plan_current", (query) => query.eq("planRunId", basis.planRun._id).eq("isCurrent", true)).first();
    const [sectionRows, payItemRows, costCodeRows, measurements, quantities, pages, calibrations] = await Promise.all([
      ctx.db.query("heliosEstimateSections").withIndex("by_estimate_sequence", (query) => query.eq("estimateId", basis.estimate._id)).collect(),
      ctx.db.query("heliosOwnerPayItems").withIndex("by_estimate", (query) => query.eq("estimateId", basis.estimate._id)).collect(),
      ctx.db.query("heliosEstimateCostCodes").withIndex("by_estimate", (query) => query.eq("estimateId", basis.estimate._id)).collect(),
      run ? ctx.db.query("heliosTakeoffMeasurements").withIndex("by_run_created", (query) => query.eq("runId", run._id)).collect() : Promise.resolve([]),
      run ? ctx.db.query("heliosTakeoffQuantities").withIndex("by_run_created", (query) => query.eq("runId", run._id)).collect() : Promise.resolve([]),
      ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", basis.planRun._id)).collect(),
      ctx.db.query("heliosPlanCalibrations").withIndex("by_run", (query) => query.eq("runId", basis.planRun._id)).collect(),
    ]);
    const geometryRecords = geometryRun
      ? await ctx.db.query("heliosCivilGeometryRecords").withIndex("by_run_created", (query) => query.eq("geometryRunId", geometryRun._id)).collect()
      : [];
    const sections = new Map(sectionRows.map((row) => [row._id, row]));
    const payItems = new Map(payItemRows.map((row) => [row._id, row]));
    const pageMap = new Map(pages.map((row) => [row._id, row]));
    const calibrationMap = new Map(calibrations.map((row) => [row._id, row]));
    const targets = costCodeRows.filter((row) => row.reviewStatus !== "rejected").flatMap((code) => {
      const payItem = payItems.get(code.payItemId);
      const section = payItem ? sections.get(payItem.sectionId) : undefined;
      if (!payItem || !section || payItem.reviewStatus === "rejected" || section.reviewStatus === "rejected") return [];
      return [{
        sectionId: String(section._id), sectionName: section.name,
        payItemId: String(payItem._id), payItemNumber: payItem.officialItemNumber, payItemDescription: payItem.estimatorDescription || payItem.description,
        ownerQuantity: payItem.bidQuantity, ownerUnit: payItem.bidUnit,
        costCodeId: String(code._id), costCode: code.code, costCodeDescription: code.description,
        productionQuantity: code.productionQuantity, productionUnit: code.productionUnit,
      }];
    });
    const status = targets.length ? "ready" as const : "blocked" as const;
    return {
      id: run ? String(run._id) : `pending:${basis.planRun._id}:${basis.estimate._id}`,
      projectId: String(basis.project._id), packageId: String(basis.packageRecord._id), packageRevision: basis.packageRecord.revision,
      planRunId: String(basis.planRun._id), estimateId: String(basis.estimate._id), status,
      blockedReason: targets.length ? undefined : "Accept at least one estimate cost code before recording takeoff measurements.",
      measurementCount: measurements.filter((row) => row.status !== "rejected" && row.status !== "superseded").length,
      acceptedMeasurementCount: measurements.filter((row) => row.status === "accepted").length,
      proposedQuantityCount: quantities.filter((row) => row.status === "proposed").length,
      estimateQuantityCount: quantities.filter((row) => row.status === "sent_to_estimate").length,
      targets,
      measurements: measurements.map((row) => {
        const page = pageMap.get(row.pageId);
        const view = page?.views.find((candidate) => candidate.viewKey === row.viewKey);
        const calibration = row.calibrationId ? calibrationMap.get(row.calibrationId) : undefined;
        return {
          id: String(row._id), runId: String(row.runId), costCodeId: String(row.costCodeId), pageId: String(row.pageId), viewKey: row.viewKey,
          calibrationId: row.calibrationId ? String(row.calibrationId) : undefined,
          geometryRecordIds: row.geometryRecordIds.map(String), sourceBasis: row.sourceBasis,
          measurementType: row.measurementType, label: row.label, geometryKind: row.geometryKind, geometry: row.geometry,
          objectReferences: row.objectReferences, rawValue: row.rawValue, rawUnit: row.rawUnit, outputUnit: row.outputUnit,
          factors: row.factors, includedScope: row.includedScope, excludedScope: row.excludedScope, assumptions: row.assumptions,
          confidence: row.confidence, sheetNumber: page?.sheetNumber || `PDF ${page?.physicalPageNumber || "?"}`,
          viewLabel: view?.label || row.viewKey, calibrationLabel: calibration ? `${calibration.scale} ${calibration.units}`.trim() : undefined,
          calculatedValue: row.calculatedValue, formula: row.formula, status: row.status, createdByName: row.createdByName,
          reviewedByName: row.reviewedByName, reviewedAt: row.reviewedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
        };
      }),
      quantities: quantities.map((row) => ({
        id: String(row._id), runId: String(row.runId), costCodeId: String(row.costCodeId), measurementIds: row.measurementIds.map(String),
        value: row.value, unit: row.unit, use: row.use, formula: row.formula, ownerQuantity: row.ownerQuantity, ownerUnit: row.ownerUnit,
        variancePercent: row.variancePercent, reconciliationStatus: row.reconciliationStatus, status: row.status,
        estimateQuantityId: row.estimateQuantityId ? String(row.estimateQuantityId) : undefined,
        createdByName: row.createdByName, createdAt: row.createdAt, updatedAt: row.updatedAt,
      })),
      geometry: geometryRun ? {
        id: String(geometryRun._id), planRunId: String(geometryRun.planRunId), packageRevision: geometryRun.packageRevision,
        status: geometryRun.status, sourceDocumentCount: geometryRun.sourceDocumentCount, recordCount: geometryRun.recordCount,
        acceptedRecordCount: geometryRun.acceptedRecordCount, unresolvedIssueCount: geometryRun.unresolvedIssueCount,
        records: geometryRecords.map((row) => {
          const page = pageMap.get(row.pageId); const view = page?.views.find((candidate) => candidate.viewKey === row.viewKey);
          return {
            id: String(row._id), geometryRunId: String(row.geometryRunId), pageId: String(row.pageId), viewKey: row.viewKey,
            sheetNumber: page?.sheetNumber || `PDF ${page?.physicalPageNumber || "?"}`, viewLabel: view?.label || row.viewKey,
            geometryType: row.geometryType, authority: row.authority, alignmentName: row.alignmentName, sourceLocator: row.sourceLocator,
            horizontalPoints: row.horizontalPoints, horizontalSegments: row.horizontalSegments, stationEquations: row.stationEquations,
            verticalPoints: row.verticalPoints, crossSectionPoints: row.crossSectionPoints,
            invertPoints: row.invertPoints, materialLayers: row.materialLayers, units: row.units, confidence: row.confidence,
            unresolvedIssues: row.unresolvedIssues, status: row.status, reviewedByName: row.reviewedByName, reviewedAt: row.reviewedAt,
          };
        }),
        createdAt: geometryRun.createdAt, updatedAt: geometryRun.updatedAt,
      } : undefined,
      createdAt: run?.createdAt || basis.planRun.updatedAt, updatedAt: run?.updatedAt || basis.planRun.updatedAt,
    };
  },
});

export const mutateTakeoff = internalMutation({
  args: { principal: heliosPrincipalValidator, projectId: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const basis = await currentBasis(ctx, companyId, args.projectId);
    const run = await ensureRun(ctx, companyId, user._id, basis);
    const input = normalizeTakeoffReviewInput(args.input);
    const now = Date.now();
    let measurementId: Id<"heliosTakeoffMeasurements"> | undefined;
    let quantityId: Id<"heliosTakeoffQuantities"> | undefined;
    let previousValue: string | undefined;
    let decisionValue: string;

    if (input.action === "create_measurement") {
      const draft = input.measurement!;
      const costCode = await ownedCostCode(ctx, companyId, basis.estimate._id, draft.costCodeId);
      const pageId = ctx.db.normalizeId("heliosPlanPages", draft.pageId);
      const page = pageId ? await ctx.db.get(pageId) : null;
      if (!page || page.companyId !== companyId || page.runId !== basis.planRun._id) throw new Error("Current plan page not found.");
      const view = page.views.find((candidate) => candidate.viewKey === draft.viewKey);
      if (!view) throw new Error("Current plan view not found.");
      let calibrationId: Id<"heliosPlanCalibrations"> | undefined;
      if (draft.calibrationId) {
        calibrationId = ctx.db.normalizeId("heliosPlanCalibrations", draft.calibrationId) || undefined;
        const calibration = calibrationId ? await ctx.db.get(calibrationId) : null;
        if (!calibration || calibration.companyId !== companyId || calibration.runId !== basis.planRun._id || calibration.pageId !== page._id || calibration.viewKey !== view.viewKey || calibration.status !== "approved") {
          throw new Error("The selected view calibration is not approved for this revision.");
        }
      }
      const geometryRecordIds: Id<"heliosCivilGeometryRecords">[] = [];
      const geometryRecords: Doc<"heliosCivilGeometryRecords">[] = [];
      for (const value of draft.geometryRecordIds) {
        const id = ctx.db.normalizeId("heliosCivilGeometryRecords", value);
        const geometry = id ? await ctx.db.get(id) : null;
        if (!geometry || geometry.companyId !== companyId || geometry.planRunId !== basis.planRun._id || geometry.status !== "accepted") {
          throw new Error("The selected civil geometry is not accepted for this plan revision.");
        }
        geometryRecordIds.push(geometry._id);
        geometryRecords.push(geometry);
      }
      if (draft.measurementType !== "count" && draft.sourceBasis === "calibrated_scale_fallback" && !calibrationId) throw new Error("Approve the view scale before using scale fallback.");
      if (draft.measurementType !== "count" && ["coordinate_geometry", "dimensioned_geometry"].includes(draft.sourceBasis) && !geometryRecordIds.length) throw new Error("Accept civil geometry before recording this dimensional measurement.");
      const geometryCalculation = geometryRecords.length && draft.measurementType !== "derived"
        ? deriveCivilGeometryQuantity(geometryRecords, draft.measurementType)
        : undefined;
      const measurementValues = geometryCalculation ? {
        ...draft,
        rawValue: geometryCalculation.value,
        rawUnit: geometryCalculation.unit,
        outputUnit: geometryCalculation.unit,
        factors: [],
      } : draft;
      const calculated = geometryCalculation
        ? { calculatedValue: geometryCalculation.value, formula: geometryCalculation.formula }
        : calculateTakeoffMeasurement(draft);
      measurementId = await ctx.db.insert("heliosTakeoffMeasurements", {
        companyId, projectId: basis.project._id, packageId: basis.packageRecord._id, runId: run._id, planRunId: basis.planRun._id,
        estimateId: basis.estimate._id, costCodeId: costCode._id, pageId: page._id, viewKey: view.viewKey, calibrationId, geometryRecordIds, sourceBasis: draft.sourceBasis,
        measurementType: measurementValues.measurementType, label: measurementValues.label, geometryKind: measurementValues.geometryKind, geometry: measurementValues.geometry,
        objectReferences: measurementValues.objectReferences, rawValue: measurementValues.rawValue, rawUnit: measurementValues.rawUnit, outputUnit: measurementValues.outputUnit,
        factors: measurementValues.factors, ...calculated, includedScope: measurementValues.includedScope, excludedScope: measurementValues.excludedScope,
        assumptions: measurementValues.assumptions, confidence: measurementValues.confidence, status: "proposed", createdBy: user._id,
        createdByName: user.name, createdAt: now, updatedAt: now,
      });
      decisionValue = JSON.stringify({ measurementId, calculatedValue: calculated.calculatedValue, formula: calculated.formula });
    } else if (input.action === "accept_measurement" || input.action === "reject_measurement") {
      const measurement = await ownedMeasurement(ctx, companyId, run._id, input.measurementId || "");
      if (measurement.status !== "proposed") throw new Error("Only proposed measurements can be reviewed.");
      previousValue = measurement.status;
      const status = input.action === "accept_measurement" ? "accepted" as const : "rejected" as const;
      await ctx.db.patch(measurement._id, { status, reviewedBy: user._id, reviewedByName: user.name, reviewedAt: now, updatedAt: now });
      measurementId = measurement._id;
      const costCode = await ownedCostCode(ctx, companyId, basis.estimate._id, String(measurement.costCodeId));
      const proposal = await rebuildQuantity(ctx, run, costCode, measurement.outputUnit, user);
      quantityId = proposal?._id;
      decisionValue = JSON.stringify({ status, rebuiltQuantityId: proposal?._id });
    } else if (input.action === "propose_quantity_to_estimate") {
      const quantity = await ownedQuantity(ctx, companyId, run._id, input.quantityId || "");
      if (quantity.status !== "proposed") throw new Error("Only a current proposed takeoff quantity can be sent to the estimate.");
      const measurements = await Promise.all(quantity.measurementIds.map((id) => ctx.db.get(id)));
      if (measurements.some((row) => !row || row.status !== "accepted")) throw new Error("Every source measurement must be accepted first.");
      for (const measurement of measurements) {
        if (measurement?.calibrationId) {
          const calibration = await ctx.db.get(measurement.calibrationId);
          if (!calibration || calibration.status !== "approved" || calibration.runId !== basis.planRun._id) {
            throw new Error("A source calibration changed. Rebuild this takeoff before estimate use.");
          }
        }
        for (const geometryRecordId of measurement?.geometryRecordIds || []) {
          const geometry = await ctx.db.get(geometryRecordId);
          if (!geometry || geometry.status !== "accepted" || geometry.planRunId !== basis.planRun._id) {
            throw new Error("Source civil geometry changed. Rebuild this takeoff before estimate use.");
          }
        }
      }
      const use = input.quantityUse || "comparative";
      const estimateUse = use === "production" ? "production" as const : "comparative" as const;
      const estimateQuantityId = await ctx.db.insert("heliosEstimateQuantities", {
        companyId, projectId: basis.project._id, estimateId: basis.estimate._id, costCodeId: quantity.costCodeId,
        value: quantity.value, unit: quantity.unit, quantityType: "plan", sourceLabel: "Helios governed plan takeoff",
        sourceReference: `takeoff:${quantity._id}; plan-run:${basis.planRun._id}`,
        method: quantity.formula, confidence: Math.min(...measurements.map((row) => row?.confidence || 0)),
        use: estimateUse, status: "current", reviewStatus: "proposed", origin: "human", evidenceIds: [], createdAt: now, updatedAt: now,
      });
      await ctx.db.patch(quantity._id, { use, status: "sent_to_estimate", estimateQuantityId, updatedAt: now });
      await ctx.db.insert("heliosEstimateDecisionEvents", {
        companyId, projectId: basis.project._id, estimateId: basis.estimate._id, recordType: "quantity", recordId: String(estimateQuantityId),
        action: "create", decisionValue: { takeoffQuantityId: String(quantity._id), value: quantity.value, unit: quantity.unit, use },
        reviewerUserId: user._id, reviewerName: user.name, createdAt: now,
      });
      quantityId = quantity._id;
      previousValue = quantity.status;
      decisionValue = JSON.stringify({ status: "sent_to_estimate", estimateQuantityId, use });
    } else {
      const quantity = await ownedQuantity(ctx, companyId, run._id, input.quantityId || "");
      if (quantity.status !== "proposed") throw new Error("Only proposed takeoff quantities can be rejected.");
      previousValue = quantity.status;
      await ctx.db.patch(quantity._id, { status: "rejected", updatedAt: now });
      quantityId = quantity._id;
      decisionValue = JSON.stringify({ status: "rejected" });
    }
    await ctx.db.patch(run._id, { updatedAt: now });
    const eventId = await ctx.db.insert("heliosTakeoffReviewEvents", {
      companyId, projectId: basis.project._id, packageId: basis.packageRecord._id, runId: run._id,
      measurementId, quantityId, action: input.action, reviewerUserId: user._id, reviewerName: user.name,
      previousValue, decisionValue, createdAt: now,
    });
    return { eventId: String(eventId), measurementId: measurementId ? String(measurementId) : undefined, quantityId: quantityId ? String(quantityId) : undefined };
  },
});
