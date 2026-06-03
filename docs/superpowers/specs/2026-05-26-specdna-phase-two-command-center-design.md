# SpecDNA Phase Two Command Center Design

## Goal

Build the first Phase 2 Spec Intelligence layer: a project-level command center that converts the Phase 1 matrix and downstream records into action visibility, coverage scoring, attention flags, and handoff readiness.

## Scope

This first slice does not add new extraction categories and does not rewrite existing handoff panels. It summarizes the data Phase 1 already creates:

- Spec intake items by status and category.
- Low-confidence and unresolved review items.
- RFI, task, submittal, schedule, estimating, and billing handoff completeness.
- Missing owner/date/action signals that make a project risky after bid intake.
- Duplicate and conflict detection across extracted obligations.
- Addenda comparison between the two latest spec intake runs.
- Reminder / Follow-up automation for submittals, RFIs, task owners, and subcontractor submittal requests.

## Architecture

- Add a Convex query in `apps/web/convex/specDNA.ts` named `getCommandCenter`.
- The query returns a single project summary object with coverage, readiness, counts, and action queue rows.
- Add `apps/web/src/components/spec-intelligence-command-center.tsx` to render the cockpit.
- Render it on the project page above the Spec Intelligence Intake Matrix.

## Data Model

No new table is needed for this slice. The command center derives its state from:

- `specIntakeRuns`
- `specIntelligenceItems`
- `rfis`
- `tasks`
- `submittals`
- `scheduleConstraints`
- `paymentRules`
- `estimateRequirements`

## Readiness Model

Readiness is computed by destination:

- Estimating is ready when bid requirements and scope items are committed.
- PM is ready when tasks, submittals, and risks are either committed or resolved.
- Schedule is ready when schedule drivers are committed.
- Billing is ready when billing rules are committed.

Each destination returns a percent, a status label, and blockers.

## Action Queue

The first version creates action rows for:

- Low-confidence matrix items.
- Draft or approved items that have not been committed.
- Open RFIs from spec intelligence.
- Pending submittals from spec intelligence.
- Open tasks from spec intelligence missing an owner or due date.
- Active schedule constraints without dates.
- Estimate requirements and payment rules that are active but not linked to later workflow state.
- Duplicate obligations that likely represent repeated extraction or overlapping requirements.
- Conflicting obligations that should be reviewed and may need an RFI.

## Duplicate and Conflict Detection

The first detector is rules-based and intentionally explainable:

- Duplicate signals compare normalized obligation text, titles, source quotes, and matching spec sections.
- Conflict signals look for opposing language such as include/exclude, required/optional, yes/no, before/after, or owner/contractor responsibility inside related sections, trades, or phases.
- Conflict rows can be marked `rfiRecommended` when the contradiction affects scope, schedule, billing, or estimating and should be clarified formally.

## UI Direction

The panel should feel like a command cockpit, not another repeated card wall. It should show:

- Overall coverage score.
- Four readiness lanes: Estimating, PM, Schedule, Billing.
- Attention metrics for low confidence, open RFIs, pending submittals, and missing dates/owners.
- A compact action queue with type, title, reason, priority, and source evidence.

## Project handoff report

The command center should produce a bid-to-build handoff packet that summarizes:

- Executive Summary: overall state, coverage, readiness, and unresolved attention items.
- PM Readiness: narrative guidance for whether the project is ready to move forward.
- Downstream Summary: counts of RFIs, tasks, submittals, schedule constraints, estimate requirements, and payment rules.
- Open Risks: conflict/RFI/low-confidence items that need leadership review.
- Next Steps: practical actions the PM or estimator should take next.
- Source Documents: spec books and intake runs feeding the handoff.

## Addenda comparison

The command center should compare the latest intake run against the previous run when at least two runs exist:

- Added obligations that appear in the latest run only.
- Removed obligations that appeared in the prior run only.
- Changed obligations where the same normalized clause key has a different category, priority, status, or source quote.
- New risks that appeared in the latest run and may need RFIs.
- A plain-language change summary for the handoff packet and action queue.

## Reminder / Follow-up automation

The command center should derive a reminder queue from live downstream project records:

- Submittals with due dates that are overdue, due today, or due within seven days.
- Subcontractor submittal requests with responsible company/contact/email metadata.
- RFIs that are still open and have a required response date or missing assignment.
- Tasks that are still open and have a scheduled date or missing owner.
- Each reminder row should include owner, email/phone when available, due status, reason, priority, source evidence, last reminder timestamp, and reminder count.
- A lightweight "Mark reminded" operation should update `lastReminderSentAt`, increment `reminderCount`, and mark subcontractor submittal requests as reminded so future notification sending can use the same queue.

