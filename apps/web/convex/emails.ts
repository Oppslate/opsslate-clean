import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function slugifyCompany(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "company";
}

function emailText(email: any) {
  return [email.subject, email.from, email.to, email.cc, email.body, email.bodyPreview, ...(email.aiRiskFlags || []), ...(email.aiActionItems || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function communicationCategory(email: any) {
  const text = emailText(email);
  if (/rfi|clarification|question|please advise|confirm/i.test(text)) return "rfi_clarification";
  if (/submittal|shop drawing|product data|sample|certification/i.test(text)) return "submittal";
  if (/change order|extra work|claim|notice|directive|backcharge|not in contract|out of scope/i.test(text)) return "contract_notice";
  if (/delay|schedule|milestone|late|behind|critical path|delivery date/i.test(text)) return "schedule_impact";
  if (/cost|price|payment|pay app|invoice|retainage|lien|unpaid|unit price/i.test(text)) return "cost_impact";
  if (/safety|osha|incident|injury|violation|stop work/i.test(text)) return "safety";
  if (/meeting|minutes|agenda|call notes/i.test(text)) return "meeting_minutes";
  if (/bid|proposal|quote|invitation to bid/i.test(text)) return "bid_invite";
  return "general_correspondence";
}

function communicationBucket(email: any) {
  const text = emailText(email);
  const hasProject = Boolean(email.projectId);
  const hasActions = (email.aiActionItems || []).length > 0 || /please|need|provide|send|submit|review|respond|confirm|advise|due|by \d{1,2}\/\d{1,2}/i.test(text);
  const needsResponse = /please respond|need response|respond by|reply|please advise|confirm|can you|could you|question|\?/i.test(text);
  const risk = /notice|claim|delay|backcharge|lien|liquidated damages|stop work|urgent|asap|critical|unacceptable/i.test(text);
  if (!hasProject) return "needs_help_sorting";
  if (needsResponse || risk) return "needs_response";
  if (hasActions) return "needs_action";
  return "filed_to_project";
}

function communicationPriority(email: any) {
  const text = emailText(email);
  let score = 20;
  if (email.importance === "high") score += 30;
  if (/urgent|asap|critical|immediately|stop work/i.test(text)) score += 35;
  if (/notice|claim|lien|backcharge|liquidated damages|delay damages/i.test(text)) score += 35;
  if (/change order|extra work|not in contract|out of scope/i.test(text)) score += 25;
  if (/due|deadline|respond by|required by/i.test(text)) score += 15;
  if ((email.aiRiskFlags || []).length) score += Math.min(25, email.aiRiskFlags.length * 8);
  if ((email.aiActionItems || []).length) score += Math.min(20, email.aiActionItems.length * 5);
  return Math.min(100, score);
}

function suggestedNextAction(email: any, bucket = communicationBucket(email), category = communicationCategory(email)) {
  if (bucket === "needs_help_sorting") return "Pick the project once; OpsSlate will use that correction to improve future routing.";
  if (category === "contract_notice") return "Review for cost, schedule, or contract impact before responding.";
  if (category === "schedule_impact") return "Check the project schedule and confirm any dates or blockers.";
  if (category === "cost_impact") return "Review with estimating/billing and decide whether a change item is needed.";
  if (category === "submittal") return "Confirm whether a submittal register item or subcontractor request is needed.";
  if (bucket === "needs_response") return "Open, review the suggested context, and send or draft a reply.";
  if (bucket === "needs_action") return "Convert the extracted action into a task, RFI, submittal, or note.";
  return "Filed automatically; no immediate action needed.";
}

function sourceQuote(email: any, patterns: RegExp[]) {
  const body = String(email.body || email.bodyPreview || email.subject || "");
  const sentences = body.split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
  return sentences.find((sentence) => patterns.some((pattern) => pattern.test(sentence)))?.slice(0, 500) || body.slice(0, 500) || email.subject;
}

function responsibleParty(email: any) {
  const body = String(email.body || "");
  const assignedMatch = body.match(/(?:responsible|assigned|ball in court|attention|attn)[:\s-]+([A-Z][A-Za-z .'-]{2,60})/);
  const fromName = String(email.from || "").replace(/<.*?>/g, "").trim();
  return assignedMatch?.[1]?.trim() || fromName || "Unassigned";
}

function dueDateFromEmail(email: any) {
  const text = `${email.subject || ""} ${email.body || ""}`;
  return text.match(/\b(?:due|by|before|no later than|respond by|required by)\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i)?.[1];
}

function communicationIntakeItem(email: any, type: string, title: string, patterns: RegExp[], confidenceBoost = 0) {
  const quote = sourceQuote(email, patterns);
  const baseConfidence = email.projectId ? 72 : 48;
  const confidence = Math.min(96, baseConfidence + confidenceBoost + (quote.length > 60 ? 8 : 0) + ((email.aiSummary || email.aiActionItems?.length) ? 8 : 0));
  return {
    id: `${email._id}-${type}`,
    emailId: String(email._id),
    projectId: email.projectId,
    type,
    title,
    description: email.aiSummary || email.bodyPreview || email.subject,
    responsibleParty: responsibleParty(email),
    dueDate: dueDateFromEmail(email),
    costImpact: /cost|price|payment|invoice|change order|extra work|unpaid|retainage|lien|unit price/i.test(quote),
    scheduleImpact: /schedule|delay|milestone|late|critical path|delivery date|completion/i.test(quote),
    sourceQuote: quote,
    sourceSubject: email.subject,
    sourceFrom: email.from,
    confidence,
    reviewStatus: "needs_review",
    suggestedAction: type === "rfi"
      ? "Review and create an RFI if clarification is still needed."
      : type === "submittal"
        ? "Review and create or update a submittal requirement."
        : type === "contract_notice"
          ? "Review for cost, schedule, and contract exposure before responding."
          : type === "due_date"
            ? "Confirm the date and add it to the project schedule or task list."
            : "Review and commit as a project task or note.",
  };
}

function communicationMatrixItems(email: any) {
  const text = emailText(email);
  const items: any[] = [];
  if (/please|need|provide|send|submit|review|respond|confirm|advise|complete|coordinate/i.test(text) || (email.aiActionItems || []).length) {
    items.push(communicationIntakeItem(email, "task", `Task from email: ${email.subject}`, [/please|need|provide|send|submit|review|respond|confirm|advise|complete|coordinate/i], 8));
  }
  if (/rfi|clarification|question|please advise|confirm|unknown|\?/i.test(text)) {
    items.push(communicationIntakeItem(email, "rfi", `Possible RFI: ${email.subject}`, [/rfi|clarification|question|please advise|confirm|unknown|\?/i], 10));
  }
  if (/submittal|shop drawing|product data|sample|certification|warranty|test report/i.test(text)) {
    items.push(communicationIntakeItem(email, "submittal", `Submittal item: ${email.subject}`, [/submittal|shop drawing|product data|sample|certification|warranty|test report/i], 10));
  }
  if (/due|deadline|respond by|required by|no later than|before/i.test(text)) {
    items.push(communicationIntakeItem(email, "due_date", `Due date mentioned: ${email.subject}`, [/due|deadline|respond by|required by|no later than|before/i], 8));
  }
  if (/cost|price|payment|pay app|invoice|retainage|lien|unpaid|unit price|change order|extra work/i.test(text)) {
    items.push(communicationIntakeItem(email, "cost_impact", `Cost impact: ${email.subject}`, [/cost|price|payment|pay app|invoice|retainage|lien|unpaid|unit price|change order|extra work/i], 12));
  }
  if (/delay|schedule|milestone|late|behind|critical path|delivery date|completion/i.test(text)) {
    items.push(communicationIntakeItem(email, "schedule_impact", `Schedule impact: ${email.subject}`, [/delay|schedule|milestone|late|behind|critical path|delivery date|completion/i], 12));
  }
  if (/notice|claim|directive|backcharge|not in contract|out of scope|pursuant|liquidated damages|default|breach/i.test(text)) {
    items.push(communicationIntakeItem(email, "contract_notice", `Contract notice: ${email.subject}`, [/notice|claim|directive|backcharge|not in contract|out of scope|pursuant|liquidated damages|default|breach/i], 15));
  }
  return items;
}

function normalizedSender(email: any) {
  const value = String(email.from || "").toLowerCase();
  return value.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0] || value.trim();
}

function extractNameFromAddress(value: string) {
  const display = value.replace(/<.*?>/g, "").replace(/"/g, "").trim();
  if (display && !display.includes("@")) return display;
  const local = value.match(/([a-z0-9._%+-]+)@/i)?.[1] || "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractCompanyFromEmail(value: string) {
  const domain = value.match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1] || "";
  const company = domain.split(".")[0] || "";
  if (!company || /gmail|outlook|hotmail|yahoo|icloud|aol|msn/i.test(company)) return undefined;
  return company.charAt(0).toUpperCase() + company.slice(1).replace(/[-_]+/g, " ");
}

function extractContactCandidates(email: any) {
  const raw = String(email.from || "");
  const senderEmail = normalizedSender(email);
  const body = String(email.body || email.bodyPreview || "");
  const phone = body.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0];
  const title = body.match(/\b(Project Manager|Assistant Project Manager|Superintendent|Estimator|Engineer|Architect|Owner|Foreman|Coordinator|Contract Administrator)\b/i)?.[1];
  const name = extractNameFromAddress(raw);
  if (!senderEmail.includes("@") && !name) return [];
  return [{
    id: `${email._id || "email"}-${senderEmail}`,
    projectId: email.projectId,
    name: name || senderEmail,
    company: extractCompanyFromEmail(senderEmail),
    phone,
    email: senderEmail.includes("@") ? senderEmail : undefined,
    title,
    sourceEvidence: raw || sourceQuote(email, [/phone|mobile|cell|project manager|superintendent|estimator/i]),
    confidence: senderEmail.includes("@") ? 86 : 58,
    status: "candidate",
  }];
}

function phrasingSignals(email: any) {
  const text = `${email.subject || ""} ${email.body || ""} ${email.bodyPreview || ""}`;
  const signals = [
    ["urgent", /urgent|asap|immediately|critical/i],
    ["argumentative", /unacceptable|failure to|you failed|we have yet to receive|as previously stated/i],
    ["legal_notice", /notice|pursuant|reserve our rights|default|breach|claim|lien/i],
    ["cost_pressure", /backcharge|extra work|change order|unpaid|retainage|invoice|payment/i],
    ["schedule_pressure", /delay|late|critical path|milestone|completion date/i],
    ["coordination_request", /please advise|confirm|coordinate|clarification|question/i],
  ];
  return signals.filter(([, pattern]) => (pattern as RegExp).test(text)).map(([label]) => label);
}

function toneAnalysis(email: any) {
  const signals = phrasingSignals(email);
  let toneScore = 15;
  if (signals.includes("urgent")) toneScore += 20;
  if (signals.includes("argumentative")) toneScore += 30;
  if (signals.includes("legal_notice")) toneScore += 35;
  if (signals.includes("cost_pressure")) toneScore += 15;
  if (signals.includes("schedule_pressure")) toneScore += 15;
  if (email.importance === "high") toneScore += 15;
  const escalationRisk = Math.min(100, toneScore);
  const tone = signals.includes("legal_notice")
    ? "legal_notice"
    : signals.includes("argumentative")
      ? "argumentative"
      : signals.includes("urgent")
        ? "urgent"
        : signals.includes("coordination_request")
          ? "cooperative"
          : "neutral";
  return {
    tone,
    priority: escalationRisk >= 75 ? "Critical" : escalationRisk >= 45 ? "High" : "Normal",
    toneScore: escalationRisk,
    escalationRisk,
    phrasingSignals: signals,
    sourceEvidence: sourceQuote(email, [/urgent|asap|unacceptable|failure to|as previously stated|notice|pursuant|reserve our rights|claim|delay|backcharge|please advise/i]),
  };
}

function relationshipTrend(email: any, senderEmails: any[]) {
  const current = toneAnalysis(email).toneScore;
  const previous = senderEmails.filter((item) => String(item._id) !== String(email._id)).map((item) => toneAnalysis(item).toneScore);
  const averagePriorToneScore = previous.length ? Math.round(previous.reduce((sum, value) => sum + value, 0) / previous.length) : current;
  const delta = current - averagePriorToneScore;
  const trend = delta >= 18 ? "deteriorating" : delta <= -18 ? "improving" : "stable";
  return {
    relationshipTrend: trend,
    toneTrajectory: delta > 0 ? `+${delta}` : String(delta),
    priorEmailCount: previous.length,
    currentToneScore: current,
    averagePriorToneScore,
  };
}

function conversationDirection(email: any) {
  const category = communicationCategory(email);
  const text = emailText(email);
  if (/claim|notice|pursuant|reserve our rights|default|breach/i.test(text)) return "possible_claim_or_formal_notice";
  if (/change order|extra work|not in contract|out of scope|backcharge/i.test(text)) return "likely_change_order_discussion";
  if (/delay|late|critical path|completion date/i.test(text)) return "possible_delay_notice";
  if (/payment|invoice|retainage|unpaid|lien/i.test(text)) return "possible_payment_dispute";
  if (category === "submittal") return "submittal_follow_up";
  if (category === "rfi_clarification") return "likely_rfi_or_clarification";
  return "routine_coordination";
}

function responsePosture(email: any, tone = toneAnalysis(email), direction = conversationDirection(email)) {
  if (tone.tone === "legal_notice" || direction.includes("claim")) {
    return {
      recommendedResponsePosture: "document_carefully_and_escalate",
      responseGuidance: "Acknowledge receipt, avoid admissions, attach facts, and route to the project lead before sending.",
    };
  }
  if (tone.tone === "argumentative" || tone.escalationRisk >= 65) {
    return {
      recommendedResponsePosture: "de_escalate_and_confirm_facts",
      responseGuidance: "Use calm language, restate the facts, ask for missing backup, and keep the reply project-focused.",
    };
  }
  if (direction.includes("change_order") || direction.includes("payment")) {
    return {
      recommendedResponsePosture: "request_backup_and_preserve_rights",
      responseGuidance: "Ask for cost or contract backup, confirm timing, and flag estimating or billing before commitment.",
    };
  }
  return {
    recommendedResponsePosture: "professional_standard_reply",
    responseGuidance: "Answer the request directly, confirm next steps, owner, and due date.",
  };
}

function communicationProfile(email: any, senderEmails: any[]) {
  const scores = senderEmails.map((item) => toneAnalysis(item).toneScore);
  const average = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : toneAnalysis(email).toneScore;
  const topics = Array.from(new Set(senderEmails.map(communicationCategory))).slice(0, 4);
  return {
    communicationProfile: average >= 70 ? "high_escalation_sender" : average >= 45 ? "watch_closely" : "routine_project_contact",
    sender: normalizedSender(email),
    emailCount: senderEmails.length,
    escalationTendency: average >= 70 ? "high" : average >= 45 ? "medium" : "low",
    relationshipHealth: average >= 70 ? "strained" : average >= 45 ? "guarded" : "healthy",
    commonTopics: topics,
    responseExpectation: /urgent|asap|respond by|immediately/i.test(emailText(email)) ? "fast_response_expected" : "normal_response_expected",
  };
}

function riskRow(email: any, senderEmails: any[]) {
  const tone = toneAnalysis(email);
  const direction = conversationDirection(email);
  const posture = responsePosture(email, tone, direction);
  const trend = relationshipTrend(email, senderEmails);
  const profile = communicationProfile(email, senderEmails);
  return {
    id: String(email._id),
    emailId: String(email._id),
    projectId: email.projectId,
    subject: email.subject,
    from: email.from,
    date: email.date,
    contactCandidates: extractContactCandidates(email),
    tone: tone.tone,
    priority: tone.priority,
    escalationRisk: tone.escalationRisk,
    phrasingSignals: tone.phrasingSignals,
    sourceEvidence: tone.sourceEvidence,
    conversationDirection: direction,
    ...posture,
    ...trend,
    ...profile,
  };
}

function rescueRow(email: any, projectMap: Map<string, string>) {
  const bucket = email.communicationBucket || communicationBucket(email);
  const category = email.communicationCategory || communicationCategory(email);
  const priorityScore = communicationPriority(email);
  const routeConfidence = email.routingConfidence ?? (email.projectId ? 92 : 35);
  return {
    id: String(email._id),
    subject: email.subject,
    from: email.from,
    date: email.date,
    bodyPreview: email.bodyPreview || email.body?.slice(0, 180) || "",
    projectId: email.projectId,
    projectName: email.projectId ? projectMap.get(email.projectId) : undefined,
    bucket,
    category,
    priorityScore,
    routeConfidence,
    suggestedNextAction: email.suggestedNextAction || suggestedNextAction(email, bucket, category),
    hasAttachments: Boolean(email.hasAttachments),
    aiSummary: email.aiSummary,
    aiActionItems: email.aiActionItems || [],
    aiRiskFlags: email.aiRiskFlags || [],
    pipelineStatus: email.pipelineStatus || "inbox",
  };
}

export const list = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("emails")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const rescueInbox = query({
  args: { companyId: v.string(), companyName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const emails = await ctx.db.query("emails").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const projects = await ctx.db.query("projects").withIndex("by_company", (q: any) => q.eq("companyId", args.companyId as any)).collect();
    const projectMap = new Map(projects.map((project: any) => [String(project._id), project.name]));
    const rows = emails.map((email) => rescueRow(email, projectMap)).sort((a, b) => b.priorityScore - a.priorityScore);
    const buckets = {
      needs_response: rows.filter((row) => row.bucket === "needs_response"),
      needs_action: rows.filter((row) => row.bucket === "needs_action"),
      filed_to_project: rows.filter((row) => row.bucket === "filed_to_project"),
      needs_help_sorting: rows.filter((row) => row.bucket === "needs_help_sorting"),
    };
    const today = new Date().toISOString().slice(0, 10);
    return {
      companyForwardingAddress: `${slugifyCompany(args.companyName || args.companyId)}@opsslate.app`,
      summary: {
        needsResponse: buckets.needs_response.length,
        needsAction: buckets.needs_action.length,
        filedAutomatically: buckets.filed_to_project.length,
        needsHelpSorting: buckets.needs_help_sorting.length,
        contractNotice: rows.filter((row) => row.category === "contract_notice").length,
        scheduleImpact: rows.filter((row) => row.category === "schedule_impact").length,
        costImpact: rows.filter((row) => row.category === "cost_impact").length,
        total: rows.length,
        today,
      },
      buckets,
      topItems: [...buckets.needs_response, ...buckets.needs_action, ...buckets.needs_help_sorting].slice(0, 12),
      recentlyFiled: buckets.filed_to_project.slice(0, 8),
    };
  },
});

export const communicationIntakeMatrix = query({
  args: { companyId: v.string(), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const emails = await ctx.db.query("emails").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const scoped = args.projectId ? emails.filter((email) => email.projectId === args.projectId) : emails;
    const important = scoped.filter((email) => {
      const bucket = email.communicationBucket || communicationBucket(email);
      return bucket === "needs_response" || bucket === "needs_action" || communicationPriority(email) >= 45;
    });
    const items = important.flatMap(communicationMatrixItems).sort((a, b) => b.confidence - a.confidence).slice(0, 80);
    const count = (type: string) => items.filter((item) => item.type === type).length;
    return {
      summary: {
        items: items.length,
        tasks: count("task"),
        rfis: count("rfi"),
        submittals: count("submittal"),
        dueDates: count("due_date"),
        costImpacts: count("cost_impact"),
        scheduleImpacts: count("schedule_impact"),
        contractNotices: count("contract_notice"),
      },
      items,
    };
  },
});

export const communicationRiskIntelligence = query({
  args: { companyId: v.string(), projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const emails = await ctx.db.query("emails").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const scoped = args.projectId ? emails.filter((email) => email.projectId === args.projectId) : emails;
    const rows = scoped.map((email) => {
      const sender = normalizedSender(email);
      const senderEmails = scoped.filter((candidate) => normalizedSender(candidate) === sender);
      return riskRow(email, senderEmails);
    }).sort((a, b) => b.escalationRisk - a.escalationRisk).slice(0, 40);
    const candidateMap = new Map<string, any>();
    rows.flatMap((row) => row.contactCandidates || []).forEach((candidate) => {
      const key = candidate.email || `${candidate.name}-${candidate.projectId || ""}`;
      if (!candidateMap.has(key)) candidateMap.set(key, candidate);
    });
    const profileMap = new Map<string, any>();
    rows.forEach((row) => {
      if (!profileMap.has(row.sender)) {
        profileMap.set(row.sender, {
          sender: row.sender,
          communicationProfile: row.communicationProfile,
          escalationTendency: row.escalationTendency,
          relationshipHealth: row.relationshipHealth,
          emailCount: row.emailCount,
          commonTopics: row.commonTopics,
        });
      }
    });
    return {
      summary: {
        emails: rows.length,
        contactCandidates: candidateMap.size,
        highPriority: rows.filter((row) => row.priority === "High").length,
        critical: rows.filter((row) => row.priority === "Critical").length,
        argumentative: rows.filter((row) => row.tone === "argumentative").length,
        legalNotice: rows.filter((row) => row.tone === "legal_notice").length,
        deteriorating: rows.filter((row) => row.relationshipTrend === "deteriorating").length,
        profiles: profileMap.size,
      },
      contactCandidates: Array.from(candidateMap.values()).slice(0, 20),
      profiles: Array.from(profileMap.values()).slice(0, 20),
      rows,
    };
  },
});

export const create = mutation({
  args: {
    companyId: v.string(),
    projectId: v.optional(v.string()),
    subject: v.string(),
    from: v.string(),
    to: v.optional(v.string()),
    cc: v.optional(v.string()),
    date: v.string(),
    body: v.optional(v.string()),
    bodyPreview: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    hasAttachments: v.optional(v.boolean()),
    attachmentNames: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    threadId: v.optional(v.string()),
    importance: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.string())),
    pipelineStatus: v.optional(v.string()),
    processedByPm: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    extractedContacts: v.optional(v.number()),
    extractedTasks: v.optional(v.number()),
    extractedDates: v.optional(v.number()),
    routingConfidence: v.optional(v.number()),
    communicationBucket: v.optional(v.string()),
    communicationCategory: v.optional(v.string()),
    suggestedNextAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bucket = args.communicationBucket || communicationBucket(args);
    const category = args.communicationCategory || communicationCategory(args);
    return ctx.db.insert("emails", {
      ...args,
      bodyPreview: args.bodyPreview ?? args.body?.slice(0, 100),
      communicationBucket: bucket,
      communicationCategory: category,
      suggestedNextAction: args.suggestedNextAction || suggestedNextAction(args, bucket, category),
      routingConfidence: args.routingConfidence ?? (args.projectId ? 90 : 35),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("emails"),
    projectId: v.optional(v.string()),
    subject: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    cc: v.optional(v.string()),
    date: v.optional(v.string()),
    body: v.optional(v.string()),
    bodyPreview: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    hasAttachments: v.optional(v.boolean()),
    attachmentNames: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    threadId: v.optional(v.string()),
    importance: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.string())),
    aiTone: v.optional(v.string()),
    aiRiskFlags: v.optional(v.array(v.string())),
    aiActionItems: v.optional(v.array(v.string())),
    aiSummary: v.optional(v.string()),
    pipelineStatus: v.optional(v.string()),
    processedByPm: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    extractedContacts: v.optional(v.number()),
    extractedTasks: v.optional(v.number()),
    extractedDates: v.optional(v.number()),
    routingConfidence: v.optional(v.number()),
    communicationBucket: v.optional(v.string()),
    communicationCategory: v.optional(v.string()),
    suggestedNextAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    if (!clean.bodyPreview && clean.body && typeof clean.body === "string") {
      clean.bodyPreview = clean.body.slice(0, 100);
    }
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const addAttachment = mutation({
  args: {
    emailId: v.id("emails"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    // Add storageId to email attachments
    const existing = email.attachmentStorageIds || [];
    const existingNames = email.attachmentNames || [];
    await ctx.db.patch(args.emailId, {
      attachmentStorageIds: [...existing, args.storageId],
      attachmentNames: [...existingNames, args.fileName],
      hasAttachments: true,
    });

    // If it's a photo and email is linked to a project, auto-save to Site Media
    const isPhoto = args.fileType.startsWith("image/");
    if (isPhoto && email.projectId) {
      const url = await ctx.storage.getUrl(args.storageId as any);
      if (url) {
        await ctx.db.insert("siteMedia", {
          companyId: email.companyId as any,
          projectId: email.projectId as any,
          type: "photo",
          fileName: args.fileName,
          url,
          title: `Email: ${email.subject}`,
          description: `From correspondence — ${email.from} (${email.date})`,
          category: "Email Attachments",
          tags: ["email", "attachment"],
          capturedDate: email.date,
          capturedBy: email.from,
          status: "active",
          uploadedBy: "system",
        });
      }
    }

    return { ok: true, savedToSiteMedia: isPhoto && !!email.projectId };
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getAttachmentUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const urls: Record<string, string | null> = {};
    for (const id of args.storageIds) {
      urls[id] = await ctx.storage.getUrl(id as any);
    }
    return urls;
  },
});

export const importBatch = mutation({
  args: {
    companyId: v.string(),
    emails: v.array(v.object({
      projectId: v.optional(v.string()),
      subject: v.string(),
      from: v.string(),
      to: v.optional(v.string()),
      cc: v.optional(v.string()),
      date: v.string(),
      body: v.optional(v.string()),
      bodyPreview: v.optional(v.string()),
      category: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      hasAttachments: v.optional(v.boolean()),
      attachmentNames: v.optional(v.array(v.string())),
      source: v.optional(v.string()),
      threadId: v.optional(v.string()),
      importance: v.optional(v.string()),
      isRead: v.optional(v.boolean()),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const email of args.emails) {
      const id = await ctx.db.insert("emails", {
        ...email,
        companyId: args.companyId,
        bodyPreview: email.bodyPreview ?? email.body?.slice(0, 100),
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});
