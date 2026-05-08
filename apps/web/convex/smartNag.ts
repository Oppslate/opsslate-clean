import { query } from "./_generated/server";
import { v } from "convex/values";

export const getNags = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const nags: Array<{
      id: string;
      type: string;
      severity: "critical" | "warning" | "info";
      icon: string;
      title: string;
      detail: string;
      project: string;
      projectId: string;
      action?: string;
      actionLabel?: string;
      daysOverdue?: number;
    }> = [];

    const projects = await ctx.db.query("projects")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const activeProjects = projects.filter((p) => p.status !== "Inactive" && p.status !== "Archived");

    for (const p of activeProjects) {
      // 1. Overdue RFIs
      const rfis: any[] = await ctx.db.query("rfis").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const r of rfis) {
        if (r.responseRequired && r.status !== "Closed" && r.responseRequired < todayStr) {
          const days = Math.ceil((new Date(todayStr).getTime() - new Date(r.responseRequired).getTime()) / 86400000);
          nags.push({
            id: `rfi_${r._id}`, type: "rfi", severity: days > 5 ? "critical" : "warning",
            icon: "❓", title: `RFI ${r.number || ""} overdue by ${days} days`,
            detail: `${r.subject || "No subject"} — Ball in ${r.ballInCourt || "unknown"}'s court`,
            project: p.name, projectId: p._id, daysOverdue: days,
            action: "draft_followup", actionLabel: "📧 Draft Follow-up"
          });
        }
      }

      // 2. Overdue submittals
      const submittals: any[] = await ctx.db.query("submittals").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const s of submittals) {
        if (s.dateRequired && s.status !== "Approved" && s.status !== "Closed" && s.dateRequired < todayStr) {
          const days = Math.ceil((new Date(todayStr).getTime() - new Date(s.dateRequired).getTime()) / 86400000);
          nags.push({
            id: `sub_${s._id}`, type: "submittal", severity: days > 7 ? "critical" : "warning",
            icon: "📋", title: `Submittal ${s.number || ""} overdue by ${days} days`,
            detail: `${s.description || "?"} — Status: ${s.status}`,
            project: p.name, projectId: p._id, daysOverdue: days,
          });
        }
      }

      // 3. Deliveries marked Shipped but never Arrived (5+ days)
      const deliveries = await ctx.db.query("deliveries").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const d of deliveries) {
        if (d.status === "Shipped" && d.eta) {
          const etaDate = new Date(d.eta).getTime();
          const daysSinceEta = Math.ceil((now - etaDate) / 86400000);
          if (daysSinceEta >= 3) {
            nags.push({
              id: `del_${d._id}`, type: "delivery", severity: daysSinceEta > 7 ? "critical" : "warning",
              icon: "🚚", title: `Delivery "${d.material || "?"}" shipped ${daysSinceEta} days ago — never confirmed arrived`,
              detail: `Supplier: ${d.supplier || "?"} | ETA was ${d.eta}`,
              project: p.name, projectId: p._id, daysOverdue: daysSinceEta,
              action: "confirm_delivery", actionLabel: "✅ Mark Arrived"
            });
          }
        }
      }

      // 4. No field notes in 3+ days on active projects
      const notes = await ctx.db.query("fieldNotes").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      const lastNote = notes.length > 0 ? Math.max(...notes.map((n) => n.createdAt || 0)) : 0;
      const daysSinceNote = lastNote ? Math.ceil((now - lastNote) / 86400000) : 999;
      if (daysSinceNote >= 3 && daysSinceNote < 999) {
        nags.push({
          id: `notes_${p._id}`, type: "field_notes", severity: daysSinceNote > 7 ? "warning" : "info",
          icon: "📝", title: `No field notes in ${daysSinceNote} days`,
          detail: `Last note logged ${daysSinceNote} days ago`,
          project: p.name, projectId: p._id,
          action: "add_note", actionLabel: "📝 Log Note"
        });
      }

      // 5. Concrete pour coming up without recent inspection note
      const pours = await ctx.db.query("concretePours").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const pour of pours) {
        if (pour.date && pour.date >= todayStr) {
          const daysUntil = Math.ceil((new Date(pour.date).getTime() - new Date(todayStr).getTime()) / 86400000);
          if (daysUntil <= 3 && daysUntil >= 0) {
            nags.push({
              id: `pour_${pour._id}`, type: "pour", severity: daysUntil === 0 ? "critical" : "warning",
              icon: "🧱", title: `Concrete pour ${daysUntil === 0 ? "TODAY" : `in ${daysUntil} day${daysUntil > 1 ? "s" : ""}`} — is inspection scheduled?`,
              detail: `${pour.pour || "Pour"} — ${pour.cy || "?"} CY — ${pour.supplier || "?"}`,
              project: p.name, projectId: p._id,
            });
          }
        }
      }

      // 6. Open punch items on projects nearing end date
      if (p.endDate) {
        const daysToEnd = Math.ceil((new Date(p.endDate).getTime() - now) / 86400000);
        if (daysToEnd <= 14 && daysToEnd > -7) {
          const punchItems = await ctx.db.query("punchList").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
          const openPunch = punchItems.filter((pi) => pi.status !== "Complete" && pi.status !== "Verified");
          if (openPunch.length > 0) {
            nags.push({
              id: `punch_${p._id}`, type: "punch", severity: daysToEnd <= 3 ? "critical" : "warning",
              icon: "✅", title: `${openPunch.length} open punch items — project ${daysToEnd <= 0 ? "PAST DUE" : `ends in ${daysToEnd} days`}`,
              detail: openPunch.slice(0, 3).map((pi) => pi.description || "?").join(", "),
              project: p.name, projectId: p._id,
            });
          }
        }
      }

      // 7. Tasks overdue
      const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const t of tasks) {
        if (t.dateScheduled && t.status !== "Complete" && t.dateScheduled < todayStr) {
          const days = Math.ceil((new Date(todayStr).getTime() - new Date(t.dateScheduled).getTime()) / 86400000);
          if (days >= 2) {
            nags.push({
              id: `task_${t._id}`, type: "task", severity: days > 7 ? "critical" : "warning",
              icon: "⏰", title: `Task overdue by ${days} days: "${t.customTask || t.task}"`,
              detail: `Priority: ${t.priority || "Normal"} | Assigned: ${(t as any).assignedTo || "Unassigned"}`,
              project: p.name, projectId: p._id, daysOverdue: days,
            });
          }
        }
      }

      // 8. Rental returns coming up (2 days warning)
      const rentals = await ctx.db.query("rentals").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect();
      for (const r of rentals) {
        if (r.end && r.status !== "Off Rent") {
          const daysUntil = Math.ceil((new Date(r.end).getTime() - now) / 86400000);
          if (daysUntil <= 2 && daysUntil >= -3) {
            const eq = r.equipmentId ? await ctx.db.get(r.equipmentId) : null;
            nags.push({
              id: `rental_${r._id}`, type: "rental", severity: daysUntil <= 0 ? "critical" : "warning",
              icon: "🏗️", title: `Rental ${daysUntil <= 0 ? "PAST DUE" : daysUntil === 0 ? "due TODAY" : `due in ${daysUntil} days`}: ${eq?.name || "Equipment"}`,
              detail: `Vendor: ${r.vendor || "?"} | Return date: ${r.end}`,
              project: p.name, projectId: p._id,
              action: "extend_rental", actionLabel: "📞 Extend/Return"
            });
          }
        }
      }
    }

    // 9. Insurance expirations (company-wide)
    const subs = await ctx.db.query("subcontractors").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    for (const s of subs) {
      if (s.insuranceExpiry) {
        const daysUntil = Math.ceil((new Date(s.insuranceExpiry).getTime() - now) / 86400000);
        if (daysUntil <= 14 && daysUntil > -7) {
          nags.push({
            id: `ins_${s._id}`, type: "insurance", severity: daysUntil <= 0 ? "critical" : daysUntil <= 5 ? "warning" : "info",
            icon: "🛡️", title: `Insurance ${daysUntil <= 0 ? "EXPIRED" : `expires in ${daysUntil} days`}: ${s.name || "Sub"}`,
            detail: `Expiry: ${s.insuranceExpiry} | Contact: ${s.contactName || s.phone || "?"}`,
            project: "Company-wide", projectId: "",
            action: "send_reminder", actionLabel: "📧 Send Reminder"
          });
        }
      }
    }

    // Sort: critical first, then warning, then info. Within each, most overdue first.
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    nags.sort((a, b) => {
      const diff = severityOrder[a.severity] - severityOrder[b.severity];
      if (diff !== 0) return diff;
      return (b.daysOverdue || 0) - (a.daysOverdue || 0);
    });

    return nags;
  },
});
