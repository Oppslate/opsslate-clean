"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

export const runAutopilot = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    // Get config
    const config = await ctx.runQuery(a.autopilotData.getConfig, { projectId: args.projectId });
    if (!config || !config.enabled) return { status: "disabled" };

    // Get project
    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    if (!project) return { status: "project_not_found" };

    // Gather all project data
    const crew = await ctx.runQuery(a.crew.listByCompany, { companyId: project.companyId });
    const projectCrew = (crew ?? []).filter((c: any) => c.projectId === args.projectId);

    const punchItems = await ctx.runQuery(a.punchList.list, { companyId: project.companyId, projectId: args.projectId });
    const changeOrders = await ctx.runQuery(a.changeOrders.list, { companyId: project.companyId, projectId: args.projectId });
    const incidents = await ctx.runQuery(a.incidents.list, { companyId: project.companyId, projectId: args.projectId });
    const dailyLogs = await ctx.runQuery(a.dailyLogs.list, { companyId: project.companyId, projectId: args.projectId });
    const risks = await ctx.runQuery(a.risks.listByProject, { projectId: args.projectId });

    // Get schedule/tasks
    let tasks: any[] = [];
    try { tasks = await ctx.runQuery(a.tasks.list, { projectId: args.projectId }); } catch {}
    
    // Get RFIs and Submittals
    let rfis: any[] = [];
    let submittals: any[] = [];
    try { rfis = await ctx.runQuery(a.rfis.list, { companyId: project.companyId, projectId: args.projectId }); } catch {}
    try { submittals = await ctx.runQuery(a.submittals.list, { companyId: project.companyId, projectId: args.projectId }); } catch {}

    // Get budget data
    let budgetLines: any[] = [];
    try { budgetLines = await ctx.runQuery(a.budgetTracker.getLineItems, { companyId: project.companyId, projectId: args.projectId }); } catch {}

    // Get time entries
    let timeEntries: any[] = [];
    try { timeEntries = await ctx.runQuery(a.timeTracking.list, { companyId: project.companyId, projectId: args.projectId }); } catch {}

    // Get weather if coordinates available
    let weatherData = null;
    if (config.monitorsWeather && project.latitude && project.longitude) {
      try {
        weatherData = await ctx.runAction(a.weather.analyzeWeather, { latitude: project.latitude, longitude: project.longitude });
      } catch (e) {
        console.error("Weather fetch failed:", e);
      }
    }

    // Recent autopilot actions (to avoid duplicates)
    const recentActions = await ctx.runQuery(a.autopilotData.listLogs, { projectId: args.projectId, limit: 20 });

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Build context for AI
    const context = `
PROJECT: ${project.name}
STATUS: ${project.status}
DEADLINE: ${config.deadline ?? "Not set"}
BUDGET: ${config.budget ? "$" + config.budget.toLocaleString() : "Not set"}
GOALS: ${config.projectGoals ?? "Complete on time and budget"}
CONSTRAINTS: ${config.constraints ?? "None specified"}
TODAY: ${today}

SCOPE OF WORK:
${config.scopeOfWork ?? "Not defined — recommend the PM define scope of work for better AI analysis"}

PROJECT PHASES:
${config.phases ?? "Not defined"}
CURRENT PHASE: ${config.currentPhase ?? "Not set"}

MILESTONES:
${config.milestones ?? "Not defined"}

SCHEDULE/TASKS (${tasks.length}):
${tasks.slice(0, 30).map((t: any) => `- ${t.task}${t.customTask ? " (" + t.customTask + ")" : ""} | Status: ${t.status ?? "pending"} | Priority: ${t.priority ?? "med"} | Ordered: ${t.dateOrdered ?? "?"} | Scheduled: ${t.dateScheduled ?? "?"} | Complete: ${t.dateComplete ?? "not done"}`).join("\n")}

RFIS (${rfis.length}, ${rfis.filter((r: any) => r.status === "Open" || r.status === "open").length} open):
${rfis.slice(0, 15).map((r: any) => `- RFI-${r.number ?? "?"} ${r.subject ?? r.question ?? "?"} | ${r.status} | Due: ${r.dateRequired ?? r.responseRequired ?? "?"} | Assigned: ${r.assignedTo ?? r.ballInCourt ?? "?"}`).join("\n")}

SUBMITTALS (${submittals.length}, ${submittals.filter((s: any) => s.status === "Pending").length} pending):
${submittals.slice(0, 15).map((s: any) => `- SUB-${s.number ?? "?"} ${s.title ?? s.description ?? "?"} | ${s.status} | Due: ${s.dueDate ?? s.dateRequired ?? "?"} | Trade: ${s.trade ?? "?"}`).join("\n")}

BUDGET (${budgetLines.length} line items):
${budgetLines.slice(0, 20).map((b: any) => `- ${b.costCode} ${b.description} | Budgeted: $${b.budgeted ?? 0} | Actual: $${b.actual ?? 0} | Variance: $${(b.budgeted ?? 0) - (b.actual ?? 0)}`).join("\n")}

TIME TRACKING (${timeEntries.length} entries, ${timeEntries.reduce((s: number, t: any) => s + (t.hoursRegular ?? 0) + (t.hoursOvertime ?? 0), 0).toFixed(1)} total hours):
${timeEntries.slice(0, 10).map((t: any) => `- ${t.date} ${t.crewMemberName} | ${t.trade ?? "?"} | ${t.hoursRegular ?? 0}hrs + ${t.hoursOvertime ?? 0}OT | ${t.status ?? "pending"}`).join("\n")}

AUTOPILOT CAPABILITIES:
${config.managesCrew ? "✅" : "❌"} Crew Scheduling & Notifications
${config.managesSupplies ? "✅" : "❌"} Supply/Material Ordering Recommendations  
${config.managesSchedule ? "✅" : "❌"} Schedule Optimization
${config.monitorsWeather ? "✅" : "❌"} Weather Monitoring
${config.monitorsSafety ? "✅" : "❌"} Safety Monitoring
${config.autoSendEmails ? "✅" : "❌"} Auto-Send Emails
${config.generatesDailyLogs ? "✅" : "❌"} Generate Daily Log Summaries

CREW (${projectCrew.length}):
${projectCrew.map((c: any) => `- ${c.firstName} ${c.lastName} | ${c.trade} | ${c.status} | Start: ${c.start ?? "?"} | End: ${c.end ?? "?"} | Email: ${c.email ?? "none"}`).join("\n")}

PUNCH LIST (${(punchItems ?? []).length} items, ${(punchItems ?? []).filter((p: any) => p.status === "Open").length} open):
${(punchItems ?? []).slice(0, 20).map((p: any) => `- #${p.number} ${p.title} | ${p.status} | ${p.priority ?? "Med"} | Assigned: ${p.assignedTo ?? "unassigned"} | Due: ${p.dueDate ?? "none"}`).join("\n")}