## Outbound reminder notifications

Reminder rows should be sendable without leaving the command center:

- Email reminders use the existing Resend sender and log successful sends into the correspondence repository.
- SMS reminders use Twilio Programmable Messaging, preferring `TWILIO_MESSAGING_SERVICE_SID` and falling back to `TWILIO_FROM_NUMBER`.
- RFI and task reminders resolve assignee names against project contacts so the system can find email and phone metadata.
- Missing recipients and missing provider credentials return clear statuses instead of crashing the cockpit.
- Each send records channel, status, provider message id, error text when applicable, timestamp, and reminder count on the source record.

## Schedule dependency graph

Schedule constraints should become actual predecessor/successor logic:

- Constraints can store predecessor task id, successor task id, dependency type, lag days, dependency status, and review notes.
- The graph resolver uses explicit task links first, then matches spec-derived blocking language against project tasks by title, trade, and phase.
- Applying dependency logic patches successor tasks with `dependsOn` links so downstream scheduler views can respect the chain.
- Unmatched constraints are marked `needs_review` instead of silently ignored.
- The schedule panel should show dependency edges, critical path candidates, and cycle warnings so bad logic is visible before it affects the project schedule.

## Estimate item suggestions

Scope and measurement clauses should become estimator-ready line item suggestions:

- Use committed estimate requirements, scope assumptions, allowances, alternates, and payment measurement rules as source material.
- Infer simple estimating units from measurement language such as SF, LF, CY, TON, HR, EA, or LS.
- Proposed items keep source requirement/payment rule ids, spec section, source quote, and confidence so the estimator can trace why the item exists.
- The estimate requirements panel should show suggested line items and allow adding them to the linked estimate.
- Added items should land in `estimateItems` with zero cost and quantity one so the estimator can price and quantity them without losing the source evidence.

## Estimate cockpit deeper integration

Suggested line items should map into the Estimating Cockpit structure before the estimator imports them:

- Infer estimating sections from trade, phase, requirement type, rule type, spec section, and scope language.
- Infer cost codes from spec sections and common construction language such as concrete, metals, electrical, civil, labor, material, and subcontract.
- Match suggestions against the company cost item catalog when token overlap is strong enough, carrying the catalog unit and unit cost as the starting point.
- Match suggestions against estimating assemblies so an estimator can see likely assembly placement before adding the item.
- Build duplicate fingerprints from source ids, section, description, unit, and cost code so repeated spec clauses do not create duplicate estimate rows.

## Submittal procurement workflow

Spec-driven submittals should move from a register into active procurement:

- Track procurement status separately from review status: not requested, requested, received, reviewed, overdue, and escalated.
- Send request emails to the responsible subcontractor/contact from the submittal record.
- Store requested by, requested timestamp, received timestamp, escalation timestamp, and escalation reason.
- Show a procurement dashboard with ready-to-request, requested, received, overdue, and escalated counts.
- Let users mark a submittal received, upload the received file, and escalate late requests from the submittal page.

## Commit / publish control center

The command center should show PMs what has been reviewed, what is ready to commit, and what has already been pushed downstream:

- Ready-to-commit count for approved Spec Intelligence items that do not yet have a downstream record.
- Published downstream count for committed items with `createdRecordType` and `createdRecordId`.
- Destination buckets for RFIs, tasks, submittals, estimate items, billing rules, and schedule logic.
- Downstream ledger with item title, destination, source category, record type, record id, and source evidence.
- Existing detailed review/publish modals remain in the Spec Intelligence Intake Matrix.

## Spec Intelligence audit trail and Exception dashboard

The command center should make Spec Intelligence explainable and operationally accountable:

- The audit trail should show extraction started, extraction completed, item extracted, review status, downstream publish, failed run, and run committed events.
- Each audit event should retain item/run id, category, status, destination, downstream record id, confidence, source section, and source quote when available.
- The exception dashboard should prioritize failed runs, low-confidence items, committed items with missing downstream records, approved items not yet committed, conflicts, and duplicates.
- Each exception should include severity, owner hint, destination, note, source evidence, and confidence so the PM knows who should act next.
- The UI should sit in the command center near publish controls so PMs can review exceptions before committing more records downstream.

## Closed-loop sync

Downstream project records should update the originating Spec Intelligence item automatically when the obligation is truly handled:

