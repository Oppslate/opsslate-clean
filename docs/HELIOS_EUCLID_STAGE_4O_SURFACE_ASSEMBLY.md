# Helios Euclid Stage 4O — Governed Surface Assembly

## Outcome

Stage 4O converts the canonical Stage 4N roadway slices into reviewable longitudinal surface topology. It assembles existing, proposed, subgrade, and excavation-limit surfaces without re-reading a PDF, invoking an AI model, or changing an estimate.

The original documents remain immutable evidence. Every generated point and panel retains the canonical input identifiers, provenance identifiers, source fingerprint, and a deterministic result fingerprint.

## Engineering boundary

Stage 4O is a governed surface-readiness stage. It does not calculate or publish bid quantities. It does not replace Stage 4K quantity governance and it does not infer missing daylight limits, ditch controls, superelevation transitions, typical-section geometry, material placement, or existing ground.

Missing information becomes a retained gap or unresolved control. Helios never bridges an unsupported station band.

## Sampling controls

The engine samples the requested alignment range at a bounded regular interval and always adds canonical critical stations:

- range boundaries;
- horizontal element boundaries;
- profile and vertical-curve controls;
- typical-section boundaries;
- stored cross-section stations; and
- material-layer boundaries.

The default result is bounded to 401 sections. The regular interval expands when necessary, but critical controls are never discarded. If critical controls alone exceed the bound, assembly stops with an explicit error.

## Surface topology rules

A surface section requires at least three governed 3D points. A longitudinal band is assembled only when consecutive sections share at least three offsets. Each band stores deterministic quadrilateral corners and two triangle definitions.

When either section lacks enough points, the band is marked `missing_3d_section`. When the sections do not share sufficient offsets, it is marked `incompatible_section_topology`.

Surface comparison is ready only when an existing surface and a design surface have a common assembled station span. Subgrade is the preferred design comparison surface; proposed grade is the fallback.

## Access paths

- Euclid cockpit: select an alignment, open **Surfaces**, then select **Assemble surfaces**.
- Secure API: `POST /api/projects/{projectId}/euclid/surfaces`.
- Ask Helios: ask about surface assembly, surface gaps, or surface readiness. The answer cites the deterministic 4O result.

## Acceptance criteria

Stage 4O passes when:

1. only the tenant-authorized current canonical Euclid record is used;
2. repeated requests with identical inputs produce the same fingerprint;
3. critical stations are included and sampling is bounded;
4. unsupported gaps are retained instead of interpolated;
5. the cockpit reports sections, points, panels, gaps, and comparison readiness;
6. Ask Helios uses the deterministic 4O source;
7. no PDF, OpenAI, storage, estimate mutation, or quantity publication occurs; and
8. the original source fingerprint and all controlling identifiers remain traceable.

## Next controlled stage

Stage 4P may compare approved surface topology and calculate governed volumes only after the required surfaces share valid station coverage. Quantity results must remain draft, method-tagged, evidence-linked, and estimator-approved before they can affect an estimate.
