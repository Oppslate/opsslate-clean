import {
  evaluateHeliosEuclidAlignmentPosition,
  evaluateHeliosEuclidStationOffsetPosition,
  interpolateVerticalElevation,
  normalizeAssistantQuestion,
  parseStationNotation,
  type HeliosAssistantSource,
  type HeliosAssistantWorkspace,
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
import { reconstructEuclidModel } from "./heliosEuclidHorizontal";

const startAnswerReference = makeFunctionReference<
  "action",
  { messageId: Id<"heliosAssistantMessages"> },
  null
>("heliosAssistantActions:startAnswer");

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "could", "does", "from", "have",
  "helios", "many", "project", "that", "this", "what", "when", "where",
  "which", "with", "would", "your",
]);

function parseStationOffset(question: string) {
  const explicit = question.match(/\boffset\s*([+-]?\d+(?:\.\d+)?)\s*(?:feet|foot|ft|')?\s*(left|right|lt|rt)?\b/i)
    || question.match(/\b([+-]?\d+(?:\.\d+)?)\s*(?:feet|foot|ft|')?\s*(left|right|lt|rt)\b/i);
  if (!explicit) return undefined;
  const magnitude = Number(explicit[1]);
  if (!Number.isFinite(magnitude)) return undefined;
  const side = explicit[2]?.toLowerCase();
  if (side === "left" || side === "lt") return -Math.abs(magnitude);
  if (side === "right" || side === "rt") return Math.abs(magnitude);
  return magnitude;
}

function questionTerms(question: string) {
  return [...new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9.+-]+/g, " ")
      .split(/\s+/)
      .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
  )].slice(0, 20);
}

function relevance(text: string, terms: string[]) {
  const value = text.toLowerCase();
  return terms.reduce((score, term) => score + (value.includes(term) ? 1 : 0), 0);
}

function formatStation(station: number) {
  const base = Math.floor(station / 100);
  const offset = station - base * 100;
  return `${base}+${offset.toFixed(Number.isInteger(offset) ? 0 : 2).padStart(2, "0")}`;
}

function safeText(value: string, maximum = 2_400) {
  return value.trim().slice(0, maximum);
}

async function ownedProject(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">,
  projectIdValue: string,
) {
  const projectId = ctx.db.normalizeId("heliosProjects", projectIdValue);
  if (!projectId) throw new Error("Project not found.");
  const project = await ctx.db.get(projectId);
  if (!project || project.companyId !== companyId) throw new Error("Project not found.");
  return project;
}

function threadSummary(
  thread: Doc<"heliosAssistantThreads">,
  messageCount: number,
) {
  return {
    id: String(thread._id),
    projectId: String(thread.projectId),
    title: thread.title,
    status: thread.status,
    packageRevision: thread.packageRevision,
    messageCount,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
}

function messageSummary(message: Doc<"heliosAssistantMessages">) {
  return {
    id: String(message._id),
    threadId: String(message.threadId),
    role: message.role,
    status: message.status,
    content: message.content,
    answerType: message.answerType,
    answerStatus: message.answerStatus,
    method: message.method,
    assumptions: message.assumptions,
    limitations: message.limitations,
    confidence: message.confidence,
    citations: message.citations.map((citation) => ({
      ...citation,
      documentId: citation.documentId ? String(citation.documentId) : undefined,
    })),
    model: message.model,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    totalTokens: message.totalTokens,
    error: message.error,
    createdByName: message.createdByName,
    packageRevision: message.packageRevision,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

export const getWorkspace = internalQuery({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<HeliosAssistantWorkspace> => {
    const { companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const threads = await ctx.db
      .query("heliosAssistantThreads")
      .withIndex("by_project_updated", (query) => query.eq("projectId", project._id))
      .order("desc")
      .take(50);
    let activeThread: Doc<"heliosAssistantThreads"> | undefined;
    if (args.threadId) {
      const id = ctx.db.normalizeId("heliosAssistantThreads", args.threadId);
      const candidate = id ? await ctx.db.get(id) : null;
      if (!candidate || candidate.projectId !== project._id || candidate.companyId !== companyId) {
        throw new Error("Conversation not found.");
      }
      activeThread = candidate;
    }
    const threadRows = await Promise.all(threads.map(async (thread) => {
      const messages = await ctx.db.query("heliosAssistantMessages")
        .withIndex("by_thread_created", (query) => query.eq("threadId", thread._id))
        .collect();
      return threadSummary(thread, messages.length);
    }));
    const messages = activeThread
      ? await ctx.db.query("heliosAssistantMessages")
          .withIndex("by_thread_created", (query) => query.eq("threadId", activeThread!._id))
          .collect()
      : [];
    const [intelligence, planRun, estimate, takeoffRun, documents] = await Promise.all([
      ctx.db.query("heliosProjectIntelligence")
        .withIndex("by_project", (query) => query.eq("projectId", project._id))
        .order("desc").first(),
      project.activePackageId
        ? ctx.db.query("heliosPlanRuns")
            .withIndex("by_package_current", (query) => query.eq("packageId", project.activePackageId!).eq("isCurrent", true))
            .first()
        : Promise.resolve(null),
      ctx.db.query("heliosEstimates")
        .withIndex("by_project_version", (query) => query.eq("projectId", project._id))
        .order("desc").first(),
      ctx.db.query("heliosTakeoffRuns")
        .withIndex("by_project_current", (query) => query.eq("projectId", project._id).eq("isCurrent", true))
        .first(),
      ctx.db.query("heliosDocuments")
        .withIndex("by_project", (query) => query.eq("projectId", project._id))
        .collect(),
    ]);
    const geometryRun = planRun
      ? await ctx.db.query("heliosCivilGeometryRuns")
          .withIndex("by_plan_current", (query) => query.eq("planRunId", planRun._id).eq("isCurrent", true))
          .first()
      : null;
    const [evidence, geometryRecords, estimateQuantities, risks] = await Promise.all([
      intelligence
        ? ctx.db.query("heliosEvidence").withIndex("by_project", (query) => query.eq("projectId", project._id)).take(1)
        : Promise.resolve([]),
      geometryRun
        ? ctx.db.query("heliosCivilGeometryRecords").withIndex("by_run_created", (query) => query.eq("geometryRunId", geometryRun._id)).take(1)
        : Promise.resolve([]),
      estimate
        ? ctx.db.query("heliosEstimateQuantities").withIndex("by_estimate", (query) => query.eq("estimateId", estimate._id)).take(1)
        : Promise.resolve([]),
      estimate
        ? ctx.db.query("heliosEstimateRisks").withIndex("by_estimate", (query) => query.eq("estimateId", estimate._id)).take(1)
        : Promise.resolve([]),
    ]);
    return {
      project: {
        id: String(project._id), name: project.name, projectNumber: project.projectNumber,
        ownerClient: project.ownerClient, engineer: project.engineer, bidDate: project.bidDate,
        location: project.location, notes: project.notes, status: project.status,
        intelligenceStatus: project.intelligenceStatus, documentCount: documents.length,
        createdAt: project.createdAt, updatedAt: project.updatedAt,
      },
      threads: threadRows,
      activeThread: activeThread
        ? threadRows.find((thread) => thread.id === String(activeThread!._id))
        : undefined,
      messages: messages.map(messageSummary),
      capabilities: {
        documentEvidence: evidence.length > 0,
        civilGeometry: Boolean(planRun && geometryRecords.length),
        governedQuantities: Boolean(takeoffRun || estimateQuantities.length),
        estimate: Boolean(estimate),
        risks: risks.length > 0,
      },
    };
  },
});

export const askProject = internalMutation({
  args: {
    principal: heliosPrincipalValidator,
    projectId: v.string(),
    threadId: v.optional(v.string()),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, companyId } = await requireHeliosPrincipal(ctx, args.principal);
    const project = await ownedProject(ctx, companyId, args.projectId);
    const question = normalizeAssistantQuestion(args.question);
    const now = Date.now();
    let thread: Doc<"heliosAssistantThreads"> | null = null;
    if (args.threadId) {
      const threadId = ctx.db.normalizeId("heliosAssistantThreads", args.threadId);
      thread = threadId ? await ctx.db.get(threadId) : null;
      if (!thread || thread.projectId !== project._id || thread.companyId !== companyId || thread.status !== "active") {
        throw new Error("Conversation not found.");
      }
      const pending = await ctx.db.query("heliosAssistantMessages")
        .withIndex("by_thread_created", (query) => query.eq("threadId", thread!._id))
        .filter((query) => query.eq(query.field("status"), "pending"))
        .first();
      if (pending) throw new Error("Wait for the current answer to finish.");
    } else {
      const threadId = await ctx.db.insert("heliosAssistantThreads", {
        companyId,
        projectId: project._id,
        createdBy: user._id,
        title: question.slice(0, 96),
        status: "active",
        packageId: project.activePackageId,
        packageRevision: project.currentPackageRevision,
        createdAt: now,
        updatedAt: now,
      });
      thread = await ctx.db.get(threadId);
    }
    if (!thread) throw new Error("Conversation could not be created.");
    const userMessageId = await ctx.db.insert("heliosAssistantMessages", {
      companyId, projectId: project._id, threadId: thread._id,
      createdBy: user._id, createdByName: user.name, role: "user",
      status: "completed", content: question, assumptions: [], limitations: [], citations: [],
      packageId: project.activePackageId, packageRevision: project.currentPackageRevision,
      createdAt: now, updatedAt: now,
    });
    const assistantMessageId = await ctx.db.insert("heliosAssistantMessages", {
      companyId, projectId: project._id, threadId: thread._id,
      createdBy: user._id, createdByName: "Helios", replyToMessageId: userMessageId,
      role: "assistant", status: "pending", content: "",
      assumptions: [], limitations: [], citations: [],
      packageId: project.activePackageId, packageRevision: project.currentPackageRevision,
      createdAt: now + 1, updatedAt: now + 1,
    });
    await ctx.db.patch(thread._id, { updatedAt: now + 1 });
    await ctx.scheduler.runAfter(0, startAnswerReference, { messageId: assistantMessageId });
    return { threadId: String(thread._id), messageId: String(assistantMessageId), status: "pending" as const };
  },
});

export const loadAnswerContext = internalQuery({
  args: { messageId: v.id("heliosAssistantMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.role !== "assistant" || message.status !== "pending" || !message.replyToMessageId) return null;
    const [thread, project, questionMessage] = await Promise.all([
      ctx.db.get(message.threadId), ctx.db.get(message.projectId), ctx.db.get(message.replyToMessageId),
    ]);
    if (!thread || !project || !questionMessage || questionMessage.role !== "user" ||
      thread.projectId !== project._id || message.companyId !== project.companyId) return null;
    const question = questionMessage.content;
    const terms = questionTerms(question);
    const station = parseStationNotation(question);
    const stationOffset = parseStationOffset(question);
    const sources: HeliosAssistantSource[] = [];
    const addSource = (source: HeliosAssistantSource) => {
      if (!sources.some((candidate) => candidate.sourceId === source.sourceId)) sources.push(source);
    };

    const packageEntries = project.activePackageId
      ? await ctx.db.query("heliosPackageEntries").withIndex("by_package", (query) => query.eq("packageId", project.activePackageId!)).collect()
      : [];
    const activeDocumentIds = new Set(packageEntries.map((entry) => entry.documentId).filter(Boolean).map(String));
    const documents = await ctx.db.query("heliosDocuments").withIndex("by_project", (query) => query.eq("projectId", project._id)).collect();
    const scopedDocuments = activeDocumentIds.size
      ? documents.filter((document) => activeDocumentIds.has(String(document._id)))
      : documents;
    const documentMap = new Map(scopedDocuments.map((document) => [document._id, document]));
    const evidence = (await ctx.db.query("heliosEvidence").withIndex("by_project", (query) => query.eq("projectId", project._id)).collect())
      .filter((row) => documentMap.has(row.documentId))
      .map((row) => ({ row, score: relevance(`${documentMap.get(row.documentId)?.fileName} ${row.locator} ${row.excerpt}`, terms) }))
      .sort((left, right) => right.score - left.score)
      .filter((item, index) => item.score > 0 || index < 12)
      .slice(0, 30);
    for (const { row } of evidence) {
      const document = documentMap.get(row.documentId);
      addSource({
        sourceId: `evidence:${String(row._id)}`, kind: "document_evidence",
        label: document?.fileName || "Project document", locator: row.locator,
        status: "document evidence", documentId: String(row.documentId), pageNumber: row.pageNumber,
        content: safeText(row.excerpt),
      });
    }

    const planRun = project.activePackageId
      ? await ctx.db.query("heliosPlanRuns").withIndex("by_package_current", (query) => query.eq("packageId", project.activePackageId!).eq("isCurrent", true)).first()
      : null;
    const pages = planRun
      ? await ctx.db.query("heliosPlanPages").withIndex("by_run_page", (query) => query.eq("runId", planRun._id)).collect()
      : [];
    const planSheetDecisions = planRun
      ? await ctx.db.query("heliosPlanSheetDecisions")
          .withIndex("by_run_current", (query) => query.eq("runId", planRun._id).eq("isCurrent", true))
          .collect()
      : [];
    const referencePageIds = new Set(
      planSheetDecisions
        .filter((decision) => decision.status === "resolved")
        .flatMap((decision) => decision.referencePageIds.map(String)),
    );
    const pageMap = new Map(pages.map((page) => [page._id, page]));
    for (const page of pages.filter((row) => !referencePageIds.has(String(row._id)))
      .map((row) => ({ row, score: relevance(`${row.sheetNumber} ${row.title} ${row.discipline} ${row.titleBlockText}`, terms) }))
      .filter((item) => item.score > 0).sort((left, right) => right.score - left.score).slice(0, 12)) {
      addSource({
        sourceId: `plan:${String(page.row._id)}`, kind: "plan_sheet",
        label: `${page.row.sheetNumber} · ${page.row.title}`, locator: `PDF page ${page.row.physicalPageNumber}`,
        status: planRun?.status || "plan record", documentId: String(page.row.documentId),
        pageNumber: page.row.physicalPageNumber,
        content: safeText(`${page.row.titleBlockText}\nViews: ${page.row.views.map((view) => `${view.label} (${view.viewType})`).join(", ")}\nIssues: ${page.row.unresolvedIssues.join("; ")}`),
      });
    }

    const geometryRun = planRun
      ? await ctx.db.query("heliosCivilGeometryRuns").withIndex("by_plan_current", (query) => query.eq("planRunId", planRun._id).eq("isCurrent", true)).first()
      : null;
    const geometryRecords = geometryRun
      ? await ctx.db.query("heliosCivilGeometryRecords").withIndex("by_run_created", (query) => query.eq("geometryRunId", geometryRun._id)).collect()
      : [];
    let canonicalPositionAvailable = false;
    if (station !== undefined) {
      const euclidRecord = await ctx.db
        .query("heliosEuclidModels")
        .withIndex("by_project_current", (query) => query.eq("projectId", project._id).eq("isCurrent", true))
        .first();
      if (euclidRecord && euclidRecord.companyId === project.companyId) {
        const euclid = await reconstructEuclidModel(ctx, euclidRecord);
        const normalizedQuestion = question.toLowerCase();
        const named = euclid.alignments.filter((alignment) =>
          normalizedQuestion.includes(alignment.printedName.toLowerCase())
          || normalizedQuestion.includes(alignment.normalizedName.toLowerCase()),
        );
        const roadway = euclid.alignments.filter((alignment) => alignment.alignmentType === "roadway_centerline");
        const candidates = named.length
          ? named
          : euclid.alignments.length === 1
            ? euclid.alignments
            : /\b(t\.?g\.?l\.?|centerline|roadway|road)\b/i.test(question) && roadway.length === 1
              ? roadway
              : [];
        if (candidates.length === 1) {
          try {
            if (stationOffset === undefined) {
              const position = evaluateHeliosEuclidAlignmentPosition(euclid, {
                alignmentId: candidates[0]!.id,
                displayedStation: station,
              });
              canonicalPositionAvailable = position.status !== "unavailable";
              if (position.horizontal) addSource({
                sourceId: `euclid-position:${position.fingerprint}`,
                kind: "civil_geometry",
                label: `${position.alignmentName} 3D position at Station ${position.printedStation}`,
                locator: `${position.horizontal.elementType.replaceAll("_", " ")} ${position.horizontal.elementId}`,
                status: position.status,
                content: safeText([
                  `Deterministic Euclid 4L position: Northing ${position.horizontal.northing}, Easting ${position.horizontal.easting}, tangent azimuth ${position.horizontal.azimuthDegrees} degrees at displayed station ${position.printedStation} (continuous chainage ${position.chainage}).`,
                  ...position.profiles.map((profile) => `${profile.profileRole.replaceAll("_", " ")} elevation ${profile.elevation}${profile.gradePercent === undefined ? "" : ` at grade ${profile.gradePercent}%`} from ${profile.controlType.replaceAll("_", " ")}.`),
                  `Method: ${position.solver}. Source fingerprint: ${position.sourceFingerprint}.`,
                  position.limitations.length ? `Limitations: ${position.limitations.join(" ")}` : "No calculation limitations are recorded.",
                ].join("\n")),
              });
            } else {
              const position = evaluateHeliosEuclidStationOffsetPosition(euclid, {
                alignmentId: candidates[0]!.id,
                displayedStation: station,
                offset: stationOffset,
              });
              canonicalPositionAvailable = position.status !== "unavailable";
              if (position.horizontal) addSource({
                sourceId: `euclid-station-offset:${position.fingerprint}`,
                kind: "civil_geometry",
                label: `${position.alignmentName} ${Math.abs(position.offset)} ${position.side} position at Station ${position.printedStation}`,
                locator: `normal to canonical alignment at tangent azimuth ${position.horizontal.azimuthDegrees} degrees`,
                status: position.status,
                content: safeText([
                  `Deterministic Euclid 4M station-offset position: Northing ${position.horizontal.northing}, Easting ${position.horizontal.easting}, offset ${Math.abs(position.offset)} ${position.side}, tangent azimuth ${position.horizontal.azimuthDegrees} degrees at displayed station ${position.printedStation} (continuous chainage ${position.chainage}).`,
                  position.elevation
                    ? `Point elevation ${position.elevation.elevation} using ${position.elevation.basis.replaceAll("_", " ")}.`
                    : "Point elevation is not established because no lateral elevation rule was supplied.",
                  ...position.referenceProfiles.map((profile) => `Reference centerline ${profile.profileRole.replaceAll("_", " ")} elevation ${profile.elevation}${profile.gradePercent === undefined ? "" : ` at grade ${profile.gradePercent}%`} from ${profile.controlType.replaceAll("_", " ")}.`),
                  `Method: ${position.solver}. Source fingerprint: ${position.sourceFingerprint}.`,
                  position.limitations.length ? `Limitations: ${position.limitations.join(" ")}` : "No calculation limitations are recorded.",
                ].join("\n")),
              });
            }
          } catch {
            canonicalPositionAvailable = false;
          }
        }
      }
    }
    for (const record of geometryRecords.filter((row) =>
      row.status !== "rejected" && row.status !== "superseded" && !referencePageIds.has(String(row.pageId)),
    )) {
      const page = pageMap.get(record.pageId);
      if (station !== undefined) {
        const profile = canonicalPositionAvailable ? undefined : interpolateVerticalElevation(record.verticalPoints, station);
        if (profile) {
          addSource({
            sourceId: `geometry:${String(record._id)}:profile:${station}`, kind: "civil_geometry",
            label: `${record.alignmentName || "Alignment"} elevation at Station ${formatStation(station)}`,
            locator: `${page?.sheetNumber || "Plan sheet"} · ${record.sourceLocator}`,
            status: record.status, documentId: String(record.documentId), pageNumber: page?.physicalPageNumber,
            content: `Deterministic ${profile.method === "exact" ? "profile control-point lookup" : "linear interpolation"}: elevation ${profile.elevation} ${record.units} at station ${station}. Bracketing stations: ${profile.lowerStation} and ${profile.upperStation}. Confidence ${record.confidence}%.`,
          });
        }
        for (const point of record.crossSectionPoints.filter((point) => Math.abs(point.station - station) < 0.01)) {
          addSource({
            sourceId: `geometry:${String(record._id)}:cross-section:${station}:${point.surface}:${point.offset}`,
            kind: "civil_geometry", label: `${point.surface} cross-section elevation at Station ${formatStation(station)}`,
            locator: `${page?.sheetNumber || "Plan sheet"} · offset ${point.offset}`,
            status: record.status, documentId: String(record.documentId), pageNumber: page?.physicalPageNumber,
            content: `Stored ${point.surface} cross-section point: elevation ${point.elevation} ${record.units} at station ${point.station}, offset ${point.offset}. Confidence ${record.confidence}%.`,
          });
        }
      } else if (relevance(`${record.alignmentName} ${record.geometryType} ${record.sourceLocator}`, terms) > 0) {
        addSource({
          sourceId: `geometry:${String(record._id)}`, kind: "civil_geometry",
          label: `${record.alignmentName || "Civil geometry"} · ${record.geometryType.replaceAll("_", " ")}`,
          locator: `${page?.sheetNumber || "Plan sheet"} · ${record.sourceLocator}`, status: record.status,
          documentId: String(record.documentId), pageNumber: page?.physicalPageNumber,
          content: `Stored geometry contains ${record.horizontalPoints.length} horizontal points, ${record.verticalPoints.length} profile points, ${record.crossSectionPoints.length} cross-section points, ${record.invertPoints.length} inverts, and ${record.materialLayers.length} material layers. Confidence ${record.confidence}%. Issues: ${record.unresolvedIssues.join("; ") || "none recorded"}.`,
        });
      }
    }

    const estimate = await ctx.db.query("heliosEstimates").withIndex("by_project_version", (query) => query.eq("projectId", project._id)).order("desc").first();
    if (estimate) {
      const [sections, payItems, costCodes, estimateQuantities, risks] = await Promise.all([
        ctx.db.query("heliosEstimateSections").withIndex("by_estimate_sequence", (query) => query.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosOwnerPayItems").withIndex("by_estimate", (query) => query.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEstimateCostCodes").withIndex("by_estimate", (query) => query.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEstimateQuantities").withIndex("by_estimate", (query) => query.eq("estimateId", estimate._id)).collect(),
        ctx.db.query("heliosEstimateRisks").withIndex("by_estimate", (query) => query.eq("estimateId", estimate._id)).collect(),
      ]);
      const sectionMap = new Map(sections.map((section) => [section._id, section]));
      const payItemMap = new Map(payItems.map((item) => [item._id, item]));
      const codeMap = new Map(costCodes.map((code) => [code._id, code]));
      const estimateQuantityCandidates = estimateQuantities.map((quantity) => {
        const code = codeMap.get(quantity.costCodeId); const item = code ? payItemMap.get(code.payItemId) : undefined;
        const section = item ? sectionMap.get(item.sectionId) : undefined;
        const label = `${section?.name || "Estimate"} ${item?.officialItemNumber || ""} ${item?.description || ""} ${code?.code || ""} ${code?.description || ""} ${quantity.sourceLabel}`;
        return { quantity, code, item, section, label, score: relevance(label, terms) };
      }).filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score).slice(0, 20);
      for (const candidate of estimateQuantityCandidates) {
        const { quantity, code, item, section } = candidate;
        addSource({
          sourceId: `estimate-quantity:${String(quantity._id)}`, kind: "estimate_quantity",
          label: `${code?.description || quantity.sourceLabel} · ${quantity.quantityType.replaceAll("_", " ")}`,
          locator: `${section?.name || "Estimate"} · ${item?.officialItemNumber || "No owner item"}`,
          status: `${quantity.status} / ${quantity.reviewStatus}`,
          content: quantity.value === undefined
            ? `Quantity is not established. Unit ${quantity.unit}. Method: ${quantity.method}.`
            : `Governed estimate quantity ${quantity.value} ${quantity.unit}. Use ${quantity.use}. Method: ${quantity.method}. Confidence ${quantity.confidence}%.`,
        });
      }
      for (const item of payItems
        .map((row) => ({ row, score: relevance(`${row.officialItemNumber} ${row.description} ${row.estimatorDescription || ""}`, terms) }))
        .filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score).slice(0, 12)) {
        const section = sectionMap.get(item.row.sectionId);
        addSource({
          sourceId: `estimate-item:${String(item.row._id)}`, kind: "estimate_item",
          label: `${item.row.officialItemNumber} · ${item.row.estimatorDescription || item.row.description}`,
          locator: section?.name || "Estimate", status: item.row.reviewStatus,
          content: `Owner quantity ${item.row.bidQuantity ?? "not established"} ${item.row.bidUnit}. Quantity status ${item.row.quantityStatus}. Item type ${item.row.itemType || "not established"}.`,
        });
      }
      for (const risk of risks
        .map((row) => ({ row, score: relevance(`${row.title} ${row.detail} ${row.mitigation}`, terms) }))
        .filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score).slice(0, 12)) {
        addSource({
          sourceId: `risk:${String(risk.row._id)}`, kind: "risk", label: risk.row.title,
          locator: risk.row.category || "Project risk", status: `${risk.row.disposition} / ${risk.row.reviewStatus}`,
          content: safeText(`${risk.row.detail} Probability ${risk.row.probabilityPercent}%. Schedule impact ${risk.row.mostLikelyScheduleDays ?? risk.row.scheduleDays ?? "not established"} days. Carry decision ${risk.row.carryDecision || "pending"}. Mitigation: ${risk.row.mitigation}`),
        });
      }

      const takeoffRun = await ctx.db.query("heliosTakeoffRuns").withIndex("by_project_current", (query) => query.eq("projectId", project._id).eq("isCurrent", true)).first();
      if (takeoffRun) {
        const takeoffQuantities = await ctx.db.query("heliosTakeoffQuantities").withIndex("by_run_created", (query) => query.eq("runId", takeoffRun._id)).collect();
        const matching = takeoffQuantities.map((quantity) => {
          const code = codeMap.get(quantity.costCodeId); const item = code ? payItemMap.get(code.payItemId) : undefined;
          const section = item ? sectionMap.get(item.sectionId) : undefined;
          const label = `${section?.name || ""} ${item?.officialItemNumber || ""} ${item?.description || ""} ${code?.code || ""} ${code?.description || ""}`;
          return { quantity, code, item, section, label, score: relevance(label, terms) };
        }).filter((candidate) => candidate.score > 0 && !["rejected", "superseded"].includes(candidate.quantity.status))
          .sort((left, right) => right.score - left.score).slice(0, 20);
        for (const candidate of matching) {
          const { quantity, code, item, section } = candidate;
          addSource({
            sourceId: `takeoff-quantity:${String(quantity._id)}`, kind: "takeoff_quantity",
            label: `${code?.description || item?.description || "Plan quantity"} · ${quantity.use}`,
            locator: `${section?.name || "Takeoff"} · ${item?.officialItemNumber || "No owner item"}`,
            status: quantity.status,
            content: `Governed plan quantity ${quantity.value} ${quantity.unit}. Deterministic formula: ${quantity.formula}. Owner comparison ${quantity.ownerQuantity ?? "not established"} ${quantity.ownerUnit || ""}. Reconciliation ${quantity.reconciliationStatus}.`,
          });
        }
        const groups = new Map<string, typeof matching>();
        for (const candidate of matching) {
          const key = `${candidate.quantity.use}:${candidate.quantity.unit}:${candidate.quantity.status}`;
          groups.set(key, [...(groups.get(key) || []), candidate]);
        }
        for (const [key, rows] of groups) {
          if (rows.length < 2) continue;
          const total = rows.reduce((sum, row) => sum + row.quantity.value, 0);
          const [use, unit, status] = key.split(":");
          addSource({
            sourceId: `takeoff-total:${takeoffRun._id}:${key}`, kind: "takeoff_quantity",
            label: `${use} quantity total for ${terms.join(" ") || "matching scope"}`,
            locator: `${rows.length} governed takeoff records`, status,
            content: `Deterministic sum ${total} ${unit} across ${rows.length} matching ${use} quantity records. Component source IDs: ${rows.map((row) => `takeoff-quantity:${row.quantity._id}`).join(", ")}.`,
          });
        }
      }
    }

    const history = await ctx.db.query("heliosAssistantMessages")
      .withIndex("by_thread_created", (query) => query.eq("threadId", thread._id))
      .order("desc").take(12);
    return {
      message, thread, project, question,
      history: history.reverse().filter((row) => row._id !== message._id).map((row) => ({ role: row.role, content: row.content })),
      sources: sources.slice(0, 80),
    };
  },
});

export const markAnswerStarted = internalMutation({
  args: { messageId: v.id("heliosAssistantMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.role !== "assistant" || message.status !== "pending") return false;
    await ctx.db.patch(message._id, { startedAt: Date.now(), updatedAt: Date.now() });
    return true;
  },
});

export const completeAnswer = internalMutation({
  args: {
    messageId: v.id("heliosAssistantMessages"), model: v.string(), responseId: v.optional(v.string()),
    inputTokens: v.optional(v.number()), outputTokens: v.optional(v.number()), totalTokens: v.optional(v.number()),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.role !== "assistant" || message.status !== "pending") return null;
    const result = args.result as {
      directAnswer: string; explanation: string; answerType: Doc<"heliosAssistantMessages">["answerType"];
      answerStatus: Doc<"heliosAssistantMessages">["answerStatus"]; method: string;
      assumptions: string[]; limitations: string[]; confidence: number;
      citations: Array<{ sourceId: string; kind: Doc<"heliosAssistantMessages">["citations"][number]["kind"]; label: string; locator: string; status: string; documentId?: string; pageNumber?: number }>;
    };
    const citations = [];
    for (const citation of result.citations) {
      const documentId = citation.documentId
        ? ctx.db.normalizeId("heliosDocuments", citation.documentId) ?? undefined
        : undefined;
      if (citation.documentId && !documentId) throw new Error("Answer citation document is invalid.");
      if (documentId) {
        const document = await ctx.db.get(documentId);
        if (!document || document.projectId !== message.projectId || document.companyId !== message.companyId) {
          throw new Error("Answer citation is outside the project boundary.");
        }
      }
      citations.push({ ...citation, documentId });
    }
    const now = Date.now();
    await ctx.db.patch(message._id, {
      status: "completed", content: [result.directAnswer, result.explanation].filter(Boolean).join("\n\n"),
      answerType: result.answerType, answerStatus: result.answerStatus, method: result.method,
      assumptions: result.assumptions, limitations: result.limitations, confidence: result.confidence,
      citations, model: args.model, openaiResponseId: args.responseId,
      inputTokens: args.inputTokens, outputTokens: args.outputTokens, totalTokens: args.totalTokens,
      completedAt: now, updatedAt: now,
    });
    await ctx.db.patch(message.threadId, { updatedAt: now });
    return null;
  },
});

export const failAnswer = internalMutation({
  args: { messageId: v.id("heliosAssistantMessages"), error: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.role !== "assistant" || message.status !== "pending") return null;
    const now = Date.now();
    await ctx.db.patch(message._id, {
      status: "failed", content: "Helios could not complete this project question.",
      error: args.error.slice(0, 800), completedAt: now, updatedAt: now,
    });
    await ctx.db.patch(message.threadId, { updatedAt: now });
    return null;
  },
});
