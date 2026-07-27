import { notFound, redirect } from "next/navigation";

import { ProjectIntake } from "@/components/project-intake";
import { getEstimateWorkspace, getProject, getTakeoffWorkspace } from "@/lib/helios-data";
import { HeliosGatewayError } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const principal = await readHeliosPrincipal();
  if (!principal) {
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(`/projects/${projectId}`)}`,
    );
  }
  let detail;
  let workspace;
  let takeoff;
  try {
    [detail, workspace, takeoff] = await Promise.all([
      getProject(principal, projectId),
      getEstimateWorkspace(principal, projectId),
      getTakeoffWorkspace(principal, projectId),
    ]);
  } catch (error) {
    if (error instanceof HeliosGatewayError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  return (
    <ProjectIntake
      detail={detail}
      principal={principal}
      workspace={workspace}
      takeoff={takeoff}
    />
  );
}
