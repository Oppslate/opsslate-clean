# Helios Civil Geometry 2.0 — Euclid Stage 4B Shadow Storage

Status: implemented in the Helios development environment; no reader cutover

## Outcome

Stage 4B adds versioned Euclid persistence and an idempotent shadow-population
path. It converts already-stored civil-geometry records plus canonical source,
page, and provenance records into the frozen Euclid Stage 4A contract.

The original PDF remains immutable source evidence. Stage 4B does not upload,
download, reread, render, or send a PDF to OpenAI. It does not add an OpenAI
request of any kind.

## Shadow flow

1. The existing authoritative Civil Geometry run completes or its estimator
   review state changes.
2. The existing canonical engineering shadow registers the civil-geometry
   artifact and page-level provenance.
3. A failure-isolated scheduler requests Euclid shadow population.
4. Euclid reads the current canonical engineering record, geometry artifact,
   canonical pages/provenance, and stored civil-geometry records.
5. A deterministic domain adapter creates and validates one Euclid model.
6. The model, provenance links, and bounded entity chunks are stored with exact
   fingerprints. An identical retry reuses the current model.
7. A changed authoritative input creates a new current Euclid version and
   marks the prior version superseded without deleting it.

## Additive storage

### `heliosEuclidModels`

Stores the company/project/package/revision identity, canonical engineering
record and artifact, plan and geometry run identities, schema and adapter
versions, source and model fingerprints, review/readiness status, validation
result, counts, creator, timestamps, current/superseded state, and the explicit
`shadowMode` flag.

### `heliosEuclidProvenance`

Maps every Euclid provenance key back to the canonical engineering source,
canonical provenance record, canonical physical page, stored source geometry
record, protected document, printed sheet/view locator, authority, confidence,
and an immutable provenance fingerprint.

### `heliosEuclidEntityChunks`

Stores contract-validated entities in bounded, fingerprinted chunks by entity
type. Chunking prevents large projects from producing one oversized database
document while preserving deterministic reconstruction of the complete model.

## Deterministic adapter behavior

- Records are sorted by stable source ID before transformation, so input order
  does not change the model fingerprint.
- Records with the same explicit alignment identity may contribute horizontal,
  vertical, cross-section, invert, and material facts to one alignment.
- Generic or missing alignment names remain record-specific and are not merged.
- Profiles always reference a valid horizontal alignment identity.
- Coordinate datum and projection remain `partially_known`/`unknown` when the
  prior record does not establish them. The adapter never guesses a CRS.
- Ambiguous linear units remain `unknown`; a generic "feet" label is not
  silently promoted to US survey feet or international feet.
- Station equations lacking physical chainage become blocking issues; Euclid
  does not fabricate a station transform.
- Horizontal segments lacking exact stored endpoint coordinates, complete
  curve definitions, curve direction, or bearings remain explicit issues
  rather than invented geometry.
- Inverts without a stored station and material layers without a valid station
  range are not promoted into calculation-ready geometry.
- Existing accepted/proposed/rejected/superseded status is preserved. Shadow
  population never creates a new human approval.

## Reliability and failure behavior

- Shadow scheduling is best effort and cannot roll back or fail the existing
  authoritative Civil Geometry workflow.
- Population waits through bounded retries when canonical per-record page
  provenance is still being written.
- Missing canonical provenance after retries creates a current failed shadow
  record with a safe diagnostic; it does not create untraceable geometry.
- Contract validation occurs before any valid model is persisted.
- Identical source and model fingerprints return the existing current model.
- Prior model versions and their chunks/provenance remain immutable and
  addressable after supersession.

## Explicit non-cutover boundary

Stage 4B does not modify or redirect:

- Document Intelligence or Plan Intelligence;
- existing Civil Geometry extraction or estimator review;
- the approved WBS, Estimate Builder, Cockpit 2.0, or governed quantities;
- Ask Helios, risk, RFQ, pricing, procurement, or evidence readers;
- application routes, navigation, or user interface;
- LandXML generation or download; or
- PDF/OpenAI file lifecycle and API calls.

No application-facing query reads `heliosEuclidModels`,
`heliosEuclidProvenance`, or `heliosEuclidEntityChunks` in Stage 4B.

## Acceptance criteria

Stage 4B passes when:

- additive Euclid tables deploy without changing existing data contracts;
- a stored geometry run can produce a contract-valid Euclid shadow using only
  canonical and authoritative stored records;
- every source geometry record has canonical physical-page provenance;
- deterministic rebuilds produce the same model fingerprint;
- changed inputs create a new version and supersede the previous current model;
- missing provenance fails closed after bounded retries;
- domain, Convex, Helios security/boundary, lint, type, and production builds
  pass; and
- existing consumers contain no Euclid-table reader.

## Development verification

- Euclid domain tests: 75 passed, including deterministic ordering, provenance,
  unknown-coordinate export blocking, station-equation conflict handling,
  ambiguous-unit handling, curve-direction protection, and chunk parity.
- Helios security and boundary tests: 89 passed.
- Targeted modified Convex lint: passed.
- Helios lint and shared OpsSlate UI ownership boundary: passed.
- Helios and shared OpsSlate production builds: passed.
- Convex code generation, TypeScript validation, schema deployment, and
  function deployment: passed on development deployment `kindly-tiger-289`.
- Deployed functions: `syncEuclidRunShadow`,
  `syncActiveProjectEuclidShadow`, and `getEuclidShadowStatus` are registered as
  internal-only functions.
- Live Titus audit: the project has a completed Plan Intelligence run but no
  `heliosCivilGeometryRuns` record. Therefore no live Euclid model was created;
  this is the correct non-fabricated result. The first completed authoritative
  geometry run will schedule Stage 4B automatically.
- Vercel deployment, production promotion, custom-domain changes, reader
  cutover, cockpit UI, and LandXML generation: not performed.

## Next approval gate

Stop before **Euclid Stage 4C - horizontal control solver and golden-project
validation**. Stage 4C should resolve station equations, bearings, curve
elements, coordinate closure, grid/ground/local reference state, and alignment
confidence using deterministic math. It must compare Euclid output against the
Titus control sheets before any cockpit or downstream-reader cutover.
