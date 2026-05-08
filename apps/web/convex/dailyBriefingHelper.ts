import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAllCompanies = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("companies").collect();
  },
});

export const getCalendarData = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekOut = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const events: Array<{
      date: string;
      title: string;
      type: string;
      project: string;
      projectId: string;
      detail?: string;
    }> = [];

    for (const p of projects) {
      // Rentals
      const rentals = await ctx.db.query("rentals").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const r of rentals) {
        if (r.start && r.start >= today && r.start <= weekOut) {
          const eq = r.equipmentId ? await ctx.db.get(r.equipmentId) : null;
          events.push({ date: r.start, title: `Rental Start: ${eq?.name ?? "Equipment"}`, type: "rental", project: p.name, projectId: p._id, detail: r.vendor ?? "" });
        }
        if (r.end && r.end >= today && r.end <= weekOut) {
          const eq = r.equipmentId ? await ctx.db.get(r.equipmentId) : null;
          events.push({ date: r.end, title: `Rental End: ${eq?.name ?? "Equipment"}`, type: "rental", project: p.name, projectId: p._id, detail: r.vendor ?? "" });
        }
      }

      // Deliveries
      const deliveries = await ctx.db.query("deliveries").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const d of deliveries) {
        if (d.eta && d.eta >= today && d.eta <= weekOut && d.status !== "Delivered") {
          events.push({ date: d.eta, title: `Delivery: ${d.material ?? "Material"}`, type: "delivery", project: p.name, projectId: p._id, detail: d.supplier ?? "" });
        }
      }

      // Concrete pours
      const pours = await ctx.db.query("concretePours").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const c of pours) {
        if (c.date && c.date >= today && c.date <= weekOut && c.status !== "Poured" && c.status !== "Cancelled") {
          events.push({ date: c.date, title: `Pour: ${c.pour ?? "Concrete"} (${c.cy ?? "?"} CY)`, type: "pour", project: p.name, projectId: p._id, detail: c.supplier ?? "" });
        }
      }

      // RFI deadlines
      const rfis: any[] = await ctx.db.query("rfis").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const r of rfis) {
        if (r?.responseRequired && r?.responseRequired >= today && r?.responseRequired <= weekOut && r.status !== "Closed") {
          events.push({ date: r?.responseRequired, title: `RFI Due: ${r.number ?? ""} ${r.subject ?? ""}`, type: "rfi", project: p.name, projectId: p._id, detail: `Ball: ${r?.ballInCourt ?? "?"}` });
        }
      }

      // Submittal deadlines
      const submittals: any[] = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const s of submittals as any[]) {
        if (s.dateRequired && s.dateRequired >= today && s.dateRequired <= weekOut && s.status !== "Approved" && s.status !== "Closed") {
          events.push({ date: s.dateRequired, title: `Submittal Due: ${s.description ?? s.number ?? ""}`, type: "submittal", project: p.name, projectId: p._id, detail: `Ball: ${s?.ballInCourt ?? "?"}` });
        }
      }

      // Crew starting
      const crew = await ctx.db.query("crew").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const m of crew) {
        if (m.start && m.start >= today && m.start <= weekOut && m.status === "Active") {
          events.push({ date: m.start, title: `Crew: ${m.firstName}${m.lastName ? " " + m.lastName : ""} (${m.trade ?? ""})`, type: "crew", project: p.name, projectId: p._id, detail: m.task ?? "" });
        }
      }

      // U-Dig Utility Locates
      const udigTickets = await ctx.db.query("udigTickets").withIndex("by_project", (q) => q.eq("companyId", args.companyId).eq("projectId", p._id)).collect();
      for (const u of udigTickets) {
        // Show tickets called today or this week
        if (u.dateCalled && u.dateCalled >= today && u.dateCalled <= weekOut) {
          events.push({ date: u.dateCalled, title: `U-Dig Called: Ticket #${u.ticketNumber}`, type: "udig", project: p.name, projectId: p._id, detail: `${u.address}, ${u.city} ${u.state} — ${u.status ?? "Open"}` });
        }
        // Show completion dates this week
        if (u.completionDate && u.completionDate >= today && u.completionDate <= weekOut && u.status !== "Complete" && u.status !== "Expired") {
          events.push({ date: u.completionDate, title: `U-Dig Due: Ticket #${u.ticketNumber}`, type: "udig", project: p.name, projectId: p._id, detail: `${u.address}, ${u.city} — LOCATE EXPIRES` });
        }
        // Flag open/pending tickets as active items
        if ((u.status === "Open" || u.status === "Pending") && u.dateCalled && u.dateCalled <= today) {
          events.push({ date: today, title: `⚠️ U-Dig Active: Ticket #${u.ticketNumber}`, type: "udig", project: p.name, projectId: p._id, detail: `${u.address}, ${u.city} — ${u.status}` });
        }
      }

      // Equipment maintenance
      const equipment = await ctx.db.query("equipment").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
      for (const e of equipment) {
        if (e.nextDue && e.nextDue >= today && e.nextDue <= weekOut) {
          events.push({ date: e.nextDue, title: `Service Due: ${e.name}`, type: "maintenance", project: "Fleet", projectId: "", detail: `${e.hours ?? 0} hrs` });
        }
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  },
});
