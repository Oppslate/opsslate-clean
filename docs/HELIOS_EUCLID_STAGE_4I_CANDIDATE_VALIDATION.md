# Helios Euclid Stage 4I — Candidate Validation

## Outcome

Stage 4I independently reruns the deterministic Euclid engineering pipeline
against the immutable Stage 4H reviewed candidate and compares the result with
the current immutable source model. It gives the estimator an evidence-backed
engineering delta report before any future promotion decision.

Stage 4I does not replace the canonical Euclid model, publish quantities,
change an estimate or schedule, or create a LandXML exchange file.

## Validation contract

Every validation is bound to:

- the current source Euclid model and its model fingerprint;
- the immutable engineering source fingerprint;
- one current Stage 4H candidate and its candidate fingerprint;
- the exact Stage 4G review-set fingerprint used to build that candidate;
- the horizontal, vertical, and engineering-graph solver versions;
- the candidate validator and validator version;
- one normalized request identity and deterministic validation fingerprint.

The mutation reconstructs both models from their persisted, fingerprinted
records. It does not reread a PDF, call OpenAI, or accept geometry from the
browser.

## Deterministic rerun

The validator executes the existing engineering pipeline twice:

1. Stage 4C horizontal control against the immutable source model;
2. Stage 4D vertical profiles against the immutable source model;
3. Stage 4E relationships and readiness against the immutable source model;
4. the same Stage 4C, 4D, and 4E solvers against the reviewed candidate.

The resulting fingerprints, status counts, checks, residuals, readiness, and
engineering deltas are persisted separately from both models. Delta records
classify each change as improved, degraded, or changed. A degraded or blocked
engineering result fails closed.

## Immutable persistence

Stage 4I adds two tenant- and project-scoped records:

- `heliosEuclidCandidateValidations` stores source, candidate, review-set,
  solver, result, and validation identities plus status and summary counts;
- `heliosEuclidCandidateValidationChunks` stores bounded fingerprinted
  horizontal checks, vertical checks, integration checks, readiness, and delta
  payloads.

There is no update, replace, or delete path. Exact request retries resolve to
the existing result, and an already validated candidate/review pair reuses the
same immutable validation.

## Estimator workflow

The approved three-panel Civil Geometry cockpit remains the primary workspace.
The reviewed-candidate card now provides one-click **Validate candidate** after
Stage 4H reports the current candidate as ready for validation.

The card displays:

- validation status and whether it is current;
- horizontal, vertical, and engineering-graph status;
- changed, improved, and degraded counts;
- compact engineering deltas;
- the first blocking reason when validation cannot pass.

If the review set or candidate changes, the prior result is displayed as stale
and a new candidate must be validated. The browser cannot mark a validation as
passed or current.

## Security and stale-data protection

- Authentication and company identity use the existing Helios gateway
  principal.
- Same-origin protection is enforced at the Helios route.
- Company and project ownership are reauthorized inside the Convex mutation.
- Current source model, source fingerprint, candidate fingerprint, and
  review-set fingerprint are reverified before execution.
- Every candidate chunk is count- and fingerprint-verified before
  reconstruction.
- The frozen Euclid contract and complete candidate fingerprint are rechecked.
- `promotionEligible` and `downstreamEligible` are always `false` in Stage 4I.

## Acceptance evidence

- Euclid domain tests: 108 passed.
- Helios security and boundary tests: 116 passed.
- Domain TypeScript build: passed.
- Helios lint and production build: passed.
- Shared OpsSlate production build: passed.
- Convex schema, functions, and generated bindings: passed and synchronized to
  the existing development deployment.
- Browser QA passed at desktop `1440 × 900`, tablet `1024 × 768`, and mobile
  `390 × 844`, with no horizontal overflow or application console errors.
- The current Titus project honestly remains in `awaiting_model`; no geometry,
  candidate, or validation result was fabricated for demonstration.
- React review found no new dependency, effect-driven network request, async
  client component, unstable list key, or unguarded mutation path.

## Deferred work

Stage 4I stops before candidate promotion. It does not create a new canonical
model version or allow candidate geometry to drive quantity, estimate,
procurement, schedule, equipment, historical-cost, or LandXML consumers.

The next safe stage is Stage 4J: define and implement a governed estimator
promotion gate that can create a new canonical Euclid version only from a
current, passing Stage 4I validation. Downstream publication remains a separate
later approval boundary.
