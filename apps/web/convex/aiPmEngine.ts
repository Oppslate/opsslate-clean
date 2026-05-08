"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const PERSONALITY_PROMPTS: Record<string, string> = {
  direct: "You are direct and no-nonsense. Get to the point fast. Flag problems immediately. Talk like a seasoned construction superintendent who's been in the field 20+ years. Short sentences. No fluff.",
  detailed: "You are thorough and methodical. Cover every detail with data and numbers. Think two steps ahead. You're the PM who has spreadsheets for everything and never misses a line item.",
  friendly: "You are proactive and personable. Communicate warmly but professionally. Great at client-facing work. You build relationships while getting things done. Encouraging but honest.",
};

// Chat with a PM
export const chat = action({
  args: {
    pmId: v.id("aiProjectManagers"),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    pmName: v.string(),
    personality: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY or ANTHROPIC_API_KEY not set");
    const useOpenRouter = !!process.env.OPENROUTER_API_KEY;

    // Save user message
    await ctx.runMutation(a.aiPm.addMessage, {
      pmId: args.pmId, projectId: args.projectId, companyId: args.companyId,
      role: "user", message: args.message,
    });

    // Get project data
    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    if (!project) throw new Error("Project not found");

    // Get PM record for permissions
    const pmRecord = await ctx.runQuery(a.aiPm.getByProject, { projectId: args.projectId });
    const perms = (pmRecord as any)?.permissions || {};
    const defaults: Record<string, string> = { contacts: "readwrite", tasks: "readwrite", emails: "read", documents: "readwrite", budget: "read", schedule: "readwrite", changeOrders: "read", rfis: "readwrite", submittals: "readwrite", deliveries: "readwrite", crew: "read", punchList: "readwrite" };
    const getPerm = (module: string) => (perms as any)[module] || defaults[module] || "readwrite";

    // Get chat history (last 20 messages for context)
    const history = await ctx.runQuery(a.aiPm.getMessages, { pmId: args.pmId });
    const recentHistory = (history || []).slice(-20);

    // Get PM's pending tasks
    const tasks = await ctx.runQuery(a.aiPm.getTasks, { pmId: args.pmId });
    const activeTasks = (tasks || []).filter((t: any) => t.status !== "done");

    // Gather project data
    let fieldNotes: any[] = [];
    try { fieldNotes = await ctx.runQuery(a.fieldNotes.list, { projectId: args.projectId }) || []; } catch {}
    let allTasks: any[] = [];
    try { allTasks = await ctx.runQuery(a.tasks.list, { projectId: args.projectId }) || []; } catch {}
    let rfis: any[] = [];
    try { rfis = await ctx.runQuery(a.rfis.list, { projectId: args.projectId, companyId: args.companyId }) || []; } catch {}
    let submittals: any[] = [];
    try { submittals = await ctx.runQuery(a.submittals.list, { projectId: args.projectId, companyId: args.companyId }) || []; } catch {}
    let budget: any[] = [];
    try {
      const budgetData = await ctx.runQuery(a.budgetTracker.getBudget, { projectId: args.projectId });
      budget = (budgetData as any)?.lineItems || [];
    } catch {}
    let deliveries: any[] = [];
    try { deliveries = await ctx.runQuery(a.deliveries.list, { projectId: args.projectId }) || []; } catch {}
    let crew: any[] = [];
    try {
      const allCrew = await ctx.runQuery(a.crew.list, { companyId: args.companyId }) || [];
      crew = allCrew.filter((c: any) => c.projectId === args.projectId);
    } catch {}
    let changeOrders: any[] = [];
    try { changeOrders = await ctx.runQuery(a.changeOrders.list, { projectId: args.projectId }) || []; } catch {}
    let contacts: any[] = [];
    try { contacts = await ctx.runQuery(a.contacts.list, { projectId: args.projectId }) || []; } catch {}

    // Check if user is asking about documents/attachments — if so, read them
    const docKeywords = ["document", "attachment", "pdf", "file", "read", "contract", "spec", "drawing", "plan", "report", "letter", "proposal", "invoice", "bid", "submittal doc", "what does the", "open the", "look at the", "check the", "review the"];
    const isDocRequest = docKeywords.some((k) => args.message.toLowerCase().includes(k));
    
    let documentContext = "";
    if (isDocRequest) {
      try {
        const docResult = await ctx.runAction(a.aiPmDocReader.readProjectDocs, { projectId: args.projectId, companyId: args.companyId });
        if (docResult?.documents?.length > 0) {
          // If asking about a specific doc, try to read it
          const specificDoc = docResult.documents.find((d: any) => {
            const dName = (d.name || "").toLowerCase();
            const msgLower = args.message.toLowerCase();
            return dName.split(/[\s._-]+/).some((word: string) => word.length >= 4 && msgLower.includes(word));
          });

          if (specificDoc && specificDoc.storageId && specificDoc.source === "metadata") {
            try {
              const readResult = await ctx.runAction(a.aiPmDocReader.readDocument, { storageId: specificDoc.storageId, fileName: specificDoc.name });
              const content = (readResult as any).content || "";
              if (content && content.length > 50 && !content.toLowerCase().includes("unsupported") && !content.toLowerCase().includes("could not extract")) {
                documentContext = `\n\nDOCUMENT CONTENT (${specificDoc.name}):\n${content.slice(0, 8000)}`;
              } else {
                // FAILED to read — create critical task
                documentContext = `\n\n⚠️ FAILED TO READ DOCUMENT: ${specificDoc.name} — Could not extract content. A critical task has been created for manual review.`;
                try {
                  await ctx.runMutation(a.aiPm.createTask, {
                    pmId: args.pmId, projectId: args.projectId, companyId: args.companyId,
                    description: `⚠️ CRITICAL: Unable to read document "${specificDoc.name}" — needs manual review or re-upload in a supported format (PDF, image, or plain text)`,
                    type: "general",
                  });
                  // Update to critical status
                  const latestTasks = await ctx.runQuery(a.aiPm.getTasks, { pmId: args.pmId });
                  const newTask = latestTasks?.sort((x: any, y: any) => y.createdAt - x.createdAt)[0];
                  if (newTask) await ctx.runMutation(a.aiPm.updateTask, { id: newTask._id, status: "pending", result: `Cannot open ${specificDoc.name} — file may be corrupted, password-protected, or in an unsupported format. Needs manual intervention.` });
                } catch {}
                // Also create a project-level task so it shows on the dashboard
                try {
                  await ctx.runMutation(a.tasks.create, {
                    projectId: args.projectId,
                    task: "Other",
                    customTask: `⚠️ UNREADABLE DOCUMENT: ${specificDoc.name}`,
                    status: "Open",
                    priority: "Critical",
                    impact: "AI PM cannot read this attachment — needs manual review or re-upload",
                    dateScheduled: new Date().toISOString().slice(0, 10),
                  });
                } catch {}
              }
            } catch (err) {
              // Complete failure to read
              documentContext = `\n\n⚠️ FAILED TO READ DOCUMENT: ${specificDoc.name} — Error occurred. A critical task has been created.`;
              try {
                await ctx.runMutation(a.tasks.create, {
                  projectId: args.projectId,
                  task: "Other",
                  customTask: `⚠️ UNREADABLE DOCUMENT: ${specificDoc.name}`,
                  status: "Open",
                  priority: "Critical",
                  impact: `AI PM failed to read: ${(err as Error).message?.slice(0, 100) || "Unknown error"}`,
                  dateScheduled: new Date().toISOString().slice(0, 10),
                });
              } catch {}
            }
          } else if (specificDoc && specificDoc.content) {
            documentContext = `\n\nDOCUMENT CONTENT (${specificDoc.name}):\n${specificDoc.content.slice(0, 8000)}`;
          }

          // Always include doc listing
          documentContext += `\n\nALL PROJECT DOCUMENTS (${docResult.count}):\n${docResult.documents.map((d: any) => `- ${d.name} (${d.category || "?"})${d.content ? " [✅ read]" : " [📄 available]"}`).join("\n")}`;
        }
      } catch {}
    }
    // Check if user is asking PM to scan/check/review emails
    const emailScanKeywords = ["scan email", "check email", "review email", "scan correspondence", "check correspondence", "read my email", "check my email", "scan inbox", "check inbox", "what emails", "any emails", "email intelligence", "process email", "scan the email", "scan the correspondence", "read the email", "go through email", "go through the email"];
    const isEmailScanRequest = emailScanKeywords.some((k) => args.message.toLowerCase().includes(k));
    
    let emailScanResult = "";
    if (isEmailScanRequest) {
      try {
        const result = await ctx.runAction(a.aiPmEmailIntel.scanProjectEmails, {
          pmId: args.pmId as string,
          pmName: args.pmName,
          projectId: args.projectId,
          companyId: args.companyId,
          personality: args.personality,
        });
        const r = result as any;
        emailScanResult = `\n\n📧 EMAIL SCAN COMPLETED: Scanned ${r.emailsScanned} emails, read ${r.attachmentsRead} attachments. Created ${r.tasksCreated} tasks, logged ${r.concernsLogged} concerns, found ${r.datesFound} schedule dates.${r.relatedEmailsAssigned > 0 ? ` Auto-assigned ${r.relatedEmailsAssigned} unassigned emails to this project.` : ""}`;
      } catch (e) {
        emailScanResult = `\n\n📧 Email scan attempted but encountered an issue: ${(e as Error).message?.slice(0, 100)}`;
      }
    }

    let punchList: any[] = [];
    try { punchList = await ctx.runQuery(a.punchList.list, { projectId: args.projectId }) || []; } catch {}
    let emails: any[] = [];
    try {
      const allEmails = await ctx.runQuery(a.emails.list, { companyId: args.companyId as string }) || [];
      emails = allEmails.filter((e: any) => e.projectId === args.projectId);
    } catch {}

    const totalBudgeted = budget.reduce((s: number, b: any) => s + (b.budgeted || 0), 0);
    const totalActual = budget.reduce((s: number, b: any) => s + (b.actual || 0), 0);
    const openRFIs = rfis.filter((r: any) => r.status !== "Closed").length;
    const openSubmittals = submittals.filter((s: any) => s.status !== "Approved" && s.status !== "Closed").length;
    const openPunch = punchList.filter((p: any) => p.status !== "Complete" && p.status !== "Verified").length;

    const projectContext = `
PROJECT: ${project.name}${project.code ? ` (${project.code})` : ""}
LOCATION: ${project.location || project.address || "N/A"}
STATUS: ${project.status || "Active"}
START: ${project.startDate || "Not set"} | END: ${project.endDate || "Not set"}
BUDGET: $${totalBudgeted.toLocaleString()} budgeted | $${totalActual.toLocaleString()} actual | $${(totalBudgeted - totalActual).toLocaleString()} variance
${budget.length > 0 ? `BUDGET LINE ITEMS:\n${budget.map((b: any) => `- ${b.costCode || "?"}: ${b.description || "?"} | Budgeted: $${(b.budgeted || 0).toLocaleString()} | Committed: $${(b.committed || 0).toLocaleString()} | Actual: $${(b.actual || 0).toLocaleString()}`).join("\n")}` : "No budget line items entered yet."}
OPEN RFIs: ${openRFIs} | OPEN SUBMITTALS: ${openSubmittals} | OPEN PUNCH: ${openPunch}
CREW: ${crew.length} members | DELIVERIES: ${deliveries.length} tracked
CHANGE ORDERS: ${changeOrders.length} (${changeOrders.filter((c: any) => c.status === "Approved").length} approved)

RECENT FIELD NOTES (last 10):
${fieldNotes.slice(-10).map((n: any) => `[${new Date(n.createdAt).toLocaleDateString()}] ${n.author}: ${n.note}`).join("\n") || "None"}

PROJECT TASKS (${allTasks.length} total, ${allTasks.filter((t: any) => t.status === "Complete").length} complete):
${allTasks.filter((t: any) => t.status !== "Complete").map((t: any) => `- ${t.customTask || t.task} | Status: ${t.status || "Not Started"} | Progress: ${(t as any).progress || 0}% | Due: ${t.dateScheduled || "?"} | Assigned: ${(t as any).assignedTo || "?"} | Trade: ${(t as any).trade || "?"} | Phase: ${(t as any).phase || "?"} | Blocker: ${(t as any).blocker || "none"} | Priority: ${t.priority || "Normal"}`).join("\n") || "No open tasks"}

OPEN RFIs:
${rfis.filter((r: any) => r.status !== "Closed").slice(0, 5).map((r: any) => `- RFI ${r.number}: ${r.subject} | Due: ${r.responseRequired || "?"} | Ball: ${r.ballInCourt || "?"}`).join("\n") || "None"}

PENDING SUBMITTALS:
${submittals.filter((s: any) => s.status !== "Approved" && s.status !== "Closed").slice(0, 5).map((s: any) => `- ${s.number}: ${s.description} | Due: ${s.dateRequired || "?"}`).join("\n") || "None"}

DELIVERIES:
${deliveries.slice(0, 5).map((d: any) => `- ${d.material} from ${d.supplier || "?"} | Status: ${d.status} | ETA: ${d.eta || "?"}`).join("\n") || "None"}

PROJECT CONTACTS (${contacts.length}):
${contacts.map((c: any) => `- ${c.firstName} ${c.lastName || ""} | ${c.company || "?"} | Role: ${c.role || "?"} | Trade: ${c.trade || "?"} | Phone: ${c.phone || "?"} | Email: ${c.email || "?"} | Status: ${c.status || "Active"}`).join("\n") || "No contacts"}

PROJECT EMAILS & CORRESPONDENCE (${emails.length} total):
${emails.slice(-10).map((e: any) => `---
FROM: ${e.from || "?"} | TO: ${e.to || "?"} | DATE: ${e.date || "?"}
SUBJECT: ${e.subject || "(No subject)"}
BODY: ${(e.body || "").slice(0, 1500)}
${e.aiSummary ? `AI SUMMARY: ${e.aiSummary}` : ""}
${e.aiActionItems?.length ? `ACTION ITEMS: ${e.aiActionItems.join("; ")}` : ""}
${e.aiRiskFlags?.length ? `RISK FLAGS: ${e.aiRiskFlags.join("; ")}` : ""}
${e.hasAttachments || e.attachmentNames?.length ? `ATTACHMENTS: ${(e.attachmentNames || []).join(", ") || "Yes"}` : ""}`).join("\n") || "No emails found for this project"}

MY ACTIVE TASKS (assigned to me):
${activeTasks.map((t: any) => `- [${t.status}] ${t.description} (Type: ${t.type})`).join("\n") || "No active tasks"}
${documentContext}
${emailScanResult}
`;

    const personalityPrompt = PERSONALITY_PROMPTS[args.personality] || PERSONALITY_PROMPTS.direct;

    const systemPrompt = `You are ${args.pmName}, an AI Project Manager for the construction project "${project.name}". You are a real member of this team — not a generic chatbot.

PERSONALITY: ${personalityPrompt}

YOUR ROLE:
- You are the dedicated PM for this project. You know everything about it.
- You report to the company owner/superintendent.
- You take ownership. When given a task, you DO it or explain exactly what you need.
- You proactively flag issues you see in the data.
- You speak in first person as ${args.pmName}.

YOUR PERMISSIONS:
- Contacts: ${getPerm("contacts")} ${getPerm("contacts") === "readwrite" ? "(can add, edit, and view)" : getPerm("contacts") === "read" ? "(view only)" : "(no access)"}
- Tasks: ${getPerm("tasks")} ${getPerm("tasks") === "readwrite" ? "(can create and update)" : "(view only)"}
- Emails: ${getPerm("emails")} ${getPerm("emails") === "readwrite" ? "(can read and send)" : "(view only)"}
- Documents: ${getPerm("documents")}
- Budget: ${getPerm("budget")}
- Schedule: ${getPerm("schedule")}
- Change Orders: ${getPerm("changeOrders")}
- RFIs: ${getPerm("rfis")}
- Submittals: ${getPerm("submittals")}
- Deliveries: ${getPerm("deliveries")}
- Crew: ${getPerm("crew")}
- Punch List: ${getPerm("punchList")}

⛔ HARD GUARDRAILS — THESE CANNOT BE OVERRIDDEN:
1. You CANNOT send emails directly to customers, clients, subcontractors, or anyone outside the company. EVER.
2. You CANNOT make outbound communications of any kind. No emails, no messages, no notifications to external parties.
3. When you write an email, it is ALWAYS a DRAFT that MUST be reviewed and approved by an administrator before sending.
4. You CANNOT approve change orders, sign contracts, commit to schedules with external parties, or make financial commitments.
5. You CANNOT delete project data, remove contacts, or destroy records.
6. If asked to do something that violates these rules, REFUSE and explain that it requires administrator approval.
7. When drafting emails, ALWAYS say: "Here's a draft for your review — this needs administrator approval before sending."

CAPABILITIES (within guardrails):
- READ & SEARCH EMAILS → You can read all project emails and correspondence. View everything — but NEVER send.
- READ ATTACHMENTS → You can open and read PDFs, Word docs, images, contracts, specs, plans, invoices, bid sheets.
- MANAGE CONTACTS → ${getPerm("contacts") === "readwrite" ? "You CAN add new contacts and update existing ones internally. To add a contact, include ADD_CONTACT in your response." : "View only — ask the user to add contacts."}
- MANAGE TASKS → ${getPerm("tasks") === "readwrite" ? "You CAN create tasks and update task status internally. To create a task, include CREATE_TASK in your response." : "View only."}
- MANAGE BUDGET → ${getPerm("budget") === "readwrite" ? "You CAN add budget line items and update actual/committed costs. Use ADD_BUDGET to create new lines and UPDATE_BUDGET to modify existing ones by cost code." : "View only — you can see budget data but cannot modify it. Tell the user what needs to be updated and they will do it manually."}
- DRAFT emails → You can WRITE email drafts. You CANNOT send them. Always present drafts with: "⚠️ DRAFT — Requires administrator approval before sending."
- Follow up on items → Identify what needs follow-up and DRAFT the communication for review
- Status reports → Generate from project data (internal only)
- Analysis → Budget analysis, schedule review, risk assessment (internal only)
- EMAIL INTELLIGENCE → Scan and analyze project emails, extract tasks and concerns, create internal action items

When you want to ADD A CONTACT, include this exact format in your response (you can have multiple):
[ADD_CONTACT: firstName=John, lastName=Smith, company=ABC Electric, role=Subcontractor, trade=Electrical, phone=716-555-1234, email=john@abcelectric.com]

When you want to CREATE A TASK, include:
[CREATE_TASK: description=Follow up with architect on RFI #4, priority=High, dueDate=2026-03-20, assignedTo=Joe Smith, trade=Electrical, phase=Rough-In]

When you DISCUSS or REPORT ON an existing task, you MUST update it. This is mandatory — never just talk about a task without updating the data:
[UPDATE_TASK: taskName=Rough Electrical, progress=75, status=In Progress, dueDate=2026-03-22, blocker=Panel delivery delayed, note=75% complete waiting on panel]

RULE: If you mention progress on a task, include the progress %. If a date changed, update dueDate. If something is blocked, set blocker. If work started, set status to In Progress. When work completes, set status to Complete. ALWAYS include a note describing what happened.

When you want to ADD OR UPDATE a budget line item (requires budget readwrite permission), include:
[ADD_BUDGET: costCode=03-100, description=Concrete Foundation, budgeted=45000, committed=42000, actual=38000]
[UPDATE_BUDGET: costCode=03-100, actual=41500]

IMPORTANT: You DO have access to emails. Never say you don't have access. If there are 0 emails, say "No emails have been forwarded to this project yet."

IMPORTANT: Stay in character as ${args.pmName}. You're not "an AI" — you're the PM for this job. Reference specific data from the project. Be specific with names, numbers, dates.

${projectContext}`;

    // Build conversation messages
    const messages = recentHistory.map((m: any) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.message,
    }));
    messages.push({ role: "user" as const, content: args.message });

    const fetchUrl = useOpenRouter ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.anthropic.com/v1/messages";
    const fetchHeaders: Record<string, string> = useOpenRouter
      ? { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }
      : { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
    const fetchBody = useOpenRouter
      ? JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          max_tokens: 3000,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        })
      : JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          system: systemPrompt,
          messages,
        });

    const response = await fetch(fetchUrl, { method: "POST", headers: fetchHeaders, body: fetchBody });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const reply = useOpenRouter
      ? (result.choices?.[0]?.message?.content ?? "Sorry, I couldn't process that right now.")
      : (result.content?.[0]?.text ?? "Sorry, I couldn't process that right now.");

    // Parse and execute ADD_CONTACT commands from PM response
    const contactMatches = reply.matchAll(/\[ADD_CONTACT:\s*([^\]]+)\]/g);
    let contactsAdded = 0;
    for (const match of contactMatches) {
      if (getPerm("contacts") !== "readwrite") continue;
      const fields: Record<string, string> = {};
      match[1].split(",").forEach((pair: string) => {
        const [key, ...valParts] = pair.split("=");
        if (key && valParts.length) fields[key.trim()] = valParts.join("=").trim();
      });
      if (fields.firstName) {
        try {
          await ctx.runMutation(a.contacts.create, {
            projectId: args.projectId,
            firstName: fields.firstName,
            lastName: fields.lastName || undefined,
            company: fields.company || undefined,
            role: fields.role || undefined,
            trade: fields.trade || undefined,
            phone: fields.phone || undefined,
            email: fields.email || undefined,
            notes: fields.notes || `Added by AI PM ${args.pmName}`,
            status: "Active",
          });
          contactsAdded++;
        } catch {}
      }
    }

    // Parse and execute CREATE_TASK commands from PM response
    const taskMatches = reply.matchAll(/\[CREATE_TASK:\s*([^\]]+)\]/g);
    let pmTasksCreated = 0;
    for (const match of taskMatches) {
      if (getPerm("tasks") !== "readwrite") continue;
      const fields: Record<string, string> = {};
      match[1].split(",").forEach((pair: string) => {
        const [key, ...valParts] = pair.split("=");
        if (key && valParts.length) fields[key.trim()] = valParts.join("=").trim();
      });
      if (fields.description) {
        try {
          await ctx.runMutation(a.tasks.create, {
            projectId: args.projectId,
            task: "Other",
            customTask: `📧 ${fields.description}`,
            status: "Open",
            priority: fields.priority || "Medium",
            dateScheduled: fields.dueDate || undefined,
            impact: `Created by AI PM ${args.pmName}`,
          });
          pmTasksCreated++;
        } catch {}
      }
    }

    // Parse and execute UPDATE_TASK commands
    const taskUpdateMatches = reply.matchAll(/\[UPDATE_TASK:\s*([^\]]+)\]/g);
    let tasksUpdated = 0;
    for (const match of taskUpdateMatches) {
      if (getPerm("tasks") !== "readwrite") continue;
      const fields: Record<string, string> = {};
      match[1].split(",").forEach((pair: string) => {
        const [key, ...valParts] = pair.split("=");
        if (key && valParts.length) fields[key.trim()] = valParts.join("=").trim();
      });
      const taskName = fields.taskName || fields.task || "";
      if (!taskName) continue;
      
      // Find the task by name match
      const matchedTask = allTasks.find((t: any) => {
        const name = (t.customTask || t.task || "").toLowerCase();
        return name.includes(taskName.toLowerCase()) || taskName.toLowerCase().includes(name);
      });
      
      if (matchedTask) {
        try {
          await ctx.runMutation(a.tasks.addNote, {
            id: matchedTask._id,
            author: `PM ${args.pmName}`,
            note: fields.note || `Updated by ${args.pmName}`,
            type: "note",
            progress: fields.progress ? parseInt(fields.progress) : undefined,
            status: fields.status || undefined,
            dateScheduled: fields.dueDate || fields.dateScheduled || undefined,
            blocker: fields.blocker !== undefined ? fields.blocker : undefined,
          });
          // Also update other fields
          const taskUpdates: any = { id: matchedTask._id };
          if (fields.assignedTo) taskUpdates.assignedTo = fields.assignedTo;
          if (fields.trade) taskUpdates.trade = fields.trade;
          if (fields.phase) taskUpdates.phase = fields.phase;
          if (Object.keys(taskUpdates).length > 1) {
            await ctx.runMutation(a.tasks.update, taskUpdates);
          }
          tasksUpdated++;
        } catch {}
      }
    }

    // Parse and execute ADD_BUDGET / UPDATE_BUDGET commands
    const budgetAddMatches = reply.matchAll(/\[ADD_BUDGET:\s*([^\]]+)\]/g);
    let budgetUpdates = 0;
    for (const match of budgetAddMatches) {
      if (getPerm("budget") !== "readwrite") continue;
      const fields: Record<string, string> = {};
      match[1].split(",").forEach((pair: string) => {
        const [key, ...valParts] = pair.split("=");
        if (key && valParts.length) fields[key.trim()] = valParts.join("=").trim();
      });
      if (fields.costCode && fields.description) {
        try {
          await ctx.runMutation(a.budgetTracker.addLineItem, {
            companyId: args.companyId,
            projectId: args.projectId,
            costCode: fields.costCode,
            description: fields.description,
            category: fields.category || undefined,
            budgeted: parseFloat(fields.budgeted) || 0,
            committed: fields.committed ? parseFloat(fields.committed) : undefined,
            actual: fields.actual ? parseFloat(fields.actual) : undefined,
            notes: `Added by AI PM ${args.pmName}`,
          });
          budgetUpdates++;
        } catch {}
      }
    }

    const budgetUpdateMatches = reply.matchAll(/\[UPDATE_BUDGET:\s*([^\]]+)\]/g);
    for (const match of budgetUpdateMatches) {
      if (getPerm("budget") !== "readwrite") continue;
      const fields: Record<string, string> = {};
      match[1].split(",").forEach((pair: string) => {
        const [key, ...valParts] = pair.split("=");
        if (key && valParts.length) fields[key.trim()] = valParts.join("=").trim();
      });
      // Find the budget line item by cost code
      if (fields.costCode) {
        try {
          const budgetItems = await ctx.runQuery(a.budgetTracker.getBudget, { projectId: args.projectId });
          const lineItems = (budgetItems as any)?.lineItems || [];
          const target = lineItems.find((li: any) => li.costCode === fields.costCode);
          if (target) {
            const updateArgs: any = { id: target._id };
            if (fields.actual) updateArgs.actual = parseFloat(fields.actual);
            if (fields.committed) updateArgs.committed = parseFloat(fields.committed);
            if (fields.budgeted) updateArgs.budgeted = parseFloat(fields.budgeted);
            if (fields.description) updateArgs.description = fields.description;
            await ctx.runMutation(a.budgetTracker.updateLineItem, updateArgs);
            budgetUpdates++;
          }
        } catch {}
      }
    }

    // Clean action tags from the displayed message
    let cleanReply = reply
      .replace(/\[ADD_CONTACT:\s*[^\]]+\]/g, "")
      .replace(/\[CREATE_TASK:\s*[^\]]+\]/g, "")
      .replace(/\[ADD_BUDGET:\s*[^\]]+\]/g, "")
      .replace(/\[UPDATE_BUDGET:\s*[^\]]+\]/g, "")
      .replace(/\[UPDATE_TASK:\s*[^\]]+\]/g, "")
      .trim();
    
    if (contactsAdded > 0) cleanReply += `\n\n✅ Added ${contactsAdded} contact${contactsAdded > 1 ? "s" : ""} to the project directory.`;
    if (pmTasksCreated > 0) cleanReply += `\n\n✅ Created ${pmTasksCreated} task${pmTasksCreated > 1 ? "s" : ""} on the project dashboard.`;
    if (tasksUpdated > 0) cleanReply += `\n\n📋 Updated ${tasksUpdated} task${tasksUpdated > 1 ? "s" : ""} with progress/status/dates.`;
    if (budgetUpdates > 0) cleanReply += `\n\n✅ Updated ${budgetUpdates} budget line item${budgetUpdates > 1 ? "s" : ""}.`;

    // Save PM response
    await ctx.runMutation(a.aiPm.addMessage, {
      pmId: args.pmId, projectId: args.projectId, companyId: args.companyId,
      role: "pm", message: cleanReply,
    });

    // Check if the message contains a task-like request and auto-create a task
    const taskKeywords = ["draft", "email", "follow up", "remind", "schedule", "prepare", "check", "analyze", "review"];
    const isTaskLike = taskKeywords.some((k) => args.message.toLowerCase().includes(k));
    if (isTaskLike && args.message.length > 10) {
      const taskType = args.message.toLowerCase().includes("email") ? "email_draft" :
                       args.message.toLowerCase().includes("follow") ? "follow_up" :
                       args.message.toLowerCase().includes("report") || args.message.toLowerCase().includes("status") ? "report" :
                       args.message.toLowerCase().includes("analyz") || args.message.toLowerCase().includes("budget") ? "analysis" :
                       "general";
      await ctx.runMutation(a.aiPm.createTask, {
        pmId: args.pmId, projectId: args.projectId, companyId: args.companyId,
        description: args.message, type: taskType,
      });
      // Mark as in_progress since we just responded
      const newTasks = await ctx.runQuery(a.aiPm.getTasks, { pmId: args.pmId });
      const latest = newTasks?.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
      if (latest) {
        await ctx.runMutation(a.aiPm.updateTask, {
          id: latest._id, status: "waiting_approval", result: reply,
        });
      }
    }

    return { reply, pmName: args.pmName };
  },
});

