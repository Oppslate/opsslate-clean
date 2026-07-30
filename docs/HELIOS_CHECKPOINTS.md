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

### Canonical engineering record — Stage 2 shadow ingestion

- Application checkpoint: `b1ec64b`
- Scope: additive, idempotent shadow writers only; all existing Document
  Intelligence, Plan Reconstruction, Civil Geometry, Project Intelligence,
  WBS, Estimate Builder, Cockpit 2.0, quantity, pricing, procurement, evidence,
  risk, and estimator-review records remain authoritative
- Source registration: finalized package entries create immutable canonical
  links to protected PDFs and written scopes without copying or changing the
  source of truth
- Revision reuse: previously analyzed duplicate PDFs are mirrored into the
  current package root by immutable document identity, without re-uploading or
  re-reading the PDF
- Document shadow: authoritative job, intelligence, and evidence records are
  mirrored into versioned artifacts and provenance
- Plan shadow: terminal run summaries fan out by source document to mirror
  physical page identities, page metadata, references, and calibrations
- Geometry shadow: terminal run summaries fan out by source document to mirror
  civil-geometry provenance
- Scaling: fan-out scheduling bounds each plan and geometry transaction to one
  source document instead of one entire bid package
- Isolation: shadow scheduling is best-effort and occurs after authoritative
  writes; existing successful operations cannot be rolled back by a shadow
  scheduling failure
- Cutover: no canonical readers, UI routes, OpenAI remote-file reuse, prompt
  changes, PDF upload changes, or duplicate API-call removal were introduced
- Live parity, specification-only project: 1 authoritative source = 1 canonical
  source; 1 active document artifact; 21 provenance links; document ready,
  plan/geometry not applicable; canonical record ready
- Live parity, 34-source mixed project: 34 authoritative sources = 34 canonical
  sources; 34 active document artifacts; 557 provenance links; document ready,
  plan/geometry pending; canonical record partially ready
- Idempotence: two consecutive live backfills returned the same engineering
  record and identical 34/34 source, 34 artifact, and 557 provenance counts
- Live plan/geometry parity: not fabricated; the development deployment has no
  plan-run rows yet, so these paths are type-, contract-, and boundary-tested
  and remain behind the next golden-project approval gate
- Automated domain tests: 56 passed
- Automated Helios security and UI boundary tests: 76 passed
- Domain build, Helios lint, targeted modified Convex lint, shared web
  TypeScript, Helios production build, shared OpsSlate web production build,
  and Convex schema/function generation: Passed
- Full shared OpsSlate lint: existing repository baseline remains red outside
  this stage; every Stage 2 modified Convex file passed targeted lint
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Approval gate: stop before Stage 3 golden-project plan/geometry parity and any
  consumer cutover

### Canonical engineering record — Stage 3 golden-project parity

- Application checkpoint: `48f758e`
- Scope: internal exact-parity evaluator and shadow-backfill hardening only;
  no application consumer, prompt, upload path, or OpenAI lifecycle cutover
- Stored parity: versioned `heliosEngineeringParityRuns` retain the compared
  package revision, canonical record, input fingerprint, per-area result,
  exact mismatched IDs, issues, author, and completion time
- Exact coverage: source identities, document-intelligence records, evidence,
  plan pages, plan views, calibrations, references, and civil-geometry records
  compare by deterministic content fingerprint rather than count alone
- Fail-closed behavior: missing, unexpected, or altered records fail; unfinished
  authoritative workflows remain incomplete; valid absent capabilities remain
  not applicable
- Large-package reliability: per-document, plan-document, and geometry-document
  shadow workers no longer rewrite shared roots or the full source registry;
  final aggregate refreshes run after isolated workers
- Live golden parity, specifications-only project: 1/1 source, 1/1 document-
  intelligence record, and 20/20 evidence records matched exactly; all plan and
  geometry areas were correctly not applicable; overall status passed
- Live staged parity, 34-source project: 34/34 sources, 34/34 document-
  intelligence records, and 523/523 evidence records matched exactly after one
  backfill; plan and geometry areas were correctly incomplete because no
  authoritative plan run exists in the development data
- Honest validation boundary: no plan or geometry success was fabricated; an
  actual completed plan/geometry golden project is required before cutover
- Automated domain tests: 60 passed
- Automated Helios security and boundary tests: 78 passed
- Targeted modified-file lint, domain build, shared web TypeScript, Helios
  production build, shared OpsSlate web production build, and Convex
  schema/function deployment: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Vercel deployment, production promotion, domain changes, consumer cutover,
  remote-file reuse, and duplicate OpenAI-call removal: Not performed
- Approval gate: stop before Stage 4 canonical-reader pilot and wait for owner
  approval

### Bid-package intake recovery hotfix

- Application checkpoint: `44275e8`
- Root cause: the stable July 24 preview did not send the canonical envelope ID
  required by the July 27 Convex intake contract; folder and individual-PDF
  attempts therefore failed at the same package-creation boundary
- State recovery: every new selection clears the prior local manifest, and a
  visible `Clear selection` action allows immediate upload-method switching
- Persistent recovery: unfinished or failed package intake can be marked
  `abandoned`, releasing the project for a replacement package without deleting
  immutable PDFs that already reached protected storage
- Revision safety: abandoned intake does not consume the next active package
  revision or become a predecessor for later packages
- Security: recovery requires same-origin authentication plus server-side
  company, project, active-package, and allowed-status authorization
- Operator feedback: safe package-validation errors are returned instead of a
  generic creation failure
