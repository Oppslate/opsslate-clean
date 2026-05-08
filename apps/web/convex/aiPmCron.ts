"use node";

import { internalAction } from "./_generated/server";

// Automated morning briefings from all AI PMs + Director
export const sendMorningBriefings = internalAction({
  handler: async (ctx) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    if (!apiKey || !resendKey) return;

    // Get all companies that have AI PMs
    const allPms = await ctx.runQuery(a.aiPm.list, { companyId: "kd7dcc6qqsm83v2hrgvhzbzbyd81qf1e" as any });
    if (!allPms || allPms.length === 0) return;

    const companyId = "kd7dcc6qqsm83v2hrgvhzbzbyd81qf1e";
    const activePms = allPms.filter((pm: any) => pm.status === "active");

    // Generate report for each PM
    const pmReports: Array<{ name: string; avatar: string; project: string; report: string }> = [];

    for (const pm of activePms) {
      try {
        const result = await ctx.runAction(a.aiPmEngine.dailyReport, {
          pmId: pm._id,
          projectId: pm.projectId,
          companyId: companyId,
          pmName: pm.name,
          personality: pm.personality,
        });
        if (result?.report) {
          const project = await ctx.runQuery(a.projects.getById, { id: pm.projectId });
          pmReports.push({
            name: pm.name,
            avatar: pm.avatar,
            project: project?.name || "Unknown",
            report: result.report,
          });
        }
      } catch (e) {
        console.error(`PM ${pm.name} report failed:`, e);
      }
    }

    if (pmReports.length === 0) return;

    // Generate Director's executive summary
    let directorSummary = "";
    try {
      const dirResult = await ctx.runAction(a.aiDirector.chat, {
        companyId: companyId as any,
        message: "Give me a concise morning executive briefing. Top priorities across all projects, any conflicts or risks, and your top 3 recommendations for today. Keep it under 200 words.",
      });
      directorSummary = dirResult?.reply || "";
    } catch (e) {
      console.error("Director summary failed:", e);
    }

    // Build the email HTML
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const pmSections = pmReports.map((pm) => `
      <div style="margin-bottom: 24px; border-left: 4px solid #f97316; padding-left: 16px;">
        <h3 style="color: #f97316; margin: 0 0 4px 0; font-size: 16px;">${pm.avatar} ${pm.name} — ${pm.project}</h3>
        <div style="color: #d1d5db; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${pm.report.replace(/\n/g, "<br>").replace(/\*\*/g, "").replace(/\*/g, "")}</div>
      </div>
    `).join("");

    const directorSection = directorSummary ? `
      <div style="margin-bottom: 32px; background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.1)); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 20px;">
        <h2 style="color: #a78bfa; margin: 0 0 12px 0; font-size: 18px;">👔 Director's Executive Summary</h2>
        <div style="color: #d1d5db; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${directorSummary.replace(/\n/g, "<br>").replace(/\*\*/g, "").replace(/\*/g, "")}</div>
      </div>
    ` : "";

    const html = `
    <div style="background: #0b0f14; color: #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f97316; margin: 0; font-size: 24px;">🤖 AI PM Morning Briefing</h1>
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">${date}</p>
        <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 12px;">${pmReports.length} AI Project Managers reporting</p>
      </div>

      ${directorSection}

      <h2 style="color: #f97316; border-bottom: 1px solid #374151; padding-bottom: 8px; margin-bottom: 20px; font-size: 18px;">📋 Individual PM Reports</h2>
      ${pmSections}

      <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #374151;">
        <a href="https://www.opsslate.app/ai-pm" style="display: inline-block; background: linear-gradient(135deg, #f97316, #d97706); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Open AI PM Dashboard →</a>
        <p style="color: #6b7280; font-size: 11px; margin-top: 16px;">OpsSlate AI Project Management • Hybrid Building Solutions</p>
      </div>
    </div>`;

    // Send via Resend
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "AI PM Team <notifications@opsslate.app>",
          to: ["mike@hybridbuildingsolutions.com"],
          subject: `🤖 AI PM Morning Briefing — ${date}`,
          html,
        }),
      });
      if (!response.ok) console.error("Email send failed:", await response.text());
    } catch (e) {
      console.error("Email send error:", e);
    }
  },
});
