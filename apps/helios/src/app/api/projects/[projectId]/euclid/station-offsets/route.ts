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
  try {
    const { projectId } = await params;
    const input = (await request.json()) as unknown;
    const data = await callHeliosGateway(
      "/helios/v1/euclid/station-offsets",
      principal,
      { projectId, input },
    );
    return apiJson({ data }, 200);
  } catch (error) {
    return apiJson({
      error: error instanceof Error ? error.message : "Euclid station-offset position could not be evaluated.",
    }, 400);
  }
}