- Automated domain tests: 60 passed
- Automated Helios security and boundary tests: 79 passed
- Targeted modified-file lint, domain build, shared web TypeScript, Helios
  production build, and Convex schema/function deployment: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`

### Evidence-backed project metadata auto-population

- Application checkpoint: `2547662`
- Scope: project number, owner/client, engineer, bid date, and location are
  extracted during the existing project-synthesis step from previously stored
  document intelligence and evidence
- Single-ingestion boundary: no PDF is re-uploaded or re-read and no new
  OpenAI workflow is introduced
- Evidence control: every populated value must cite valid project evidence;
  bid dates must be valid ISO calendar dates (`YYYY-MM-DD`)
- Manual-authority control: synthesis fills only blank project fields and
  never overwrites estimator-entered values
- Backward compatibility: metadata is additive and optional on earlier
  intelligence generations, preserving all existing document, plan, geometry,
  WBS, estimate, cockpit, and review records
- Automated domain tests: 60 passed
- Automated Helios security and boundary tests: 82 passed
- Domain build, Helios lint, Helios production build, Convex code generation,
  and shared web TypeScript: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Production deployment and production domain changes: Not performed

### Ask Helios governed project assistant

- Application checkpoint: `f6cb371`
- Scope: additive, read-only, project-scoped conversations over the canonical
  engineering project record; no estimate, quantity, risk, RFQ, document,
  plan, or geometry mutation is exposed
- Sources: stored document evidence, plan-sheet records, current civil
  geometry, governed takeoff quantities, estimate quantities/items, and the
  project risk register; original PDFs remain immutable protected evidence
- Engineering controls: station notation and vertical-profile interpolation
  are deterministic; numeric answers may copy supplied governed values or
  deterministic totals but may not invent or silently recompute quantities
- Answer governance: every supported answer records status, method,
  assumptions, limitations, confidence, canonical citations, model identity,
  response identity, token usage, package revision, and timestamps
- Persistence: the user message and a pending assistant record are committed
  before generation, and every conversation has an addressable project URL
- Security: same-origin API entry, authenticated server-derived tenant,
  project/thread ownership reauthorization, strict citation validation, and
  no PDF upload or OpenAI file lifecycle in downstream questions
- UI: OpsSlate shared primitives, saved conversations, quick bid-day prompts,
  protected PDF citation links, answer-basis panel, and responsive desktop,
  tablet, and mobile layouts
- Live development verification: Titus Culvert risk question completed with a
  proposed 92% confidence answer, eight canonical citations, disclosed method
  and limitations, persisted OpenAI response/token metadata, and no browser
  errors
- Automated domain tests: 63 passed
- Automated Helios security and boundary tests: 85 passed
- Helios lint, targeted Convex lint, shared web TypeScript, Helios production
  build, and Convex development deployment: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`
- Vercel preview: `helios-foundation-item-2-preview-hzovteeoq-oppslate.vercel.app`
  (`READY`, target `preview`); stable project preview alias updated
- Preview verification: protected project URL redirects signed-out users to
  Helios sign-in while preserving the complete conversation return path
- Production deployment and production domain changes: Not performed

### Civil Geometry 2.0 — Euclid Stage 4A engineering contract

- Application checkpoint: `e71c796`
- Contract: [Euclid Stage 4A engineering contract](./HELIOS_EUCLID_STAGE_4A_ENGINEERING_CONTRACT.md)
- Scope: additive shared domain contract, fail-closed validation, reference
  fixture, and architecture record only
- Canonical identity: every model is company-, project-, package-, revision-,
  source-fingerprint-, schema-, and processing-version-bound
- Horizontal model: separate roadway, stream, survey, structure, utility, and
  temporary alignments with control points, lines, circular curves, spirals,
  and station equations
- Vertical model: profiles attach to exactly one horizontal alignment and carry
  profile points, tangents, vertical curves, solver identity, and review state
- Engineering context: typical sections, cross-section points, structures,
  inverts, material layers, relationships, and blocking issues share the same
  model
- Traceability: printed values retain source notation; computed values retain a
  deterministic formula and input IDs; values and stations require physical-
  page provenance
- Coordinate safety: published, local, partial, unknown, and conflicted bases
  are explicit; no datum or projection is inferred
- Exchange safety: only accepted, complete, contract-valid geometry qualifies;
  local-coordinate exchange requires explicit estimator acknowledgment
- Titus reference fixture: Front Avenue roadway and Titus Run stream remain
  separate while the roadway profile stays attached to Front Avenue
- Automated domain tests: 70 passed
- Domain TypeScript, Helios lint, Helios production build, and shared UI
  ownership boundary: Passed
- Existing Document Intelligence, Plan Intelligence, Civil Geometry, WBS,
  Estimate Builder, Cockpit 2.0, Ask Helios, quantity, pricing, procurement,
  evidence, risk, and review behavior: Unchanged
- Convex schema, writers, OpenAI calls, extractors, solvers, cockpit UI,
  navigation, and LandXML generation: Not started
- Vercel deployment, production promotion, and domain changes: Not performed
- Approval gate: stop before Euclid Stage 4B canonical storage and shadow
  population

### Civil Geometry 2.0 - Euclid Stage 4B canonical shadow storage

- Application checkpoint: `b5a5920`
- Contract: [Euclid Stage 4B canonical shadow storage](./HELIOS_EUCLID_STAGE_4B_SHADOW_STORAGE.md)
- Scope: additive canonical Euclid persistence and shadow population only; no
  application reader, extractor, solver, cockpit, or export cutover
- Storage: versioned `heliosEuclidModels`, `heliosEuclidProvenance`, and
  `heliosEuclidEntityChunks` tables preserve current and superseded models
- Source boundary: the adapter consumes stored canonical engineering records,
  civil-geometry records, page provenance, and package identity; it does not
  upload, open, or reread a PDF and makes no OpenAI call
