"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Scan all project documents and generate RFIs for ambiguities
export const scanAndGenerate = action({
  args: {
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    focusArea: v.optional(v.string()), // e.g. "structural", "electrical", "plumbing", "all"
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    if (!project) throw new Error("Project not found");

    // 1. Gather ALL project documents with their extracted text
    const docs = await ctx.runQuery(a.docManager.list, { companyId: args.companyId, projectId: args.projectId as string });

    // 2. Read docs that have AI extracts, fetch those that don't
    const docContents: Array<{ name: string; category: string; content: string }> = [];
    for (const doc of (docs || []).slice(0, 20)) {
      const d = doc as any;
      if (d.aiExtract && d.aiExtract.length > 50) {
        docContents.push({ name: d.name, category: d.category || "?", content: d.aiExtract.slice(0, 8000) });
      } else if (d.storageId) {
        // Try to read the document
        try {
          const result = await ctx.runAction(a.aiPmDocReader.readDocument, { storageId: d.storageId, fileName: d.name || "unknown" });
          const content = (result as any)?.content || "";
          if (content.length > 50) {
            docContents.push({ name: d.name, category: d.category || "?", content: content.slice(0, 8000) });
            // Cache the extract
            try { await ctx.runMutation(a.docManager.updateAiExtract, { id: d._id, aiExtract: content.slice(0, 50000), aiStatus: "complete" }); } catch {}
          }
        } catch {}
      }
    }

    // 3. Also get existing RFIs so we don't duplicate
    const existingRfis = await ctx.runQuery(a.rfis.list, { companyId: args.companyId, projectId: args.projectId as string });
    const existingSubjects = (existingRfis || []).map((r: any) => r.subject?.toLowerCase() || "");

    // 4. Get project context
    const contacts = await ctx.runQuery(a.contacts.list, { projectId: args.projectId });
    const tasks = await ctx.runQuery(a.tasks.list, { projectId: args.projectId });

    if (docContents.length === 0) {
      return {
        rfisGenerated: 0,
        message: "No documents found to analyze. Upload specs, drawings, contracts, or other project documents first, then run the RFI generator again.",
      };
    }

    // 5. Build the document digest
    const docDigest = docContents.map((d) => `===DOCUMENT: ${d.name} (${d.category})===\n${d.content}`).join("\n\n");
    const existingRfiList = existingRfis?.length
      ? `\nEXISTING RFIs (do NOT duplicate these):\n${existingRfis.map((r: any) => `- RFI #${r.number}: ${r.subject} (${r.status})`).join("\n")}`
      : "";
    const contactList = contacts?.length
      ? `\nPROJECT CONTACTS:\n${contacts.map((c: any) => `- ${c.firstName} ${c.lastName || ""} (${c.role || "?"}, ${c.trade || "?"}) — ${c.email || "no email"}`).join("\n")}`
      : "";

    const focusFilter = args.focusArea && args.focusArea !== "all"
      ? `\nFOCUS AREA: Only generate RFIs related to ${args.focusArea}. Ignore other trades.`
      : "";

    // 6. Send to Claude
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: `You are an expert construction project manager reviewing project documents for "${(project as any).name}" (${(project as any).address || ""}). 

Analyze ALL the following project documents and identify:
1. Ambiguities — unclear specs, conflicting dimensions, vague material calls
2. Missing information — details referenced but not provided, incomplete sections
3. Conflicts — contradictions between documents, spec vs drawing mismatches
4. Coordination issues — scope gaps between trades, missing interface details
5. Code compliance questions — items that may not meet building code
6. Constructability concerns — details that are difficult/impossible to build as shown

${docDigest}
${existingRfiList}
${contactList}
${focusFilter}

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "rfis": [
    {
      "subject": "Short clear title (e.g. 'Concrete Mix Design Not Specified for Foundation Walls')",
      "question": "Detailed question referencing specific document, section, page, or detail number. Be precise — quote the conflicting/ambiguous language. End with the specific clarification needed.",
      "priority": "Critical|High|Medium|Low",
      "suggestedAssignee": "Role of who should answer (e.g. 'Architect', 'Structural Engineer', 'MEP Engineer', 'Owner')",
      "costImpact": true/false,
      "scheduleImpact": true/false,
      "sourceDocument": "Name of the document where the issue was found",
      "category": "Ambiguity|Missing Info|Conflict|Coordination|Code|Constructability"
    }
  ],
  "summary": "Brief overview of document quality and main risk areas"
}

Rules:
- Generate 5-15 RFIs depending on how many real issues exist
- Do NOT generate trivial or obvious questions
- Each RFI must reference a SPECIFIC section, detail, or page from the documents
- Do NOT duplicate existing RFIs listed above
- Write questions as a professional PM would — formal but clear
- Critical = blocks work, High = needed soon, Medium = needed before that phase, Low = clarification
- Be thorough — these RFIs protect the contractor from scope disputes and change orders` }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI analysis failed: ${errText}`);
    }
    const aiResult = await aiResponse.json();
    const responseText = aiResult.content[0]?.text || "{}";

    let analysis;
    try {
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      return { rfisGenerated: 0, message: "AI returned unparseable results. Try again.", raw: responseText.slice(0, 500) };
    }

    // 7. Create RFIs
    let created = 0;
    const createdRfis: Array<{ number: number; subject: string; priority: string }> = [];
    for (const rfi of (analysis.rfis || [])) {
      // Skip if similar RFI already exists
      const isDuplicate = existingSubjects.some((s: string) => {
        const subjectLower = (rfi.subject || "").toLowerCase();
        return s.length > 10 && (s.includes(subjectLower.slice(0, 30)) || subjectLower.includes(s.slice(0, 30)));
      });
      if (isDuplicate) continue;

      try {
        // Find matching contact for assignee
        let assignedTo = rfi.suggestedAssignee || "";
        if (contacts?.length && rfi.suggestedAssignee) {
          const match = contacts.find((c: any) =>
            (c.role || "").toLowerCase().includes(rfi.suggestedAssignee.toLowerCase()) ||
            rfi.suggestedAssignee.toLowerCase().includes((c.role || "").toLowerCase())
          );
          if (match) assignedTo = `${(match as any).firstName} ${(match as any).lastName || ""}`.trim();
        }

        await ctx.runMutation(a.rfis.create, {
          companyId: args.companyId,
          projectId: args.projectId,
          subject: `[AI] ${rfi.subject}`,
          question: `${rfi.question}\n\n📄 Source: ${rfi.sourceDocument || "Project Documents"}\n🏷️ Category: ${rfi.category || "General"}`,
          priority: rfi.priority || "Medium",
          assignedTo,
          costImpact: rfi.costImpact || false,
          scheduleImpact: rfi.scheduleImpact || false,
          notes: `Auto-generated by AI RFI Generator. Source document: ${rfi.sourceDocument || "Multiple"}`,
        });
        created++;
        createdRfis.push({ number: (existingRfis?.length || 0) + created, subject: rfi.subject, priority: rfi.priority || "Medium" });
      } catch {}
    }

    return {
      rfisGenerated: created,
      documentsAnalyzed: docContents.length,
      summary: analysis.summary || "",
      rfis: createdRfis,
      message: created > 0
        ? `Generated ${created} RFIs from ${docContents.length} documents. Review them in the RFI module.`
        : "No new RFIs needed — documents look clean or all issues already have existing RFIs.",
    };
  },
});
