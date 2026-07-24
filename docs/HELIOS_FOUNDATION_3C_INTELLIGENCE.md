# Helios Foundation Item 3C — AI Document Intelligence

Status: implementation complete; live OpenAI PDF validation passed

## Scope

Foundation 3C turns registered bid PDFs into evidence-backed project
intelligence for a heavy-highway general contractor pursuing New York public,
institutional, industrial, water, wastewater, transportation, utility, and
municipal work.

The continuous workflow in this checkpoint is:

1. Secure PDF registration commits the document record.
2. The same transaction schedules a durable document-intelligence job.
3. A Convex Node action loads the protected PDF from storage.
4. The action uploads the PDF to OpenAI as `user_data`.
5. OpenAI reads the PDF text and rendered pages and returns strict structured
   output.
6. Helios validates every citation and finding before persistence.
7. When all document jobs reach a terminal state, Helios synthesizes one
   project-level intelligence record from the accepted evidence.
8. The project workspace displays summary, confidence, grouped findings, source
   document, physical PDF page, locator, and excerpt for human review.
9. The estimator can open the protected original PDF beside the cited evidence
   and move directly from a conclusion to its physical source page.

This checkpoint does not approve intelligence, mark a project ready for an
estimate, create estimate items, send RFQs, generate proposals, or hand a
project to OpsSlate. Those capabilities require separate approval.

## Foundation 3C.3 evidence review cockpit

Foundation 3C.3 adds a read-only estimator review surface:

- three-pane desktop layout for source documents, the original PDF, and cited
  passages;
- citation buttons that open the correct document and physical PDF page;
- previous/next cited-passage navigation;
- a protected open-in-native-viewer action;
- tablet stacking and a mobile native-PDF fallback;
- persistent AI provenance and human-verification language.

The viewer uses the original protected PDF stored during intake. It does not
render a reconstructed document or expose a storage URL.

## Security boundary

- `OPENAI_API_KEY` exists only in the selected Convex deployment environment.
- The browser and Helios Next.js runtime never receive the key.
- Only internal Convex actions can call OpenAI.
- OpenAI file and response IDs are stored only in the server-side job table and
  are never returned through the Helios gateway.
- The existing signed session, same-origin, active-membership, role, company,
  project, and document ownership checks protect all retry operations.
- Original PDF delivery reauthorizes the session, company, project, and
  document on every request and proxies only the PDF stream through Helios.
- PDF range requests are supported without returning the protected Convex
  storage URL to the browser.
- PDF responses use private/no-store caching, inline disposition,
  content-sniffing protection, and same-origin framing restrictions.
- Provider errors are converted to bounded operational messages; document
  content and raw provider responses are not logged or returned.
- A stable opaque company identifier is sent as OpenAI's
  `safety_identifier`; no email address or user name is used.

## OpenAI processing contract

- Default model: `gpt-5.6-sol`
- Optional model override: `HELIOS_OPENAI_MODEL`
- Document reasoning effort: `high`
- Input detail: `auto`
- Response format: strict JSON Schema
- Maximum accepted PDF: 50 MB
- Remote file purpose: `user_data`
- Document execution: background response with durable Convex polling
- Project synthesis: text-only structured response over accepted evidence

The 50 MB Helios upload boundary matches OpenAI's documented per-file and
combined file-input request limit, so Helios does not accept a file that its
approved reasoning path cannot process.

References:

