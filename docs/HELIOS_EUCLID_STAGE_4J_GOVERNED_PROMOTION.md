# Helios Euclid Stage 4J — Governed Canonical Promotion

**Status:** Complete  
**Completed:** July 29, 2026  
**Code checkpoint:** `806c37b` (`feat(helios): add governed Euclid promotion`)

## Outcome

Stage 4J adds the governed boundary that converts an estimator-reviewed Euclid candidate into a new canonical engineering-model version. It does not overwrite the ingestion model, alter the original PDFs, or publish quantities, estimate data, procurement data, schedules, or LandXML.

## Promotion gate

A promotion is permitted only when all of the following remain current and match by stored fingerprint:

1. The source Euclid model is the current, contract-valid model for the project and bid-package revision.
2. The reviewed candidate belongs to that exact source model and review set.
3. The Stage 4I validation belongs to that exact source/candidate/review lineage.
4. The validation status is `passed` and `validationPassed` is true.
5. The validation contains zero degraded engineering results.
6. The estimator's current review-set fingerprint still matches the candidate.

Any stale, incomplete, review, blocked, not-applicable, or degraded result fails closed.

## Persistence and traceability

Promotion creates:

- a new immutable `heliosEuclidModels` record with canonical version `N + 1`;
- `canonicalOrigin: reviewed_candidate` and `shadowMode: false`;
- fingerprint-verified entity chunks reconstructed from the reviewed candidate;
- copied canonical provenance that continues to point to the original engineering pages and immutable source PDFs;
- an append-only `heliosEuclidPromotions` lineage record containing source, candidate, validation, review-set, and promoted-model fingerprints.

The prior canonical model and its current solver results are marked superseded, not deleted. Repeated delivery of the same valid promotion is idempotent and returns the existing promotion.

## Deterministic solver continuation

The promoted canonical version is sent only to the existing deterministic horizontal and vertical Euclid solvers. Their resulting horizontal, vertical, and integrated engineering-graph records inherit the promoted model's non-shadow state. No PDF is re-read and no OpenAI request is made during promotion or solver reconstruction.

## Estimator workflow

The Civil Geometry cockpit now shows:

- the current canonical version;
- whether it originated from ingestion or estimator promotion;
- the promoter and timestamp for a promoted version;
- a one-click **Promote canonical vN** action only when the current Stage 4I result passes every promotion gate.

Promotion errors are shown in context. The cockpit refreshes to the new canonical version after a successful action.

## Security boundary

The promotion endpoint requires:

- an authenticated Helios principal;
- same-origin request validation;
- server-side company and project ownership checks;
- exact source, candidate, review-set, and validation fingerprints.

Company identifiers and authority are derived on the server. The browser cannot select a tenant or bypass the promotion gate.

## Explicitly not activated

Stage 4J does not write or publish:

- governed takeoff quantities;
- estimate quantities or costs;
- procurement or RFQ records;
- production or scheduling records;
- LandXML or CAD exchange files.

Those remain separate future governed boundaries.

## Verification

- Helios domain tests: **111 passed**
- Helios application and boundary tests: **120 passed**
- Helios lint: **passed**
- Helios production build: **passed**
- OpsSlate web production build: **passed**
- Convex schema generation and TypeScript bindings: **passed**
- `git diff --check`: **passed**

## Acceptance result

Stage 4J passes when a reviewer can prove that only a current, exact, non-degraded Stage 4I candidate can create canonical version `N + 1`, all prior versions and source evidence remain recoverable, and every downstream publication surface remains disabled. The implemented boundary satisfies those conditions.
