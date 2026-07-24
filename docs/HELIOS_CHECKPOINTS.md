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
| Foundation item 3C.1–3C.3: bid-package intake, durable project intelligence, and cited PDF review | 2026-07-24 | Preview ready at `f3166a2`; tagged `helios-foundation-3c.3`; approval pending | Authenticated human review of citation-to-page navigation on the preview |

| Foundation item 3D: human finding review and correction lifecycle | 2026-07-24 | Preview ready at `9e2d731`; tagged `helios-foundation-3d`; approval pending | Authenticated human visual review of the review queue and dialogs on the preview |

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

### Foundation item 3C.3 preview evidence

- [Stable Vercel preview](https://helios-foundation-item-2-preview-oppslate-oppslate.vercel.app)
- Unique Vercel preview:
  `https://helios-foundation-item-2-preview-pzqpudigj-oppslate.vercel.app`
- Vercel deployment: `dpl_GRTYXxdz4dyxQevptEvvo1X8T6gi`
- Vercel target / status: Preview / Ready
- Application checkpoint: `f3166a2`
- Annotated Git tag: `helios-foundation-3c.3`
- Automated Helios boundary tests: 24 passed
- Lint, TypeScript, shared UI boundary, local production build, and remote
  production build: Passed
- Live protected-PDF range request: `206`, `application/pdf`, `%PDF-`,
  private/no-store
- Live wrong-company document request: `404`
- Unauthenticated preview PDF request: `401`
- Desktop, tablet, and mobile horizontal overflow: None
- Preview sign-in, styles, and application title: Passed
- Preview runtime error scan: Clean
- Authenticated human citation-to-page visual review: Pending
- Production promotion and custom domain changes: Not performed

### Foundation item 3D preview evidence

- [Foundation review handoff](./HELIOS_FOUNDATION_3D_REVIEW.md)
- [Stable Vercel preview](https://helios-foundation-item-2-preview-oppslate-oppslate.vercel.app)
- Unique Vercel preview:
  `https://helios-foundation-item-2-preview-irs7iao31-oppslate.vercel.app`
- Vercel deployment: `dpl_HtMH4VSQxEj95GZVTvUxjsJBxWEa`
- Vercel target / status: Preview / Ready
- Application checkpoint: `9e2d731`
- Annotated Git tag: `helios-foundation-3d`
- Automated Helios boundary tests: 28 passed
- Lint, TypeScript, shared UI boundary, local production build, and remote
  production build: Passed
- Live review persistence: approved status and reviewer history returned
- Live wrong-company review: `400`; no event was written
- Live review-triggered reanalysis: new current generation created; preceding
  generation and two review events retained
- Preview same-origin unauthenticated review request: `401`
- Preview cross-origin review request: `403`
- Desktop, tablet, and mobile horizontal overflow: None
- WCAG A/AA automated scan: 0 violations
- Browser page errors and Vercel runtime error logs: None
- Authenticated human review of the queue, correction dialog, and source
  transition: Pending
- Production promotion and custom domain changes: Not performed

### Foundation item 3A-R standalone preview evidence

- [Stable Vercel preview](https://helios-foundation-item-2-preview-oppslate-oppslate.vercel.app)
- Vercel deployment: `dpl_B59pHereJ4CFPYqbo3swDryMe2Nu`
- Vercel target: Preview
- Vercel status: Ready
- Deployed source checkpoint: `93b7be2`
- Independent Clerk development instance: Available
- Isolated Convex deployment: `kindly-tiger-289`
- OpsSlate authentication dependency and preview environment variables: Removed
- Helios-to-Convex gateway credential rotated after the first authenticated
  request exposed a stale credential; direct isolated identity provisioning
  returned `200` before the corrected preview was deployed
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
