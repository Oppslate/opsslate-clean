# Helios Foundation Item 3A — Security and Tenancy Boundary

Status: implementation checkpoint in progress

## Scope

Foundation 3A establishes the authentication and company-authorization
boundary required before Helios stores projects, bid documents, or AI
intelligence.

This checkpoint does not add cockpit, project, upload, document-processing,
OpenAI, estimating, RFQ, proposal, or handoff features.

## Security invariants

1. Helios never accepts a browser-supplied `companyId` as authorization.
2. A trusted OpsSlate identity issuer must verify the upstream access token.
3. The upstream identity must include a stable subject and verified email.
4. The verified email must match an existing OpsSlate user. Helios does not
   auto-provision users or companies.
5. The identity subject is linked to that OpsSlate user once. A different
   issuer or subject cannot subsequently claim the account.
6. Company membership is derived from the stored OpsSlate user record.
7. Disabled or invited team memberships cannot enter Helios.
8. Helios initially authorizes only owner, admin, and estimator roles.
9. Browser sessions are signed, HTTP-only, host-only, SameSite=Lax, and expire
   after one hour.
10. Session creation and deletion require a same-origin request.
11. Convex identity resolution is internal. The only external gateway is a
    server-to-server HTTP action protected by an independent service secret.
12. Helios secrets remain server-only and never use a `NEXT_PUBLIC_` name.
13. Future Helios data functions must be internal functions reached through a
    server-side boundary, or must independently authenticate and derive the
    same principal. Public functions may not trust record or company IDs alone.

## Identity flow

```text
Browser with existing OpsSlate cookie
  → Helios same-origin session exchange
  → OpsSlate /api/auth/me token verification
  → Convex server-to-server identity gateway
  → Internal existing-user and active-membership resolution
  → Signed host-only Helios session
  → Server-rendered authenticated application boundary
```

The browser never sends an identity payload, user ID, role, or company ID
during this exchange.

## Trust boundaries

### Browser

The browser holds only the HTTP-only Helios session cookie after exchange. Its
contents are signed. Editing its company, role, subject, or expiration
invalidates the signature.

### OpsSlate identity issuer

`OPSSLATE_AUTH_URL` is the only issuer Helios trusts. The issuer must return:

- a stable `subject`, `sub`, `userId`, `id`, or `_id`
- `email`
- `emailVerified: true`
- optional display `name`

The subject is scoped to the configured issuer. Helios does not accept a
company claim from this response as authorization.

### Helios server

The Helios server verifies the upstream token, calls the identity gateway, and
issues the local session. Secrets are read lazily at request time so builds
remain safe when runtime secrets are unavailable.

### Convex

The HTTP identity gateway accepts only a bearer service secret. It calls an
internal mutation that resolves the stored user and company. It returns a
minimal principal and never returns password hashes, session tokens, reset
tokens, billing data, or company-private records.

## Required environment configuration

Configure Helios/Vercel:

- `OPSSLATE_AUTH_URL`
- `HELIOS_SESSION_SECRET`
- `HELIOS_CONVEX_SITE_URL`
- `HELIOS_IDENTITY_GATEWAY_SECRET`

Configure the matching Convex deployment:

- `HELIOS_IDENTITY_GATEWAY_SECRET`

The session secret and gateway secret must be different, randomly generated,
and at least 32 characters. Preview and production must use different values.

## Deployment order

1. Configure the Convex gateway secret.
2. Deploy the schema, internal identity resolver, and HTTP gateway.
3. Confirm the OpsSlate identity issuer returns a stable subject and verified
   email.
4. Configure the four Helios runtime variables.
5. Deploy Helios.
6. Test with an active member, disabled member, unknown email, changed subject,
   expired session, modified session, and missing configuration.

Helios intentionally fails closed until every dependency is configured.

A plain `vercel.app` preview does not receive cookies scoped to
`.opsslate.app`. Preview integration must therefore use either an approved
OpsSlate preview subdomain or a proper identity-provider authorization redirect
with a validated callback. Access tokens must not be added to URLs, query
parameters, browser storage, or client-submitted session bodies as a shortcut.

## Acceptance gates

Foundation 3A passes only when all of the following are demonstrated:

- An active existing OpsSlate user can exchange a verified identity for a
  Helios session.
- An unknown email cannot create an account or enter Helios.
- An invited or disabled team member cannot enter.
- A field, PM, or other unapproved role cannot enter.
- A linked account rejects a different identity subject.
- Changing `companyId`, role, expiry, or signature in the cookie invalidates
  the session.
- Expired sessions are rejected.
- Cross-origin session creation and logout are rejected.
- Calling the identity gateway without the correct service secret is rejected.
- No browser request supplies an authoritative company ID.
- Preview and production have isolated secrets.
- Cockpit and feature routes remain unimplemented.

## Known legacy boundary

OpsSlate's existing client authentication and older Convex feature functions
remain outside this narrowly scoped checkpoint. They must not be reused by
Helios data features unless they are migrated to the authenticated principal
and tenant-authorization contract above.

## Dependency audit status

Foundation 3A moved both web applications to the current stable Next.js
16.2.11 security line and Convex 1.42.3. Image optimization is disabled because
neither application currently uses `next/image`.

As of this checkpoint, `npm audit --omit=dev` still reports advisories against
the PostCSS and Sharp versions bundled by the current Next.js release. The
automated forced remediation incorrectly proposes downgrading to Next.js
9.3.3, so it must not be applied. The remaining findings require an upstream
Next.js release or a separately validated dependency override. They must be
rechecked before any production promotion.
