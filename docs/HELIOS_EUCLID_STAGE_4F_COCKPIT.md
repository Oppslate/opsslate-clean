# Helios Euclid Stage 4F — Civil Geometry Cockpit

## Outcome

Stage 4F adds the first estimator-facing Civil Geometry workspace. It is a
read-only view of the canonical Euclid engineering record produced by Stages
4A through 4E. It does not reread plans, call OpenAI, calculate quantities,
publish estimate data, edit geometry, or export LandXML.

## Data boundary

The cockpit reads one tenant-authorized workspace assembled from:

- the current canonical Euclid model and its fingerprint-verified chunks;
- the current horizontal and vertical control solutions;
- the current Stage 4E engineering graph and fingerprint-verified chunks;
- project identity and immutable source-document provenance.

The API returns one selected alignment in detail while retaining a compact
inventory of every alignment. This bounds the response size without breaking
cross-alignment navigation or traceability.

The original PDF remains the immutable source of truth. Evidence references
retain the document, page, sheet/view, citation, and source locator needed to
open the protected source page.

## Estimator workflow

The shared Helios navigation now exposes **Civil Geometry**. A project cockpit
also provides a direct Civil Geometry action.

At desktop width the workspace uses the approved three-panel OpsSlate pattern:

1. **Alignment inventory** — select a horizontal alignment and see its
   readiness, station range, control-point count, and linked profile.
2. **Engineering workspace** — inspect horizontal control, vertical profiles,
   typical/cross sections, structures, inverts, and material layers.
3. **Intelligence rail** — inspect quantity readiness, validation checks,
   evidence, conflicts, assumptions, and limitations.

Tablet and mobile layouts preserve the same information and stack the panels
without document-level horizontal scrolling.

## Honest states

- `awaiting_model`: no canonical Euclid model exists yet; the estimator can
  return to project processing or Ask Helios.
- `awaiting_solution`: the canonical model exists but the Stage 4E engineering
  graph is not yet current.
- `available`: the current model and engineering graph passed storage and
  fingerprint validation.
- `failed`: the current engineering graph failed; the cockpit exposes the
  failure without substituting inferred or mock geometry.

## Security and integrity

- Authentication uses the existing Helios gateway principal.
- Company access is derived on the server and checked against the project.
- Browser-supplied company identifiers are not accepted.
- Model and engineering-graph chunks are reconstructed only after count and
  fingerprint validation.
- No mutation route was added for Stage 4F.

## Acceptance evidence

- Domain contract and builder tests cover honest empty state and traceable
  selected-alignment data.
- Helios boundary tests verify authentication, tenant isolation, canonical-only
  reads, read-only scope, shared OpsSlate components, and direct project access.
- Domain, Helios, and shared web production builds pass.
- Convex schema/function validation passes.
- Browser QA passes at desktop, tablet, and mobile widths with no horizontal
  overflow and no application runtime errors.

## Deferred work

Stage 4F intentionally defers governed geometry corrections, estimator
acceptance, quantity publication, and LandXML export. The next safe stage is a
governed review-and-correction layer that records estimator decisions without
altering immutable source evidence.
