"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const analyze = action({
  args: {
    analysisId: v.id("contractAnalysis"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const prompt = `Analyze this construction contract/project document. Extract and return a JSON object with these exact fields:

{
  "summary": "2-3 paragraph project summary including scope, parties involved, contract value if mentioned, and key terms",
  "insuranceRequirements": [{"requirement": "description", "limit": "$X,XXX,XXX"}],
  "criticalDates": [{"date": "YYYY-MM-DD or description", "description": "what happens"}],
  "schedulingMilestones": [{"milestone": "description", "date": "YYYY-MM-DD or TBD"}],
  "risks": [{"risk": "description of risk", "severity": "High/Medium/Low"}]
}

Be thorough. For insurance, look for GL, auto, workers comp, umbrella, professional liability, etc. For dates, look for notice to proceed, substantial completion, final completion, liquidated damages dates, submittal deadlines, etc. For risks, identify liquidated damages, penalty clauses, indemnification, weather delays, permit issues, change order restrictions, etc.

Return ONLY valid JSON, no markdown or explanation.

Document text:
${args.text.slice(0, 100000)}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      await ctx.runMutation(a.contractAnalysis.updateAnalysis, {
        id: args.analysisId,
        status: "error",
        summary: `Analysis failed: ${err}`,
      });
      throw new Error(`AI analysis failed: ${err}`);
    }

    const data = await res.json();
    const content = data.content?.[0]?.text ?? "";

    let parsed;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      await ctx.runMutation(a.contractAnalysis.updateAnalysis, {
        id: args.analysisId,
        status: "error",
        summary: "Failed to parse AI response. Raw: " + content.slice(0, 500),
      });
      return;
    }

    await ctx.runMutation(a.contractAnalysis.updateAnalysis, {
      id: args.analysisId,
      summary: parsed.summary ?? "No summary generated",
      insuranceRequirements: (parsed.insuranceRequirements ?? []).map((r: any) => ({
        requirement: String(r.requirement ?? ""),
        limit: r.limit ? String(r.limit) : undefined,
      })),
      criticalDates: (parsed.criticalDates ?? []).map((d: any) => ({
        date: String(d.date ?? ""),
        description: String(d.description ?? ""),
      })),
      schedulingMilestones: (parsed.schedulingMilestones ?? []).map((m: any) => ({
        milestone: String(m.milestone ?? ""),
        date: m.date ? String(m.date) : undefined,
      })),
      risks: (parsed.risks ?? []).map((r: any) => ({
        risk: String(r.risk ?? ""),
        severity: r.severity ? String(r.severity) : undefined,
      })),
      status: "complete",
    });

    // Auto-add extracted risks to the Risk Register
    const analysis = await ctx.runQuery(a.contractAnalysis.getById, { id: args.analysisId });
    if (analysis) {
      const severityToImpact: Record<string, string> = { High: "High", Medium: "Medium", Low: "Low" };
      const severityToProb: Record<string, string> = { High: "High", Medium: "Medium", Low: "Low" };

      for (const risk of parsed.risks ?? []) {
        await ctx.runMutation(a.risks.create, {
          projectId: analysis.projectId,
          description: String(risk.risk ?? ""),
          probability: severityToProb[risk.severity] ?? "Medium",
          impact: severityToImpact[risk.severity] ?? "Medium",
          mitigation: undefined,
          owner: undefined,
        });
      }

      // Also add insurance requirements as risks
      for (const ins of parsed.insuranceRequirements ?? []) {
        await ctx.runMutation(a.risks.create, {
          projectId: analysis.projectId,
          description: `Insurance: ${String(ins.requirement ?? "")}${ins.limit ? " — " + String(ins.limit) : ""}`,
          probability: "Medium",
          impact: "High",
          mitigation: "Verify coverage meets requirements",
          owner: undefined,
        });
      }

      // Add critical dates as risks
      for (const d of parsed.criticalDates ?? []) {
        await ctx.runMutation(a.risks.create, {
          projectId: analysis.projectId,
          description: `Critical Date: ${String(d.description ?? "")} — ${String(d.date ?? "")}`,
          probability: "High",
          impact: "High",
          mitigation: "Track in calendar",
          owner: undefined,
        });
      }

      // Add milestones as risks
      for (const m of parsed.schedulingMilestones ?? []) {
        await ctx.runMutation(a.risks.create, {
          projectId: analysis.projectId,
          description: `Milestone: ${String(m.milestone ?? "")}${m.date ? " — " + String(m.date) : ""}`,
          probability: "Medium",
          impact: "Medium",
          mitigation: "Monitor schedule",
          owner: undefined,
        });
      }
    }
  },
});
