"use node";

import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import OpenAI from "openai";

import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { HELIOS_CIVIL_GEOMETRY_PROMPT, heliosCivilGeometryFormat } from "./heliosCivilGeometryOpenAIContracts";

const POLL_DELAY_MS = 5_000; const RETRY_DELAY_MS = 10_000; const TIMEOUT_MS = 12 * 60 * 1_000; const DEFAULT_MODEL = "gpt-5.6-sol";
type Context = {
  job: Doc<"heliosCivilGeometryJobs">;
  run: Doc<"heliosCivilGeometryRuns">;
  planRun: Doc<"heliosPlanRuns">;
  project: Doc<"heliosProjects">;
  document: Doc<"heliosDocuments">;
  pages: Array<{ physicalPageNumber: number; sheetNumber: string; title: string; views: Array<{ viewKey: string; viewType: string; label: string }> }>;
  canonicalPages?: Array<{
    physicalPageNumber: number;
    originalFileName: string;
    modality: "vector" | "scanned" | "hybrid" | "unusable";
    renderStorageId: Id<"_storage">;
    renderContentType: string;
    renderSha256: string;
    pageText: string;
  }>;
};
const loadReference = makeFunctionReference<"query", { jobId: Id<"heliosCivilGeometryJobs"> }, Context | null>("heliosCivilGeometry:loadGeometryJob");
const uploadingReference = makeFunctionReference<"mutation", { jobId: Id<"heliosCivilGeometryJobs"> }, boolean>("heliosCivilGeometry:markGeometryUploading");
const analyzingReference = makeFunctionReference<"mutation", { jobId: Id<"heliosCivilGeometryJobs">; openaiFileId?: string; openaiResponseId: string; model: string }, boolean>("heliosCivilGeometry:markGeometryAnalyzing");
const completeReference = makeFunctionReference<"mutation", { jobId: Id<"heliosCivilGeometryJobs">; model: string; result: unknown }, null>("heliosCivilGeometry:completeGeometryJob");
const failReference = makeFunctionReference<"mutation", { jobId: Id<"heliosCivilGeometryJobs">; error: string }, null>("heliosCivilGeometry:failGeometryJob");
const pollReference = makeFunctionReference<"action", { jobId: Id<"heliosCivilGeometryJobs"> }, null>("heliosCivilGeometryActions:pollGeometryDocument");
function modelName() { const value = (process.env.HELIOS_OPENAI_MODEL || "").trim(); return value && /^[a-zA-Z0-9._:-]{1,100}$/.test(value) ? value : DEFAULT_MODEL; }
function client() { const apiKey = (process.env.OPENAI_API_KEY || "").trim(); if (!apiKey) throw new Error("OPENAI_API_KEY is not configured."); return new OpenAI({ apiKey, maxRetries: 2, timeout: 90_000 }); }
async function cleanup(openai: OpenAI, fileId?: string, responseId?: string) { if (responseId) try { await openai.responses.delete(responseId); } catch {} if (fileId) try { await openai.files.delete(fileId); } catch {} }

