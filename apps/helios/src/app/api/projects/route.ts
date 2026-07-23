import { normalizeProjectInput } from "@opsslate/helios-domain";

import { createProject, getCockpit } from "@/lib/helios-data";
import { HeliosGatewayError } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson, isSameOrigin } from "@/lib/request-security";

export async function GET() {
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);
  try {
    return apiJson({ data: await getCockpit(principal) });
  } catch {
    return apiJson({ error: "Projects could not be loaded." }, 502);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiJson({ error: "Request origin was rejected." }, 403);
  }
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);
  try {
    const input = normalizeProjectInput(await request.json());
    return apiJson({ data: await createProject(principal, input) }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Project could not be created.";
    const status = error instanceof HeliosGatewayError ? error.status : 400;
    return apiJson({ error: message }, status);
  }
}
