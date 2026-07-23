import { notFound } from "next/navigation";

import { ProjectIntake } from "@/components/project-intake";
import { getProject } from "@/lib/helios-data";
import { HeliosGatewayError } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const principal = await readHeliosPrincipal();
  if (!principal) notFound();
  const { projectId } = await params;
  let detail;
  try {
    detail = await getProject(principal, projectId);
  } catch (error) {
    if (error instanceof HeliosGatewayError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  return <ProjectIntake detail={detail} principal={principal} />;
}