- Determinism: stable ordering, fingerprints, bounded chunks, and idempotent
  reuse prevent duplicate models when the canonical input is unchanged
- Revision safety: changed canonical inputs create a new version and
  supersede, but never delete, the prior model and provenance
- Engineering safety: unknown coordinate systems and ambiguous units remain
  unknown; unresolved station equations, incomplete curves, missing exact
  endpoints, and unlocated inverts or material layers remain explicit issues
- Traceability: every promoted entity retains physical-page provenance back to
  the immutable original project document
- Failure isolation: Stage 4B runs only after a completed authoritative Civil
  Geometry shadow; bounded provenance retries and terminal diagnostics cannot
  roll back or fail the existing workflow
- Automated domain tests: 75 passed
- Automated Helios security and boundary tests: 89 passed
- Domain build, targeted modified Convex lint, Helios lint, shared UI ownership
  boundary, Helios production build, and shared OpsSlate web production build:
  Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`; Euclid
  sync and status functions are internal only
- Live Titus audit: a completed Plan Intelligence run exists, but there is no
  authoritative `heliosCivilGeometryRuns` record; no Euclid model was
  fabricated, and the first completed geometry run will schedule population
- Existing Document Intelligence, Plan Intelligence, Civil Geometry, WBS,
  Estimate Builder, Cockpit 2.0, Ask Helios, quantity, pricing, procurement,
  evidence, risk, and review readers: Unchanged
- Vercel deployment, production promotion, domain changes, UI/navigation,
  LandXML, PDF lifecycle changes, and reader cutover: Not performed
- Approval gate: stop before Euclid Stage 4C horizontal control solver and
  golden Titus validation

### Civil Geometry 2.0 - Euclid Stage 4C horizontal control

- Application checkpoint: `113d931`
- Contract: [Euclid Stage 4C horizontal control](./HELIOS_EUCLID_STAGE_4C_HORIZONTAL_CONTROL.md)
- Scope: deterministic horizontal-control solver, immutable shadow results,
  and controlled Titus mathematical validation only; no reader or UI cutover
- Engineering math: quadrant bearings and azimuths, line coordinate closure,
  bearing closure, circular-curve arc/chord/tangent checks, element sequence,
  endpoint and station continuity, duplicate controls, and total-length closure
- Station equations: physical locations resolve from the continuous offset
  with printed values, formula, input IDs, and provenance retained; downstream
  stations without an explicit equation branch remain blocked
- Tolerances: versioned `estimating-control-v1` pass/review/block thresholds
  are persisted with every immutable solution and are not represented as survey
  or agency standards
- Storage: versioned `heliosEuclidHorizontalSolutions` and fingerprinted
  `heliosEuclidHorizontalSolutionChunks` preserve current and superseded checks
- Determinism: unchanged model and tolerance fingerprints reuse the current
  solution; changed Euclid models create new results without deleting history
- Failure isolation: Stage 4C is scheduled only after Stage 4B model,
  provenance, and chunks commit; solver failure cannot roll back canonical data
- Titus golden fixture: separate Front Avenue roadway and Titus Run stream
  control chains pass; corrupted curve math and ambiguous stationing block
- Honest live boundary: the Titus development project still has no
  authoritative Civil Geometry run, so no live Euclid model or horizontal
  solution was fabricated
- Automated domain tests: 82 passed
- Automated Helios security and boundary tests: 93 passed
- Domain TypeScript, targeted Convex lint, Helios lint, shared UI ownership
  boundary, Helios production build, shared OpsSlate production build, Convex
  code generation/type validation/schema deployment: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`; solver,
  current-project scheduler, and status query are internal only
- Existing Document Intelligence, Plan Intelligence, Civil Geometry, WBS,
  Estimate Builder, Cockpit 2.0, Ask Helios, quantity, pricing, procurement,
  evidence, risk, and review readers: Unchanged
- OpenAI/PDF lifecycle changes, Vercel deployment, production promotion,
  domain changes, cockpit UI, vertical solver, LandXML, and reader cutover:
  Not performed
- Approval gate: stop before Euclid Stage 4D vertical/profile solver and Titus
  PRO-1 golden validation

### Civil Geometry 2.0 - Euclid Stage 4D vertical profiles

- Application checkpoint: `389dc84`
- Contract: [Euclid Stage 4D vertical profiles](./HELIOS_EUCLID_STAGE_4D_VERTICAL_PROFILES.md)
- Scope: deterministic tangent and normal parabolic vertical-curve solver,
  immutable shadow results, and controlled Titus PRO-1 mathematical validation
  only; no reader or UI cutover
- Profile safety: existing ground, proposed grade, subgrade, streambed, culvert
  invert, utility invert, and other profile roles remain separate objects
- Engineering math: tangent grade, PVC/PVI/PVT order, length and symmetry,
  incoming/outgoing tangent closure, crest/sag type, algebraic grade difference,
  K value, and internal high/low point
- Fail-closed rules: no extrapolation beyond PVC/PVT, no plotted-line inference,
  incomplete curve controls block, asymmetric curves remain uncertified, missing
  datum requires review, and ambiguous station-equation branches block
- Tolerances: versioned `estimating-profile-v1` pass/review/block thresholds are
  persisted with each solution and are not represented as survey standards
- Storage: versioned `heliosEuclidVerticalSolutions` and fingerprinted
  `heliosEuclidVerticalSolutionChunks` preserve current and superseded checks
- Determinism: unchanged canonical Euclid inputs reuse the current fingerprint;
  changed models preserve prior results and create a new shadow solution
- Failure isolation: Stage 4D schedules only after the complete Stage 4B model,
  provenance, and entity chunks commit
