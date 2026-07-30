"use node";

import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import OpenAI from "openai";

import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
  HELIOS_CANONICAL_PLAN_BATCH_PROMPT,
  HELIOS_PLAN_DOCUMENT_PROMPT,
  heliosPlanDocumentFormat,
} from "./heliosPlanOpenAIContracts";

const POLL_DELAY_MS = 5_000;
const RETRY_DELAY_MS = 10_000;
const TIMEOUT_MS = 12 * 60 * 1_000;
const DEFAULT_MODEL = "gpt-5.6-sol";

type PlanJobContext = {
  job: Doc<"heliosPlanJobs">;
  run: Doc<"heliosPlanRuns">;
  project: Doc<"heliosProjects">;
  document: Doc<"heliosDocuments">;
};

type CanonicalPlanJobContext = PlanJobContext & {
  pages: Array<{
    page: Doc<"heliosEngineeringPages">;
    source: Doc<"heliosEngineeringSources">;
    render: Doc<"heliosEngineeringAssets">;
    spans: Doc<"heliosEngineeringTextSpans">[];
  }>;
  inputFingerprint: string;
};

const loadReference = makeFunctionReference<"query", { jobId: Id<"heliosPlanJobs"> }, PlanJobContext | null>("heliosPlanIntelligence:loadPlanJob");
const loadCanonicalReference = makeFunctionReference<"query", { jobId: Id<"heliosPlanJobs"> }, CanonicalPlanJobContext | null>("heliosCanonicalPlanWriter:loadCanonicalPlanJob");
const uploadingReference = makeFunctionReference<"mutation", { jobId: Id<"heliosPlanJobs"> }, boolean>("heliosPlanIntelligence:markPlanUploading");
const analyzingReference = makeFunctionReference<"mutation", { jobId: Id<"heliosPlanJobs">; openaiFileId?: string; openaiResponseId: string; model: string }, boolean>("heliosPlanIntelligence:markPlanAnalyzing");
const completeReference = makeFunctionReference<"mutation", { jobId: Id<"heliosPlanJobs">; model: string; result: unknown }, null>("heliosPlanIntelligence:completePlanJob");
const failReference = makeFunctionReference<"mutation", { jobId: Id<"heliosPlanJobs">; error: string }, null>("heliosPlanIntelligence:failPlanJob");
const pollReference = makeFunctionReference<"action", { jobId: Id<"heliosPlanJobs"> }, null>("heliosPlanActions:pollPlanDocument");

function modelName() {
  const configured = (process.env.HELIOS_OPENAI_MODEL || "").trim();
  return configured && /^[a-zA-Z0-9._:-]{1,100}$/.test(configured) ? configured : DEFAULT_MODEL;
}

function client() {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey, maxRetries: 2, timeout: 90_000 });
}

async function cleanup(openai: OpenAI, fileId?: string, responseId?: string) {
  if (responseId) try { await openai.responses.delete(responseId); } catch { /* best effort */ }
  if (fileId) try { await openai.files.delete(fileId); } catch { /* best effort */ }
}

function canonicalPageText(page: CanonicalPlanJobContext["pages"][number]) {
  const groups = ["native", "ocr"].flatMap((channel) => {
    const rows = page.spans.filter((span) => span.channel === channel);
    if (!rows.length) return [];
    const text = rows.map((span) => span.text.trim()).filter(Boolean).join("\n").slice(0, 60_000);
    return text ? [`${channel.toUpperCase()} TEXT\n${text}`] : [];
  });
  return groups.join("\n\n") || "No machine-readable text was available for this canonical page.";
}

