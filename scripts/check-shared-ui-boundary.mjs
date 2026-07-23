import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const failures = [];

const legacyOwnedPaths = [
  "apps/web/public/suite-toolbar.js",
  "apps/web/src/components/sidebar.tsx",
  "apps/web/src/components/ui",
  "apps/web/src/components/toast.tsx",
  "apps/web/src/components/empty-state.tsx",
  "apps/web/src/components/skeleton.tsx",
  "apps/web/src/components/table-toolbar.tsx",
];

for (const relativePath of legacyOwnedPaths) {
  if (existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`Legacy app-local UI ownership remains: ${relativePath}`);
  }
}

for (const app of ["web", "helios"]) {
  const globalsPath = path.join(
    repoRoot,
    "apps",
    app,
    "src",
    "app",
    "globals.css",
  );
  const globals = readFileSync(globalsPath, "utf8");
  if (!globals.includes('@import "@opsslate/suite-ui/styles.css";')) {
    failures.push(`${app} does not import the shared token stylesheet`);
  }
  if (globals.includes("--color-background:")) {
    failures.push(`${app} redeclares shared semantic tokens`);
  }
}

function sourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) files.push(...sourceFiles(fullPath));
    if (stat.isFile() && /\.(css|ts|tsx)$/.test(entry)) files.push(fullPath);
  }
  return files;
}

const heliosSource = path.join(repoRoot, "apps", "helios", "src");
const forbiddenHeliosPatterns = [
  /@\/components\/ui\//,
  /--color-background\s*:/,
  /#070d16/i,
  /#f97316/i,
  /function\s+(AppShell|Sidebar)\s*\(/,
];

for (const file of sourceFiles(heliosSource)) {
  const source = readFileSync(file, "utf8");
  for (const pattern of forbiddenHeliosPatterns) {
    if (pattern.test(source)) {
      failures.push(
        `Helios duplicates shared visual ownership in ${path.relative(
          repoRoot,
          file,
        )}: ${pattern}`,
      );
    }
  }
}

const sharedPackage = JSON.parse(
  readFileSync(path.join(repoRoot, "packages", "suite-ui", "package.json")),
);

if (sharedPackage.version !== "0.2.0") {
  failures.push(
    `Expected @opsslate/suite-ui version 0.2.0, found ${sharedPackage.version}`,
  );
}

if (failures.length > 0) {
  console.error("Shared UI boundary check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Shared UI boundary check passed: one token source, one primitive source, one toolbar source, and one shell/sidebar source.",
);