export const startGeometryDocument = internalAction({ args: { jobId: v.id("heliosCivilGeometryJobs") }, handler: async (ctx, args): Promise<null> => {
  const context = await ctx.runQuery(loadReference, args); if (!context || context.job.status !== "queued") return null; if (!await ctx.runMutation(uploadingReference, args)) return null;
  let openai: OpenAI | undefined; let fileId: string | undefined; let responseId: string | undefined;
  try {
    openai = client();
    const content: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string; detail: "original" }
      | { type: "input_file"; file_id: string; detail: "high" }
    > = [{ type: "input_text", text: `Reconstruct explicit civil geometry from "${context.document.fileName}" for package revision ${context.run.packageRevision}. Use this verified Foundation 4C page/view inventory to return the exact physicalPageNumber and viewKey: ${JSON.stringify(context.pages).slice(0, 40_000)}` }];
    if (context.planRun.inputMode === "canonical_pages") {
      if (!context.canonicalPages?.length) throw new Error("Pinned canonical geometry pages are unavailable.");
      for (const item of context.canonicalPages) {
        const blob = await ctx.storage.get(item.renderStorageId);
        if (!blob) throw new Error("Pinned canonical geometry render is unavailable.");
        const bytes = Buffer.from(await blob.arrayBuffer());
        const contentType = item.renderContentType || blob.type || "image/png";
        content.push({
          type: "input_text",
          text: [
            `CANONICAL PHYSICAL PAGE ${item.physicalPageNumber}`,
            `Immutable source document: ${item.originalFileName}`,
            `Canonical modality: ${item.modality}`,
            `Canonical render SHA-256: ${item.renderSha256}`,
            item.pageText,
          ].join("\n"),
        });
        content.push({ type: "input_image", image_url: `data:${contentType};base64,${bytes.toString("base64")}`, detail: "original" });
      }
    } else {
      const blob = await ctx.storage.get(context.document.storageId); if (!blob) throw new Error("Stored plan PDF is unavailable.");
      const file = await openai.files.create({ file: new File([blob], context.document.fileName, { type: "application/pdf" }), purpose: "user_data" }); fileId = file.id;
      content.push({ type: "input_file", file_id: fileId, detail: "high" });
    }
    const model = modelName(); const response = await openai.responses.create({ model, background: true, store: true, safety_identifier: `helios_${String(context.job.companyId)}`.slice(0, 64), metadata: { helios_geometry_job: String(context.job._id), helios_document: String(context.document._id), helios_input_mode: context.planRun.inputMode || "legacy_pdf" }, instructions: HELIOS_CIVIL_GEOMETRY_PROMPT, input: [{ role: "user", content }], reasoning: { effort: "high" }, text: { format: heliosCivilGeometryFormat, verbosity: "medium" }, max_output_tokens: 100_000 }); responseId = response.id;
    if (!await ctx.runMutation(analyzingReference, { jobId: args.jobId, openaiFileId: fileId, openaiResponseId: responseId, model })) { await cleanup(openai, fileId, responseId); return null; }
    await ctx.scheduler.runAfter(POLL_DELAY_MS, pollReference, args);
  } catch { if (openai) await cleanup(openai, fileId, responseId); await ctx.runMutation(failReference, { jobId: args.jobId, error: "Civil geometry reconstruction could not start. Confirm the source PDF and OpenAI configuration, then retry." }); }
  return null;
} });

export const pollGeometryDocument = internalAction({ args: { jobId: v.id("heliosCivilGeometryJobs") }, handler: async (ctx, args): Promise<null> => {
  const context = await ctx.runQuery(loadReference, args); if (!context || context.job.status !== "analyzing" || !context.job.openaiResponseId) return null;
  const openai = client(); const elapsed = Date.now() - (context.job.startedAt || context.job.createdAt); let response;
  try { response = await openai.responses.retrieve(context.job.openaiResponseId); } catch { if (elapsed < TIMEOUT_MS) { await ctx.scheduler.runAfter(RETRY_DELAY_MS, pollReference, args); return null; } await cleanup(openai, context.job.openaiFileId, context.job.openaiResponseId); await ctx.runMutation(failReference, { jobId: args.jobId, error: "Civil geometry reconstruction timed out." }); return null; }
  if (response.status === "queued" || response.status === "in_progress") { if (elapsed < TIMEOUT_MS) await ctx.scheduler.runAfter(POLL_DELAY_MS, pollReference, args); else { await cleanup(openai, context.job.openaiFileId, context.job.openaiResponseId); await ctx.runMutation(failReference, { jobId: args.jobId, error: "Civil geometry reconstruction exceeded the processing time limit." }); } return null; }
  if (response.status !== "completed") { await cleanup(openai, context.job.openaiFileId, context.job.openaiResponseId); await ctx.runMutation(failReference, { jobId: args.jobId, error: "Civil geometry reconstruction did not complete successfully." }); return null; }
  try { if (!response.output_text.trim()) throw new Error("No output"); await ctx.runMutation(completeReference, { jobId: args.jobId, model: response.model || modelName(), result: JSON.parse(response.output_text) }); } catch { await ctx.runMutation(failReference, { jobId: args.jobId, error: "Civil geometry reconstruction returned invalid control data." }); } finally { await cleanup(openai, context.job.openaiFileId, context.job.openaiResponseId); }
  return null;
} });
