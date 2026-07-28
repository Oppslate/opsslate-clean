import { notFound, redirect } from "next/navigation";

import { AskHeliosWorkspace } from "@/components/ask-helios-workspace";
import { HeliosShell } from "@/components/helios-shell";
import { getAssistantWorkspace } from "@/lib/helios-data";
import { HeliosGatewayError } from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function NewAskHeliosPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const principal = await readHeliosPrincipal();
  if (!principal) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/projects/${projectId}/ask`)}`);
  let workspace;
  try {
    workspace = await getAssistantWorkspace(principal, projectId);
  } catch (error) {
    if (error instanceof HeliosGatewayError && error.status === 404) notFound();
    throw error;
  }
  return <HeliosShell principal={principal}><AskHeliosWorkspace workspace={workspace} /></HeliosShell>;
}
