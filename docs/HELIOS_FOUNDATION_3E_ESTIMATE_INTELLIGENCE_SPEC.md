# Helios Foundation 3E: Estimate Intelligence and Estimator Specification

Status: approved design authority; Foundations 3E.1 through 3E.4 implemented
Product: Helios, a standalone responsive web application in the OpsSlate product family  
Primary market: New York heavy-highway and public works estimating  
Design authority: OpsSlate estimating patterns through `@opsslate/suite-ui`

## 1. Outcome

Foundation 3E will turn a reviewed bid package into an estimator-controlled,
price-ready estimate organized around the owner's official pay items.

Helios will not be a PDF reader that happens to create estimate notes. The
protected project documents are source evidence. The primary working product is
the estimate.

The extraction model and the Helios estimator will be designed against one
canonical estimating contract. The extractor will not produce an independent
format that must later be forced into the estimator. Manual entry, AI extraction,
quantity takeoff, cost-database selection, RFQs, and imports will all create or
propose the same underlying records.

The governing hierarchy is:

```text
Estimate
  -> Operational estimate section
     -> Owner pay item
        -> Internal operational cost code
           -> Labor, equipment, material, subcontract, trucking, and other cost
```

Every accepted cost must reconcile back to an owner pay item. Every owner pay
item must reconcile to the final bid schedule.

## 2. Approved decisions

| ID | Decision |
| --- | --- |
| D-001 | Owner pay items are the authoritative bid structure. |
| D-002 | Estimate sections are operational groupings such as Earthwork, Water Control, Structures, and Asphalt Paving. |
| D-003 | Helios provides a Build View organized by operational section and a Bid Schedule View organized in the owner's official sequence. Both views use the same records. |
| D-004 | Official NYSDOT item numbers are parent pay items. Detailed construction operations are modeled as child cost codes. |
| D-005 | Every internal cost code supports full labor, equipment, material, subcontract, trucking, disposal, and other-cost build-up. |
| D-006 | Owner bid quantity and internal production quantities are stored separately. |
| D-007 | Missing quantities are marked `Takeoff Required`; Helios may also propose a preliminary plan takeoff when the drawings support it. |
| D-008 | Shared costs support quantity, percentage, and dollar allocation. One method is controlling and the others are calculated for comparison. |
| D-009 | Unit cost is derived from the accepted detailed cost build-up unless an estimator records an explicit override. |
| D-010 | Overhead, profit, and bond are applied globally at the end of the estimate. Each rule can include or exclude specific cost or pay-item classes. |
| D-011 | Global overhead, profit, and bond percentages are independently applied to the approved calculation basis, matching the reviewed OpsSlate estimate behavior. |
| D-012 | Tax is governed by a professional project tax profile and resource-level tax rules, with audited estimator overrides. |
| D-013 | Risk is maintained in a separate risk register with probability, cost exposure, schedule exposure, mitigation, owner, and disposition. |
| D-014 | The complete bid package is in scope: proposal, plans, specifications, addenda, geotechnical information, permits, schedules, and other contract documents. |
| D-015 | The first export contains seven workbook sheets plus a printable bid PDF. |
| D-016 | Direct OpsSlate handoff is deferred. Excel and PDF are the first approved outbound formats. |
| D-017 | Base-bid estimating is the first-release boundary. Alternate and deduct-alternate workflows are deferred. |
| D-018 | AI output is always a proposal until an authorized estimator accepts it. |
| D-019 | Reanalysis never silently overwrites accepted estimator work. |

## 3. Scope boundary

### 3.1 Included

- complete bid-package registration and document revision awareness;
- official owner pay-item schedule extraction;
- operational estimate-section recommendations;
- scope-obligation decomposition;
- NYSDOT item and specification association;
- internal child cost-code generation;
- owner and production quantity separation;
- preliminary plan-takeoff proposals;
- labor, equipment, material, subcontract, trucking, disposal, and other costs;
- cost allocation and reconciliation;
- RFQ, submittal, evidence, and risk associations;
- professional tax treatment;
- global overhead, profit, and bond rules;
- estimator review, correction, override, and audit history;
- seven-sheet Excel export and printable bid PDF.

### 3.2 Excluded from the first release

