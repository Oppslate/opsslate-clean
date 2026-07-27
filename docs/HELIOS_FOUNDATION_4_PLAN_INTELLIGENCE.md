# Helios Foundation 4: Plan Intelligence, Quantity Takeoff, and Bid Digital Twin

Status: approved architecture direction; requirements and verification baseline
only; implementation not yet authorized

Product: Helios, a standalone responsive web application in the OpsSlate
product family

Primary mission: turn a complete heavy-highway bid package into a traceable,
estimator-controlled understanding of what must be built, where it is located,
how it is measured, and how it connects to the existing Helios estimate

Golden project: Kreese Mills Road Culvert

Upstream acquisition system: Bid Scout

Initial source handled by Bid Scout: Construction Exchange of Buffalo & WNY
Online Plan Room

## 1. Executive decision

Foundation 4 adds a spatial and quantity-intelligence layer beneath the
existing Helios estimating workflow.

It does not replace, rewrite, fork, or duplicate:

- the existing secure document-intelligence pipeline;
- the existing contractor Work Breakdown Structure;
- the existing owner pay-item register;
- the existing estimator and resource build-up;
- the existing three-panel cockpit;
- the existing evidence, procurement, risk, and decision-history controls; or
- the shared OpsSlate design system and component ownership.

Foundation 4 must integrate through stable, versioned contracts. Existing
accepted estimates, estimator decisions, prices, quantities, evidence reviews,
and WBS assignments remain authoritative and immutable.

The governing principle is:

> OpenAI and Helios interpret the work. A deterministic measurement engine
> measures the work. The estimator decides what enters the bid.

## 2. Mission thread

```text
Construction Exchange or other authorized bid source
  -> Bid Scout acquisition and secure storage staging
  -> versioned Bid Scout-to-Helios package handoff
  -> Helios receipt and integrity verification
  -> immutable package manifest
  -> document and sheet classification
  -> plans/specifications completeness gate
  -> mixed vector/scanned plan intelligence
  -> cross-document construction graph
  -> deterministic quantity proposals
  -> owner/Helios/production/purchasing quantity reconciliation
  -> estimator acceptance
  -> existing Helios WBS, estimate, cockpit, risk, and procurement workflows
```

The primary product is not a PDF viewer. The original PDF remains the legal
source record, and the viewer remains an evidence surface. The working product
is a bid digital twin connected to traceable takeoffs and the existing
contractor estimate.

## 3. Bid Scout-to-Helios acquisition boundary

Bid Scout owns all interaction with Construction Exchange and other approved
construction bidding sources. Bid Scout discovers opportunities, performs the
authorized download, stages the original plans and specifications in secure
storage, and hands a complete bid-package revision to Helios.

Helios does not log in to, browse, scrape, or download from Construction
Exchange. Helios begins at the authenticated package-handoff boundary. This
keeps source-site automation and credentials outside Helios while preserving
one evidence and intelligence pipeline after receipt.

The Construction Exchange publicly describes web access to project plans and
specifications through its Online Plan Room, including specifications divided
into linked sections. Its public site is evidence of the source workflow, not
an integration contract for Helios.

Reference:

