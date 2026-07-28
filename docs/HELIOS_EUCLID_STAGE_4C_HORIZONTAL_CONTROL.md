# Helios Civil Geometry 2.0 - Euclid Stage 4C Horizontal Control

Status: deterministic solver implemented in shadow mode

## Outcome

Stage 4C adds the first deterministic engineering solver to the canonical
Euclid record. It validates horizontal-control facts already stored by Stage
4B. It does not open a PDF, call OpenAI, alter an extracted fact, or replace an
existing Helios reader.

The governing rule is:

> AI may propose printed facts. Euclid performs the math. Conflicts remain
> conflicts until an estimator resolves them.

## Solver scope

The versioned `euclid-horizontal-v1` solver performs:

- quadrant-bearing and azimuth normalization;
- line coordinate-distance versus printed-length closure;
- printed bearing versus coordinate-azimuth closure;
- circular-curve arc validation using `L = R x delta` in radians;
- circular-curve chord validation using `C = 2R sin(delta / 2)`;
- tangent-length validation when a printed tangent is available;
- continuous element sequence, endpoint, station, and total-length closure;
- duplicate control-point coordinate reconciliation;
- deterministic station-equation physical-location resolution; and
- explicit blocking when post-equation station facts do not identify their
  station-equation branch.

Stage 4C does not average conflicts, infer missing rotation, invent endpoint
coordinates, silently assign station branches, or certify incomplete spirals.

## Tolerance policy

The default tolerance set is named `estimating-control-v1`. These are Helios
estimating validation thresholds, not survey or agency standards.

| Check | Pass | Review | Block |
| --- | ---: | ---: | ---: |
| Duplicate control point | <= 0.02 | > 0.02 to 0.10 | > 0.10 |
| Endpoint/coordinate closure | <= 0.05 | > 0.05 to 0.20 | > 0.20 |
| Curve length | <= 0.02 | > 0.02 to 0.10 | > 0.10 |
| Station/length closure | <= 0.02 | > 0.02 to 0.10 | > 0.10 |
| Bearing closure | <= 0.01 degrees | > 0.01 to 0.05 degrees | > 0.05 degrees |

The complete tolerance object is persisted with every solution so a future
project-specific reviewed tolerance never changes the meaning of an earlier
result.

## Station-equation safety

Stage 4C can compute a station equation's physical chainage from the preceding
continuous offset:

```text
physical chainage = back station - prior displayed/chainage offset
new offset = ahead station - physical chainage
```

Every computed physical location retains its printed back/ahead values,
formula, input value IDs, and page provenance. This resolves the equation
location but does not guess which branch an unrelated printed station belongs
to. Post-equation facts without an explicit `stationEquationId` produce a
blocking `station_branch_unassigned` check.

## Additive persistence

`heliosEuclidHorizontalSolutions` stores:

- Euclid model and package-revision identity;
- solver and tolerance versions;
- source, model, and solution fingerprints;
- pass, review, block, and not-applicable alignment counts;
- check, review, and blocking totals;
- immutable current/superseded state; and
- terminal failure diagnostics.

`heliosEuclidHorizontalSolutionChunks` stores bounded, fingerprinted checks by
alignment. The solver reconstructs the model only from fingerprint-verified
Euclid entity chunks and canonical provenance records.

An unchanged Euclid model and tolerance set reuses the current solution. A
changed model creates a new solution and supersedes, but never deletes, the
prior result.

## Failure isolation

Stage 4C is scheduled only after Stage 4B has persisted the complete model,
provenance, and entity chunks. A Stage 4C failure cannot roll back or change
the canonical Euclid model, authoritative Civil Geometry, project documents,
estimate, quantities, or human decisions.

## Titus golden validation

The domain test fixture represents separate `Front Avenue` roadway and `Titus
Run` stream alignments under a BLT-2 control-sheet provenance record. It proves:

- separate alignment identities remain separate;
- north and east tangents close against their coordinates and bearings;
- a right circular curve closes by length, radius, delta, and chord;
- a conflicting curve length blocks the solution;
- sequential station equations resolve deterministically; and
- unassigned post-equation station branches fail closed.

This is a controlled mathematical Titus fixture, not a claim that the current
live Titus project has passed sheet-for-sheet parity. The development project
still has no authoritative Civil Geometry run, so no live Euclid model or
horizontal solution can honestly be produced yet.

## Explicit non-cutover boundary

Stage 4C does not add or change:

- PDF upload, storage, rendering, or OpenAI lifecycle;
- Document Intelligence, Plan Intelligence, or Civil Geometry extraction;
- WBS, Estimate Builder, Cockpit 2.0, Ask Helios, quantities, pricing,
  procurement, evidence, risk, or review readers;
- application routes, navigation, or cockpit UI;
- vertical/profile, cross-section, surface, or quantity solvers;
- LandXML generation or CAD download; or
- Vercel or production deployment.

## Acceptance criteria

Stage 4C passes when:

- the pure solver is deterministic and contract-valid;
- every calculation retains entity and provenance identity;
- pass/review/block thresholds are versioned and persisted;
- printed bearing, line, curve, chord, station, and sequence checks are covered;
- station equations are resolved without branch guessing;
- incomplete or conflicting data fails closed;
- unchanged inputs reuse the same solution fingerprint;
- new model versions preserve prior results through supersession;
- the Titus mathematical fixture passes and intentional corruptions block;
- no existing consumer reads the new solution tables; and
- domain, Helios boundary, Convex, lint, and production-build verification pass.

## Development verification

- Euclid domain tests: 82 passed.
- Helios security and boundary tests: 93 passed.
- Domain TypeScript build: passed.
- Targeted modified Convex lint: passed.
- Helios lint and shared OpsSlate UI ownership boundary: passed.
- Helios and shared OpsSlate production builds: passed.
- Convex code generation, type validation, schema deployment, and function
  deployment: passed on development deployment `kindly-tiger-289`.
- Internal functions `solveEuclidHorizontalShadow`,
  `solveCurrentProjectHorizontalShadow`, and `getHorizontalSolutionStatus` are
  registered.
- Live Titus audit: `heliosEuclidModels` and
  `heliosEuclidHorizontalSolutions` contain no records because the project has
  no authoritative Civil Geometry run. No live pass was fabricated.
- Vercel deployment, production promotion, custom-domain changes, reader
  cutover, cockpit UI, vertical solving, and LandXML: not performed.

## Next approval gate

Stop before **Euclid Stage 4D - vertical/profile solver and Titus PRO-1 golden
validation**. Stage 4D should add deterministic tangent and parabolic-curve
math while keeping existing ground, proposed grade, subgrade, stream profile,
and inverts distinct. It must remain shadow-only until separately approved.