- Titus PRO-1 fixture: separate proposed finished-grade and existing-ground
  profiles pass exact mathematical validation; corrupted PVT elevation, K value,
  incomplete curve controls, and extrapolation fail closed
- Honest live boundary: no authoritative Titus Civil Geometry run exists, so the
  live vertical-solution table remains empty and no pass was fabricated
- Automated domain tests: 88 passed
- Automated Helios security and boundary tests: 97 passed
- Domain TypeScript, targeted Convex lint, Helios lint, shared UI ownership
  boundary, Helios production build, shared OpsSlate production build, Convex
  code generation/type validation/schema deployment: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`; solver,
  current-project scheduler, and status query are internal only
- Existing Document Intelligence, Plan Intelligence, Civil Geometry, WBS,
  Estimate Builder, Cockpit 2.0, Ask Helios, quantity, pricing, procurement,
  evidence, risk, and review readers: Unchanged
- OpenAI/PDF lifecycle changes, Vercel deployment, production promotion, domain
  changes, cockpit UI, LandXML, and reader cutover: Not performed
- Approval gate: stop before Euclid Stage 4E combined engineering relationship
  graph and 3D quantity-readiness validation

### Civil Geometry 2.0 - Euclid Stage 4E engineering graph

- Application checkpoint: `22813ca`
- Contract: [Euclid Stage 4E engineering graph](./HELIOS_EUCLID_STAGE_4E_ENGINEERING_GRAPH.md)
- Scope: deterministic engineering relationship graph and method-specific
  quantity-readiness validation only; no reader, quantity, or UI cutover
- Canonical joins: alignments, control points, horizontal elements, station
  equations, profiles, profile controls, sections, structures, inverts, and
  material layers join only through frozen parent identities and explicit
  relationship roles, never visual proximity
- Control gates: fingerprint-verified Stage 4C horizontal and Stage 4D vertical
  solutions must both belong to the same current Euclid model before Stage 4E
  can publish a shadow result
- Readiness: horizontal length, profile elevation, corridor 3D, earthwork,
  material area and volume, structure count, and drainage 3D length report
  ready, review, blocked, or not available without inventing quantities
- Engineering safety: proposed controls cannot become ready, parent-range and
  relationship-role errors block, earthwork requires matching existing/design
  stations and offsets, and drainage remains review until connectivity is
  explicitly confirmed
- Storage: immutable `heliosEuclidIntegrationSolutions` and fingerprinted,
  bounded `heliosEuclidIntegrationSolutionChunks` preserve current and
  superseded graph/readiness results
- Determinism: stable graph ordering, complete controlling-entity provenance,
  fingerprints, idempotent reuse, and golden/corruption fixtures prevent silent
  result drift
- Failure isolation: Stage 4E is scheduled only after either independent
  control solver commits; missing or mismatched inputs retry without changing
  canonical geometry or existing estimator workflows
- Honest live boundary: no authoritative live Euclid model exists in the
  development project, so the integration table remains empty and no geometry
  or readiness result was fabricated
- Automated domain tests: 96 passed
- Automated Helios security and boundary tests: 102 passed
- Domain TypeScript, targeted Convex lint, Helios lint, shared UI ownership
  boundary, Helios production build, shared OpsSlate production build, Convex
  code generation/type validation/schema deployment: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`; solver
  and status query are internal only
- Existing Document Intelligence, Plan Intelligence, Civil Geometry, WBS,
  Estimate Builder, Cockpit 2.0, Ask Helios, quantity, pricing, procurement,
  evidence, risk, and review readers: Unchanged
- OpenAI/PDF lifecycle changes, Vercel deployment, production promotion, domain
  changes, cockpit UI, quantity publication, LandXML, and reader cutover: Not
  performed
- Approval gate: stop before Euclid Stage 4F read-only Civil Geometry cockpit

### Civil Geometry 2.0 - Euclid Stage 4F read-only cockpit

- Application checkpoint: `3bda526`
- Contract: [Euclid Stage 4F Civil Geometry cockpit](./HELIOS_EUCLID_STAGE_4F_COCKPIT.md)
- Scope: authenticated, tenant-authorized, read-only estimator workspace for
  the canonical Euclid model and Stage 4E engineering graph
- Workflow: direct project navigation opens the approved three-panel pattern
  with alignment inventory, horizontal/vertical/section/structure inspection,
  and readiness/evidence/issues context
- Canonical boundary: the server reconstructs fingerprint-verified Euclid and
  Stage 4E chunks; it does not reread PDFs, call OpenAI, or accept browser
  company identity
- Payload boundary: all alignments remain visible as compact summaries while
  only the selected alignment's controls, profiles, sections, structures,
  readiness, checks, issues, and provenance are returned in detail
- Evidence: every displayed engineering value retains canonical provenance and
  protected source-page navigation to the immutable original PDF
- Honest live boundary: Titus has no current canonical Euclid model, so browser
  verification shows `awaiting_model`; no geometry or readiness was fabricated
- Automated domain tests: 98 passed
- Automated Helios security and boundary tests: 107 passed
- Browser QA: desktop `1440 × 900`, tablet `900 × 1100`, and mobile
  `390 × 844` passed with no horizontal overflow or application runtime errors
- Domain TypeScript, targeted Convex lint, Helios lint, shared UI ownership
  boundary, Helios production build, shared OpsSlate production build, Convex
  code generation/type validation/schema deployment: Passed
- Convex development schema/functions: deployed to `kindly-tiger-289`; the new
  cockpit query remains internal behind the existing Helios gateway
- Existing Document Intelligence, Plan Intelligence, WBS, Estimate Builder,
  Cockpit 2.0, Ask Helios, quantity, pricing, procurement, evidence, risk, and
  review readers: Unchanged
