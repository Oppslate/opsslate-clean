"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function extractItems(raw: string) {
  const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(jsonText || "{}");
  return Array.isArray(parsed.items) ? parsed.items : [];
}

async function callClaude(apiKey: string, textPrompt: string, imageBlocks?: Array<{ media_type: string; data: string }>) {
  const content: any[] = [];
  if (imageBlocks?.length) {
    for (const img of imageBlocks) {
      content.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
    }
  }
  content.push({ type: "text", text: textPrompt });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 6000, messages: [{ role: "user", content }] }),
  });
  if (!response.ok) throw new Error(`Claude API error: ${await response.text()}`);
  const result = await response.json();
  return result.content?.[0]?.text || "{}";
}

export const scanSpecForSubmittals = action({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const doc = await ctx.runQuery(a.docManager.getById, { id: args.documentId });
    if (!doc) throw new Error("Document not found");
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const storageKey = doc.storageId || doc.fileId;
    if (!storageKey) throw new Error("No storage ID. Please re-upload the specification.");
    const sUrl = await ctx.storage.getUrl(storageKey);
    if (!sUrl) throw new Error("Spec file not found in storage");
    const res = await fetch(sUrl);
    const buf = await res.arrayBuffer();
    const buffer = Buffer.from(buf);
    const lowerName = String(doc.name || "").toLowerCase();

    const prompt = `You are a construction submittal manager. Read the specification and extract ONLY the items that likely require a formal submittal, shop drawing, product data submission, sample, mockup, mix design, or similar approval item.

Return valid JSON only in this format:
{
  "items": [
    {
      "itemNumber": "033000-1",
      "title": "Concrete mix design submittal",
      "description": "Submit mix design data, reinforcement data, and curing info.",
      "specSection": "03 30 00",
      "trade": "Concrete"
    }
  ]
}

Rules:
- include concise but useful titles
- include itemNumber when present, otherwise null
- include specSection when identifiable
- keep description short and operational
- do not include things that are clearly not submittals
- if unsure, omit the item rather than inventing`;

    let raw = "{}";

    if (lowerName.endsWith(".pdf")) {
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      const cleaned = decoded.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
      const likelyImagePdf = cleaned.length < 1200 || !/section|submittal|part\s+1|product|execution/i.test(cleaned);

      if (!likelyImagePdf) {
        raw = await callClaude(apiKey, `${prompt}\n\nSPEC DOCUMENT: ${doc.name}\n\nSPEC TEXT:\n${cleaned.slice(0, 120000)}`);
      } else {
        const tmpDir = mkdtempSync(path.join(os.tmpdir(), "submittal-scan-"));
        const pdfPath = path.join(tmpDir, "spec.pdf");
        writeFileSync(pdfPath, buffer);
        try {
          execFileSync("pdftoppm", ["-png", "-f", "1", "-l", "6", pdfPath, path.join(tmpDir, "page")], { stdio: "ignore" });
          const imageBlocks = [] as Array<{ media_type: string; data: string }>;
          for (let i = 1; i <= 6; i++) {
            const imgPath = path.join(tmpDir, `page-${i}.png`);
            try {
              const img = readFileSync(imgPath);
              imageBlocks.push({ media_type: "image/png", data: img.toString("base64") });
            } catch {
              break;
            }
          }
          if (!imageBlocks.length) throw new Error("Unable to render scanned PDF pages");
          raw = await callClaude(apiKey, `${prompt}\n\nSPEC DOCUMENT: ${doc.name}\n\nThese are rendered pages from a scanned/image-based PDF. Use the page images to identify required submittals.`, imageBlocks);
        } finally {
          rmSync(tmpDir, { recursive: true, force: true });
        }
      }
    } else if (lowerName.match(/\.(png|jpg|jpeg|webp)$/)) {
      raw = await callClaude(apiKey, `${prompt}\n\nSPEC DOCUMENT: ${doc.name}\n\nThis is a scanned/image specification page. Extract required submittal items from the image.`, [{ media_type: lowerName.endsWith("png") ? "image/png" : "image/jpeg", data: buffer.toString("base64") }]);
    } else {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim().slice(0, 120000);
      raw = await callClaude(apiKey, `${prompt}\n\nSPEC DOCUMENT: ${doc.name}\n\nSPEC TEXT:\n${text}`);
    }

    return { items: extractItems(raw) };
  },
});
