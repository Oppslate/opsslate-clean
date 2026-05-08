import { query } from "./_generated/server";
import { v } from "convex/values";

export const summary = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const equipment = await ctx.db
      .query("equipment")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    let totalRentals = 0;
    let weeklyBurn = 0;
    let costToDate = 0;
    const projectSummaries = [];

    const activeProjects = projects.filter((p) => p.status !== "Inactive" && p.status !== "Archived");

    for (const p of activeProjects) {
      const rentals = await ctx.db
        .query("rentals")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      const deliveries = await ctx.db
        .query("deliveries")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      let pWeekly = 0;
      let pCost = 0;
      let activeRentals = 0;

      for (const r of rentals) {
        if (r.status === "Off Rent") continue;
        activeRentals++;
        const rate = r.rate ?? 0;
        const qty = r.qty ?? 1;
        const base = rate * qty;
        const weekly = r.rateType === "daily" ? base * 7 : base;
        const daily = r.rateType === "daily" ? base : base / 7;
        const start = r.start ? new Date(r.start) : now;
        const days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (24 * 3600 * 1000)));
        pWeekly += weekly;
        pCost += daily * days;
      }

      totalRentals += activeRentals;
      weeklyBurn += pWeekly;
      costToDate += pCost;

      const nextDelivery = deliveries
        .filter((d) => d.eta && new Date(d.eta) >= now)
        .sort((a, b) => (a.eta ?? "").localeCompare(b.eta ?? ""))[0];

      const rfis = await ctx.db
        .query("rfis")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      const openRFIs = rfis.filter((r) => r.status !== "Closed").length;

      const risks = await ctx.db
        .query("risks")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      const openRisks = risks.filter((r) => r.status !== "Closed").length;

      const submittals = await ctx.db
        .query("submittals")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      const pendingSubmittals = submittals.filter((s) => s.status !== "Approved" && s.status !== "Closed").length;

      const concretePours = await ctx.db
        .query("concretePours")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      const monthlyExposure = pWeekly * (30 / 7);

      const rentalDetails = rentals.filter((r) => r.status !== "Off Rent").map((r) => {
        const rate = r.rate ?? 0;
        const qty = r.qty ?? 1;
        const base = rate * qty;
        const weekly = r.rateType === "daily" ? base * 7 : base;
        const daily = r.rateType === "daily" ? base : base / 7;
        const start = r.start ? new Date(r.start) : now;
        const days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (24 * 3600 * 1000)));
        return {
          _id: r._id,
          equipmentId: r.equipmentId,
          vendor: r.vendor,
          po: r.po,
          start: r.start,
          end: r.end,
          rateType: r.rateType,
          rate,
          qty,
          days,
          weekly,
          costToDate: daily * days,
          status: r.status,
          lastVerified: r.lastVerified,
        };
      });

      // Compute last activity from field notes, docs, emails
      const fieldNotes = await ctx.db.query("fieldNotes").withIndex("by_project", (q) => q.eq("projectId", p._id)).order("desc").first();
      const lastDoc = await ctx.db.query("documents").withIndex("by_project", (q) => q.eq("projectId", p._id as any)).order("desc").first();
      const timestamps = [
        fieldNotes?.createdAt,
        lastDoc?.uploadedAt ? new Date(lastDoc.uploadedAt).getTime() : undefined,
        p._creationTime,
      ].filter(Boolean) as number[];
      const lastActivity = timestamps.length ? Math.max(...timestamps) : p._creationTime;

      // Tasks
      const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === "Complete").length;
      const todayTasks = tasks.filter((t) => t.dateScheduled === today && t.status !== "Complete").length;
      const overdueTasks = tasks.filter((t) => t.dateScheduled && t.dateScheduled < today && t.status !== "Complete").length;

      // Budget
      const budgetItems = await ctx.db.query("budgetLineItems").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      const contractValue = (p as any).contractValue || budgetItems.reduce((s: number, b: any) => s + (b.budgeted || 0), 0);
      const totalActual = budgetItems.reduce((s: number, b: any) => s + (b.actual || 0), 0);
      const changeOrders = await ctx.db.query("changeOrders").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      const approvedCOValue = changeOrders.filter((co) => co.status === "Approved").reduce((s, co) => s + ((co as any).amount || (co as any).estimatedCost || 0), 0);
      const revisedContract = contractValue + approvedCOValue;
      const budgetVariance = contractValue > 0 ? Math.round(((revisedContract - totalActual) / revisedContract) * 100) : 0;
      const budgetStatus = budgetVariance >= 10 ? "on-track" : budgetVariance >= 0 ? "tight" : "over";

      // Crew today
      const allCrew = await ctx.db.query("crew").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
      const projectCrew = allCrew.filter((c) => c.projectId === (p._id as any));
      const crewToday = projectCrew.filter((c) => {
        if (!c.start) return false;
        const start = c.start;
        const end = c.end || "9999-12-31";
        return start <= today && today <= end;
      }).length;

      // Emails
      const allEmails = await ctx.db.query("emails").withIndex("by_company", (q) => q.eq("companyId", String(args.companyId))).collect();
      const projectEmails = allEmails.filter((e) => e.projectId === (p._id as string));
      const unreadEmails = projectEmails.filter((e) => !e.isRead).length;

      // AI PM
      const aiPm = await ctx.db.query("aiProjectManagers").withIndex("by_project", (q) => q.eq("projectId", p._id)).first();

      // Recent photo
      const latestMedia = await ctx.db.query("siteMedia").withIndex("by_project", (q) => q.eq("projectId", p._id)).order("desc").first();
      const hasRecentPhoto = latestMedia && (Date.now() - latestMedia._creationTime < 86400000);

      // Health score
      let health = 100;
      if (overdueTasks > 0) health -= Math.min(overdueTasks * 5, 25);
      if (openRFIs > 3) health -= 10;
      if (openRisks > 2) health -= 10;
      if (budgetStatus === "over") health -= 20;
      if (budgetStatus === "tight") health -= 5;
      if (pendingSubmittals > 3) health -= 5;
      const lastDays = lastActivity ? Math.floor((Date.now() - lastActivity) / 86400000) : 30;
      if (lastDays > 14) health -= 15;
      else if (lastDays > 7) health -= 5;
      health = Math.max(0, Math.min(100, health));
      const healthStatus = health >= 80 ? "green" : health >= 50 ? "yellow" : "red";

      projectSummaries.push({
        _id: p._id,
        name: p.name,
        code: p.code,
        location: p.location,
        address: p.address,
        city: p.city,
        state: p.state,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        contractDate: p.contractDate,
        projectManager: p.projectManager,
        planStatus: (p as any).planStatus,
        lastActivity,
        activeRentals,
        weeklyBurn: pWeekly,
        costToDate: pCost,
        monthlyExposure,
        deliveryCount: deliveries.length,
        nextDeliveryETA: nextDelivery?.eta ?? null,
        openRFIs,
        openRisks,
        pendingSubmittals,
        concretePourCount: concretePours.length,
        // New fields
        totalTasks,
        completedTasks,
        todayTasks,
        overdueTasks,
        contractValue,
        revisedContract,
        totalActual,
        budgetVariance,
        budgetStatus,
        crewToday,
        unreadEmails,
        aiPmName: aiPm?.name || null,
        aiPmAvatar: aiPm?.avatar || null,
        aiPmId: aiPm?._id || null,
        hasRecentPhoto,
        health,
        healthStatus,
        rentalDetails,
        deliveries: deliveries.map((d) => ({
          _id: d._id,
          supplier: d.supplier,
          material: d.material,
          eta: d.eta,
          status: d.status,
        })),
      });
    }

    const maintDue = equipment.filter(
      (e) => e.nextDue && new Date(e.nextDue) <= in7
    ).length;

    const totalContractValue = projectSummaries.reduce((s, p) => s + ((p as any).contractValue || 0), 0);
    const totalDueToday = projectSummaries.reduce((s, p) => s + ((p as any).todayTasks || 0), 0);
    const criticalAlerts = projectSummaries.filter((p) => (p as any).healthStatus === "red").length;

    // Collect actual task items across all projects
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const overdueTasks: any[] = [];
    const thisWeekTasks: any[] = [];
    for (const p of activeProjects) {
      const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const t of tasks) {
        if (t.status === "Complete") continue;
        const item = { _id: t._id, projectId: p._id, projectName: p.name, task: t.task, customTask: t.customTask, status: t.status, dateScheduled: t.dateScheduled, priority: t.priority, progress: (t as any).progress, assignedTo: (t as any).assignedTo, blocker: (t as any).blocker };
        if (t.dateScheduled && t.dateScheduled < today) {
          overdueTasks.push(item);
        } else if (t.dateScheduled && t.dateScheduled >= today && t.dateScheduled <= weekEnd) {
          thisWeekTasks.push(item);
        }
      }
    }
    overdueTasks.sort((a, b) => (a.dateScheduled || "").localeCompare(b.dateScheduled || ""));
    thisWeekTasks.sort((a, b) => (a.dateScheduled || "").localeCompare(b.dateScheduled || ""));

    return {
      totalEquipment: equipment.length,
      totalProjects: activeProjects.length,
      totalRentals,
      weeklyBurn,
      costToDate,
      maintDue,
      totalContractValue,
      totalDueToday,
      criticalAlerts,
      overdueTasks: overdueTasks.slice(0, 15),
      thisWeekTasks: thisWeekTasks.slice(0, 15),
      projects: projectSummaries,
    };
  },
});
