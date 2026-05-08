"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const pushToRiskRegister = action({
  args: { analysisId: v.id("contractAnalysis") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const analysis = await ctx.runQuery(a.contractAnalysis.getById, { id: args.analysisId });
    if (!analysis || analysis.status !== "complete") throw new Error("Analysis not complete");

    let count = 0;

    // Add risks
    for (const risk of analysis.risks ?? []) {
      await ctx.runMutation(a.risks.create, {
        projectId: analysis.projectId,
        description: String(risk.risk ?? ""),
        probability: risk.severity ?? "Medium",
        impact: risk.severity ?? "Medium",
      });
      count++;
    }

    // Add insurance requirements
    for (const ins of analysis.insuranceRequirements ?? []) {
      await ctx.runMutation(a.risks.create, {
        projectId: analysis.projectId,
        description: `Insurance: ${String(ins.requirement ?? "")}${ins.limit ? " — " + String(ins.limit) : ""}`,
        probability: "Medium",
        impact: "High",
        mitigation: "Verify coverage meets requirements",
      });
      count++;
    }

    // Add critical dates
    for (const d of analysis.criticalDates ?? []) {
      await ctx.runMutation(a.risks.create, {
        projectId: analysis.projectId,
        description: `Critical Date: ${String(d.description ?? "")} — ${String(d.date ?? "")}`,
        probability: "High",
        impact: "High",
        mitigation: "Track in calendar",
      });
      count++;
    }

    // Add milestones
    for (const m of analysis.schedulingMilestones ?? []) {
      await ctx.runMutation(a.risks.create, {
        projectId: analysis.projectId,
        description: `Milestone: ${String(m.milestone ?? "")}${m.date ? " — " + String(m.date) : ""}`,
        probability: "Medium",
        impact: "Medium",
        mitigation: "Monitor schedule",
      });
      count++;
    }

    return { count };
  },
});
