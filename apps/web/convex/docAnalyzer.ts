"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const analyzeDocument = action({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const doc = await ctx.runQuery(a.docManager.getById, { id: args.documentId });
    if (!doc) throw new Error("Document not found");
    if (!doc.url && !doc.storageId && !doc.fileId) throw new Error("No file attached");

    await ctx.runMutation(a.docManager.updateAiExtract, { id: args.documentId, aiExtract: "🔍 Analyzing document...", aiStatus: "processing" });

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

      // Get file from storage
      let buf: ArrayBuffer;
      const storageKey = doc.storageId || doc.fileId;
      if (storageKey) {
        const sUrl = await ctx.storage.getUrl(storageKey);
        if (!sUrl) throw new Error("File not found in storage");
        const res = await fetch(sUrl);
        buf = await res.arrayBuffer();
      } else {
        throw new Error("No storage ID. Please re-upload.");
      }

      const isImage = doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const isPdf = doc.name.match(/\.pdf$/i);
      const isDoc = doc.name.match(/\.(doc|docx)$/i);

      const ANALYSIS_PROMPT = `You are an expert construction contract analyst, construction attorney, and risk assessor. Analyze this construction document thoroughly.

DOCUMENT: "${doc.name}" (Category: ${doc.category || "Unknown"})

Provide a COMPLETE analysis with the following sections. Use ⚠️ for warnings, 🔴 for high risk, 🟡 for medium risk, 🟢 for acceptable. Be specific — quote exact language from the document.

## 📋 DOCUMENT SUMMARY
Brief overview of what this document is, parties involved, project scope.

## 🔴 UNUSUAL OR RISKY LANGUAGE
Identify any clauses that are unusual, one-sided, or not in the contractor's favor:
- Indemnification clauses that are overly broad
- "Pay-if-paid" vs "pay-when-paid" language
- Waiver of consequential damages (one-sided?)
- Liquidated damages amounts
- Termination for convenience clauses
- Right to audit provisions
- Change order restrictions
- Dispute resolution requirements (forced arbitration?)
- No-damage-for-delay clauses
- Flow-down provisions from prime contract
Quote the exact language and explain why it's concerning.

## ⏰ TIMEFRAMES & DEADLINES
- Contract dates (start, completion, milestones)
- Notice requirements (how many days to submit notice of claim, delay, etc.)
- RFI response deadlines
- Submittal review periods
- Change order submission windows
- Lien filing deadlines
- Warranty periods
- Retention release timeline
- Cure periods for defaults
Flag any unreasonably short deadlines.

## 🛡️ INSURANCE REQUIREMENTS
- Required coverage types (GL, Auto, Workers Comp, Umbrella, Professional Liability)
- Minimum coverage amounts
- Additional insured requirements
- Waiver of subrogation requirements
- Any unusual insurance requirements
- Builder's risk responsibilities
Compare to industry standards and flag if requirements are excessive.

## 🌿 ENVIRONMENTAL RISKS
- Hazardous materials provisions
- Environmental compliance obligations
- Remediation responsibilities
- Disposal requirements
- Environmental insurance needs
- Stormwater/erosion control responsibilities
- Lead/asbestos related requirements

## 💰 FINANCIAL RISKS
- Payment terms and schedule
- Retainage percentage and release conditions
- Bonding requirements
- Lien waiver requirements (conditional vs unconditional)
- Cost escalation provisions (or lack thereof)
- Allowances and unit pricing terms
- Tax responsibilities

## ⚖️ LIABILITY & INDEMNIFICATION
- Scope of indemnification
- Defense obligation trigger
- Limitation of liability
- Consequential damages
- Warranty obligations
- Professional liability exposure
- Third-party claim procedures

## 📊 RISK SCORE CARD
Rate each category (1-10, 10 = highest risk):
| Category | Score | Notes |
|----------|-------|-------|
| Contract Language | X/10 | ... |
| Timeframes | X/10 | ... |
| Insurance | X/10 | ... |
| Environmental | X/10 | ... |
| Financial | X/10 | ... |
| Liability | X/10 | ... |
| OVERALL RISK | X/10 | ... |

## ✅ RECOMMENDATIONS
Numbered list of specific actions to take:
1. Clauses to negotiate/modify before signing
2. Insurance coverage to obtain or verify
3. Internal processes to set up (notice tracking, etc.)
4. Items to clarify with the other party

## ⚡ RED FLAGS (IMMEDIATE ACTION NEEDED)
List any provisions that should absolutely NOT be accepted as-is. These are deal-breakers or items requiring immediate legal review.

Be thorough, specific, and practical. This analysis will be used by a construction company to make real business decisions.`;

      let content: any[];
      if (isImage) {
        const ext = doc.name.split(".").pop()?.toLowerCase() ?? "png";
        const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
        if (buf.byteLength > 4_500_000) {
          const imageUrl = storageKey ? await ctx.storage.getUrl(storageKey) : doc.url;
          content = [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: ANALYSIS_PROMPT },
          ];
        } else {
          const b64 = Buffer.from(buf).toString("base64");
          content = [
            { type: "image", source: { type: "base64", media_type: mimeType, data: b64 } },
            { type: "text", text: ANALYSIS_PROMPT },
          ];
        }
      } else if (isPdf) {
        const b64 = Buffer.from(buf).toString("base64");
        const pdfSizeMB = buf.byteLength / (1024 * 1024);
        
        if (pdfSizeMB > 25) {
          // Very large PDF — extract raw text and send as text
          const rawText = new TextDecoder("utf-8", { fatal: false }).decode(buf);
          const cleaned = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
          content = [
            { type: "text", text: ANALYSIS_PROMPT + "\n\n--- DOCUMENT TEXT (extracted from PDF) ---\n\n" + cleaned.slice(0, 100000) },
          ];
        } else {
          // Try base64 first, catch page limit errors
          content = [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
            { type: "text", text: ANALYSIS_PROMPT },
          ];
        }
      } else if (isDoc) {
        // .doc/.docx — extract text as best we can
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
        // Filter out binary noise from .doc
        const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
        content = [{ type: "text", text: ANALYSIS_PROMPT + "\n\n--- DOCUMENT TEXT ---\n\n" + cleaned.slice(0, 80000) }];
      } else {
        const text = new TextDecoder().decode(buf);
        content = [{ type: "text", text: ANALYSIS_PROMPT + "\n\n--- DOCUMENT TEXT ---\n\n" + text.slice(0, 80000) }];
      }

      let response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8192, messages: [{ role: "user", content }] }),
      });

      // If PDF page limit error, retry with text extraction
      if (!response.ok && isPdf) {
        const errText = await response.text();
        if (errText.includes("page") || errText.includes("too many") || errText.includes("limit") || response.status === 400) {
          const rawText = new TextDecoder("utf-8", { fatal: false }).decode(buf);
          const cleaned = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
          if (cleaned.length < 500) throw new Error("PDF text extraction failed — document may be image-based. Try uploading as images instead.");
          content = [{ type: "text", text: ANALYSIS_PROMPT + "\n\n--- DOCUMENT TEXT (extracted from PDF) ---\n\n" + cleaned.slice(0, 100000) }];
          response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8192, messages: [{ role: "user", content }] }),
          });
        }
      }

      if (!response.ok) throw new Error(`Claude API error: ${await response.text()}`);
      const result = await response.json();
      const analysis = result.content[0]?.text ?? "No analysis generated";

      await ctx.runMutation(a.docManager.updateAiExtract, { id: args.documentId, aiExtract: analysis, aiStatus: "done" });
      return { success: true };
    } catch (e: any) {
      await ctx.runMutation(a.docManager.updateAiExtract, { id: args.documentId, aiExtract: "Analysis failed: " + e.message, aiStatus: "failed" });
      throw e;
    }
  },
});
