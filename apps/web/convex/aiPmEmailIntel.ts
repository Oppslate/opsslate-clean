"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// AI PM scans all correspondence for their project, reads attachments, creates tasks/concerns/dates
export const scanProjectEmails = action({
  args: {
    pmId: v.string(),
    pmName: v.string(),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    personality: v.string(),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // 1. Get project details
    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    if (!project) throw new Error("Project not found");

    // 2. Get ALL emails for this project
    const allEmails = await ctx.runQuery(a.emails.list, { companyId: args.companyId as string, projectId: args.projectId as string });

    // Also get unassigned emails and search for project-related ones
    const unassignedEmails = await ctx.runQuery(a.emails.list, { companyId: args.companyId as string });
    const projectName = (project as any).name?.toLowerCase() || "";
    const projectCode = (project as any).code?.toLowerCase() || "";
    const projectAddress = (project as any).address?.toLowerCase() || "";

    // Find unassigned emails that might be related
    const relatedUnassigned = (unassignedEmails || []).filter((e: any) => {
      if (e.projectId) return false; // already assigned
      const text = `${e.subject || ""} ${e.body || ""} ${e.from || ""}`.toLowerCase();
      if (projectName && projectName.length > 3 && text.includes(projectName)) return true;
      if (projectCode && projectCode.length > 2 && text.includes(projectCode)) return true;
      if (projectAddress && projectAddress.length > 5 && text.includes(projectAddress)) return true;
      return false;
    });

    // Auto-assign related unassigned emails to this project and mark as processing
    for (const email of relatedUnassigned) {
      try {
        await ctx.runMutation(a.emails.update, {
          id: (email as any)._id,
          projectId: args.projectId as string,
          pipelineStatus: "processing",
          processedByPm: args.pmName,
        });
      } catch {}
    }

    // Mark all project emails as being processed
    for (const email of (allEmails || [])) {
      const e = email as any;
      if (e.pipelineStatus !== "filed" && e.pipelineStatus !== "processing") {
        try {
          await ctx.runMutation(a.emails.update, {
            id: e._id,
            pipelineStatus: "processing",
            processedByPm: args.pmName,
          });
        } catch {}
      }
    }

    const projectEmails = [...(allEmails || []), ...relatedUnassigned];
    if (projectEmails.length === 0) {
      // Log to PM chat
      await ctx.runMutation(a.aiPm.addMessage, {
        pmId: args.pmId as any, projectId: args.projectId, companyId: args.companyId,
        role: "pm", message: `📧 I scanned the correspondence inbox — no emails found for ${(project as any).name}. Once emails start coming in (forwarded to inbox@opsslate.app), I'll automatically process them.`,
      });
      return { emailsScanned: 0, tasksCreated: 0, concernsLogged: 0, datesFound: 0 };
    }

    // 3. Read all attachments from emails
    const attachmentContents: Array<{ emailSubject: string; fileName: string; content: string }> = [];
    for (const email of projectEmails) {
      const e = email as any;
      if (e.attachmentStorageIds && e.attachmentStorageIds.length > 0) {
        for (let i = 0; i < e.attachmentStorageIds.length; i++) {
          const storageId = e.attachmentStorageIds[i];
          const fileName = e.attachmentNames?.[i] || `attachment_${i}`;
          try {
            const result = await ctx.runAction(a.aiPmDocReader.readDocument, { storageId, fileName });
            const content = (result as any)?.content || "";
            if (content && content.length > 30 && !content.includes("Unsupported")) {
              attachmentContents.push({ emailSubject: e.subject || "(No subject)", fileName, content: content.slice(0, 5000) });
            } else {
              // Can't read — create critical task
              await ctx.runMutation(a.tasks.create, {
                projectId: args.projectId,
                task: "Other",
                customTask: `⚠️ UNREADABLE ATTACHMENT: ${fileName} (from email: ${e.subject || "?"})`,
                status: "Open",
                priority: "Critical",
                impact: `AI PM ${args.pmName} could not read this attachment. Re-upload as PDF or image.`,
                dateScheduled: new Date().toISOString().slice(0, 10),
              });
            }
          } catch {
            await ctx.runMutation(a.tasks.create, {
              projectId: args.projectId,
              task: "Other",
              customTask: `⚠️ UNREADABLE ATTACHMENT: ${fileName} (from email: ${e.subject || "?"})`,
              status: "Open",
              priority: "Critical",
              impact: `AI PM ${args.pmName} failed to open this file. May be corrupted or password-protected.`,
              dateScheduled: new Date().toISOString().slice(0, 10),
            });
          }
        }
      }
    }

    // 4. Build the full email digest for AI analysis
    const emailDigest = projectEmails.map((e: any) => {
      return `---EMAIL---
FROM: ${e.from || "?"}
TO: ${e.to || "?"}
DATE: ${e.date || "?"}
SUBJECT: ${e.subject || "(No subject)"}
BODY: ${(e.body || "").slice(0, 3000)}
${e.aiSummary ? `AI SUMMARY: ${e.aiSummary}` : ""}
${e.aiActionItems?.length ? `ACTION ITEMS: ${e.aiActionItems.join("; ")}` : ""}
${e.aiRiskFlags?.length ? `RISK FLAGS: ${e.aiRiskFlags.join("; ")}` : ""}`;
    }).join("\n\n");

    const attachmentDigest = attachmentContents.length > 0
      ? "\n\n===ATTACHMENTS===\n" + attachmentContents.map((a) => `---ATTACHMENT: ${a.fileName} (from: ${a.emailSubject})---\n${a.content}`).join("\n\n")
      : "";

    // 5. Send to Claude for analysis
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: `You are ${args.pmName}, an AI Project Manager for "${(project as any).name}" (${(project as any).address || ""}). 

Analyze ALL of the following project correspondence and attachments. Extract EVERYTHING actionable.

${emailDigest}
${attachmentDigest}

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "tasks": [
    { "description": "...", "priority": "Critical|High|Medium|Low", "dueDate": "YYYY-MM-DD or null", "source": "email subject or attachment name" }
  ],
  "concerns": [
    { "title": "...", "detail": "...", "severity": "critical|warning|info", "source": "..." }
  ],
  "scheduleDates": [
    { "event": "...", "date": "YYYY-MM-DD", "source": "..." }
  ],
  "summary": "2-3 paragraph briefing of everything found in the correspondence"
}

Rules:
- Extract EVERY task, action item, request, or deliverable mentioned
- Flag ANY concern: delays, cost overruns, safety issues, contract disputes, missing items, scope changes
- Extract ALL dates: deadlines, meetings, deliveries, inspections, milestones
- Include the source email/attachment for traceability
- If an attachment mentions specific dollar amounts, quantities, or specifications, include them
- Be thorough — miss nothing` }],
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI analysis failed: ${await aiResponse.text()}`);
    const aiResult = await aiResponse.json();
    const responseText = aiResult.content[0]?.text || "{}";

    let analysis;
    try {
      // Strip markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, still report to PM
      await ctx.runMutation(a.aiPm.addMessage, {
        pmId: args.pmId as any, projectId: args.projectId, companyId: args.companyId,
        role: "pm", message: `📧 I scanned ${projectEmails.length} emails and ${attachmentContents.length} attachments but had trouble organizing the results. Here's what I found:\n\n${responseText.slice(0, 3000)}`,
      });
      return { emailsScanned: projectEmails.length, attachmentsRead: attachmentContents.length, tasksCreated: 0, concernsLogged: 0, datesFound: 0 };
    }

    // 6. Create tasks
    let tasksCreated = 0;
    for (const task of (analysis.tasks || [])) {
      try {
        await ctx.runMutation(a.tasks.create, {
          projectId: args.projectId,
          task: "Other",
          customTask: `📧 ${task.description}`,
          status: "Open",
          priority: task.priority || "Medium",
          impact: `Source: ${task.source || "Email correspondence"}`,
          dateScheduled: task.dueDate || undefined,
        });
        tasksCreated++;
      } catch {}
    }

    // 7. Log concerns as PM tasks (high visibility)
    let concernsLogged = 0;
    for (const concern of (analysis.concerns || [])) {
      try {
        await ctx.runMutation(a.aiPm.createTask, {
          pmId: args.pmId as any,
          projectId: args.projectId,
          companyId: args.companyId,
          description: `${concern.severity === "critical" ? "🔴" : concern.severity === "warning" ? "🟡" : "🔵"} ${concern.title}: ${concern.detail} (Source: ${concern.source || "?"})`,
          type: "general",
        });
        // Also create a project task for critical concerns
        if (concern.severity === "critical") {
          await ctx.runMutation(a.tasks.create, {
            projectId: args.projectId,
            task: "Other",
            customTask: `🔴 CONCERN: ${concern.title}`,
            status: "Open",
            priority: "Critical",
            impact: `${concern.detail} — Source: ${concern.source || "Email"}`,
            dateScheduled: new Date().toISOString().slice(0, 10),
          });
        }
        concernsLogged++;
      } catch {}
    }

    // 8. Create calendar/schedule tasks for dates
    let datesFound = 0;
    for (const sched of (analysis.scheduleDates || [])) {
      try {
        await ctx.runMutation(a.tasks.create, {
          projectId: args.projectId,
          task: "Other",
          customTask: `📅 ${sched.event}`,
          status: "Open",
          priority: "High",
          impact: `Source: ${sched.source || "Email correspondence"}`,
          dateScheduled: sched.date || undefined,
        });
        datesFound++;
      } catch {}
    }

    // 9. Post the full briefing to PM chat
    const briefing = `📧 **EMAIL INTELLIGENCE REPORT** — ${(project as any).name}

📬 Scanned: ${projectEmails.length} emails, ${attachmentContents.length} attachments read
${relatedUnassigned.length > 0 ? `🔗 Auto-assigned ${relatedUnassigned.length} unassigned emails to this project\n` : ""}
**SUMMARY:**
${analysis.summary || "No summary available"}

**ACTIONS TAKEN:**
✅ ${tasksCreated} tasks created on the project
⚠️ ${concernsLogged} concerns logged${analysis.concerns?.filter((c: any) => c.severity === "critical").length > 0 ? ` (${analysis.concerns.filter((c: any) => c.severity === "critical").length} CRITICAL)` : ""}
📅 ${datesFound} schedule dates added

${analysis.concerns?.filter((c: any) => c.severity === "critical").length > 0 ? "\n🔴 CRITICAL CONCERNS:\n" + analysis.concerns.filter((c: any) => c.severity === "critical").map((c: any) => `• ${c.title}: ${c.detail}`).join("\n") : ""}

All items are now on your dashboard and calendar. I'll keep monitoring incoming emails.`;

    await ctx.runMutation(a.aiPm.addMessage, {
      pmId: args.pmId as any, projectId: args.projectId, companyId: args.companyId,
      role: "pm", message: briefing,
    });

    // 10. Mark all processed emails as "filed" with extraction stats
    for (const email of projectEmails) {
      const e = email as any;
      try {
        await ctx.runMutation(a.emails.update, {
          id: e._id,
          pipelineStatus: "filed",
          processedByPm: args.pmName,
          processedAt: Date.now(),
          extractedContacts: 0,
          extractedTasks: tasksCreated,
          extractedDates: datesFound,
        });
      } catch {}
    }

    return {
      emailsScanned: projectEmails.length,
      attachmentsRead: attachmentContents.length,
      tasksCreated,
      concernsLogged,
      datesFound,
      relatedEmailsAssigned: relatedUnassigned.length,
    };
  },
});
