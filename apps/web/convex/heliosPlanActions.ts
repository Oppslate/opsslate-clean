"use node";

import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import OpenAI from "openai";

import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { HELIOS_PLAN_DOCUMENT_PROMPT, heliosPlanDocumentFormat } from "./heliosPlanOpenAIContracts";

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

const loadReference = makeFunctionReference<"query", { jobId: Id<"heliosPlanJobs"> }, PlanJobContext | null>("heliosPlanIntelligence:loadPlanJob");
const uploadingReference = makeFunctionReference<"mutation", { jobId: Id<"heliosPlanJobs"> }, boolean>("heliosPlanIntelligence:markPlanUploading");
const analyzingReference = makeFunctionReference<"mutation", { jobId: Id<"heliosPlanJobs">; openaiFileId: string; openaiResponseId: string; model: string }, boolean>("heliosPlanIntelligence:markPlanAnalyzing");
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
export const pollPlanDocument = internalAction({
  args: { jobId: v.id("heliosPlanJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadReference, args);
    if (!context || context.job.status !== "analyzing" || !context.job.openaiFileId || !context.job.openaiResponseId) return null;
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
      await ctx.runMutation(failReference, { jobId: args.jobId, error: "Plan reconstruction did not complete successfully." });
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
