import { callHeliosGateway } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson, isSameOrigin } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!isSameOrigin(request)) return apiJson({ error: "Request origin was rejected." }, 403);
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);
  const body = await request.json().catch(() => null) as { question?: unknown; threadId?: unknown } | null;
  if (!body || typeof body.question !== "string" ||
      (body.threadId !== undefined && typeof body.threadId !== "string")) {
    return apiJson({ error: "Enter a valid project question." }, 400);
  }
  try {
    const { projectId } = await params;
    const data = await callHeliosGateway<{ threadId: string; messageId: string; status: "pending" }>(
      "/helios/v1/assistant/ask", principal,
      { projectId, question: body.question, threadId: body.threadId },
    );
    return apiJson({ data }, 202);
  } catch (error) {
    return apiJson({
      error: error instanceof Error ? error.message : "Ask Helios could not accept that question.",
    }, 400);
  }
}
