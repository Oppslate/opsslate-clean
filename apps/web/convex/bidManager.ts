"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// ── Generate upload URL ──
export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Save uploaded bid document ──
export const saveDocument = action({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(),
    fileName: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const docId = await ctx.runMutation(a.bidManagerHelpers.insertDocument, {
      companyId: args.companyId,
      projectId: args.projectId,
      type: args.type,
      fileName: args.fileName,
      fileId: args.fileId,
      uploadedAt: Date.now(),
      status: "uploaded",
    });
    return docId;
  },
});

// ── AI Extract bid data from document ──
export const extractBidData = action({
  args: { documentId: v.id("bidDocuments") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const doc = await ctx.runQuery(a.bidManagerHelpers.getDocument, { id: args.documentId });
    if (!doc) throw new Error("Document not found");

    // Update status to processing
    await ctx.runMutation(a.bidManagerHelpers.updateDocStatus, { id: args.documentId, status: "processing" });

    try {
      // Get file content
      const fileUrl = await ctx.storage.getUrl(doc.fileId);
      if (!fileUrl) throw new Error("File not found in storage");

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

      const fileRes = await fetch(fileUrl);
      const buf = await fileRes.arrayBuffer();
      const b64data = Buffer.from(buf).toString("base64");

      const isImage = doc.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const isPdf = doc.fileName.match(/\.pdf$/i);

      let content: any[];
      if (isImage) {
        const ext = doc.fileName.split(".").pop()?.toLowerCase() ?? "png";
        const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
        content = [
          { type: "image", source: { type: "base64", media_type: mimeType, data: b64data } },
          { type: "text", text: getExtractionPrompt(doc.type) },
        ];
      } else if (isPdf) {
        content = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64data } },
          { type: "text", text: getExtractionPrompt(doc.type) },
        ];
      } else {
        const text = new TextDecoder().decode(buf);
        content = [{ type: "text", text: `Document content:\n\n${text.slice(0, 50000)}\n\n${getExtractionPrompt(doc.type)}` }];
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude API error: ${err}`);
      }

      const result = await response.json();
      const aiText = result.content[0]?.text ?? "";

      // Parse JSON from AI response
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || aiText.match(/\{[\s\S]*\}/);
      let extracted;
      try {
        extracted = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiText);
      } catch {
        extracted = { rawText: aiText, parseError: true };
      }

      // Save extracted data
      await ctx.runMutation(a.bidManagerHelpers.updateDocExtracted, {
        id: args.documentId,
        status: "extracted",
        extractedData: extracted,
      });

      // Create bid line items from extracted data
      if (extracted.lineItems && Array.isArray(extracted.lineItems)) {
        for (const item of extracted.lineItems) {
          await ctx.runMutation(a.bidManagerHelpers.insertBidLineItem, {
            companyId: doc.companyId,
            projectId: doc.projectId,
            documentId: args.documentId,
            costCode: item.costCode || "",
            description: item.description || "Unknown",
            category: item.category || undefined,
            quantity: item.quantity || undefined,
            unit: item.unit || undefined,
            unitPrice: item.unitPrice || undefined,
            bidAmount: item.amount || item.total || item.bidAmount || 0,
            source: doc.type,
          });
        }
      }

      return { success: true, itemCount: extracted.lineItems?.length ?? 0, extracted };
    } catch (e: any) {
      await ctx.runMutation(a.bidManagerHelpers.updateDocStatus, { id: args.documentId, status: "failed" });
      throw e;
    }
  },
});

// ── AI Extract for general Documents page ──
export const extractDocumentInfo = action({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const doc = await ctx.runQuery(a.docManager.getById, { id: args.documentId });
    if (!doc) throw new Error("Document not found");
    if (!doc.url) throw new Error("No file URL");

    await ctx.runMutation(a.docManager.updateAiExtract, { id: args.documentId, aiExtract: "", aiStatus: "processing" });

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

      // Get file from Convex storage
      let buf2: ArrayBuffer;
      let storageKey = doc.storageId || doc.fileId;
      // Extract storage ID from URL if not stored directly
      if (!storageKey && doc.url) {
        const match = doc.url.match(/\/api\/storage\/(.+)$/);
        if (match) storageKey = match[1];
      }
      if (storageKey) {
        const sUrl = await ctx.storage.getUrl(storageKey);
        if (!sUrl) throw new Error("File not found in storage");
        const fileRes2 = await fetch(sUrl);
        buf2 = await fileRes2.arrayBuffer();
      } else {
        throw new Error("No storage ID found for this document. Please re-upload.");
      }
      const isImage = doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const isPdf = doc.name.match(/\.pdf$/i);

      // For images over 4.5MB, use URL source instead of base64 to avoid Claude's 5MB limit
      const MAX_BASE64_SIZE = 4_500_000;

      let content: any[];
      if (isImage) {
        const ext = doc.name.split(".").pop()?.toLowerCase() ?? "png";
        const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
        
        if (buf2.byteLength > MAX_BASE64_SIZE) {
          // Use URL source — get a fresh public URL from storage
          const imageUrl = storageKey ? await ctx.storage.getUrl(storageKey) : doc.url;
          if (!imageUrl) throw new Error("Cannot get public URL for large image");
          content = [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: `Read this construction document image. Extract ALL information you can find — text, numbers, tables, dates, names, amounts, line items, notes. Format as a clear readable summary with sections. If it contains cost data, list each line item with description and amount.` },
          ];
        } else {
          const b64 = Buffer.from(buf2).toString("base64");
          content = [
            { type: "image", source: { type: "base64", media_type: mimeType, data: b64 } },
            { type: "text", text: `Read this construction document image. Extract ALL information you can find — text, numbers, tables, dates, names, amounts, line items, notes. Format as a clear readable summary with sections. If it contains cost data, list each line item with description and amount.` },
          ];
        }
      } else if (isPdf) {
        const b64 = Buffer.from(buf2).toString("base64");
        content = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: `Read this construction document. Extract ALL information — text, tables, dates, names, amounts, line items. Format as a clear readable summary.` },
        ];
      } else {
        const text = new TextDecoder().decode(buf2);
        content = [{ type: "text", text: `Summarize this construction document:\n\n${text.slice(0, 50000)}` }];
      }

      let response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content }] }),
      });

      // If PDF fails (page limit), retry with text extraction
      if (!response.ok && isPdf) {
        const errText = await response.text();
        if (errText.includes("page") || errText.includes("limit") || response.status === 400) {
          const rawText = new TextDecoder("utf-8", { fatal: false }).decode(buf2);
          const cleaned = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
          if (cleaned.length > 500) {
            content = [{ type: "text", text: `Read this construction document. Extract ALL information — text, tables, dates, names, amounts, line items. Format as a clear readable summary.\n\n--- DOCUMENT TEXT ---\n\n${cleaned.slice(0, 80000)}` }];
            response = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content }] }),
            });
          }
        }
      }

      if (!response.ok) throw new Error(`Claude API error: ${await response.text()}`);
      const result = await response.json();
      const extracted = result.content[0]?.text ?? "No content extracted";

      await ctx.runMutation(a.docManager.updateAiExtract, { id: args.documentId, aiExtract: extracted, aiStatus: "done" });
      return { success: true, text: extracted };
    } catch (e: any) {
      await ctx.runMutation(a.docManager.updateAiExtract, { id: args.documentId, aiExtract: "Extraction failed: " + e.message, aiStatus: "failed" });
      throw e;
    }
  },
});

function getExtractionPrompt(docType: string): string {
  const base = `Extract ALL line items from this ${docType.replace(/_/g, " ")} document. Return JSON with this structure:
{
  "contractValue": <total contract/bid value as number>,
  "projectName": "<project name if found>",
  "contractor": "<contractor name if found>",
  "owner": "<owner/client name if found>",
  "date": "<document date if found>",
  "paymentTerms": "<payment terms if found>",
  "retainage": "<retainage percentage if found>",
  "lineItems": [
    {
      "costCode": "<CSI code or line number>",
      "description": "<work description>",
      "category": "<category like General Conditions, Concrete, Steel, etc>",
      "quantity": <number or null>,
      "unit": "<unit like SF, LF, CY, EA, LS>",
      "unitPrice": <number or null>,
      "amount": <total dollar amount for this line>
    }
  ]
}

IMPORTANT:
- Extract EVERY line item, even small ones
- Dollar amounts should be numbers (no $ signs or commas)
- Include subtotals and totals as separate items with category "Subtotal" or "Total"
- If quantities/units aren't shown, set them to null
- For lump sum items, use unit "LS" and quantity 1`;

  if (docType === "contract") {
    return base + `\n\nAlso extract:
- "milestones": [{"name": "<milestone>", "date": "<date>", "amount": <payment amount>}]
- "scope": "<brief scope of work description>"
- "duration": "<project duration>"
- "liquidatedDamages": "<LD amount per day if found>"`;
  }
  return base;
}