- alternate and deduct-alternate bid workflows;
- autonomous estimate approval;
- autonomous vendor communication;
- invented quantities, production rates, or prices;
- direct writes into OpsSlate production;
- direct project handoff to OpsSlate;
- production deployment or domain changes;
- replacement of the protected evidence and review controls established in
  Foundations 3C and 3D.

## 4. Core terminology

### 4.1 Owner pay item

The official bid-schedule item supplied by the owner. It carries the official
item number, description, bid quantity, unit, item classification, submitted
unit price, and extended price.

Example:

```text
619.0501 - Temporary Structures and Approaches No. 1 - 1 LS
```

### 4.2 Operational estimate section

A contractor-facing grouping used to organize how the work will be estimated.
It is not represented as an official specification section unless the source
documents explicitly use that same structure.

Examples include:

- General Requirements;
- Clearing and Removals;
- Temporary Traffic Control;
- Temporary Detour;
- Cofferdams, Diversion, and Dewatering;
- Structure Excavation;
- Precast Box Culvert;
- Structural Concrete;
- Asphalt Paving;
- Restoration.

### 4.3 Internal operational cost code

A priceable construction operation beneath an owner pay item. The default code
inherits the parent NYSDOT item number and adds a stable operation suffix.

Example:

```text
619.0501
  619.0501-ENG    Detour engineering
  619.0501-EW     Excavation and grading
  619.0501-FILL   Fill and subbase
  619.0501-PAVE   Temporary pavement
  619.0501-MAINT  Maintenance
  619.0501-REM    Removal and restoration
```

The suffix taxonomy must be versioned. Custom project codes are permitted but
cannot silently change the shared library.

### 4.4 Resource

A labor classification, equipment asset, material, subcontract, trucking or
disposal service, or other cost used by an internal cost code.

### 4.5 Evidence

A traceable source supporting an estimate record. Evidence may come from a
proposal page, specification, plan sheet, detail, keynote, addendum,
geotechnical report, permit, quote, takeoff, or human note.

## 5. End-to-end workflow

```mermaid
flowchart LR
    A["Complete bid package"] --> B["Controlled document register"]
    B --> C["AI extraction candidates"]
    C --> D["Deterministic validation"]
    D --> E["Estimator import review"]
    E --> F["Accepted owner pay-item register"]
    F --> G["Scope and quantity decomposition"]
    G --> H["Internal cost codes and resources"]
    H --> I["Allocation and reconciliation"]
    I --> J["Risk, RFQ, submittal, and tax review"]
    J --> K["Global markups and bid proof"]
    K --> L["Excel workbook and bid PDF"]
```

### 5.1 Stage A: package integrity

Helios must establish the authoritative document register before estimating.
It must identify document type, revision, addendum relationship, supersession,
duplicate files, unreadable pages, and missing referenced documents.

### 5.2 Stage B: extraction proposals

The reasoning engine proposes:

- project metadata;
- official owner pay items;
- operational estimate sections;
- scope obligations;
- quantity candidates;
- suggested child cost codes;
- RFQ scopes;
- submittal requirements;
- risks;
- citations.

It does not invent pricing and does not write directly into the accepted
estimate.

### 5.3 Stage C: deterministic validation

Server-owned validation must check identifiers, units, mathematical fields,
document ownership, citation targets, duplicate owner items, quantity formats,
allowed statuses, and revision currency before an extraction proposal can be
shown for acceptance.

### 5.4 Stage D: estimator import review

The estimator reviews additions, conflicts, changes, and omissions. Available
decisions are accept, correct, reject, defer, merge, split, and map to existing.
The system records the original proposal and the human decision separately.

### 5.5 Stage E: estimate construction

Accepted owner items are organized into operational sections. Each owner item
is decomposed into internal cost codes and resources. The estimator can add,
remove, correct, or reassign any proposed content.

### 5.6 Stage F: reconciliation and proof

Helios proves scope coverage, quantity status, price completeness, allocation,
tax, global markups, and bid-schedule arithmetic before export.

## 6. Canonical data contract

The following entities are the minimum shared contract for manual entry and AI
extraction.

### 6.1 Estimate

- project and company ownership;
- estimate name and revision;
- owner, contract number, PIN, bid date, and location;
- document-register revision;
- estimate status and current approved generation;
- project tax profile;
- markup-rule set;
- currency and rounding policy;
- creator, reviewers, timestamps, and immutable history.

### 6.2 Operational section

