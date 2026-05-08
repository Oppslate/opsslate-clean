import { query } from "./_generated/server";
import { v } from "convex/values";

export const events = query({
  args: { companyId: v.id("companies"), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const filtered = args.projectId
      ? projects.filter((p) => p._id === args.projectId)
      : projects;

    const events: Array<{
      id: string;
      date: string;
      title: string;
      type: string;
      project: string;
      projectId: string;
      detail?: string;
      priority?: string;
    }> = [];

    for (const p of filtered) {
      // Rentals
      const rentals = await ctx.db.query("rentals").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const r of rentals) {
        if (r.start) {
          const eq = r.equipmentId ? await ctx.db.get(r.equipmentId) : null;
          events.push({ id: r._id, date: r.start, title: `🏗️ Rental Start: ${eq?.name ?? "Equipment"}`, type: "rental-start", project: p.name, projectId: p._id, detail: r.vendor ?? "" });
        }
        if (r.end) {
          const eq = r.equipmentId ? await ctx.db.get(r.equipmentId) : null;
          events.push({ id: r._id + "_end", date: r.end, title: `🔴 Rental End: ${eq?.name ?? "Equipment"}`, type: "rental-end", project: p.name, projectId: p._id, detail: r.vendor ?? "", priority: "high" });
        }
      }

      // Deliveries
      const deliveries = await ctx.db.query("deliveries").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const d of deliveries) {
        if (d.eta) {
          events.push({ id: d._id, date: d.eta, title: `🚚 ${d.material ?? "Delivery"}`, type: "delivery", project: p.name, projectId: p._id, detail: d.supplier ?? "" });
        }
      }

      // Concrete pours
      const pours = await ctx.db.query("concretePours").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const c of pours) {
        if (c.date) {
          events.push({ id: c._id, date: c.date, title: `🧱 Pour: ${c.pour ?? "Concrete"}`, type: "pour", project: p.name, projectId: p._id, detail: `${c.cy ?? "?"} CY — ${c.supplier ?? ""}`, priority: c.weatherRisk === "High" ? "high" : undefined });
        }
      }

      // RFI deadlines
      const rfis: any[] = await ctx.db.query("rfis").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const r of rfis) {
        if (r?.responseRequired && r.status !== "Closed") {
          events.push({ id: r._id, date: r?.responseRequired, title: `📋 RFI Due: ${r.number ?? ""} ${r.subject ?? ""}`, type: "rfi", project: p.name, projectId: p._id, detail: `Ball: ${r?.ballInCourt ?? "?"}`, priority: "high" });
        }
      }

      // Submittal deadlines
      const submittals: any[] = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const s of submittals as any[]) {
        if (s.dateRequired && s.status !== "Approved" && s.status !== "Closed") {
          events.push({ id: s._id, date: s.dateRequired, title: `📝 Submittal Due: ${s.description ?? s.number ?? ""}`, type: "submittal", project: p.name, projectId: p._id, detail: `Ball: ${s?.ballInCourt ?? "?"}` });
        }
      }

      // Scheduled Tasks
      const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const t of tasks) {
        if (t.dateScheduled && t.status !== "Complete") {
          const taskName = t.customTask || t.task;
          events.push({ id: t._id, date: t.dateScheduled, title: `📌 Task: ${taskName}`, type: "task", project: p.name, projectId: p._id, detail: t.priority ? `Priority: ${t.priority}` : undefined, priority: t.priority === "Critical" || t.priority === "High" ? "high" : undefined });
        }
        if (t.dateComplete) {
          const taskName = t.customTask || t.task;
          events.push({ id: t._id + "_done", date: t.dateComplete, title: `✅ Completed: ${taskName}`, type: "task-done", project: p.name, projectId: p._id });
        }
      }

      // Crew start/end dates
      const crew = await ctx.db.query("crew").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const c of crew) {
        if (c.start) {
          events.push({ id: c._id + "_start", date: c.start, title: `👷 Crew Start: ${c.firstName || c.trade || "Crew"}`, type: "crew-start", project: p.name, projectId: p._id, detail: c.trade || "" });
        }
        if (c.end) {
          events.push({ id: c._id + "_end", date: c.end, title: `👷 Crew End: ${c.firstName || c.trade || "Crew"}`, type: "crew-end", project: p.name, projectId: p._id, detail: c.trade || "" });
        }
      }

      // U-Dig ticket dates
      const udigTickets = await ctx.db.query("udigTickets").withIndex("by_project", (q) => q.eq("companyId", args.companyId as string).eq("projectId", p._id as string)).collect();
      for (const u of udigTickets) {
        if (u.dateCalled) {
          events.push({ id: u._id + "_call", date: u.dateCalled, title: `🔧 U-Dig Called: ${u.ticketNumber || "Locate"}`, type: "udig", project: p.name, projectId: p._id, detail: u.status || "" });
        }
        if (u.completionDate) {
          events.push({ id: u._id + "_complete", date: u.completionDate, title: `✅ U-Dig Complete: ${u.ticketNumber || "Locate"}`, type: "udig", project: p.name, projectId: p._id });
        }
      }

      // Project start/end milestones
      if (p.startDate) {
        events.push({ id: p._id + "_pstart", date: p.startDate, title: `🏁 Project Start: ${p.name}`, type: "milestone", project: p.name, projectId: p._id, priority: "high" });
      }
      if (p.endDate) {
        events.push({ id: p._id + "_pend", date: p.endDate, title: `🏁 Project End: ${p.name}`, type: "milestone", project: p.name, projectId: p._id, priority: "high" });
      }

      // Insurance expirations (from subcontractors)
      const subs = await ctx.db.query("subcontractors").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
      for (const s of subs) {
        if (s.insuranceExpiry) {
          const expDate = new Date(s.insuranceExpiry);
          const daysUntil = Math.ceil((expDate.getTime() - Date.now()) / 86400000);
          if (daysUntil <= 30 && daysUntil > -7) {
            events.push({ id: s._id + "_ins", date: s.insuranceExpiry, title: `🛡️ Insurance Expires: ${s.name || "Sub"}`, type: "insurance", project: "Company", projectId: "", detail: daysUntil <= 0 ? "EXPIRED" : `${daysUntil} days left`, priority: daysUntil <= 7 ? "high" : undefined });
          }
        }
      }

      // Equipment maintenance
      const equipment = await ctx.db.query("equipment").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
      for (const e of equipment) {
        if (e.nextDue) {
          events.push({ id: e._id, date: e.nextDue, title: `🔧 Service Due: ${e.name}`, type: "maintenance", project: "Fleet", projectId: "", detail: `${e.hours ?? 0} hrs` });
        }
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  },
});
