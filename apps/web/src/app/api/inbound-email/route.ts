import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const INBOUND_SECRET = process.env.INBOUND_EMAIL_SECRET;
const DEFAULT_COMPANY_ID = process.env.INBOUND_DEFAULT_COMPANY_ID || "";
const DEFAULT_PROJECT_ID = process.env.INBOUND_DEFAULT_PROJECT_ID || undefined;

function isAuthorized(token?: string | null) {
  return !INBOUND_SECRET || token === INBOUND_SECRET;
}

function valueList(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value || "");
}

function htmlToText(html: unknown) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function retrieveResendReceivedEmail(emailData: Record<string, unknown>) {
  const emailId = String(emailData.email_id || emailData.id || "");
  const apiKey = process.env.RESEND_API_KEY;
  if (!emailId || !apiKey) return emailData;

  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return emailData;
  const received = await response.json();
  return (received.data || received || emailData) as Record<string, unknown>;
}

function normalizeResendEmail(emailData: Record<string, unknown>) {
  const headers = (emailData.headers || {}) as Record<string, unknown>;
  return {
    from: String(headers.from || emailData.from || ""),
    to: valueList(emailData.to),
    cc: valueList(emailData.cc),
    subject: String(emailData.subject || "(No Subject)"),
    date: String(emailData.created_at || emailData.date || ""),
    body: String(emailData.text || "") || htmlToText(emailData.html),
    companyId: DEFAULT_COMPANY_ID,
    projectId: DEFAULT_PROJECT_ID,
    attachmentNames: Array.isArray(emailData.attachments)
      ? emailData.attachments.map((attachment: any) => attachment?.filename).filter(Boolean)
      : [],
  };
}

function extractEmailAddresses(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  return Array.from(raw.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)).map((match) => match[0].toLowerCase());
}

function findRouteAddress(to: unknown, cc: unknown) {
  const addresses = [...extractEmailAddresses(to), ...extractEmailAddresses(cc)];
  for (const address of addresses) {
    const [local] = address.split("@");
    const plusMatch = local.match(/^(?:pm|aipm|project)\+(.+)$/i);
    const dashMatch = local.match(/^(?:pm|aipm|project)-(.+)$/i);
    const token = plusMatch?.[1] || dashMatch?.[1];
    if (!token) continue;
    if (local.startsWith("project")) return { type: "project" as const, id: token };
    return { type: "pm" as const, id: token };
  }
  return null;
}

function recipientAddresses(email: { to?: unknown; cc?: unknown }) {
  return [...extractEmailAddresses(email.to), ...extractEmailAddresses(email.cc)];
}

async function resolveInboundRoute(email: { to?: unknown; cc?: unknown; companyId?: string; projectId?: string }) {
  // Runtime equivalent of api.inboundEmailAddresses.resolveRecipient; cast keeps builds working before generated bindings refresh.
  const configuredRoute = await convex.query((api as any).inboundEmailAddresses.resolveRecipient, {
    addresses: recipientAddresses(email),
  });
  if (configuredRoute) {
    return {
      companyId: String((configuredRoute as any).companyId),
      projectId: (configuredRoute as any).projectId ? String((configuredRoute as any).projectId) : undefined,
      routeType: (configuredRoute as any).routeType || "company",
      fullAddress: (configuredRoute as any).fullAddress,
      pm: null as null | Record<string, unknown>,
    };
  }

  const routed = findRouteAddress(email.to, email.cc);
  if (!routed) {
    return { companyId: email.companyId || DEFAULT_COMPANY_ID, projectId: email.projectId || DEFAULT_PROJECT_ID, routeType: "default", fullAddress: undefined, pm: null as null | Record<string, unknown> };
  }

  if (routed.type === "pm") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pm = await convex.query(api.aiPm.getById as any, { id: routed.id });
      if (pm) {
        return {
          companyId: String((pm as any).companyId),
          projectId: String((pm as any).projectId),
          routeType: "pm",
          fullAddress: undefined,
          pm: pm as Record<string, unknown>,
        };
      }
    } catch {
      // Fall through to explicit/default routing.
    }
  }

  if (routed.type === "project") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = await convex.query(api.projects.getById as any, { id: routed.id });
      if (project) {
        return {
          companyId: String((project as any).companyId),
          projectId: String((project as any)._id),
          routeType: "project",
          fullAddress: undefined,
          pm: null as null | Record<string, unknown>,
        };
      }
    } catch {
      // Fall through to explicit/default routing.
    }
  }

  return { companyId: email.companyId || DEFAULT_COMPANY_ID, projectId: email.projectId || DEFAULT_PROJECT_ID, routeType: "default", fullAddress: undefined, pm: null as null | Record<string, unknown> };
}

