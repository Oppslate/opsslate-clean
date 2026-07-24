# Helios Foundation 3A-R — Standalone Identity and Tenant Security

**Status:** Implemented locally; managed identity provisioning and live preview
verification pending

**Decision:** Helios is a standalone responsive web application. It does not
use OpsSlate authentication, shared cookies, user records, or runtime services.

## Runtime boundary

Helios independently owns:

- authentication and verified user accounts through its dedicated Clerk
  instance;
- host-scoped Clerk sessions and logout;
- companies, memberships, roles, projects, documents, evidence, and
  intelligence in its isolated Convex deployment;
- server-only OpenAI and Convex gateway credentials;
- local, preview, and future production deployments.

Helios continues to consume the versioned `@opsslate/suite-ui` package as its
visual authority. That package is a build dependency only. Helios does not load
OpsSlate to render or operate.

## Authentication flow

```text
Helios sign-in or sign-up
  → Clerk verifies the user and email
  → Clerk issues its host-scoped session
  → Helios validates the active session server-side
  → Helios sends the verified provider subject to its protected Convex gateway
  → Convex resolves or provisions the Helios user and company
  → Convex returns the stored user, company, membership, and role
  → Every data request reauthorizes that stored tenant boundary
```

The browser never supplies an authoritative `companyId`, role, user record, or
gateway credential.

## First-account provisioning

During the private preview, a newly verified Clerk user receives:

- one Helios company;
- one Helios user linked to the verified Clerk subject;
- one active company membership;
- the `owner` role.

Each newly registered user therefore begins in a separate company. Company
sharing and invitations remain a later, explicit feature. Matching an existing
email never overwrites an identity link, and an identity conflict is rejected.

## Authorization

Every project, upload, document, evidence, retry, and intelligence operation
must:

1. receive a server-derived Helios principal;
2. normalize the stored Helios user and company identifiers;
3. confirm that the user belongs to that company;
4. confirm the identity-provider issuer and subject still match;
5. confirm an active membership when memberships exist;
6. allow only owner, admin, or estimator roles;
7. confirm that the requested project and document belong to the same company.

Cross-company objects return generic not-found or authorization errors. No
company selector, URL parameter, request body, or browser storage value can
change the authoritative company.

## Session and logout rules

- Clerk owns credential handling, email verification, session rotation, and
  session cookies.
- Helios does not store passwords or issue a parallel application session.
- Helios does not read or write `.opsslate.app` cookies.
- Sign-out terminates the Clerk session and returns to `/sign-in`.
- Project mutations retain same-origin checks in addition to authentication.

## Required configuration

Vercel preview:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- `HELIOS_CONVEX_SITE_URL`
- `HELIOS_IDENTITY_GATEWAY_SECRET`

Isolated Convex deployment:

- `HELIOS_IDENTITY_GATEWAY_SECRET`
- `OPENAI_API_KEY`
- optional `HELIOS_OPENAI_MODEL`

No OpsSlate authentication URL, shared session secret, or OpsSlate browser
cookie is permitted in the Helios runtime contract.

## Acceptance criteria

A reviewer must fail the standalone identity foundation if any condition below
is not met.

- A user can create and verify a Helios account without visiting OpsSlate.
- A user can sign in, refresh, navigate, and sign out without OpsSlate running.
- The sign-in and sign-up screens use the shared semantic tokens and remain
  responsive on desktop, tablet, and mobile.
- Unauthenticated API requests return `401`.
- Cross-origin project mutations return `403`.
- Verified identity, company, role, and membership are derived server-side.
- Two independently registered users receive different Helios companies.
- User A cannot list, open, upload to, retry, or infer User B's objects.
- Logout invalidates the active Helios identity-provider session.
- No OpsSlate session cookie, identity endpoint, or authentication package is
  referenced by the Helios application.
- OpenAI and gateway secrets remain server-only.
- The Helios production build, shared UI boundary check, lint, and automated
  security tests pass.

## Deferred work

- invitations and company membership administration;
- MFA policy enforcement beyond the provider's preview defaults;
- enterprise SSO;
- optional OpsSlate account linking;
- an approved project-handoff API.

These items must not be implemented by reintroducing shared OpsSlate sessions.
