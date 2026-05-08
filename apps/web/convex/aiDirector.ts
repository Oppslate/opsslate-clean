"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// The Director oversees all AI PMs, detects conflicts, ensures cohesion
export const chat = action({
  args: { companyId: v.id("companies"), message: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // Get ALL company data
    const projects = await ctx.runQuery(a.projects.list, { companyId: args.companyId });
    const activeProjects = (projects || []).filter((p: any) => p.status !== "Inactive" && p.status !== "Archived");
    const allPms = await ctx.runQuery(a.aiPm.list, { companyId: args.companyId });

    // Gather data across ALL projects
    const projectSummaries: string[] = [];
    const allDeliveries: any[] = [];
    const allCrew: any[] = [];
    const allRfis: any[] = [];
    const allPours: any[] = [];
    const allTasks: any[] = [];
    const allBudgets: any[] = [];

    for (const p of activeProjects) {
      let rfis: any[] = [];
      try { rfis = await ctx.runQuery(a.rfis.list, { projectId: p._id, companyId: args.companyId }) || []; } catch {}
      let submittals: any[] = [];
      try { submittals = await ctx.runQuery(a.submittals.list, { projectId: p._id, companyId: args.companyId }) || []; } catch {}
      let deliveries: any[] = [];
      try { deliveries = await ctx.runQuery(a.deliveries.list, { projectId: p._id }) || []; } catch {}
      let crew: any[] = [];
      try {
        const allCrewData = await ctx.runQuery(a.crew.list, { companyId: args.companyId }) || [];
        crew = allCrewData.filter((c: any) => c.projectId === p._id);
      } catch {}
      let tasks: any[] = [];
      try { tasks = await ctx.runQuery(a.tasks.list, { projectId: p._id }) || []; } catch {}
      let budget: any[] = [];
      try { budget = await ctx.runQuery(a.budget.list, { projectId: p._id }) || []; } catch {}
      let pours: any[] = [];
      try { pours = await ctx.runQuery(a.concretePours.list, { projectId: p._id }) || []; } catch {}
      let changeOrders: any[] = [];
      try { changeOrders = await ctx.runQuery(a.changeOrders.list, { projectId: p._id }) || []; } catch {}
      let rentals: any[] = [];
      try { rentals = await ctx.runQuery(a.rentals.list, { projectId: p._id }) || []; } catch {}

      const pm = allPms?.find((pm: any) => pm.projectId === p._id);
      const totalBudgeted = budget.reduce((s: number, b: any) => s + (b.budgeted || 0), 0);
      const totalActual = budget.reduce((s: number, b: any) => s + (b.actual || 0), 0);
      const openRFIs = rfis.filter((r: any) => r.status !== "Closed").length;
      const overdueRFIs = rfis.filter((r: any) => r.responseRequired && r.status !== "Closed" && r.responseRequired < new Date().toISOString().slice(0, 10)).length;
      const openSubmittals = submittals.filter((s: any) => s.status !== "Approved" && s.status !== "Closed").length;
      const openTasks = tasks.filter((t: any) => t.status !== "Complete").length;
      const overdueTasks = tasks.filter((t: any) => t.dateScheduled && t.status !== "Complete" && t.dateScheduled < new Date().toISOString().slice(0, 10)).length;

      for (const d of deliveries) { allDeliveries.push({ ...d, projectName: p.name }); }
      for (const c of crew) { allCrew.push({ ...c, projectName: p.name }); }
      for (const r of rfis) { allRfis.push({ ...r, projectName: p.name }); }
      for (const pour of pours) { allPours.push({ ...pour, projectName: p.name }); }
      for (const t of tasks) { allTasks.push({ ...t, projectName: p.name }); }
      for (const b of budget) { allBudgets.push({ ...b, projectName: p.name }); }

      projectSummaries.push(`
📁 ${p.name}${p.code ? ` (${p.code})` : ""} — PM: ${pm?.name || "UNASSIGNED"}
   Status: ${p.status || "Active"} | Start: ${p.startDate || "?"} | End: ${p.endDate || "?"}
   Budget: $${totalBudgeted.toLocaleString()} budgeted / $${totalActual.toLocaleString()} spent / $${(totalBudgeted - totalActual).toLocaleString()} remaining
   RFIs: ${openRFIs} open (${overdueRFIs} overdue) | Submittals: ${openSubmittals} open
   Tasks: ${openTasks} open (${overdueTasks} overdue) | Crew: ${crew.length} | Rentals: ${rentals.length}
   Deliveries: ${deliveries.length} | COs: ${changeOrders.length} (${changeOrders.filter((c: any) => c.status === "Approved").length} approved)
   Pours: ${pours.filter((p: any) => p.date && p.date >= new Date().toISOString().slice(0, 10)).length} upcoming`);
    }

    // Detect conflicts
    const conflicts: string[] = [];

    // Schedule overlaps - crew on multiple projects same dates
    const crewByName = new Map<string, any[]>();
    for (const c of allCrew) {
      const name = c.firstName || c.name || "";
      if (!name) continue;
      if (!crewByName.has(name)) crewByName.set(name, []);
      crewByName.get(name)!.push(c);
    }
    for (const [name, assignments] of crewByName) {
      if (assignments.length > 1) {
        const projects = [...new Set(assignments.map((a: any) => a.projectName))];
        if (projects.length > 1) {
          conflicts.push(`🔴 CREW CONFLICT: ${name} assigned to ${projects.length} projects: ${projects.join(", ")}`);
        }
      }
    }

    // Concrete pour conflicts - multiple pours same day
    const poursByDate = new Map<string, any[]>();
    for (const p of allPours) {
      if (p.date) {
        if (!poursByDate.has(p.date)) poursByDate.set(p.date, []);
        poursByDate.get(p.date)!.push(p);
      }
    }
    for (const [date, pours] of poursByDate) {
      if (pours.length > 1) {
        const projects = [...new Set(pours.map((p: any) => p.projectName))];
        if (projects.length > 1) {
          conflicts.push(`🔴 POUR CONFLICT: ${pours.length} concrete pours scheduled ${date} across: ${projects.join(", ")}`);
        }
      }
    }

    // Delivery conflicts - multiple deliveries same day
    const deliveriesByDate = new Map<string, any[]>();
    for (const d of allDeliveries) {
      if (d.eta) {
        if (!deliveriesByDate.has(d.eta)) deliveriesByDate.set(d.eta, []);
        deliveriesByDate.get(d.eta)!.push(d);
      }
    }
    for (const [date, dels] of deliveriesByDate) {
      if (dels.length > 2) {
        const projects = [...new Set(dels.map((d: any) => d.projectName))];
        if (projects.length > 1) {
          conflicts.push(`🟡 DELIVERY OVERLAP: ${dels.length} deliveries on ${date} across ${projects.length} projects — can someone be at each site?`);
        }
      }
    }

    // Budget health warnings
    for (const p of activeProjects) {
      const projBudget = allBudgets.filter((b: any) => b.projectName === p.name);
      const budgeted = projBudget.reduce((s: number, b: any) => s + (b.budgeted || 0), 0);
      const actual = projBudget.reduce((s: number, b: any) => s + (b.actual || 0), 0);
      if (budgeted > 0 && actual > budgeted * 0.9) {
        const pct = Math.round((actual / budgeted) * 100);
        conflicts.push(`🟡 BUDGET WARNING: ${p.name} at ${pct}% of budget ($${actual.toLocaleString()} / $${budgeted.toLocaleString()})`);
      }
    }

    // Company-wide totals
    const totalBudgeted = allBudgets.reduce((s: number, b: any) => s + (b.budgeted || 0), 0);
    const totalActual = allBudgets.reduce((s: number, b: any) => s + (b.actual || 0), 0);
    const totalOpenRFIs = allRfis.filter((r: any) => r.status !== "Closed").length;
    const totalOverdueRFIs = allRfis.filter((r: any) => r.responseRequired && r.status !== "Closed" && r.responseRequired < new Date().toISOString().slice(0, 10)).length;

    // App usage analysis
    const appUsage: string[] = [];
    const projectsMissingData: string[] = [];
    for (const p of activeProjects) {
      const missing: string[] = [];
      if (!p.startDate) missing.push("start date");
      if (!p.endDate) missing.push("end date");
      if (!p.address && !p.location) missing.push("address/location");
      if (!p.latitude) missing.push("geocoding (no weather)");
      if (!p.projectManager) missing.push("project manager name");
      
      const projBudget = allBudgets.filter((b: any) => b.projectName === p.name);
      if (projBudget.length === 0) missing.push("budget line items");
      
      const projCrew = allCrew.filter((c: any) => c.projectName === p.name);
      if (projCrew.length === 0) missing.push("crew assignments");
      
      const pm = allPms?.find((pm: any) => pm.projectId === p._id);
      if (!pm) missing.push("AI PM not assigned");
      
      if (missing.length > 0) {
        projectsMissingData.push(`${p.name}: missing ${missing.join(", ")}`);
      }
    }

    // Feature adoption
    const totalBudgetLines = allBudgets.length;
    const totalCrewAssigned = allCrew.length;
    const totalRfisTracked = allRfis.length;
    const totalDeliveriesTracked = allDeliveries.length;
    const pmCoverage = allPms ? Math.round((allPms.length / Math.max(activeProjects.length, 1)) * 100) : 0;
    
    appUsage.push(`Feature Adoption:`);
    appUsage.push(`- AI PM Coverage: ${pmCoverage}% (${allPms?.length || 0}/${activeProjects.length} projects)`);
    appUsage.push(`- Budget Tracking: ${totalBudgetLines} line items across ${[...new Set(allBudgets.map((b: any) => b.projectName))].length} projects`);
    appUsage.push(`- Crew Management: ${totalCrewAssigned} crew members tracked`);
    appUsage.push(`- RFI Tracking: ${totalRfisTracked} RFIs logged`);
    appUsage.push(`- Delivery Tracking: ${totalDeliveriesTracked} deliveries logged`);
    if (pmCoverage < 100) appUsage.push(`⚠️ RECOMMENDATION: Assign AI PMs to all projects for full coverage`);
    if (totalBudgetLines === 0) appUsage.push(`⚠️ RECOMMENDATION: Start entering budget line items — this unlocks cost tracking, variance alerts, and earned value reporting`);
    if (projectsMissingData.length > 0) appUsage.push(`⚠️ ${projectsMissingData.length} projects have incomplete data`);

    const companyContext = `
COMPANY OVERVIEW:
Active Projects: ${activeProjects.length}
AI PMs Assigned: ${allPms?.length || 0}
Total Budget: $${totalBudgeted.toLocaleString()} | Total Spent: $${totalActual.toLocaleString()} | Remaining: $${(totalBudgeted - totalActual).toLocaleString()}
Total Open RFIs: ${totalOpenRFIs} (${totalOverdueRFIs} overdue)
Total Crew Members: ${allCrew.length} across all projects
Total Active Deliveries: ${allDeliveries.length}
Upcoming Pours: ${allPours.filter((p: any) => p.date && p.date >= new Date().toISOString().slice(0, 10)).length}

PROJECT-BY-PROJECT STATUS:
${projectSummaries.join("\n")}

DETECTED CONFLICTS & ISSUES:
${conflicts.length > 0 ? conflicts.join("\n") : "✅ No conflicts detected"}

APP PIPELINE & USAGE:
${appUsage.join("\n")}

PROJECTS WITH INCOMPLETE DATA:
${projectsMissingData.join("\n") || "✅ All projects have complete data"}

AI PM TEAM:
${(allPms || []).map((pm: any) => {
  const proj = activeProjects.find((p: any) => p._id === pm.projectId);
  return `- ${pm.avatar} ${pm.name} → ${proj?.name || "?"} (${pm.personality}, ${pm.status})`;
}).join("\n") || "No PMs assigned"}
`;

    const systemPrompt = `You are the DIRECTOR OF AI PROJECT MANAGERS for a construction company. Your name is "Director". You sit above all the individual AI Project Managers and have a bird's-eye view of the entire operation.

YOUR ROLE:
- Oversee ALL projects simultaneously
- Detect schedule conflicts, resource overlaps, and coordination issues
- Ensure timelines are reasonable and don't conflict
- Monitor budget health across the portfolio
- Coordinate between project PMs when their projects have dependencies
- Report on company-wide performance and risk
- Make strategic recommendations about resource allocation
- Flag when one project's issues might impact another

PERSONALITY: Executive-level. You think strategically, speak with authority, and always have the big picture. You're the person in the room who sees connections between projects that nobody else does. You address the owner/superintendent directly.

CAPABILITIES:
- Cross-project analysis (budget, schedule, resources)
- Conflict detection (crew, equipment, deliveries, pours)
- PM team performance monitoring
- Strategic resource recommendations
- Risk portfolio assessment
- Timeline reasonableness review
- APP PIPELINE ANALYSIS: You can see how the team is using OpsSlate and recommend features they should adopt, data they should enter, and workflows they should set up. Think of yourself as a systems consultant too — you want them getting maximum value from every module.
- UPGRADE RECOMMENDATIONS: Suggest specific improvements to how projects are set up, what data is missing, which features aren't being used, and what the team should do next to level up their operations.

DECISION INTELLIGENCE:
You have a Decision Engine that learns from company patterns. When the user asks about decisions, patterns, learning, or autonomous actions, explain what the engine has learned and what decisions it's making. You can reference the decision history and patterns.

When the user asks you to "make decisions", "run autonomously", "learn from this", or "analyze patterns" — trigger the Decision Engine by including:
[RUN_DECISIONS]

DELEGATING TO PROJECT MANAGERS:
You can send direct commands to any AI PM. When the user asks you to tell/ask/instruct a PM to do something, include this tag in your response:
[DELEGATE_PM: pmName=Riley, message=Check all open RFIs and report status]

You can reference PMs by their NAME or their PROJECT NAME — both work. Examples:
- User: "Tell Riley to check the RFIs" → [DELEGATE_PM: pmName=Riley, message=Check all open RFIs and report their current status]
- User: "Have the Broome County PM scan their emails" → [DELEGATE_PM: pmName=Broome County, message=Scan all project emails for action items and concerns]
- User: "Ask all PMs for status updates" → Use multiple DELEGATE_PM tags, one for each PM
- User: "Tell the warehouse PM to draft an email to the architect" → [DELEGATE_PM: pmName=Warehouse, message=Draft an email to the architect following up on the outstanding RFIs]

The PM will execute the command and post their response in their chat. You can delegate multiple PMs at once. Always confirm what you delegated and to whom.

When asked about the app pipeline, upgrades, or recommendations:
- Analyze which features are being used vs. underused
- Flag projects missing critical data (dates, addresses, budgets)
- Recommend specific actions: "Enter budget line items for Project X to unlock cost tracking"
- Suggest workflow improvements: "You have 22 projects but only 5 have crew tracked — get crew data in to unlock resource conflict detection"
- Think like a construction tech consultant who wants the company running at peak efficiency

When answering, always think ACROSS projects. Your value is in seeing the full picture — not just one project at a time.

${companyContext}`;

    // Get Director chat history
    const directorMessages = await ctx.runQuery(a.aiPm.getMessages, { pmId: "director" as any }).catch(() => []);
    const recentHistory = (directorMessages || []).slice(-15);

    const messages = recentHistory.map((m: any) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.message,
    }));
    messages.push({ role: "user" as const, content: args.message });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    let reply = result.content[0]?.text ?? "Unable to generate response.";

    // Check if Director wants to run Decision Engine
    if (reply.includes("[RUN_DECISIONS]") || args.message.toLowerCase().includes("make decisions") || args.message.toLowerCase().includes("run autonomous") || args.message.toLowerCase().includes("analyze patterns")) {
      try {
        const decResult = await ctx.runAction(a.decisionEngine.analyze, {
          companyId: args.companyId,
          trigger: "director",
          context: args.message,
        });
        const dr = decResult as any;
        reply = reply.replace(/\[RUN_DECISIONS\]/g, "");
        reply += `\n\n🧠 **DECISION ENGINE RESULTS:**\n`;
        reply += `📊 Analyzed ${activeProjects.length} projects\n`;
        reply += `⚡ ${dr.executed || 0} decisions auto-executed\n`;
        reply += `📋 ${(dr.decisions || []).length} total decisions made\n\n`;
        if (dr.patterns?.length) {
          reply += `**Patterns Detected:**\n${dr.patterns.map((p: string) => `• ${p}`).join("\n")}\n\n`;
        }
        if (dr.risk) {
          reply += `**Risk Assessment:** ${dr.risk}\n\n`;
        }
        for (const d of (dr.decisions || [])) {
          const icon = d.type === "auto" ? "⚡" : d.type === "notify" ? "📢" : "💡";
          reply += `${icon} [${d.type.toUpperCase()}] ${d.description} (${Math.round(d.confidence * 100)}% confidence)\n`;
        }
        if (dr.recommendations?.length) {
          reply += `\n**Strategic Recommendations:**\n${dr.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}`;
        }
      } catch (e) {
        reply += `\n\n⚠️ Decision Engine encountered an issue: ${(e as Error).message?.slice(0, 100)}`;
      }
    }

    // Check if the Director wants to delegate to a PM
    // Parse [DELEGATE_PM: pmName=Riley, message=Check the RFIs and report back] tags
    const delegations = reply.matchAll(/\[DELEGATE_PM:\s*([^\]]+)\]/g);
    const delegationResults: string[] = [];
    for (const match of delegations) {
      const fields: Record<string, string> = {};
      match[1].split(",").forEach((pair: string) => {
        const [key, ...valParts] = pair.split("=");
        if (key && valParts.length) fields[key.trim()] = valParts.join("=").trim();
      });
      
      const pmRef = fields.pmName || fields.pm || "";
      const delegateMsg = fields.message || fields.task || "";
      if (!pmRef || !delegateMsg) continue;

      // Match PM by name or project name
      const targetPm = (allPms || []).find((pm: any) => {
        const pmNameMatch = pm.name.toLowerCase().includes(pmRef.toLowerCase()) || pmRef.toLowerCase().includes(pm.name.toLowerCase());
        const proj = activeProjects.find((p: any) => p._id === pm.projectId);
        const projNameMatch = proj && (proj.name.toLowerCase().includes(pmRef.toLowerCase()) || pmRef.toLowerCase().includes(proj.name.toLowerCase()));
        return pmNameMatch || projNameMatch;
      });

      if (targetPm) {
        try {
          const proj = activeProjects.find((p: any) => p._id === targetPm.projectId);
          // Send message to PM via chat
          const pmResult = await ctx.runAction(a.aiPmEngine.chat, {
            pmId: targetPm._id,
            projectId: targetPm.projectId,
            companyId: args.companyId,
            pmName: targetPm.name,
            personality: targetPm.personality,
            message: `[DIRECTIVE FROM DIRECTOR]: ${delegateMsg}`,
          });
          delegationResults.push(`✅ Dispatched to ${targetPm.avatar} ${targetPm.name} (${proj?.name || "?"}): "${delegateMsg}"`);
        } catch (e) {
          delegationResults.push(`❌ Failed to reach ${targetPm.name}: ${(e as Error).message?.slice(0, 60)}`);
        }
      } else {
        delegationResults.push(`⚠️ Could not find PM matching "${pmRef}" — available PMs: ${(allPms || []).map((pm: any) => pm.name).join(", ")}`);
      }
    }

    // Clean delegation tags and append results
    reply = reply.replace(/\[DELEGATE_PM:\s*[^\]]+\]/g, "").trim();
    if (delegationResults.length > 0) {
      reply += "\n\n📡 **Delegation Results:**\n" + delegationResults.join("\n");
    }

    // Post conflicts to War Room if any detected
    if (conflicts.length > 0 && allPms && allPms.length > 0) {
      for (const conflict of conflicts.slice(0, 3)) {
        try {
          await ctx.runMutation(a.aiPm.addWarRoomMessage, {
            companyId: args.companyId,
            fromPmId: allPms[0]._id, // Use first PM as sender
            fromPmName: "Director",
            fromProject: "Company-wide",
            message: conflict,
            type: conflict.includes("CONFLICT") ? "conflict" : conflict.includes("BUDGET") ? "resource" : "coordination",
          });
        } catch {}
      }
    }

    return { reply, conflicts, projectCount: activeProjects.length, pmCount: allPms?.length || 0 };
  },
});

// Full portfolio review
export const portfolioReview = action({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    // Reuse the chat function with a specific prompt
    const a = (await import("./_generated/api")).api as any;
    const result = await ctx.runAction(a.aiDirector.chat, {
      companyId: args.companyId,
      message: "Give me a full portfolio review. Cover every project's health, flag ALL conflicts and risks, assess my team's workload, review budget health company-wide, and give me your top 5 strategic recommendations for this week. Be thorough — this is my executive briefing.",
    });
    return result;
  },
});
