"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Read and extract text from a document (PDF, DOC, images, etc.)
export const readDocument = action({
  args: { storageId: v.string(), fileName: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // Get the file URL
    const url = await ctx.storage.getUrl(args.storageId as any);
    if (!url) throw new Error("File not found in storage");

    // Download the file
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download file: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";
    const base64 = Buffer.from(buffer).toString("base64");

    const ext = args.fileName.toLowerCase().split(".").pop() || "";

    // Handle different file types
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext) || contentType.startsWith("image/")) {
      // Image — use Claude vision
      const mediaType = contentType || (ext === "png" ? "image/png" : "image/jpeg");
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4096,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Read and extract ALL text, data, and information from this document/image. If it's a form, extract all fields and values. If it's a table, preserve the structure. If it's handwritten, transcribe it. Be thorough — extract everything visible." }
          ]}],
        }),
      });
      if (!aiResponse.ok) throw new Error(`AI vision error: ${await aiResponse.text()}`);
      const result = await aiResponse.json();
      return { content: result.content[0]?.text || "No text extracted", type: "image", fileName: args.fileName };
    }

    if (ext === "pdf" || contentType === "application/pdf") {
      // PDF — try base64 document first, fall back to text extraction
      try {
        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", max_tokens: 8192,
            messages: [{ role: "user", content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: "Read and extract ALL text, data, tables, and information from this PDF document. Preserve structure where possible. Be thorough." }
            ]}],
          }),
        });
        if (aiResponse.ok) {
          const result = await aiResponse.json();
          return { content: result.content[0]?.text || "No text extracted", type: "pdf", fileName: args.fileName };
        }
      } catch {}

      // Fallback: extract text from PDF binary
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      let rawText = textDecoder.decode(buffer);
      // Clean binary noise
      rawText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
      if (rawText.length > 500) {
        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", max_tokens: 4096,
            messages: [{ role: "user", content: `This is extracted text from a PDF document called "${args.fileName}". Clean it up, organize it, and present all the information in a readable format:\n\n${rawText.slice(0, 80000)}` }],
          }),
        });
        if (aiResponse.ok) {
          const result = await aiResponse.json();
          return { content: result.content[0]?.text || rawText.slice(0, 5000), type: "pdf-text", fileName: args.fileName };
        }
      }
      return { content: rawText.slice(0, 5000) || "Could not extract text from this PDF", type: "pdf-raw", fileName: args.fileName };
    }

    // Plain text, CSV, etc.
    if (["txt", "csv", "md", "json", "xml", "html", "htm"].includes(ext) || contentType.startsWith("text/")) {
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      const text = textDecoder.decode(buffer);
      return { content: text.slice(0, 10000), type: "text", fileName: args.fileName };
    }

    // DOC/DOCX/XLS — extract what we can from binary
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      let rawText = textDecoder.decode(buffer);
      rawText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
      
      if (rawText.length > 200) {
        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", max_tokens: 4096,
            messages: [{ role: "user", content: `This is extracted text from a ${ext.toUpperCase()} file called "${args.fileName}". Clean it up and present all readable information:\n\n${rawText.slice(0, 50000)}` }],
          }),
        });
        if (aiResponse.ok) {
          const result = await aiResponse.json();
          return { content: result.content[0]?.text || "Limited text extracted from Office file", type: ext, fileName: args.fileName };
        }
      }
      return { content: "This Office file format requires conversion. Text extraction found limited readable content.", type: ext, fileName: args.fileName };
    }

    return { content: "Unsupported file format", type: "unknown", fileName: args.fileName };
  },
});

// Read all documents for a project and return summaries
export const readProjectDocs = action({
  args: { projectId: v.id("projects"), companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    const docs = await ctx.runQuery(a.docManager.list, { companyId: args.companyId, projectId: args.projectId as string });
    if (!docs || docs.length === 0) return { documents: [], count: 0 };

    const summaries = [];
    for (const doc of docs.slice(0, 20)) { // Limit to 20 docs
      const d = doc as any;
      // If already has AI extract, use it
      if (d.aiExtract) {
        summaries.push({ name: d.name, category: d.category, content: d.aiExtract, source: "cached" });
        continue;
      }
      // Otherwise just list metadata
      summaries.push({ name: d.name, category: d.category || "Uncategorized", uploadedAt: d.uploadedAt, storageId: d.storageId || d.url, source: "metadata" });
    }

    return { documents: summaries, count: docs.length };
  },
});
