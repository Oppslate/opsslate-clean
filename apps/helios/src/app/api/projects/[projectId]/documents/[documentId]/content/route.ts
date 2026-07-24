import { callHeliosGatewayRaw } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isSameOriginDocumentRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  const referer = request.headers.get("referer");
  if (fetchSite === "same-origin") return true;
  if (fetchSite) return false;
  if (!referer) return false;
  try {
    return new URL(referer).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  if (!isSameOriginDocumentRequest(request)) {
    return apiJson({ error: "Document request origin was rejected." }, 403);
  }
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);

  try {
    const { projectId, documentId } = await params;
    const range = request.headers.get("range");
    const source = await callHeliosGatewayRaw(
      "/helios/v1/documents/view",
      principal,
      {
        projectId,
        documentId,
        range: range || undefined,
      },
    );
    if (!source.ok || !source.body) {
      return apiJson(
        { error: "Document content could not be loaded." },
        source.status === 404 ? 404 : 502,
      );
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    });
    for (const name of [
      "accept-ranges",
      "content-disposition",
      "content-length",
      "content-range",
      "content-security-policy",
    ]) {
      const value = source.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(source.body, {
      status: source.status,
      headers,
    });
  } catch {
    return apiJson({ error: "Document content could not be loaded." }, 502);
  }
}
