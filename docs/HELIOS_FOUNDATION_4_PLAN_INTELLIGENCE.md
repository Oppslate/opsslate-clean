# Helios Foundation 4: Plan Intelligence, Quantity Takeoff, and Bid Digital Twin

Status: approved architecture direction; requirements and verification baseline
only; implementation not yet authorized

Product: Helios, a standalone responsive web application in the OpsSlate
product family

Primary mission: turn the available heavy-highway bid basis into a traceable,
estimator-controlled understanding of what must be built, where it is known to
be located, how it can be measured, what remains unknown, and how it connects
to the existing Helios estimate

Golden project: Kreese Mills Road Culvert

Current acquisition path: authenticated manual upload to Helios

Planned upstream integration: Bid Scout through the canonical package adapter

Initial external source reference: Construction Exchange of Buffalo & WNY
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
  -> authorized user download
  -> Helios manual PDF/folder/ZIP/written-scope intake (active)

Future parallel path:
Bid Scout acquisition and secure storage staging
  -> versioned Bid Scout adapter (planned)

Both paths
  -> canonical package envelope and integrity verification
  -> immutable package manifest
  -> document and sheet classification
  -> bid-basis profile and capability determination
  -> available-source intelligence
  -> mixed vector/scanned plan intelligence when plans exist
  -> cross-document construction graph
  -> deterministic quantity proposals where measurable evidence exists
  -> owner/Helios/production/purchasing quantity reconciliation
  -> estimator acceptance
  -> existing Helios WBS, estimate, cockpit, risk, and procurement workflows
