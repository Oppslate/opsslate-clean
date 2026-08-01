# Helios Euclid Stage 4N — Governed Roadway Sections

## Outcome

Stage 4N builds a deterministic roadway section at a valid station from the current canonical Euclid model. It combines the Stage 4M centerline position with accepted typical-section controls, exact cross-section points, and material-layer facts. It does not reopen PDFs, call an AI model, read object storage, or mutate engineering records.

## Engineering conventions

- T.G.L. is the proposed roadway centerline profile.
- Positive offset is right of increasing station; negative offset is left.
- Cross-slope values are signed vertical rise moving outward from centerline. A normal two-percent fall is stored as `-2` on either side.
- Exact accepted cross-section points override a calculated template point at the same surface and offset.
- A typical section must be unambiguous and active at the requested station.
- Shoulder width cannot establish a shoulder edge without the controlling lane width.
- Material depths expose their accepted extents and normalized thickness, but do not establish vertical placement unless canonical controls provide it.

## Readiness

The solver returns separate point, material, unresolved-control, limitation, provenance, and status records. A surface is ready only when at least three resolved 3D points exist on the same surface. Missing lane width, signed slope, shoulder slope, template authority, or material placement remains explicit and never becomes assumed geometry.

## Access paths

- Civil Geometry cockpit: the existing station input now provides a one-click **Build section** action alongside the 4M point calculation.
- Ask Helios: roadway-template, lane-width, cross-slope, shoulder, and cross-section questions use the deterministic 4N result as their engineering source.
- Protected API: `POST /api/projects/{projectId}/euclid/cross-sections`.

Every result retains the immutable model identity, source fingerprint, calculation fingerprint, canonical inputs, and limitations.

## Acceptance criteria

- Lane-edge Northing, Easting, and elevation derive from accepted 4M centerline control and signed section rules.
- Stored cross-section points have authority over template calculations at matching locations.
- Ambiguous or missing templates fail closed.
- Missing lane width prevents placement of its dependent shoulder edge.
- Material layers never receive invented vertical placement.
- Tenant authorization and same-origin protections match the existing Helios boundary.
- The workflow performs no PDF upload, PDF read, storage read, AI call, or database mutation.
- Existing 4L and 4M calculations continue to work unchanged.
