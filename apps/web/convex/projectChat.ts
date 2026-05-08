"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const ask = action({
  args: { projectId: v.id("projects"), companyId: v.id("companies"), question: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    if (!project) throw new Error("Project not found");

    // Gather ALL project data
    let fieldNotes: any[] = [];
    try { fieldNotes = await ctx.runQuery(a.fieldNotes.list, { projectId: args.projectId }) || []; } catch {}

    let documents: any[] = [];
    try { documents = await ctx.runQuery(a.docManager.list, { companyId: args.companyId, projectId: args.projectId as string }) || []; } catch {}

    let emails: any[] = [];
    try {
      const allEmails = await ctx.runQuery(a.emails.list, { companyId: args.companyId as string }) || [];
      emails = allEmails.filter((e: any) => e.projectId === args.projectId);
    } catch {}

    let tasks: any[] = [];
    try { tasks = await ctx.runQuery(a.tasks.list, { projectId: args.projectId }) || []; } catch {}

    let rfis: any[] = [];
    try { rfis = await ctx.runQuery(a.rfis.list, { projectId: args.projectId, companyId: args.companyId }) || []; } catch {}

    let submittals: any[] = [];
    try { submittals = await ctx.runQuery(a.submittals.list, { projectId: args.projectId, companyId: args.companyId }) || []; } catch {}

    let crew: any[] = [];
    try {
      const allCrew = await ctx.runQuery(a.crew.list, { companyId: args.companyId }) || [];
      crew = allCrew.filter((c: any) => c.projectId === args.projectId);
    } catch {}

    let changeOrders: any[] = [];
    try { changeOrders = await ctx.runQuery(a.changeOrders.list, { projectId: args.projectId }) || []; } catch {}

    let budget: any[] = [];
    try { budget = await ctx.runQuery(a.budget.list, { projectId: args.projectId }) || []; } catch {}

    let punchList: any[] = [];
    try { punchList = await ctx.runQuery(a.punchList.list, { projectId: args.projectId }) || []; } catch {}

    let deliveries: any[] = [];
    try { deliveries = await ctx.runQuery(a.deliveries.list, { projectId: args.projectId }) || []; } catch {}

    let rentals: any[] = [];
    try { rentals = await ctx.runQuery(a.rentals.list, { projectId: args.projectId }) || []; } catch {}

    const dataContext = `
PROJECT: ${project.name}${project.code ? ` (${project.code})` : ""}
LOCATION: ${project.location || project.address || "N/A"}
STATUS: ${project.status || "Active"}
START: ${project.startDate || "Not set"} | END: ${project.endDate || "Not set"}

FIELD NOTES (${fieldNotes.length} total, last 20):
${fieldNotes.slice(-20).map((n: any) => `[${new Date(n.createdAt).toLocaleDateString()}] ${n.author || "?"}: ${n.note}`).join("\n") || "None"}

TASKS (${tasks.length}):
${tasks.map((t: any) => `- ${t.customTask || t.task} | Status: ${t.status || "Open"} | Priority: ${t.priority || "Normal"} | Due: ${t.dateScheduled || "?"}`).join("\n") || "None"}

RFIs (${rfis.length}):
${rfis.map((r: any) => `- RFI ${r.number}: ${r.subject || "?"} | Status: ${r.status} | Due: ${r.responseRequired || "?"} | Ball: ${r.ballInCourt || "?"}`).join("\n") || "None"}

SUBMITTALS (${submittals.length}):
${submittals.map((s: any) => `- ${s.number}: ${s.description || "?"} | Status: ${s.status} | Due: ${s.dateRequired || "?"}`).join("\n") || "None"}

CHANGE ORDERS (${changeOrders.length}):
${changeOrders.map((c: any) => `- CO ${c.number}: ${c.description || "?"} | $${c.amount || 0} | Status: ${c.status}`).join("\n") || "None"}

BUDGET (${budget.length} line items):
${budget.map((b: any) => `- ${b.costCode || "?"}: ${b.description || "?"} | Budgeted: $${b.budgeted || 0} | Actual: $${b.actual || 0} | Variance: $${(b.budgeted || 0) - (b.actual || 0)}`).join("\n") || "None"}

PUNCH LIST (${punchList.length}):
${punchList.map((p: any) => `- ${p.description || "?"} | Status: ${p.status || "Open"} | Location: ${p.location || "?"}`).join("\n") || "None"}

CREW ON PROJECT (${crew.length}):
${crew.map((c: any) => `- ${c.firstName || c.name || "?"} | Trade: ${c.trade || "?"} | ${c.start || "?"} to ${c.end || "?"}`).join("\n") || "None"}

DELIVERIES (${deliveries.length}):
${deliveries.map((d: any) => `- ${d.material || "?"} from ${d.supplier || "?"} | Status: ${d.status || "?"} | ETA: ${d.eta || "?"}`).join("\n") || "None"}

RENTALS (${rentals.length}):
${rentals.map((r: any) => `- ${r.vendor || "?"} | ${r.start || "?"} to ${r.end || "?"} | Status: ${r.status || "Active"}`).join("\n") || "None"}

DOCUMENTS (${documents.length}):
${documents.slice(-15).map((d: any) => `- ${d.name} | Category: ${d.category || "?"} | Uploaded: ${d.uploadedAt || "?"}`).join("\n") || "None"}

COMMUNICATIONS (${emails.length} recent):
${emails.slice(-10).map((e: any) => `- ${e.subject || "(No subject)"} | From: ${e.from || "?"} | ${e.source || "Email"}`).join("\n") || "None"}
`;

    const prompt = `You are an AI construction project assistant with complete access to all project data. Answer the user's question based on the data below. Be concise, direct, and practical. Use construction industry language. If data doesn't exist for what they're asking, say so clearly.

${dataContext}

USER QUESTION: ${args.question}

Answer directly. If they ask for a summary to send to someone, format it professionally. If they ask about status, give specifics. If they ask about budget, include numbers. Don't hedge — give them the answer.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    return { answer: result.content[0]?.text ?? "No response generated" };
  },
});
