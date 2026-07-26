# Helios Foundation 3E.4 Review

Status: implemented and locally verified

Application checkpoint: `db4cec6`

Deployment boundary: isolated Convex development backend only; no Vercel or
production deployment

## Outcome

Foundation 3E.4 connects evidence, procurement preparation, submittal control,
and risk decisions to the same canonical estimate records introduced in 3E.1
through 3E.3. These are governed estimator records rather than detached AI
findings.

The estimator now provides:

- an evidence matrix linking citations to exact estimate records;
- one-click RFQ and submittal creation from accepted cost-code scope;
- RFQ and submittal lifecycle registers;
- a structured risk register with three-point cost and schedule exposure;
- direct one-click carry decisions for real bid-day review; and
- append-only human decision history for every supporting-record mutation.

## Governing controls

Every mutation reauthorizes the independent Helios session, company, project,
estimate, current estimate version, current bid-package revision, and linked
parent hierarchy. Browser-supplied company identifiers are not accepted.

Evidence verification is allowed before scope acceptance because verification
is part of review. RFQ and submittal generation is deliberately stricter: the
linked owner item and cost code must already be accepted or corrected.

AI-generated scope, citations, and risks remain proposed. Prices are not
generated. Accepted estimate versions are not silently overwritten.

## Bid-day interaction contract

- Verify evidence: one click.
- Dispute evidence: one focused reason dialog.
- Draft RFQ from accepted cost code: one click.
- Add submittal from accepted cost code: one click.
- Advance RFQ or submittal lifecycle: one click per explicit state change.
- Record risk carry decision: one click.
- Edit structured exposure or response: one focused dialog.
- Reject a governed record: one focused reason dialog.

## Verification evidence

- 21 Helios domain tests passed.
- 47 Helios security, workflow, and UI-boundary tests passed.
- Helios ESLint passed.
- Convex schema generation and function synchronization passed.
- Optimized Next.js production build passed with the protected support route.
- React component-quality review passed against the shared OpsSlate primitive
  boundary.
- Live Seneca estimate rendered 139 evidence links and 19 structured risks.
- RFQ and submittal empty states rendered with accurate first-action guidance.
- Desktop, 820 px tablet, and 390 px mobile rendered without page-level
  horizontal overflow.
- Existing saved estimates without 3E.4 collections load through a defensive
  compatibility adapter.

## Explicitly not performed

- No Vercel preview or production deployment.
- No production-domain change.
- No price, quantity, scope, risk, RFQ, submittal, or estimate decision was
  changed during live verification.
- No OpsSlate handoff was started.

## Next recommended milestone

Foundation 3E.5 should add estimate completeness and review gates across owner
items, quantities, resources, RFQs, submittals, evidence disputes, and risk
carry decisions. It should reconcile unresolved procurement and risk exposure
against pricing readiness before bid review can begin.