CHANGE ORDERS (${(changeOrders ?? []).length}, ${(changeOrders ?? []).filter((c: any) => c.status === "Pending" || c.status === "Under Review").length} pending):
${(changeOrders ?? []).slice(0, 10).map((c: any) => `- CO-${c.number} ${c.title} | ${c.status} | Est: $${c.estimatedCost ?? 0} | ${c.scheduleDaysImpact ?? 0} days impact`).join("\n")}

SAFETY INCIDENTS (${(incidents ?? []).length}, ${(incidents ?? []).filter((i: any) => i.status === "Open").length} open):
${(incidents ?? []).slice(0, 10).map((i: any) => `- INC-${i.number} ${i.title} | ${i.severity} | ${i.status} | Open actions: ${i.openActions ?? 0}`).join("\n")}

RISKS (${(risks ?? []).length}):
${(risks ?? []).slice(0, 10).map((r: any) => `- ${r.description} | ${r.probability}/${r.impact} | ${r.status}`).join("\n")}

RECENT DAILY LOGS:
${(dailyLogs ?? []).slice(0, 5).map((l: any) => `- ${l.date}: ${l.totalManpower ?? 0} workers, ${(l.delays as any[])?.length ?? 0} delays, Weather: ${l.weatherCondition ?? "?"}`).join("\n")}

