import { notFound, redirect } from "next/navigation";

import { EstimateBuilder } from "@/components/estimate-builder";
import { HeliosShell } from "@/components/helios-shell";
import { getEstimateWorkspace, getProject } from "@/lib/helios-data";
import { HeliosGatewayError } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function ProjectEstimatePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const principal = await readHeliosPrincipal();
  if (!principal) {
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(
        `/projects/${projectId}/estimate`,
      )}`,
    );
  }
  let detail;
  let workspace;
  try {
    [detail, workspace] = await Promise.all([
      getProject(principal, projectId),
      getEstimateWorkspace(principal, projectId),
    ]);
  } catch (error) {
    if (error instanceof HeliosGatewayError && error.status === 404) notFound();
    throw error;
  }
  return (
    <HeliosShell principal={principal}>
      <EstimateBuilder
        project={detail.project}
        workspace={workspace}
        bidBasis={detail.bidBasis}
      />
    </HeliosShell>
  );
}
