# Helios application boundary

This Next.js application is the responsive Helios boundary in the OpsSlate
product family.

Foundation item 3A retains the Foundation item 2 visual boundary and adds:

- shared OpsSlate tokens
- the shared suite toolbar
- the shared shell and responsive navigation contract
- a versioned shared component dependency
- verified OpsSlate identity exchange
- a signed, HTTP-only, one-hour Helios session
- server-derived OpsSlate user and company membership
- one-time linking between a verified external identity and an existing
  OpsSlate account
- a server-to-server Convex identity gateway

It does not include cockpit, estimating, document intelligence, RFQ, bid
review, OpenAI, project persistence, or project mutation features.

Run locally with:

```bash
npm run dev:helios
```

## Required Foundation 3A environment variables

- `OPSSLATE_AUTH_URL`: trusted OpsSlate identity issuer base URL
- `HELIOS_SESSION_SECRET`: Helios-only session signing secret, at least 32
  characters
- `HELIOS_CONVEX_SITE_URL`: the matching Convex HTTP Actions URL ending in
  `.convex.site`
- `HELIOS_IDENTITY_GATEWAY_SECRET`: an independent service secret, at least 32
  characters, configured identically in Helios and the Convex deployment

The trusted OpsSlate `/api/auth/me` response must contain a stable user
identifier, an email address, and `emailVerified: true`. Helios fails closed
when any of those claims are absent. It never automatically creates a company
or user.

The `NEXT_PUBLIC_*` variables remain optional navigation overrides. Secrets
must never use the `NEXT_PUBLIC_` prefix.

See `docs/HELIOS_FOUNDATION_3A_SECURITY.md` for the security contract,
deployment sequence, and acceptance gates.