- Geometry editing, estimator acceptance, quantity calculation/publication,
  LandXML, Vercel deployment, production promotion, and domain changes: Not
  performed
- Approval gate: stop before governed Euclid geometry review and correction

### Civil Geometry 2.0 - Euclid Stage 4G governed review

- Application checkpoint: `fd1223f`
- Contract: [Euclid Stage 4G governed review](./HELIOS_EUCLID_STAGE_4G_GOVERNED_REVIEW.md)
- Scope: estimator acceptance, correction, deferral, and rejection of current
  canonical Euclid entities; no canonical geometry mutation or downstream
  publication
- Bid-day workflow: acceptance is one click; correction, deferral, and
  rejection use one shared review dialog and require a reason
- Governance: entity-specific correction allowlists prevent arbitrary object
  edits; every decision retains the complete before snapshot and reviewer
  identity
- Integrity: model, source, and entity fingerprints prevent stale review;
  request identities make exact retries idempotent and reject conflicting reuse
- Storage: append-only `heliosEuclidReviewDecisions` records preserve all
  decision history while the cockpit folds the latest decision per entity
- Canonical boundary: the immutable Euclid model, Stage 4C/4D solvers, Stage 4E
  engineering graph, source PDFs, and provenance remain unchanged
- Honest live boundary: Titus has no current canonical Euclid model, so browser
  verification remains in `awaiting_model`; no reviewable geometry was
  fabricated
- Automated domain tests: 102 passed
- Automated Helios security and boundary tests: 109 passed
- Browser QA: desktop `1440 × 900`, tablet `1024 × 768`, and mobile
  `390 × 844` passed with no horizontal overflow or application runtime errors
- Domain TypeScript, Helios lint, Helios production build, shared OpsSlate
  production build, and generated Convex bindings: Passed
- Convex development schema/functions: updated through the existing development
  deployment; no production or Vercel deployment was performed
- Existing Document Intelligence, Plan Intelligence, WBS, Estimate Builder,
  Cockpit 2.0, Ask Helios, quantity, pricing, procurement, evidence, and risk
  readers: Unchanged
- Canonical correction application, geometry recalculation, quantity or estimate
  publication, LandXML, Vercel deployment, production promotion, and domain
  changes: Not performed
- Approval gate: stop before applying reviewed corrections to a new canonical
  model or allowing reviewed geometry to drive downstream quantities

### Civil Geometry 2.0 - Euclid Stage 4H reviewed candidate

- Application checkpoint: `a8ff90a`
- Contract: [Euclid Stage 4H reviewed candidate](./HELIOS_EUCLID_STAGE_4H_REVIEWED_CANDIDATE.md)
- Scope: build an immutable, versioned reviewed-geometry candidate from the
  current Stage 4G decision ledger; do not replace the source Euclid model or
  publish downstream records
- Candidate boundary: the builder clones the fingerprint-verified current
  model, applies only previously allowlisted corrections, and retains the
  source model as immutable source of truth
- Governance: accepted and corrected entities can resolve review; deferred,
  rejected, and unreviewed entities block deterministic validation
- Integrity: source model, engineering source, target, review-set, candidate,
  and decision fingerprints preserve complete stale-safe lineage
- Status: `ready_for_validation` means review and frozen-contract checks pass;
  it does not mean the candidate is downstream-ready or canonical
- Storage: immutable candidate header, deterministic bounded entity chunks,
  and decision-lineage joins preserve every candidate version without patch or
  delete paths
- Bid-day workflow: the approved three-panel cockpit adds one-click candidate
  creation and compact status, resolution, correction, and blocker feedback
- Honest live boundary: Titus has no current canonical Euclid model, so browser
  verification remains in `awaiting_model`; no geometry or candidate was
  fabricated
- Automated domain tests: 105 passed
- Automated Helios security and boundary tests: 113 passed
- Browser QA: desktop `1440 × 900`, tablet `1024 × 768`, and mobile
  `390 × 844` passed with no horizontal overflow or application runtime errors
- Domain TypeScript, Helios lint, Helios production build, shared OpsSlate
  production build, Convex code generation, and development schema/function
  update: Passed
- Existing Document Intelligence, Plan Intelligence, WBS, Estimate Builder,
  Cockpit 2.0, Ask Helios, quantities, pricing, procurement, evidence, risk,
  schedule, and LandXML consumers: Unchanged
- Canonical promotion, solver rerun, quantity or estimate publication, LandXML,
  Vercel deployment, production promotion, and domain changes: Not performed
- Approval gate: stop before Stage 4I deterministic candidate validation and
  engineering-delta comparison

### Civil Geometry 2.0 - Euclid Stage 4I candidate validation

- Application checkpoint: `59abd96`
- Contract: [Euclid Stage 4I candidate validation](./HELIOS_EUCLID_STAGE_4I_CANDIDATE_VALIDATION.md)
- Scope: rerun Stage 4C horizontal control, Stage 4D vertical profiles, and
  Stage 4E relationships/readiness against both the immutable source model and
  the current reviewed candidate, then persist the comparison
- Single-ingestion boundary: both solver runs reconstruct fingerprint-verified
  canonical records; Stage 4I does not reread a PDF or call OpenAI
- Integrity: current source, model, candidate, review-set, entity-chunk, solver,
  result, and validation fingerprints fail closed on stale or altered data
- Storage: immutable validation headers and deterministic bounded check,
  readiness, and engineering-delta chunks; no patch, replace, or delete path
- Bid-day workflow: one-click candidate validation in the existing three-panel
  cockpit with horizontal, vertical, graph, changed, improved, degraded, and
  blocking feedback
- Honest live boundary: Titus has no current canonical Euclid model, so browser
  verification remains in `awaiting_model`; no geometry or validation was
  fabricated
