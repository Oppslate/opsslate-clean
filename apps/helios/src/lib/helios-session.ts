import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { resolveHeliosPrincipal } from "@/lib/helios-identity";
import type { HeliosPrincipal } from "@/lib/helios-principal";

const HELIOS_IDENTITY_ISSUER = "https://clerk.com";

export async function readHeliosPrincipal(): Promise<HeliosPrincipal | null> {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) return null;

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress;
  if (
    !user ||
    !primaryEmail ||
    primaryEmail.verification?.status !== "verified"
  ) {
    return null;
  }

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    primaryEmail.emailAddress;

  return resolveHeliosPrincipal({
    subject: session.userId,
    issuer: HELIOS_IDENTITY_ISSUER,
    email: primaryEmail.emailAddress,
    name,
  });
}
