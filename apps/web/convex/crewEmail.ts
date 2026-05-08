"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const sendNotification = action({
  args: { crewId: v.id("crew") },
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = (await import("./_generated/api")).api as any;

    const member = await ctx.runQuery(a.crew.getById, { id: args.crewId });
    if (!member) throw new Error("Crew member not found");
    if (!member.email) throw new Error("No email address for this crew member");

    const project = await ctx.runQuery(a.projects.getById, { id: member.projectId });
    const projectName = project?.name ?? "Unknown Project";
    const location = project?.address
      ? `${project.address}${project.city ? ", " + project.city : ""}${project.state ? ", " + project.state : ""}`
      : project?.location ?? "";

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">OpsSlate Crew Assignment</h2>
        <p>Hi <strong>${member.firstName}${member.lastName ? " " + member.lastName : ""}</strong>,</p>
        <p>You have been assigned to a project. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f4f4f5;">
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Project</td>
            <td style="padding: 10px; border: 1px solid #e4e4e7;">${projectName}</td>
          </tr>
          ${member.trade ? `<tr><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Trade</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.trade}</td></tr>` : ""}
          ${member.task ? `<tr style="background: #f4f4f5;"><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Task</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.task}</td></tr>` : ""}
          ${member.phaseCode ? `<tr><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Phase Code</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.phaseCode}</td></tr>` : ""}
          ${location ? `<tr style="background: #f4f4f5;"><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Location</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${location}</td></tr>` : ""}
          ${member.start ? `<tr style="background: #f4f4f5;"><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">Start Date</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.start}</td></tr>` : ""}
          ${member.end ? `<tr><td style="padding: 10px; font-weight: bold; border: 1px solid #e4e4e7;">End Date</td><td style="padding: 10px; border: 1px solid #e4e4e7;">${member.end}</td></tr>` : ""}
        </table>
        <p style="color: #71717a; font-size: 12px;">Sent from OpsSlate</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Hybrid Briefing <notifications@opsslate.app>",
        to: member.email,
        subject: `Crew Assignment: ${projectName}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Email failed: ${err}`);
    }

    return { success: true, to: member.email };
  },
});
