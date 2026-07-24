import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");

const contentRoute = source(
  "src/app/api/projects/[projectId]/documents/[documentId]/content/route.ts",
);
const reviewCockpit = source("src/components/evidence-review-cockpit.tsx");
const intelligencePanel = source(
  "src/components/project-intelligence-panel.tsx",
);
const gateway = source("../web/convex/heliosGateway.ts");
const projects = source("../web/convex/heliosProjects.ts");
const http = source("../web/convex/http.ts");

test("PDF content is protected by session, origin, tenant, and project ownership", () => {
  assert.match(contentRoute, /isSameOriginDocumentRequest/);
  assert.match(contentRoute, /readHeliosPrincipal/);
  assert.match(contentRoute, /callHeliosGatewayRaw/);
  assert.match(gateway, /protectedPayload/);
  assert.match(gateway, /authorizeDocumentContentReference/);
  assert.match(projects, /document\.companyId !== companyId/);
  assert.match(projects, /document\.projectId !== project\._id/);
  assert.match(http, /\/helios\/v1\/documents\/view/);
});

test("PDF delivery is inline, range-aware, private, and content-sniffing safe", () => {
  assert.match(gateway, /Range: range/);
  assert.match(gateway, /Content-Disposition/);
  assert.match(gateway, /inline; filename=/);
  assert.match(gateway, /private, no-store/);
  assert.match(gateway, /application\/pdf/);
  assert.match(contentRoute, /content-range/);
  assert.match(contentRoute, /X-Content-Type-Options/);
  assert.doesNotMatch(contentRoute, /storageUrl/);
});

test("source review uses the original PDF and citation-to-page navigation", () => {
  assert.match(reviewCockpit, /<iframe/);
  assert.match(reviewCockpit, /#page=\$\{pageNumber\}/);
  assert.match(reviewCockpit, /Source documents/);
  assert.match(reviewCockpit, /Cited evidence/);
  assert.match(reviewCockpit, /Open PDF page/);
  assert.match(intelligencePanel, /Open source page/);
  assert.match(intelligencePanel, /value="source-review"/);
});

test("3C.3 remains read-only and outside estimating workflow", () => {
  const combined = `${reviewCockpit}\n${intelligencePanel}`;
  assert.doesNotMatch(
    combined,
    /approve intelligence|create estimate|estimate builder|send rfq|ready for estimate/i,
  );
  assert.match(combined, /human verification/i);
});
