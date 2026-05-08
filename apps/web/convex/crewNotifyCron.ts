"use node";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";

export const sendUpcomingNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get date 5 days from now
    const target = new Date();
    target.setDate(target.getDate() + 5);
    const targetDate = target.toISOString().slice(0, 10);

    // Get all companies, then all crew starting on target date
    // Since we can't query all crew directly, get all projects
    const companies = await ctx.runQuery(api.crewNotifyHelper.getAllActiveCrewByDate as any, { date: targetDate });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    for (const member of companies) {
      if (!member.email) continue;

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">OpsSlate — Upcoming Crew Assignment</h2>
          <p>Hi <strong>${member.firstName}${member.lastName ? " " + member.lastName : ""}</strong>,</p>
          <p>You have an assignment starting in <strong>5 days</strong> on <strong>${member.start}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f4f4f5;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Project</td>
              <td style="padding: 10px; border: 1px solid #e4e4e7;">${member.projectName}</td>
            </tr>
            ${member.trade ? `<tr><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Trade</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.trade}</td></tr>` : ""}
            ${member.task ? `<tr style="background: #f4f4f5;"><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Task</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.task}</td></tr>` : ""}
            ${member.location ? `<tr><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Location</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.location}</td></tr>` : ""}
            <tr style="background: #f4f4f5;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Start Date</td>
              <td style="padding: 10px; border: 1px solid #e4e4e7;">${member.start}</td>
            </tr>
            ${member.end ? `<tr><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">End Date</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.end}</td></tr>` : ""}
          </table>
          <p style="color: #71717a; font-size: 12px;">Sent from OpsSlate</p>
        </div>
      `;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: "Hybrid Briefing <notifications@opsslate.app>",
            to: member.email,
            subject: `Upcoming Assignment: ${member.projectName} — Starting ${member.start}`,
            html,
          }),
        });
      } catch (e) {
        console.error("Failed to send crew email:", member.email, e);
      }
    }
  },
});
