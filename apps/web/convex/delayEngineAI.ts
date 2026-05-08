"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const runPrediction = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    // Gather all project data
    const data = await ctx.runQuery(a.delayEngine.gatherProjectIntelligence, { projectId: args.projectId });
    if (!data || !data.project) throw new Error("Project not found");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const today = new Date().toISOString().slice(0, 10);

    // Build intelligence report
    const intel = buildIntelligenceReport(data, today);

    const systemPrompt = `You are OpsSlate's Predictive Delay Engine — an advanced AI system that analyzes construction project data to predict delays BEFORE they happen.

You have access to REAL project data including tasks, crew, RFIs, submittals, deliveries, change orders, budget, time tracking, weather, safety incidents, daily logs, and bid line items.

Analyze ALL data holistically. Look for:
1. SCHEDULE RISKS: Tasks behind schedule, missing dates, dependency chains at risk
2. RFI BOTTLENECKS: Open RFIs aging → blocking downstream work
3. SUBMITTAL DELAYS: Pending submittals → can't order materials → can't install
4. CREW GAPS: Understaffed trades, crew arriving late, trade conflicts
5. MATERIAL/DELIVERY RISKS: Late deliveries blocking critical path
6. BUDGET OVERRUNS: Cost trends indicating scope issues or rework
7. WEATHER IMPACTS: Upcoming weather affecting scheduled outdoor work
8. CHANGE ORDER CASCADES: Pending COs affecting schedule and budget
9. SAFETY CONCERNS: Incidents trending up → potential shutdowns
10. PRODUCTIVITY TRENDS: Daily log patterns showing declining output

Return JSON (no markdown, just raw JSON):
{
  "overallRisk": "low|medium|high|critical",
  "predictedDelayDays": <number>,
  "confidence": <0-100>,
  "summary": "<2-3 sentence executive summary>",
  "predictions": [
    {
      "item": "<what will be delayed>",
      "currentDate": "<scheduled date>",
      "predictedDate": "<predicted actual date>",
      "delayDays": <number>,
      "probability": <0-100>,
      "cause": "<root cause>",
      "category": "schedule|rfi|submittal|crew|material|budget|weather|safety|change_order",
      "impact": "critical|high|medium|low",
      "cascadeEffect": "<what downstream work is affected>"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "action": "<specific action to take>",
      "impact": "<what this prevents>",
      "deadline": "<when this must be done by>",
      "owner": "<who should do this>",
      "savesDelayDays": <number>
    }
  ],
  "riskFactors": [
    {
      "factor": "<risk factor name>",
      "severity": "critical|high|medium|low",
      "trend": "worsening|stable|improving",
      "detail": "<explanation>"
    }
  ],
  "metrics": {
    "scheduleHealth": <0-100>,
    "budgetHealth": <0-100>,
    "crewCoverage": <0-100>,
    "rfiVelocity": "<avg days to close>",
    "submittalVelocity": "<avg days to approve>",
    "productivityTrend": "up|flat|down"
  }
}`;

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
        system: systemPrompt,
        messages: [{ role: "user", content: intel }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API error: ${await response.text()}`);
    const result = await response.json();
    const aiText = result.content[0]?.text ?? "";

    // Parse JSON
    let parsed;
    try {
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || [null, aiText];
      parsed = JSON.parse(jsonMatch[1] || aiText);
    } catch {
      parsed = { overallRisk: "medium", predictedDelayDays: 0, confidence: 0, summary: aiText, predictions: [], recommendations: [], riskFactors: [], metrics: {} };
    }

    // Save prediction
    await ctx.runMutation(a.delayEngine.savePrediction, {
      projectId: args.projectId,
      companyId: data.project.companyId,
      generatedAt: Date.now(),
      overallRisk: parsed.overallRisk || "medium",
      predictedDelayDays: parsed.predictedDelayDays || 0,
      confidence: parsed.confidence || 50,
      predictions: parsed.predictions || [],
      recommendations: parsed.recommendations || [],
      rawAnalysis: JSON.stringify(parsed),
    });

    return parsed;
  },
});

function buildIntelligenceReport(data: any, today: string): string {
  const p = data.project;
  let report = `# PROJECT INTELLIGENCE REPORT — ${p.name}\nDate: ${today}\n`;
  report += `Contract Date: ${p.contractDate || "Not set"}\n`;
  report += `Address: ${p.address || "N/A"}, ${p.city || ""} ${p.state || ""}\n`;
  report += `Status: ${p.status || "Active"}\n\n`;

  // Tasks
  report += `## TASKS & SCHEDULE (${data.tasks.length} tasks)\n`;
  for (const t of data.tasks) {
    const overdue = t.dateScheduled && t.dateScheduled < today && t.status !== "Complete";
    report += `- [${t.status || "Open"}] ${t.task}${t.customTask ? ` — ${t.customTask}` : ""} | Scheduled: ${t.dateScheduled || "TBD"} | Complete: ${t.dateComplete || "N/A"} ${overdue ? "⚠️ OVERDUE" : ""}\n`;
  }

  // Crew
  report += `\n## CREW (${data.crew.length} members)\n`;
  const tradeCount: Record<string, number> = {};
  for (const c of data.crew) {
    tradeCount[c.trade || "Unassigned"] = (tradeCount[c.trade || "Unassigned"] || 0) + 1;
    report += `- ${c.firstName} ${c.lastName || ""} | ${c.trade || "N/A"} | Start: ${c.startDate || "TBD"} | End: ${c.endDate || "TBD"}\n`;
  }
  report += `Trades: ${JSON.stringify(tradeCount)}\n`;

  // RFIs
  report += `\n## RFIs (${data.rfis.length} total)\n`;
  const openRfis = data.rfis.filter((r: any) => r.status === "Open" || r.status === "In Review");
  report += `Open: ${openRfis.length}\n`;
  for (const r of data.rfis) {
    const age = r.dateSubmitted ? Math.floor((Date.now() - new Date(r.dateSubmitted).getTime()) / 86400000) : 0;
    report += `- [${r.status}] RFI-${r.number || "?"}: ${r.subject || r.question || "N/A"} | Age: ${age} days | Due: ${r.dueDate || "N/A"} ${r.costImpact ? "💰 COST IMPACT" : ""} ${r.scheduleImpact ? "📅 SCHEDULE IMPACT" : ""}\n`;
  }

  // Submittals
  report += `\n## SUBMITTALS (${data.submittals.length} total)\n`;
  const pendingSubs = data.submittals.filter((s: any) => s.status === "Pending" || s.status === "In Review");
  report += `Pending: ${pendingSubs.length}\n`;
  for (const s of data.submittals) {
    report += `- [${s.status}] SUB-${s.number || "?"}: ${s.title || "N/A"} | Spec: ${s.specSection || "N/A"} | Due: ${s.dueDate || "N/A"}\n`;
  }

  // Deliveries
  report += `\n## DELIVERIES (${data.deliveries.length} total)\n`;
  for (const d of data.deliveries) {
    const late = d.expectedDate && d.expectedDate < today && d.status !== "Delivered";
    report += `- [${d.status || "Pending"}] ${d.material || d.description || "N/A"} | Expected: ${d.expectedDate || "TBD"} ${late ? "⚠️ LATE" : ""}\n`;
  }

  // Concrete Pours
  report += `\n## CONCRETE POURS (${data.pours.length} total)\n`;
  for (const p2 of data.pours) {
    report += `- [${p2.status || "Scheduled"}] ${p2.location || "N/A"} | Date: ${p2.pourDate || "TBD"} | Yards: ${p2.cubicYards || "N/A"}\n`;
  }

  // Change Orders
  report += `\n## CHANGE ORDERS (${data.changeOrders.length} total)\n`;
  const pendingCOs = data.changeOrders.filter((c: any) => c.status === "Pending" || c.status === "Under Review");
  report += `Pending: ${pendingCOs.length}\n`;
  for (const c of data.changeOrders) {
    report += `- [${c.status}] CO-${c.number || "?"}: ${c.title || c.description || "N/A"} | Amount: $${c.amount || 0} | Schedule Impact: ${c.scheduleDays || 0} days\n`;
  }

  // Budget
  report += `\n## BUDGET (${data.budgetItems.length} line items)\n`;
  let totalBudget = 0, totalActual = 0;
  for (const b of data.budgetItems) {
    totalBudget += b.budgeted || 0;
    totalActual += b.actual || 0;
  }
  report += `Total Budget: $${totalBudget} | Total Actual: $${totalActual} | Variance: $${totalBudget - totalActual}\n`;
  const overBudget = data.budgetItems.filter((b: any) => (b.actual || 0) > (b.budgeted || 0));
  if (overBudget.length) {
    report += `⚠️ OVER BUDGET ITEMS:\n`;
    for (const b of overBudget) {
      report += `  - ${b.costCode}: ${b.description} | Budget: $${b.budgeted} | Actual: $${b.actual} | Over by: $${(b.actual || 0) - (b.budgeted || 0)}\n`;
    }
  }

  // Bid items
  if (data.bidItems.length) {
    report += `\n## BID LINE ITEMS (${data.bidItems.length})\n`;
    let totalBid = 0;
    for (const bi of data.bidItems) {
      totalBid += bi.bidAmount || 0;
      if (bi.actual && bi.actual > bi.bidAmount) {
        report += `⚠️ OVER BID: ${bi.description} | Bid: $${bi.bidAmount} | Actual: $${bi.actual}\n`;
      }
    }
    report += `Total Bid: $${totalBid}\n`;
  }

  // Time Tracking
  report += `\n## TIME TRACKING (${data.timeEntries.length} entries)\n`;
  const totalHours = data.timeEntries.reduce((s: number, t: any) => s + (t.regularHours || 0) + (t.overtimeHours || 0), 0);
  const otHours = data.timeEntries.reduce((s: number, t: any) => s + (t.overtimeHours || 0), 0);
  report += `Total Hours: ${totalHours} | OT Hours: ${otHours} (${totalHours > 0 ? ((otHours / totalHours) * 100).toFixed(1) : 0}% OT)\n`;

  // Punch List
  report += `\n## PUNCH LIST (${data.punchItems.length} items)\n`;
  const openPunch = data.punchItems.filter((p2: any) => p2.status === "Open" || p2.status === "In Progress");
  report += `Open: ${openPunch.length} | Total: ${data.punchItems.length}\n`;

  // Daily Logs
  report += `\n## DAILY LOGS (${data.dailyLogs.length} logs)\n`;
  const recentLogs = data.dailyLogs.slice(-5);
  for (const l of recentLogs) {
    report += `- ${l.date}: ${(l.workPerformed || l.description || "").slice(0, 100)}...\n`;
  }
  if (data.dailyLogs.length === 0) report += `⚠️ NO DAILY LOGS — cannot assess productivity trends\n`;

  // Safety
  report += `\n## SAFETY INCIDENTS (${data.incidents.length})\n`;
  const openIncidents = data.incidents.filter((i: any) => i.status !== "Closed");
  report += `Open: ${openIncidents.length}\n`;
  for (const i of data.incidents) {
    report += `- [${i.status}] ${i.type || "Incident"}: ${i.description || "N/A"} | Severity: ${i.severity || "N/A"}\n`;
  }

  // Weather
  if (data.weatherAlerts.length) {
    report += `\n## WEATHER ALERTS (${data.weatherAlerts.length})\n`;
    for (const w of data.weatherAlerts) {
      report += `- ${w.date}: ${w.type} — ${w.message || "N/A"}\n`;
    }
  }

  report += `\n## ANALYSIS REQUEST\nBased on ALL the above data, predict delays, identify risks, and provide specific actionable recommendations. Be specific with dates, numbers, and responsible parties. Every prediction must cite the data that supports it.`;

  return report;
}
