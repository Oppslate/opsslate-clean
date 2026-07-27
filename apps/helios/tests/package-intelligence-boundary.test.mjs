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
const appendRoute = source(
  "src/app/api/projects/[projectId]/packages/[packageId]/entries/route.ts",
);
const uploadRoute = source(
  "src/app/api/projects/[projectId]/upload-url/route.ts",
);
const packageUi = source("src/components/bid-package-intake.tsx");
const packageFiles = source("src/lib/package-files.ts");
const writtenScopeUi = source("src/components/written-scope-dialog.tsx");
const manualPackage = source("src/lib/manual-package.ts");
const packages = source("../web/convex/heliosPackages.ts");
const projects = source("../web/convex/heliosProjects.ts");
const intelligence = source("../web/convex/heliosIntelligence.ts");
const actions = source("../web/convex/heliosIntelligenceActions.ts");
const schema = source("../web/convex/schema.ts");

test("package mutations require signed session and same-origin requests", () => {
  for (const route of [packageRoute, appendRoute, finalizeRoute, uploadRoute]) {
    assert.match(route, /readHeliosPrincipal/);
    assert.match(route, /isSameOrigin/);
  }
  assert.match(packages, /requireHeliosPrincipal/);
  assert.match(intelligence, /requireHeliosPrincipal/);
});

test("separate folders append idempotently to the current unfinalized revision", () => {
  assert.match(packageUi, /Add receipt to current package/);
  assert.match(appendRoute, /\/helios\/v1\/packages\/append/);
  assert.match(packages, /export const appendPackageEntries/);
  assert.match(packages, /project\.activePackageId !== bidPackage\._id/);
  assert.match(packages, /bidPackage\.status !== "uploading"/);
  assert.match(packages, /existingByPath/);
  assert.match(packages, /HELIOS_MAX_PACKAGE_ENTRIES/);
  assert.match(packages, /HELIOS_MAX_UPLOAD_BATCH/);
  assert.match(packages, /HELIOS_MAX_PACKAGE_BYTES/);
});

test("manual intake creates versioned canonical envelopes for every source form", () => {
  assert.match(packageUi, /WrittenScopeDialog/);
  assert.match(packageUi, /Package purpose/);
  assert.match(packageUi, /Revision label/);
  assert.match(packageFiles, /manual:\$\{crypto\.randomUUID\(\)\}/);
  assert.match(schema, /heliosPackageEnvelopes: defineTable/);
  assert.match(schema, /manifestFingerprint/);
  assert.match(packages, /existingEnvelope/);
  assert.match(packages, /revisionKind/);
  assert.match(packages, /The Bid Scout adapter is not enabled/);
});

test("written scopes are exact, server-hashed, immutable bid-basis evidence", () => {
  assert.match(writtenScopeUi, /Exact written scope/);
  assert.match(writtenScopeUi, /Review scope manifest/);
  assert.match(manualPackage, /createHash\("sha256"\)/);
  assert.match(manualPackage, /Buffer\.from\(entry\.content, "utf8"\)/);
  assert.match(schema, /heliosWrittenScopes: defineTable/);
  assert.match(packages, /supersedesWrittenScopeId/);
  assert.match(projects, /writtenScopes/);
  assert.match(intelligence, /ready_for_review/);
});

test("folder and ZIP intake use a persistent bounded package manifest", () => {
  assert.match(packageUi, /Select folder/);
  assert.match(packageUi, /Select ZIP/);
  assert.match(packageUi, /Review local manifest/);
  assert.match(packageFiles, /HELIOS_MAX_PACKAGE_ENTRIES/);
  assert.match(packageFiles, /HELIOS_MAX_ARCHIVE_EXPANSION_RATIO/);
  assert.match(packageFiles, /normalizePackagePath/);
  assert.match(packageFiles, /sha256File/);
  assert.match(packageFiles, /Only PDF files enter project intelligence/);
  assert.match(schema, /heliosBidPackages: defineTable/);
  assert.match(schema, /heliosPackageEntries: defineTable/);
});

test("upload authorization is bound to one package entry", () => {
  assert.match(uploadRoute, /packageEntryId/);
  assert.match(projects, /entry\.packageId !== bidPackage\._id/);
  assert.match(projects, /metadata\.size !== packageEntry\.size/);
  assert.match(projects, /sha256MatchesStorageDigest/);
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