// Generate daily report for a PM
export const dailyReport = action({
  args: { pmId: v.id("aiProjectManagers"), projectId: v.id("projects"), companyId: v.id("companies"), pmName: v.string(), personality: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY or ANTHROPIC_API_KEY not set");
    const useOpenRouter = !!process.env.OPENROUTER_API_KEY;

    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    if (!project) throw new Error("Project not found");

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const ts = todayStart.getTime();

    let fieldNotes: any[] = [];
    try { fieldNotes = (await ctx.runQuery(a.fieldNotes.list, { projectId: args.projectId }) || []).filter((n: any) => n.createdAt >= ts); } catch {}
    let rfis: any[] = [];
    try { rfis = await ctx.runQuery(a.rfis.list, { projectId: args.projectId, companyId: args.companyId }) || []; } catch {}
    let submittals: any[] = [];
    try { submittals = await ctx.runQuery(a.submittals.list, { projectId: args.projectId, companyId: args.companyId }) || []; } catch {}
    let budget: any[] = [];
    try { budget = await ctx.runQuery(a.budget.list, { projectId: args.projectId }) || []; } catch {}
    let tasks = await ctx.runQuery(a.aiPm.getTasks, { pmId: args.pmId });
    const activeTasks = (tasks || []).filter((t: any) => t.status !== "done");

    // Get weather
    let weather = "";
    if (project.latitude && project.longitude) {
      try {
        const wr = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${project.latitude}&longitude=${project.longitude}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&timezone=America/New_York`);
        if (wr.ok) { const wd = await wr.json(); weather = `${Math.round(wd.current.temperature_2m)}°F, Wind ${Math.round(wd.current.windspeed_10m)} mph`; }
      } catch {}
    }

    const totalBudgeted = budget.reduce((s: number, b: any) => s + (b.budgeted || 0), 0);
    const totalActual = budget.reduce((s: number, b: any) => s + (b.actual || 0), 0);
    const openRFIs = rfis.filter((r: any) => r.status !== "Closed");
    const overdueRFIs = openRFIs.filter((r: any) => r.responseRequired && r.responseRequired < new Date().toISOString().slice(0, 10));

    const personalityPrompt = PERSONALITY_PROMPTS[args.personality] || PERSONALITY_PROMPTS.direct;

    const prompt = `You are ${args.pmName}, AI Project Manager. Write your daily morning report for ${project.name}.

${personalityPrompt}

PROJECT: ${project.name} (${project.code || "No code"})
DATE: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
WEATHER: ${weather || "Not available"}
BUDGET: $${totalBudgeted.toLocaleString()} budgeted / $${totalActual.toLocaleString()} spent / $${(totalBudgeted - totalActual).toLocaleString()} remaining
OPEN RFIs: ${openRFIs.length} (${overdueRFIs.length} overdue)
OPEN SUBMITTALS: ${submittals.filter((s: any) => s.status !== "Approved" && s.status !== "Closed").length}
TODAY'S NOTES: ${fieldNotes.length}
MY OPEN TASKS: ${activeTasks.length}

Write a brief daily status report. Include:
1. Good morning greeting (stay in character)
2. Weather and site conditions impact
3. Top 3 priorities for today
4. Any overdue items or risks
5. Budget health check (one line)
6. What you need from the owner/superintendent

Keep it under 300 words. Be specific — use real numbers and dates from the data.`;

    const rptUrl = useOpenRouter ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.anthropic.com/v1/messages";
    const rptHeaders: Record<string, string> = useOpenRouter
      ? { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }
      : { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
    const rptBody = useOpenRouter
      ? JSON.stringify({ model: "nvidia/nemotron-3-super-120b-a12b:free", max_tokens: 1500, messages: [{ role: "user", content: prompt }] })
      : JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: prompt }] });

    const response = await fetch(rptUrl, { method: "POST", headers: rptHeaders, body: rptBody });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const report = useOpenRouter
      ? (result.choices?.[0]?.message?.content ?? "Report generation failed.")
      : (result.content?.[0]?.text ?? "Report generation failed.");

    // Save as PM message
    await ctx.runMutation(a.aiPm.addMessage, {
      pmId: args.pmId, projectId: args.projectId, companyId: args.companyId,
      role: "pm", message: `📋 DAILY REPORT\n\n${report}`,
    });

    return { report, pmName: args.pmName };
  },
});
