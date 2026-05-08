"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const sendResetEmail = action({
  args: { email: v.string(), name: v.string(), resetToken: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");

    const resetUrl = `https://www.opsslate.app/reset-password?token=${args.resetToken}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "OpsSlate <notifications@opsslate.app>",
        to: [args.email],
        subject: "Reset Your OpsSlate Password",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #fff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px;">🔒</span>
              <h1 style="font-size: 24px; margin: 10px 0 0;">Password Reset</h1>
            </div>
            <p style="font-size: 15px; color: #ccc; line-height: 1.6;">
              Hi <strong>${args.name}</strong>,
            </p>
            <p style="font-size: 15px; color: #ccc; line-height: 1.6;">
              We received a request to reset your OpsSlate password. Click the button below to choose a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #f97316, #f59e0b); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
                Reset Password →
              </a>
            </div>
            <p style="font-size: 13px; color: #666; line-height: 1.6;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: 1px solid #222; margin: 24px 0;" />
            <p style="font-size: 12px; color: #555; text-align: center;">
              OpsSlate — AI-Powered Construction Project Management<br/>www.opsslate.app
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

export const sendLoginReminder = action({
  args: { email: v.string(), name: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "OpsSlate <notifications@opsslate.app>",
        to: [args.email],
        subject: "Your OpsSlate Login Info",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #fff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px;">👤</span>
              <h1 style="font-size: 24px; margin: 10px 0 0;">Your Login Info</h1>
            </div>
            <p style="font-size: 15px; color: #ccc; line-height: 1.6;">
              Hi <strong>${args.name}</strong>,
            </p>
            <p style="font-size: 15px; color: #ccc; line-height: 1.6;">
              Your OpsSlate login email is: <strong style="font-size: 18px;">${args.email}</strong>
            </p>
            <p style="font-size: 15px; color: #ccc; line-height: 1.6;">
              If you've forgotten your password, use the "Forgot Password" link on the login page.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.opsslate.app/login" style="background: linear-gradient(135deg, #f97316, #f59e0b); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
                Go to Login →
              </a>
            </div>
            <hr style="border: 1px solid #222; margin: 24px 0;" />
            <p style="font-size: 12px; color: #555; text-align: center;">
              OpsSlate — AI-Powered Construction Project Management<br/>www.opsslate.app
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) throw new Error("Email failed");
    return { ok: true };
  },
});
