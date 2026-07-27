# Helios Foundation 4C Review

Status: implemented and verified in the Helios development environment

Scope: mixed-mode plan-sheet reconstruction, view registration, cross-sheet
relationships, and scale control only. Foundation 4D quantity/takeoff
intelligence remains gated.

## Delivered outcome

Helios now has an additive plan-intelligence subsystem for vector, scanned, and
hybrid plan PDFs. It converts the plan portion of the active bid package into a
revision-controlled sheet and view register without altering the original PDF.
The estimator, contractor WBS, Cockpit 2.0, Foundation 3C findings, bid-basis
profile, pricing, procurement, evidence, and risk records remain intact.

Plan processing is capability-specific. A package with no plans reports
`not_applicable_to_current_basis` and estimating continues from specifications
or written scope. A plans-enabled package presents one `Build plan model`
action; the browser never supplies document IDs. The server derives the exact
plan-document set from the authenticated tenant, current project, active
package, and Foundation 4B profile.

## Reconstruction contract

The OpenAI reasoning job must return exactly one record for every physical PDF
page and classify it as:

- construction sheet;
- intentional non-sheet page; or
- exception requiring reanalysis.

The domain validator enforces a bounded physical page count, unique 1-based
page registration, and deterministic exception records for any omitted page.
Each page records source document, package revision, physical and printed page,
sheet number, title, discipline/subdiscipline, issue and revision data,
addendum association, modality, normalized title-block boundary and text,
confidence, unresolved issues, and bounded view regions.

Views are independently typed as plan, profile, section, detail, schedule,
legend, note, calculation, title block, or other. Their normalized bounds,
north orientation, measurability, scale candidates, and unresolved conditions
are retained. A scale is never promoted from one view to an entire page.

## Spatial and revision control

- Plan runs are immutable by package revision and source fingerprint.
- A new active source fingerprint makes the prior run non-current; prior
  records are retained.
- Document jobs run independently so one failed plan PDF produces a partial
  plan set instead of erasing completed work.
- Pages, references, and calibrations are normalized records rather than one
  oversized project blob.
- Detail, section, match-line, continuation, plan/profile, key-map, schedule,
  specification, and standard-detail relationships are stored separately.
- Cross-sheet targets resolve deterministically only when one current sheet
  has the referenced identifier. Missing and duplicate targets remain visible.
- Duplicate sheet identifiers and failed source documents become plan-set
  issues; they are not silently reconciled.

## Scale safety

Measurable quantity work is fail-closed:

1. stated numeric and graphic scales are stored as candidates at the view;
2. conflicting candidates are marked `conflicted`;
3. a measurable view without a candidate receives a visible `blocked` record;
4. no candidate is automatically approved;
5. one-click estimator approval records reviewer and timestamp, supersedes
   competing candidates, and updates readiness; and
6. unapproved views remain counted as measurement blocks.

The schema also reserves `known_dimension` and `estimator` calibration sources
for the controlled calibration workflow in the quantity milestone. Foundation
4C does not calculate, store, or price bid quantities.

## User experience

The OpsSlate-style Plan Intelligence card sits directly under the bid-basis
control and above the existing cockpit:

- plans-enabled, unprocessed revisions show the file count and one-click build
  action;
- specs-only and written-scope projects show a plain-language nonblocking
  not-applicable state;
- processing runs are polled by the existing project refresh loop;
- completed runs show exact registered pages, sheet/non-sheet/exception counts,
  measurable views, approved scales, measurement blocks, and unresolved
  references;
- the sheet inventory identifies source PDF and physical page, modality,
  discipline, views, confidence, and the first unresolved issue;
- scale candidates can be approved in context with one click; and
- unresolved cross-sheet references remain visible for estimator review.

The read model is intentionally bounded for screen performance while all
normalized records remain durable in Convex.

## Security and operational controls

- Existing independent Clerk identity, same-origin protection, signed gateway,
  role authorization, tenant derivation, and project ownership checks remain
  mandatory.
- Plan documents are selected on the server from the current bid basis; client
  document IDs are not accepted.
- Every plan run is bound to company, project, package, and revision.
- Calibration review rejects stale or non-current plan runs.
- OpenAI files and stored responses are deleted after completion or terminal
  failure on a best-effort basis; remote IDs never reach the browser.
- Model processing is background, durable, retry-bounded, and exposes partial
  or failed outcomes without fabricating plan content.
- Original plan PDFs remain private, immutable source evidence.

## Verification record

- Helios domain build: passed
- Helios domain tests: 36 passed
- Helios boundary/regression tests: 65 passed
- Helios lint and production build: passed
- Foundation 4C Convex files targeted lint: passed
- Shared OpsSlate web production build: passed
- Full legacy OpsSlate web lint: not a release gate; it reports 1,708 existing
  issues across unrelated legacy modules. No Foundation 4C lint error was found.
- Convex schema/type generation and development function deployment: passed at
  `kindly-tiger-289`
- Authenticated plans-enabled browser verification: Foundation 4B reported two
  plan PDFs; Plan Intelligence displayed the one-click build action; the action
  was not submitted and no project data was changed
- Authenticated specs-only browser verification: explicit nonblocking Plan
  Intelligence not-applicable state rendered above the existing cockpit
- Responsive verification: desktop, 1024px tablet, and 390px mobile rendered
  without a framework overlay or page-level horizontal overflow
- Browser console errors after final plans-enabled verification: zero
- Vercel preview, production promotion, and domain changes: not performed

## Exit decision

Foundation 4C is complete when the application checkpoint is committed, tagged,
and recorded in the checkpoint ledger. The next approved build is Foundation
4D: governed quantity intelligence and plan takeoff using only estimator-
approved view calibrations, with every quantity tied to plan evidence and the
existing WBS/estimate records.
