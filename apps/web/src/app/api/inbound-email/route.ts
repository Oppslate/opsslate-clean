import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const INBOUND_SECRET = process.env.INBOUND_EMAIL_SECRET || "opsslate-inbound-2026";

// Buffmaz's company ID — forwarded emails go here by default
const DEFAULT_COMPANY_ID = "kd7dcc6qqsm83v2hrgvhzbzbyd81qf1e";

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

async function resolveInboundRoute(email: { to?: unknown; cc?: unknown; companyId?: string; projectId?: string }) {
  const routed = findRouteAddress(email.to, email.cc);
  if (!routed) {
    return { companyId: email.companyId || DEFAULT_COMPANY_ID, projectId: email.projectId || undefined, pm: null as null | Record<string, unknown> };
  }

  if (routed.type === "pm") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pm = await convex.query(api.aiPm.getById as any, { id: routed.id });
      if (pm) {
        return {
          companyId: String((pm as any).companyId),
          projectId: String((pm as any).projectId),
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
          pm: null as null | Record<string, unknown>,
        };
      }
    } catch {
      // Fall through to explicit/default routing.
    }
  }

  return { companyId: email.companyId || DEFAULT_COMPANY_ID, projectId: email.projectId || undefined, pm: null as null | Record<string, unknown> };
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

      // Check if this looks like a Resend inbound webhook
      if (data.type === "email.received" || data.data?.from || (data.from && data.to && !Array.isArray(data))) {
        // Resend webhook format
        const emailData = data.data || data;
        emails = [{
          from: emailData.from || "",
          to: emailData.to || "",
          cc: emailData.cc || "",
          subject: emailData.subject || "(No Subject)",
          date: emailData.created_at || emailData.date || "",
          body: emailData.text || emailData.html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "",
          companyId: DEFAULT_COMPANY_ID,
        }];
      } else {
        // Direct JSON post (Power Automate, Zapier, custom scripts)
        if (token !== INBOUND_SECRET) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        emails = Array.isArray(data) ? data : [data];
      }
    } else if (contentType.includes("multipart/form-data")) {
      // Mailgun / SendGrid format
      if (token !== INBOUND_SECRET) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const formData = await req.formData();
      emails = [{
        from: (formData.get("from") as string) || (formData.get("sender") as string) || "",
        to: (formData.get("to") as string) || (formData.get("recipient") as string) || "",
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
      const projectId = route.projectId;
      const routedPm = route.pm;

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
          projectId,
          hasAttachments: false,
          attachmentNames: [],
          pipelineStatus: "inbox",
          notes: routedPm ? `Routed to AI PM ${(routedPm as any).name}` : undefined,
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
    manual: "POST JSON with ?key=SECRET: { from, subject, body, companyId? }",
    supported: ["AI PM inbox routing", "Project inbox routing", "Resend inbound webhook", "Outlook forwarding rules", "Gmail forwarding", "Power Automate", "Zapier"],
  });
}
