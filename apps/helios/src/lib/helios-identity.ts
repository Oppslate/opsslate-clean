import "server-only";

import type {
  HeliosIdentity,
  HeliosPrincipal,
} from "@/lib/helios-principal";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function convexSiteUrl() {
  const value = process.env.HELIOS_CONVEX_SITE_URL || "";
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1"))
  ) {
    throw new Error("HELIOS_CONVEX_SITE_URL must use HTTPS.");
  }
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function gatewaySecret() {
  const secret = process.env.HELIOS_IDENTITY_GATEWAY_SECRET || "";
  if (secret.length < 32) {
    throw new Error(
      "HELIOS_IDENTITY_GATEWAY_SECRET must be configured with at least 32 characters.",
    );
  }
  return secret;
}

function parsePrincipal(value: unknown): HeliosPrincipal {
  if (!isRecord(value)) throw new Error("Invalid identity gateway response.");

  const userId = requiredString(value.userId);
  const companyId = requiredString(value.companyId);
  const subject = requiredString(value.subject);
  const issuer = requiredString(value.issuer);
  const email = requiredString(value.email)?.toLowerCase();
  const name = requiredString(value.name);
  const role = requiredString(value.role);

  if (
    !userId ||
    !companyId ||
    !subject ||
    !issuer ||
    !email ||
    !name ||
    !role
  ) {
    throw new Error("Identity gateway returned an incomplete principal.");
  }

  return { userId, companyId, subject, issuer, email, name, role };
}

export async function resolveHeliosPrincipal(
  identity: HeliosIdentity,
): Promise<HeliosPrincipal> {
  const response = await fetch(
    `${convexSiteUrl()}/helios/v1/identity/resolve`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${gatewaySecret()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(identity),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    },
  );

  if (!response.ok) {
    throw new Error("Helios identity is not authorized.");
  }

  const payload = await response.json();
  if (!isRecord(payload)) throw new Error("Invalid identity gateway response.");
  return parsePrincipal(payload.principal);
}