- Automated domain tests: 108 passed
- Automated Helios security and boundary tests: 116 passed
- Browser QA: desktop `1440 × 900`, tablet `1024 × 768`, and mobile
  `390 × 844` passed with no horizontal overflow or application console errors
- Domain TypeScript, Helios lint, Helios production build, shared OpsSlate
  production build, Convex code generation, and development function/schema
  synchronization: Passed
- Existing Document Intelligence, Plan Intelligence, WBS, Estimate Builder,
  Cockpit 2.0, Ask Helios, quantity, pricing, procurement, evidence, risk,
  schedule, and LandXML consumers: Unchanged
- Canonical promotion, quantity or estimate publication, scheduling, LandXML,
  Vercel deployment, production promotion, and domain changes: Not performed
- Approval gate: stop before Stage 4J governed canonical promotion

### Civil Geometry 2.0 - Euclid Stage 4J governed canonical promotion

- Application checkpoint: `806c37b`
- Contract: [Euclid Stage 4J governed canonical promotion](./HELIOS_EUCLID_STAGE_4J_GOVERNED_PROMOTION.md)
- Scope: promote only a current, passing, non-degraded reviewed candidate into
  a new immutable canonical Euclid version
- Lineage: source model, review set, candidate, validation, and promoted-model
  fingerprints are retained in append-only promotion history
- Continuation: the promoted model reruns the deterministic horizontal,
  vertical, and integration solvers without rereading PDFs or calling OpenAI
- Existing source models and solver results are superseded, never deleted
- Quantity, estimate, pricing, procurement, schedule, and LandXML publication:
  Not performed
- Approval gate: stop before Stage 4K governed quantity publication

### Civil Geometry 2.0 - Euclid Stage 4K governed quantity publication

- Application checkpoint: `83a877c`
- Contract: [Euclid Stage 4K governed quantity publication](./HELIOS_EUCLID_STAGE_4K_QUANTITY_PUBLICATION.md)
- Scope: calculate deterministic candidates from the current promoted Euclid
  model and let the estimator map one result to one existing estimate cost code
- Quantities: horizontal length, structure count, material area/volume, and
  separate average-end-area excavation and embankment volumes
- Governance: only a passing integration solution and a `ready` capability can
  publish; exact model, solution, candidate, and estimate fingerprints fail
  closed on stale data
- Estimate boundary: every publication creates a new proposed plan quantity;
  comparative and production uses remain distinct, and production units must
  match the receiving cost code
- Traceability: append-only publication lineage and estimate decision history
  preserve controlling entities, provenance, formulas, confidence, user, and
  time; exact retries are idempotent
- Single ingestion: canonical chunks are reconstructed from stored data; no PDF,
  OpenAI, upload, or object-storage access occurs
- Automated domain tests: 114 passed
- Automated Helios security and boundary tests: 124 passed
- Domain TypeScript, Helios lint, Helios production build, shared OpsSlate
  production build, Convex code generation, and development synchronization:
  Passed
- Owner quantities, fixed amounts, accepted decisions, resources, pricing,
  procurement, risk, schedule, source PDFs, and LandXML: Unchanged
- Vercel deployment and production promotion: Not performed
- Approval gate: stop before the next separately governed Euclid downstream
  capability

### Canonical-record cutover - Stage 2 source materialization

- Application checkpoint: `90043fb`
- Scope: materialize reusable native text, full-page renders, and registered
  plan-view crops from each immutable canonical PDF source after its first and
  only upload
- Source boundary: PDFium performs local extraction and rendering; view crops
  are derived from stored canonical page renders; this stage does not call
  OpenAI or create a second provider file
- Storage: versioned materialization jobs, page-channel state, bounded text
  span writes, immutable render assets, retryable page failures, and current
  asset ownership remain attached to the canonical engineering record
- Live Titus verification: 78/78 sources and 460/460 pages materialized, 400
  pages with native text, 55,628 stored text spans, 460 page renders, and
  377/377 registered plan-view crops; zero failed pages and zero failed sources
- Drawing authority correction: EXB-1, EXB-2, and ABT-1 are version-authority
  pairs, not duplicate uploads. The June 2026 issued-for-bid sheets govern and
  the February 2024 sheets embedded in `920000 Permits.pdf` remain immutable
  permit references. Ambiguous version evidence still requires estimator
  review.
- Cutover audit: drawing-authority blockers are cleared. Reader cutover remains
  blocked by native/OCR coverage on 46 of 179 usable plan pages and incomplete
  civil-geometry coverage/parity; the legacy Plan and Civil workflows still
  contain two duplicate PDF-upload paths pending later approved cutover stages.
- Automated domain tests: 124 passed
- Automated Helios security and boundary tests: 128 passed
- Domain TypeScript, Helios production build, shared OpsSlate production
  build, Convex code generation, and development function/schema
  synchronization: Passed
- Targeted ESLint: unavailable because the repository does not currently
  provide an ESLint 9 flat configuration; both production builds completed
  their configured prebuild checks and TypeScript validation
- Existing Document Intelligence, Plan Intelligence, WBS, Estimate Builder,
  Cockpit 2.0, Ask Helios, quantity, pricing, procurement, evidence, risk,
  schedule, and LandXML readers: Unchanged
- Original PDFs, accepted estimate decisions, owner quantities, fixed amounts,
  pricing, and production data: Unchanged
- Vercel deployment, production promotion, reader cutover, OCR implementation,
  and civil-geometry promotion: Not performed
- Approval gate: stop before Stage 3 canonical OCR and downstream reader
  cutover work

### Canonical-record cutover - Stage 3 canonical plan OCR

