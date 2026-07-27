import { callHeliosGateway, HeliosGatewayError } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson, isSameOrigin } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!isSameOrigin(request)) {
    return apiJson({ error: "Request origin was rejected." }, 403);
  }
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);

  const body = (await request.json().catch(() => null)) as {
    intentId?: unknown;
    storageId?: unknown;
    fileName?: unknown;
  } | null;
  if (
    !body ||
    typeof body.intentId !== "string" ||
    typeof body.storageId !== "string" ||
    typeof body.fileName !== "string"
  ) {
    return apiJson({ error: "Invalid document registration." }, 400);
  }

  try {
    const { projectId } = await params;
    const data = await callHeliosGateway(
      "/helios/v1/documents/register",
      principal,
      {
        projectId,
        intentId: body.intentId,
        storageId: body.storageId,
        fileName: body.fileName,
      },
    );
    return apiJson({ data }, 201);
  } catch (error) {
    if (error instanceof HeliosGatewayError && error.status === 400) {
      return apiJson({ error: error.message }, 400);
    }
    return apiJson({ error: "PDF validation or registration failed." }, 400);
  }
}
