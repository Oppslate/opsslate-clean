import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");

const packageRoute = source(
  "src/app/api/projects/[projectId]/packages/route.ts",
);
const finalizeRoute = source(
  "src/app/api/projects/[projectId]/packages/[packageId]/finalize/route.ts",
);
const uploadRoute = source(
  "src/app/api/projects/[projectId]/upload-url/route.ts",
);
const packageUi = source("src/components/bid-package-intake.tsx");
const packageFiles = source("src/lib/package-files.ts");
const packages = source("../web/convex/heliosPackages.ts");
const projects = source("../web/convex/heliosProjects.ts");
const intelligence = source("../web/convex/heliosIntelligence.ts");
const actions = source("../web/convex/heliosIntelligenceActions.ts");
const schema = source("../web/convex/schema.ts");

test("package mutations require signed session and same-origin requests", () => {
  for (const route of [packageRoute, finalizeRoute, uploadRoute]) {
    assert.match(route, /readHeliosPrincipal/);
    assert.match(route, /isSameOrigin/);
  }
  assert.match(packages, /requireHeliosPrincipal/);
  assert.match(intelligence, /requireHeliosPrincipal/);
});

test("folder and ZIP intake use a persistent bounded package manifest", () => {
  assert.match(packageUi, /Select folder/);
  assert.match(packageUi, /Select ZIP/);
  assert.match(packageUi, /Review local manifest/);
  assert.match(packageFiles, /HELIOS_MAX_PACKAGE_ENTRIES/);
  assert.match(packageFiles, /HELIOS_MAX_ARCHIVE_EXPANSION_RATIO/);
  assert.match(packageFiles, /normalizePackagePath/);
  assert.match(packageFiles, /Only PDF files enter project intelligence/);
  assert.match(schema, /heliosBidPackages: defineTable/);
  assert.match(schema, /heliosPackageEntries: defineTable/);
});

test("upload authorization is bound to one package entry", () => {
  assert.match(uploadRoute, /packageEntryId/);
  assert.match(projects, /entry\.packageId !== bidPackage\._id/);
  assert.match(projects, /metadata\.size !== packageEntry\.size/);
  assert.match(projects, /packageEntryId: packageEntry\?\._id/);
  assert.match(projects, /if \(!bidPackage\)/);
});

test("project intelligence starts only after explicit package finalization", () => {
  assert.match(packageUi, /Package ready for analysis/);
  assert.match(intelligence, /export const finalizePackage/);
  assert.match(intelligence, /bidPackage\.finalizedAt/);
  assert.match(intelligence, /await enqueueDocument\(ctx, document\)/);
  assert.match(intelligence, /maybeStartProjectSynthesis/);
});

test("package synthesis is durable, retryable, and retains prior generations", () => {
  assert.match(actions, /background: true/);
  assert.match(actions, /export const pollProject/);
  assert.match(actions, /PROJECT_TIMEOUT_MS/);
  assert.match(intelligence, /generationId: job\._id/);
  assert.match(intelligence, /inputTokens: args\.inputTokens/);
  assert.match(intelligence, /isCurrent: false/);
  assert.match(intelligence, /packageDocumentIds/);
  assert.match(intelligence, /allowedDocumentIds/);
  assert.doesNotMatch(
    intelligence,
    /for \(const row of previous\) await ctx\.db\.delete\(row\._id\)/,
  );
  assert.match(intelligence, /latestIntelligenceError/);
});

test("replacement documents preserve version and supersession history", () => {
  assert.match(projects, /relativePath\?\.toLowerCase\(\)/);
  assert.match(projects, /status: "superseded"/);
  assert.match(projects, /supersedesDocumentId: priorVersion\?\._id/);
  assert.match(projects, /version: \(priorVersion\?\.version \|\| 0\) \+ 1/);
});
