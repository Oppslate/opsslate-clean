import { normalizeEstimateSupportInput } from "@opsslate/helios-domain";

import { callHeliosGateway } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson, isSameOrigin } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; estimateId: string }> },
) {
  if (!isSameOrigin(request)) return apiJson({ error: "Request origin was rejected." }, 403);
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);
  try {
    const { projectId, estimateId } = await params;
    const input = normalizeEstimateSupportInput(await request.json());
    const data = await callHeliosGateway(
      "/helios/v1/estimates/support",
      principal,
      { projectId, estimateId, input },
    );
    return apiJson({ data }, 201);
  } catch (error) {
    return apiJson({
      error: error instanceof Error ? error.message : "Estimate supporting record could not be saved.",
    }, 400);
  }
}
