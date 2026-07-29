"use node";

import {
  HELIOS_CANONICAL_MATERIALIZATION_VERSION,
  buildHeliosCanonicalTextSpans,
  type HeliosPdfTextItem,
} from "@opsslate/helios-domain";
import {
  DEFAULT_PDFIUM_WASM_URL,
  init as initializePdfium,
  type WrappedPdfiumModule,
} from "@embedpdf/pdfium";
import { createHash } from "node:crypto";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { PNG } from "pngjs";

import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

const TARGET_DPI = 144;
const MAX_RENDER_PIXELS = 20_000_000;
const PDFIUM_PAGE_OBJECT_IMAGE = 3;
const SOURCE_PAGE_BATCH_SIZE = 10;

let pdfiumPromise: Promise<WrappedPdfiumModule> | undefined;

type SourceContext = {
  materialization: Doc<"heliosEngineeringMaterializations">;
  source: Doc<"heliosEngineeringSources">;
  record: Doc<"heliosEngineeringRecords">;
};

type ViewContext = {
  page: Doc<"heliosEngineeringPages">;
  source: Doc<"heliosEngineeringSources">;
  record: Doc<"heliosEngineeringRecords">;
  planPage: Doc<"heliosPlanPages">;
  pageRender: Doc<"heliosEngineeringAssets">;
};

const loadSourceReference = makeFunctionReference<
  "query",
  { materializationId: Id<"heliosEngineeringMaterializations"> },
  SourceContext | null
>("heliosEngineeringMaterialization:loadSourceMaterialization");

const markProcessingReference = makeFunctionReference<
  "mutation",
  { materializationId: Id<"heliosEngineeringMaterializations"> },
  boolean
>("heliosEngineeringMaterialization:markSourceProcessing");

const continueSourceReference = makeFunctionReference<
  "action",
  {
    materializationId: Id<"heliosEngineeringMaterializations">;
    startPage: number;
    endPage?: number;
    replaceRender?: boolean;
  },
  null
>("heliosEngineeringMaterializationActions:startSourceMaterialization");

const completePageReference = makeFunctionReference<
  "mutation",
  {
    materializationId: Id<"heliosEngineeringMaterializations">;
    physicalPageNumber: number;
    widthPoints: number;
    heightPoints: number;
    rotationDegrees: number;
    pageSha256: string;
    inferredModality: "vector" | "scanned" | "hybrid" | "unusable";
    nativeTextSpanCount: number;
    replaceRender?: boolean;
    pageRender: {
      storageId: Id<"_storage">;
      contentType: string;
      sha256: string;
      pixelWidth: number;
      pixelHeight: number;
      dpi: number;
    };
  },
  Id<"heliosEngineeringPages"> | null
>("heliosEngineeringMaterialization:completePageMaterialization");

const replaceSpansReference = makeFunctionReference<
  "mutation",
  {
    pageId: Id<"heliosEngineeringPages">;
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
>("heliosEngineeringMaterialization:replacePageTextSpans");

const recordPageFailureReference = makeFunctionReference<
  "mutation",
  {
    materializationId: Id<"heliosEngineeringMaterializations">;
    physicalPageNumber: number;
    error: string;
  },
  null
>("heliosEngineeringMaterialization:recordPageFailure");

const finalizeReference = makeFunctionReference<
  "mutation",
  { materializationId: Id<"heliosEngineeringMaterializations">; sourcePageCount: number },
  unknown
>("heliosEngineeringMaterialization:finalizeSourceMaterialization");

const failReference = makeFunctionReference<
  "mutation",
  { materializationId: Id<"heliosEngineeringMaterializations">; error: string },
  null
>("heliosEngineeringMaterialization:failSourceMaterialization");

const loadViewReference = makeFunctionReference<
  "query",
  { pageId: Id<"heliosEngineeringPages"> },
  ViewContext | null
>("heliosEngineeringMaterialization:loadPageViewMaterialization");

const completeViewsReference = makeFunctionReference<
  "mutation",
  {
    pageId: Id<"heliosEngineeringPages">;
    assets: Array<{
      viewKey: string;
      storageId: Id<"_storage">;
      contentType: string;
      sha256: string;
      boundary: { x: number; y: number; width: number; height: number };
      pixelWidth: number;
      pixelHeight: number;
      dpi: number;
    }>;
  },
  number
>("heliosEngineeringMaterialization:completePageViewMaterialization");

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message.trim().slice(0, 500)
    : fallback;
}

function pdfiumHeap(pdfium: WrappedPdfiumModule) {
  const heap = (pdfium.pdfium as unknown as { HEAPU8?: Uint8Array }).HEAPU8;
  if (!heap) throw new Error("PDFium memory is unavailable.");
  return heap;
}