- stable section ID;
- name and optional standard taxonomy ID;
- sequence;
- AI-suggested, standard-library, or human-created origin;
- active, merged, or superseded state;
- associated owner items;
- evidence and review history;
- direct-cost subtotal.

### 6.3 Owner pay item

- stable record ID;
- official sequence;
- official item number;
- official description;
- estimator short description;
- official bid quantity and unit;
- item classification;
- fixed-price or allowance controls;
- operational section;
- direct cost;
- derived and overridden unit price;
- submitted unit price and extension;
- quantity, scope, pricing, RFQ, and review statuses;
- evidence collection;
- current source-document revision;
- extraction confidence dimensions;
- append-only decision history.

### 6.4 Internal cost code

- stable code and description;
- parent owner item;
- operation type;
- self-perform, subcontract, supplier, allowance, owner responsibility, or
  undecided scope ownership;
- production quantity and unit;
- duration and production rate;
- labor, equipment, material, subcontract, trucking, disposal, and other
  resources;
- assumptions, inclusions, exclusions, and qualifications;
- direct cost and calculated contribution to the parent item;
- allocation records;
- evidence, risks, RFQs, and submittals;
- review state and decision history.

### 6.5 Resource

- resource class and stable source ID;
- description;
- quantity, unit, waste factor, and duration;
- unit rate and rate source;
- crew or assembly association;
- tax treatment;
- quote, cost-database, approved historical, or estimator-entered origin;
- effective date and escalation assumption;
- calculated direct cost;
- estimator override and reason;
- evidence and approval status.

### 6.6 Evidence record

- source document, type, revision, and addendum status;
- physical PDF page and printed page or sheet;
- sheet or drawing number;
- specification section and subsection;
- detail, callout, keynote, tag, area, zone, or station;
- short excerpt or callout description;
- source coordinates when available;
- optional reviewed snippet image;
- AI-generated or human-authored origin;
- verification status, verifier, and timestamp.

An estimate record can have many evidence records. Evidence cannot be reduced
to one text field or one screenshot.

### 6.7 Quantity record

- value and unit;
- quantity type;
- source and citation;
- formula or takeoff method;
- confidence;
- authoritative, comparative, or production use;
- current, conflicting, superseded, or takeoff-required status;
- estimator decision history.

### 6.8 Allocation record

- source cost code;
- destination owner pay item;
- controlling method: quantity, percentage, or dollars;
- allocated quantity, percentage, and dollars;
- calculation basis;
- balancing status;
- estimator approval.

### 6.9 Risk record

- category and title;
- description and evidence;
- linked owner items, cost codes, quantities, and documents;
- probability;
- low, most-likely, and high cost exposure;
- low, most-likely, and high schedule exposure;
- expected monetary exposure when used;
- mitigation and contingency response;
- responsible estimator;
- open, mitigated, accepted, transferred, avoided, or closed status;
- decision about whether the exposure is carried in the base estimate;
- review history.

## 7. Quantity model

Owner bid quantities and internal production quantities are separate.

For example, one owner item may be `1 LS`, while its accepted internal
quantities include 360 CY of temporary fill, 130 tons of asphalt, one temporary
signal, and five months of maintenance.

Allowed quantity types are:

- official contract quantity;
- plan quantity;
- estimator-calculated quantity;
- preliminary AI takeoff;
- vendor quantity;
- allowance;
- estimator assumption;
- takeoff required;
- included in another item.

Rules:

1. The official proposal schedule is authoritative for bid quantity and unit.
2. Plan and calculated quantities are validation and production inputs unless
   an estimator explicitly changes their role.
3. Quantity conflicts must remain visible until resolved.
4. Preliminary takeoffs must retain their method, evidence, and confidence.
5. No unknown quantity can be converted to zero.
6. Lump-sum owner items still require internal production quantities or an
   explicit estimator-approved allowance.

## 8. Pricing and resource build-up

### 8.1 Direct-cost classes

- labor;
- equipment;
- materials;
- subcontracts;
- trucking;
- disposal;
- other direct costs.

### 8.2 Unit-price derivation

```text
accepted direct item cost / official owner bid quantity = calculated unit cost
```

The derived unit cost is the default submitted unit price before global markup
distribution or estimator override. Lump-sum items use quantity one for bid
arithmetic while retaining their production quantities below the item.

