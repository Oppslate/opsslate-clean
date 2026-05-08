import { query } from "./_generated/server";
import { v } from "convex/values";

export const getProjectOverview = query({
  args: { projectId: v.id("projects"), companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    if (String(project.companyId) !== String(args.companyId)) return null;

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    // Crew
    const allCrew: any[] = await ctx.db.query("crew").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const activeCrew = allCrew.filter((c) => c.status !== "inactive" && c.status !== "off-boarded");

    // Team Members
    const projectId = String(args.projectId);
    const activeTeamMembers = (await ctx.db.query("teamMembers")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect())
      .filter((m) => m.status === "active" && (!m.assignedProjects?.length || m.assignedProjects.includes(projectId)));
    const teamMembers = activeTeamMembers
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8)
      .map((m) => ({
        id: m._id,
        name: m.name,
        role: m.role,
        status: m.status,
      }));

    // Punch List
    const punch: any[] = await ctx.db.query("punchList").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const punchOpen = punch.filter((p) => p.status !== "Complete" && p.status !== "Verified");
    const punchOverdue = punchOpen.filter((p) => p.dueDate && p.dueDate < today);

    // Change Orders
    const cos: any[] = await ctx.db.query("changeOrders").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const cosPending = cos.filter((c) => c.status === "Pending" || c.status === "Under Review");
    const cosApproved = cos.filter((c) => c.status === "Approved");
    const totalCOCost = cosApproved.reduce((s, c) => s + (c.costImpact || 0), 0);

    // Incidents
    const incidents: any[] = await ctx.db.query("incidents").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const openIncidents = incidents.filter((i) => i.status !== "Closed" && i.status !== "Resolved");
    const criticalIncidents = incidents.filter((i) => i.severity === "Fatal" || i.severity === "Critical");

    // RFIs
    const rfis: any[] = await ctx.db.query("rfis").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const openRfis = rfis.filter((r) => r.status === "Open" || r.status === "open");
    const overdueRfis = openRfis.filter((r) => (r.dateRequired || r.responseRequired) && (r.dateRequired || r.responseRequired) < today);

    // Submittals
    const subs: any[] = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const pendingSubs = subs.filter((s) => s.status === "Pending");


    // Daily Logs
    const logs: any[] = await ctx.db.query("dailyLogs").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).order("desc").take(30);
    const recentLogs = logs.filter((l) => l.date >= weekAgo);

    // Field record summaries
    const mediaRaw: any[] = await ctx.db.query("siteMedia").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).order("desc").collect();
    const recentMedia = [];
    for (const m of mediaRaw.slice(0, 4)) {
      let resolvedUrl = m.url;
      if (m.url && !m.url.startsWith("http")) {
        try {
          const signed = await ctx.storage.getUrl(m.url as any);
          if (signed) resolvedUrl = signed;
        } catch { /* keep original */ }
      }
      if (m.url && m.url.includes("/api/storage/")) {
        try {
          const sid = m.url.replace(/.*\/api\/storage\//, "");
          const signed = await ctx.storage.getUrl(sid as any);
          if (signed) resolvedUrl = signed;
        } catch { /* keep original */ }
      }
      recentMedia.push({
        id: m._id,
        type: m.type,
        fileName: m.fileName,
        url: resolvedUrl,
        capturedDate: m.capturedDate,
        capturedBy: m.capturedBy,
      });
    }

    const docsRaw: any[] = await ctx.db.query("documents").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).order("desc").collect();
    const recentDocs = docsRaw.slice(0, 4).map((d) => ({
      id: d._id,
      name: d.name || d.fileName || "Document",
      category: d.category,
      uploadedAt: d.uploadedAt,
    }));

    const notes: any[] = await ctx.db.query("fieldNotes").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).order("desc").collect();

    // AI Project Manager
    const aiPm: any = await ctx.db.query("aiProjectManagers").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).first();
    const aiPmTasks: any[] = aiPm ? await ctx.db.query("aiPmTasks").withIndex("by_pm", (q) => q.eq("pmId", aiPm._id)).collect() : [];
    const aiPmOpenTasks = aiPmTasks.filter((t) => t.status !== "done" && t.status !== "failed");

    // Time entries
    const time: any[] = await ctx.db.query("timeEntries").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const totalHours = time.reduce((s, t) => s + (t.hoursRegular || 0) + (t.hoursOvertime || 0) * 1.5, 0);
    const totalCost = time.reduce((s, t) => s + (t.totalCost || 0), 0);

    // Budget
    const budget: any = await ctx.db.query("budget").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).first();
    const lineItems: any[] = await ctx.db.query("budgetLineItems").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const budgetTotal = lineItems.reduce((s, l) => s + (l.budgeted || 0), 0);
    const actualTotal = lineItems.reduce((s, l) => s + (l.actual || 0), 0);

    // Weather alerts
    const weatherAlerts: any[] = await ctx.db.query("weatherAlerts").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).order("desc").take(5);

    // Emails / Correspondence
    const companyId = project.companyId;
    const allEmails: any[] = companyId ? await ctx.db.query("emails").withIndex("by_project", (q) => q.eq("companyId", companyId as string).eq("projectId", args.projectId as unknown as string)).collect() : [];
    const unreadEmails = allEmails.filter((e) => !e.isRead);
    const recentEmails = allEmails.sort((a, b) => b._creationTime - a._creationTime).slice(0, 10);

    // Health score
    let score = 100;
    score -= punchOverdue.length * 3;
    score -= openIncidents.length * 5;
    score -= criticalIncidents.length * 10;
    score -= cosPending.length * 2;
    score -= openRfis.length * 2;
    score -= pendingSubs.length * 1;
    if (recentLogs.length === 0) score -= 5;
    score = Math.max(0, Math.min(100, score));

    // Recent activity feed
    const activity: { time: number; type: string; text: string; severity?: string }[] = [];
    for (const p of punch.slice(-5)) activity.push({ time: p._creationTime, type: "punch", text: `Punch item: ${p.title}` });
    for (const c of cos.slice(-5)) activity.push({ time: c._creationTime, type: "co", text: `CO: ${c.title} (${c.status})` });
    for (const i of incidents.slice(-3)) activity.push({ time: i._creationTime, type: "incident", text: `Incident: ${i.type}`, severity: i.severity });
    for (const r of rfis.slice(-3)) activity.push({ time: r._creationTime, type: "rfi", text: `RFI: ${r.subject || r.question}` });
    activity.sort((a, b) => b.time - a.time);

    return {
      project,
      healthScore: score,
      crew: { total: allCrew.length, active: activeCrew.length, byTrade: activeCrew.reduce((acc: Record<string, number>, c) => { acc[c.trade || "General"] = (acc[c.trade || "General"] || 0) + 1; return acc; }, {}) },
      teamMembers: { total: activeTeamMembers.length, shown: teamMembers.length, members: teamMembers },
      punch: { total: punch.length, open: punchOpen.length, overdue: punchOverdue.length, complete: punch.length - punchOpen.length },
      changeOrders: { total: cos.length, pending: cosPending.length, approved: cosApproved.length, totalCost: totalCOCost },
      safety: { total: incidents.length, open: openIncidents.length, critical: criticalIncidents.length },
      rfis: { total: rfis.length, open: openRfis.length, overdue: overdueRfis.length },
      submittals: { total: subs.length, pending: pendingSubs.length },
      dailyLogs: { total: logs.length, thisWeek: recentLogs.length, lastEntry: logs[0]?.date },
      fieldNotes: { total: notes.length, recent: notes.slice(0, 3).map((n) => ({ id: n._id, note: n.note, author: n.author, createdAt: n.createdAt })) },
      media: { total: mediaRaw.length, recent: recentMedia },
      documents: { total: docsRaw.length, recent: recentDocs },
      aiPm: aiPm ? {
        id: aiPm._id,
        name: aiPm.name,
        avatar: aiPm.avatar,
        personality: aiPm.personality,
        status: aiPm.status,
        openTasks: aiPmOpenTasks.length,
        totalTasks: aiPmTasks.length,
      } : null,
      time: { totalHours, totalCost, entries: time.length },
      budget: { contractValue: budget?.originalContractValue || 0, budgeted: budgetTotal, actual: actualTotal, variance: budgetTotal - actualTotal, coCost: totalCOCost },
      weatherAlerts: weatherAlerts.slice(0, 3),
      emails: { total: allEmails.length, unread: unreadEmails.length, recent: recentEmails },
      activity: activity.slice(0, 10),
    };
  },
});