function inferredModality(nativeCharacterCount: number, imageCount: number) {
  if (nativeCharacterCount > 0 && imageCount > 0) return "hybrid" as const;
  if (nativeCharacterCount > 0) return "vector" as const;
  if (imageCount > 0) return "scanned" as const;
  return "unusable" as const;
}

function renderScale(widthPoints: number, heightPoints: number) {
  const targetScale = TARGET_DPI / 72;
  const targetPixels = widthPoints * heightPoints * targetScale * targetScale;
  return targetPixels <= MAX_RENDER_PIXELS
    ? targetScale
    : Math.sqrt(MAX_RENDER_PIXELS / (widthPoints * heightPoints));
}

async function getPdfium() {
  if (!pdfiumPromise) {
    pdfiumPromise = (async () => {
      const response = await fetch(DEFAULT_PDFIUM_WASM_URL);
      if (!response.ok) {
        throw new Error(`PDFium runtime download failed (${response.status}).`);
      }
      const pdfiumModule = await initializePdfium({ wasmBinary: await response.arrayBuffer() });
      pdfiumModule.PDFiumExt_Init();
      return pdfiumModule;
    })();
  }
  return await pdfiumPromise;
}

function nativeTextItems(
  pdfium: WrappedPdfiumModule,
  page: number,
  pageHeight: number,
) {
  const textPage = pdfium.FPDFText_LoadPage(page);
  if (!textPage) return [];
  const box = pdfium.pdfium.wasmExports.malloc(32);
  const items: HeliosPdfTextItem[] = [];
  try {
    const characterCount = pdfium.FPDFText_CountChars(textPage);
    for (let index = 0; index < characterCount; index += 1) {
      const unicode = pdfium.FPDFText_GetUnicode(textPage, index);
      if (!unicode) continue;
      if (
        unicode > 0x10ffff ||
        (unicode >= 0xd800 && unicode <= 0xdfff) ||
        (unicode < 0x20 && ![0x09, 0x0a, 0x0d].includes(unicode))
      ) continue;
      const text = String.fromCodePoint(unicode);
      if (text === "\r") continue;
      if (text === "\n") {
        if (items.length) items[items.length - 1]!.lineBreakAfter = true;
        continue;
      }
      if (!pdfium.FPDFText_GetCharBox(textPage, index, box, box + 8, box + 16, box + 24)) {
        continue;
      }
      const left = pdfium.pdfium.getValue(box, "double");
      const right = pdfium.pdfium.getValue(box + 8, "double");
      const bottom = pdfium.pdfium.getValue(box + 16, "double");
      const top = pdfium.pdfium.getValue(box + 24, "double");
      if (![left, right, bottom, top].every(Number.isFinite)) continue;
      items.push({
        text,
        x: Math.min(left, right),
        y: Math.max(0, pageHeight - Math.max(bottom, top)),
        width: Math.max(Math.abs(right - left), 0.1),
        height: Math.max(Math.abs(top - bottom), 0.1),
        lineBreakAfter: false,
      });
    }
  } finally {
    pdfium.pdfium.wasmExports.free(box);
    pdfium.FPDFText_ClosePage(textPage);
  }
  return items;
}

function pageImageCount(pdfium: WrappedPdfiumModule, page: number) {
  let imageCount = 0;
  const objectCount = pdfium.FPDFPage_CountObjects(page);
  for (let index = 0; index < objectCount; index += 1) {
    const object = pdfium.FPDFPage_GetObject(page, index);
    if (object && pdfium.FPDFPageObj_GetType(object) === PDFIUM_PAGE_OBJECT_IMAGE) {
      imageCount += 1;
    }
  }
  return imageCount;
}

