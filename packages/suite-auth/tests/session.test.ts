import assert from "node:assert/strict";
import test from "node:test";

import {
  createHeliosSessionToken,
  parseOpsSlateIdentity,
  verifyHeliosSessionToken,
} from "../src/server.ts";

const secret = "test-secret-that-is-longer-than-thirty-two-bytes";
const principal = {
  userId: "user_123",
  companyId: "company_456",
  subject: "identity_789",
  issuer: "https://auth.opsslate.app",
  email: "estimator@example.com",
  name: "Estimator",
  role: "admin",
};

test("creates and verifies a bounded Helios session", () => {
  const token = createHeliosSessionToken(principal, secret, {
    now: 1_000,
    maxAgeSeconds: 300,
    sessionId: "session_123",
  });

  assert.deepEqual(
    verifyHeliosSessionToken(token, secret, { now: 1_100 }),
    principal,
  );
});

test("rejects tampered, expired, and wrong-secret sessions", () => {
  const token = createHeliosSessionToken(principal, secret, {
    now: 1_000,
    maxAgeSeconds: 300,
    sessionId: "session_123",
  });
  const [header, payload, signature] = token.split(".");

  assert.equal(
    verifyHeliosSessionToken(`${header}.${payload}x.${signature}`, secret, {
      now: 1_100,
    }),
    null,
  );
  assert.equal(verifyHeliosSessionToken(token, secret, { now: 1_301 }), null);
  assert.equal(
    verifyHeliosSessionToken(
      token,
      "different-secret-that-is-also-long-enough-to-pass",
      { now: 1_100 },
    ),
    null,
  );
});

test("requires a strong signing secret and caps session lifetime", () => {
  assert.throws(() => createHeliosSessionToken(principal, "too-short"));
  assert.throws(() =>
    createHeliosSessionToken(principal, secret, {
      maxAgeSeconds: 8 * 60 * 60 + 1,
    }),
  );
});

test("accepts only verified identities with stable subjects", () => {
  assert.deepEqual(
    parseOpsSlateIdentity(
      {
        user: {
          id: "identity_789",
          email: "Estimator@Example.com",
          emailVerified: true,
          name: "Estimator",
        },
      },
      "https://auth.opsslate.app/",
    ),
    {
      subject: "identity_789",
      issuer: "https://auth.opsslate.app",
      email: "estimator@example.com",
      name: "Estimator",
    },
  );

  assert.throws(() =>
    parseOpsSlateIdentity(
      { user: { id: "identity_789", email: "estimator@example.com" } },
      "https://auth.opsslate.app",
    ),
  );
  assert.throws(() =>
    parseOpsSlateIdentity(
      {
        user: {
          email: "estimator@example.com",
          emailVerified: true,
        },
      },
      "https://auth.opsslate.app",
    ),
  );
});