An override must retain:

- calculated value;
- override value;
- reason;
- user and timestamp;
- effect on bid total;
- subsequent reapproval status.

### 8.3 Price-source policy

Helios does not invent prices. A resource price must come from:

- an accepted vendor or subcontractor quote;
- an approved cost-database entry;
- an approved crew or assembly;
- an approved historical rate;
- a human-entered rate with source and date.

AI may recommend an assembly or identify a missing price, but an unsupported
suggestion remains unpriced.

## 9. Allocation and duplicate-cost control

Shared costs can be allocated using quantity, percentage, or dollars. One
method is controlling. The other representations are calculated.

An allocation passes only when:

- percentages total exactly 100% within the approved precision;
- allocated quantity equals the accepted source quantity;
- allocated dollars equal the accepted source cost;
- every destination is a current owner pay item;
- the same cost is not carried through another allocation or direct resource;
- rounding differences are resolved using the estimate rounding policy.

Helios must detect:

- duplicate scope with duplicate cost;
- duplicated contract quantities;
- one resource assigned directly and through an allocation;
- cost with no pay-item destination;
- pay item with no supporting cost;
- overlapping plan and contract quantities added together.

## 10. Global markups

The estimate summary follows the approved OpsSlate pattern:

```text
Direct-cost subtotal
+ global overhead
+ global profit
+ global bond
= grand total
```

Overhead, profit, and bond are independently calculated from their configured
eligible direct-cost basis. The rule model must support:

- rate;
- eligible cost and item classes;
- excluded fixed allowances and adjustments;
- calculation basis;
- sequence;
- independent or compounded behavior;
- rounding;
- minimum or maximum rule when required;
- estimator override and reason.

The first-release default is independent calculation against the eligible
direct-cost subtotal. A rule preview must show the basis, exclusions, amount,
and resulting grand total before approval.

Mobilization caps and similar owner constraints are separate bid rules, not
global markups. They must be tested against the exact contract-defined basis.

## 11. Professional tax model

Tax cannot be represented only as an arbitrary percentage on a pay item.
Helios must maintain a project tax profile and calculate tax at the resource
level.

The profile includes:

- project jurisdiction;
- owner and project tax-exemption status;
- exemption-certificate status;
- effective dates;
- material tax rules;
- rental and leased-equipment rules;
- purchased-equipment rules;
- fuel and consumable rules;
- freight and delivery rules;
- subcontract tax treatment;
- tax included in rate, added to rate, exempt, or pending-review status;
- evidence and estimator approval.

The tax engine must:

1. derive item tax from its resources;
2. show taxable basis, rate, and amount;
3. permit an authorized override with a required explanation;
4. prevent a project-level exemption from silently exempting a resource class
   when the configured rule says otherwise;
5. flag missing or conflicting tax profiles;
6. retain the policy version used for every estimate revision.

Helios provides calculation support, not legal or tax advice. Final tax rules
remain estimator or company-policy controlled.

## 12. Risk register

Risk remains separate from the estimate while linking directly to affected
records. This avoids hiding uncertainty inside arbitrary unit prices.

The register must support:

- qualitative severity;
- probability;
- low, most-likely, and high cost exposure;
- low, most-likely, and high schedule-day exposure;
- mitigation cost;
- response owner and due date;
- base-estimate, contingency, qualification, transfer, or no-carry decision;
- source citations;
- review and closure history.

Readiness must distinguish between identifying a risk and disposing of it. A
risk is not complete merely because Helios found it.

## 13. RFQ and submittal behavior

### 13.1 RFQs

An RFQ is generated from accepted estimate scope, not from a generic document
finding. It must include the linked owner items, cost codes, quantities,
inclusions, exclusions, schedule constraints, delivery location, evidence, and
required quote date.

RFQ status contributes to price confidence but does not automatically replace
an accepted estimator allowance.

### 13.2 Submittals

A submittal checkbox is insufficient as the authoritative record. Accepting a
submittal requirement creates a linked submittal record containing type,
description, specification, timing, responsibility, predecessor, evidence, and
review status.

## 14. Estimator experience

The estimator must look and behave like OpsSlate. Helios will reuse the shared
shell, estimate table, buttons, badges, forms, selects, dialogs, cards, spacing,
typography, focus behavior, and responsive patterns.

### 14.1 Estimate Builder entry

