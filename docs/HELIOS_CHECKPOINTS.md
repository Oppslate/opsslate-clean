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
| Foundation item 3D.1: option-3 cockpit alignment | 2026-07-24 | Approved; locally verified at `a88c050`; tagged `helios-foundation-3d.1` | Create and verify a preview-only Vercel deployment; do not promote to production |
| Foundation item 3D.1.1: above-fold decision dock | 2026-07-24 | Preview ready at `576a728`; tagged `helios-foundation-3d.1.1`; visual confirmation pending | Confirm the raised cockpit and decision-button visibility on the preview |
| Foundation item 4 architecture: Bid Scout handoff, plan intelligence, deterministic takeoff, and bid digital twin | 2026-07-27 | Architecture approved at `2edd38b`; tagged `helios-foundation-4-architecture`; superseded by R1 before implementation | Preserve as the original architecture restore point; use R1 for implementation |
| Foundation item 4 architecture R1: variable bid-basis profiles | 2026-07-27 | Architecture revised at `1eba29b`; tagged `helios-foundation-4-architecture-r1`; superseded by R2 before implementation | Preserve the variable bid-basis decision; use R2 for implementation |
| Foundation item 4 architecture R2: manual-first canonical intake with future Bid Scout adapter | 2026-07-27 | Architecture revised at `667f3a7`; tagged `helios-foundation-4-architecture-r2`; implementation complete through Foundation 4C | Build Foundation 4D governed quantity intelligence; keep live Bid Scout disabled while contract fixtures prove future adapter compatibility |

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

### Foundation item 3D.1 cockpit alignment evidence

- [Foundation alignment handoff](./HELIOS_FOUNDATION_3D_1_COCKPIT_ALIGNMENT.md)
- [Design QA report](../design-qa.md)
- Application checkpoint: `a88c050`
- Annotated Git tag: `helios-foundation-3d.1`
- Automated Helios boundary tests: 30 passed
- Lint, TypeScript, shared UI boundary, and local production build: Passed
- Authenticated protected PDF and decision controls: Passed
- Finding selection, search, correction dialog, and focus restoration: Passed
- Mobile navigation drawer, scroll lock, close, and focus restoration: Passed
- Desktop, tablet, and mobile horizontal overflow: None
- Clean authenticated browser page errors: None
- Side-by-side comparison with approved option 3:
  `evidence/helios-3d1-comparison.png`
