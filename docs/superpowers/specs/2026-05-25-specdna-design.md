# OpsSlate SpecDNA Design

## Purpose

SpecDNA turns a project spec book into a reviewed operational intelligence layer for OpsSlate. It is not a one-off PDF scanner. It extracts project obligations, links each obligation to its source evidence, maps the downstream systems affected by that obligation, and lets the user approve the resulting project record before it drives estimating, project management, scheduling, submittals, and billing.

The core product promise is:

> Upload the spec book once. OpsSlate builds the bid-to-build obligation graph.

## Product Thesis

Most construction software treats specs as static files. Users upload a PDF, then manually re-read the same document for estimating, submittals, schedules, RFIs, billing, and closeout. SpecDNA should make the spec book active. Every important clause becomes a structured, reviewable item that knows where it came from, what it affects, and what OpsSlate should do with it.

The differentiator is the connected obligation graph:

- An extracted submittal can know which schedule activity it blocks.
- A billing rule can know which estimate item or pay item it affects.
- A task can know which spec clause created it.
- A risk can know whether it should become an RFI, estimate note, PM warning, or schedule constraint.
- Every downstream record can preserve source section, page, confidence, and extraction run.

This is designed to feel materially different from "AI reads a PDF."

## Phase 1 Scope

Phase 1 builds the first production version inside the Project Management app, with entry points from Estimating later.

Phase 1 includes:

- A Spec Intelligence section on the project detail page.
- Upload/select spec book PDF from project documents.
- AI extraction into a draft SpecDNA matrix.
- Review cockpit with category tabs.
- Approve, edit, reject, and commit selected items.
- Creation of real submittals and PM tasks from approved items.
- Storage of schedule drivers, billing rules, bid requirements, scope items, and risks as structured SpecDNA records for downstream use.
- Source evidence fields on every extracted item.

Phase 1 does not need to fully automate the external scheduler app or billing app yet. It should store clean data those apps can consume next.

## Primary User Flow

1. User opens a project in Project Management.
2. User opens the Spec Intelligence section.
3. User uploads or selects the project spec book PDF.
4. OpsSlate creates a SpecDNA intake run with status `processing`.
5. AI extracts structured items into categories.
6. User reviews the draft matrix.
7. User edits, rejects, approves selected items, or approves all high-confidence items.
8. User commits approved items.
9. OpsSlate creates real downstream records and marks the intake run as `committed`.
10. Project detail, Submittals, Tasks, Reports, Calendar, and future Schedule/Billing integrations can reference the approved SpecDNA data.

## Extraction Categories

### Bid Requirements

Bid-time requirements that affect estimating and bid setup:

- Bid date, letting date, pre-bid meeting.
- DBE/MBE/WBE goals.
- Prevailing wage requirements.
- Bonding and insurance requirements.
- Liquidated damages.
- Contract duration.
- Addenda references.
- Alternates, allowances, unit prices.
- Scope inclusions and exclusions.

### Scope Items

Work included in the specifications:

- Major work packages.
- Trade-specific scope.
- Material/system requirements.
- Performance requirements.
- Special installation requirements.
- Items likely to affect estimate quantities or labor assumptions.

### Submittals

Formal approval items:

- Shop drawings.
- Product data.
- Samples.
- Mockups.
- Mix designs.
- Certifications.
- Test reports.
- Warranty and closeout submittals.

### Project Tasks

Operational requirements that should become PM tasks:

- Permits.
- Notices.
- Meetings.
- Coordination duties.
- Inspections.
- Testing.
- Startup.
- Training.
- Closeout actions.

### Schedule Drivers

Items that influence the schedule:

- Review durations.
- Lead-time warnings.
- Sequencing constraints.
- Required approvals before procurement or installation.
- Milestones.
- Work-hour restrictions.
- Weather/seasonal constraints.
- Inspection hold points.

### Billing Rules

Rules that affect payment, backup, or Ops Books:

- Measurement and payment language.
- Unit-price rules.
- Stored material rules.
- Retainage/payment conditions.
- Required backup documentation.
- Certified payroll/reporting requirements.
- Pay application constraints.

### Risks And RFIs

Items needing attention:

- Ambiguous requirements.
- Conflicts between sections.
- Missing information.
- Unrealistic schedule requirements.
- Unusual owner/agency requirements.
- Items that should become RFIs.
- High-cost or high-risk clauses.

## Core Data Model

### specIntakeRuns

Stores each analysis run.

Fields:

- `companyId`
- `projectId`
- `sourceDocumentId`
- `sourceDocumentName`
- `status`: `draft`, `processing`, `ready`, `committed`, `failed`
- `summary`
- `model`
- `createdBy`
- `createdAt`
- `completedAt`
- `committedAt`
- `error`
- `stats`: counts by category, confidence, approved/rejected totals

### specIntelligenceItems

Stores extracted obligations and draft downstream records.

Fields:

- `companyId`
- `projectId`
- `runId`
- `category`: `bid_requirement`, `scope_item`, `submittal`, `task`, `schedule_driver`, `billing_rule`, `risk`
- `title`
- `description`
- `trade`
- `phase`
- `priority`: `Critical`, `High`, `Medium`, `Low`
- `status`: `draft`, `approved`, `rejected`, `committed`
- `confidence`: number from 0 to 1
- `specSection`
- `sourcePage`
- `sourceQuote`
- `sourceDocumentId`
- `destinationModules`: array of `estimating`, `pm`, `submittals`, `schedule`, `billing`, `rfi`
- `suggestedRecord`: JSON payload used to create downstream records
- `relationships`: array of related item IDs and relationship types
- `createdRecordType`
- `createdRecordId`
- `notes`

