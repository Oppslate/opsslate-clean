import { callHeliosGateway } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson, isSameOrigin } from "@/lib/request-security";

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; packageId: string }> },
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
    return apiJson({ error: "Invalid bid package addition." }, 400);
  }
  try {
    const { projectId, packageId } = await params;
    const data = await callHeliosGateway(
      "/helios/v1/packages/append",
      principal,
      {
        projectId,
        packageId,
        input: {
          name: body.name,
          sourceType: body.sourceType,
          entries: body.entries,
        },
      },
    );
    return apiJson({ data }, 201);
  } catch (error) {
    return apiJson(
      {
        error:
          error instanceof Error
            ? error.message
            : "Files could not be added to the bid package.",
      },
      400,
    );
  }
}
