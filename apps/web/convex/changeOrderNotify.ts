"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const notifyCrew = action({
  args: { changeOrderId: v.id("changeOrders") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const co = await ctx.runQuery(a.changeOrders.getById, { id: args.changeOrderId });
    if (!co) throw new Error("Change order not found");
    if (!co.notifyCrewIds?.length) return { sent: 0 };

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(resendKey);

    // Look up crew emails
    let sent = 0;
    for (const crewId of co.notifyCrewIds) {
      try {
        const crew = await ctx.runQuery(a.crew.getById, { id: crewId });
        if (!crew?.email) continue;

        const costLine = co.estimatedCost ? `<p><strong>Estimated Cost Impact:</strong> $${co.estimatedCost.toLocaleString()}</p>` : "";
        const scheduleLine = co.scheduleDaysImpact ? `<p><strong>Schedule Impact:</strong> ${co.scheduleDaysImpact} days</p>` : "";
        const tradesLine = co.affectedTrades?.length ? `<p><strong>Affected Trades:</strong> ${co.affectedTrades.join(", ")}</p>` : "";
        const areaLine = co.affectedArea ? `<p><strong>Area:</strong> ${co.affectedArea}</p>` : "";

        const statusColors: Record<string, string> = {
          Pending: "#f59e0b",
          "Under Review": "#3b82f6",
          Approved: "#22c55e",
          Rejected: "#ef4444",
        };
        const statusColor = statusColors[co.status] ?? "#888";

        await resend.emails.send({
          from: "OpsSlate <notifications@opsslate.app>",
          to: crew.email,
          subject: `🔄 Change Order #${co.number}: ${co.title} — ${co.projectName}`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; padding: 24px; border-radius: 12px;">
              <div style="border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 16px;">
                <h1 style="margin: 0; font-size: 20px; color: #fff;">🔄 Change Order #${co.number}</h1>
                <p style="margin: 4px 0 0; color: #aaa; font-size: 14px;">${co.projectName}</p>
              </div>

              <div style="background: #16213e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <h2 style="margin: 0 0 8px; font-size: 16px; color: #fff;">${co.title}</h2>
                <span style="display: inline-block; background: ${statusColor}; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">${co.status}</span>
              </div>

              ${co.description ? `<p style="font-size: 14px; line-height: 1.6;">${co.description}</p>` : ""}
              ${costLine}
              ${scheduleLine}
              ${tradesLine}
              ${areaLine}
              ${co.scopeDescription ? `<div style="background: #16213e; border-radius: 8px; padding: 12px; margin: 12px 0;"><strong>Scope Change:</strong><br/>${co.scopeDescription}</div>` : ""}

              <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #333;">
                <p style="font-size: 12px; color: #888;">Hi ${crew.firstName}, this change order affects your work on ${co.projectName}. Please review and coordinate with your PM.</p>
                <a href="https://www.opsslate.app/change-orders" style="display: inline-block; background: #3b82f6; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px;">View in OpsSlate</a>
              </div>

              <p style="font-size: 11px; color: #555; margin-top: 20px; text-align: center;">OpsSlate — Your operations, one slate.</p>
            </div>
          `,
        });
        sent++;
      } catch (e) {
        console.error("Failed to notify crew:", crewId, e);
      }
    }
    return { sent };
  },
});