${weatherData ? `WEATHER FORECAST (next 5 days):
${(weatherData as any).forecast.slice(0, 5).map((d: any) => `- ${d.date}: ${d.icon} ${d.condition} | ${d.high}°/${d.low}° | Rain: ${d.precipInches}" (${d.precipProb}%) | Wind: ${d.windMax}mph | Status: ${d.fieldStatus.toUpperCase()} | Alerts: ${d.alerts.length > 0 ? d.alerts.map((a: any) => a.type).join(", ") : "none"}`).join("\n")}` : "WEATHER: Not available (no coordinates)"}

RECENT AI ACTIONS (avoid duplicates):
${recentActions.slice(0, 10).map((a: any) => `- [${a.createdAt.slice(0, 10)}] ${a.category}: ${a.title} (${a.status})`).join("\n")}
`;

    // Call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are an AI Construction Project Manager autopilot. Analyze the project data and generate actionable recommendations and automated actions.

RESPOND IN VALID JSON ONLY. Return an array of action objects:
[
  {
    "type": "auto" | "recommendation" | "alert",
    "category": "crew" | "schedule" | "supplies" | "weather" | "safety" | "budget" | "punch_list" | "change_orders",
    "title": "Brief title",
    "description": "Detailed explanation of what you found",
    "actionTaken": "What action was taken or should be taken (for auto type, describe what you did)",
    "confidence": 0.0-1.0,
    "requiresApproval": true/false,
    "priority": "critical" | "high" | "medium" | "low"
  }
]

RULES:
- "auto" type = actions you're taking automatically (only if the capability is enabled)
- "recommendation" type = suggestions for the PM to review
- "alert" type = urgent issues that need attention
- Be specific and actionable. No generic advice.
- Reference specific crew, dates, punch items, COs by name/number

SCOPE-DRIVEN ANALYSIS (CRITICAL):
- Compare CURRENT PHASE + SCHEDULE against actual progress — flag anything behind
- If scope of work is defined, check if all phases have crew/tasks assigned
- Identify upcoming milestones within 7 days and check readiness
- Flag tasks scheduled but missing prerequisites (submittals not approved, RFIs unanswered)
- Recommend next phase preparation based on scope sequence
- If a phase is completing, recommend closeout actions (punch list, final inspections)

SCHEDULE INTELLIGENCE:
- Cross-reference task schedule dates vs actual completion dates
- Flag tasks with no scheduled date that block upcoming milestones
- Identify critical path items and warn if at risk
- Check if upcoming tasks have required submittals approved
- Check if required RFIs are answered before scheduled work starts

RESOURCE OPTIMIZATION:
- Match crew trades to upcoming scheduled work
- Identify days with no crew scheduled but work needed
- Flag trades needed for next phase but not on crew roster
- If weather is bad tomorrow, recommend crew adjustments
- Check budget burn rate vs schedule progress (ahead/behind on spend)

GENERAL:
- Check for overdue punch items
- Check for pending change orders aging
- Check for open safety incidents with incomplete actions
- Don't repeat actions already taken recently
- Max 8 actions per run
- Be concise but thorough
- Prioritize scope/schedule alignment over everything else`,
      messages: [{ role: "user", content: context }],
    });

    const text = (response.content[0] as any).text;
    let actions: any[] = [];
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) actions = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return { status: "parse_error", raw: text };
    }

    // Log actions
    let logged = 0;
    for (const action of actions) {
      await ctx.runMutation(a.autopilotData.createLog, {
        companyId: project.companyId,
        projectId: args.projectId,
        type: action.type ?? "recommendation",
        category: action.category ?? "general",
        title: action.title ?? "Untitled",
        description: action.description ?? "",
        actionTaken: action.actionTaken ?? undefined,
        status: action.requiresApproval ? "pending_approval" : action.type === "auto" ? "executed" : "pending_review",
        confidence: action.confidence ?? 0.5,
        requiresApproval: action.requiresApproval ?? false,
        metadata: JSON.stringify({ priority: action.priority }),
      });
      logged++;
    }

    // Update config
    await ctx.runMutation(a.autopilotData.updateConfig, {
      projectId: args.projectId,
      lastRunAt: new Date().toISOString(),
      lastRunSummary: `Generated ${logged} actions: ${actions.filter((a: any) => a.type === "auto").length} auto, ${actions.filter((a: any) => a.type === "recommendation").length} recommendations, ${actions.filter((a: any) => a.type === "alert").length} alerts`,
      totalActions: (config.totalActions ?? 0) + logged,
    });

    return { status: "success", actionsGenerated: logged, actions };
  },
});
