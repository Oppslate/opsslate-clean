# Helios Euclid Stage 4G — Governed Geometry Review

## Outcome

Stage 4G adds estimator governance to the Civil Geometry cockpit without
changing the canonical Euclid model. Estimators can accept a geometry record
in one click or record a correction, deferral, or rejection with an auditable
reason. Decisions are append-only review records; they do not patch source
geometry, publish quantities, change estimates, or activate LandXML export.

## Review contract

The shared domain contract defines four actions:

- `accept`: one-click confirmation; no reason is required;
- `correct`: requires a reason and one or more entity-specific field changes;
- `defer`: requires a reason and leaves the geometry unresolved;
- `reject`: requires a reason and records that the source interpretation is
  unsuitable for downstream use.

Review is available for alignments, control points, horizontal elements,
station equations, profiles, profile points, vertical tangents, vertical
curves, typical sections, structures, inverts, and material layers.
Correction fields are allowlisted by entity type. The server rejects arbitrary
paths, unsupported value types, missing reasons, and empty corrections.

## Integrity boundary

Every request carries the current:

- Euclid model identity and model fingerprint;
- immutable source fingerprint;
- target entity identity, type, and target fingerprint;
- client request identity.

The server reauthorizes the signed-in tenant, reconstructs the current
fingerprint-verified Euclid model, locates the requested entity, and recalculates
its fingerprint before writing a decision. A changed model or entity fails
closed and instructs the estimator to reload. Reusing a request identity with
different content is rejected; an exact retry returns the existing decision.

## Persistence and traceability

`heliosEuclidReviewDecisions` stores one immutable row per decision with:

- company, project, package, revision, and Euclid model identity;
- request, model, source, target, and decision fingerprints;
- action, reason, constrained correction payload, and the complete pre-decision
  entity snapshot;
- reviewer identity and decision time.

The cockpit folds the append-only history to show the latest decision for each
entity while preserving all earlier decisions in storage. No update or delete
path was added.

## Estimator workflow

The approved three-panel Civil Geometry cockpit remains intact. The right
intelligence rail now begins with the governed review queue and current review
summary:

1. select geometry from the existing alignment and engineering workspace;
2. accept the source interpretation in one click when it is correct;
3. use **Review** only when a correction, deferral, or rejection is needed;
4. enter the constrained correction and reason, then record the decision;
5. the cockpit refreshes from the server and displays the current governed
   status.

The existing readiness, evidence, conflicts, assumptions, and limitations stay
available below the review queue.

## Security

- Authentication and company identity use the existing Helios gateway
  principal.
- Browser-supplied company identifiers are not accepted.
- Project and current-model ownership are verified within the mutation.
- Same-origin protection remains enforced by the Helios API gateway.
- The route exposes no PDF, OpenAI, storage, quantity, estimate, or export
  operation.

## Acceptance evidence

- Euclid domain tests: 102 passed.
- Helios security and boundary tests: 109 passed.
- Helios lint: passed.
- Domain, Helios, and shared OpsSlate production builds: passed.
- Convex schema and generated bindings include the review mutation.
- Browser QA passed at desktop, tablet, and mobile widths with no horizontal
  overflow or application runtime errors.
- The current Titus project honestly remains in `awaiting_model`; no fake
  Euclid entity was created to demonstrate review controls.

## Deferred work

Stage 4G does not apply corrections to a new canonical model, recalculate
geometry, publish governed quantities, update an estimate, or export LandXML.
Those actions require a separate approval-controlled stage that consumes only
reviewed geometry and preserves the original decision lineage.