- [Construction Exchange Online Plan Room](https://conexbuff.com/online-plan-room/)

### 3.1 System ownership

The approved responsibility split is:

1. Bid Scout interacts with the authorized source and downloads the selected
   plans, specifications, bid forms, addenda, and supporting documents.
2. Bid Scout stores immutable source objects and creates a versioned package
   manifest.
3. Bid Scout initiates an authenticated, tenant-scoped handoff to Helios.
4. Helios independently verifies authorization, manifest integrity, object
   hashes, package revision, and safe object access.
5. Helios durably copies every accepted object into its own protected project
   storage, recomputes the hash, and only then acknowledges durable receipt.
6. Helios registers the received package revision and applies the existing
   document-intelligence pipeline.
7. Helios reports every manifest entry as accepted, duplicate, superseded,
   rejected, missing, or requiring attention before analysis can finalize.

Helios may retain its current manual PDF, folder, and ZIP intake as a controlled
fallback and test harness. That path is not the normal Construction Exchange
workflow after Bid Scout integration and must produce the same canonical
handoff manifest.

### 3.2 Handoff contract

Bid Scout must hand Helios a versioned package envelope containing:

- handoff ID, contract version, created time, and idempotency key;
- source system and source opportunity/project identifiers;
- Bid Scout tenant/company ID and the authorized Helios destination company;
- project name, owner, location, bid date, and available source metadata;
- package revision, addendum/revision identifiers, and predecessor handoff;
- one manifest entry per object with stable object ID, original filename,
  relative path, media type, byte size, SHA-256 hash, source category, and
  source revision;
- short-lived, least-privilege object references or a server-to-server transfer
  mechanism;
- manifest totals and a Bid Scout completeness declaration;
- authentication principal, authorization claims, and a signed envelope or
  equivalent tamper-evident proof.

The contract is transport-neutral and must not expose Bid Scout's internal
database schema. API delivery, durable event delivery, or an explicitly
requested `Send to Helios` action may all use the same envelope. Receiving the
same handoff more than once must return the original result without creating
duplicate documents or analysis jobs.

Helios returns a versioned receipt containing the handoff ID, Helios project
and package-revision IDs, manifest totals, per-entry terminal dispositions,
durable-copy status, completeness status, and any retryable or permanent
errors. Bid Scout must not treat a request timeout as a failed import; it
queries or safely replays the same idempotency key until a terminal receipt is
available.

### 3.3 Trust boundary and security rules

- Helios never receives or stores Construction Exchange passwords, browser
  cookies, session tokens, or source-site credentials.
- Bid Scout identity is authenticated server-to-server; possession of an
  object URL alone is never authorization to import it.
- Helios derives the destination company and project authorization from the
  authenticated handoff, never from an untrusted browser-supplied company ID.
- The package is rejected closed when signature, tenant mapping, predecessor,
  hash, size, object count, or object access does not verify.
- Object references are short lived, read only, scoped to the declared
  manifest, and unusable across tenants.
- Helios recomputes each object hash before registration and detects exact
  duplicates, content changes under reused filenames, and missing objects.
- Encrypted, malformed, unsupported, or signature-mismatched objects are
  quarantined with a visible disposition.
- Original source files remain private, tenant-scoped, immutable, and linked
  to both the Bid Scout handoff and the Helios package revision.
- Every handoff records source, Bid Scout opportunity, package revision,
  initiating principal, receipt time, verification result, and downstream job
  IDs without logging credentials or document contents.

### 3.4 Bid Scout and Helios completeness responsibilities

Bid Scout declares what it acquired; Helios independently decides whether the
received package is sufficient for estimating. A successful transfer is not a
successful completeness review.

- Bid Scout completeness answers: "Did every selected source object reach
  storage and enter the handoff manifest?"
- Helios completeness answers: "Does this revision contain the plans,
  specifications, bid schedule, addenda, and supporting information required
  for the intended analysis?"
- Bid Scout may label likely document categories, but Helios validates those
  categories through the existing document-intelligence boundary.
- A handoff may be technically complete yet operationally blocked because
  plan sheets, specifications, addenda, scales, or referenced documents are
  absent.
- Subsequent Bid Scout downloads create new package revisions; they never
  mutate or replace a prior Helios source record in place.

## 4. Non-regression boundaries

### F4-BND-001 - Existing document intelligence

Foundation 3C remains the authoritative source for document summaries,
findings, evidence, citations, and original protected-PDF review. Foundation 4
may consume its accepted evidence and add plan-sheet intelligence records. It
must not silently rewrite prior findings or citations.

### F4-BND-002 - Existing WBS

The approved 12-section Helios contractor WBS remains the estimate grouping
authority. Plan-derived assets and quantities link to existing WBS sections;
they do not create a competing plan-discipline WBS.

### F4-BND-003 - Existing estimator

Owner pay items, operational cost codes, resources, rates, markups,
allocations, risk, and procurement retain their current contracts. Foundation
4 proposes governed quantity records through the existing quantity boundary.

### F4-BND-004 - Existing cockpit

The three-panel cockpit remains the primary bid-day workflow. Foundation 4 may
add plan/takeoff context through existing evidence and quantity contracts. It
must not replace the cockpit with a standalone plan viewer.

### F4-BND-005 - Human authority

Plan interpretation and quantities are proposals until accepted by an
authorized estimator. Reanalysis and revised sheets never silently overwrite
accepted work.

## 5. Foundation 4 increments

## 5.1 Foundation 4A - Secure Bid Scout Package Handoff

### Outcome

Reliably receive, verify, and register Bid Scout package revisions without
losing source identity, folder context, tenant isolation, or revision history.
The existing individual-PDF, folder, and ZIP intake remains a contract-
compatible fallback and test path.

### Functional requirements

- F4A-001: publish and validate a versioned Bid Scout-to-Helios package
  envelope;
- F4A-002: authenticate Bid Scout and authorize the destination tenant and
  project before accessing any source object;
- F4A-003: retain source opportunity, package revision, original filename,
  relative path, immutable object ID, and hash for every manifest entry;
- F4A-004: make handoff receipt idempotent by handoff ID, package revision,
  manifest entry, and content hash;
- F4A-005: verify signed/tamper-evident envelope data, object availability,
  byte size, media signature, and SHA-256 hash before registration;
- F4A-006: show per-object and aggregate transfer, validation, registration,
  and analysis-queue progress;
- F4A-007: distinguish additions, supersessions, exact duplicates, conflicting
  reused filenames, and prior revisions;
- F4A-008: reject closed on tenant mismatch, invalid predecessor, manifest
  mismatch, expired object access, or missing objects;
- F4A-009: safely support contract-compatible manual PDFs, folders, and ZIPs,
  including bounded expansion, nesting limits, and path-traversal protection;
- F4A-010: never finalize analysis while manifest entries remain unresolved;
- F4A-011: acknowledge receipt to Bid Scout with terminal dispositions and
  stable Helios package/revision identifiers;
- F4A-012: produce one estimator-readable handoff and registration report.

### Exit gate

One hundred percent of manifest entries have a terminal receipt disposition:
accepted, duplicate, superseded, rejected with reason, missing, or explicitly
withdrawn through a new auditable package revision. Replaying the handoff
creates no duplicate documents or analysis jobs, and a cross-company handoff
is rejected before object access.

## 5.2 Foundation 4B - Package Completeness and Document Control

### Outcome

Helios proves whether the package contains the information required to bid the
job instead of treating any collection of PDFs as complete.

### Required package categories

| Category | Baseline requirement | Effect when absent |
| --- | --- | --- |
| Plans | Required | Quantity and constructability analysis blocked |
| Specifications | Required | Scope/compliance readiness blocked |
| Owner bid schedule | Required when issued | Owner reconciliation blocked |
| Proposal/bid forms | Required when issued | Bid-submission readiness blocked |
| Addenda register | Required determination | Package remains revision-uncertain |
| Geotechnical information | Conditional | Subsurface risk warning |
| Utility information | Conditional | Utility-conflict warning |
| Environmental/permit documents | Conditional | Compliance warning |
| Standard sheets/details | Conditional | Referenced-source warning |

### Functional requirements

- F4B-001: classify documents using filename, folder path, title blocks,
  document content, and estimator confirmation;
- F4B-002: separately confirm `plans_received` and `specifications_received`;
- F4B-003: show file count, page/sheet count, revision, processing status, and
  exceptions for each category;
- F4B-004: require a reasoned estimator waiver when a normally required
  category was not issued;
- F4B-005: make misclassification correctable in one focused action;
- F4B-006: distinguish `uploaded`, `validated`, `classified`, `indexed`, and
  `ready`;
- F4B-007: prevent `Bid Package Complete` while blocking exceptions remain;
- F4B-008: support plans-only, specifications-only, and addendum uploads as
  additions to a controlled package revision without pretending they are a
  complete new package.

### Exit gate

The estimator sees and accepts one package-readiness statement covering plans,
specifications, bid schedule, proposal forms, addenda status, conditional
documents, and unresolved exceptions.

## 5.3 Foundation 4C - Mixed-Mode Plan-Sheet Intelligence

### Outcome

Turn vector, scanned, and hybrid plan sets into individually addressable,
revision-controlled sheets and views without altering the original PDF.

### Modality routing

Every page receives a modality assessment:

- `vector`: reliable embedded text and geometric drawing objects;
- `scanned`: raster drawing requiring OCR and computer vision;
- `hybrid`: meaningful vector and raster content that must be reconciled;
- `unusable`: encrypted, corrupt, blank, or below the approved readability
  threshold.

### Sheet record requirements

Each plan sheet stores or references:

- source document and immutable package revision;
- physical PDF page and printed sheet number;
- sheet number, title, discipline, and subdiscipline;
- issue date, revision marker, and addendum association;
- modality and processing version;
- title-block boundary and extracted metadata;
- detected plan, profile, section, detail, schedule, legend, note, and
  calculation regions;
- north orientation when applicable;
- candidate scales and their source regions;
- cross-sheet references and specification references;
- processing confidence and explicit unresolved issues.

### Scale-control requirements

- F4C-001: scales belong to individual views, not automatically to the entire
  PDF page;
- F4C-002: accept stated numeric scale, graphic scale, or estimator
  calibration against a known dimension;
- F4C-003: reconcile multiple scale signals and expose conflicts;
- F4C-004: prohibit measurable quantities from an uncalibrated view;
- F4C-005: preserve calibration source, user/model, units, confidence,
  timestamp, and revision;
- F4C-006: invalidate dependent proposed measurements when calibration changes
  while preserving accepted measurement history.

### Exit gate

Every source page is registered as a sheet, non-sheet page, or exception. Every
measurable view has an approved calibration or a visible blocking status.

## 5.4 Foundation 4D - Construction Knowledge Graph

### Outcome

Connect the project's documents, spatial assets, scope requirements, and
estimating records into one traceable bid model.

### Core graph entities

- package revision;
- source document;
- plan sheet and sheet region;
- specification section and requirement;
- owner pay item;
- Helios WBS section;
- operational cost code;
- physical construction asset;
- location, station range, offset, elevation, and zone;
- measurement and quantity proposal;
- temporary work and construction constraint;
- risk, clarification, RFQ, and submittal;
- evidence and revision-impact record.

### Required relationships

```text
asset -> shown_on -> sheet/view/detail
asset -> governed_by -> specification requirement
asset -> paid_under -> owner pay item
asset -> estimated_under -> WBS section/cost code
measurement -> measures -> asset or work limit
quantity -> derived_from -> measurements/formula
constraint -> affects -> asset/operation/location
revision -> supersedes -> prior sheet/document
revision -> impacts -> measurement/quantity/scope/risk/procurement
```

### Graph invariants

- No accepted quantity exists without a source or estimator-entered basis.
- No source relationship crosses company or project boundaries.
- Graph inference remains proposed until accepted.
- Deleting a derived proposal never deletes the immutable source.
- Supersession closes a prior source version; it never mutates its content.
- Every graph edge retains origin, confidence, processing version, and review
  status.

### Exit gate

An estimator can navigate from any proposed quantity or construction asset to
the exact plan view, specification requirement, owner pay item, WBS location,
and affected risk or procurement record.

## 5.5 Foundation 4E - Deterministic Quantity Engine

### Outcome

Create auditable plan-takeoff proposals in increasing levels of geometric and
construction complexity.

### Quantity authorities

| Quantity | Authority and use |
| --- | --- |
| Owner bid quantity | Contractual payment and bid-schedule basis |
| Helios measured quantity | Independent plan takeoff proposal |
| Production quantity | Accepted field-production basis |
| Purchasing quantity | Accepted material quantity including waste |
| Risk quantity | Explicit uncertain or potential exposure |

These quantities remain distinct. Accepting one does not overwrite another.

### Measurement record

Every measurement must retain:

- measurement type: count, length, area, volume, or derived;
- source document, sheet, view, detail/callout, and revision;
- calibration ID and units;
- measurement geometry or recognized object references;
- raw measured value;
- deterministic formula and conversion factors;
- included and excluded scope;
- assumptions and uncertainty;
- origin, confidence, status, and processing version;
- reviewer, accepted value, decision time, and comment when reviewed.

### Stage 1 - Counts and linear quantities

Initial scope:

- pipe, culvert, and underdrain lengths;
- catch basins, manholes, headwalls, and end sections;
- structures, signs, signals, and other discrete objects;
- guardrail, fence, curb, striping, and similar linear work.

Initial verification target:

- counts: exact against the golden estimator takeoff;
- linear quantities: within 2 percent or explicitly explained;
- 100 percent traceability to accepted views and calibrations.

### Stage 2 - Area quantities

Initial scope:

- clearing and grubbing limits;
- erosion-control and geotextile areas;
- pavement, milling, and tack limits;
- topsoil, seed, mulch, planting, and restoration limits.

Initial verification target:

- within 2 percent of the golden estimator takeoff or explicitly explained;
- no area accepted across conflicting or unapproved scale regions.

### Stage 3 - Volume quantities

Initial scope:

- unclassified, structural, trench, and rock excavation;
- unsuitable material removal;
- embankment, borrow, backfill, and select structure fill;
- subbase and aggregate courses;
- concrete foundations, walls, pavement, and structures.

Initial verification target:

- within 5 percent of the golden estimator takeoff or explicitly explained;
- distinguish plan geometry from estimator factors such as swell, shrink,
  compaction, waste, and overexcavation;
- block false precision when surfaces, profiles, or limits are incomplete.

### Stage 4 - Constructability quantities

Initial scope:

- temporary excavation support;
- dewatering and bypass pumping;
- access, staging, work zones, and temporary facilities;
- haul distance, trucking cycles, and disposal exposure;
- temporary traffic-control phases;
- construction joints, working room, waste, and incidental work.

These quantities may combine measured geometry, specification obligations,
construction assumptions, and estimator rules. Each component must remain
visible and independently reviewable.

### Reconciliation requirements

- F4E-001: compare owner, measured, production, purchasing, and risk quantities
  without silently selecting a winner;
- F4E-002: flag any count discrepancy;
- F4E-003: flag linear or area variance exceeding 2 percent;
- F4E-004: flag volume variance exceeding 5 percent;
- F4E-005: allow project-specific thresholds only through audited estimator
  configuration;
- F4E-006: record whether a difference becomes production quantity, risk,
  clarification, qualification, or no action;
- F4E-007: deterministically recalculate proposed quantities when measurements
  or formulas change;
- F4E-008: never convert unknown, failed, or uncalibrated measurements to zero.

### Exit gate

Every calculated quantity is reproducible from stored geometry, calibration,
formula, factors, and revision, and every accepted quantity has an append-only
estimator decision.

## 5.6 Foundation 4F - Bid Digital Twin and Existing-Workflow Integration

### Outcome

Represent how the job fits together in construction terms and feed accepted
results into the existing Helios quantity, estimate, cockpit, risk, and
procurement contracts.

### Bid digital twin content

- physical assets and work limits;
- spatial and station relationships;
- construction sequence and predecessors;
- temporary works;
- access and staging constraints;
- traffic phases;
- crews, equipment, productivity, and duration assumptions;
- material, supplier, subcontract, trucking, and disposal needs;
- unresolved constructability questions;
- owner/Helios quantity variances;
- revision and addendum impacts.

The first release is a semantic and spatial construction model. It is not
required to create a photorealistic 3D model. When reliable surfaces or model
geometry exist, 2D/3D visualization may be added as a view of the same graph,
not as a separate source of truth.

### Existing-workflow integration rules

- Accepted owner pay items remain unchanged.
- The 12-section contractor WBS remains unchanged.
- Plan assets link to existing owner items and cost codes.
- Accepted plan takeoffs create or update governed quantity records through
  the existing quantity mutation boundary.
- No quantity acceptance creates a price.
- No plan finding creates an RFQ, submittal, risk carry, or estimate cost
  without the existing authorized action.
- Cockpit additions must preserve the approved three-panel workflow and
  one-click bid-day decision standard.

### Exit gate

The estimator can select an existing WBS/pay-item/cost-code record and see its
accepted plan quantities, exact source, constructability context, variance,
revision state, and unresolved decisions without leaving the cockpit workflow.

## 6. Storage architecture

Foundation 4 uses separate storage responsibilities.

### 6.1 Immutable object storage

Bid Scout stores the acquired source package in its secure acquisition
storage. Helios does not query that database or depend on its internal schema.
During handoff, Helios copies each verified object into Helios-controlled,
tenant-scoped project storage. A handoff is not durably accepted until those
copies and hashes verify.

Helios stores:

- immutable source PDFs and package artifacts transferred or referenced by Bid
  Scout and retained according to policy;
- normalized per-sheet renderings;
- high-resolution raster tiles for scanned drawings;
- bounded vector geometry artifacts;
- measurement overlays and derived spatial artifacts.

Large binary and geometry artifacts do not belong directly in transactional
database rows.

### 6.2 Transactional metadata

Store tenant-scoped records for:

- package manifests and revisions;
- document and sheet identity;
- classification and completeness state;
- regions, calibrations, assets, relationships, measurements, quantities,
  revision impacts, review decisions, and processing jobs;
- pointers, hashes, sizes, versions, and retention state for object artifacts.

### 6.3 Search and reasoning inputs

Use bounded text, symbols, metadata, evidence, and geometry summaries for
search and AI reasoning. Do not send unrestricted project storage or unrelated
tenant data to any model provider.

### 6.4 Provider retention

The current Foundation 3C provider-retention and cleanup controls remain in
force. Foundation 4 must separately document any new model, OCR, vision, or
geometry provider before use. Original files remain in Helios-controlled
tenant storage; provider artifacts are temporary unless an approved retention
decision explicitly says otherwise.

## 7. Processing architecture and states

### 7.1 Durable processing jobs

Each stage has an independently retryable job:

```text
handoff_received
  -> authorizing
  -> manifest_verifying
  -> object_copying
  -> receipt_registered
  -> validating
  -> classified
  -> sheet_indexing
  -> modality_processing
  -> calibration_review
  -> graph_building
  -> quantity_processing
  -> ready_for_review
```

Terminal exception states include:

- handoff_unauthorized;
- tenant_mismatch;
- manifest_invalid;
- object_unavailable;
- object_hash_mismatch;
- rejected_source;
- encrypted;
- corrupt;
- unreadable;
- missing_sheet_identity;
- calibration_required;
- conflicting_scale;
- geometry_incomplete;
- provider_failed;
- superseded.

One failed sheet must not erase successful sheet intelligence. Project-level
readiness reports exact partial completion and blocking effects.

### 7.2 Idempotency

Every derived result is keyed by source hash, source revision, processing
contract version, and relevant calibration/rule version. Retrying the same
input does not duplicate accepted assets, measurements, or quantities.

### 7.3 Observability

Record bounded operational telemetry for:

- files, pages, and sheets processed;
- modality and OCR/vector success rates;
- unresolved sheet numbers and scales;
- processing duration and retry count;
- asset and quantity proposal counts;
- accepted, corrected, rejected, and superseded records;
- golden-project accuracy and regression results.

Never log source document content, credentials, signed storage URLs, or raw
provider responses.

## 8. NASA-style engineering controls

### 8.1 Requirements traceability

Every implementation pull request and acceptance test must reference one or
more Foundation 4 requirement IDs. No feature is complete without a linked
verification method and recorded result.

### 8.2 Configuration management

Configuration-controlled items include:

- package and sheet revisions;
- extraction, OCR, vision, and reasoning contract versions;
- symbol libraries;
- scale calibration rules;
- quantity formulas and unit conversions;
- project thresholds and estimator factors;
- WBS and estimate integration contracts.

### 8.3 Independent verification

AI interpretation does not verify deterministic geometry. Deterministic
geometry does not verify construction scope. Golden-project tests must check
both independently and then verify their integration.

### 8.4 Fail-safe behavior

- Unknown is never zero.
- Missing scale is never assumed.
- Conflicting dimensions are never averaged silently.
- A scanned sheet is never treated as vector because OCR found text.
- A revised sheet never silently changes accepted quantity or cost.
- Partial processing never presents the project as complete.
- Low confidence never hides the underlying source or calculation.

### 8.5 Human factors

- Optimize common review decisions for one click.
- Keep exceptions and variance visible above routine confirmations.
- Preserve keyboard operation and focus.
- Do not require estimators to review system-created empty records.
- Use progressive detail: package readiness, sheet exception, measurement,
  formula, and source geometry.

## 9. DARPA-style technology strategy

### 9.1 Multiple sensing paths

Use vector objects, OCR, computer vision, dimensions, schedules, legends,
title blocks, specification evidence, owner quantities, and historical
patterns as independent signals. Record agreement and conflict rather than
allowing one model result to dominate invisibly.

### 9.2 Challenge functions

Automatically challenge proposals when:

- a counted object appears in a schedule but not in plan views;
- plan/profile quantities disagree;
- owner quantity differs materially from measured quantity;
- referenced details or sheets are absent;
- an asset lacks a specification/payment relationship;
- a new revision changes geometry without an estimate impact;
- construction sequence requires temporary work not represented in the bid.

### 9.3 Modular technology insertion

OCR, vector extraction, symbol recognition, reasoning, geometry, and 3D
visualization remain replaceable modules behind stable Helios contracts. No
single vendor response format becomes the domain model.

### 9.4 Learning loop

Estimator corrections improve proposed classifications and measurement rules
only through versioned, reviewed updates. A correction on one company/project
does not silently alter another tenant's accepted behavior.

## 10. Hazard and failure analysis

| Hazard | Consequence | Required control |
| --- | --- | --- |
| Bid Scout handoff omits or cannot transfer plan objects | Missing quantities and false readiness | Signed manifest, per-object hash verification, separate plans/specs confirmation, and terminal dispositions |
| Bid Scout and Helios tenant mappings disagree | Cross-company disclosure | Reject before object access and require an authorized mapping |
| Same handoff is retried after a timeout | Duplicate documents or analysis cost | End-to-end idempotency and stable receipt acknowledgment |
| New addendum arrives after analysis | Obsolete quantities or scope | New immutable package revision and explicit impact review |
| Page uses wrong scale | Material quantity error | Per-view calibration and measurement block |
| Scanned drawing OCR error | Missed or false asset | Modality flag, confidence, visual overlay, human review |
| Revised sheet not recognized | Bid based on obsolete scope | Hash/revision control and supersession impact report |
| Owner quantity mistaken for production quantity | Crew/productivity error | Separate quantity authorities |
| Unknown treated as zero | Underbid | First-class unknown/takeoff-required state |
| AI invents geometry or quantity | Untraceable cost | Deterministic measurement and source/formula requirement |
| Duplicate files counted twice | Duplicate scope | Hash and sheet-identity reconciliation |
| One failed sheet marks project complete | Hidden scope gap | Partial readiness and blocking dependency report |
| Cross-tenant source relationship | Confidentiality breach | Tenant/project authorization on every record and artifact |
| Addendum silently overwrites accepted work | Loss of estimator control | Immutable versions and explicit revision-impact review |

## 11. Kreese Mills golden-project verification plan

### 11.1 Baseline creation

1. Freeze the current Kreese Mills plans, specifications, bid schedule, and
   addenda as Golden Baseline 1.
2. Record every source hash, page count, sheet number, title, revision, and
   package category.
3. Have an experienced estimator produce an independent controlled takeoff.
4. Store benchmark measurements, quantities, calculation notes, assumptions,
   and excluded scope outside the implementation under test.

### 11.2 Verification sequence

1. Create Golden Baseline 1 as a versioned Bid Scout package handoff.
2. Prove the authenticated company/project mapping before any object access.
3. Prove every manifest object is durably copied, hash verified, and assigned
   a terminal receipt disposition.
4. Replay the identical handoff and prove no duplicate documents or jobs.
5. Tamper with one hash and one tenant mapping in controlled tests and prove
   both handoffs reject closed.
6. Prove every file and page has a terminal manifest disposition.
7. Prove separate plans and specifications confirmation.
8. Prove sheet identification and modality routing.
9. Verify per-view calibration and conflict handling.
10. Verify Stage 1 counts and lengths.
11. Verify Stage 2 areas.
12. Verify Stage 3 volumes.
13. Verify Stage 4 constructability quantities.
14. Verify owner/Helios/production/purchasing/risk reconciliation.
15. Verify WBS, owner-item, cost-code, evidence, cockpit, and decision-history
    integration without altering accepted estimator data.
16. Introduce a controlled revised sheet through a second Bid Scout handoff and
    verify supersession, stale-result
    invalidation, impact reporting, and explicit estimator disposition.
17. Re-run from the same baseline and prove deterministic repeatability.

### 11.3 Initial quantitative acceptance targets

| Measure | Target |
| --- | --- |
| Unauthorized or cross-company object access | Zero occurrences |
| Manifest objects durably copied and hash verified | 100 percent |
| Identical handoff replay duplicates | Zero occurrences |
| Selected files accounted for | 100 percent |
| PDF pages accounted for | 100 percent |
| Sheets identified or explicitly flagged | 100 percent |
| Accepted quantity source traceability | 100 percent |
| Discrete-object counts | Exact |
| Linear takeoffs | Within 2 percent or explained |
| Area takeoffs | Within 2 percent or explained |
| Volume takeoffs | Within 5 percent or explained |
| Unknown converted to zero | Zero occurrences |
| Accepted record silently overwritten | Zero occurrences |
| Cross-company data exposure | Zero occurrences |
| Same-input deterministic rerun difference | Zero unexplained difference |

The tolerances are validation thresholds, not permission to hide variance.
Helios always displays the actual difference and its source.

## 12. Objective Foundation 4 acceptance criteria

Foundation 4 passes only when a reviewer can verify all of the following:

- The current estimator, WBS, cockpit, and document-intelligence behavior
  remains operational and regression-tested.
- Bid Scout is the sole owner of Construction Exchange interaction; Helios
  begins at the authenticated package-handoff boundary.
- Every accepted handoff object is durably stored and hash verified in Helios
  before receipt acknowledgment.
- Replayed handoffs are idempotent, and invalid signatures, tenant mappings,
  manifests, or hashes reject closed before analysis.
- The package cannot be labeled complete without plans and specifications or
  an audited waiver.
- The original source remains private, immutable, and reviewable.
- Vector, scanned, hybrid, and unusable pages follow explicit processing
  paths.
- Every sheet/page has a terminal registration or exception state.
- Every measurable view has an approved calibration.
- Every quantity preserves source geometry, formula, factors, revision, and
  review state.
- Owner, measured, production, purchasing, and risk quantities remain
  independent.
- Golden-project results meet the approved staged tolerances.
- A revised sheet produces an impact report and never silently changes
  accepted estimate data.
- Every Foundation 4 mutation enforces session, role, tenant, project, parent
  hierarchy, current revision, and accepted-work boundaries.
- Desktop, tablet, and mobile workflows retain OpsSlate design authority,
  accessibility, focus, error recovery, and no page-level horizontal overflow.
- No placeholder plan data, fake quantities, copied UI libraries, exposed
  storage URLs, or disconnected mock records exist.

## 13. Explicitly prohibited patterns

- Treating a Bid Scout download or storage write as a successful Helios
  handoff before manifest and object verification.
- Marking documents ready based only on file count.
- Using one scale for every view on a sheet without validation.
- Asking an LLM to produce final quantities without deterministic geometry.
- Reconstructing a plan and presenting it as the legal source.
- Flattening owner, production, purchasing, and risk quantities into one
  number.
- Writing plan results directly into accepted estimate records.
- Replacing the approved cockpit with a PDF-reader workspace.
- Allowing Helios to scrape Construction Exchange or receive member
  credentials from Bid Scout.
- Coupling Helios directly to Bid Scout's internal storage tables or database
  schema.
- Trusting Bid Scout category labels, filenames, or completeness declarations
  without Helios verification.
- Storing large PDFs, tiles, or geometry directly in transactional rows.
- Silent fallbacks, placeholder zeros, fake progress, or disconnected mock
  data.
- Building photorealistic 3D before the semantic/spatial construction graph is
  verified.

## 14. Implementation authorization gates

No Foundation 4 application code should begin until this document is reviewed
and the following decisions are explicitly approved:

1. Secure Bid Scout package handoff and independent Helios completeness are
   the first implementation increment.
2. Bid Scout owns Construction Exchange interaction, authorized download, and
   secure source-object staging.
3. Helios receives only a versioned, authenticated, tenant-scoped package
   envelope and immutable source objects; it receives no Construction Exchange
   credentials or sessions.
4. The existing manual PDF/folder/ZIP intake remains a contract-compatible
   fallback and test harness, not the normal Construction Exchange workflow.
5. Kreese Mills is the golden verification project.
6. Quantity capability is delivered in four stages: count/linear, area,
   volume, and constructability.
7. The initial accuracy targets and variance thresholds are accepted or
   revised.
8. Foundation 4 integrates through existing quantity/evidence contracts and
   does not rewrite the estimator, WBS, cockpit, or Foundation 3C intelligence.

After approval, implementation should begin with Foundation 4A and 4B only.
Foundation 4C through 4F remain gated by the verified exit criteria of the
preceding increment.
