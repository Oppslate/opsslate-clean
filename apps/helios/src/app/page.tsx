import { HeliosAccessBoundary } from "@/components/helios-access-boundary";
import { Cockpit } from "@/components/cockpit";
import { HeliosShell } from "@/components/helios-shell";
import { getCockpit } from "@/lib/helios-data";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const [principal, params] = await Promise.all([
    readHeliosPrincipal(),
    searchParams,
  ]);

  if (!principal) return <HeliosAccessBoundary state={params.auth} />;
  const data = await getCockpit(principal);
  return (
    <HeliosShell principal={principal}>
      <Cockpit data={data} />
    </HeliosShell>
  );
}
