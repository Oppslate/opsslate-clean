import { query } from "./_generated/server";
import { v } from "convex/values";

export const projectHealth = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const projects = await ctx.db.query("projects").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const activeProjects = projects.filter((p) => p.status === "Active");
    const targetProjects = args.projectId ? activeProjects.filter((p) => p._id === args.projectId) : activeProjects;

    const results = [];
    for (const proj of targetProjects) {
      const punch = await ctx.db.query("punchList").withIndex("by_project", (q) => q.eq("projectId", proj._id)).collect();
      const cos = await ctx.db.query("changeOrders").withIndex("by_project", (q) => q.eq("projectId", proj._id)).collect();
      const incidents = await ctx.db.query("incidents").withIndex("by_project", (q) => q.eq("projectId", proj._id)).collect();
      const rfis = await ctx.db.query("rfis").withIndex("by_project", (q) => q.eq("projectId", proj._id)).collect();
      const submittals = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", proj._id)).collect();
      const crew = await ctx.db.query("crew").withIndex("by_project", (q) => q.eq("projectId", proj._id)).collect();
      const time = await ctx.db.query("timeEntries").withIndex("by_project", (q) => q.eq("projectId", proj._id)).collect();
      const logs = await ctx.db.query("dailyLogs").withIndex("by_project", (q) => q.eq("projectId", proj._id)).collect();

      const openPunch = punch.filter((p) => p.status !== "Complete").length;
      const overduePunch = punch.filter((p) => p.status !== "Complete" && p.dueDate && p.dueDate < new Date().toISOString().slice(0, 10)).length;
      const pendingCOs = cos.filter((c) => c.status === "Pending" || c.status === "Under Review").length;
      const approvedCOCost = cos.filter((c) => c.status === "Approved").reduce((s, c) => s + (c.approvedCost ?? 0), 0);
      const openIncidents = incidents.filter((i) => i.status !== "Closed").length;
      const criticalIncidents = incidents.filter((i) => i.severity === "Critical" || i.severity === "Fatal").length;
      const openRFIs = rfis.filter((r) => r.status === "Open").length;
      const pendingSubmittals = submittals.filter((s) => s.status === "Pending").length;
      const totalHours = time.reduce((s, t) => s + t.hoursRegular + (t.hoursOvertime ?? 0), 0);

      // Health score (0-100)
      let score = 100;
      if (overduePunch > 5) score -= 15; else if (overduePunch > 0) score -= 5;
      if (openIncidents > 0) score -= 20;
      if (criticalIncidents > 0) score -= 30;
      if (pendingCOs > 3) score -= 10;
      if (openRFIs > 5) score -= 10; else if (openRFIs > 0) score -= 3;
      if (pendingSubmittals > 5) score -= 10;
      score = Math.max(0, Math.min(100, score));

      results.push({
        projectId: proj._id, projectName: proj.name, status: proj.status,
        healthScore: score,
        punch: { total: punch.length, open: openPunch, overdue: overduePunch, complete: punch.filter((p) => p.status === "Complete").length },
        changeOrders: { total: cos.length, pending: pendingCOs, approved: cos.filter((c) => c.status === "Approved").length, approvedCost: approvedCOCost },
        safety: { total: incidents.length, open: openIncidents, critical: criticalIncidents },
        rfis: { total: rfis.length, open: openRFIs, answered: rfis.filter((r) => r.status === "Answered").length },
        submittals: { total: submittals.length, pending: pendingSubmittals, approved: submittals.filter((s) => s.status === "Approved" || s.status === "Approved as Noted").length },
        crew: { total: crew.length, active: crew.filter((c) => c.status === "Active").length },
        time: { totalHours, entries: time.length },
        dailyLogs: { total: logs.length, recent: logs.filter((l) => l.date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)).length },
      });
    }
    return results;
  },
});
