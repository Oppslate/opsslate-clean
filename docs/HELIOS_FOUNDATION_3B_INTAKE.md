# Helios Foundation Item 3B — Cockpit and Secure Document Intake

Status: implementation complete; live integration review pending

## Scope

Foundation 3B creates the first working Helios preconstruction workflow:

1. A tenant-scoped Helios project is created.
2. The estimator opens its intake workspace.
3. One or more PDF bid documents are uploaded directly to protected Convex
   storage using short-lived upload URLs.
4. Helios validates the stored object and registers it in the project.
5. The cockpit displays real projects and real documents waiting for the
   separately approved intelligence milestone.

This milestone does not call OpenAI, extract document content, show simulated
analysis, create estimates, send RFQs, generate proposals, or hand projects to
OpsSlate.

## Product boundary

Helios opportunities are stored in `heliosProjects`. They are intentionally
separate from OpsSlate's awarded-project `projects` table. A future approved
handoff must create or link an OpsSlate project explicitly.

The cockpit and intake screen use the versioned `@opsslate/suite-ui` shell,
toolbar, cards, tables, forms, dialog, badges, toast, skeleton, tokens, and
responsive behavior. Helios does not own a copied shell or a second component
library.

## Persistent records

### `heliosProjects`

- Stored company and creator ownership
- Project name, number, owner/client, engineer, bid date, location, and notes
- Intake and intelligence-readiness states
- Company/update and company/status indexes

### `heliosDocuments`

- Stored company, project, uploader, and protected storage ID
- Original and canonical filenames
- Storage-observed content type, byte size, and SHA-256
- Registration status and version fields
- Project, project/hash, and company/update indexes

### `heliosUploadIntents`

- One-hour upload authorization
- Stored company, project, and creator ownership
- Pending, consumed, or failed state
- Duplicate-document and failure references

## Request and storage security

1. The browser calls same-origin Helios route handlers.
2. Mutating route handlers reject cross-origin requests.
3. The server derives the signed Helios principal from the HTTP-only session.
4. The server sends only a minimal principal to the bearer-protected Convex
   gateway.
5. Every internal Convex operation reloads the existing user, identity link,
   active membership, authorized role, and company ownership.
6. The browser never submits an authoritative `companyId`.
7. Upload URLs are generated only after project ownership is confirmed and
   expire after one hour.
8. The browser uploads the PDF directly to storage, avoiding application
   server body limits.
9. Before registration, the gateway reads the stored blob and verifies the
   `%PDF-` signature.
10. The mutation verifies the storage-observed MIME type, nonzero size,
    250 MB limit, filename extension, and storage-generated SHA-256.
11. Invalid blobs are deleted. Exact duplicate hashes within the same project
    are deleted and resolved to the existing document.
12. 3B does not expose Convex storage bearer URLs to the browser, so protected
    PDFs cannot yet be viewed or downloaded. A secure document-delivery design
    is required before the three-pane PDF cockpit can be activated.

## Real states

- Project: `draft`, `intake`, `documents_ready`, `archived`
- Intelligence: `awaiting_documents`, `ready_for_intelligence`
- Document: `ready_for_intelligence`, `failed`, `superseded`

`ready_for_intelligence` means only that secure intake succeeded. It does not
claim that AI processing has occurred.

## Upload behavior

- Drag-and-drop and file picker
- Up to 20 files per batch
- PDF filename, MIME, nonempty, size, and signature validation
- Per-file upload progress
- Per-file error and retry
- Exact duplicate detection within a project
- Persistent document list after registration
- Responsive desktop, tablet, and mobile layouts

## Required environment configuration

No additional environment variables were introduced beyond Foundation 3A:

Helios runtime:

- `OPSSLATE_AUTH_URL`
- `HELIOS_SESSION_SECRET`
- `HELIOS_CONVEX_SITE_URL`
- `HELIOS_IDENTITY_GATEWAY_SECRET`

Matching Convex deployment:

- `HELIOS_IDENTITY_GATEWAY_SECRET`

The gateway secret now protects both identity resolution and Helios project
data operations. It remains server-only.

## Verification completed locally

- Helios domain tests: project normalization, dates, PDF candidates, canonical
  names, and PDF signature
- Helios security tests: same-origin mutations, server-derived principal,
  tenant authorization, stored metadata validation, duplicate hash, and
  non-exposure of storage URLs
- Helios ESLint
- Web/Convex TypeScript check
- Shared OpsSlate UI ownership boundary check
- Helios production build
- OpsSlate web production build

## Live integration acceptance gates

Before 3B can be promoted or approved for production:

- Deploy the Convex schema and gateway to an isolated non-production target.
- Configure isolated preview secrets.
- Confirm active owner/admin/estimator access and reject disabled, unknown, and
  unauthorized roles.
- Create projects in two companies and prove neither can list, open, or mutate
  the other's records.
- Upload valid, empty, oversized, renamed non-PDF, corrupt-signature, and exact
  duplicate files.
- Interrupt and retry a file upload.
- Confirm no protected storage URL appears in page source, browser storage, or
  persistent project records returned to the client.
- Visually verify cockpit, dialog, intake, progress, errors, tables, drawer,
  focus order, keyboard operation, desktop, tablet, and mobile against the
  OpsSlate design lock.
- Decide and approve secure PDF delivery before implementing the actual PDF
  viewer.

## Known operational follow-up

If a browser uploads a blob but closes before registration, the blob is not
connected to a Helios document. A future maintenance process should remove
unclaimed storage objects without scanning or deleting storage used by other
OpsSlate features.
