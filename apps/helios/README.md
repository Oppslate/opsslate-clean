# Helios application boundary

This Next.js application is the responsive Helios boundary in the OpsSlate
product family.

Foundation item 2 intentionally includes only:

- shared OpsSlate tokens
- the shared suite toolbar
- the shared shell and responsive navigation contract
- a versioned shared component dependency
- a non-product verification surface

It does not include cockpit, estimating, document intelligence, RFQ, bid
review, OpenAI, authentication, persistence, or OpsSlate mutation features.

Run locally with:

```bash
npm run dev:helios
```

## Environment variables

Foundation item 2 has no required environment variables, secrets, data
connections, or backend services.

The variables documented in `.env.example` are optional public URL overrides
for navigation between OpsSlate applications. When an override is omitted,
the shared suite configuration supplies its approved default destination.
