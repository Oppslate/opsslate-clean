import { HeliosApplicationBoundary } from "@/components/helios-application-boundary";
import { HeliosAccessBoundary } from "@/components/helios-access-boundary";
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
  return <HeliosApplicationBoundary principal={principal} />;
}
