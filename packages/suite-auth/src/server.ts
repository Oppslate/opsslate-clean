import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  HELIOS_SESSION_AUDIENCE,
  HELIOS_SESSION_ISSUER,
  HELIOS_SESSION_MAX_AGE_SECONDS,
  HELIOS_SESSION_VERSION,
  type HeliosPrincipal,
  type HeliosSessionClaims,
  type OpsSlateIdentity,
} from "./types.ts";

const SESSION_HEADER = Object.freeze({
  alg: "HS256",
  typ: "JWT",
  version: HELIOS_SESSION_VERSION,
});

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing or invalid ${field}.`);
  }
  return value.trim();
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function parseBase64UrlJson(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(unsignedToken: string, secret: string): string {
  return createHmac("sha256", secret).update(unsignedToken).digest("base64url");
}

function assertSessionSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("HELIOS_SESSION_SECRET must be at least 32 bytes.");
  }
}

function normalizeIssuer(value: string): string {
  const issuer = new URL(value);
  if (
    issuer.protocol !== "https:" &&
    !(issuer.protocol === "http:" &&
      (issuer.hostname === "localhost" || issuer.hostname === "127.0.0.1"))
  ) {
    throw new Error("OpsSlate auth issuer must use HTTPS.");
  }
  issuer.hash = "";
  issuer.search = "";
  issuer.pathname = issuer.pathname.replace(/\/+$/, "");
  return issuer.toString().replace(/\/$/, "");
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("OpsSlate auth returned an invalid email.");
  }
  return email;
}

function parseSessionClaims(value: unknown): HeliosSessionClaims {
  if (!isRecord(value)) throw new Error("Invalid Helios session payload.");

  const claims: HeliosSessionClaims = {
    version: value.version as typeof HELIOS_SESSION_VERSION,
    audience: value.audience as typeof HELIOS_SESSION_AUDIENCE,
    sessionIssuer: value.sessionIssuer as typeof HELIOS_SESSION_ISSUER,
    userId: requiredString(value.userId, "userId"),
    companyId: requiredString(value.companyId, "companyId"),
    subject: requiredString(value.subject, "subject"),
    issuer: requiredString(value.issuer, "issuer"),
    email: normalizeEmail(requiredString(value.email, "email")),
    name: requiredString(value.name, "name"),
    role: requiredString(value.role, "role"),
    issuedAt: Number(value.issuedAt),
    expiresAt: Number(value.expiresAt),
    sessionId: requiredString(value.sessionId, "sessionId"),
  };

  if (
    claims.version !== HELIOS_SESSION_VERSION ||
    claims.audience !== HELIOS_SESSION_AUDIENCE ||
    claims.sessionIssuer !== HELIOS_SESSION_ISSUER ||
    !Number.isSafeInteger(claims.issuedAt) ||
    !Number.isSafeInteger(claims.expiresAt)
  ) {
    throw new Error("Invalid Helios session claims.");
  }

  return claims;
}

export function createHeliosSessionToken(
  principal: HeliosPrincipal,
  secret: string,
  options: {
    now?: number;
    maxAgeSeconds?: number;
    sessionId?: string;
  } = {},
): string {
  assertSessionSecret(secret);
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const maxAgeSeconds =
    options.maxAgeSeconds ?? HELIOS_SESSION_MAX_AGE_SECONDS;

  if (
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(maxAgeSeconds) ||
    maxAgeSeconds <= 0 ||
    maxAgeSeconds > HELIOS_SESSION_MAX_AGE_SECONDS
  ) {
    throw new Error("Invalid Helios session lifetime.");
  }

  const claims: HeliosSessionClaims = {
    userId: requiredString(principal.userId, "userId"),
    companyId: requiredString(principal.companyId, "companyId"),
    subject: requiredString(principal.subject, "subject"),
    issuer: normalizeIssuer(principal.issuer),
    email: normalizeEmail(principal.email),
    name: requiredString(principal.name, "name"),
    role: requiredString(principal.role, "role"),
    version: HELIOS_SESSION_VERSION,
    audience: HELIOS_SESSION_AUDIENCE,
    sessionIssuer: HELIOS_SESSION_ISSUER,
    issuedAt: now,
    expiresAt: now + maxAgeSeconds,
    sessionId: options.sessionId ?? randomBytes(24).toString("base64url"),
  };

  const unsignedToken = `${base64UrlJson(SESSION_HEADER)}.${base64UrlJson(claims)}`;
  return `${unsignedToken}.${sign(unsignedToken, secret)}`;
}

export function verifyHeliosSessionToken(
  token: string,
  secret: string,
  options: { now?: number } = {},
): HeliosPrincipal | null {
  try {
    assertSessionSecret(secret);
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return null;

    const unsignedToken = `${parts[0]}.${parts[1]}`;
    const suppliedSignature = Buffer.from(parts[2], "base64url");
    const expectedSignature = Buffer.from(sign(unsignedToken, secret), "base64url");
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const header = parseBase64UrlJson(parts[0]);
    if (
      !isRecord(header) ||
      header.alg !== SESSION_HEADER.alg ||
      header.typ !== SESSION_HEADER.typ ||
      header.version !== SESSION_HEADER.version
    ) {
      return null;
    }

    const claims = parseSessionClaims(parseBase64UrlJson(parts[1]));
    const now = options.now ?? Math.floor(Date.now() / 1000);
    if (
      claims.issuedAt > now + 60 ||
      claims.expiresAt <= now ||
      claims.expiresAt - claims.issuedAt > HELIOS_SESSION_MAX_AGE_SECONDS
    ) {
      return null;
    }

    return {
      userId: claims.userId,
      companyId: claims.companyId,
      subject: claims.subject,
      issuer: claims.issuer,
      email: claims.email,
      name: claims.name,
      role: claims.role,
    };
  } catch {
    return null;
  }
}

export function parseOpsSlateIdentity(
  payload: unknown,
  issuerUrl: string,
): OpsSlateIdentity {
  if (!isRecord(payload)) throw new Error("OpsSlate auth returned invalid JSON.");
  const user = isRecord(payload.user) ? payload.user : payload;

  if (user.emailVerified !== true && payload.emailVerified !== true) {
    throw new Error("OpsSlate auth did not verify the account email.");
  }

  const subject =
    user.subject ?? user.sub ?? user.userId ?? user.id ?? user._id;
  const email = normalizeEmail(requiredString(user.email, "email"));
  const nameValue = user.name ?? user.displayName;

  return {
    subject: requiredString(subject, "subject"),
    issuer: normalizeIssuer(issuerUrl),
    email,
    name:
      typeof nameValue === "string" && nameValue.trim()
        ? nameValue.trim()
        : email,
  };
}

export async function verifyOpsSlateAccessToken(
  token: string,
  options: {
    issuerUrl: string;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
  },
): Promise<OpsSlateIdentity | null> {
  if (!token || token.length > 4096) return null;

  const issuer = normalizeIssuer(options.issuerUrl);
  const response = await (options.fetchImpl ?? fetch)(`${issuer}/api/auth/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    redirect: "error",
    signal: options.signal ?? AbortSignal.timeout(5_000),
  });

  if (!response.ok) return null;

  try {
    return parseOpsSlateIdentity(await response.json(), issuer);
  } catch {
    return null;
  }
}