- Application checkpoint: `71018df`
- Scope: materialize OCR text only for canonical plan pages whose stored
  modality is scanned or hybrid and whose native text is insufficient
- Single-ingestion boundary: OCR reads the exact SHA-pinned canonical page
  render created in Stage 2; it cannot access an original PDF, OpenAI, PDFium,
  or either legacy downstream PDF-upload path
- Processing: versioned durable jobs, two-page bounded concurrency, three
  bounded attempts, stale-attempt protection, explicit processing phases, and
  safe recovery of interrupted work
- Provenance: every OCR span retains stable reading order, normalized bounds,
  confidence, canonical page locator, OCR engine/version, render SHA-256, and
  completion status
- Live Titus verification: 46/46 OCR-eligible pages ready, 1,578 canonical OCR
  spans, 91,040 OCR characters, and zero pending or failed OCR pages
- Canonical coverage: 179/179 usable plan pages have canonical text, 179/179
  have full-page renders, and 377/377 expected plan-view crops are current;
  the engineering record contains 57,206 total canonical text spans
- Drawing authority: zero unresolved blockers; the June 2026 bid sheets remain
  current and the February 2024 permit-package sheets remain references
- Parity audit: source, Document Intelligence, evidence, plan pages, plan
  views, references, and calibrations pass. Civil Geometry parity remains
  incomplete, so overall reader cutover remains blocked.
- Automated domain tests: 125 passed
- Automated Helios security and boundary tests: 129 passed
- Helios and shared OpsSlate production builds and independent web TypeScript
  validation: Passed
- Existing Document Intelligence, Plan Intelligence, Civil Geometry, WBS,
  Estimate Builder, Cockpit 2.0, Ask Helios, quantity, pricing, procurement,
  evidence, risk, schedule, and LandXML readers: Unchanged
- Original PDFs, accepted estimate decisions, owner quantities, fixed amounts,
  pricing, procurement, and production data: Unchanged
- Vercel deployment, production promotion, canonical-reader cutover, and
  legacy upload-path removal: Not performed
- Approval gate: stop before Civil Geometry canonical parity and any staged
  canonical-reader cutover

### Canonical-record cutover - Civil Geometry golden parity

- Application checkpoint: `638854a`
- Scope: complete the Titus authoritative Civil Geometry baseline, mirror it
  into immutable canonical provenance, and prove exact record parity before
  changing any application reader
- Golden authoritative run: 21/21 plan-source jobs completed, 50 reviewable
  Civil Geometry records produced, and zero failed jobs; 88 unresolved
  engineering issues remain visible for governed estimator review
- Canonical parity: 50 authoritative records equal 50 canonical records with
  zero missing, unexpected, or fingerprint-mismatched identities; all source,
  Document Intelligence, evidence, plan-page, view, calibration, reference,
  and Civil Geometry parity areas pass
- Cutover audit: `shadow_ready`, eight of eight downstream workflows eligible,
  zero parity or coverage blockers, 179/179 usable plan pages text-ready, and
  377/377 expected view crops current
- Drawing authority: Cutover and Euclid now share one authority adapter and the
  deterministic issued-for-bid-over-permit rule. ABT-1, EXB-1, and EXB-2 use
  the June 2026 bid sheets while the February 2024 permit-package sheets remain
  immutable references.
- Euclid result: 47 current-bid geometry records produce a contract-valid
  shadow model with 179 entities, 47 provenance links, and 11 bounded chunks;
  the three permit-reference geometry records are excluded
- Engineering state: the Euclid model is valid but conflicted. Horizontal,
  vertical, and integration checks retain blocking/review findings; nothing
  was auto-accepted, promoted, published, priced, or used to overwrite an
  estimate.
- Validation note: this golden baseline used the current legacy Civil Geometry
  path one final time. The two duplicate PDF/API workflows remain present until
  a separately approved canonical-reader cutover removes them.
- Automated domain tests: 125 passed
- Automated Helios security and boundary tests: 130 passed
- Shared OpsSlate and Helios production builds, independent web TypeScript,
  Convex function deployment, and stored cutover audit: Passed
- Existing Document Intelligence, Plan Intelligence, Civil Geometry, WBS,
  Estimate Builder, Cockpit 2.0, Ask Helios, takeoff, pricing, procurement,
  evidence, risk, schedule, and LandXML readers: Unchanged
- Original PDFs, accepted estimate decisions, owner quantities, fixed amounts,
  pricing, procurement, production data, and current domains: Unchanged
- Vercel deployment, production promotion, reader cutover, duplicate-path
  removal, geometry acceptance, canonical promotion, and LandXML: Not performed
- Approval gate: stop before the first staged canonical-reader cutover

### Canonical-record cutover - Stage 4 Plan reader pilot

- Application checkpoint: `adb7c75`
- Scope: Plan Intelligence read boundary only for the approved Titus Culvert
  Test development project; no other workflow or project was activated
- Stored activation: `ks7mx1mtpf0p9ye81y50j0knjx8bhb11`
- Canonical lineage: engineering record
  `g97swmhve755yktq1ca03rbnwh8bf7f0`, plan artifact
  `zs77wp6zp4swr8kkvbmj1gzmyx8bfqmj`, parity run
  `gs7rgt1s39n6gm1xkjqh9yfm258bfpy0`, and cutover audit
  `kd7m3r83kzedt5cq90txp480t18bemw2`
- Live exact verification: 898/898 fingerprint matches across 179 Plan pages,
  377 views, 66 calibrations, and 276 references
- Runtime verification: the normal tenant-authorized project query returned
  `reader.mode = canonical` and the complete 179-page Plan workspace
- Duplicate-call result for this reader: zero original-PDF reads and zero
  OpenAI calls
