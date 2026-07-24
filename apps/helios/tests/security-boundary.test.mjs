import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const session = readFileSync(
  join(root, "src/lib/helios-session.ts"),
  "utf8",
);
const proxy = readFileSync(join(root, "src/proxy.ts"), "utf8");
const shell = readFileSync(
  join(root, "src/components/helios-shell.tsx"),
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

test("Helios authentication is independent and Clerk-verified", () => {
  assert.match(proxy, /clerkMiddleware/);
  assert.match(session, /auth,\s*currentUser/);
  assert.match(session, /session\.isAuthenticated/);
  assert.match(session, /verification\?\.status !== "verified"/);
  assert.doesNotMatch(session, /opsslate/i);
});

test("logout terminates the independent identity-provider session", () => {
  assert.match(shell, /useClerk/);
  assert.match(shell, /signOut\(\{ redirectUrl: "\/sign-in" \}\)/);
  assert.doesNotMatch(shell, /api\/auth\/session/);
});

test("tenant identity is provisioned and derived on the server", () => {
  assert.match(identity, /companyId:\s*user\.companyId/);
  assert.doesNotMatch(
    identity,
    /args:\s*\{[\s\S]*companyId:\s*v\./,
    "the identity resolver must not accept a client or provider company ID",
  );
  assert.match(identity, /membership\.status === "active"/);
  assert.match(identity, /memberships\.length > 0 && !teamMember/);
  assert.match(identity, /HELIOS_ALLOWED_ROLES/);
  assert.match(identity, /ctx\.db\.insert\("companies"/);
  assert.match(identity, /ctx\.db\.insert\("users"/);
  assert.match(identity, /ctx\.db\.insert\("teamMembers"/);
});

test("Convex identity resolution is internal and gateway-protected", () => {
  assert.match(identity, /internalMutation/);
  assert.doesNotMatch(identity, /export const \w+ = mutation\(/);
  assert.match(gateway, /HELIOS_IDENTITY_GATEWAY_SECRET/);
  assert.match(gateway, /constantTimeEqual/);
  assert.doesNotMatch(gateway, /Access-Control-Allow-Origin/i);
});
