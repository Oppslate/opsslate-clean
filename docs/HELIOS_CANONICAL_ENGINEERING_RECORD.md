# Helios Canonical Engineering Record

## Stage 1 boundary

Stage 1 establishes an additive, versioned contract for coordinated source
ingestion. It does not redirect or replace Document Intelligence, Plan
Reconstruction, Civil Geometry, Project Intelligence, the contractor WBS,
Estimate Builder, Cockpit 2.0, quantities, pricing, procurement, evidence,
risk, or estimator review.

The existing workflow tables and OpenAI actions remain authoritative until a
later shadow-mode milestone proves parity and receives explicit approval.

## Invariants

- The original PDF or written scope remains immutable and is the source of
  truth. Canonical records reference the existing protected source; they do not
  replace or alter it.
- Every engineering record is tenant-, project-, package-, and revision-bound.
- Every source is fingerprinted by source bytes, source version, package
  revision, schema, extractor, prompt, and model versions.
- Browser hexadecimal and storage Base64 SHA-256 encodings normalize to the
  same source fingerprint.
- Specifications-only, plans-only, mixed, and written-scope bid bases remain
  valid. Plan and geometry coverage can be explicitly not applicable.
- Page text, OCR, rendered assets, semantic artifacts, and downstream records
  retain source-level and page-level provenance.
- A remote OpenAI file is modeled as a controlled, temporary reference with
  usage counts, expiration, deletion state, cleanup attempts, and errors.
- No downstream record becomes accepted merely because it is present in the
  canonical record. Existing human review gates remain authoritative.

## Additive data model

- `heliosEngineeringRecords`: one versioned project/package root with explicit
  document, plan, and geometry coverage.
- `heliosEngineeringSources`: immutable links to existing PDF or written-scope
  source records.
- `heliosEngineeringPages`: physical page identity, dimensions, rotation,
  modality, and native/OCR channel status.
- `heliosEngineeringTextSpans`: coordinate-aware native and OCR text.
- `heliosEngineeringAssets`: protected page renders, thumbnails, and view
  crops.
- `heliosEngineeringArtifacts`: versioned document-intelligence, plan-inventory,
  and civil-geometry processing envelopes.
- `heliosEngineeringProvenance`: source, page, text-span, visual-region, and
  existing evidence links for every future canonical output.
- `heliosEngineeringRemoteFiles`: temporary OpenAI file lifecycle records.

## Compatibility and cutover rule

Stage 1 has no writers, readers, schedulers, routes, or UI. A future shadow
ingestion stage may populate these records beside the current pipeline, but it
must not become authoritative until golden-project comparisons prove that no
document evidence, plan page/view, scale candidate, reference, or civil
geometry record is lost.

## Stage 2 shadow ingestion

Stage 2 populates the canonical boundary beside the current pipeline. It is a
write-only shadow: no route, screen, estimator calculation, cockpit query,
takeoff, procurement workflow, or AI action reads from it.

- Package finalization registers one revision-bound engineering root and one
  immutable canonical source link per accepted PDF or written scope.
- A reused PDF is mirrored by immutable document identity even when its
  authoritative intelligence job belongs to an earlier package revision.
- Completed or failed document jobs mirror a versioned processing artifact and
  retain provenance to the authoritative document-intelligence row and every
  evidence row.
- Terminal plan runs mirror one run artifact, then fan out by source document
  to register physical pages and provenance for plan pages, references, and
  calibrations without one oversized transaction.
- Terminal civil-geometry runs mirror one run artifact, then fan out by source
  document to retain provenance for every geometry record.
- All shadow writes are idempotent through immutable source, authoritative
  artifact, physical-page, and artifact-record identities.
- Shadow scheduling happens only after authoritative writes and is
  failure-isolated; it cannot roll back a successful existing workflow.
- Specifications-only, plans-only, mixed, and written-scope-only bid bases use
  explicit coverage states. Missing plans never block a valid non-plan basis.
- An internal parity report compares source and plan-page counts and reports
  shadow artifacts, provenance, coverage, and record status.

The existing three OpenAI file uploads and cleanup paths remain unchanged in
Stage 2. Remote-file reuse, canonical readers, and workflow cutover remain
prohibited until a later stage is separately approved after golden-project
parity validation.
