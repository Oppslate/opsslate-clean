# Helios Civil Geometry 2.0 - Euclid Stage 4D Vertical Profiles

Status: deterministic vertical solver implemented in shadow mode

## Outcome

Stage 4D validates vertical-profile facts already stored in the canonical
Euclid engineering record. It adds deterministic tangent and normal parabolic
curve math without reopening a PDF, calling OpenAI, altering source facts, or
changing any existing Helios reader or screen.

Existing ground, proposed finished grade, proposed subgrade, streambed,
culvert invert, utility invert, and other profile roles remain separate
engineering objects. The solver never merges surfaces merely because they
share an alignment or station range.

## Solver scope

The versioned `euclid-vertical-parabolic-v1` solver performs:

- profile-point, tangent, and curve isolation by profile identity;
- tangent grade validation from station and elevation controls;
- PVC, PVI, and PVT ordering and curve-length closure;
- symmetric PVI midpoint validation;
- incoming and outgoing tangent elevation closure at the PVI;
- crest/sag classification from signed grades;
- algebraic grade-difference and K-value validation;
- deterministic high/low-point calculation when it falls within the curve;
- station-equation branch safety for profile points; and
- explicit blocking when curve controls exist without a complete canonical
  vertical-curve record.

Stage 4D supports a normal symmetric parabolic vertical curve:

```text
elevation = elevationPVC + g1*x + ((g2-g1)/(2*L))*x^2
grade = g1 + ((g2-g1)/L)*x
```

The solver refuses to extrapolate beyond PVC/PVT. It does not digitize a
plotted line, infer a curve from a screenshot, guess missing grades, average
conflicting elevations, or certify an asymmetric curve without accepted
unequal leg controls.

## Tolerance policy

The default tolerance set is named `estimating-profile-v1`. These are Helios
estimating validation thresholds, not survey or agency standards.

| Check | Pass | Review | Block |
| --- | ---: | ---: | ---: |
| Elevation closure | <= 0.02 | > 0.02 to 0.10 | > 0.10 |
| Station/curve-length closure | <= 0.02 | > 0.02 to 0.10 | > 0.10 |
| Grade closure | <= 0.01% | > 0.01% to 0.05% | > 0.05% |
| K-value closure | <= 0.10 | > 0.10 to 0.50 | > 0.50 |

Every immutable solution stores its complete tolerance object. Missing
vertical datum is a review condition: relative profile math can be checked,
but coordinate exchange is not certified. Ambiguous station-equation branches
are blocking conditions.

## Additive persistence and failure isolation

`heliosEuclidVerticalSolutions` stores model and package identity, solver and
tolerance versions, source/model/solution fingerprints, profile outcomes,
check totals, immutable supersession state, and terminal failure diagnostics.

`heliosEuclidVerticalSolutionChunks` stores bounded, fingerprinted checks by
profile. The solver reconstructs its input only from fingerprint-verified
Euclid entity chunks and canonical provenance. An unchanged model reuses the
current solution; a changed model creates a new result and preserves the prior
record.

Stage 4D is scheduled only after Stage 4B model, provenance, and entity chunks
have committed. A vertical-solver failure cannot roll back or alter the
canonical record, authoritative Civil Geometry, documents, estimate,
quantities, or human decisions.

## Titus PRO-1 golden validation

The controlled mathematical fixture models two independent Front Avenue
profiles under PRO-1 provenance:

- proposed finished grade with a 65-foot symmetric sag curve, -2.71% incoming
  grade, +1.03% outgoing grade, and matching K value; and
- existing ground as a separate tangent profile.

Tests prove exact endpoint evaluation, internal low-point calculation,
non-extrapolation, profile separation, deterministic fingerprints and chunks,
and fail-closed behavior for corrupted PVT elevation, K value, and incomplete
curve controls.

This is a controlled mathematical transcription for solver validation, not a
claim that the current live Titus project has passed sheet-for-sheet PRO-1
parity. The development project still has no authoritative Civil Geometry run,
so no live Euclid vertical result has been fabricated.

## Explicit non-cutover boundary

Stage 4D does not add or change:

- PDF upload, storage, rendering, or OpenAI lifecycle;
- Document Intelligence, Plan Intelligence, or Civil Geometry extraction;
- WBS, Estimate Builder, Cockpit 2.0, Ask Helios, quantities, pricing,
  procurement, evidence, risk, or review readers;
- application routes, navigation, cockpit UI, or Civil Geometry cockpit;
- horizontal-control behavior, cross-section/surface joining, or quantity
  calculations;
- LandXML generation or CAD download; or
- Vercel or production deployment.

## Development verification

- Euclid domain tests: 88 passed.
- Helios security and boundary tests: 97 passed.
- Domain TypeScript build: passed.
- Targeted modified Convex lint: passed.
- Convex code generation, type validation, schema deployment, and function
  deployment: passed on development deployment `kindly-tiger-289`.
- New internal functions: `solveEuclidVerticalShadow`,
  `solveCurrentProjectVerticalShadow`, and `getVerticalSolutionStatus`.
- Live Titus vertical solution: not created because no authoritative Civil
  Geometry run exists; no live pass was fabricated.

## Next approval gate

Stop before **Euclid Stage 4E - combined engineering relationship graph and
3D quantity-readiness validation**. Stage 4E should join accepted horizontal
alignment, vertical profiles, sections, structures, drainage, and material
layers by explicit identity and station while preserving conflicts and missing
coverage. Cockpit UI, LandXML, and existing-reader cutover remain later,
separate approval gates.
