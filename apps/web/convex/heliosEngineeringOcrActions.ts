"use node";

import { buildHeliosCanonicalOcrSpans } from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { gunzipSync } from "node:zlib";
import { createOCREngine, type OCREngine } from "tesseract-wasm";
import { PNG } from "pngjs";

import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

type OcrContext = {
  job: Doc<"heliosEngineeringOcrJobs">;
  page: Doc<"heliosEngineeringPages">;
  render: Doc<"heliosEngineeringAssets">;
};

const TESSERACT_WASM_URL = "https://cdn.jsdelivr.net/npm/tesseract-wasm@0.11.0/dist/tesseract-core.wasm";
const TESSERACT_MODEL_URL = "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz";
let wasmPromise: Promise<Uint8Array> | undefined;
let modelPromise: Promise<Uint8Array> | undefined;

async function loadPinnedWasm() {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const response = await fetch(TESSERACT_WASM_URL);
      if (!response.ok) throw new Error(`Tesseract WASM download failed (${response.status}).`);
      return new Uint8Array(await response.arrayBuffer());
    })();
  }
  return await wasmPromise;
}

async function loadPinnedModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const response = await fetch(TESSERACT_MODEL_URL);
      if (!response.ok) throw new Error(`Tesseract English model download failed (${response.status}).`);
      return new Uint8Array(gunzipSync(new Uint8Array(await response.arrayBuffer())));
    })();
  }
  return await modelPromise;
}

const loadReference = makeFunctionReference<
  "query",
  { jobId: Id<"heliosEngineeringOcrJobs">; attempt: number },
  OcrContext | null
>("heliosEngineeringOcr:loadOcrJob");

const replaceSpansReference = makeFunctionReference<
  "mutation",
  {
    jobId: Id<"heliosEngineeringOcrJobs">;
    attempt: number;
    reset: boolean;
    spans: Array<{
      spanKey: string;
      readingOrder: number;
      text: string;
      boundary: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
  },
  { stored: number; resetRemaining: boolean }
>("heliosEngineeringOcr:replaceOcrPageTextSpans");

const completeReference = makeFunctionReference<
  "mutation",
  {
    jobId: Id<"heliosEngineeringOcrJobs">;
    attempt: number;
    spanCount: number;
    characterCount: number;
    meanConfidence?: number;
  },
  unknown
>("heliosEngineeringOcr:completeOcrJob");

const phaseReference = makeFunctionReference<
  "mutation",
  {
    jobId: Id<"heliosEngineeringOcrJobs">;
    attempt: number;
    phase: "loading_render" | "loading_engine" | "recognizing" | "persisting";
  },
  boolean
>("heliosEngineeringOcr:markOcrPhase");

const failReference = makeFunctionReference<
  "mutation",
  { jobId: Id<"heliosEngineeringOcrJobs">; attempt: number; error: string },
  unknown
>("heliosEngineeringOcr:failOcrJob");

function errorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message.trim().slice(0, 500)
    : "Canonical page OCR failed.";
}

export const runCanonicalPageOcr = internalAction({
  args: { jobId: v.id("heliosEngineeringOcrJobs"), attempt: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadReference, args);
    if (!context) {
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        attempt: args.attempt,
        error: "Canonical OCR input is stale or the pinned page render is unavailable.",
      });
      return null;
    }
    let engine: OCREngine | undefined;
    try {
      await ctx.runMutation(phaseReference, { ...args, phase: "loading_render" });
      const blob = await ctx.storage.get(context.render.storageId);
      if (!blob) throw new Error("Pinned canonical page render is unavailable.");
      const image = Buffer.from(await blob.arrayBuffer());
      await ctx.runMutation(phaseReference, { ...args, phase: "loading_engine" });
      const [wasmBinary, model] = await Promise.all([
        loadPinnedWasm(),
        loadPinnedModel(),
      ]);
      engine = await createOCREngine({ wasmBinary });
      engine.loadModel(model);
      engine.setVariable("preserve_interword_spaces", "1");
      const png = PNG.sync.read(image);
      engine.loadImage({
        data: new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.byteLength),
        width: png.width,
        height: png.height,
        colorSpace: "srgb",
      } as ImageData);
      await ctx.runMutation(phaseReference, { ...args, phase: "recognizing" });
      const lines = engine.getTextBoxes("line").map((line) => ({
        text: line.text,
        confidence: line.confidence * 100,
        bbox: {
          x0: line.rect.left,
          y0: line.rect.top,
          x1: line.rect.right,
          y1: line.rect.bottom,
        },
      }));
      const spans = buildHeliosCanonicalOcrSpans({
        pixelWidth: context.render.pixelWidth,
        pixelHeight: context.render.pixelHeight,
        lines,
      });
      await ctx.runMutation(phaseReference, { ...args, phase: "persisting" });
      let resetRemaining = true;
      while (resetRemaining) {
        const reset = await ctx.runMutation(replaceSpansReference, {
          jobId: args.jobId,
          attempt: args.attempt,
          reset: true,
          spans: [],
        });
        resetRemaining = reset.resetRemaining;
      }
      for (let offset = 0; offset < spans.length; offset += 100) {
        await ctx.runMutation(replaceSpansReference, {
          jobId: args.jobId,
          attempt: args.attempt,
          reset: false,
          spans: spans.slice(offset, offset + 100),
        });
      }
      const meanConfidence = spans.length
        ? spans.reduce((sum, span) => sum + span.confidence, 0) / spans.length
        : undefined;
      await ctx.runMutation(completeReference, {
        jobId: args.jobId,
        attempt: args.attempt,
        spanCount: spans.length,
        characterCount: spans.reduce((sum, span) => sum + span.text.length, 0),
        meanConfidence,
      });
    } catch (error) {
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        attempt: args.attempt,
        error: errorMessage(error),
      });
    } finally {
      if (engine) engine.destroy();
    }
    return null;
  },
});
