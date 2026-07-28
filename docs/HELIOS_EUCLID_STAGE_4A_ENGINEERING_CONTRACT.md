# Helios Civil Geometry 2.0 — Euclid Stage 4A Engineering Contract

Status: frozen contract implemented and locally verified

This is the Civil Geometry 2.0 Stage 4A milestone. It is distinct from the
earlier Foundation 4A manual bid-package intake milestone.

## Purpose

Stage 4A freezes the shared engineering language that horizontal control,
vertical control, cross sections, drainage/inverts, material layers, the
Euclid cockpit, deterministic quantities, Ask Helios, and LandXML exchange
must use. No extractor or interface may invent a parallel geometry model.

The contract is additive to the existing canonical engineering project record.
The immutable PDF remains the source of truth, while Euclid stores traceable
engineering interpretations of that source.

## Frozen system boundary

The Euclid model is bound to one company, project, bid package, and package
revision. It retains the canonical source fingerprint and a processing version.

Stage 4A defines these shared records:

- spatial references, including coordinate basis, datum, projection, unit,
  axis order, grid/ground/local status, transformation metadata, provenance,
  and review state;
- separate named horizontal alignments, control points, lines, circular curves,
  spirals, and station equations;
- separate profiles attached to one horizontal alignment, profile points,
  vertical tangents, and vertical curves;
- typical sections, cross-section points, structures, inverts, and material
  layers;
- cross-entity relationships, engineering issues, and export qualification;
- source-, page-, sheet-, view-, region-, and text-span provenance; and
- field-level engineering values retaining their printed notation or their
  deterministic formula and input value IDs.

## Locked engineering invariants

1. **One canonical source basis.** Euclid consumes the canonical engineering
   record created from the original upload. Stage 4A introduces no PDF upload,
   reread, OpenAI request, or remote-file lifecycle.
2. **Separate alignments remain separate.** A roadway centerline, stream
   channel, survey baseline, structure baseline, and utility alignment cannot
   be merged merely because they occur on one sheet or intersect.
3. **Every profile has one parent alignment.** Vertical stationing is never
   interpreted without its horizontal alignment identity.
4. **Chainage and displayed station are different fields.** Continuous
   distance along an alignment is retained separately from the station printed
   after station equations. Computed chainage requires an explicit formula and
   inputs.
5. **Coordinate systems are never guessed.** Published, local, partial,
   unknown, and conflicted references are explicit states. A known published
   reference requires its printed datum and projected coordinate system.
6. **Every engineering value is explainable.** Printed values retain the exact
   source notation. Computed values retain a deterministic formula and the IDs
   of their inputs. Every value and every station retains valid page-level
   provenance.
7. **Physical PDF page is canonical.** Provenance uses a one-based physical PDF
   page plus optional printed sheet and view identities. Visual boundaries are
   normalized to the page.
8. **AI proposes; deterministic solvers calculate.** AI may locate and
   normalize printed engineering facts. Horizontal closure, vertical-curve
   math, station transforms, and quantity calculations belong to versioned
   deterministic solvers in later stages.
9. **Review state travels with geometry.** Proposed, accepted, corrected,
   conflicted, rejected, stale, and superseded states are shared across the
   model. Later revisions do not overwrite prior accepted geometry.
10. **LandXML is an exchange, not an authority.** Only contract-valid, accepted,
    complete geometry with accepted coordinate references can qualify. Local
    coordinate exports require explicit estimator acknowledgment. Unknown or
    conflicted coordinate systems and open blocking issues fail closed.

## Reference validation fixture

The Stage 4A golden fixture models the Titus Culvert plan set with two separate
alignments:

- `Front Avenue` as the roadway centerline with horizontal control and an
  accepted proposed-finished-grade profile; and
- `Titus Run` as a separate stream-channel alignment related by a crossing.

The fixture proves that the model rejects:

- a profile with no valid parent alignment;
- an accepted vertical curve with no deterministic solver version;
- printed values or stations with no valid provenance;
- computed values with no deterministic input chain;
- unaccepted or incomplete geometry requested for exchange; and
- local-coordinate exchange without explicit acknowledgment.

## Deliberately out of scope

Stage 4A does not add or change:

- Convex tables, writers, backfills, or canonical-reader cutover;
- OpenAI prompts, models, calls, uploads, or stored responses;
- horizontal, vertical, cross-section, invert, or material extractors;
- closure, curve, profile, surface, or quantity solvers;
- the Euclid cockpit, navigation, map/canvas, or estimator controls;
- LandXML generation or download;
- the existing Document Intelligence, Plan Intelligence, Civil Geometry,
  WBS, Estimate Builder, Cockpit 2.0, Ask Helios, evidence, risk, pricing,
  procurement, or review workflows.

## Objective acceptance criteria

Stage 4A passes only when all of the following are true:

- the shared `@opsslate/helios-domain` package exports the versioned Euclid
  contract;
- separate horizontal alignments and alignment-owned profiles are modeled;
- coordinate-reference, station-equation, field-provenance, review-state,
  issue, and export-gate contracts are explicit;
- the validator fails closed on broken identity, parent, provenance,
  deterministic-input, coordinate-reference, and export relationships;
- the Titus reference fixture passes and each invalid mutation is rejected;
- the domain TypeScript build and complete domain test suite pass; and
- no existing feature code, route, data writer, or UI component is modified.

## Next approval gate

The next recommended milestone is **Euclid Stage 4B — canonical storage and
shadow population**. It should add versioned persistence and populate this
contract from already-stored canonical plan facts in shadow mode. It must not
cut over the existing cockpit, Ask Helios, estimate, quantity, or Civil Geometry
readers until exact golden-project parity is demonstrated and approved.
