"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const generate = action({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const today = new Date().toISOString().slice(0, 10);

    const projects = await ctx.runQuery(a.projects.list, { companyId: args.companyId });
    const activeProjects = (projects || []).filter((p: any) => p.status === "Active" || !p.status);
    const allPms = await ctx.runQuery(a.aiPm.list, { companyId: args.companyId });

    let totalCrew = 0;
    let totalDeliveriesToday = 0;
    let totalTasksCompletedToday = 0;
    let totalNewIssues = 0;
    let totalContractValue = 0;
    const projectReports: any[] = [];
    const companyAlerts: string[] = [];

    for (const p of activeProjects) {
      // Tasks
      let tasks: any[] = [];
      try { tasks = await ctx.runQuery(a.tasks.list, { projectId: p._id }) || []; } catch {}
      const completedToday = tasks.filter((t: any) => t.status === "Complete" && t.dateComplete === today);
      const inProgress = tasks.filter((t: any) => t.status !== "Complete" && t.status !== "Open");
      const overdue = tasks.filter((t: any) => t.dateScheduled && t.dateScheduled < today && t.status !== "Complete");
      const scheduledToday = tasks.filter((t: any) => t.dateScheduled === today && t.status !== "Complete");

      // Crew
      let crew: any[] = [];
      try {
        const allCrew = await ctx.runQuery(a.crew.list, { companyId: args.companyId }) || [];
        crew = allCrew.filter((c: any) => c.projectId === p._id && c.start && c.start <= today && (!c.end || c.end >= today));
      } catch {}

      // Deliveries
      let deliveries: any[] = [];
      try { deliveries = await ctx.runQuery(a.deliveries.list, { projectId: p._id }) || []; } catch {}
      const deliveriesToday = deliveries.filter((d: any) => d.eta === today);
      const deliveriesArrived = deliveries.filter((d: any) => d.eta === today && (d.status === "Delivered" || d.status === "Arrived"));

      // Emails today
      let emails: any[] = [];
      try {
        const allEmails = await ctx.runQuery(a.emails.list, { companyId: args.companyId as string }) || [];
        emails = allEmails.filter((e: any) => e.projectId === (p._id as string) && e.date === today);
      } catch {}

      // RFIs
      let rfis: any[] = [];
      try { rfis = await ctx.runQuery(a.rfis.list, { projectId: p._id, companyId: args.companyId }) || []; } catch {}
      const openRfis = rfis.filter((r: any) => r.status !== "Closed");
      const overdueRfis = rfis.filter((r: any) => r.dateRequired && r.dateRequired < today && r.status !== "Closed" && r.status !== "Answered");

      // Budget
      let budgetItems: any[] = [];
      try {
        const bd = await ctx.runQuery(a.budgetTracker.getBudget, { projectId: p._id });
        budgetItems = (bd as any)?.lineItems || [];
      } catch {}
      const totalBudgeted = budgetItems.reduce((s: number, b: any) => s + (b.budgeted || 0), 0);
      const totalActual = budgetItems.reduce((s: number, b: any) => s + (b.actual || 0), 0);
      const contractValue = (p as any).contractValue || totalBudgeted;
      const pctSpent = contractValue > 0 ? Math.round((totalActual / contractValue) * 100) : 0;
      const budgetStatus = pctSpent > 90 ? "🔴 Over" : pctSpent > 75 ? "🟡 Tight" : "✅ On Track";

      // Field notes today
      let fieldNotes: any[] = [];
      try {
        const allNotes = await ctx.runQuery(a.fieldNotes.list, { projectId: p._id }) || [];
        fieldNotes = allNotes.filter((n: any) => new Date(n.createdAt).toISOString().slice(0, 10) === today);
      } catch {}

      // Photos today
      let photos = 0;
      try {
        const media = await ctx.runQuery(a.siteMedia?.list || a.projects.list, { projectId: p._id }) || [];
        photos = (media as any[]).filter((m: any) => new Date(m._creationTime).toISOString().slice(0, 10) === today).length;
      } catch {}

      // Change orders
      let changeOrders: any[] = [];
      try { changeOrders = await ctx.runQuery(a.changeOrders.list, { projectId: p._id }) || []; } catch {}
      const pendingCOs = changeOrders.filter((co: any) => co.status === "Pending" || co.status === "Submitted");

      // PM
      const pm = allPms?.find((pm: any) => pm.projectId === p._id);

      // Task completion %
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.status === "Complete").length;
      const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const healthDot = overdue.length > 3 || pctSpent > 90 ? "🔴" : overdue.length > 0 || pctSpent > 75 ? "🟡" : "🟢";

      // Accumulate
      totalCrew += crew.length;
      totalDeliveriesToday += deliveriesToday.length;
      totalTasksCompletedToday += completedToday.length;
      totalContractValue += contractValue;
      if (overdue.length > 0) totalNewIssues++;
      if (overdueRfis.length > 0) companyAlerts.push(`🔴 ${overdueRfis.length} overdue RFI${overdueRfis.length > 1 ? "s" : ""} on ${p.name}`);
      if (pctSpent > 90) companyAlerts.push(`🟡 Budget warning: ${p.name} at ${pctSpent}%`);
      if (pendingCOs.length > 0) companyAlerts.push(`📋 ${pendingCOs.length} pending CO${pendingCOs.length > 1 ? "s" : ""} on ${p.name}`);

      projectReports.push({
        name: p.name,
        code: p.code,
        address: [p.address, p.city, p.state].filter(Boolean).join(", "),
        healthDot,
        pct,
        pmName: pm?.name || null,
        pmAvatar: pm?.avatar || null,
        crew: crew.map((c: any) => `${c.firstName || ""} ${c.lastName || ""}`.trim() + (c.trade ? ` (${c.trade})` : "")).filter(Boolean),
        crewCount: crew.length,
        completedToday: completedToday.map((t: any) => t.customTask || t.task),
        inProgress: inProgress.slice(0, 5).map((t: any) => t.customTask || t.task),
        scheduledToday: scheduledToday.map((t: any) => t.customTask || t.task),
        overdue: overdue.map((t: any) => t.customTask || t.task),
        deliveriesToday: deliveriesToday.map((d: any) => `${d.material || "Delivery"} from ${d.supplier || "?"} — ${d.status || "Scheduled"}`),
        emailsToday: emails.length,
        openRfis: openRfis.length,
        overdueRfis: overdueRfis.length,
        budgetTotal: contractValue,
        budgetSpent: totalActual,
        budgetPct: pctSpent,
        budgetStatus,
        fieldNotesToday: fieldNotes.length,
        photosToday: photos,
        pendingCOs: pendingCOs.length,
      });
    }

    // Get company info
    const company = await ctx.runQuery(a.companyBranding.get, { companyId: args.companyId });

    return {
      companyName: company?.name || "Company",
      date: today,
      dateFormatted: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      summary: {
        activeProjects: activeProjects.length,
        totalContractValue,
        crewOnSite: totalCrew,
        deliveriesToday: totalDeliveriesToday,
        tasksCompletedToday: totalTasksCompletedToday,
        newIssues: totalNewIssues,
      },
      projects: projectReports,
      alerts: companyAlerts,
    };
  },
});
