import "server-only";

import { verifyHeliosSessionToken } from "@opsslate/suite-auth/server";
import type { HeliosPrincipal } from "@opsslate/suite-auth/types";
import { cookies } from "next/headers";

export const HELIOS_SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-helios_session"
    : "helios_session";

export function getHeliosSessionSecret() {
  const secret = process.env.HELIOS_SESSION_SECRET || "";
  if (secret.length < 32) {
    throw new Error(
      "HELIOS_SESSION_SECRET must be configured with at least 32 characters.",
    );
  }
  return secret;
}

export async function readHeliosPrincipal(): Promise<HeliosPrincipal | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(HELIOS_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return verifyHeliosSessionToken(token, getHeliosSessionSecret());
  } catch {
    return null;
  }
}
