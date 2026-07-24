# Helios checkpoint ledger

This ledger records approved Helios milestones and their exact Git restore
points.

## Checkpoint rules

- Create a dedicated commit for each approved milestone.
- Create an annotated Git tag on the exact milestone commit.
- Record verification evidence and any preview deployment.
- Keep cockpit and feature work out of foundation checkpoints unless expressly
  approved.
- Do not move or reuse an existing checkpoint tag.

## Milestones

| Milestone | Date | Status | Commit | Git tag | Verification |
| --- | --- | --- | --- | --- | --- |
| Foundation item 2: shared OpsSlate UI and responsive Helios application boundary | 2026-07-23 | Approved and verified | `89c51ef` | `helios-foundation-item-2` | Local and Vercel production builds passed; shared-ownership drift check passed; desktop, tablet, mobile, drawer, focus, assets, and styles verified |
| Foundation item 3A: identity, session, and company authorization boundary | 2026-07-23 | Implemented and locally verified; live integration pending | `cac34c6` | Not tagged | Domain/security tests, lint, type checks, and builds passed; live issuer/tenant tests pending |
| Foundation item 3A-R: standalone Helios identity and tenant security | 2026-07-24 | Preview ready; first human sign-up pending | `93b7be2` | Not tagged | Independent Clerk resource and isolated Convex tenant provisioning deployed; production build, lint, 12 security tests, UI-boundary check, unauthenticated API, same-origin, headers, desktop, tablet, and mobile checks passed |

## Milestones in progress

| Milestone | Date started | Status | Pending before checkpoint |
| --- | --- | --- | --- |
| Foundation item 3B: working cockpit and secure PDF intake | 2026-07-23 | Implemented and locally verified at `fb54209`; live integration review pending | Run isolated cross-tenant, upload, responsive, accessibility, and visual acceptance tests before approval or deployment |
| Foundation item 3C: AI document and project intelligence | 2026-07-24 | Implemented at `e14d773`; isolated Convex schema/functions, production builds, automated checks, and live GPT-5.6 Sol PDF/evidence validation passed | Verify a signed-session real-document workflow and responsive accessibility before approval or deployment |

### Foundation item 2 evidence

- [Foundation handoff](./HELIOS_FOUNDATION_ITEM_2.md)
- [Vercel preview](https://helios-foundation-item-2-preview-eibbhk6p2-oppslate.vercel.app)
- Vercel target: Preview
- Vercel status: Ready
- Cockpit work: Not started

### Foundation item 3C preview evidence

- [Vercel preview](https://helios-foundation-item-2-preview-mo0pwde7f-oppslate.vercel.app)
- Vercel deployment: `dpl_G97gtsgzrsrFpthz5S6UW6J4HTCv`
- Vercel target: Preview
- Vercel status: Ready
- Deployed source checkpoint: `2292f24`
- Remote and local production builds: Passed
- Unauthenticated desktop, tablet, and mobile layout: Passed
- Keyboard focus, responsive overflow, font/style assets, security headers, and
  missing-session error state: Passed
- Browser console and page errors: None
- Authenticated cockpit and navigation drawer: Not testable on the separate
  `vercel.app` origin because the OpsSlate shared session cookie is intentionally
  not available cross-origin. No authentication bypass was added.
- Production promotion and custom domain changes: Not performed

### Foundation item 3A-R standalone preview evidence

- [Vercel preview](https://helios-foundation-item-2-preview-nt8arqo81-oppslate.vercel.app)
- Vercel deployment: `dpl_F3PUQjgfEfKZGcYdBV1doF1ufygo`
- Vercel target: Preview
- Vercel status: Ready
- Deployed source checkpoint: `93b7be2`
- Independent Clerk development instance: Available
- Isolated Convex deployment: `kindly-tiger-289`
- OpsSlate authentication dependency and preview environment variables: Removed
- Remote and local production builds: Passed
- Helios security tests: 12 passed
- Shared UI boundary, lint, and browser console errors: Passed / none
- Unauthenticated projects API: `401`
- Cross-origin project mutation: `403`
- Desktop, tablet, and mobile horizontal overflow: None
- Human sign-up, authenticated cockpit, logout, and two-user cross-company
  verification: Pending the first interactive Cloudflare verification; no
  challenge bypass was added
- Production promotion and OpsSlate production changes: Not performed
