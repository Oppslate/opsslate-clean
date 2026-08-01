# Helios Euclid Stage 4Q — Quantity Review and Governed Publication

## Outcome

Stage 4Q connects the exact draft quantities calculated by Stage 4P to the existing Stage 4K publication ledger. It does not introduce another quantity solver. The current canonical Euclid record is recalculated deterministically at review and publication time, and every identity must still match.

## Estimator workflow

The Euclid surface workspace keeps the bid-day path short:

1. **Build surfaces and draft quantities** calculates the Stage 4P register.
2. **Accept** records a one-click, append-only decision for a verified draft.
3. **Send to estimate** requires the estimator to select the receiving cost code and choose comparative or production use.
4. **Create proposed quantity** invokes the existing Stage 4K boundary and creates a new proposed estimate quantity.

Defer is also one click and records a standard traceable reason. A deferred draft cannot be published. Geometry corrections remain in the governed Euclid review workflow; Stage 4Q never edits a calculated value.

## Immutable review identity

Every decision stores and revalidates:

- current Euclid database model ID and model fingerprint;
- alignment ID;
- complete Stage 4P result fingerprint;
- Stage 4P draft ID and draft fingerprint;
- value, unit, calculation type, engineering status, and confidence;
- reviewer identity, action, reason, timestamp, and decision fingerprint.

Review rows are append-only. The latest exact decision controls publication. A later defer or reject invalidates an earlier acceptance without deleting history.

## Stage 4K adapter

Publication fails closed unless all of these remain true:

- the Euclid model is current, contract-valid, accepted, promoted, non-shadow, and at canonical version 2 or later;
- promotion lineage matches the current model fingerprint;
- the current integration solution is passing and fingerprint-matched;
- the corresponding engineering-graph capability is ready for the alignment;
- the exact Stage 4P result and draft reproduce from the canonical record;
- the latest exact Stage 4Q review is accepted;
- the estimate, pay item, section, and selected cost code remain reviewable;
- production units match exactly when production use is selected; and
- the request, draft, and publication fingerprints have not been used for conflicting lineage.

The adapter writes the reviewed 4P identities into the append-only Stage 4K publication row. It then creates one new `proposed` plan quantity and one estimate decision event.

## Protected records

Stage 4Q does not:

- alter or accept an owner bid quantity;
- overwrite an existing plan or estimator quantity;
- change canonical geometry or source PDFs;
- apply shrink, swell, waste, pricing, or production factors;
- accept the new estimate quantity automatically;
- change resources, pricing, procurement, schedule, or LandXML; or
- call OpenAI, reread a PDF, or use storage.

## Acceptance criteria

Stage 4Q passes when reviews are append-only and stale-safe, only verified drafts can be accepted, only the latest accepted exact review can publish, all Stage 4K gates still apply, unit mismatches fail closed, an exact retry is idempotent, and every successful publication creates only a proposed estimate quantity with full 4P-to-4K lineage.
