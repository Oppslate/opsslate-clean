import { callHeliosGateway } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson, isSameOrigin } from "@/lib/request-security";

type UploadIntent = { intentId: string; uploadUrl: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!isSameOrigin(request)) {
    return apiJson({ error: "Request origin was rejected." }, 403);
  }
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);
  try {
    const { projectId } = await params;
    const data = await callHeliosGateway<UploadIntent>(
      "/helios/v1/uploads/create",
      principal,
      { projectId },
    );
    return apiJson({ data }, 201);
  } catch {
    return apiJson({ error: "Upload could not be authorized." }, 403);
  }
}
