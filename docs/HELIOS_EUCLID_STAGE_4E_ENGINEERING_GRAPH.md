# Helios Civil Geometry 2.0 - Euclid Stage 4E Engineering Graph

Status: deterministic relationship graph and quantity-readiness solver
implemented in shadow mode

## Outcome

Stage 4E joins the accepted Stage 4C horizontal-control result, Stage 4D
vertical-profile result, and frozen Euclid entities into one traceable
engineering relationship graph. It reports whether specific deterministic
quantity methods have sufficient accepted inputs. It does not calculate or
publish a bid quantity and does not replace an existing Helios reader.

The governing rule is:

> Identity and accepted engineering controls create relationships. Proximity,
> similar station labels, and drawing appearance do not.

## Graph scope

The graph includes canonical nodes for:

- alignments, control points, horizontal elements, and station equations;
- profiles, profile points, vertical tangents, and vertical curves;
- typical sections and cross-section points;
- structures and inverts; and
- material layers.

Canonical parent fields create deterministic containment and endpoint edges.
Explicit Euclid relationships remain separate edges and are validated against
their required source and target roles. Stage 4E blocks a relationship whose
label conflicts with the actual entity types.

Every node and edge retains stable entity IDs and source provenance. Stationed
children are checked against their parent alignment range. Reversed or
out-of-range geometry blocks the integrated result.

## Control-solver gate

Stage 4E waits for both independent control solvers:

- Stage 4C horizontal control; and
- Stage 4D vertical profiles.

It verifies the Euclid model identity, source fingerprint, stored check count,
chunk fingerprint, and per-alignment/per-profile status before solving. It
does not combine an old control result with a new Euclid model. Independent
schedulers retry the join without coupling or rolling back either solver.

## Quantity-readiness matrix

Readiness is reported per alignment and method as `ready`, `review`,
`blocked`, or `not_available`. Missing coverage is never converted to zero.

| Capability | Required basis |
| --- | --- |
| Horizontal length | Accepted complete alignment, control endpoints, element chain, and passed horizontal control |
| Profile elevation | Accepted complete profile and passed vertical control |
| 3D corridor | Accepted horizontal control, proposed grade/subgrade profile, and a stationed typical or cross section |
| Earthwork volume | Passed horizontal control and at least two accepted cross sections with matching existing/design offsets |
| Material area | Passed horizontal control and accepted station/width limits |
| Material volume | Passed horizontal control plus accepted station, width, thickness, and unit controls |
| Structure count | Unique accepted structure identities attached to the alignment |
| Drainage 3D length | At least two accepted station/offset/invert controls plus explicit pipe connectivity confirmation |

Drainage controls without explicit connectivity remain `review`; Helios does
not assume that station order proves a pipe connection. An incomplete or
limited alignment/profile cannot silently become ready merely because its
mathematics closes.

Stage 4E reports method readiness only. Actual deterministic quantity
calculation, estimator review, acceptance, and estimate transfer remain
separate governed steps.

## Additive persistence

`heliosEuclidIntegrationSolutions` stores:

- package, model, horizontal-solution, and vertical-solution identity;
- source, model, control-solution, and integrated-solution fingerprints;
- graph node, edge, alignment, readiness, and check counts;
- ready, review, blocked, and unavailable capability counts;
- immutable current/superseded state; and
- terminal failure diagnostics.

`heliosEuclidIntegrationSolutionChunks` stores bounded, fingerprinted graph,
readiness, and check records. Unchanged model and solver inputs reuse the
current result. Changed canonical or control inputs create a new result and
preserve the prior one.

## Failure isolation

Stage 4E runs only after the complete Stage 4B model and the Stage 4C/4D
control results are stored. A graph or readiness failure cannot roll back or
alter documents, canonical Euclid geometry, existing Civil Geometry,
estimates, takeoffs, prices, or estimator decisions.

## Controlled golden validation

The Stage 4E fixture provides one fully traced roadway alignment with:

- coordinate-backed horizontal line control;
- an accepted proposed-grade tangent;
- two existing/subgrade cross sections;
- one complete material layer;
- a drainage structure and invert; and
- exact parent and endpoint identities.

Tests prove graph creation, method-specific readiness, deterministic
fingerprints and chunking, out-of-range blocking, relationship-role blocking,
model/solver identity rejection, and drainage connectivity review.

This is a controlled mathematical fixture, not a claim that the live Titus
project has passed the Stage 4E gate. The development project still has no
authoritative Civil Geometry run, so no live Euclid graph is fabricated.

## Explicit non-cutover boundary

Stage 4E does not add or change:

- PDF upload, storage, rendering, or OpenAI lifecycle;
- Document Intelligence, Plan Intelligence, or Civil Geometry extraction;
- existing takeoff or quantity calculations;
- WBS, Estimate Builder, Cockpit 2.0, Ask Helios, pricing, procurement,
  evidence, risk, or review readers;
- application routes, navigation, or cockpit UI;
- LandXML generation or CAD download; or
- Vercel or production deployment.

## Development verification

- Euclid domain tests: 96 passed.
- Helios security and boundary tests: 102 passed.
- Domain TypeScript build: passed.
- Targeted modified Convex lint: passed.
- Convex code generation, type validation, schema deployment, and function
  deployment: passed on development deployment `kindly-tiger-289`.
- New internal functions: `solveEuclidIntegrationShadow` and
  `getIntegrationSolutionStatus`.
- Live Titus integrated solution: not created because no authoritative Civil
  Geometry run exists; no live pass was fabricated.

## Next approval gate

Stop before **Euclid Stage 4F - read-only Civil Geometry cockpit**. Stage 4F
should expose the accepted alignment/profile graph, elevations, coordinates,
coverage, conflicts, and quantity-readiness matrix in the approved OpsSlate
design system. It must not edit canonical geometry, publish quantities,
generate LandXML, or cut over existing readers without separate approval.