The existing gated Estimate Builder navigation item becomes the primary
estimating workspace after Foundation 3E is implemented. The cockpit remains
the document-intelligence review and decision surface.

### 14.2 Import Review

Before records enter the estimate, the estimator sees:

- proposed sections and owner items;
- new, changed, conflicting, and missing records;
- quantity and unit conflicts;
- evidence and confidence dimensions;
- accept, correct, reject, defer, merge, split, and map decisions;
- estimated impact of applying the proposal.

### 14.3 Build View

The default estimator view is:

```text
Operational section
  Owner pay item
    Internal cost-code worksheet
      Resources, quantities, rates, evidence, allocations, RFQs, and risks
```

The owner item row preserves the OpsSlate columns for description, quantity,
unit, unit cost, line total, extension, and actions. It adds the official item
number and compact coverage, quantity-source, pricing, and risk states.

Detailed resources open in a focused worksheet or drawer. They are not packed
into the primary bid table.

### 14.4 Bid Schedule View

This view displays the exact official owner sequence and bid arithmetic. It is
the proofing and export view. Operational sections do not change the owner's
required order.

### 14.5 Add Section

The approved OpsSlate Add Section dialog remains the interaction authority.
Its controlled section library uses the heavy-highway operational taxonomy.
Human-created sections remain supported and are visibly distinguished from
standard sections.

### 14.6 Add Item

Manual Add Item and AI extraction use the same canonical record. The basic
dialog contains the fields needed to create an owner item. Evidence, cost
build-up, allocation, RFQ, submittal, and risk details use progressive
disclosure after creation.

### 14.7 Evidence Matrix

The existing Plan Reference Matrix becomes a multi-evidence collection rather
than one optional reference block. AI-populated citations are editable only
through a reviewed correction; their original source remains retained.

### 14.8 Global estimate summary

The estimate footer shows direct-cost subtotal, overhead, profit, bond, and
grand total. Selecting a markup opens its rule, eligible basis, exclusions, and
calculation proof.

## 15. Extraction model contract

The reasoning engine must return proposals that conform to the same domain
schema used by the estimator. The proposal contains:

- project and package revision;
- proposed operational sections;
- proposed owner items;
- proposed internal cost codes;
- quantity candidates;
- scope obligations;
- RFQ candidates;
- submittal candidates;
- risk candidates;
- evidence relationships;
- confidence dimensions;
- unresolved questions and missing-source declarations.

The model must not:

- assign an unsupported price;
- convert unknown information into zero;
- merge owner and production quantities;
- mark a proposal approved;
- hide a conflict by selecting one source silently;
- cite a document outside the current company and project;
- apply superseded documents as current;
- assume referenced-but-missing plans or specifications were supplied.

## 16. Reanalysis and change control

Every accepted estimate is tied to a document-register revision and extraction
generation. When documents or addenda change, Helios creates an impact proposal
showing:

- added, removed, and changed owner items;
- quantity or unit changes;
- changed scope obligations;
- affected cost codes, resources, allocations, RFQs, submittals, and risks;
- pricing and schedule exposure;
- accepted human records that may require reapproval.

Reanalysis never deletes or silently replaces accepted work. The estimator
applies changes individually or as an explicitly reviewed batch. Previous
estimate revisions remain recoverable.

## 17. Readiness gates

| Gate | Pass condition |
| --- | --- |
| G0 Package integrity | The authoritative document register is complete enough to estimate, and missing or unreadable sources are explicitly accepted as risks. |
| G1 Bid schedule | Every official owner item, quantity, unit, fixed amount, and sequence reconciles to the proposal schedule. |
| G2 Scope coverage | Every accepted scope obligation is carried, excluded, assigned, or converted to a tracked clarification. |
| G3 Quantity | Every estimate and production quantity has a valid status, source, unit, and disposition. |
| G4 Pricing | Every required owner item has accepted direct cost or an approved allowance; unsupported AI prices are zero in count. |
| G5 Allocation | Every shared cost balances by quantity, percentage, and dollars with no duplicate destination. |
| G6 Procurement | Required RFQs have accepted quotes or approved estimator allowances and documented gaps. |
| G7 Risk | Every material risk has an owner, exposure, mitigation, and carry/qualification decision. |
| G8 Tax and markup | The project tax profile and global markup proofs are approved and mathematically valid. |
| G9 Final proof | Build View, Bid Schedule View, workbook, and PDF totals reconcile exactly within the rounding policy. |

