"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// ── Analyze a single email ──
export const analyzeEmail = action({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const email = await ctx.runQuery(a.emailIntelHelpers.getEmail, { id: args.emailId });
    if (!email) throw new Error("Email not found");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You analyze construction project emails for tone, risks, and action items. Return JSON only:
{
  "tone": "collaborative|neutral|tense|adversarial|urgent|threatening",
  "toneScore": <1-10, 1=hostile, 10=friendly>,
  "summary": "<1-2 sentence summary>",
  "actionItems": ["<action item 1>", ...],
  "riskFlags": ["<risk flag>", ...],
  "deadlinesMentioned": ["<deadline>", ...],
  "keyPeople": ["<name - role>", ...],
  "sentiment": "positive|neutral|negative",
  "escalationLevel": "none|low|medium|high|critical",
  "categories": ["<dispute|delay|payment|safety|quality|schedule|scope|change_order|claim|legal>"]
}

Risk flags to watch for:
- Legal language ("pursuant to", "in accordance with", "hereby notify")
- Blame language ("your failure to", "neglected", "unacceptable")
- Payment disputes ("unpaid", "withhold", "lien", "retainage")
- Schedule threats ("liquidated damages", "delay claim", "time extension")
- Scope disputes ("not in contract", "extra work", "change order required")
- Safety escalation ("violation", "OSHA", "stop work")
- Relationship deterioration (tone shift from prior emails)`,
        messages: [{
          role: "user",
          content: `From: ${email.from}\nTo: ${email.to || ""}\nCC: ${email.cc || ""}\nSubject: ${email.subject}\nDate: ${email.date}\n\n${email.body || email.bodyPreview || "(no body)"}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const aiText = result.content[0]?.text ?? "";

    let parsed;
    try {
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || [null, aiText];
      parsed = JSON.parse(jsonMatch[1] || aiText);
    } catch {
      parsed = { tone: "neutral", summary: "Could not analyze.", actionItems: [], riskFlags: [] };
    }

    // Save analysis to email
    await ctx.runMutation(a.emailIntelHelpers.updateEmailAI, {
      id: args.emailId,
      aiTone: parsed.tone || "neutral",
      aiRiskFlags: parsed.riskFlags || [],
      aiActionItems: parsed.actionItems || [],
      aiSummary: parsed.summary || "",
    });

    return parsed;
  },
});

// ── Analyze ALL project emails + generate communication health report ──
export const analyzeProjectComms = action({
  args: { companyId: v.string(), projectId: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const allEmails = await ctx.runQuery(a.emails.list, { companyId: args.companyId });
    const projectEmails = (allEmails as any[]).filter((e: any) => e.projectId === args.projectId);

    if (projectEmails.length === 0) {
      return { error: "No emails found for this project", commsHealth: 0 };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // Build email digest
    const digest = projectEmails.map((e: any, i: number) =>
      `--- Email ${i + 1} ---\nFrom: ${e.from}\nTo: ${e.to || ""}\nDate: ${e.date}\nSubject: ${e.subject}\n${(e.body || e.bodyPreview || "").slice(0, 500)}`
    ).join("\n\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: `You are OpsSlate's Communication Intelligence Engine. You analyze ALL project correspondence to assess project health, relationships, and predict problems.

Return JSON:
{
  "communicationHealth": <0-100>,
  "overallTone": "collaborative|professional|tense|adversarial",
  "toneTrajectory": "improving|stable|deteriorating",
  "summary": "<3-4 sentence project communication summary>",
  "keyRelationships": [
    {"parties": "<party A → party B>", "status": "healthy|strained|hostile", "issue": "<if any>"}
  ],
  "riskAlerts": [
    {"severity": "critical|high|medium|low", "alert": "<what's happening>", "evidence": "<quote or reference>", "recommendation": "<what to do>"}
  ],
  "openActionItems": ["<action item from emails>", ...],
  "unresolvedIssues": ["<issue still open>", ...],
  "paymentStatus": "<assessment of payment situation if discussed>",
  "disputeRisk": "none|low|medium|high|imminent",
  "claimExposure": "<assessment of potential claims>",
  "recommendations": [
    {"priority": 1, "action": "<what to do>", "reason": "<why>"}
  ],
  "emailVolumeTrend": "increasing|stable|decreasing",
  "responseTimeAssessment": "<how responsive are parties>",
  "patterns": ["<notable pattern>", ...]
}`,
        messages: [{
          role: "user",
          content: `Analyze these ${projectEmails.length} project emails:\n\n${digest.slice(0, 15000)}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const aiText = result.content[0]?.text ?? "";

    let parsed;
    try {
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || [null, aiText];
      parsed = JSON.parse(jsonMatch[1] || aiText);
    } catch {
      parsed = { communicationHealth: 50, summary: "Could not analyze.", riskAlerts: [], recommendations: [] };
    }

    // Also analyze individual emails that haven't been analyzed yet
    for (const email of projectEmails) {
      if (!(email as any).aiTone && (email as any).body) {
        try {
          await ctx.runAction(a.emailIntel.analyzeEmail, { emailId: (email as any)._id });
        } catch { /* skip individual failures */ }
      }
    }

    return parsed;
  },
});
