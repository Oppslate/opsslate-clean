# Helios Foundation 4B Review

Status: implemented and verified in the Helios development environment

Scope: bid-basis profiling and capability-specific document control only.
Foundation 4C plan-set reconstruction and Foundation 4D quantity intelligence
remain gated.

## Delivered outcome

Helios now determines what was actually issued for each package revision and
opens the existing estimate workflow when at least one usable scope basis is
present. Plans and specifications are no longer a mandatory pair. Plans-only,
specifications-only, written-scope-only, plans-and-specifications, and
mixed/other packages all have an explicit, revision-specific profile.

The work is additive. It does not replace or rewrite the approved estimator,
contractor WBS, Cockpit 2.0, pricing, procurement, risk register, or Foundation
3C document-intelligence records.

## Bid-basis control model

The active revision records ten independently governed categories:

- plans;
- specifications;
- written scope;
- owner bid schedule;
- proposal and bid forms;
- addenda;
- geotechnical information;
- utilities;
- environmental and permit documents; and
- referenced standards and details.

Each category retains one availability state: `received`, `not_issued`,
`expected_missing`, `unknown`, `not_applicable`, or `superseded`. Automatic
reasoning may infer `received`, `expected_missing`, or `unknown`; only an
estimator decision can assert `not_issued` or `not_applicable`.

Processing is separately expressed as `uploaded`, `validated`, `classified`,
`indexed`, or `ready`. File counts are exact. Until a verified PDF metadata
count is available, Helios reports the highest evidence-indexed PDF page and
states that the exact page/sheet count is not established. It never promotes a
citation count into a fabricated document-page total.

## Classification evidence

The classifier uses, in order:

1. estimator document corrections;
2. existing AI document-intelligence finding categories;
3. filename, retained folder path, and AI document type;
4. the canonical intake source category; and
5. a conservative supporting/reference classification when no stronger signal
   exists.

Project and document findings also identify referenced-but-missing source sets.
For example, received permit exhibits can coexist with a visible warning that
the complete construction plan set is unavailable. That condition limits plan
takeoff without closing the estimate.

## Capability readiness

Five capabilities are evaluated independently:

| Capability | Required basis | Missing-basis behavior |
| --- | --- | --- |
| Estimate workspace | Plans, specifications, or written scope | Unavailable only when no usable scope basis exists |
| Plan takeoff and spatial reasoning | Usable plan evidence | Unavailable or limited; estimate remains open |
| Specification compliance | Usable specification evidence | Unavailable or limited; estimate remains open |
| Owner item reconciliation | Owner bid schedule | Unavailable; contractor WBS remains usable |
| Bid submission review | Proposal and bid forms | Limited; estimating may continue |

Overall workspace readiness is `estimate_ready`,
`estimate_ready_with_limitations`, or `no_usable_scope_basis`. Unsupported
quantities remain unknown or takeoff-required under the existing estimator
contract; they never become zero.

## Estimator workflow

- The project screen presents the active profile and five capability states
  above the existing cockpit or intake workspace.
- `Proceed with available basis` is one click and is remembered per package
  revision.
- Common `Not issued` and `N/A` category decisions are one click and create a
  standard audit reason.
- Profile correction and document reclassification use one focused review
  dialog with a required reason.
- The estimate proposal mutation revalidates the current tenant, project,
  active package, usable scope basis, and recorded proceed decision on the
  server. Direct navigation cannot bypass the gate.
- New package revisions receive independent profiles; prior classifications
  and decisions are retained rather than overwritten.

## Security and audit controls

- Existing Clerk-verified Helios identity, same-origin mutation checks, signed
  gateway calls, role enforcement, tenant derivation, and project ownership
  checks remain mandatory.
- Document correction verifies company, project, package, and active package
  entry relationships before mutation.
- Current profile state is stored per project/package/revision.
- Document corrections are stored separately from immutable source files and
  AI intelligence.
- Every proceed, confirmation, correction, category decision, and document
  reclassification creates an append-only event with before/after value,
  reason when applicable, reviewer, and timestamp.

## Verification record

- Helios domain build and tests: passed
- Helios lint and production build: passed
- Helios boundary tests: passed, including origin/session/tenant enforcement,
  revision persistence, estimate gating, and one-click review controls
- Existing cockpit, estimator, WBS, quantity, pricing, procurement, evidence,
  risk, authentication, intake, and document-intelligence regression tests:
  passed
- Convex schema and function generation: passed
- Convex development schema/functions: updated at `kindly-tiger-289`
- Authenticated browser verification: the real project rendered the new profile,
  category counts, five capability states, one-click proceed control, and the
  complete correction dialog without a framework error overlay; no estimator
  decision was submitted during verification
- Vercel preview, production promotion, and domain changes: not performed

## Exit decision

Foundation 4B is complete when the checkpoint is committed and tagged. The next
approved build is Foundation 4C plan-set reconstruction: sheet inventory,
title-block and revision interpretation, spatial graph creation, and drawing-
set completeness controls without changing the existing estimator contracts.
