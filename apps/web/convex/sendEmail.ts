"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { emailFrom, emailReplyTo } from "./emailConfig";

export const send = action({
  args: {
    companyId: v.string(),
    to: v.string(),
    cc: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    html: v.optional(v.string()),
    projectId: v.optional(v.string()),
    senderName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const toAddresses = args.to.split(",").map((e) => e.trim()).filter(Boolean);
    const ccAddresses = args.cc ? args.cc.split(",").map((e) => e.trim()).filter(Boolean) : [];

    // Convert plain text body to simple HTML
    const htmlBody = args.body
      .split("\n")
      .map((line) => (line.trim() === "" ? "<br/>" : `<p style="margin:0 0 8px 0;color:#333;font-size:14px;line-height:1.6">${line}</p>`))
      .join("");

    const senderLabel = args.senderName || "OpsSlate";

    const html = args.html ?? `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        ${htmlBody}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px"/>
        <p style="font-size:11px;color:#9ca3af;margin:0">
          Sent via <a href="https://www.opsslate.app" style="color:#3b82f6;text-decoration:none">OpsSlate</a> — AI-Powered Construction Management
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(senderLabel),
        reply_to: emailReplyTo(),
        to: toAddresses,
        cc: ccAddresses.length > 0 ? ccAddresses : undefined,
        subject: args.subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to send email: ${err}`);
    }

    const result = await res.json();
    return { success: true, messageId: result.id, to: toAddresses, subject: args.subject };
  },
});
