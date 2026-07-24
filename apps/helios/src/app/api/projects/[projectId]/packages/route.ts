import { callHeliosGateway } from "@/lib/helios-gateway";
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
    name?: unknown;
    sourceType?: unknown;
    entries?: unknown;
  } | null;
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.sourceType !== "string" ||
    !Array.isArray(body.entries)
  ) {
    return apiJson({ error: "Invalid bid package." }, 400);
  }
  try {
    const { projectId } = await params;
    const data = await callHeliosGateway(
      "/helios/v1/packages/create",
      principal,
      {
        projectId,
        input: {
          name: body.name,
          sourceType: body.sourceType,
          entries: body.entries,
        },
      },
    );
    return apiJson({ data }, 201);
  } catch {
    return apiJson({ error: "Bid package could not be created." }, 400);
  }
}
