# Helios Foundation 4A Review

Status: implemented and verified in the Helios development environment

Scope: canonical manual package intake only. Foundation 4B bid-basis profiling
and Foundation 4C through 4F plan/quantity intelligence remain gated.

## Delivered outcome

Helios can now register the bid basis actually received without requiring both
plans and specifications. An authenticated estimator can add individual PDFs,
one or more folders, ZIP packages, later supplemental/addendum revisions, or an
exact written scope. Every manual selection creates a canonical, versioned
package envelope and an estimator-visible receipt.

The work is additive. It does not replace or change the approved estimator,
contractor WBS, Cockpit 2.0, pricing, procurement, risk, or Foundation 3C PDF
intelligence contracts.

## Canonical intake contract

Each new manual envelope records:

- a stable envelope ID and manifest version;
- the `manual` adapter identity;
- source form, package revision, revision purpose, and optional revision label;
- accepted and rejected manifest entries with normalized relative paths;
- media kind and source category;
- exact byte size and SHA-256 for every accepted PDF or written scope;
- aggregate counts, bytes, status, creator, and timestamps; and
- a deterministic manifest fingerprint used to reject an envelope ID replayed
  with different contents.

The package receipt returns the stable project/package/envelope relationships,
per-entry dispositions, aggregate progress, and immutable revision history.

## Manual source workflows

| Source form | Result |
| --- | --- |
| Individual PDFs | Validated, hashed, uploaded, storage-verified, and registered |
| Multiple folders | Each folder is a separate receipt appended to the active revision; relative paths remain intact |
| ZIP package | Safely expanded with path, count, byte, nesting, media, and expansion-ratio controls |
| Written scope | Exact text, source reference, size, server-recomputed hash, and immutable version are retained |
| Addendum/revision | A new package revision records purpose and optional issued label without overwriting prior work |
| Interrupted PDF upload | Pending/failed entries remain visible and retryable before finalization |

## Security and integrity controls

- Existing independent Helios authentication, same-origin mutation checks,
  signed gateway calls, role checks, tenant derivation, project ownership, and
  parent hierarchy checks remain mandatory.
- The browser computes a PDF SHA-256 for the local manifest. Secure storage
  independently reports the stored hash and byte size. Registration fails
  closed when either differs.
- Written-scope byte size and SHA-256 are recomputed by the server before the
  signed gateway call; browser-declared values are not trusted.
- Package input validation requires hashes for every accepted source object.
- Exact project-level duplicates are linked without creating duplicate source
  records. Same-path content changes create a superseding immutable version.
- Reusing an envelope ID with a different manifest is rejected.
- A package cannot finalize while selected PDF entries are pending or failed.
- Bid Scout remains disabled at the mutation boundary. A contract fixture
  proves that a future Bid Scout envelope normalizes to the same manifest shape
  as manual intake without enabling live integration.

## Source availability behavior

Foundation 4A registers what was actually issued. A PDF-only, folder-only,
ZIP-only, or written-scope-only package can reach a valid terminal intake state.
For a written-scope-only package, finalization marks the package ready for bid-
basis review instead of sending it into the PDF reasoning queue or leaving it
stuck in processing.

Formal plans/specifications availability classification and capability-specific
readiness are Foundation 4B.

## Verification record

- Helios domain build: passed
- Helios production build: passed
- Helios lint: passed
- Domain tests: passed, including canonical written scope, manifest tamper
  rejection, and manual/Bid Scout fixture equivalence
- Helios boundary tests: passed, including session/origin enforcement,
  idempotent folder append, canonical envelopes, immutable written scope,
  storage hash comparison, and disabled Bid Scout
- Convex schema and function generation: passed
- Convex development deployment: updated at `kindly-tiger-289`
- Browser verification: authenticated project loaded with meaningful content,
  no framework error overlay, and PDF, folder, ZIP, and written-scope controls
  present
- Vercel preview or production deployment: not performed

## Exit decision

Foundation 4A is complete when the final checkpoint commit is recorded. The
next build is Foundation 4B: bid-basis profiling and document control, including
plans-only, specifications-only, written-scope-only, plans-and-specifications,
and mixed/other capability states without global estimate blocking.
