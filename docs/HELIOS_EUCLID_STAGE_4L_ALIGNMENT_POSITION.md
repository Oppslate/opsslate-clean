# Helios Euclid Stage 4L — Deterministic 3D Alignment Position

**Status:** Complete
**Checkpoint date:** August 1, 2026

## Purpose

Stage 4L adds the general alignment-position evaluator needed before surface, solid, and quantity reconstruction. For any governed Euclid alignment and station, Helios can now calculate:

- continuous chainage and displayed station;
- Northing and Easting;
- tangent azimuth;
- every deterministic vertical profile elevation that controls the station;
- controlling horizontal element, vertical control, formula, input values, provenance, and review status.

The evaluator is alignment-neutral. Roadway centerlines, survey baselines, streams, culverts, utilities, structure baselines, and temporary alignments use the same contract. T.G.L. remains the proposed roadway centerline profile.

## Calculation authority

Stage 4L consumes the current canonical Euclid engineering record created from the single document ingestion. It does not:

- upload or reopen a PDF;
- call OpenAI to calculate geometry;
- infer a missing station branch, spiral, control point, or profile segment;
- alter the canonical model, estimate, quantities, pricing, schedule, or LandXML state.

Horizontal tangent positions use accepted coordinate control and bearing. Circular curves use accepted PC/PT coordinates, radius, delta, rotation, and chainage. Vertical tangents use accepted grade and start elevation. Normal vertical curves use the certified Stage 4D parabolic evaluator.

## Fail-closed rules

- Exactly one chainage or displayed station is required.
- A displayed station repeated across station-equation branches is rejected until the branch is selected.
- Stations outside the alignment range are rejected.
- A blocked horizontal chain returns `unavailable`.
- Spiral interpolation remains unavailable until a reviewed clothoid solution exists.
- Missing profile control is reported as a limitation; it is never linearly invented.
- Local or partially known coordinate references remain usable for estimating but are clearly limited and are not presented as survey-control deliverables.

## Product workflow

The selected alignment in the Euclid cockpit now includes a compact **3D station check**. An estimator enters a station such as `145+25.00` and selects **Compute position** once. The result displays Northing, Easting, tangent azimuth, profile elevations, calculation status, and limitations.

Ask Helios uses the same deterministic evaluator when a station and a specific alignment can be resolved. The language model explains a stored calculation result; it does not calculate the coordinates itself. Ambiguous alignments remain unanswered rather than guessed.

## Security and traceability

- The browser API enforces same-origin requests and authenticated Helios identity.
- Convex rechecks company ownership for the project and current model.
- The calculation query is read-only.
- Every result carries the immutable source fingerprint plus a deterministic result fingerprint.
- No PDF bytes or OpenAI file inputs cross the Stage 4L boundary.

## Acceptance evidence

- Golden tangent position and roadway T.G.L. elevation pass.
- Golden circular-curve midpoint passes.
- Independent culvert alignment and invert elevation pass.
- Repeated evaluations produce the same fingerprint.
- Domain typecheck, Convex typecheck/code generation, Helios boundary tests, and Helios production build pass.

## Next engineering stage

Stage 4M should build station-offset-elevation transforms and cross-alignment spatial relationships. That enables roadway, culvert, utility, and excavation-limit geometry to be oriented in one coordinate frame before Stage 4N builds surfaces and solids for quantity comparison.