function renderPage(
  pdfium: WrappedPdfiumModule,
  page: number,
  widthPoints: number,
  heightPoints: number,
) {
  const scale = renderScale(widthPoints, heightPoints);
  const pixelWidth = Math.max(1, Math.ceil(widthPoints * scale));
  const pixelHeight = Math.max(1, Math.ceil(heightPoints * scale));
  const bitmap = pdfium.FPDFBitmap_Create(pixelWidth, pixelHeight, 1);
  if (!bitmap) throw new Error("PDFium could not create a page bitmap.");
  try {
    pdfium.FPDFBitmap_FillRect(bitmap, 0, 0, pixelWidth, pixelHeight, 0xffffffff);
    pdfium.FPDF_RenderPageBitmap(bitmap, page, 0, 0, pixelWidth, pixelHeight, 0, 0);
    const source = pdfium.FPDFBitmap_GetBuffer(bitmap);
    const stride = pdfium.FPDFBitmap_GetStride(bitmap);
    if (!source || stride < pixelWidth * 4) {
      throw new Error("PDFium returned an invalid page bitmap.");
    }
    const png = new PNG({ width: pixelWidth, height: pixelHeight });
    const heap = pdfiumHeap(pdfium);
    for (let y = 0; y < pixelHeight; y += 1) {
      const sourceRow = source + y * stride;
      const targetRow = y * pixelWidth * 4;
      for (let x = 0; x < pixelWidth; x += 1) {
        const sourcePixel = sourceRow + x * 4;
        const targetPixel = targetRow + x * 4;
        png.data[targetPixel] = heap[sourcePixel + 2]!;
        png.data[targetPixel + 1] = heap[sourcePixel + 1]!;
        png.data[targetPixel + 2] = heap[sourcePixel]!;
        png.data[targetPixel + 3] = heap[sourcePixel + 3]!;
      }
    }
    return {
      bytes: new Uint8Array(PNG.sync.write(png)),
      pixelWidth,
      pixelHeight,
      dpi: Math.round(72 * scale),
    };
  } finally {
    pdfium.FPDFBitmap_Destroy(bitmap);
  }
}

function cropPng(
  source: PNG,
  boundary: { x: number; y: number; width: number; height: number },
) {
  const x = Math.max(0, Math.floor(boundary.x * source.width));
  const y = Math.max(0, Math.floor(boundary.y * source.height));
  const width = Math.max(1, Math.min(source.width - x, Math.ceil(boundary.width * source.width)));
  const height = Math.max(1, Math.min(source.height - y, Math.ceil(boundary.height * source.height)));
  if (width < 2 || height < 2) return null;
  const target = new PNG({ width, height });
  PNG.bitblt(source, target, x, y, width, height, 0, 0);
  return { bytes: new Uint8Array(PNG.sync.write(target)), width, height };
}

