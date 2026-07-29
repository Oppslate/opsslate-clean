# Helios Euclid Stage 4H — Reviewed Geometry Candidate

## Outcome

Stage 4H converts the current Stage 4G review ledger into a new immutable
reviewed-geometry candidate. The original canonical Euclid model remains
unchanged and continues to be the source record. The candidate is a traceable
working copy that applies only estimator-accepted or allowlisted corrected
values and is prepared for a later deterministic validation stage.

Stage 4H does not publish quantities, alter an estimate, replace the canonical
model, update a schedule, or export LandXML.

## Candidate contract

Each candidate is bound to:

- the current Euclid model identity and model fingerprint;
- the immutable engineering source fingerprint;
- the folded latest Stage 4G decision for every reviewable entity;
- a deterministic review-set fingerprint;
- a deterministic candidate fingerprint;
- the complete decision lineage used to create the candidate;
- the candidate builder and builder version.

Candidate build requests are normalized and assigned a request identity. An
exact retry returns the existing result. Reusing a request identity for a
different review set fails closed.

## Review application rules

The builder first clones the source Euclid model. It never changes the source
object or the stored canonical model.

- **Accepted** entities retain their engineering values and become accepted in
  the candidate.
- **Corrected** entities receive only the field changes previously validated
  by the Stage 4G entity-specific allowlist.
- **Deferred** entities remain unresolved and block deterministic validation.
- **Rejected** entities remain traceable and block deterministic validation.
- **Unreviewed** entities remain unresolved.

The candidate is `ready_for_validation` only when every reviewable Euclid
entity is accepted or corrected and the frozen Euclid contract remains valid.
This status does not mean the model is downstream-ready. Horizontal, vertical,
and relationship solvers must still run against the candidate in a later
stage.

## Immutable persistence

Stage 4H adds three tenant- and project-scoped records:

- `heliosEuclidReviewCandidates` stores the candidate identity, fingerprints,
  status, counts, blocking reasons, and builder provenance;
- `heliosEuclidReviewCandidateChunks` stores the complete candidate model as
  deterministic bounded entity chunks;
- `heliosEuclidReviewCandidateDecisions` joins every candidate to every review
  decision used to produce it.

There is no update or delete operation for these records. A changed review set
creates or resolves to a different immutable candidate.

## Estimator workflow

The approved three-panel Civil Geometry cockpit remains intact. A
**Reviewed candidate** control appears in the right intelligence rail when a
canonical Euclid model is available.

1. Review geometry using the existing Stage 4G controls.
2. Build the reviewed candidate in one click.
3. Inspect its review resolution, correction count, status, and first blocking
   reason.
4. If review decisions change, refresh the candidate to create the new
   immutable version.
5. Continue to deterministic validation only after the candidate reports
   `ready_for_validation`.

The control never promotes the candidate or publishes quantities, estimates,
or exchange files.

## Security and stale-data protection

- Authentication and company identity use the existing Helios gateway
  principal.
- The browser cannot supply or override the company identity.
- Same-origin protection is enforced at the Helios route.
- Project ownership, current model identity, model fingerprint, and source
  fingerprint are reverified inside the mutation.
- Every review decision is rechecked against its current target fingerprint.
- Cross-project candidate reuse is rejected.

## Acceptance evidence

- Euclid domain tests: 105 passed.
- Helios security and boundary tests: 113 passed.
- Domain TypeScript build: passed.
- Helios lint and production build: passed.
- Shared OpsSlate production build: passed.
- Convex schema, functions, and generated bindings: passed and updated in the
  development deployment.
- Browser QA passed at desktop `1440 × 900`, tablet `1024 × 768`, and mobile
  `390 × 844`, with no horizontal overflow or application runtime errors.
- The current Titus project honestly remains in `awaiting_model`; no fake
  Euclid model or reviewed candidate was created for demonstration.

## Deferred work

Stage 4H stops before recomputing the horizontal, vertical, and relationship
solutions against the reviewed candidate. It also stops before comparison to
the source model, candidate promotion, governed quantity publication, estimate
updates, scheduling, equipment planning, historical cost use, or LandXML
export.

The next safe stage is Stage 4I: run the deterministic Euclid solvers against
the immutable reviewed candidate, preserve their outputs separately, and show
the estimator the engineering deltas before any promotion decision.