- Answered RFIs mark their source risk item resolved and store the answer, downstream record type, record id, resolver, and sync timestamp.
- Approved submittals mark their source submittal item resolved and store the review action/comments as the resolution note.
- Completed tasks, including tasks moved to 100 percent progress, mark their source task item resolved.
- Closed-loop sync events should appear in the audit trail so PMs can see not only what was published downstream, but what came back as completed.

## Spec Intelligence confidence scoring v2

Confidence should move beyond the raw AI extraction score and become an operational readiness score:

- Source quality should reward source quote length, spec section, page reference, description quality, and the original extraction confidence.
- Duplicate evidence should distinguish repeated supporting clauses from duplicate-risk exceptions.
- Contradiction risk should penalize obligations involved in conflict signals, especially high and critical conflicts.
- Downstream readiness should reward approved, committed, and closed-loop-resolved items while keeping draft items low.
- The command center should show average confidence, high-confidence count, watch items, and low-scoring obligations with score drivers.

## Autonomous Spec Agent

Phase 3 starts with a project-level agent that watches spec-driven downstream records and recommends action before the user asks:

- Watch RFIs, submittals, tasks, schedule constraints, billing rules, and estimate requirements created from Spec Intelligence.
- Generate deterministic recommendations with risk level, next best action, automation candidate flag, source record id, and source evidence.
- Prioritize open RFIs, pending submittals, ownerless or undated tasks, schedule constraints needing dependency/date logic, pay-app billing gaps, estimating allowances/alternates/exclusions, and conflict-driven RFI opportunities.
- Keep the first version provider-independent so it works even when external AI providers are unavailable.

## Bid Package / Subcontractor Intelligence

Spec Intelligence should turn reviewed bid-to-build data into subcontractor-facing bid packages:

- Group scope, bid requirements, submittals, schedule constraints, billing rules, and estimate requirements into trade packages.
- Create draft bid invitations for matching subcontractors using the subcontractor directory and trade metadata.
- Generate scope sheets with inclusions, exclusions, bid requirements, submittal requirements, schedule requirements, billing requirements, and source evidence.
- Create submittal requirement maps so required submittals can be requested from the responsible subcontractor after award.
- Create reminder paths for bid invite follow-ups and submittal procurement follow-ups without depending on external AI.

## Spec Change Impact Engine

Spec Intelligence should explain what each addenda/spec change affects before users manually chase it through the project:

- Compare added, changed, removed, and new-risk spec obligations against downstream records.
- Map affected modules: RFIs, tasks, submittals, schedule logic, billing rules, estimate items, bid packages, and subcontractor notifications.
- Score severity from change type, impacted record count, category, and high-risk language such as bid date, liquidated damages, exclusions, alternates, allowances, unit prices, bond, and insurance.
- Recommend the next action, such as update estimate pricing, revise scope sheets, notify subcontractors, create an RFI, update submittal requirements, adjust schedule dependencies, or update billing backup requirements.
- Preserve source evidence so a PM can see the exact spec section and quote behind the impact.

## Collapsible command center cards

The command center should be powerful without feeling overwhelming:

- The command center should be scan-first: users see short summaries first and open detail only when needed.
- Major command modules should use a reusable collapsible section wrapper with Show/Hide controls.
- Urgent sections, such as high-impact spec changes and autonomous agent alerts, should expand automatically.
- Informational sections, such as bid packages, audit trail, confidence detail, and addenda history, can default collapsed until the PM wants detail.
- Summary badges should stay visible while collapsed so the board remains scannable.
- Deeper panels should live behind a More Intelligence area so audit history, confidence scoring, evidence detail, and follow-up queues stay available without overwhelming the first view.

## Ops Books / billing packet polish

Billing rules should become a pay-app checklist instead of a loose rule list:

- Each published payment rule should be evaluated for measurement method, backup docs, certified payroll, stored materials, retainage, and unit price notes.
- The panel should show how many rules are pay-app ready and which records are missing required backup.
- Stored materials, retainage, certified payroll, and unit price checks should become applicable when the source rule language calls them out.
- The checklist should preserve source evidence so billing can defend each pay-app requirement with spec language.

## Testing

Add a static regression test for:

- `getCommandCenter` query exists.
- Query touches all required tables.
- Query returns `coverageScore`, `readiness`, `actionQueue`, and `attentionFlags`.
- UI renders “Spec Intelligence Command Center”.
- Project page renders the command center above existing panels.
