import "server-only";

import type { HeliosPrincipal } from "@opsslate/suite-auth/types";

type GatewayErrorPayload = { error?: unknown };

export class HeliosGatewayError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HeliosGatewayError";
    this.status = status;
  }
}

function gatewayUrl() {
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

function gatewayPrincipal(principal: HeliosPrincipal) {
  return {
    userId: principal.userId,
    companyId: principal.companyId,
    subject: principal.subject,
    issuer: principal.issuer,
  };
}

export async function callHeliosGateway<T>(
  path: string,
  principal: HeliosPrincipal,
  body: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`${gatewayUrl()}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${gatewaySecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ principal: gatewayPrincipal(principal), ...body }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
  } & GatewayErrorPayload;
  if (!response.ok) {
    throw new HeliosGatewayError(
      typeof payload.error === "string"
        ? payload.error
        : "Helios data service request failed.",
      response.status,
    );
  }
  if (!("data" in payload)) {
    throw new HeliosGatewayError("Helios data service returned no data.", 502);
  }
  return payload.data as T;
}