export const startPlanDocument = internalAction({
  args: { jobId: v.id("heliosPlanJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadReference, args);
    if (!context || context.job.status !== "queued") return null;
    if (!await ctx.runMutation(uploadingReference, args)) return null;
    let openai: OpenAI | undefined;
    let fileId: string | undefined;
    let responseId: string | undefined;
    try {
      openai = client();
      const blob = await ctx.storage.get(context.document.storageId);
      if (!blob) throw new Error("Stored plan PDF is unavailable.");
      const file = await openai.files.create({
        file: new File([blob], context.document.fileName, { type: "application/pdf" }),
        purpose: "user_data",
      });
      fileId = file.id;
      const model = modelName();
      const response = await openai.responses.create({
        model, background: true, store: true,
        safety_identifier: `helios_${String(context.job.companyId)}`.slice(0, 64),
        metadata: { helios_plan_job: String(context.job._id), helios_document: String(context.document._id) },
        instructions: HELIOS_PLAN_DOCUMENT_PROMPT,
        input: [{ role: "user", content: [
          { type: "input_text", text: `Reconstruct every physical page and view in the attached plan PDF named "${context.document.fileName}". This is package revision ${context.run.packageRevision}.` },
          { type: "input_file", file_id: fileId, detail: "high" },
        ] }],
        reasoning: { effort: "high" },
        text: { format: heliosPlanDocumentFormat, verbosity: "medium" },
        max_output_tokens: 100_000,
      });
      responseId = response.id;
      if (!await ctx.runMutation(analyzingReference, { jobId: args.jobId, openaiFileId: fileId, openaiResponseId: responseId, model })) {
        await cleanup(openai, fileId, responseId);
        return null;
      }
      await ctx.scheduler.runAfter(POLL_DELAY_MS, pollReference, args);
    } catch {
      if (openai) await cleanup(openai, fileId, responseId);
      await ctx.runMutation(failReference, { jobId: args.jobId, error: "Plan reconstruction could not start. Confirm the source PDF and OpenAI configuration, then retry." });
    }
    return null;
  },
});

export const startCanonicalPlanBatch = internalAction({
  args: { jobId: v.id("heliosPlanJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadCanonicalReference, args);
    if (!context || context.job.status !== "queued") return null;
    if (!await ctx.runMutation(uploadingReference, args)) return null;
    let openai: OpenAI | undefined;
    let responseId: string | undefined;
    try {
      openai = client();
      const content: Array<
        | { type: "input_text"; text: string }
        | { type: "input_image"; image_url: string; detail: "original" }
      > = [{
        type: "input_text",
        text: [
          `Reconstruct exactly ${context.pages.length} pinned canonical pages from ${context.document.fileName}.`,
          `This is package revision ${context.run.packageRevision}.`,
          "Use the BATCH PAGE labels as physicalPageNumber values in the structured response.",
          `Pinned canonical input fingerprint: ${context.inputFingerprint}.`,
        ].join("\n"),
      }];
      for (const [index, item] of context.pages.entries()) {
        const blob = await ctx.storage.get(item.render.storageId);
        if (!blob) throw new Error("Pinned canonical page render is unavailable.");
        const bytes = Buffer.from(await blob.arrayBuffer());
        const contentType = item.render.contentType || blob.type || "image/png";
        content.push({
          type: "input_text",
          text: [
            `BATCH PAGE ${index + 1} OF ${context.pages.length}`,
            `Immutable source document: ${item.source.originalFileName}`,
            `Original PDF physical page: ${item.page.physicalPageNumber}`,
            `Canonical modality: ${item.page.modality}`,
            `Canonical render SHA-256: ${item.render.sha256}`,
            canonicalPageText(item),
          ].join("\n"),
        });
        content.push({
          type: "input_image",
          image_url: `data:${contentType};base64,${bytes.toString("base64")}`,
          detail: "original",
        });
      }
      const model = modelName();
      const response = await openai.responses.create({
        model,
        background: true,
        store: true,
        safety_identifier: `helios_${String(context.job.companyId)}`.slice(0, 64),
        metadata: {
          helios_plan_job: String(context.job._id),
          helios_document: String(context.document._id),
          helios_input_mode: "canonical_pages",
        },
        instructions: HELIOS_CANONICAL_PLAN_BATCH_PROMPT,
        input: [{ role: "user", content }],
        reasoning: { effort: "high" },
        text: { format: heliosPlanDocumentFormat, verbosity: "medium" },
        max_output_tokens: 50_000,
      });
      responseId = response.id;
      if (!await ctx.runMutation(analyzingReference, {
        jobId: args.jobId,
        openaiResponseId: responseId,
        model,
      })) {
        await cleanup(openai, undefined, responseId);
        return null;
      }
      await ctx.scheduler.runAfter(POLL_DELAY_MS, pollReference, args);
    } catch (error) {
      if (openai) await cleanup(openai, undefined, responseId);
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        error: `Canonical Plan reconstruction could not start: ${error instanceof Error ? error.message : "unknown provider error"}`.slice(0, 600),
      });
    }
    return null;
  },
});

export const pollPlanDocument = internalAction({
  args: { jobId: v.id("heliosPlanJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadReference, args);
    if (!context || context.job.status !== "analyzing" || !context.job.openaiResponseId) return null;
    const openai = client();
    const elapsed = Date.now() - (context.job.startedAt || context.job.createdAt);
    let response;
    try {
      response = await openai.responses.retrieve(context.job.openaiResponseId);
    } catch {
      if (elapsed < TIMEOUT_MS) {
        await ctx.scheduler.runAfter(RETRY_DELAY_MS, pollReference, args);
        return null;
      }
      await cleanup(openai, context.job.openaiFileId, context.job.openaiResponseId);
      await ctx.runMutation(failReference, { jobId: args.jobId, error: "Plan reconstruction timed out while checking model progress." });
      return null;
    }
    if (response.status === "queued" || response.status === "in_progress") {
      if (elapsed < TIMEOUT_MS) await ctx.scheduler.runAfter(POLL_DELAY_MS, pollReference, args);
      else {
        await cleanup(openai, context.job.openaiFileId, context.job.openaiResponseId);
        await ctx.runMutation(failReference, { jobId: args.jobId, error: "Plan reconstruction exceeded the processing time limit." });
      }
      return null;
    }
    if (response.status !== "completed") {
      await cleanup(openai, context.job.openaiFileId, context.job.openaiResponseId);
      const detail = response.error
        ? `${response.error.code}: ${response.error.message}`
        : response.incomplete_details?.reason || response.status;
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        error: `Plan reconstruction did not complete successfully: ${detail}`.slice(0, 600),
      });
      return null;
    }
    try {
      if (!response.output_text.trim()) throw new Error("No output");
      await ctx.runMutation(completeReference, { jobId: args.jobId, model: response.model || modelName(), result: JSON.parse(response.output_text) });
    } catch {
      await ctx.runMutation(failReference, { jobId: args.jobId, error: "Plan reconstruction returned an invalid page inventory. Reanalysis is required." });
    } finally {
      await cleanup(openai, context.job.openaiFileId, context.job.openaiResponseId);
    }
    return null;
  },
});
