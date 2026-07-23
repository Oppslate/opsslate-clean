import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const MAX_IDENTITY_BODY_BYTES = 8 * 1024;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
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

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
}

function isIdentityBody(
  value: unknown,
): value is {
  issuer: string;
  subject: string;
  email: string;
  name: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.issuer === "string" &&
    typeof body.subject === "string" &&
    typeof body.email === "string" &&
    typeof body.name === "string" &&
    body.issuer.length <= 512 &&
    body.subject.length <= 512 &&
    body.email.length <= 320 &&
    body.name.length <= 256
  );
}

export const resolveIdentity = httpAction(async (ctx, request) => {
  let expectedSecret: string;
  try {
    expectedSecret = gatewaySecret();
  } catch {
    return json({ error: "Identity gateway is not configured." }, 503);
  }

  if (!constantTimeEqual(bearerToken(request), expectedSecret)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_IDENTITY_BODY_BYTES
  ) {
    return json({ error: "Request body is too large." }, 413);
  }

  const body = await request.json().catch(() => null);
  if (!isIdentityBody(body)) {
    return json({ error: "Invalid identity payload." }, 400);
  }

  try {
    const principal = await ctx.runMutation(
      (internal as any).heliosIdentity.resolveExistingUser,
      body,
    );
    return json({ principal }, 200);
  } catch {
    return json({ error: "Identity could not be authorized." }, 403);
  }
});
