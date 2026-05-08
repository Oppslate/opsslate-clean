"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const sendInvite = action({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.string(),
    invitedBy: v.string(),
    companyName: v.string(),
    tempPassword: v.optional(v.string()),
    isExistingUser: v.optional(v.boolean()),
    setupToken: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");

    const roleLabels: Record<string, string> = {
      owner: "Owner — Full access to all features, billing, and team management",
      admin: "Admin — Access to all modules, no billing or company deletion",
      pm: "Project Manager — Manage assigned projects, crew, budgets, and documents",
      field: "Field User — Daily logs, time tracking, safety reports, and site media",
    };

    const rolePerms: Record<string, string[]> = {
      owner: ["All modules", "Billing & subscriptions", "Team management", "Company settings"],
      admin: ["All modules", "Team management", "Reports & analytics"],
      pm: ["Daily Logs", "Crew", "Budget", "RFIs", "Submittals", "Change Orders", "Documents", "Correspondence", "Time Tracking", "Punch List", "Safety", "Site Media"],
      field: ["Daily Logs", "Time Tracking", "Safety & Incidents", "Site Media", "Punch List"],
    };

    const setupUrl = args.setupToken
      ? `https://www.opsslate.app/setup-account?token=${args.setupToken}`
      : "https://www.opsslate.app/login";
    const perms = rolePerms[args.role] || rolePerms.field;
    const roleLabel = roleLabels[args.role]?.split(" — ")[0] || args.role;
    const roleDesc = roleLabels[args.role]?.split(" — ")[1] || "";

    const credentialsBlock = args.isExistingUser
      ? `<p style="font-size: 15px; color: #ccc; line-height: 1.6;">You already have an OpsSlate account — log in with your existing credentials.</p>`
      : `<div style="background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; margin: 20px 0;">
           <p style="margin: 0 0 12px; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Login Email</p>
           <p style="margin: 0; color: #fff; font-weight: 600; font-size: 18px;">${args.email}</p>
           <p style="margin: 12px 0 0; color: #4ea8ff; font-size: 13px;">You'll choose your own password when you set up your account.</p>
         </div>`;

    const permsList = perms.map((p) => `<li style="padding: 3px 0; color: #ccc;">${p}</li>`).join("");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "OpsSlate <notifications@opsslate.app>",
        to: [args.email],
        subject: `Your OpsSlate Account — ${args.companyName}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #fff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px;">🏗️</span>
              <h1 style="font-size: 24px; margin: 10px 0 0;">Welcome to OpsSlate</h1>
              <p style="color: #888; margin: 6px 0 0; font-size: 14px;">${args.companyName}</p>
            </div>

            <p style="font-size: 15px; color: #ccc; line-height: 1.6;">
              Hi <strong>${args.name}</strong>,
            </p>
            <p style="font-size: 15px; color: #ccc; line-height: 1.6;">
              <strong>${args.invitedBy}</strong> has set up your account on OpsSlate.
            </p>

            ${credentialsBlock}

            <div style="background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 4px; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Role</p>
              <p style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #fff;">${roleLabel}</p>
              <p style="margin: 0 0 16px; font-size: 13px; color: #888;">${roleDesc}</p>
              <p style="margin: 0 0 8px; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Permissions</p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                ${permsList}
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${setupUrl}" style="background: linear-gradient(135deg, #f97316, #f59e0b); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
                ${args.isExistingUser ? "Log In Now →" : "Set Up Your Account →"}
              </a>
            </div>

            <p style="font-size: 12px; color: #555; text-align: center; margin-top: 30px;">
              OpsSlate — AI-Powered Construction Project Management<br/>
              www.opsslate.app
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Email failed: ${err}`);
    }

    return { ok: true };
  },
});
