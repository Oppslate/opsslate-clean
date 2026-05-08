"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

function extractHeader(rawText: string, label: string) {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, "im");
  return rawText.match(regex)?.[1]?.trim() || "";
}

function fallbackParseEmail(rawText: string) {
  const from = extractHeader(rawText, "From");
  const to = extractHeader(rawText, "To");
  const cc = extractHeader(rawText, "Cc") || extractHeader(rawText, "CC");
  const subject = extractHeader(rawText, "Subject");
  const date = extractHeader(rawText, "Date") || new Date().toISOString().slice(0, 10);

  const body = rawText
    .split(/\r?\n\r?\n/)
    .slice(1)
    .join("\n\n")
    .trim() || rawText.slice(0, 5000);

  return {
    email: {
      from: from || "Unknown",
      to,
      cc,
      subject: subject || "(No Subject)",
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
      body,
    },
    newContacts: [],
    tasks: [],
    scheduleDates: [],
    issues: [],
    fallback: true,
  };
}

// Process a pasted email: extract fields, contacts, tasks, schedule dates
export const processRawEmail = action({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    rawText: v.string(),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    const projectName = (project as any)?.name || "Unknown";

    // Get existing contacts to check for new ones
    const contacts = await ctx.runQuery(a.contacts.list, { projectId: args.projectId });
    const existingEmails = new Set((contacts || []).map((c: any) => (c.email || "").toLowerCase()).filter(Boolean));
    const existingNames = new Set((contacts || []).map((c: any) => `${c.firstName} ${c.lastName || ""}`.trim().toLowerCase()).filter(Boolean));

    let parsed: any = fallbackParseEmail(args.rawText);

    if (apiKey) {
      try {
        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            messages: [{ role: "user", content: `You are processing a raw pasted email for a construction project called "${projectName}". Extract all information.

RAW EMAIL TEXT:
${args.rawText.slice(0, 10000)}

EXISTING PROJECT CONTACTS (do not duplicate these):
${(contacts || []).map((c: any) => `- ${c.firstName} ${c.lastName || ""} <${c.email || "?"}> (${c.role || "?"}, ${c.company || "?"})`).join("\n") || "None"}

Respond with ONLY valid JSON:
{
  "email": {
    "from": "sender name and email",
    "to": "recipient name and email",
    "cc": "cc recipients or empty string",
    "date": "YYYY-MM-DD format",
    "subject": "email subject line",
    "body": "cleaned email body text without headers"
  },
  "newContacts": [],
  "tasks": [],
  "scheduleDates": [],
  "issues": []
}

Rules:
- Extract the email header fields (From, To, CC, Date, Subject) from the raw text
- For the body, remove all header lines and forwarding artifacts
- For newContacts: ONLY include people NOT already in the existing contacts list
- For tasks: extract action items, requests, deadlines, or deliverables
- For scheduleDates: extract dates mentioned
- For issues: flag concerns, problems, delays, disputes, or risks
- If you can't determine a field, use reasonable defaults.` }],
          }),
        });

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          const responseText = result.content[0]?.text || "{}";
          const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          parsed = JSON.parse(cleaned);
        }
      } catch {
        // Fall back to non-AI parsing so upload/save still works.
      }
    }

    const email = parsed.email || {};

    // 1. Save the email to the project
    const emailId = await ctx.runMutation(a.emails.create, {
      companyId: args.companyId as string,
      projectId: args.projectId as string,
      subject: email.subject || "(No Subject)",
      from: email.from || "Unknown",
      to: email.to || "",
      cc: email.cc || "",
      date: email.date || new Date().toISOString().slice(0, 10),
      body: email.body || args.rawText.slice(0, 5000),
      bodyPreview: (email.body || args.rawText).slice(0, 200),
      source: "Pasted Upload",
      category: "incoming",
      isRead: true,
      pipelineStatus: "filed",
    });

    // 2. Add new contacts
    let contactsAdded = 0;
    for (const contact of (parsed.newContacts || [])) {
      const emailLower = (contact.email || "").toLowerCase();
      const nameLower = `${contact.firstName} ${contact.lastName || ""}`.trim().toLowerCase();
      if (existingEmails.has(emailLower) || existingNames.has(nameLower)) continue;
      try {
        await ctx.runMutation(a.contacts.create, {
          projectId: args.projectId,
          firstName: contact.firstName || "Unknown",
          lastName: contact.lastName || undefined,
          company: contact.company || undefined,
          role: contact.role || undefined,
          trade: contact.trade || undefined,
          email: contact.email || undefined,
          notes: `Auto-added from email: ${email.subject || "uploaded email"}`,
          status: "Active",
        });
        contactsAdded++;
        existingEmails.add(emailLower);
        existingNames.add(nameLower);
      } catch {}
    }

    // 3. Create tasks
    let tasksCreated = 0;
    for (const task of (parsed.tasks || [])) {
      try {
        await ctx.runMutation(a.tasks.create, {
          projectId: args.projectId,
          task: "Other",
          customTask: `📧 ${task.description}`,
          status: "Open",
          priority: task.priority || "Medium",
          dateScheduled: task.dueDate || undefined,
          impact: `Extracted from email: ${email.subject || "uploaded"}`,
        });
        tasksCreated++;
      } catch {}
    }

    // 4. Create schedule tasks
    let datesFound = 0;
    for (const sched of (parsed.scheduleDates || [])) {
      try {
        await ctx.runMutation(a.tasks.create, {
          projectId: args.projectId,
          task: "Other",
          customTask: `📅 ${sched.event}`,
          status: "Open",
          priority: "High",
          dateScheduled: sched.date || undefined,
          impact: `Schedule date from email: ${email.subject || "uploaded"}`,
        });
        datesFound++;
      } catch {}
    }

    // 5. Create PM tasks for issues
    let issuesLogged = 0;
    const pm = await ctx.runQuery(a.aiPm.getByProject, { projectId: args.projectId });
    for (const issue of (parsed.issues || [])) {
      if (issue.severity === "critical") {
        try {
          await ctx.runMutation(a.tasks.create, {
            projectId: args.projectId,
            task: "Other",
            customTask: `⚠️ ${issue.title}`,
            status: "Open",
            priority: "Critical",
            impact: `${issue.detail} — from email: ${email.subject || "uploaded"}`,
            dateScheduled: new Date().toISOString().slice(0, 10),
          });
        } catch {}
      }
      if (pm) {
        try {
          await ctx.runMutation(a.aiPm.createTask, {
            pmId: (pm as any)._id,
            projectId: args.projectId,
            companyId: args.companyId,
            description: `${issue.severity === "critical" ? "🔴" : issue.severity === "warning" ? "🟡" : "🔵"} ${issue.title}: ${issue.detail}`,
            type: "general",
          });
        } catch {}
      }
      issuesLogged++;
    }

    return {
      email: { from: email.from, to: email.to, cc: email.cc, date: email.date, subject: email.subject },
      contactsAdded,
      tasksCreated,
      datesFound,
      issuesLogged,
      emailId,
    };
  },
});
