# Helios Euclid Stage 4K — Governed Quantity Publication

**Status:** Complete

**Completed:** July 29, 2026

**Code checkpoint:** `83a877c` (`feat(helios): publish governed Euclid quantities`)

## Outcome

Stage 4K creates the first governed downstream boundary from the promoted canonical Euclid engineering model into the existing Helios estimate. It calculates deterministic quantity candidates from stored canonical geometry and allows an authenticated estimator to map one candidate to one existing estimate cost code.

The result is always a new **proposed** estimate quantity. Stage 4K does not overwrite owner bid quantities, accepted estimator decisions, resources, pricing, schedules, procurement records, or LandXML.

## Eligibility gate

Quantity publication is permitted only when all of the following remain current and fingerprint-matched:

1. The Euclid model is contract-valid, accepted, non-shadow, and the current project model.
2. The model originated from a governed Stage 4J reviewed-candidate promotion.
3. The Stage 4E integration solution belongs to that exact model and has status `passed`.
4. The individual capability readiness row has status `ready`.
5. The deterministic candidate ID and fingerprint still match the current model and integration solution.
6. The receiving estimate, section, owner pay item, and cost code are current, tenant-owned, and reviewable.
7. A production publication uses the same unit as the receiving cost code's production unit.

Any stale, shadow, ingestion-only, review, blocked, failed, unit-mismatched, or rejected lineage fails closed.

## Deterministic quantity methods

Stage 4K currently produces:

- horizontal alignment length from accepted horizontal-element lengths;
- structure counts grouped by accepted canonical structure type;
- material-layer area from accepted station limits and offsets;
- material-layer volume from the accepted footprint and normalized thickness;
- excavation and embankment volumes as separate results using average-end-area integration of matching existing and design cross sections.

Earthwork sign changes are split at the zero crossing so excavation and fill are not netted together. US-foot results publish length in `FT`, area in `SF`, and volume in `CY`; metric results use `M`, `SM`, and `M3`.

Profile elevations, corridor state, and drainage connectivity remain useful engineering controls but are not published as quantities until they have explicit quantity semantics.

## Persistence and traceability

Each successful action creates:

- one new `heliosEstimateQuantities` record with `quantityType: plan`, `reviewStatus: proposed`, and `origin: human`;
- one append-only `heliosEuclidQuantityPublications` lineage record containing the canonical model, integration solution, readiness, candidate, calculation, estimate, cost-code, entity, provenance, publisher, and fingerprint identities;
- one append-only `heliosEstimateDecisionEvents` entry identifying the estimator and proposed result.

The publication mutation contains no patch, replace, or delete operation. An exact retry is idempotent. Reusing the same request or candidate with conflicting lineage is rejected.

## Estimator workflow

The existing three-panel Civil Geometry cockpit now shows quantity candidates for the selected alignment. The estimator selects **Send to estimate**, maps the result to an existing cost code, and chooses:

- **Comparative** — retain the value as an estimate check; or
- **Production** — make it eligible to drive production calculations after normal estimate approval.

The dialog displays the value, unit, formula, method, confidence, and protected-record explanation. Published candidates show their receiving cost code and cannot be sent a second time from the same canonical model.

## Security and single-ingestion boundary

The endpoint requires same-origin validation, an authenticated Helios principal, and server-side company/project ownership checks. Company identity is never accepted from the browser.

Stage 4K reconstructs fingerprint-verified canonical Euclid and integration chunks. It does not access OpenAI, reread a PDF, upload a file, or access object storage.

## Explicitly unchanged

- immutable source PDFs and canonical provenance;
- owner bid quantities and fixed owner amounts;
- accepted/corrected estimate decisions;
- resource quantities, rates, pricing, and markups;
- procurement, RFQ, risk, and scheduling records;
- LandXML and CAD exchange.

## Verification

- Helios domain tests: **114 passed**
- Helios application and security-boundary tests: **124 passed**
- Helios lint: **passed**
- Helios production build: **passed**
- OpsSlate web production build: **passed**
- Convex schema generation, TypeScript bindings, and development synchronization: **passed**
- `git diff --check`: **passed**
- Vercel deployment: **not performed**

## Acceptance result

Stage 4K passes when a reviewer can prove that only a current, promoted, passing, readiness-approved Euclid result can create a new proposed estimate quantity; every result retains complete geometry-to-estimate lineage; exact retries are idempotent; and no owner quantity, price, accepted decision, source PDF, or unrelated workflow is modified. The implemented boundary satisfies those conditions.