- [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI background mode](https://developers.openai.com/api/docs/guides/background)

## Retention decision

Background mode is used so large plan and specification sets can outlive one
short action call. OpenAI documents that background mode is not compatible
with Zero Data Retention. Helios therefore applies data minimization and
explicit cleanup:

- persist only the validated Helios intelligence and its evidence;
- delete the OpenAI response after successful persistence or terminal failure;
- delete the uploaded OpenAI file after successful persistence or terminal
  failure;
- retain the original protected PDF only in tenant-scoped Convex storage;
- keep remote IDs server-only while a job is active.

If a future customer requires Zero Data Retention, Helios must use a separately
approved non-background execution architecture before enabling intelligence
for that tenant.

## Evidence invariants

Helios rejects output unless all of the following are true:

- evidence keys are unique within a document;
- each evidence item includes a short exact excerpt and a physical PDF page
  when the page is identifiable;
- every document summary cites at least one valid document evidence key;
- every document finding cites at least one valid document evidence key;
- every project summary cites at least one stored project evidence ID;
- every project finding cites at least one stored project evidence ID;
- populated project type and funding source values cite stored evidence;
- categories, severity, confidence, text length, and collection sizes remain
  within the Helios schema;
- project synthesis can cite only evidence belonging to the current project.

OpenAI's JSON Schema is a first constraint. The shared Helios domain parser and
the persistence mutation independently validate the result again before any
intelligence record is committed.

## Durable states and retry

Document states:

- `ready_for_intelligence`
- `queued`
- `uploading_to_openai`
- `analyzing`
- `completed`
- `failed`
- `superseded`

Project intelligence states:

- `awaiting_documents`
- `ready_for_intelligence`
- `queued`
- `processing`
- `ready_for_review`
- `partially_ready`
- `failed`

Each document attempt creates a job record. Scheduled mutations commit the job
and its follow-up action atomically. Polling tolerates transient retrieval
errors within a bounded processing window. Failed documents can be retried only
through an authenticated, same-origin, tenant-owned project route. Successful
documents are not silently reprocessed.

If some documents succeed and others fail, Helios synthesizes from the accepted
evidence and marks the project `partially_ready`. The interface keeps the failed
documents visible for explicit retry.

## Interface behavior

The implementation reuses the shared OpsSlate shell, cards, tables, buttons,
badges, tabs, toast, typography, tokens, spacing, focus treatment, and
responsive behavior.

The limited Helios-specific treatment is:

- orange-outlined `AI-generated` provenance badge;
- explicit confidence labels and percentages;
- source/page citation badges;
- citation-to-page source review using the original protected PDF;
- evidence excerpt cards;
- warning and critical severity icons;
- persistent “Human review required” language.

There is no approval button, reconstructed or fake PDF, estimate action,
placeholder analysis, or disconnected mock project data.

## Required environment configuration

Selected Convex development/preview deployment:

- `OPENAI_API_KEY` — required; actual OpenAI project API key
- `HELIOS_OPENAI_MODEL` — optional; defaults to `gpt-5.6-sol`
- `HELIOS_IDENTITY_GATEWAY_SECRET` — required by the existing Helios gateway

The key must be set directly in the intended Convex deployment. It must not be
added to `.env.local`, a Vercel client variable, source control, a screenshot,
or a shell command argument that remains in history.

## Verification

Completed:

- shared-domain type check;
- web/Convex TypeScript check;
- Convex schema and function deployment to isolated development deployment
  `dev/helios-foundation-3c` (`kindly-tiger-289`);
- Helios TypeScript and ESLint;
- domain tests for the 50 MB boundary and citation rejection;
- security tests for automatic scheduling, server-only secrets and remote IDs,
  cleanup, double validation, authenticated retries, and 3C scope boundary.

Live OpenAI smoke test:

- The internal-only smoke action generated a one-page heavy-highway PDF and
  exercised the real file-input and structured-output path.
- GPT-5.6 Sol returned four evidence records and six findings.
- Every returned finding cited accepted evidence.
- The OpenAI response and uploaded file were deleted after validation.
- The temporary smoke action was removed from the codebase and the clean
  function set was redeployed.

## Acceptance remaining

- Exercise a signed Helios session with a real registered PDF.
- Verify automatic state progression, project synthesis, retry, and cleanup.
- Visually inspect desktop, tablet, and mobile intelligence states.
- Review accessibility for keyboard tabs, focus order, live status, citations,
  error recovery, and contrast.
- Exercise the protected PDF route through an authenticated human browser
  session on the preview deployment.
- Do not promote Helios to production or begin Foundation 4 until this review
  is complete.