### Relationship Types

SpecDNA items can connect to each other:

- `blocks`
- `requires`
- `affects`
- `duplicates`
- `conflicts_with`
- `should_be_rfi`
- `feeds_billing`
- `feeds_schedule`
- `feeds_estimate`

These relationships are the foundation for the obligation graph.

## AI Extraction Design

The extraction action should use a structured prompt that asks for valid JSON only. It should instruct the model to:

- Extract obligations, not generic summaries.
- Include page/section/source quote whenever possible.
- Avoid inventing dates, quantities, or spec sections.
- Mark confidence lower when source evidence is weak.
- Return downstream destinations for each item.
- Return dependencies when a requirement blocks another action.
- Distinguish boilerplate from operational requirements.

The first implementation can process text-based PDFs and use the existing scanned-PDF fallback pattern from `submittalScanner.ts`. Long-term, the engine should chunk large spec books by section, extract per chunk, then merge/deduplicate results.

## Review Cockpit

The review UI should be dense, operational, and built for decisions.

Tabs:

- Summary
- Bid Requirements
- Scope Items
- Submittals
- Tasks
- Schedule
- Billing
- Risks / RFIs

Each item row should show:

- Category
- Title
- Trade/phase
- Spec section/page
- Confidence
- Destination modules
- Approve/reject/edit controls

Item detail should show:

- Full extracted description.
- Source evidence.
- Suggested downstream record.
- Dependencies/relationships.
- Notes and edit fields.

Bulk actions:

- Approve selected.
- Reject selected.
- Commit approved.
- Create RFIs from selected risks.
- Filter by low confidence.
- Filter by destination module.

## Commit Behavior

When the user commits approved items:

- `submittal` items create records through `submittals.create`.
- `task` items create records through `tasks.create`.
- `risk` items can remain SpecDNA risks in phase 1, with a later action to create RFIs.
- `schedule_driver`, `billing_rule`, `bid_requirement`, and `scope_item` items remain structured SpecDNA records in phase 1.
- Every created downstream record should preserve traceability by storing notes, source fields when supported, or a SpecDNA back-reference when schema support is added.

Commit should be idempotent. If an item already created a downstream record, committing again should not create a duplicate.

## Downstream Integration Strategy

### Estimating Cockpit

Estimating should use approved SpecDNA bid requirements and scope items to:

- Populate estimate details.
- Warn about missing bid requirements.
- Surface measurement/payment notes.
- Highlight scope clauses tied to cost risk.
- Suggest estimate sections from spec divisions.

### Project Management

PM owns the reviewed SpecDNA record and uses it to:

- Create tasks.
- Create submittals.
- Surface risks.
- Connect obligations to project detail.

### Schedule Builder

Schedule Builder should consume approved schedule drivers:

- Milestones.
- Sequencing requirements.
- Review durations.
- Lead times.
- Hold points.
- Dependency suggestions.

### Ops Books / Billing

Billing should consume approved billing rules:

- Pay item measurement.
- Required backup.
- Stored material eligibility.
- Retainage.
- Certified payroll/reporting flags.

## Error Handling

- If PDF upload fails, show a clear upload error and preserve the run as failed.
- If extraction fails, keep the source document linked and allow retry.
- If AI returns invalid JSON, store the raw failure text for debugging and show a user-safe error.
- If a downstream record creation fails during commit, commit the remaining items and mark failed items with an error.
- If a scanned PDF cannot be read, show a message explaining that OCR/scanned extraction was attempted and failed.

## Testing Plan

Unit and integration tests should cover:

- Schema fields exist for SpecDNA runs and items.
- Extraction parser handles valid JSON, wrapped JSON, and invalid responses.
- Commit action creates submittals from approved submittal items.
- Commit action creates tasks from approved task items.
- Commit action does not duplicate already committed items.
- Review UI renders category counts and low-confidence filters.
- Upload flow creates a run and links the source document.

## Phase 2 Enhancements

- Addenda comparison: identify what changed between spec versions.
- Duplicate and conflict detection across sections.
- Source page viewer with extracted item highlights.
- RFI generation from ambiguous or conflicting requirements.
- Estimate item suggestions from scope and measurement clauses.
- Scheduler dependency graph creation.
- Billing setup assistant.
- Spec coverage score: how much of the project has been operationalized.
- Risk heat map by trade, spec division, and downstream impact.
- Project handoff report from bid team to PM team.

## Patent-Oriented Differentiators

The strongest invention story is the reviewed bid-to-build obligation graph:

- Extracting construction spec obligations from project documents.
- Classifying obligations by downstream operational destination.
- Linking each obligation to source evidence.
- Mapping dependencies between obligations and downstream records.
- Creating a reviewed source-of-truth that feeds estimating, PM, schedule, submittals, and billing.
- Preserving traceability from downstream records back to the governing spec clause.

The implementation should emphasize connected intelligence, traceability, review, and downstream synchronization. That is the product moat.

