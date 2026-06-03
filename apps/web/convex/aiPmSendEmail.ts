"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { emailFrom, emailReplyTo } from "./emailConfig";

export const send = action({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    pmId: v.id("aiProjectManagers"),
    pmName: v.string(),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    // Send the email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: emailFrom(`${args.pmName} via OpsSlate`),
        to: [args.to],
        subject: args.subject,
        text: args.body,
        reply_to: emailReplyTo(),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Email send failed: ${err}`);
    }

    // Log the sent email in Communications
    try {
      await ctx.runMutation(a.emails.create as any, {
        companyId: args.companyId as string,
        projectId: args.projectId as string,
        subject: args.subject,
        from: emailFrom(`${args.pmName} (AI PM)`),
        to: args.to,
        cc: "",
        date: new Date().toISOString().slice(0, 10),
        body: args.body,
        bodyPreview: args.body.slice(0, 200),
        source: "AI PM",
        category: "outgoing",
        importance: "normal",
        isRead: true,
        hasAttachments: false,
        attachmentNames: [],
      });
    } catch {}

    // Log in PM chat
    await ctx.runMutation(a.aiPm.addMessage, {
      pmId: args.pmId,
      projectId: args.projectId,
      companyId: args.companyId,
      role: "pm",
      message: `✅ Email sent to ${args.to}\nSubject: ${args.subject}\n\n${args.body}`,
    });

    return { sent: true, to: args.to, subject: args.subject };
  },
});

// Draft an email using AI based on a prompt
export const draft = action({
  args: {
    pmId: v.id("aiProjectManagers"),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    pmName: v.string(),
    personality: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    if (!project) throw new Error("Project not found");

    // Get context
    let rfis: any[] = [];
    try { rfis = await ctx.runQuery(a.rfis.list, { projectId: args.projectId, companyId: args.companyId }) || []; } catch {}
    let submittals: any[] = [];
    try { submittals = await ctx.runQuery(a.submittals.list, { projectId: args.projectId, companyId: args.companyId }) || []; } catch {}
    let contacts: any[] = [];
    try { contacts = await ctx.runQuery(a.contacts.list, { projectId: args.projectId }) || []; } catch {}

    const contactList = contacts.map((c: any) => `${c.name || c.firstName || "?"} <${c.email || "no email"}> (${c.role || c.trade || "?"})`).join("\n");

    const systemPrompt = `You are ${args.pmName}, an AI Project Manager drafting a professional email for the construction project "${project.name}".

Write the email in a professional construction industry tone. The email should be ready to send — include a proper greeting, body, and closing.

Available contacts for this project:
${contactList || "No contacts on file"}

Project: ${project.name} (${project.code || "?"})
Location: ${project.location || project.address || "?"}

Respond in this EXACT JSON format:
{
  "to": "recipient email address",
  "subject": "email subject line",
  "body": "full email body text"
}

If you don't know the recipient's email, use the most likely contact from the list above. If no contacts have emails, leave "to" as "NEED_EMAIL" and explain in the body.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: args.prompt }],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const text = result.content[0]?.text || "{}";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}

    return { to: "NEED_EMAIL", subject: "Draft", body: text };
  },
});