function extractGmailVerification(email: { from?: string; subject?: string; body?: string }) {
  const text = `${email.subject || ""}\n${email.body || ""}`;
  const isGmail = /forwarding-confirmation|mail-noreply@google\.com|gmail/i.test(`${email.from || ""} ${email.subject || ""}`);
  const code = text.match(/\b(\d{8,12})\b/)?.[1] || text.match(/confirmation code[:\s]+([A-Z0-9-]{6,})/i)?.[1];
  const link = text.match(/https:\/\/mail-settings\.google\.com\/[^\s"')]+/i)?.[0];
  if (!isGmail && !code && !link) return null;
  return { gmailVerificationCode: code || link, gmailVerificationSubject: email.subject || "Gmail verification" };
}

function stripForwardHeaders(body: string): { cleanBody: string; originalFrom: string; originalDate: string; originalSubject: string } {
  let originalFrom = "";
  let originalDate = "";
  let originalSubject = "";

  // Extract forwarded email headers (Outlook & Gmail patterns)
  const fromMatch = body.match(/(?:From|De):\s*(.+?)(?:\r?\n|$)/i);
  if (fromMatch) originalFrom = fromMatch[1].trim();

  const dateMatch = body.match(/(?:Sent|Date|Envoy[eé]):\s*(.+?)(?:\r?\n|$)/i);
  if (dateMatch) originalDate = dateMatch[1].trim();

  const subjectMatch = body.match(/(?:Subject|Objet):\s*(.+?)(?:\r?\n|$)/i);
  if (subjectMatch) originalSubject = subjectMatch[1].trim();

  // Clean up the body — remove the forwarded header block
  let cleanBody = body
    .replace(/^-+\s*Forwarded message\s*-+\s*/im, "")
    .replace(/^-+\s*Original Message\s*-+\s*/im, "")
    .replace(/^From:.*$/im, "")
    .replace(/^Sent:.*$/im, "")
    .replace(/^To:.*$/im, "")
    .replace(/^Cc:.*$/im, "")
    .replace(/^Subject:.*$/im, "")
    .replace(/^Date:.*$/im, "")
    .trim();

  return { cleanBody, originalFrom, originalDate, originalSubject };
}

function inboundCommunicationCategory(email: { subject?: string; body?: string }) {
  const text = `${email.subject || ""} ${email.body || ""}`.toLowerCase();
  if (/change order|extra work|claim|notice|directive|backcharge|not in contract|out of scope/.test(text)) return "contract_notice";
  if (/delay|schedule|milestone|late|critical path|delivery date/.test(text)) return "schedule_impact";
  if (/cost|price|payment|pay app|invoice|retainage|lien|unpaid|unit price/.test(text)) return "cost_impact";
  if (/submittal|shop drawing|product data|sample|certification/.test(text)) return "submittal";
  if (/rfi|clarification|question|please advise|confirm/.test(text)) return "rfi_clarification";
  return "general_correspondence";
}

function inboundCommunicationBucket(email: { projectId?: string; subject?: string; body?: string }) {
  const text = `${email.subject || ""} ${email.body || ""}`.toLowerCase();
  if (!email.projectId) return "needs_help_sorting";
  if (/please respond|need response|respond by|reply|please advise|confirm|can you|could you|question|\?|notice|claim|delay|backcharge|lien|urgent|asap|critical/.test(text)) return "needs_response";
  if (/please|need|provide|send|submit|review|due|required by/.test(text)) return "needs_action";
  return "filed_to_project";
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get("key");
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || keyParam;
    const contentType = req.headers.get("content-type") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emails: Array<any> = [];

    // === RESEND INBOUND WEBHOOK ===
    // Resend sends JSON with: { from, to, subject, text, html, headers, etc. }
    if (contentType.includes("application/json")) {
      const data = await req.json();

      const isResendInbound = data.type === "email.received" || (data.email_id && data.from && data.to);
      if (isResendInbound) {
        if (!isAuthorized(token)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const emailData = await retrieveResendReceivedEmail((data.data || data) as Record<string, unknown>);
        emails = [normalizeResendEmail(emailData)];
      } else {
        // Direct JSON post (Power Automate, Zapier, custom scripts)
        if (!isAuthorized(token)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        emails = Array.isArray(data) ? data : [data];
      }
    } else if (contentType.includes("multipart/form-data")) {
      // Mailgun / SendGrid Inbound Parse parsed mode format
      if (!isAuthorized(token)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const formData = await req.formData();
      let envelopeTo = "";
      try {
        const envelope = JSON.parse(String(formData.get("envelope") || "{}"));
        envelopeTo = Array.isArray(envelope.to) ? envelope.to.join(",") : "";
      } catch {
        envelopeTo = "";
      }
      emails = [{
        from: (formData.get("from") as string) || (formData.get("sender") as string) || "",
        to: (formData.get("to") as string) || (formData.get("recipient") as string) || envelopeTo || "",
        cc: (formData.get("Cc") as string) || (formData.get("cc") as string) || "",
        subject: (formData.get("subject") as string) || (formData.get("Subject") as string) || "",
        date: (formData.get("Date") as string) || (formData.get("date") as string) || "",
        body: (formData.get("body-plain") as string) || (formData.get("stripped-text") as string) || (formData.get("text") as string) || "",
      }];
    } else {
      const text = await req.text();
      try {
        const data = JSON.parse(text);
        emails = Array.isArray(data) ? data : [data];
      } catch {
        return Response.json({ error: "Unsupported content type" }, { status: 400 });
      }
    }

    let created = 0;
    const threadId = `inbound-${Date.now()}`;

    for (const email of emails) {
      if (!email.from && !email.subject) continue;

      // Handle forwarded emails — extract original sender info
      const subject = email.subject || "(No Subject)";
      const isForwarded = /^(Fwd?|FW):/i.test(subject);
      const { cleanBody, originalFrom, originalDate } = stripForwardHeaders(email.body || "");

      const finalFrom = isForwarded && originalFrom ? `${originalFrom} (fwd by ${email.from})` : email.from || "Unknown";
      const finalBody = isForwarded ? cleanBody : (email.body || "");
      const finalDate = originalDate || email.date || new Date().toISOString().slice(0, 10);

      const route = await resolveInboundRoute(email);
      const companyId = route.companyId;
      if (!companyId) {
        console.error("Inbound email missing company route. Set INBOUND_DEFAULT_COMPANY_ID or create a matching inbound address.", { to: email.to, subject });
        continue;
      }
      const projectId = route.projectId;
      const routedPm = route.pm;
      const gmailVerification = extractGmailVerification({ from: finalFrom, subject, body: finalBody });
      const routingConfidence = projectId ? 95 : 35;
      const communicationCategory = inboundCommunicationCategory({ subject, body: finalBody });
      const communicationBucket = inboundCommunicationBucket({ projectId, subject, body: finalBody });

      if (gmailVerification && route.fullAddress) {
        await convex.mutation((api as any).inboundEmailAddresses.markGmailVerification, {
          fullAddress: route.fullAddress,
          gmailVerificationCode: gmailVerification.gmailVerificationCode,
          gmailVerificationSubject: gmailVerification.gmailVerificationSubject,
          lastSender: finalFrom,
          lastSubject: subject,
        });
      } else if (route.fullAddress) {
        await convex.mutation((api as any).inboundEmailAddresses.touchReceived, {
          fullAddress: route.fullAddress,
          lastSender: finalFrom,
          lastSubject: subject,
        });
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emailId = await convex.mutation(api.emails.create as any, {
          companyId,
          subject: subject.replace(/^(Fwd?|FW):\s*/i, ""),
          from: finalFrom,
          to: email.to || "",
          cc: email.cc || "",
          date: typeof finalDate === "string" && finalDate.includes("-") ? finalDate : new Date().toISOString().slice(0, 10),
          body: finalBody,
          bodyPreview: finalBody.slice(0, 200),
          source: isForwarded ? "Forwarded" : "Inbound",
          category: "incoming",
          importance: "normal",
          isRead: false,
          threadId: emails.length > 1 ? threadId : undefined,
          projectId: route.projectId,
          hasAttachments: (email.attachmentNames || []).length > 0,
          attachmentNames: email.attachmentNames || [],
          pipelineStatus: "inbox",
          routingConfidence,
          communicationBucket,
          communicationCategory,
          suggestedNextAction: communicationBucket === "needs_help_sorting"
            ? "Pick the project once; OpsSlate will use that correction to improve future routing."
            : communicationBucket === "needs_response"
              ? "Review and respond before this communication turns into a project risk."
              : communicationBucket === "needs_action"
                ? "Convert the extracted action into a task, RFI, submittal, or note."
                : "Filed automatically; no immediate action needed.",
          notes: gmailVerification
            ? `Gmail verification captured for ${route.fullAddress || "inbound address"}.`
            : routedPm
              ? `Routed to AI PM ${(routedPm as any).name}`
              : route.fullAddress
                ? `Routed through ${route.fullAddress}.`
                : undefined,
        } as any);

        if (routedPm && projectId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await convex.mutation(api.aiPm.addMessage as any, {
            pmId: (routedPm as any)._id,
            projectId,
            companyId,
            role: "pm",
            message: `📬 New email received from ${finalFrom}\nSubject: ${subject.replace(/^(Fwd?|FW):\s*/i, "")}\n\nI added it to project correspondence. Ask me to "scan email" when you want me to extract tasks, risks, and schedule dates.`,
          });
        }
        created++;
      } catch (e) {
        console.error("Failed to create inbound email:", e);
      }
    }

    // Auto-assign emails to projects
    if (created > 0) {
      // Trigger auto-assign for each email (fire and forget)
      for (const email of emails) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await convex.action(api.emailAutoAssign.autoAssign as any, {
            emailId: "latest",
            companyId: (await resolveInboundRoute(email)).companyId,
            subject: email.subject || "",
            from: email.from || "",
            body: (email.body || "").slice(0, 3000),
          });
        } catch (e) {
          console.error("Auto-assign failed (non-blocking):", e);
        }
      }
    }

    return Response.json({ ok: true, created });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("Inbound email error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    status: "ok",
    endpoint: "inbound-email",
    forwarding: "Forward emails to pm+AI_PM_ID@opsslate.app or project+PROJECT_ID@opsslate.app — they appear in project correspondence",
    providerSetup: "Resend Inbound event email.received should POST to https://www.opsslate.app/api/inbound-email. SendGrid Inbound Parse and Mailgun parsed webhooks are also supported.",
    manual: "POST JSON with ?key=SECRET: { from, subject, body, companyId? }",
    supported: ["Admin address manager", "Gmail verification capture", "AI PM inbox routing", "Project inbox routing", "Resend inbound webhook", "SendGrid Inbound Parse", "mailgun", "Outlook forwarding rules", "Gmail forwarding", "Power Automate", "Zapier"],
  });
}
