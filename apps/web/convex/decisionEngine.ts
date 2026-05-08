"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// The Decision Engine learns from company patterns and makes autonomous choices
export const analyze = action({
  args: {
    companyId: v.id("companies"),
    trigger: v.string(), // "scheduled" | "manual" | "event"
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // 1. Gather ALL historical data — this is how the system learns
    const projects = await ctx.runQuery(a.projects.list, { companyId: args.companyId });
    const activeProjects = (projects || []).filter((p: any) => p.status !== "Inactive" && p.status !== "Archived");
    const allPms = await ctx.runQuery(a.aiPm.list, { companyId: args.companyId });

    // Decision history — learn from past patterns
    let decisionLog: any[] = [];
    try { decisionLog = await ctx.runQuery(a.decisionLog.list, { companyId: args.companyId as string }); } catch {}

    // Gather patterns across all projects
    const patterns: any = {
      projects: [],
      rfis: { total: 0, avgResponseDays: 0, commonTypes: new Map() },
      changeOrders: { total: 0, approvalRate: 0, avgAmount: 0 },
      tasks: { total: 0, completionRate: 0, avgDaysToComplete: 0, overdueRate: 0 },
      deliveries: { total: 0, onTimeRate: 0 },
      budgets: { totalBudgeted: 0, totalActual: 0, avgVariance: 0 },
      crew: { total: 0, avgPerProject: 0 },
      emails: { total: 0, avgPerProject: 0 },
    };

    let allRfis: any[] = [];
    let allCOs: any[] = [];
    let allTasks: any[] = [];
    let allDeliveries: any[] = [];
    let allBudgets: any[] = [];
    let allEmails: any[] = [];

    for (const p of activeProjects) {
      let rfis: any[] = [];
      try { rfis = await ctx.runQuery(a.rfis.list, { projectId: p._id, companyId: args.companyId }) || []; } catch {}
      let cos: any[] = [];
      try { cos = await ctx.runQuery(a.changeOrders.list, { projectId: p._id }) || []; } catch {}
      let tasks: any[] = [];
      try { tasks = await ctx.runQuery(a.tasks.list, { projectId: p._id }) || []; } catch {}
      let deliveries: any[] = [];
      try { deliveries = await ctx.runQuery(a.deliveries.list, { projectId: p._id }) || []; } catch {}
      let budget: any[] = [];
      try { budget = await ctx.runQuery(a.budget.list, { projectId: p._id }) || []; } catch {}

      allRfis.push(...rfis.map((r: any) => ({ ...r, projectName: p.name })));
      allCOs.push(...cos.map((c: any) => ({ ...c, projectName: p.name })));
      allTasks.push(...tasks.map((t: any) => ({ ...t, projectName: p.name })));
      allDeliveries.push(...deliveries.map((d: any) => ({ ...d, projectName: p.name })));
      allBudgets.push(...budget.map((b: any) => ({ ...b, projectName: p.name })));

      patterns.projects.push({
        name: p.name,
        rfis: rfis.length,
        cos: cos.length,
        tasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.status === "Complete").length,
        overdueTasks: tasks.filter((t: any) => t.dateScheduled && t.status !== "Complete" && t.dateScheduled < new Date().toISOString().slice(0, 10)).length,
        budget: budget.reduce((s: number, b: any) => s + (b.budgeted || 0), 0),
        spent: budget.reduce((s: number, b: any) => s + (b.actual || 0), 0),
      });
    }

    // Calculate pattern metrics
    patterns.rfis.total = allRfis.length;
    patterns.changeOrders.total = allCOs.length;
    patterns.changeOrders.approvalRate = allCOs.length > 0 ? Math.round((allCOs.filter((c: any) => c.status === "Approved").length / allCOs.length) * 100) : 0;
    patterns.tasks.total = allTasks.length;
    patterns.tasks.completionRate = allTasks.length > 0 ? Math.round((allTasks.filter((t: any) => t.status === "Complete").length / allTasks.length) * 100) : 0;
    patterns.tasks.overdueRate = allTasks.length > 0 ? Math.round((allTasks.filter((t: any) => t.dateScheduled && t.status !== "Complete" && t.dateScheduled < new Date().toISOString().slice(0, 10)).length / allTasks.length) * 100) : 0;
    patterns.budgets.totalBudgeted = allBudgets.reduce((s: number, b: any) => s + (b.budgeted || 0), 0);
    patterns.budgets.totalActual = allBudgets.reduce((s: number, b: any) => s + (b.actual || 0), 0);

    // 2. Build the learning context + decision history
    const recentDecisions = decisionLog.slice(-30).map((d: any) =>
      `[${d.date}] ${d.type}: ${d.description} → ${d.outcome} ${d.wasOverridden ? "(USER OVERRODE)" : "(ACCEPTED)"}`
    ).join("\n") || "No decision history yet — this is the first analysis.";

    // 3. Send to Claude for analysis and decisions
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `You are the Decision Intelligence Engine for a construction company. You LEARN from patterns and make autonomous decisions.

YOUR LEARNING DATA:
- ${activeProjects.length} active projects
- ${patterns.tasks.total} tasks tracked (${patterns.tasks.completionRate}% completion rate, ${patterns.tasks.overdueRate}% overdue rate)
- ${patterns.rfis.total} RFIs tracked
- ${patterns.changeOrders.total} change orders (${patterns.changeOrders.approvalRate}% approval rate)
- $${patterns.budgets.totalBudgeted.toLocaleString()} total budgeted, $${patterns.budgets.totalActual.toLocaleString()} spent
- AI PM team: ${allPms?.length || 0} PMs across ${activeProjects.length} projects

DECISION HISTORY (learn from these — what was accepted vs overridden):
${recentDecisions}

PROJECT DATA:
${patterns.projects.map((p: any) => `${p.name}: ${p.tasks} tasks (${p.completedTasks} done, ${p.overdueTasks} overdue), Budget: $${p.budget.toLocaleString()} / $${p.spent.toLocaleString()}, ${p.rfis} RFIs, ${p.cos} COs`).join("\n")}

RULES FOR AUTONOMOUS DECISIONS:
1. LOW RISK = Execute immediately: Reassigning overdue tasks, flagging budget warnings, creating follow-up tasks, scheduling reminders, sending status requests to PMs
2. MEDIUM RISK = Execute + notify: Escalating overdue RFIs, reassigning crew between projects, adjusting task priorities, triggering email scans
3. HIGH RISK = Recommend only (need human approval): Anything involving money, external emails, change orders, contract changes, removing data

When you make decisions, LEARN from the history:
- If the user previously overrode a decision type, be more conservative with that type
- If the user consistently accepts a decision type, be more aggressive with it
- Adapt your thresholds based on the company's actual patterns`,
        messages: [{ role: "user", content: `Analyze the current state and make decisions. Trigger: ${args.trigger}. ${args.context || ""}

Respond with ONLY valid JSON:
{
  "decisions": [
    {
      "type": "auto|notify|recommend",
      "category": "task|rfi|budget|crew|email|schedule|risk",
      "description": "What you decided and why",
      "action": "Specific action taken or recommended",
      "project": "Project name or 'Company-wide'",
      "confidence": 0.0-1.0,
      "reasoning": "Why this decision, citing patterns"
    }
  ],
  "patterns_detected": [
    "Pattern description — what you learned"
  ],
  "risk_assessment": "Overall company risk level and why",
  "recommendations": [
    "Strategic recommendation based on patterns"
  ]
}` }],
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI error: ${await aiResponse.text()}`);
    const result = await aiResponse.json();
    const responseText = result.content[0]?.text || "{}";

    let analysis;
    try {
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      return { decisions: [], error: "Failed to parse analysis" };
    }

    // 4. Execute AUTO decisions immediately
    const executed: any[] = [];
    for (const decision of (analysis.decisions || [])) {
      if (decision.type === "auto" && decision.confidence >= 0.7) {
        // Log the decision
        try {
          await ctx.runMutation(a.decisionLog.create, {
            companyId: args.companyId as string,
            type: decision.category,
            description: decision.description,
            action: decision.action,
            project: decision.project || "Company-wide",
            confidence: decision.confidence,
            outcome: "auto-executed",
            wasOverridden: false,
          });
        } catch {}

        // Execute based on category
        if (decision.category === "task" && decision.action?.includes("create")) {
          // Find the project
          const proj = activeProjects.find((p: any) => decision.project?.includes(p.name));
          if (proj) {
            try {
              await ctx.runMutation(a.tasks.create, {
                projectId: proj._id,
                task: "Other",
                customTask: `🧠 ${decision.description}`,
                status: "Open",
                priority: decision.confidence >= 0.9 ? "High" : "Medium",
                impact: `Auto-created by Decision Engine: ${decision.reasoning || ""}`,
                dateScheduled: new Date().toISOString().slice(0, 10),
              });
              executed.push(decision);
            } catch {}
          }
        }

        if (decision.category === "email" && decision.action?.includes("scan")) {
          // Trigger email scan for a PM
          const proj = activeProjects.find((p: any) => decision.project?.includes(p.name));
          const pm = proj && allPms?.find((pm: any) => pm.projectId === proj._id);
          if (pm && proj) {
            try {
              await ctx.runAction(a.aiPmEmailIntel.scanProjectEmails, {
                pmId: pm._id as string, pmName: pm.name, projectId: proj._id, companyId: args.companyId, personality: pm.personality,
              });
              executed.push(decision);
            } catch {}
          }
        }

        // Delegate to a PM
        if (decision.category === "rfi" || decision.category === "schedule") {
          const proj = activeProjects.find((p: any) => decision.project?.includes(p.name));
          const pm = proj && allPms?.find((pm: any) => pm.projectId === proj._id);
          if (pm && proj) {
            try {
              await ctx.runAction(a.aiPmEngine.chat, {
                pmId: pm._id, projectId: proj._id, companyId: args.companyId,
                pmName: pm.name, personality: pm.personality,
                message: `[AUTO-DIRECTIVE FROM DECISION ENGINE]: ${decision.action}`,
              });
              executed.push(decision);
            } catch {}
          }
        }
      }

      // Log NOTIFY and RECOMMEND decisions too
      if (decision.type === "notify" || decision.type === "recommend") {
        try {
          await ctx.runMutation(a.decisionLog.create, {
            companyId: args.companyId as string,
            type: decision.category,
            description: decision.description,
            action: decision.action,
            project: decision.project || "Company-wide",
            confidence: decision.confidence,
            outcome: decision.type === "notify" ? "notified" : "recommended",
            wasOverridden: false,
          });
        } catch {}
      }
    }

    return {
      decisions: analysis.decisions || [],
      executed: executed.length,
      patterns: analysis.patterns_detected || [],
      risk: analysis.risk_assessment || "",
      recommendations: analysis.recommendations || [],
    };
  },
});