- Authenticated human visual review: Approved on 2026-07-24
- [Unique Vercel preview](https://helios-foundation-item-2-preview-21eoszbyz-oppslate.vercel.app)
- [Stable Vercel preview](https://helios-foundation-item-2-preview-oppslate-oppslate.vercel.app)
- Vercel deployment: `dpl_9pBtTMznyf3CnWGnbBakRbRtWKRv`
- Vercel target / status: Preview / Ready
- Deployed source commit: `5966889`
- Preview sign-in, authenticated cockpit, protected PDF, and logout: Passed
- Deployed tablet and mobile layouts: Passed; no horizontal overflow
- Deployed navigation drawer scroll lock, close, and focus restoration: Passed
- Deployed browser page errors: None
- Production promotion and domain changes: Not performed

### Foundation item 3D.1.1 above-fold evidence

- Application checkpoint: `576a728`
- Annotated Git tag: `helios-foundation-3d.1.1`
- [Before/after comparison](./evidence/helios-3d1-card-top-comparison.png)
- Edge-equivalent `1908 × 915` viewport: all five decision actions visible
  without scrolling
- Account controls: Visible with no collision
- Tablet and mobile horizontal overflow: None
- Automated Helios tests: 30 passed
- Helios lint, Helios TypeScript, shared UI TypeScript, shared ownership
  boundary, and local production build: Passed
- [Unique Vercel preview](https://helios-foundation-item-2-preview-lxfgikry1-oppslate.vercel.app)
- [Stable Vercel preview](https://helios-foundation-item-2-preview-oppslate-oppslate.vercel.app)
- Vercel deployment: `dpl_9jkV2vQA7Mn9iVyMz5yvXVyhxJmc`
- Vercel target / status: Preview / Ready
- Deployed source commit: `f74deb4`
- Authenticated Edge-equivalent preview: all five decision buttons visible
  without scrolling; protected PDF loaded
- Deployed tablet and mobile layouts: Passed; no horizontal overflow
- Browser page and Vercel runtime errors: None
- Production promotion and domain changes: Not performed

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

### Foundation item 3E.0 estimate-intelligence foundation

- [Approved architecture and extraction contract](./HELIOS_FOUNDATION_3E_ESTIMATE_INTELLIGENCE_SPEC.md)
- Application checkpoint: `2080dd7`
- Versioned estimate, section, owner pay item, operational cost code, resource,
  allocation, risk, job, and append-only decision-event records: Added
- Owner bid quantity and production quantity: Stored separately
- Labor, equipment, material, subcontract, trucking, disposal, and other
  resource classes: Added
- Independent overhead, profit, and bond calculations: Added and verified with
  integer-cent golden tests
- AI proposal contract: strict structured output, evidence required at every
  scope level, unknown quantities remain unknown, and AI-generated prices are
  rejected
- Estimate generation: durable background job with server-only OpenAI response
  identifiers and best-effort response cleanup
- Authentication and isolation: Clerk session, same-origin mutation, signed
  gateway request, role authorization, and company/project ownership enforced
- Estimate Builder: active sidebar destination, project chooser, synchronized
  Build and Bid Schedule views, operational cost-code/resource drilldown,
  evidence display, takeoff gaps, and separate risk register
- Golden culvert domain fixture: Passed with NYSDOT owner item `619.0501` and
  `ENG`, `EW`, `FILL`, `PAVE`, `MAINT`, and `REM` child cost codes
- Live Seneca vertical slice: version 1 reached Ready For Review with 2 owner
  pay items, 2 operational sections, 26 base-bid cost codes, and 19 risks
- Live pricing guardrail: every generated resource and total remained Unpriced
- Automated domain tests: 11 passed
- Automated Helios security and UI boundary tests: 34 passed
- Helios lint, targeted new Convex lint, shared UI boundary, TypeScript, and
  Helios production build: Passed
- Authenticated desktop, tablet, and mobile browser verification: Passed; no
  global horizontal overflow and no errors in a clean browser session
- Isolated Convex development schema/functions: Deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed

### Foundation item 3E.1 owner pay-item register and import review

- Application checkpoint: `262e6f9`
- Official owner-item contract: sequence, item number, official and estimator
  descriptions, quantity, unit, item type, fixed amount, evidence, confidence,
  and review state added and validated
- Import comparison: new, unchanged, changed, conflicting, and missing owner
  records are staged deterministically against the prior accepted version
- Estimator decisions: accept, correct, reject, defer, merge, split, and map
  implemented as real tenant-authorized mutations
- Decision history: append-only reviewer, timestamp, reason, target, original
  value, and decided value retained for every action
- Bid-day speed: Accept and Defer are one-click row actions; Accept Remaining
  Unchanged is one click and writes a separate audit event for every record
- Import acceptance: deterministic checks block unresolved proposals, deferred
  records, duplicate owner items, duplicate official sequence, missing fixed
  amounts, and an empty retained schedule
- Version safety: accepted owner-item registers are immutable; later analysis
  creates a new reviewable estimate version
- Build View and Bid Schedule View: verified to use the same owner-item records;
  Bid Schedule preserves global official sequence independently of operational
  section order
- Legacy version compatibility: pre-3E.1 items receive deterministic sequence,
  item-type, change-type, review-summary, and history fallbacks
- Live Seneca validation: one-click Defer and Accept persisted with separate
  audit events; the review dialog exposed all official fields; import remained
  unlocked with the other records still proposed
- Accessibility: modal keyboard focus returns to the originating Review button
- Desktop, `820 px` tablet, and `390 px` mobile: Passed; no global horizontal
  overflow and the mobile review dialog remained within the viewport
- Automated domain tests: 14 passed
- Automated Helios security and UI boundary tests: 39 passed
- Helios lint, targeted Convex lint/type generation, and Helios production
  build: Passed
- Isolated Convex development schema/functions: Deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed

- Next approved milestone: Foundation 3E.2 internal cost-code and resource
  build-up

### Foundation item 3E.2 internal cost-code and resource build-up

- Application checkpoint: `13615c9`
- Estimate schema version: advanced to version 2 while retaining optional-field
  compatibility for the existing version 1 Seneca estimate
- Operational build-up: estimators can add and edit child cost codes beneath an
  accepted or corrected owner pay item
- Scope ownership: self-perform, subcontract, supplier, allowance, owner
  responsibility, and undecided are explicit choices
- Resource classes: labor, equipment, material, subcontract, trucking,
  disposal, and other are implemented in one common resource contract
- Resource basis: quantity, unit, waste, duration, tax status, crew/assembly,
  source rate, escalation, and effective rate are retained independently
- Price provenance: human-entered, vendor quote, cost database, approved
  historical, and approved crew/assembly sources require labels and effective
  dates; non-human sources also require a stable source reference
- AI pricing guardrail: proposed AI resources remain explicitly Unpriced; no
  price is inferred from confidence or scope text
- Controlled overrides: source rate and override rate remain separate; every
  override requires a reason and stores the reviewer and timestamp
- Calculation chain: resource direct cost includes waste and escalation, cost
  code direct cost rolls up complete active resources, and owner unit cost is
  derived from direct cost divided by official bid quantity
- Pricing state: Unpriced, Partial, and Priced are derived independently from
  scope acceptance so accepted scope cannot masquerade as complete pricing
- Bid-day speed: proposed cost codes and resources support one-click Accept;
  edits use one focused worksheet; rejections require a concise reason
- Primary table density: resource badges were removed from the owner-item table;
  each cost code now shows resource count, pricing state, direct cost, and one
  Open Worksheet action
- Security: same-origin session validation, signed gateway, role authorization,
  tenant ownership, project/estimate ownership, and parent-record ownership are
  enforced for every cost-code and resource mutation
- Decision history: create, update, accept, and reject actions store append-only
  before/after values, reviewer, timestamp, and reason
- Live Seneca validation: the accepted BASE BID owner item opened the `01-100`
  cost-code worksheet; one already-proposed, still-unpriced labor resource was
  accepted in one click and appeared immediately in append-only history
- Live-data boundary: no price, quantity, owner item, full import acceptance, or
  estimate lock was changed during validation
- Keyboard and focus: Escape closes the worksheet and returns focus to its
  originating Open Worksheet button
- Desktop, `1024 px` tablet, and `390 px` mobile: Passed; standard tablet/mobile
  gutters retained and no global horizontal overflow or browser errors found
- Automated domain tests: 16 passed
- Automated Helios security and UI boundary tests: 41 passed
- Shared UI ownership boundary, Helios lint, Convex schema/function generation,
  and Helios production build: Passed
- Isolated Convex development schema/functions: Deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed
- Next approved milestone: Foundation 3E.3 quantity and allocation controls

### Foundation item 3E.3 quantity and allocation controls

- Application checkpoint: `3d26f57`
- Quantity authority: owner bid quantity remains on the owner pay item while
  governed production, comparative, and authoritative quantity records are
  stored separately beneath the operational cost code
- Unknown-value safety: `Takeoff Required` is a first-class quantity type and
  status with no numeric value; zero and placeholder quantities are rejected
- Quantity provenance: value, unit, type, use, source label, source reference,
  calculation/takeoff method, confidence, origin, evidence, and review state
  are retained together
- AI quantity boundary: future estimate proposals create preliminary AI
  takeoff or Takeoff Required records; the operational production quantity is
  not populated until an estimator accepts the proposal
- Bid-day speed: proposed quantities support one-click Accept, and estimators
  can mark Takeoff Required in one click without opening a form
- Shared-cost control: a cost code can be marked as a shared source and
  allocated to current owner items by quantity, percent, or dollar amount
- Server-owned math: one method is controlling; quantity, percentage, and
  dollar comparisons are derived on the server from the current source
  production quantity and direct cost
- Reconciliation: exact 100 percent, source quantity, and source-dollar checks
  identify balanced, unbalanced, incomplete, duplicate, and orphan allocation
  states, including rounding differences
- Double-count prevention: shared source cost is excluded from its direct
  parent rollup until allocations balance; balanced dollars roll to each
  destination owner item exactly once
- Destination safety: target owner items and optional target cost codes are
  tenant-authorized and hierarchy-validated; duplicate destinations are
  rejected on create and update
- Audit history: quantity and allocation create, update, accept, reject, and
  state changes retain before/after value, reviewer, timestamp, and reason
- Legacy rollout guard: cached pre-3E.3 cost-code records render safely while
  the new arrays and allocation state hydrate
- Live Seneca validation: the `01-100` worksheet created a real human-reviewed
  Takeoff Required record in one click; no owner bid quantity or price changed
- Responsive verification: default desktop and `390 px` mobile retained the
  focused worksheet, primary action access, and horizontally scrollable data
  tables
- Automated domain tests: 19 passed
- Automated Helios security and UI boundary tests: 44 passed
- Helios lint, Convex schema/function generation, and Helios production build:
  Passed
- Isolated Convex development schema/functions: Deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed
- Next approved milestone: Foundation 3E.4 evidence, RFQ, submittal, and risk
  integration

### Foundation item 3E.4 evidence, RFQ, submittal, and risk integration

- Application checkpoint: `db4cec6`
- Estimate schema version: advanced to version 3 with optional-field and
  empty-collection compatibility for existing estimate workspaces
- Evidence Matrix: section, owner-item, cost-code, quantity, resource, RFQ,
  submittal, and risk citations resolve to exact estimate records with source,
  relationship, provenance, and verification state
- Evidence decisions: Verify is one click; Dispute requires a concise reason;
  both retain reviewer, timestamp, and append-only decision history
- RFQ generation: an estimator can draft an evidence-linked RFQ from an
  accepted cost code in one click; proposed scope cannot create procurement
  records
- Submittal generation: an accepted cost code can create an evidence-linked
  submittal requirement in one click, with type, specification, responsibility,
  due date, and lifecycle status available in a focused edit dialog
- Procurement desk: RFQ and submittal registers expose the current package,
  linked scope, dates, responsibility, and one-step lifecycle advancement
- Risk register: category, severity, probability, low/most-likely/high cost and
  schedule exposure, expected monetary exposure, mitigation, contingency
  response, owner, response date, disposition, and linked scope are explicit
- Bid-day speed: base estimate, contingency, qualification, transfer, and no
  carry are direct one-click risk decisions; edits remain focused and rejection
  requires a reason
- Revision safety: supporting-record mutations require the current estimate
  version and current bid-package revision; stale or superseded workspaces fail
  closed
- Security: same-origin independent session validation, signed gateway, role
  authorization, tenant ownership, project/estimate ownership, and complete
  parent-record hierarchy validation are enforced on every mutation
- Accepted-scope boundary: evidence can be reviewed while estimate scope is
  proposed, but downstream RFQ/submittal generation requires accepted or
  corrected owner-item and cost-code scope
- Live Seneca validation: 139 legacy and current evidence links rendered, 19
  structured risks rendered, and empty RFQ/submittal registers provided clear
  first-action guidance; no estimate decisions, quantities, prices, or
  procurement records were changed during validation
- Responsive verification: default desktop, `820 px` tablet, and `390 px`
  mobile passed with a responsive navigation drawer and no page-level
  horizontal overflow
- Automated domain tests: 21 passed
- Automated Helios security and UI boundary tests: 47 passed
- React quality review, Helios lint, Convex schema/type generation, content
  diff check, and Helios production build: Passed
- Isolated Convex development schema/functions: Deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed
- Next recommended milestone: Foundation 3E.5 estimate completeness, review
  gates, and pricing-risk reconciliation

### Foundation 4A canonical manual package intake

- Application checkpoint: `4830ec0`
- Active acquisition: authenticated manual intake supports individual PDFs,
  repeated folder selections, ZIP packages, supplemental/addendum revisions,
  and exact written-scope evidence
- Canonical contract: every selection creates a versioned manual envelope with
  stable ID, manifest version, revision purpose, optional issued label,
  normalized paths, source categories, counts, bytes, creator, timestamps, and
  a deterministic fingerprint
- Integrity: accepted PDFs are SHA-256 hashed before upload and independently
  compared with secure-storage metadata before registration; written-scope size
  and hash are recomputed on the server
- Idempotency: replaying an identical envelope returns the existing receipt;
  reusing an envelope ID with changed contents is rejected
- Revision control: same-path changed content creates an immutable superseding
  version; exact project duplicates do not create duplicate source records
- Scope-only behavior: written-scope-only packages reach bid-basis review
  without entering or stalling the Foundation 3C PDF queue
- Bid Scout boundary: the canonical contract accepts a disabled Bid Scout test
  fixture with the same manifest shape, while all live Bid Scout mutations
  remain reject-closed
- Non-regression: estimator, contractor WBS, Cockpit 2.0, pricing, procurement,
  risk, and existing PDF intelligence contracts were not replaced
- Automated domain tests: 27 passed
- Automated Helios security and UI boundary tests: 56 passed
- React quality review, Helios lint, domain build, Convex schema/function
  generation, Helios production build, and authenticated browser check: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed
- Next approved milestone: Foundation 4B bid-basis profiling and document
  control

### Foundation 4B bid-basis profiling and document control

- Application checkpoint: `e0e0e24`
- Revision profile: each active package is classified as plans and
  specifications, plans-only, specifications-only, written-scope-only, or
  mixed/other without requiring a conventional full bid set
- Category control: plans, specifications, written scope, owner bid schedule,
  proposal forms, addenda, geotechnical, utility, environmental/permit, and
  referenced-standard sources retain independent availability and processing
  states
- Capability readiness: estimate access, plan takeoff, specification
  compliance, owner-item reconciliation, and bid-submission review are
  evaluated independently with plain-language limitations
- Bid-day workflow: `Proceed with available basis`, `Not issued`, and `N/A`
  are one-click decisions; focused profile and document corrections require an
  auditable reason
- Integrity: automatic classification uses retained paths, filenames,
  document-intelligence categories, AI document type, and intake source hints;
  estimator corrections never alter immutable source or AI records
- Safety: one usable scope basis opens estimating, missing categories limit
  only dependent capabilities, and unsupported quantities remain unknown or
  takeoff-required rather than zero
- Audit: profile decisions and document corrections are tenant/project/package
  authorized and recorded as append-only before/after events per revision
- Non-regression: estimator, contractor WBS, Cockpit 2.0, quantity, pricing,
  procurement, evidence, risk, authentication, canonical intake, and existing
  document-intelligence contracts were not replaced
- Automated domain tests: 33 passed
- Automated Helios security and UI boundary tests: 60 passed
- React quality review, Helios lint, domain build, Convex schema/function
  generation, Helios production build, and authenticated browser review:
  Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed
- Next approved milestone: Foundation 4C plan-set reconstruction and spatial
  sheet intelligence

### Foundation 4C mixed-mode plan-sheet intelligence

- Application checkpoint: `513b4a5`
- Revision control: every run is bound to company, project, active package,
  package revision, and the Foundation 4B source fingerprint; superseded runs
  remain intact and become non-current
- Source control: the browser submits only the requested action; plan document
  IDs are derived on the server from the authenticated current bid basis
- Mixed-mode reasoning: vector, scanned, hybrid, and unusable pages are handled
  explicitly by the OpenAI plan-document contract
- Page exit gate: every physical PDF page is a construction sheet,
  intentional non-sheet, or exception; omitted model pages become deterministic
  exception records requiring reanalysis
- Sheet/view register: title-block metadata, revisions, addendum association,
  discipline, modality, view bounds, north orientation, measurability, and
  unresolved issues are normalized without modifying the source PDF
- Relationship graph: detail, section, match-line, continuation, plan/profile,
  key-map, schedule, specification, and standard-detail references resolve only
  against one current sheet; duplicates and missing targets remain visible
- Scale safety: scale belongs to an individual view; candidates remain proposed
  or conflicted until one-click estimator approval, and uncalibrated measurable
  views stay blocked from quantity use
- Variable bid basis: specs-only and written-scope projects show an explicit
  nonblocking not-applicable state; plans are never required to open estimating
- Non-regression: estimator, contractor WBS, Cockpit 2.0, Foundation 3C
  findings, bid basis, quantity, pricing, procurement, evidence, and risk
  contracts were not replaced
- Automated domain tests: 36 passed
- Automated Helios security and UI boundary tests: 65 passed
- React quality review, Helios lint, targeted Foundation 4C Convex lint, domain
  build, Convex schema/function generation, Helios production build, and shared
  OpsSlate web production build: Passed
- Authenticated browser verification: plans-enabled and specs-only projects
  passed; desktop, 1024px tablet, and 390px mobile had no page-level horizontal
  overflow, framework overlay, or console error
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed
- Next approved milestone: Foundation 4D governed quantity intelligence and
  calibrated plan takeoff

### Foundation 4D civil geometry and governed plan takeoff

- Application checkpoint: `cb76142`
- Geometry authority: horizontal control coordinates, tangent/curve tables,
  and station equations lead; profiles establish vertical alignment; cross
  sections establish widths, slopes, and earthwork surfaces; inverts and
  material layers establish drainage and subgrade geometry; calibrated scale
  is fallback only
- Curve safety: horizontal length uses explicit control-sheet tangent and curve
  lengths before coordinate chords, and station equations remain retained
- AI boundary: OpenAI proposes source-located geometry only and is explicitly
  prohibited from inventing missing values or calculating bid quantities
- Human gate: every geometry record remains proposed until one-click estimator
  acceptance; unresolved issues and confidence stay visible
- Deterministic quantities: supported calculations include alignment and
  profile length, invert-network length, unique structure count, material area
  and volume, and average-end-area earthwork volume
- Quantity governance: owner, measured, production, purchasing, and risk
  quantities remain distinct; comparison variance never overwrites the owner
  quantity
- Estimate boundary: accepted measurements rebuild a proposal in one click;
  sending it to the estimate creates a proposed plan quantity without pricing
  or silent acceptance
- Security and audit: same-origin session, signed principal, tenant, project,
  package revision, plan run, page/view, calibration, cost code, and geometry
  ownership are server-authorized; review events are append-only
- Variable bid basis: plans-absent projects remain nonblocking and continue
  from specifications or written scope
- Automated domain tests: 48 passed
- Automated Helios security and UI boundary tests: 68 passed
- React quality review, Helios lint, targeted Convex lint, domain build, Convex
  schema/function generation, Helios production build, and shared OpsSlate web
  production build: Passed
- Authenticated browser verification: plans-enabled and specifications-only
  projects passed with no console errors; 1024px tablet and 390px mobile had no
  page-level horizontal overflow
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Model geometry reconstruction, Vercel deployment, production promotion, and
  domain changes: Not performed
- Next recommended milestone: Foundation 4E golden-project validation and
  automated quantity execution

### Plan PDF upload digest hotfix

- Application checkpoint: `3778fe3`
- Root cause: browser manifests stored SHA-256 digests as lowercase hexadecimal,
  while Convex storage metadata returned the identical digest as Base64; direct
  string comparison caused every valid plan PDF to fail registration
- Integrity control: manifest digests are deterministically converted before
  comparison; only byte-identical SHA-256 values pass and invalid or mismatched
  digests still fail closed
- Retry behavior: existing failed and pending package entries remain reusable,
  so reselecting the same folder or ZIP resumes the current package revision
  without duplicating registered documents
- Operator feedback: safe validation messages are returned for actionable
  upload failures instead of collapsing every failure into one generic message
- Automated domain tests: 49 passed
- Automated Helios security and UI boundary tests: 69 passed
- Helios lint, targeted Convex lint, TypeScript validation, domain build,
  Convex schema/function deployment, and Helios production build: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, and domain changes: Not performed

### Canonical engineering record — Stage 1 foundation

- Application checkpoint: `235564a`
- Scope: additive contract, schema, provenance, compatibility boundaries, and
  remote-file lifecycle only; no existing workflow was redirected
- Canonical root: versioned company, project, package, revision, bid-basis,
  source-fingerprint, coverage, and current/superseded identity
- Immutable sources: existing protected PDF and written-scope records remain
  the source of truth; canonical sources retain hashes, versions, paths, size,
  content type, and original storage linkage
- Reusable channels: physical pages, dimensions, rotation, page hashes,
  native/OCR coordinate spans, protected page renders, thumbnails, and view
  crops now have explicit additive storage contracts
- Artifacts and provenance: future document, plan, and civil-geometry outputs
  can be versioned and traced to sources, pages, text spans, visual regions, and
  existing Helios evidence records
- Remote lifecycle: one temporary OpenAI `user_data` file per source can be
  tracked through upload, reuse, expiration, deletion, retry, and failure
- Compatibility: browser hexadecimal and Convex Base64 SHA-256 values normalize
  to one source fingerprint; company, project, package, revision, source, and
  version mismatches fail closed
- Variable bid basis: PDF and written-scope sources are supported; document,
  plan, and civil-geometry coverage can be explicitly not applicable
- Non-regression: existing Document Intelligence, Plan Reconstruction, Civil
  Geometry, Project Intelligence, WBS, Estimate Builder, Cockpit 2.0, quantity,
  pricing, procurement, evidence, risk, and estimator decisions remain
  authoritative and unchanged
- Duplicate OpenAI uploads: intentionally still present in Stage 1; removal is
  prohibited until shadow ingestion and parity comparison are approved
- Automated domain tests: 53 passed
- Automated Helios security and UI boundary tests: 73 passed
- Domain build, Helios lint, targeted Convex schema lint, shared web TypeScript,
  Helios production build, shared OpsSlate web production build, and Convex
  schema/function generation: Passed
- Convex development schema: deployed empty additive tables and indexes to
  `kindly-tiger-289`; existing records were not migrated
- Vercel deployment, production promotion, domain changes, canonical writers,
  workflow cutover, and remote-file reuse: Not performed
- Approval gate: stop before Stage 2 shadow ingestion
