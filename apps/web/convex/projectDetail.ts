import { query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { projectId: v.id("projects"), companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    if (String(project.companyId) !== String(args.companyId)) return null;

    const rentals = await ctx.db.query("rentals").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const deliveries = await ctx.db.query("deliveries").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const pours = await ctx.db.query("concretePours").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const rfis = await ctx.db.query("rfis").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const submittals = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const risks = await ctx.db.query("risks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const contacts = await ctx.db.query("contacts").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const allEmails = await ctx.db.query("emails").withIndex("by_company", (q) => q.eq("companyId", String(project.companyId))).collect();
    const emails = allEmails.filter((e) => e.projectId === (args.projectId as string));
    const allSubs = await ctx.db.query("subcontractors").withIndex("by_company", (q) => q.eq("companyId", project.companyId)).collect();
    const projectSubs = allSubs.filter((s) => s.projectIds?.includes(args.projectId as string));
    const mediaRaw = await ctx.db.query("siteMedia").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    // Resolve storage URLs for any that are storageIds
    const recentMedia = [];
    for (const m of mediaRaw.sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0))) {
      let resolvedUrl = m.url;
      // If url looks like a storageId (not a full URL), resolve it
      if (m.url && !m.url.startsWith("http")) {
        try {
          const signed = await ctx.storage.getUrl(m.url as any);
          if (signed) resolvedUrl = signed;
        } catch { /* keep original */ }
      }
      // Also try resolving URLs that use the old /api/storage/ pattern
      if (m.url && m.url.includes("/api/storage/")) {
        try {
          const sid = m.url.replace(/.*\/api\/storage\//, "");
          const signed = await ctx.storage.getUrl(sid as any);
          if (signed) resolvedUrl = signed;
        } catch { /* keep original */ }
      }
      recentMedia.push({ ...m, url: resolvedUrl });
    }

    // Equipment lookup
    const equipIds = [...new Set(rentals.map((r) => r.equipmentId))];
    const equipment = [];
    for (const id of equipIds) {
      const e = await ctx.db.get(id);
      if (e) equipment.push(e);
    }
    const equipMap = Object.fromEntries(equipment.map((e) => [e._id, e]));

    // Rental calcs
    let weeklyBurn = 0;
    let costToDate = 0;
    const rentalDetails = rentals.map((r) => {
      const rate = r.rate ?? 0;
      const qty = r.qty ?? 1;
      const base = rate * qty;
      const weekly = r.rateType === "daily" ? base * 7 : base;
      const daily = r.rateType === "daily" ? base : base / 7;
      const start = r.start ? new Date(r.start) : now;
      const days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (24 * 3600 * 1000)));
      const ctd = daily * days;
      const overdue = r.end ? r.end < today : false;
      const unverified = days > 7 && !r.lastVerified;
      if (r.status !== "Off Rent") { weeklyBurn += weekly; costToDate += ctd; }
      return {
        ...r,
        equipmentName: equipMap[r.equipmentId]?.name ?? "Unknown",
        days, weekly, costToDate: ctd, overdue, unverified,
      };
    });

    // Budget & financial data
    const budgetHeader = await ctx.db.query("budget").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).first();
    const budgetItems = await ctx.db.query("budgetLineItems").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const changeOrders = await ctx.db.query("changeOrders").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    
    // Budget calculations
    const totalBudgeted = budgetItems.reduce((sum, b) => sum + ((b as any).budgeted || 0), 0);
    const totalCommitted = budgetItems.reduce((sum, b) => sum + ((b as any).committed || 0), 0);
    const totalActual = budgetItems.reduce((sum, b) => sum + ((b as any).actual || 0), 0);
    const totalVariance = totalBudgeted - totalActual;
    
    // Change order calcs
    const approvedCOs = changeOrders.filter((co) => co.status === "Approved");
    const pendingCOs = changeOrders.filter((co) => co.status === "Pending" || co.status === "Submitted");
    const totalApprovedCOValue = approvedCOs.reduce((sum, co) => sum + ((co as any).amount || (co as any).estimatedCost || 0), 0);
    const totalPendingCOValue = pendingCOs.reduce((sum, co) => sum + ((co as any).amount || (co as any).estimatedCost || 0), 0);
    
    // Contract value (from project or sum of budget)
    const originalContractValue = (project as any).contractValue || totalBudgeted || 0;
    const revisedContractValue = originalContractValue + totalApprovedCOValue;
    const billedToDate = totalActual;
    const remainingToBill = revisedContractValue - billedToDate;
    const percentComplete = revisedContractValue > 0 ? Math.round((billedToDate / revisedContractValue) * 100) : 0;
    const profitMargin = revisedContractValue > 0 ? Math.round(((revisedContractValue - totalActual) / revisedContractValue) * 100) : 0;

    const activeRentals = rentals.filter((r) => r.status !== "Off Rent").length;
    const monthlyExposure = weeklyBurn * (30 / 7);
    const openRFIs = rfis.filter((r) => r.status !== "Closed").length;
    const openRisks = risks.filter((r) => r.status !== "Closed").length;
    const pendingSubmittals = submittals.filter((s) => s.status !== "Approved" && s.status !== "Closed").length;
    const lateDeliveries = deliveries.filter((d) => d.eta && d.eta < today && d.status !== "Delivered").length;

    return {
      project,
      kpis: { activeRentals, weeklyBurn, costToDate, monthlyExposure, openRFIs, openRisks, pendingSubmittals, lateDeliveries, deliveryCount: deliveries.length, pourCount: pours.length },
      rentals: rentalDetails,
      deliveries,
      pours,
      rfis,
      submittals,
      risks,
      tasks,
      contacts,
      emails,
      subcontractors: projectSubs,
      media: recentMedia,
      financials: {
        originalContractValue,
        revisedContractValue,
        totalApprovedCOValue,
        totalPendingCOValue,
        approvedCOCount: approvedCOs.length,
        pendingCOCount: pendingCOs.length,
        totalBudgeted,
        totalCommitted,
        totalActual,
        totalVariance,
        billedToDate,
        remainingToBill,
        percentComplete,
        profitMargin,
        budgetItems,
        changeOrders,
      },
    };
  },
});
