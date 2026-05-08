"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// ── AI Construction Lawyer ──
export const askLegal = action({
  args: {
    companyId: v.string(),
    projectId: v.optional(v.string()),
    question: v.string(),
    state: v.optional(v.string()),
    category: v.optional(v.string()),
    contractContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const a = (await import("./_generated/api")).api as any;

    // Get project context if available
    let projectContext = "";
    if (args.projectId) {
      try {
        const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
        if (project) projectContext = `Project: ${(project as any).name}, Location: ${(project as any).address || (project as any).location || "Unknown"}`;
      } catch { /* skip */ }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: `You are OpsSlate's AI Construction Law Assistant. You have deep knowledge of:
- Construction contract law (AIA, ConsensusDocs, custom contracts)
- Mechanic's lien laws (state-specific)
- Prompt payment acts (federal and state)
- OSHA regulations and safety compliance
- Change order disputes and claims
- Delay claims and liquidated damages
- Subcontractor disputes and back-charges
- Bid protests and procurement law
- Insurance and bonding requirements
- ADA compliance in construction
- Environmental regulations (EPA, state DEQ)
- Labor law (prevailing wage, Davis-Bacon)

${args.state ? `The user is in ${args.state}. Reference ${args.state}-specific laws when relevant.` : "Ask what state they're in if state-specific law matters."}
${projectContext ? `Project context: ${projectContext}` : ""}
${args.contractContext ? `Contract context: ${args.contractContext}` : ""}

Format your response as JSON:
{
  "summary": "<2-3 sentence plain English answer>",
  "analysis": "<detailed legal analysis with specific references>",
  "relevantLaws": [{"name": "<law/statute name>", "reference": "<citation>", "relevance": "<how it applies>"}],
  "recommendedActions": [{"priority": 1, "action": "<what to do>", "deadline": "<if time-sensitive>", "reason": "<why>"}],
  "documentsNeeded": ["<document type>"],
  "risks": ["<risk to be aware of>"],
  "estimatedExposure": "<potential financial exposure if applicable>",
  "needsAttorney": <true/false>,
  "attorneyReason": "<why they need a real attorney if true>"
}

IMPORTANT: Always include this disclaimer in your summary: "This is AI-assisted guidance, not legal advice. Consult a licensed attorney for legal decisions."`,
        messages: [{ role: "user", content: args.question }],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const aiText = result.content[0]?.text ?? "";

    try {
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || [null, aiText];
      return JSON.parse(jsonMatch[1] || aiText);
    } catch {
      return { summary: aiText, analysis: aiText, relevantLaws: [], recommendedActions: [], documentsNeeded: [], risks: [], needsAttorney: true, attorneyReason: "Could not parse structured response" };
    }
  },
});

// ── Document Generator ──
export const generateDocument = action({
  args: {
    templateType: v.string(),
    details: v.string(),
    state: v.optional(v.string()),
    projectName: v.optional(v.string()),
    parties: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const templates: Record<string, string> = {
      "notice_delay": "Notice of Delay — formally notify the owner/GC of a delay event, reference contract clause, describe impact, request time extension",
      "change_order_dispute": "Change Order Dispute Letter — dispute a rejected or undervalued change order, cite contract terms, document extra work performed",
      "lien_notice": "Preliminary Lien Notice / Notice to Owner — protect your lien rights, include all required statutory information",
      "backcharge_notice": "Backcharge Notice — notify subcontractor of defective work and intent to backcharge, document deficiencies",
      "stop_work": "Stop Work Notice — formally notify of conditions requiring work stoppage (safety, payment, disputes)",
      "demand_payment": "Demand for Payment — formal demand letter for unpaid invoices, reference prompt payment act",
      "cure_notice": "Notice to Cure — notify party of contract breach and demand correction within specified period",
      "claim_letter": "Construction Claim Letter — formal claim for additional compensation or time, document entitlement",
      "rfi_escalation": "RFI Escalation Letter — escalate unanswered RFIs that are causing delays",
      "substantial_completion": "Notice of Substantial Completion — formally notify that project has reached substantial completion",
    };

    const templateDesc = templates[args.templateType] || args.templateType;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: `You are a construction document drafting assistant. Generate a professional, legally-informed construction document.

Template: ${templateDesc}
${args.state ? `State: ${args.state}` : ""}
${args.projectName ? `Project: ${args.projectName}` : ""}
${args.parties ? `Parties: ${args.parties}` : ""}

Return JSON:
{
  "title": "<document title>",
  "document": "<full formatted document text with [BRACKETS] for fields the user needs to fill in>",
  "instructions": ["<instruction for using this document>"],
  "warnings": ["<legal warning or consideration>"],
  "sendVia": "<recommended delivery method (certified mail, email, hand delivery)>"
}

Include proper letterhead format, date, reference lines, and signature blocks. Use formal legal language appropriate for construction.
Always include: "This document was drafted with AI assistance. Have it reviewed by legal counsel before sending."`,
        messages: [{ role: "user", content: args.details }],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const aiText = result.content[0]?.text ?? "";

    try {
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || [null, aiText];
      return JSON.parse(jsonMatch[1] || aiText);
    } catch {
      return { title: args.templateType, document: aiText, instructions: [], warnings: ["Could not parse structured response"], sendVia: "Review with attorney" };
    }
  },
});

// ── Building Code Checker ──
export const checkCode = action({
  args: {
    query: v.string(),
    codeType: v.optional(v.string()),
    state: v.optional(v.string()),
    occupancyType: v.optional(v.string()),
    constructionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: `You are OpsSlate's Building Code AI. You have deep knowledge of:
- International Building Code (IBC) 2021/2024
- International Residential Code (IRC)
- National Electrical Code (NEC/NFPA 70)
- National Fire Protection Association (NFPA)
- International Plumbing Code (IPC)
- International Mechanical Code (IMC)
- International Energy Conservation Code (IECC)
- ADA/ICC A117.1 Accessibility Standards
- OSHA Construction Standards (29 CFR 1926)
${args.state ? `- ${args.state} state amendments and local codes` : ""}
${args.occupancyType ? `- Occupancy Type: ${args.occupancyType}` : ""}
${args.constructionType ? `- Construction Type: ${args.constructionType}` : ""}

Code type focus: ${args.codeType || "General building code"}

Return JSON:
{
  "summary": "<plain English answer>",
  "relevantCodes": [
    {"code": "<code name>", "section": "<section number>", "requirement": "<what it requires>", "details": "<specifics>"}
  ],
  "requirements": [
    {"category": "<structural|fire|electrical|plumbing|mechanical|accessibility|egress|energy>", "requirement": "<specific requirement>", "reference": "<code reference>"}
  ],
  "commonViolations": ["<common violation related to this topic>"],
  "inspectionChecklist": ["<what inspector will check>"],
  "tips": ["<practical tip for compliance>"],
  "disclaimer": "Code requirements vary by jurisdiction. Always verify with your local building department."
}`,
        messages: [{ role: "user", content: args.query }],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const aiText = result.content[0]?.text ?? "";

    try {
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || [null, aiText];
      return JSON.parse(jsonMatch[1] || aiText);
    } catch {
      return { summary: aiText, relevantCodes: [], requirements: [], commonViolations: [], inspectionChecklist: [], tips: [] };
    }
  },
});
