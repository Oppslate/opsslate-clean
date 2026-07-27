import { callHeliosGateway } from "@/lib/helios-gateway";
import { secureManualPackageInput } from "@/lib/manual-package";
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
    envelopeId?: unknown;
    adapter?: unknown;
    manifestVersion?: unknown;
    name?: unknown;
    sourceType?: unknown;
    revisionKind?: unknown;
    revisionLabel?: unknown;
    entries?: unknown;
  } | null;
  const input = secureManualPackageInput(body);
  if (!input) {
    return apiJson({ error: "Invalid bid package." }, 400);
  }
  try {
    const { projectId } = await params;
    const data = await callHeliosGateway(
      "/helios/v1/packages/create",
      principal,
      {
        projectId,
        input,
      },
    );
    return apiJson({ data }, 201);
  } catch {
    return apiJson({ error: "Bid package could not be created." }, 400);
  }
}
