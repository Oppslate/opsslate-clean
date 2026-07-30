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

## Stage 3 golden-project parity

Stage 3 adds a stored, fail-closed comparison boundary between the existing
authoritative workflows and the canonical engineering shadow. It remains an
internal validation tool: application routes, screens, the estimator, cockpit,
takeoff, procurement, and AI workflows still read their existing records.

- Each parity run is company-, project-, package-, revision-, and canonical-
  record-bound, versioned, immutable, and supersedes only the previous current
  parity result.
- Sources, document-intelligence records, evidence, plan pages, plan views,
  plan calibrations, plan references, and civil-geometry records are compared
  by exact identity and deterministic content fingerprint—not count alone.
- Missing, unexpected, or content-altered records fail the affected area and
  identify the exact record IDs.
- An unfinished authoritative plan or geometry workflow is `incomplete`, not
  passed. A valid specifications-only or written-scope basis marks those areas
  `not_applicable`, not failed.
- Per-document shadow workers no longer rewrite the shared canonical root or
  full source registry. One final refresh follows isolated document workers,
  eliminating large-package write contention without altering authoritative
  records.
- The evaluator is an internal Convex mutation/query with no browser route and
  makes no OpenAI request.

Stage 3 does not remove any existing OpenAI call and does not activate remote-
file reuse. Consumer cutover and duplicate-call removal remain prohibited until
a separate stage is approved and a development project with completed plan and
civil-geometry runs proves exact parity for those areas.

## Stage 4 Plan Intelligence canonical-reader pilot

Stage 4 cuts over one approved development project and one read workflow. The
Titus Culvert Test Plan Intelligence workspace now resolves its plan pages,
views, calibrations, and references through the current canonical engineering
record, plan artifact, provenance fingerprints, golden-parity run, and cutover
audit. Projects without an explicit activation continue to use the unchanged
legacy reader.

- Activation is stored per company, project, package, engineering record,
  workflow, artifact, parity run, cutover run, plan run, and source
  fingerprint.
- The reader fails closed if any activation identity is stale, any required
  parity area is not passed, drawing authority is unresolved, canonical
  coverage differs, or a current record fingerprint no longer matches its
  canonical provenance.
- The live Titus pilot verified 898 of 898 authorized Plan records: 179 pages,
  377 views, 66 calibrations, and 276 references.
- Reader execution performs zero original-PDF reads and zero OpenAI calls.
- Current estimator sheet-authority decisions remain live governance records;
  they are applied after the canonical Plan payload is authorized.
- A new reconstruction request, calibration decision, or drawing-authority
  decision automatically returns that project to the legacy reader. Fresh
  parity and a new explicit activation are required before canonical reading
  resumes.
- Civil Geometry, Document Intelligence, Ask Helios, takeoff, estimates,
  procurement, Euclid, and every non-pilot project remain unchanged.

This stage does not replace the legacy Plan reconstruction writer. New Plan
reconstruction still uses its existing PDF/OpenAI action until the separately
approved canonical-input writer cutover.

## Stage 5 Plan Intelligence canonical-writer shadow

Stage 5 adds a non-current Plan reconstruction path that consumes only pinned
canonical engineering pages. It supplies canonical native/OCR text and the
immutable page-render asset to the reasoning engine in bounded page batches.
It never loads `heliosDocuments.storageId`, never uploads an original PDF, and
cannot become the current Plan run or feed Civil Geometry.

- Every run is pinned to the current company, project, package, engineering
  record, authoritative Plan run, source fingerprint, page identities, page
  materialization/OCR versions, and render hashes.
- The model returns batch-local page numbers. Helios validates complete batch
  coverage, then remaps them to the immutable source document and original PDF
  physical-page locator before persisting shadow Plan records.
- Pages without machine-readable text remain usable when a current canonical
  render exists. These render-only pages are counted explicitly instead of
  forcing another PDF read.
- The comparison gate records batch completion, exact document/page identity,
  metadata agreement, view and reference counts, OpenAI calls, and original-
  PDF reads. Activation is intentionally absent from this stage.
- Provider failures retain their exact safe reason. Failed or partial shadow
  runs cannot alter the current Plan reader, current Plan records, drawing-
  authority decisions, canonical engineering record, or Civil Geometry.

The Titus input preflight pinned all 179 canonical pages, including 20
render-only pages, into 60 bounded batches with zero original-PDF reads. After
provider quota was restored, a one-page canary and the complete Titus shadow
run both completed from canonical text and page renders. The full run preserved
all 179 immutable document/page identities, made 60 model calls, and performed
zero original-PDF reads.

