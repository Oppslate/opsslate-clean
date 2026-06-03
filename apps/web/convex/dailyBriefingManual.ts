"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { emailFrom, emailReplyTo } from "./emailConfig";

export const sendToProfile = action({
  args: { profileId: v.id("notificationProfiles") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");

    const profile = await ctx.runQuery(a.notificationProfiles.getById, { id: args.profileId });
    if (!profile) throw new Error("Profile not found");

    const todayData = await ctx.runQuery(a.todayPanel.get, { companyId: profile.companyId });
    const calendarData = await ctx.runQuery(a.dailyBriefingHelper.getCalendarData, { companyId: profile.companyId });

    const html = buildEmail(profile, todayData, calendarData);
    if (!html) throw new Error("No data to send — briefing is empty");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom("OpsSlate Briefing"),
        reply_to: emailReplyTo(),
        to: profile.email,
        subject: `Hybrid Briefing — ${todayData.today}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Email failed: ${err}`);
    }

    return { success: true, to: profile.email };
  },
});

function buildEmail(profile: any, today: any, calendar: any): string | null {
  const sections: string[] = [];
  const projectFilter = profile.projectIds?.length > 0 ? profile.projectIds : null;

  const filterByProject = (items: any[]) => {
    if (!projectFilter) return items;
    return items.filter((i: any) => projectFilter.includes(i.projectId ?? i._id));
  };

  sections.push(`
    <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a2e; margin-bottom: 5px;">Hybrid Briefing</h1>
      <p style="color: #71717a; margin-top: 0;">${today.today} | ${profile.name}</p>
      <hr style="border: 1px solid #e4e4e7; margin: 20px 0;">
  `);

  const showTodayPanel = profile.type === "full_dashboard" || profile.includeTodayPanel;
  const showCalendar = profile.type === "full_dashboard" || profile.includeCalendar;
  const showCrew = profile.type === "full_dashboard" || profile.type === "crew_schedule" || profile.includeCrewSchedule;
  const isJobUpdates = profile.type === "job_updates";

  if (showTodayPanel || isJobUpdates) {
    const deliveries = filterByProject(today.deliveriesToday ?? []);
    if (deliveries.length > 0) {
      sections.push(`<h3 style="color: #1a1a2e;">Deliveries Today (${deliveries.length})</h3>`);
      sections.push(tableHtml(["Project", "Material", "Supplier", "ETA"], deliveries.map((d: any) => [d.projectName, d.material ?? "", d.supplier ?? "", d.eta ?? ""])));
    }
    const late = filterByProject(today.lateDeliveries ?? []);
    if (late.length > 0) {
      sections.push(`<h3 style="color: #dc2626;">Late Deliveries (${late.length})</h3>`);
      sections.push(tableHtml(["Project", "Material", "Supplier", "ETA"], late.map((d: any) => [d.projectName, d.material ?? "", d.supplier ?? "", d.eta ?? ""])));
    }
    const offRent = filterByProject(today.offRentWarnings ?? []);
    if (offRent.length > 0) {
      sections.push(`<h3 style="color: #dc2626;">Off-Rent Warnings (${offRent.length})</h3>`);
      sections.push(tableHtml(["Project", "Vendor", "Days", "Reason"], offRent.map((r: any) => [r.projectName, r.vendor ?? "", String(r.days), r.reason ?? ""])));
    }
    const rfis = filterByProject(today.criticalRFIs ?? []);
    if (rfis.length > 0) {
      sections.push(`<h3 style="color: #f59e0b;">Critical RFIs (${rfis.length})</h3>`);
      sections.push(tableHtml(["#", "Subject", "Project", "Days Open"], rfis.map((r: any) => [r.number ?? "", r.subject ?? "", r.projectName, String(r.daysOpen)])));
    }
    const approvals = filterByProject(today.pendingApprovals ?? []);
    if (approvals.length > 0) {
      sections.push(`<h3 style="color: #f59e0b;">Pending Approvals (${approvals.length})</h3>`);
      sections.push(tableHtml(["#", "Description", "Project", "Days Waiting"], approvals.map((s: any) => [s.number ?? "", s.description ?? "", s.projectName, String(s.daysWaiting)])));
    }
    const pours = filterByProject(today.upcomingPours ?? []);
    if (pours.length > 0) {
      sections.push(`<h3>Upcoming Concrete Pours (${pours.length})</h3>`);
      sections.push(tableHtml(["Date", "Pour", "CY", "Project"], pours.map((c: any) => [c.date ?? "", c.pour ?? "", String(c.cy ?? ""), c.projectName])));
    }
  }

  if (showCrew || isJobUpdates) {
    const crew = filterByProject(today.crewToday ?? []);
    if (crew.length > 0) {
      sections.push(`<h3>Crew Starting Today (${crew.length})</h3>`);
      sections.push(tableHtml(["Name", "Trade", "Task", "Project", "Location"], crew.map((m: any) => [`${m.firstName}${m.lastName ? " " + m.lastName : ""}`, m.trade ?? "", m.task ?? "", m.projectName ?? "", m.location ?? ""])));
    }
  }

  if (showCalendar) {
    const events = calendar ?? [];
    if (events.length > 0) {
      sections.push(`<h3>Calendar — Next 7 Days (${events.length})</h3>`);
      sections.push(tableHtml(["Date", "Event", "Project", "Detail"], events.map((e: any) => [e.date, e.title, e.project ?? "", e.detail ?? ""])));
    }
  }

  if (sections.length <= 1) return null;

  sections.push(`
      <hr style="border: 1px solid #e4e4e7; margin: 20px 0;">
      <p style="color: #71717a; font-size: 12px;">Sent manually from OpsSlate</p>
    </div>
  `);

  return sections.join("\n");
}

function tableHtml(headers: string[], rows: string[][]): string {
  const ths = headers.map((h) => `<th style="padding: 8px 12px; text-align: left; border: 1px solid #e4e4e7; background: #f4f4f5; font-size: 13px;">${h}</th>`).join("");
  const trs = rows.map((row, i) => {
    const bg = i % 2 === 0 ? "" : ' style="background: #fafafa;"';
    const tds = row.map((cell) => `<td style="padding: 8px 12px; border: 1px solid #e4e4e7; font-size: 13px;">${cell}</td>`).join("");
    return `<tr${bg}>${tds}</tr>`;
  }).join("");
  return `<table style="width: 100%; border-collapse: collapse; margin: 10px 0;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}