export const startSourceMaterialization = internalAction({
  args: {
    materializationId: v.id("heliosEngineeringMaterializations"),
    startPage: v.optional(v.number()),
    endPage: v.optional(v.number()),
    replaceRender: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadSourceReference, {
      materializationId: args.materializationId,
    });
    const startPage = Math.max(1, Math.floor(args.startPage || 1));
    if (!context) return null;
    if (startPage === 1) {
      if (context.materialization.status !== "queued") return null;
      if (!await ctx.runMutation(markProcessingReference, {
        materializationId: args.materializationId,
      })) return null;
    } else if (context.materialization.status !== "processing") {
      return null;
    }
    let document = 0;
    let sourceBuffer = 0;
    try {
      const blob = await ctx.storage.get(context.source.originalStorageId!);
      if (!blob) throw new Error("Immutable source PDF is unavailable.");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const pdfium = await getPdfium();
      sourceBuffer = pdfium.pdfium.wasmExports.malloc(bytes.byteLength);
      pdfiumHeap(pdfium).set(bytes, sourceBuffer);
      document = pdfium.FPDF_LoadMemDocument(sourceBuffer, bytes.byteLength, "");
      if (!document) {
        throw new Error(`PDFium could not open source PDF (error ${pdfium.FPDF_GetLastError()}).`);
      }
      const pageCount = pdfium.FPDF_GetPageCount(document);
      const requestedEndPage = Math.min(
        pageCount,
        Math.max(startPage, Math.floor(args.endPage || pageCount)),
      );
      const endPage = Math.min(requestedEndPage, startPage + SOURCE_PAGE_BATCH_SIZE - 1);
      for (let physicalPageNumber = startPage; physicalPageNumber <= endPage; physicalPageNumber += 1) {
        let storedRenderId: Id<"_storage"> | undefined;
        let page = 0;
        try {
          page = pdfium.FPDF_LoadPage(document, physicalPageNumber - 1);
          if (!page) throw new Error("PDFium could not load the source page.");
          const widthPoints = pdfium.FPDF_GetPageWidthF(page);
          const heightPoints = pdfium.FPDF_GetPageHeightF(page);
          const rendered = renderPage(pdfium, page, widthPoints, heightPoints);
          const png = rendered.bytes;
          storedRenderId = await ctx.storage.store(new Blob([png], { type: "image/png" }));

          const textItems = nativeTextItems(pdfium, page, heightPoints);
          const spans = buildHeliosCanonicalTextSpans({
            pageWidth: widthPoints,
            pageHeight: heightPoints,
            items: textItems,
          });
          const nativeCharacterCount = spans.reduce((sum, span) => sum + span.text.length, 0);
          const imageCount = pageImageCount(pdfium, page);
          const result = await ctx.runMutation(completePageReference, {
            materializationId: args.materializationId,
            physicalPageNumber,
            widthPoints,
            heightPoints,
            rotationDegrees: pdfium.FPDFPage_GetRotation(page) * 90,
            pageSha256: sha256(png),
            inferredModality: inferredModality(nativeCharacterCount, imageCount),
            nativeTextSpanCount: spans.length,
            replaceRender: args.replaceRender,
            pageRender: {
              storageId: storedRenderId,
              contentType: "image/png",
              sha256: sha256(png),
              pixelWidth: rendered.pixelWidth,
              pixelHeight: rendered.pixelHeight,
              dpi: rendered.dpi,
            },
          });
          if (result) storedRenderId = undefined;
          else if (storedRenderId) await ctx.storage.delete(storedRenderId);
          if (result) {
            let resetRemaining = true;
            while (resetRemaining) {
              const reset = await ctx.runMutation(replaceSpansReference, {
                pageId: result,
                reset: true,
                spans: [],
              });
              resetRemaining = reset.resetRemaining;
            }
            for (let offset = 0; offset < spans.length; offset += 100) {
              try {
                await ctx.runMutation(replaceSpansReference, {
                  pageId: result,
                  reset: false,
                  spans: spans.slice(offset, offset + 100),
                });
              } catch (error) {
                throw new Error(
                  `Native text span batch ${offset / 100 + 1} failed: ${errorMessage(error, "invalid span payload")}`,
                );
              }
            }
          }
        } catch (error) {
          if (storedRenderId) {
            try { await ctx.storage.delete(storedRenderId); } catch { /* best effort */ }
          }
          await ctx.runMutation(recordPageFailureReference, {
            materializationId: args.materializationId,
            physicalPageNumber,
            error: errorMessage(error, "Canonical page materialization failed."),
          });
        } finally {
          if (page) pdfium.FPDF_ClosePage(page);
        }
      }
      if (endPage < requestedEndPage) {
        await ctx.scheduler.runAfter(0, continueSourceReference, {
          materializationId: args.materializationId,
          startPage: endPage + 1,
          endPage: requestedEndPage,
          replaceRender: args.replaceRender,
        });
      } else {
        await ctx.runMutation(finalizeReference, {
          materializationId: args.materializationId,
          sourcePageCount: pageCount,
        });
      }
    } catch (error) {
      await ctx.runMutation(failReference, {
        materializationId: args.materializationId,
        error: errorMessage(error, "Canonical source materialization failed."),
      });
    } finally {
      if (document || sourceBuffer) {
        try {
          const pdfium = await getPdfium();
          if (document) pdfium.FPDF_CloseDocument(document);
          if (sourceBuffer) pdfium.pdfium.wasmExports.free(sourceBuffer);
        } catch { /* best effort */ }
      }
    }
    return null;
  },
});

export const materializePageViews = internalAction({
  args: { pageId: v.id("heliosEngineeringPages") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadViewReference, args);
    if (!context || !context.planPage.views.length) return null;
    const blob = await ctx.storage.get(context.pageRender.storageId);
    if (!blob) return null;
    const image = PNG.sync.read(Buffer.from(await blob.arrayBuffer()));
    const assets: Array<{
      viewKey: string;
      storageId: Id<"_storage">;
      contentType: string;
      sha256: string;
      boundary: { x: number; y: number; width: number; height: number };
      pixelWidth: number;
      pixelHeight: number;
      dpi: number;
    }> = [];
    try {
      for (const view of context.planPage.views) {
        const crop = cropPng(image, view.boundary);
        if (!crop) continue;
        const png = crop.bytes;
        const storageId = await ctx.storage.store(new Blob([png], { type: "image/png" }));
        assets.push({
          viewKey: view.viewKey,
          storageId,
          contentType: "image/png",
          sha256: sha256(png),
          boundary: view.boundary,
          pixelWidth: crop.width,
          pixelHeight: crop.height,
          dpi: context.pageRender.dpi || TARGET_DPI,
        });
      }
      await ctx.runMutation(completeViewsReference, { pageId: args.pageId, assets });
    } catch (error) {
      for (const asset of assets) {
        try { await ctx.storage.delete(asset.storageId); } catch { /* best effort */ }
      }
      throw new Error(
        `Canonical view materialization failed for page ${String(args.pageId)} at version ${HELIOS_CANONICAL_MATERIALIZATION_VERSION}: ${errorMessage(error, "unknown crop error")}`,
      );
    }
    return null;
  },
});
