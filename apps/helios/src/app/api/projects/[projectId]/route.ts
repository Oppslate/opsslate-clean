import { getProject } from "@/lib/helios-data";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson } from "@/lib/request-security";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);
  try {
    const { projectId } = await params;
    return apiJson({ data: await getProject(principal, projectId) });
  } catch {
    return apiJson({ error: "Project was not found." }, 404);
  }
}
