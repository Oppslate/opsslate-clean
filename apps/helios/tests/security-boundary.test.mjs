import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const route = readFileSync(
  join(root, "src/app/api/auth/session/route.ts"),
  "utf8",
);
const identity = readFileSync(
  join(root, "../web/convex/heliosIdentity.ts"),
  "utf8",
);
const gateway = readFileSync(
  join(root, "../web/convex/heliosGateway.ts"),
  "utf8",
);

test("Helios session cookie is server-only and bounded", () => {
  assert.match(route, /httpOnly:\s*true/);
  assert.match(route, /sameSite:\s*"lax"/);
  assert.match(route, /HELIOS_SESSION_MAX_AGE_SECONDS/);
  assert.doesNotMatch(route, /domain:/);
});

test("session mutations enforce same-origin requests", () => {
  assert.match(route, /if \(!sameOrigin\(request\)\)/);
  assert.match(route, /sec-fetch-site/);
});

test("tenant identity is derived from the stored OpsSlate user", () => {
  assert.match(identity, /companyId:\s*user\.companyId/);
  assert.doesNotMatch(
    identity,
    /args:\s*\{[\s\S]*companyId:\s*v\./,
    "the identity resolver must not accept a client or provider company ID",
  );
  assert.match(identity, /membership\.status === "active"/);
  assert.match(identity, /memberships\.length > 0 && !teamMember/);
  assert.match(identity, /HELIOS_ALLOWED_ROLES/);
});

test("Convex identity resolution is internal and gateway-protected", () => {
  assert.match(identity, /internalMutation/);
  assert.doesNotMatch(identity, /export const \w+ = mutation\(/);
  assert.match(gateway, /HELIOS_IDENTITY_GATEWAY_SECRET/);
  assert.match(gateway, /constantTimeEqual/);
  assert.doesNotMatch(gateway, /Access-Control-Allow-Origin/i);
});
