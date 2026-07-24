import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const actions = readFileSync(
  join(root, "../web/convex/heliosIntelligenceActions.ts"),
  "utf8",
);
const intelligence = readFileSync(
  join(root, "../web/convex/heliosIntelligence.ts"),
  "utf8",
);
const projects = readFileSync(
  join(root, "../web/convex/heliosProjects.ts"),
  "utf8",
);
const projectPage = readFileSync(
  join(root, "src/components/project-intake.tsx"),
  "utf8",
);
const retryDocumentRoute = readFileSync(
  join(
    root,
    "src/app/api/projects/[projectId]/documents/[documentId]/retry/route.ts",
  ),
  "utf8",
);
const retryProjectRoute = readFileSync(
  join(root, "src/app/api/projects/[projectId]/intelligence/retry/route.ts"),
  "utf8",
);

test("OpenAI credentials and remote object IDs remain server-only", () => {
  assert.match(actions, /process\.env\.OPENAI_API_KEY/);
  assert.match(actions, /"use node"/);
  assert.doesNotMatch(projectPage, /OPENAI_API_KEY|openaiFileId|openaiResponseId/);
  assert.doesNotMatch(
    retryDocumentRoute + retryProjectRoute,
    /OPENAI_API_KEY|openaiFileId|openaiResponseId/,
  );
});

test("registered PDFs automatically enter the durable intelligence queue", () => {
  assert.match(projects, /scheduler\.runAfter\(0,\s*queueDocumentReference/);
  assert.match(intelligence, /scheduler\.runAfter\(0,\s*startDocumentReference/);
  assert.match(actions, /background:\s*true/);
  assert.match(actions, /responses\.retrieve/);
});

test("OpenAI objects are cleaned and evidence is revalidated before storage", () => {
  assert.match(actions, /responses\.delete/);
  assert.match(actions, /files\.delete/);
  assert.match(actions, /parseDocumentIntelligence/);
  assert.match(actions, /parseProjectSynthesis/);
  assert.match(intelligence, /parseDocumentIntelligence/);
  assert.match(intelligence, /parseProjectSynthesis/);
});

test("retry mutations preserve session, origin, tenant, and project boundaries", () => {
  for (const route of [retryDocumentRoute, retryProjectRoute]) {
    assert.match(route, /readHeliosPrincipal/);
    assert.match(route, /isSameOrigin/);
  }
  assert.match(intelligence, /requireHeliosPrincipal/);
  assert.match(intelligence, /projectForCompany/);
  assert.match(intelligence, /documentForProject/);
});

test("3C presents intelligence for review without estimate or approval actions", () => {
  assert.match(projectPage, /ProjectIntelligencePanel/);
  assert.doesNotMatch(
    projectPage,
    /approve intelligence|ready for estimate|create estimate/i,
  );
});