No single opaque confidence percentage may substitute for these gates.

## 18. Seven-sheet workbook and PDF export

The first Excel workbook contains:

1. **Bid Schedule** - official item sequence, quantity, unit, unit price, and
   extension;
2. **Detailed Estimate** - operational sections, owner items, child cost codes,
   and totals;
3. **Resources and Cost Codes** - labor, equipment, materials, subcontract,
   trucking, disposal, other costs, rates, and sources;
4. **Quantity Register** - official, plan, production, calculated, conflicting,
   and takeoff-required quantities;
5. **Risk Register** - probability, cost and schedule exposure, mitigation,
   owner, and disposition;
6. **RFQ Register** - packages, vendors, due dates, quote status, gaps, and
   linked scope;
7. **Citation Register** - estimate-record-to-document traceability.

The printable PDF contains the approved bid schedule and the configured
estimate summary. Internal resource detail, assumptions, qualifications, and
risk content are included only when selected in export settings.

Export rules:

- workbook and PDF use the same immutable estimate revision;
- all exported totals match the application proof;
- fixed-price items retain their official amounts;
- formulas and displayed values follow the approved rounding policy;
- the export records generation time, user, estimate revision, and document
  revision;
- exports are tenant-scoped and delivered through protected routes.

## 19. Security and audit requirements

Foundation 3E inherits the standalone Helios identity, tenant, same-origin,
company, project, and document boundaries.

Every write must:

1. require a verified Helios session;
2. resolve user and company on the server;
3. revalidate estimate and project ownership;
4. reject stale estimate and document revisions;
5. use server-owned current records for authorization;
6. record human or AI origin;
7. append the reviewer, timestamp, previous value, new value, and reason;
8. write nothing on cross-company or stale-generation failure.

Financial overrides, tax overrides, allocation changes, global markup changes,
and export approvals require append-only history.

## 20. Accessibility and responsive requirements

- shared accessible primitives own dialogs, menus, selects, forms, tables,
  focus, and toasts;
- import review, item editing, resource worksheets, evidence, and risk review
  are fully keyboard operable;
- dialogs trap focus and restore it to the initiating control;
- status is never communicated by color alone;
- calculated, overridden, AI-proposed, and human-approved states have textual
  labels;
- validation errors are associated with the exact field and summarized when
  submission fails;
- desktop supports dense estimating tables without hiding bid arithmetic;
- tablet preserves review and editing without horizontal page overflow;
- mobile uses stacked summaries and focused item worksheets instead of forcing
  the complete desktop table into the viewport;
- currency and quantity values retain readable precision at supported zoom;
- destructive actions require clear confirmation and a recoverable history.

## 21. Failure-mode requirements

Helios must explicitly handle:

- incomplete or unreadable bid packages;
- duplicate and superseded PDFs;
- missing referenced documents;
- addenda changing previously accepted scope;
- proposal items with no supporting specification;
- specifications or plan obligations with no apparent pay item;
- duplicated owner items;
- quantity and unit conflicts;
- lump-sum items without production build-up;
- fixed allowances and price-adjustment items;
- shared costs that do not balance;
- duplicated or orphaned costs;
- missing quotes and quote exclusions;
- unsupported prices and expired rates;
- tax profiles that are missing, conflicting, or stale;
- mobilization and other contract caps;
- reanalysis during active human edits;
- simultaneous edits and stale estimate revisions;
- export totals that differ from the approved estimate;
- cross-company identifiers and forged mutations;
- provider failure without loss of accepted estimator work.

## 22. Implementation sequence

Implementation must follow this order after this specification is approved.

### Foundation 3E.0 - domain and calculation contract

- finalize canonical entities, statuses, units, and relationships;
- define the heavy-highway section and child cost-code taxonomy;
- define deterministic quantity, allocation, tax, markup, and rounding rules;
- define extraction proposal schemas and validation boundaries;
- create test fixtures from the approved culvert breakdown;
- do not create estimator screens until this contract passes review.

### Foundation 3E.1 - owner pay-item register and import review

- extract and stage official owner items;
- validate quantity, unit, sequence, fixed amount, and evidence;
- implement estimator import decisions and append-only history;
- implement Build View and Bid Schedule View over the same records.

