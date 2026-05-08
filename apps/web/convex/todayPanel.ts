import { query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const deliveriesToday = [];
    const deliveriesTomorrow = [];
    const lateDeliveries = [];
    const incomingDeliveries = [];
    const offRentWarnings = [];
    const criticalRFIs = [];
    const pendingApprovals = [];
    const upcomingPours = [];

    const activeProjects = projects.filter((p) => p.status !== "Inactive" && p.status !== "Archived");

    for (const p of activeProjects) {
      // Deliveries
      const deliveries = await ctx.db
        .query("deliveries")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      for (const d of deliveries) {
        if (d.status === "Delivered" || d.status === "Arrived" || d.status === "Cancelled") continue;
        if (d.eta === today) deliveriesToday.push({ ...d, projectName: p.name });
        else if (d.eta === tomorrow) deliveriesTomorrow.push({ ...d, projectName: p.name });
        else if (d.eta && d.eta < today) lateDeliveries.push({ ...d, projectName: p.name });
        // All upcoming (today + future, not delivered)
        if (d.eta && d.eta >= today) incomingDeliveries.push({ ...d, projectName: p.name });
      }

      // Rentals — off-rent warnings
      const rentals = await ctx.db
        .query("rentals")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      for (const r of rentals) {
        if (r.status === "Off Rent") continue;
        const start = r.start ? new Date(r.start) : now;
        const days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (24 * 3600 * 1000)));
        const rate = r.rate ?? 0;
        const qty = r.qty ?? 1;
        const base = rate * qty;
        const weekly = r.rateType === "daily" ? base * 7 : base;
        const costToDate = (r.rateType === "daily" ? base : base / 7) * days;

        // Flag if end date passed or equipment idle > 7 days without verification
        const overdue = r.end && r.end < today;
        const unverified = days > 7 && !r.lastVerified;

        if (overdue || unverified) {
          offRentWarnings.push({
            _id: r._id,
            equipmentId: r.equipmentId,
            vendor: r.vendor,
            projectName: p.name,
            days,
            weekly,
            costToDate,
            reason: overdue ? "Past end date" : "Unverified > 7 days",
          });
        }
      }

      // RFIs — critical/aging
      const rfis: any[] = await ctx.db
        .query("rfis")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      for (const r of rfis) {
        if (r.status === "Closed") continue;
        const sent = r.dateSent ? new Date(r.dateSent) : null;
        const daysOpen = sent ? Math.ceil((now.getTime() - sent.getTime()) / (24 * 3600 * 1000)) : 0;
        const required = r.responseRequired ? new Date(r.responseRequired) : null;
        const overdue = required && required < now;

        if (overdue || daysOpen > 7) {
          criticalRFIs.push({
            _id: r._id,
            number: r.number,
            subject: r.subject,
            projectName: p.name,
            daysOpen,
            overdue: !!overdue,
            ballInCourt: r.ballInCourt,
          });
        }
      }

      // Submittals — pending
      const submittals: any[] = await ctx.db
        .query("submittals")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      for (const s of submittals as any[]) {
        if (s.status === "Approved" || s.status === "Closed") continue;
        const submitted = s.dateSubmitted ? new Date(s.dateSubmitted) : null;
        const daysWaiting = submitted ? Math.ceil((now.getTime() - submitted.getTime()) / (24 * 3600 * 1000)) : 0;
        if (daysWaiting > 3 || !s.status || s.status === "Pending") {
          pendingApprovals.push({
            _id: s._id,
            number: s.number,
            description: s.description,
            projectName: p.name,
            daysWaiting,
            ballInCourt: s.ballInCourt,
          });
        }
      }

      // Concrete pours — upcoming 7 days
      const pours = await ctx.db
        .query("concretePours")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      for (const c of pours) {
        if (c.status === "Poured" || c.status === "Cancelled") continue;
        if (c.date && c.date >= today && c.date <= new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)) {
          upcomingPours.push({ ...c, projectName: p.name });
        }
      }
    }

    // Crew starting today
    const crewToday = [];
    for (const p of projects) {
      const members = await ctx.db
        .query("crew")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      for (const m of members) {
        if (m.status === "Active" && m.start === today) {
          crewToday.push({
            ...m,
            projectName: p.name,
            location: p.address ? `${p.address}${p.city ? ", " + p.city : ""}${p.state ? ", " + p.state : ""}` : p.location ?? "",
          });
        }
      }
    }

    // Yesterday's daily logs summary
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const dailyLogsSummary = [];
    for (const p of projects) {
      const logs = await ctx.db
        .query("dailyLogs")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      for (const l of logs) {
        if (l.date === yesterday && l.status === "submitted") {
          dailyLogsSummary.push({
            ...l,
            projectName: p.name,
          });
        }
      }
    }

    // Sort incoming by ETA
    incomingDeliveries.sort((a, b) => (a.eta ?? "").localeCompare(b.eta ?? ""));

    // U-Dig Utility Locates — active tickets
    const udigActive = [];
    const allUdig = await ctx.db.query("udigTickets").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    for (const u of allUdig) {
      if (u.status === "Open" || u.status === "Pending") {
        const proj = u.projectId ? projects.find((p) => p._id === u.projectId) : null;
        udigActive.push({
          ticketNumber: u.ticketNumber,
          address: u.address,
          city: u.city,
          state: u.state,
          dateCalled: u.dateCalled,
          completionDate: u.completionDate,
          status: u.status,
          projectId: u.projectId,
          projectName: proj?.name ?? "Unassigned",
        });
      }
    }

    return {
      today,
      deliveriesToday,
      deliveriesTomorrow,
      lateDeliveries,
      incomingDeliveries,
      offRentWarnings,
      criticalRFIs,
      pendingApprovals,
      upcomingPours,
      crewToday,
      dailyLogsSummary,
      udigActive,
    };
  },
});
