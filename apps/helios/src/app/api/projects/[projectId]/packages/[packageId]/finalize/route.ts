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
  try {
    const { projectId, packageId } = await params;
    const data = await callHeliosGateway(
      "/helios/v1/packages/finalize",
      principal,
      { projectId, packageId },
    );
    return apiJson({ data }, 202);
  } catch (error) {
    return apiJson(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bid package could not be finalized.",
      },
      400,
    );
  }
}
