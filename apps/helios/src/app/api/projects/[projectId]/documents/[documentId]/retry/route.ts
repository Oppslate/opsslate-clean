import { callHeliosGateway } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson, isSameOrigin } from "@/lib/request-security";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; documentId: string }>;
  },
) {
  if (!isSameOrigin(request)) {
    return apiJson({ error: "Request origin was rejected." }, 403);
  }
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);

  try {
    const { projectId, documentId } = await params;
    const data = await callHeliosGateway(
      "/helios/v1/documents/retry",
      principal,
      { projectId, documentId },
    );
    return apiJson({ data }, 202);
  } catch {
    return apiJson({ error: "Document processing could not be retried." }, 400);
  }
}