### Foundation 3E.2 - internal cost-code and resource build-up

- add child operational cost codes;
- add labor, equipment, material, subcontract, trucking, disposal, and other
  resources;
- derive direct cost and unit cost;
- implement controlled overrides and price-source status.

### Foundation 3E.3 - quantity and allocation controls

- separate bid and production quantities;
- add preliminary takeoff proposals and Takeoff Required workflow;
- support quantity, percentage, and dollar allocations;
- add duplicate-cost, orphan-cost, and reconciliation checks.

### Foundation 3E.4 - evidence, RFQ, submittal, and risk integration

- extend the Evidence Matrix to multiple citations;
- generate RFQ and submittal records from accepted scope;
- implement probability and cost/schedule risk register;
- connect each supporting record to owner items and cost codes.

### Foundation 3E.5 - professional tax and global pricing

- implement project tax profiles and resource tax rules;
- implement independent global overhead, profit, and bond calculations;
- implement eligible-basis exclusions and calculation proof;
- implement mobilization and contract-rule checks.

### Foundation 3E.6 - readiness, proof, and export

- implement gates G0 through G9;
- produce all seven workbook sheets;
- produce printable bid PDF;
- prove application, workbook, and PDF totals reconcile.

### Foundation 3E.7 - direct OpsSlate handoff

Deferred until the standalone Helios estimator and exports are approved in
real project testing. This phase requires a separate architecture and security
approval.

## 23. Objective acceptance criteria

Foundation 3E is acceptable only when all of the following are true:

1. Manual entry and AI extraction use the same canonical estimate records.
2. AI output cannot become accepted estimate content without an authorized
   human decision.
3. Every owner pay item preserves its official number, description, quantity,
   unit, sequence, evidence, and current document revision.
4. Build View and Bid Schedule View show the same item and financial records.
5. NYSDOT parent items support multiple operational child cost codes.
6. Every accepted child cost code can contain all approved direct-cost classes.
7. Unit cost is reproducibly derived from accepted resource costs and bid
   quantity.
8. Overrides retain the calculated value, override value, reason, user, and
   timestamp.
9. Owner bid quantities and production quantities cannot overwrite each other.
10. Unknown quantities remain unknown or Takeoff Required; they never become
    zero by default.
11. Preliminary AI takeoffs retain method, evidence, confidence, and review
    status.
12. Shared-cost allocation reconciles simultaneously by controlling method,
    quantity, percentage, and dollars.
13. Duplicate and orphan costs block final readiness.
14. Every supported price has an approved source and effective date.
15. Unsupported AI price suggestions cannot enter accepted financial totals.
16. Tax is calculated from approved project and resource rules and retains the
    policy version.
17. Global overhead, profit, and bond show their eligible bases, exclusions,
    rounding, and calculations.
18. Fixed allowances and adjustment items cannot be repriced accidentally.
19. Every material risk has probability, cost exposure, schedule exposure,
    mitigation, owner, and disposition.
20. RFQ and submittal records are created from accepted scope and remain linked
    to their source evidence.
21. Addendum reanalysis produces a reviewable impact proposal and preserves all
    accepted human work until changes are approved.
22. Every estimate record can expose its supporting evidence and review
    history.
23. Gates G0 through G9 are deterministic, explainable, and independently
    testable.
24. All seven workbook sheets use one immutable estimate revision.
25. Application, Excel, and PDF totals match within the approved rounding
    policy.
26. Cross-company and stale-generation writes fail without changing data.
27. Desktop, tablet, mobile, keyboard, focus, error, empty, loading, and
    disabled states follow the OpsSlate design lock.
28. Helios introduces no copied shell, duplicate UI library, arbitrary token,
    fake action, placeholder financial data, or disconnected mock estimate.
29. The approved culvert fixture can be extracted, reviewed, priced, allocated,
    risk-reviewed, and exported without losing source traceability.
30. No production deployment, OpsSlate production mutation, or direct handoff
    occurs without separate approval.

## 24. Foundation 3E stop point

This document is the design and engineering authority for Foundation 3E. It
does not authorize application implementation by itself.

The next action after approval is Foundation 3E.0: finalize the domain,
calculation, status, unit, extraction-proposal, and test-fixture contracts. No
estimator feature code should begin before 3E.0 is approved.
