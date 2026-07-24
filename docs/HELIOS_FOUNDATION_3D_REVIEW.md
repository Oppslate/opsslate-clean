# Helios Foundation 3D: Human Finding Review

## Outcome

Foundation 3D turns the cited Project Intelligence output from Foundation 3C
into an estimator-controlled review queue. It adds human decisions and
corrections without changing the original AI generation.

The workflow is:

Bid package intelligence

→ Filtered finding review queue

→ Source PDF verification

→ Approve, correct, reject, request reanalysis, or supersede

→ Append-only human review history

This milestone stops before estimate items, pricing, procurement, RFQs, and
proposal generation.

## Review model

Every AI finding starts as `needs_review`. An authorized estimator can record:

- `approve`: accept the interpretation and optionally assign a trade.
- `correct`: retain the AI output and layer a corrected title, interpretation,
  trade, and review note over it.
- `reject`: explain why the finding must not be used.
- `request_reanalysis`: explain the concern and create a new durable Project
  Intelligence generation.
- `supersede`: explain why newer information or another finding replaces it.

Review events are append-only. The UI derives the current human-reviewed state
from the ordered event history. No mutation updates or deletes the original AI
finding or a prior review event.

## Security boundary

The browser can submit project, intelligence, and finding identifiers, but it
cannot authorize them. Every review mutation:

1. requires a verified Helios session and same-origin request;
2. resolves the active user and company on the server;
3. revalidates project and intelligence company ownership;
4. requires the intelligence to belong to the project;
5. requires the intelligence to be the current completed generation;
6. rejects stale package revisions and projects currently being analyzed;
7. derives and validates the finding index from the server-owned generation;
8. records the server-resolved reviewer identity and timestamp.

A wrong-company review returns an error and writes no event.

## Reanalysis

`request_reanalysis` records the human concern first, marks the project queued,
and schedules a new durable synthesis job. Successful synthesis creates a new
current intelligence record and marks the preceding generation non-current.
The preceding generation, its evidence, and its review events remain retained
for audit.

## User experience

The Foundation 3D review tab uses the shared OpsSlate design system and provides:

- summary counts for each review state;
- search plus type, risk, confidence, status, and trade filters;
- direct navigation from a finding to its cited PDF evidence;
- real review actions with explicit confirmation dialogs;
- required explanations for rejection, reanalysis, and supersession;
- corrected interpretations shown as human-authored overrides;
- expandable reviewer, timestamp, decision, correction, and note history;
- locked actions when a generation is stale, updating, or incomplete.

## Objective acceptance criteria

Foundation 3D passes when:

- every finding has a deterministic review state and visible evidence path;
- all five decisions persist through the protected backend boundary;
- corrections do not overwrite AI output;
- review history is append-only and identifies the reviewer;
- reanalysis creates and selects a new generation while retaining the old one;
- stale and in-progress generations cannot be reviewed;
- forged cross-company mutations write nothing;
- filters work across type, risk, confidence, status, and assigned trade;
- keyboard focus and dialog behavior use the shared accessible primitives;
- no estimate, bid-item, price, vendor, RFQ, or proposal mutation exists;
- Helios tests, TypeScript, lint, shared UI ownership, and production build pass.

## Live development verification

On the isolated Helios development backend:

- an approved finding persisted and returned one reviewer-history event;
- a wrong-company mutation returned `400` and left the target finding at
  `needs_review` with zero history;
- a reanalysis request persisted as `reanalysis_requested`;
- the reanalysis completed as a new current intelligence generation;
- the preceding generation remained stored as non-current;
- both review events remained attached to the preceding generation.

Production data, domains, and deployments were not modified.
