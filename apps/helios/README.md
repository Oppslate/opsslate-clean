# Helios

Helios is an independent, responsive construction-intelligence application for
heavy highway estimators. It uses the shared OpsSlate visual system, but it does
not require an OpsSlate account, session, deployment, or runtime service.

## Independent runtime boundary

- Clerk owns Helios authentication, verified email, session security, and
  logout.
- The isolated Helios Convex deployment owns companies, memberships, projects,
  documents, evidence, and intelligence.
- A newly verified Helios user is provisioned into a new company as its owner.
- Every data operation reauthorizes the stored user, active membership, role,
  and company ownership on the server.
- The browser never supplies an authoritative company identifier.
- OpenAI credentials and document processing remain server-only in Convex.

OpsSlate is not called during sign-in or normal application operation. A future
handoff integration may send approved projects to OpsSlate, but that integration
is outside the current foundation.

## Local development

From the repository root:

```powershell
npm run dev:helios
```

Helios defaults to `http://localhost:3001` when the standard OpsSlate
development server occupies port 3000.

Copy `.env.example` to `.env.local` inside `apps/helios` and configure:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Clerk sign-in, sign-up, and fallback route variables
- `HELIOS_CONVEX_SITE_URL`
- `HELIOS_IDENTITY_GATEWAY_SECRET`

The same gateway secret must be configured in the isolated Helios Convex
deployment. `OPENAI_API_KEY` remains configured only in Convex.

Never commit local environment files or credentials.
