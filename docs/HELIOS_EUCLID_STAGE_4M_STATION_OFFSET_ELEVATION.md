# Helios Euclid Stage 4M — Station–Offset–Elevation Engine

## Outcome

Stage 4M extends the deterministic 4L alignment-position engine to calculate a point normal to a governed alignment at any valid station. It consumes the current canonical Euclid model and does not reopen PDFs, call an AI model, read object storage, or mutate engineering records.

## Coordinate convention

- Station follows increasing alignment chainage and all accepted station equations.
- Positive offset is right of increasing station.
- Negative offset is left of increasing station.
- Azimuth is clockwise from grid north.
- `N = Ncenterline - offset × sin(azimuth)`
- `E = Ecenterline + offset × cos(azimuth)`

The tangent azimuth comes from the controlling 4L line or circular-curve solution. Scale is never used.

## Elevation authority

4M deliberately separates plan position from elevation authority:

1. At zero offset, exactly one selected canonical profile may govern point elevation.
2. At a nonzero offset, the estimator may provide an explicit point elevation.
3. At a nonzero offset, the estimator may provide an explicit vertical delta from exactly one selected canonical profile.
4. Without one of those bases, 4M returns Northing and Easting but withholds point elevation.

No cross slope, template, surface, superelevation, or material depth is inferred. Explicit query values remain preliminary and do not become canonical geometry.

## Access paths

- Civil Geometry cockpit: one-action station/offset calculation with optional elevation basis.
- Ask Helios: station questions that contain an explicit offset use the same deterministic engine.
- Protected API: `POST /api/projects/{projectId}/euclid/station-offsets`.

Every result includes the immutable source fingerprint, model identity, calculation fingerprint, inputs, provenance, status, and limitations.

## Acceptance criteria

- Tangent and circular-curve offsets honor the signed right/left convention.
- Station equations remain governed by 4L.
- A lateral point never inherits centerline elevation implicitly.
- Results are deterministic for identical canonical inputs.
- Tenant authorization and same-origin protections match the existing Helios boundary.
- The workflow performs no PDF upload, PDF read, storage read, AI call, or database mutation.
- Existing 4L centerline queries continue to work unchanged.