```

The primary product is not a PDF viewer. The original PDF remains the legal
source record, and the viewer remains an evidence surface. The working product
is a bid digital twin connected to traceable takeoffs and the existing
contractor estimate.

## 3. Canonical package intake and future Bid Scout boundary

Manual upload is the approved active acquisition path. An authorized user
downloads the available bid documents from Construction Exchange or another
source and submits individual PDFs, folders, ZIP packages, or a written scope
to Helios.

Helios does not log in to, browse, scrape, or download from Construction
Exchange. The planned Bid Scout integration will later own that upstream
automation, but Foundation 4 does not depend on Bid Scout availability. Both
paths must create the same canonical Helios package envelope so downstream
document intelligence and estimating behavior remain identical.

The Construction Exchange publicly describes web access to project plans and
specifications through its Online Plan Room, including specifications divided
into linked sections. Its public site is evidence of the source workflow, not
an integration contract for Helios.

Reference:

- [Construction Exchange Online Plan Room](https://conexbuff.com/online-plan-room/)

### 3.1 Active manual workflow

The approved current workflow is:

1. An authorized user downloads the available source package through the
   source site's normal controls.
2. The user selects individual PDFs, one or more folders, a ZIP package, or
   enters an issued written scope in Helios.
3. Helios creates a local manifest preview showing filenames, relative paths,
   sizes, categories, duplicates, and detected revisions before finalization.
4. Helios authorizes the current session, company, project, and role; validates
   each object; and safely expands ZIP packages.
5. Helios copies accepted objects into protected tenant/project storage,
   computes hashes, and registers one immutable package revision.
6. Helios reports every manifest entry as accepted, duplicate, superseded,
   rejected, missing, or requiring attention.
7. The existing document-intelligence pipeline receives only successfully
   registered objects and the canonical package metadata.

Manual intake is not temporary throwaway code. It is the first supported
adapter and remains available for direct packages, testing, recovery, and bid
sources that Bid Scout does not cover.

### 3.2 Canonical package-envelope contract

Every intake adapter must produce a versioned package envelope containing:

- envelope ID, contract version, created time, and idempotency key;
- source system and source opportunity/project identifiers;
- source adapter (`manual` or future `bid_scout`), source tenant/company when
  applicable, and the authorized Helios destination company;
- project name, owner, location, bid date, and available source metadata;
- package revision, addendum/revision identifiers, and predecessor envelope;
- one manifest entry per object with stable object ID, original filename,
  relative path, media type, byte size, SHA-256 hash, source category, and
  source revision;
- for a written scope captured as source-site text rather than a file, an
  immutable narrative object with exact source text, source location, capture
  time, source attribution, media type, byte size, and SHA-256 hash;
- short-lived, least-privilege object references or a server-to-server transfer
  mechanism;
- manifest totals and an adapter transfer-completeness declaration;
- authentication principal, authorization claims, and a signed envelope or
  equivalent tamper-evident proof.

The contract is transport-neutral and must not expose an adapter's internal
database schema. Manual upload creates this envelope inside the authenticated
Helios request flow. Future API delivery, durable event delivery, or an
explicit `Send to Helios` action uses the same contract. Replaying the same
envelope must not create duplicate documents or analysis jobs.

Helios creates a versioned receipt containing the envelope ID, Helios project
and package-revision IDs, manifest totals, per-entry terminal dispositions,
durable-copy status, transfer-completeness status, bid-basis profile, and any
retryable or permanent errors. The manual adapter displays this receipt to the
user. The future Bid Scout adapter receives the same result electronically.

### 3.3 Planned Bid Scout adapter

Bid Scout integration remains planned and disabled until Bid Scout is ready
and separately approved. The future adapter will:

1. interact with the authorized bidding source and stage the issued source
   materials in Bid Scout-controlled storage;
2. map the Bid Scout company/opportunity to an authorized Helios company and
   project;
3. create the canonical package envelope and provide short-lived,
   least-privilege object references or server-to-server transfer;
4. authenticate server-to-server and submit or replay the envelope using its
   stable idempotency key; and
5. receive the same terminal receipt produced for manual intake.

The adapter may be developed against contract fixtures and a disabled feature
flag before live Bid Scout integration. It must not create a second document-
intelligence pipeline or require changes to the estimator, WBS, cockpit, risk,
procurement, or quantity contracts.

### 3.4 Trust boundary and security rules

- Helios never receives or stores Construction Exchange passwords, browser
  cookies, session tokens, or source-site credentials.
- Manual intake requires the existing authenticated Helios session, same-
  origin mutation control, role authorization, and server-derived company and
  project scope.
- Future Bid Scout identity is authenticated server-to-server; possession of
  an object URL alone is never authorization to import it.
- Helios derives destination company and project authorization from the
  authenticated session or future adapter identity, never from an untrusted
  browser-supplied company ID.
- The package is rejected closed when signature, tenant mapping, predecessor,
  hash, size, object count, or object access does not verify.
- Future remote object references are short lived, read only, scoped to the
  declared manifest, and unusable across tenants.
- Helios recomputes each object hash before registration and detects exact
  duplicates, content changes under reused filenames, and missing objects.
- Encrypted, malformed, unsupported, or signature-mismatched objects are
  quarantined with a visible disposition.
- Original source files remain private, tenant-scoped, immutable, and linked
  to the intake envelope and Helios package revision.
- Every intake records adapter, source reference, package revision, initiating
  principal, receipt time, verification result, and downstream job IDs without
  logging credentials or document contents.

### 3.5 Adapter and Helios bid-basis responsibilities

The active intake adapter declares what was selected or acquired; Helios
independently determines the project's available bid basis and enables the
capabilities supported by that basis. A successful transfer is not proof that
every conventional document type exists, and the absence of a document that
was never issued must not prevent the estimator from starting work.

- Adapter completeness answers: "Did every selected source object reach
  storage and enter the canonical manifest?"
- Helios bid-basis review answers: "What authoritative information was issued,
  what was received, what remains expected, and which estimating capabilities
  can safely operate now?"
- Manual user selections or future Bid Scout metadata may label likely
  document categories, but Helios validates those categories through the
  existing document-intelligence boundary.
- An intake may be technically complete while individual capabilities are
  unavailable or provisional. For example, a specifications-only project can
  proceed through scope breakdown and estimating while plan measurement stays
  unavailable.
- Only unresolved transfer or integrity failures block package registration.
  Missing source categories create scoped limitations, warnings, risks, and
  unknowns; they do not globally block the estimate.
- Subsequent manual uploads or future Bid Scout deliveries create new package
  revisions; they never mutate or replace a prior Helios source record in
  place.

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

## 5.1 Foundation 4A - Canonical Package Intake

### Outcome

Reliably receive, verify, and register manual package revisions now without
losing source identity, folder context, tenant isolation, or revision history,
while establishing the stable adapter contract Bid Scout will use later.

### Functional requirements

- F4A-001: define and validate one versioned canonical package envelope for
  every intake adapter;
- F4A-002: support authenticated manual PDFs, multiple folders, ZIP packages,
  append uploads, revised/addendum packages, and written-scope evidence;
- F4A-003: authorize the active Helios session, role, company, project, and
  parent hierarchy before accepting any object;
- F4A-004: retain source reference, package revision, original filename,
  relative path, immutable object ID, and hash for every manifest entry;
- F4A-005: safely expand ZIPs with bounded file count, expanded size, nesting
  depth, media validation, and path-traversal protection;
- F4A-006: verify object byte size, media signature, and SHA-256 hash before
  registration;
- F4A-007: make upload/receipt resumable and idempotent by envelope ID, package
  revision, manifest entry, and content hash;
- F4A-008: show per-object and aggregate transfer, validation, registration,
  and analysis-queue progress;
- F4A-009: distinguish additions, supersessions, exact duplicates, conflicting
  reused filenames, and prior revisions;
- F4A-010: never finalize analysis while selected manifest entries remain
  unresolved;
- F4A-011: return terminal dispositions and stable Helios package/revision IDs
  through the canonical receipt;
- F4A-012: provide contract fixtures and disabled-adapter tests proving a
  future Bid Scout envelope produces the same registered package as manual
  intake;
- F4A-013: require future Bid Scout server authentication, tenant mapping,
  tamper-evident envelope data, and reject-closed behavior before enabling the
  adapter;
- F4A-014: produce one estimator-readable intake and registration report.

### Exit gate

Manual PDF, folder, ZIP, revision, and written-scope scenarios produce the same
canonical manifest and receipt. One hundred percent of selected entries have a
terminal disposition; resume/replay creates no duplicates; cross-company input
is rejected; and the disabled Bid Scout contract fixture yields an equivalent
registered-package shape without requiring live Bid Scout availability.

## 5.2 Foundation 4B - Bid-Basis Profiling and Document Control

### Outcome

Helios determines which source basis the owner issued, distinguishes not-issued
documents from expected-but-missing documents, and starts the estimate with
the supported capabilities without pretending the package is more complete
than it is.

### Supported bid-basis profiles

Every package receives one estimator-confirmable profile:

| Bid-basis profile | Supported work | Required limitation |
| --- | --- | --- |
| `plans_and_specs` | Full cross-document intelligence and measurable plan takeoff | Missing referenced documents remain scoped exceptions |
| `plans_only` | Plan interpretation, asset graph, geometric takeoff, WBS and estimate development | Specification, material, execution, payment, and compliance requirements are unknown unless shown on plans |
| `specs_only` | Scope and requirement extraction, owner-item/WBS mapping, estimate development, and owner-quantity reconciliation when quantities are supplied | Plan geometry, location validation, and measured takeoff are unavailable |
| `written_scope_only` | Scope decomposition, proposed WBS/items, conceptual estimate, assumptions, clarifications, and risk register | Quantities, details, specifications, and constructability remain estimator-supplied or explicitly unknown |
| `mixed_or_other` | Estimator-selected capabilities supported by the actual evidence | Unsupported conclusions remain unavailable and visible |

### Category availability states

Each category is tracked independently as:

- `received` - an issued source was received and verified;
- `not_issued` - the owner/source did not issue this category;
- `expected_missing` - evidence indicates it should exist but it was not
  received;
- `unknown` - Helios cannot yet determine whether it was issued;
- `not_applicable` - the category does not apply to this procurement; or
- `superseded` - a newer controlled revision governs.

The tracked categories include plans, specifications, written scope, owner bid
schedule, proposal/bid forms, addenda, geotechnical information, utilities,
environmental/permit documents, and referenced standards/details.

### Capability behavior

- Overall workspace state is one of `estimate_ready`,
  `estimate_ready_with_limitations`, or `no_usable_scope_basis`. Only transfer
  or integrity failure and `no_usable_scope_basis` prevent the estimate from
  opening.
- Estimate Workspace readiness is independent from plan-takeoff readiness,
  specification-compliance readiness, owner-reconciliation readiness, and
  bid-submission readiness.
- A usable written scope, plan set, specification set, or combination can open
  the Estimate Workspace immediately after secure registration.
- Missing plans disable only plan-dependent measurements, spatial validation,
  and plan-derived constructability conclusions.
- Missing specifications disable only spec-dependent scope, material,
  execution, payment, submittal, and compliance conclusions.
- Missing owner bid schedules disable owner-item reconciliation but do not
  prevent contractor WBS items or conceptual estimate development.
- `not_issued` and `not_applicable` are not blockers and require no waiver.
- `expected_missing` and `unknown` remain visible warnings and may create a
  clarification or risk, but they do not freeze the estimate.
- Quantities unsupported by available evidence remain `unknown` or
  `takeoff_required`; they are never defaulted to zero.
- When a later revision supplies a missing category, Helios adds the newly
  supported capabilities and produces an impact report without overwriting
  accepted estimate work.
- A written scope may be an owner-issued file or an immutable narrative
  captured by Bid Scout. Helios preserves the exact original and its source
  metadata before creating any normalized analysis text.

### Functional requirements

- F4B-001: classify documents using filename, folder path, title blocks,
  document content, and estimator confirmation;
- F4B-002: infer and allow one-action confirmation or correction of the
  bid-basis profile;
- F4B-003: show file count, page/sheet count, revision, processing status, and
  exceptions for each category;
- F4B-004: independently record every category's availability state and the
  evidence or estimator decision supporting it;
- F4B-005: make misclassification correctable in one focused action;
- F4B-006: distinguish `uploaded`, `validated`, `classified`, `indexed`, and
  `ready`;
- F4B-007: compute capability-specific readiness rather than one universal
  `Bid Package Complete` state;
- F4B-008: support plans-only, specifications-only, written-scope-only, mixed,
  and addendum revisions without forcing absent categories;
- F4B-009: open the existing Estimate Workspace when at least one verified,
  usable scope basis exists;
- F4B-010: explain every unavailable capability in plain estimator language
  and provide the fastest relevant action without a dead-end wait state;
- F4B-011: preserve assumptions, unknowns, limitations, and category changes
  in the decision history;
- F4B-012: re-evaluate capabilities and downstream impacts when new source
  categories or revisions arrive;
- F4B-013: accept a written-scope evidence object without requiring a plan or
  specification PDF and retain its exact source text, provenance, and hash;
- F4B-014: present one-click `Proceed with available basis` when confirmation
  is needed, remember the decision for that revision, and avoid repeated
  blocking prompts.

### Exit gate

The estimator can begin an estimate from each supported bid-basis profile. The
workspace shows what Helios can do now, what it cannot support from the issued
evidence, what remains expected or unknown, and what changes when a later
revision arrives. No valid profile is held in a waiting state solely because
plans or specifications were not issued.

## 5.3 Foundation 4C - Mixed-Mode Plan-Sheet Intelligence

### Outcome

Turn vector, scanned, and hybrid plan sets into individually addressable,
revision-controlled sheets and views without altering the original PDF.

This increment runs only when the active bid-basis profile includes plans. A
project without plans bypasses plan processing with an explicit
`not_applicable_to_current_basis` state; it is not a processing failure and
does not block the Estimate Workspace.

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

Create auditable quantity proposals in increasing levels of geometric and
construction complexity.

On plans-only and plans-and-specifications projects, this engine may calculate
from calibrated geometry. On specifications-only and written-scope-only
projects, it consumes only explicit owner quantities or estimator-entered
measurements; it does not fabricate plan geometry. The estimate remains usable
with quantity states of `unknown`, `owner_provided`, `allowance`, or
`estimator_entered` as permitted by the existing estimator contract.

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

Current manual uploads enter Helios-controlled intake directly. Helios copies
each verified object into protected, tenant-scoped project storage and does not
durably accept the intake until those copies and hashes verify.

The future Bid Scout adapter may stage an acquired source package in Bid Scout-
controlled storage before transfer. Helios will not query that database or
depend on its internal schema; it will copy and verify the declared objects
through the canonical adapter contract.

Helios stores:

- immutable source PDFs, written-scope evidence, and package artifacts received
  through manual or future adapters and retained according to policy;
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
- classification, category availability, bid-basis, and capability-readiness
  state;
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
intake_received
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

- intake_unauthorized;
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
readiness reports exact partial completion and capability-specific effects.

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
- A document that was not issued is never treated as a failed upload.
- Missing plans or specifications never globally lock the Estimate Workspace.
- A capability that lacks required evidence is unavailable or provisional,
  never silently simulated.
- Missing scale is never assumed.
- Conflicting dimensions are never averaged silently.
- A scanned sheet is never treated as vector because OCR found text.
- A revised sheet never silently changes accepted quantity or cost.
- Partial processing never presents an affected capability as complete.
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
| Manual folder/ZIP intake stops before every selected object registers | Missing quantities and false readiness | Local manifest preview, resumable upload, per-object hash verification, and terminal dispositions |
| Future Bid Scout adapter omits or cannot transfer declared objects | Missing scope or quantities | Signed envelope, per-object hash verification, and terminal dispositions before the adapter is enabled |
| Owner issued specifications but no plans | Estimate waits forever or plan quantity is fabricated | `specs_only` profile, immediate estimate access, plan capabilities unavailable, quantities unknown or owner/estimator supplied |
| Owner issued plans but no specifications | Scope appears falsely compliant | `plans_only` profile, plan takeoff enabled, spec-dependent conclusions unavailable and visible |
| Owner issued only written scope | Opportunity is rejected despite being bidable | `written_scope_only` profile, conceptual WBS/estimate, explicit assumptions, clarifications, and risk |
| Not-issued document is treated as missing | False blocker and wasted bid-day effort | Separate `not_issued`, `expected_missing`, and `unknown` states |
| Bid Scout and Helios tenant mappings disagree | Cross-company disclosure | Reject before object access and require an authorized mapping |
| Same intake envelope is retried after a timeout | Duplicate documents or analysis cost | End-to-end idempotency and stable receipt acknowledgment |
| New addendum arrives through manual or future adapter after analysis | Obsolete quantities or scope | New immutable package revision and explicit impact review |
| Page uses wrong scale | Material quantity error | Per-view calibration and measurement block |
| Scanned drawing OCR error | Missed or false asset | Modality flag, confidence, visual overlay, human review |
| Revised sheet not recognized | Bid based on obsolete scope | Hash/revision control and supersession impact report |
| Owner quantity mistaken for production quantity | Crew/productivity error | Separate quantity authorities |
| Unknown treated as zero | Underbid | First-class unknown/takeoff-required state |
| AI invents geometry or quantity | Untraceable cost | Deterministic measurement and source/formula requirement |
| Duplicate files counted twice | Duplicate scope | Hash and sheet-identity reconciliation |
| One failed sheet marks plan intelligence complete | Hidden scope gap | Partial readiness and capability dependency report |
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

1. Create Golden Baseline 1 through the active manual folder/ZIP intake and
   canonical package envelope.
2. Prove the authenticated session, role, company, and project mapping before
   any object registration.
3. Prove every manifest object is durably copied, hash verified, and assigned
   a terminal receipt disposition.
4. Replay the identical envelope and prove no duplicate documents or jobs.
5. Tamper with one hash and one company/project mapping in controlled tests and
   prove both intakes reject closed.
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
16. Introduce a controlled revised sheet through a second manual package
    revision and verify supersession, stale-result invalidation, impact
    reporting, and explicit estimator disposition.
17. Re-run from the same baseline and prove deterministic repeatability.
18. Create controlled plans-only, specifications-only, and written-scope-only
    variants and verify each opens the Estimate Workspace with the correct
    supported capabilities, limitations, risks, and unknown quantity states.
19. Add the previously absent source category to each controlled variant and
    verify capability expansion and impact reporting without overwriting
    accepted work.
20. Submit a disabled Bid Scout contract fixture for Golden Baseline 1 and
    prove it produces the same canonical manifest, registered source identity,
    and downstream job inputs as manual intake without calling live Bid Scout.

### 11.3 Initial quantitative acceptance targets

| Measure | Target |
| --- | --- |
| Unauthorized or cross-company object access | Zero occurrences |
| Manifest objects durably copied and hash verified | 100 percent |
| Identical envelope replay duplicates | Zero occurrences |
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
| Supported bid-basis profiles with a usable scope basis that can open an estimate | 5 of 5 |
| Not-issued plans/specifications causing a global estimate block | Zero occurrences |
| Unsupported capability presented as verified | Zero occurrences |

The tolerances are validation thresholds, not permission to hide variance.
Helios always displays the actual difference and its source.

## 12. Objective Foundation 4 acceptance criteria

Foundation 4 passes only when a reviewer can verify all of the following:

- The current estimator, WBS, cockpit, and document-intelligence behavior
  remains operational and regression-tested.
- Manual PDF/folder/ZIP/written-scope intake is fully operational without Bid
  Scout and produces the canonical package envelope.
- Every accepted intake object is durably stored and hash verified in Helios
  before receipt acknowledgment.
- Replayed envelopes are idempotent, and invalid session/adapter identity,
  company mappings, manifests, or hashes reject closed before analysis.
- A disabled Bid Scout contract fixture produces the same registered package
  and downstream inputs as manual intake; live Bid Scout is not a Foundation 4
  dependency.
- Plans-and-specifications, plans-only, specifications-only,
  written-scope-only, and mixed/other profiles can all begin estimating from
  their verified source basis.
- Estimate readiness is independent from plan, specification, owner-item, and
  submission readiness.
- A not-issued category never creates a global blocker or unnecessary waiver;
  expected-but-missing and unknown categories remain visible limitations.
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

- Treating a local selection, future Bid Scout download, or storage write as a
  successful Helios intake before manifest and object verification.
- Marking documents ready based only on file count.
- Requiring every project to contain both plans and specifications.
- Blocking the entire estimate because a capability-specific source was not
  issued.
- Treating `not_issued`, `expected_missing`, `unknown`, and `not_applicable` as
  the same state.
- Inventing plan quantities for specifications-only or written-scope-only
  projects.
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
- Trusting manual labels or future Bid Scout category labels, filenames, or
  completeness declarations without Helios verification.
- Storing large PDFs, tiles, or geometry directly in transactional rows.
- Silent fallbacks, placeholder zeros, fake progress, or disconnected mock
  data.
- Building photorealistic 3D before the semantic/spatial construction graph is
  verified.

## 14. Implementation authorization gates

No Foundation 4 application code should begin until this document is reviewed
and the following decisions are explicitly approved:

1. Canonical manual package intake and bid-basis profiling are the first
   implementation increment.
2. Manual PDF, multi-folder, ZIP, revision/addendum, and written-scope intake
   remain the active operating workflow until Bid Scout is separately ready
   and approved.
3. The manual adapter and future Bid Scout adapter use the same versioned,
   tenant-scoped package envelope and downstream pipeline.
4. The Bid Scout adapter remains disabled and contract-tested; Foundation 4
   does not depend on live Bid Scout availability.
5. Helios never receives Construction Exchange credentials or sessions under
   either workflow.
6. Kreese Mills is the golden verification project.
7. Quantity capability is delivered in four stages: count/linear, area,
   volume, and constructability.
8. The initial accuracy targets and variance thresholds are accepted or
   revised.
9. Foundation 4 integrates through existing quantity/evidence contracts and
   does not rewrite the estimator, WBS, cockpit, or Foundation 3C intelligence.
10. All five bid-basis profiles can start an estimate when they contain at
   least one verified usable scope basis, with capabilities gated individually
   and unsupported conclusions kept explicit.

After approval, implementation should begin with Foundation 4A and 4B only.
Foundation 4C through 4F remain gated by the verified exit criteria of the
preceding increment.
