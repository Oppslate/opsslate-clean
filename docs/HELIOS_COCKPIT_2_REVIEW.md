# Helios Cockpit 2.0 Review

Status: implemented and locally verified

Application checkpoint: `60a9ea8`

Deployment boundary: local Helios application only; no Vercel or production
deployment

## Outcome

Cockpit 2.0 connects the live estimator records from Foundations 3E.1 through
3E.4 into the approved three-panel OpsSlate workflow. The PDF is no longer the
primary work surface. The estimator now works from the structured estimate and
opens source evidence only when it is needed.

The cockpit provides:

- a priority-sorted bid review queue for scope, quantity, pricing,
  procurement, evidence, and risk;
- a live stacked estimate organized as section, owner item, cost code, and
  resource;
- contextual proof, risk, procurement, and append-only history;
- readiness coverage for estimate review, quantities, pricing, quotes,
  evidence, and risk decisions;
- one-click contextual acceptance, verification, risk carry, and lifecycle
  actions; and
- a persistent desktop decision dock that remains visible during real bid-day
  review.

## Data and security boundary

The project route obtains the current estimate workspace through the existing
server-side Helios gateway in parallel with the project record. The cockpit
does not accept a company identifier, bypass tenant authorization, or create a
parallel data store.

All decisions use the existing secured estimate review, build, and support
routes. Server-side version, project, company, current-package, and hierarchy
checks remain authoritative. The cockpit contains no mock estimate data and
does not generate pricing.

## Bid-day interaction contract

- Filter any review lane: one click.
- Select an estimate or review record: one click.
- Accept proposed scope, resource, or quantity: one click.
- Verify evidence: one click.
- Set a risk carry decision: one click.
- Advance an RFQ or submittal state: one click.
- Draft an RFQ or add a submittal from accepted scope: one click.
- Open the detailed cost-code worksheet or protected source: one click.

## Verification evidence

- 51 Helios security, workflow, and UI-boundary tests passed.
- Helios ESLint passed without warnings.
- Optimized Next.js production build passed.
- Desktop `1395 × 837`, tablet `1024 × 768`, and mobile `390 × 844`
  rendered with zero document-level horizontal overflow.
- Desktop panels rendered together with the decision dock visible without
  page scrolling.
- Tablet panels use bounded internal scrolling and preserve the queue/estimate
  working relationship.
- Mobile uses the shared navigation drawer and a bounded stacked workflow.
- The Evidence readiness control was verified to filter the real queue from
  150 actions to 50 and expose its pressed state.
- Selecting an evidence review card updated the proof context and decision
  dock without a navigation or page reload.
- Design comparison and responsive evidence are recorded in `design-qa.md`
  and `docs/evidence/helios-cockpit-2-*.png`.

## Explicitly not performed

- No Vercel preview or production deployment.
- No production-domain change.
- No estimate, price, quantity, evidence, risk, RFQ, submittal, or project
  record was changed during browser verification.
- No OpsSlate handoff was started.

## Next recommended milestone

Foundation 3E.5 should implement the deterministic Bid Readiness Gate that
turns the cockpit coverage metrics into enforceable review blockers. It should
prevent bid review from advancing while required owner items, production
quantities, prices, quote decisions, evidence disputes, or risk carry decisions
remain unresolved, while still allowing an estimator to record an explicit,
audited exception.