- Fail-closed controls: current package, plan run, engineering record,
  artifact, golden parity, cutover audit, drawing authority, provenance
  coverage, and every record fingerprint must continue to match
- Bid-day recovery: a Plan reconstruction, calibration, or drawing-authority
  change automatically records a rollback and returns the project to the
  unchanged legacy reader until fresh parity is explicitly approved
- Automated domain tests: 125 passed
- Automated Helios security and boundary tests: 131 passed
- Targeted Convex lint, shared UI boundary check, independent web TypeScript,
  Helios production build, shared OpsSlate production build, and Convex
  development deployment: Passed
- Existing PDF source files, Plan reconstruction writer, Civil Geometry,
  Document Intelligence, WBS, Estimate Builder, Cockpit 2.0, Ask Helios,
  takeoff, pricing, procurement, evidence, risk, schedule, and LandXML:
  Unchanged
- Vercel deployment, production promotion, Plan writer cutover, Civil Geometry
  reader/writer cutover, geometry acceptance, estimate mutation, and LandXML:
  Not performed
- Approval gate: stop before replacing the Plan reconstruction writer's
  PDF/OpenAI input with pinned canonical pages, text, and rendered assets

### Canonical-record cutover - Stage 5 Plan writer shadow

- Application checkpoint: `390fa90`
- Scope: additive, non-current Plan writer shadow only; no application reader,
  current Plan run, or downstream workflow was switched
- Stored full Titus pilot: `kx7ww521dtqctst5hfqp13bsns8bgf1f`
  with shadow run `yn7fqdsd4tcbdbwax3q3f3m6sx8bhhw6`
- Pinned input: canonical record `g97swmhve755yktq1ca03rbnwh8bf7f0`,
  authoritative Plan run `yn77ec908jczvxfxf64863b2k98betzd`, 179
  canonical pages, 20 render-only pages, and 60 bounded page batches
- Single-ingestion boundary: each shadow batch reads only canonical text spans
  and `page_render` storage assets; original-PDF reads and PDF uploads are zero
- Traceability: batch-local model page identities are coverage-validated and
  remapped to the immutable source document and original physical-page locator
- Fail-closed result: all 60 provider calls returned `insufficient_quota`; the
  stored pilot failed with zero accepted shadow pages and no activation
- Diagnostic canary: pilot `kx7w5w64aaycfbhnn872p35bn98bgt3q`, shadow run
  `yn77zw1ca5f66w3mz0j7a33n5d8bg6bd`, confirmed the same provider quota gate
  on one pinned render-only page while retaining the exact failure reason
- Automated Helios security and boundary tests: 132 passed
- Targeted Convex lint, shared UI boundary check, independent web TypeScript,
  Helios production build, shared OpsSlate production build, and Convex
  development deployment: Passed
- Existing Plan reader activation, authoritative Plan writer, Document
  Intelligence, Civil Geometry, WBS, Estimate Builder, Cockpit 2.0, Ask
  Helios, takeoff, pricing, procurement, evidence, risk, schedule, and LandXML:
  Unchanged
- Original PDFs, canonical engineering records, drawing-authority decisions,
  estimates, quantities, prices, procurement, and current domains: Unchanged
- Vercel deployment, production promotion, writer activation, legacy PDF-path
  removal, Civil Geometry cutover, estimate mutation, and LandXML: Not performed
- Approval gate: restore available OpenAI API quota, run one passing canonical
  page canary, then run and review complete Titus shadow parity before enabling
  the canonical Plan writer

### Canonical-record cutover - Stage 5A Titus semantic comparison

- Application checkpoint: `3b9a9d6`
- Passing canary: pilot `kx7rxtfft3rz4rvxsdaq8v1gch8bh0te`, shadow run
  `yn76b92z5c88meytcerf6h8vk18bh2yt`; one canonical page completed with exact
  page identity and zero original-PDF reads
- Full Titus comparison: pilot `kx7pn7v50jbgmqcmjvwwvsgpvx8bgcc8`, shadow run
  `yn74y6pg0venqgys71ysrhtphh8bhp4t`, authoritative run
  `yn77ec908jczvxfxf64863b2k98betzd`, canonical record
  `g97swmhve755yktq1ca03rbnwh8bf7f0`
- Single-ingestion result: all 60 batches completed; 179/179 canonical pages
  and immutable document/page identities were preserved; 20 render-only pages
  were handled; original-PDF reads remained zero
- Metadata comparison: page kind 179/179, sheet number 177/179, printed page
  number 126/179, discipline 93/179, issue date 92/179, title 34/179, revision
  marker 6/179, and exact full metadata 0/179
- Structural comparison: authoritative 377 views and 276 references versus
  shadow 506 views and 716 references; specification references increased from
  90 to 378 and continuation references from 3 to 95
- Safety result: the pilot is stored as `ready_for_review` with
  `activationEligible: false` and `semanticReviewRequired: true`; the legacy
  Plan writer and current Plan run remain authoritative
- Automated Helios security and boundary tests: 132 passed
- Targeted Convex lint, independent web TypeScript, shared UI boundary check,
  Convex development deployment, and stored Titus re-evaluation: Passed
- Existing Document Intelligence, Plan reader, Civil Geometry, Euclid model,
  WBS, Estimate Builder, Cockpit 2.0, Ask Helios, takeoff, pricing,
  procurement, evidence, risk, schedule, LandXML, and current domains:
  Unchanged
- Vercel deployment, production promotion, writer activation, legacy PDF-path
  removal, geometry cutover, estimate mutation, and LandXML: Not performed
- Next approval gate: deterministic metadata authority, semantic normalization,
  relationship deduplication, and global reconciliation must be implemented and
  the full Titus parity run repeated before activation is reconsidered
