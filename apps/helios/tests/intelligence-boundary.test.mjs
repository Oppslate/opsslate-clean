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
const contracts = readFileSync(
  join(root, "../web/convex/heliosOpenAIContracts.ts"),
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
const intelligencePanel = readFileSync(
  join(root, "src/components/project-intelligence-panel.tsx"),
  "utf8",
);
const suiteFooter = readFileSync(
  join(root, "../../packages/suite-ui/src/shell/SuiteFooter.tsx"),
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

test("confidence uses an explicit integer percentage contract", () => {
  const integerConfidenceFields = contracts.match(
    /confidence:\s*\{\s*type:\s*"integer",\s*minimum:\s*0,\s*maximum:\s*100\s*\}/g,
  );
  assert.ok(
    integerConfidenceFields && integerConfidenceFields.length >= 5,
    "every confidence field should use an integer 0-100 schema",
  );
  assert.match(contracts, /Never return a decimal fraction between 0 and 1/);
  assert.match(contracts, /never a\s+decimal fraction between 0 and 1/);
});

test("project synthesis auto-populates only blank project metadata from cited evidence", () => {
  assert.match(contracts, /projectMetadata/);
  assert.match(contracts, /projectNumber/);
  assert.match(contracts, /ownerClient/);
  assert.match(contracts, /engineer/);
  assert.match(contracts, /bidDate/);
  assert.match(contracts, /location/);
  assert.match(contracts, /Return bidDate as YYYY-MM-DD/);
  assert.match(intelligence, /const projectPatch/);
  assert.match(intelligence, /!project\?\.projectNumber/);
  assert.match(intelligence, /!project\?\.bidDate/);
  assert.match(intelligence, /!project\?\.location/);
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

test("project intelligence remains scannable without content overlays", () => {
  assert.match(intelligencePanel, /overflow-x-auto overflow-y-hidden/);
  assert.match(intelligencePanel, /evidenceByDocument/);
  assert.match(intelligencePanel, /<details/);
  assert.match(intelligencePanel, /\bUpdating\b/);
  assert.doesNotMatch(
    intelligencePanel,
    /TabsList className="max-w-full overflow-x-auto"/,
  );
  assert.doesNotMatch(suiteFooter, /sticky bottom-0/);
});