The technical single-ingestion boundary therefore passed, but semantic parity
did not. Field agreement was 179/179 for page kind, 177/179 for sheet number,
126/179 for printed page number, 93/179 for discipline, 92/179 for issue date,
34/179 for title, and 6/179 for revision marker. Exact full metadata agreement
was 0/179. The authoritative run contained 377 views and 276 references; the
canonical shadow produced 506 views and 716 references. Reference inflation
was concentrated in specification and continuation relationships, while view
segmentation shifted among notes, other regions, legends, and title blocks.

The stored activation gate is consequently `activationEligible: false` and
`semanticReviewRequired: true`. No authoritative writer switch or legacy
PDF-path removal occurred. The next stage must reconcile deterministic page
metadata, normalize model output, deduplicate batch-local relationships, and
perform cross-batch/global relationship resolution before another Titus parity
run can be considered for activation.

## Stage 6 governed Plan semantic reconciliation

Stage 6 resolves the Stage 5 semantic drift without reopening a PDF or asking
the reasoning provider to reinterpret the same governed records. The
non-current shadow run is reconciled from the exact `plan_inventory` artifact,
canonical engineering-page lineage, and immutable source Plan page records
already stored in the canonical engineering record.

- Every shadow page must resolve through its canonical engineering page to the
  exact `sourcePlanPageId` in the governed Plan artifact. Missing, stale, or
  cross-fingerprint lineage blocks the transaction.
- Canonical page metadata, views, and scale-calibration records replace the
  batch-local model variants deterministically. The model result remains a
  diagnostic shadow, not a second source of truth.
- Batch-local references are removed and rebuilt from the governed project
  relationship set. Source and target page identifiers are remapped to the
  shadow run across the complete project before resolution status is stored.
- The strengthened activation gate compares complete page metadata, page-level
  view signatures, reference signatures, and calibration signatures. Matching
  counts alone can no longer qualify a writer.
- Reconciliation is recorded as versioned canonical-artifact work with zero
  OpenAI calls and zero original-PDF reads. It cannot make the shadow current
  or alter the authoritative Plan run.

The full Titus reconciliation retained 179 pages, 377 views, 276 references,
and 66 calibrations with exact semantic agreement. It removed 129 excess
batch-local views and 440 excess batch-local references, and remapped 102
resolved relationships project-wide. All page metadata fields matched 179 of
179, view signatures matched 179 of 179 pages, reference signatures matched
276 of 276, and calibration signatures matched 66 of 66. The stored pilot is
now `activationEligible: true` and `semanticReviewRequired: false`, but no
writer activation or legacy-path removal is part of Stage 6.

## Stage 7 canonical Plan writer activation

Stage 7 adds an explicit, versioned activation transaction for a fully
reconciled canonical Plan writer pilot. The activation is intentionally a
reversible Plan Intelligence overlay: estimators read the exact canonical
writer output, while the existing legacy Plan run remains current for Civil
Geometry and other workflows that have not completed their own canonical
cutovers. This prevents a Plan cutover from silently invalidating Euclid,
takeoff, or estimate records.

- Activation requires the current package and revision, ready canonical
  engineering record, exact governed `plan_inventory` artifact, eligible
  current pilot, completed semantic reconciliation, matching source and input
  fingerprints, and exact live page, view, reference, and calibration counts.
- The complete canonical output is fingerprinted at activation. Every Plan
  read recomputes and compares the package, record, artifact, pilot, run,
  input, output, and count lineage before canonical data can be returned.
- A stale pilot, changed record, changed artifact, changed output, or new bid
  package automatically routes Plan Intelligence back to the retained legacy
  run. The estimator is never shown a partially authorized canonical result.
- A new package revision, requested Plan reconstruction, drawing-authority
  decision, or calibration decision also records an append-only rollback and
  retires the active writer overlay before the legacy mutation proceeds.
- Current drawing-authority decisions are remapped by immutable
  document/page identity when the overlay is activated, so an activation
  cannot discard estimator review decisions.
- The earlier canonical Plan reader pilot is retired to rollback history when
  the writer output is activated. There is one unambiguous Plan read authority
  at a time.

The Titus activation `m17r3nc0vewzehend6ctaw7kz58bgx9n` authorizes canonical
run `yn74y6pg0venqgys71ysrhtphh8bhp4t` over retained legacy rollback run
`yn77ec908jczvxfxf64863b2k98betzd`. The live activation audit reports exact
canonical-writer mode with 179 pages, 377 views, 276 references, and 66
calibrations. Activation and verification made zero OpenAI calls and zero
original-PDF reads. The legacy PDF writer has not been removed, and Civil
Geometry has not been cut over in this stage.
