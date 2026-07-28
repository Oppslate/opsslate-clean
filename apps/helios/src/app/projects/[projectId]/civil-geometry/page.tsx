import { notFound, redirect } from "next/navigation";

import { EuclidCockpit } from "@/components/euclid-cockpit";
import { HeliosShell } from "@/components/helios-shell";
import { getEuclidCockpitWorkspace } from "@/lib/helios-data";
import { HeliosGatewayError } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function CivilGeometryProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ alignment?: string }>;
}) {
  const { projectId } = await params;
  const { alignment } = await searchParams;
  const principal = await readHeliosPrincipal();
  if (!principal) {
    const target = `/projects/${projectId}/civil-geometry${alignment ? `?alignment=${encodeURIComponent(alignment)}` : ""}`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(target)}`);
  }
  let workspace;
  try {
    workspace = await getEuclidCockpitWorkspace(principal, projectId, alignment);
  } catch (error) {
    if (error instanceof HeliosGatewayError && error.status === 404) notFound();
    throw error;
  }
  return <HeliosShell principal={principal}><EuclidCockpit workspace={workspace} /></HeliosShell>;
}
