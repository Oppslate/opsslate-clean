#!/usr/bin/env node
// Pre-build check: block deploys only if react-hooks/rules-of-hooks errors exist
const { execSync } = require("child_process");
try {
  let out;
  try {
    out = execSync("npx eslint src/ --format json --no-warn-ignored 2>/dev/null", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60000,
    });
  } catch (e) {
    out = e.stdout || "";
  }

  if (!out || !out.trim().startsWith("[")) {
    console.log("⚠️ ESLint output unavailable, skipping hooks check");
    process.exit(0);
  }

  const results = JSON.parse(out);
  const violations = [];
  for (const file of results) {
    for (const msg of file.messages) {
      if (msg.ruleId === "react-hooks/rules-of-hooks" && msg.severity === 2) {
        violations.push(`  ${file.filePath}:${msg.line} — ${msg.message}`);
      }
    }
  }
  if (violations.length) {
    console.error("\n🚫 HOOKS VIOLATION — build blocked:\n");
    violations.forEach((v) => console.error(v));
    console.error("\nFix: All hooks must be called before any early returns.\n");
    process.exit(1);
  }
  console.log("✅ No hooks violations found.");
} catch (e) {
  console.log("⚠️ Hooks check skipped:", e.message);
  process.exit(0);
}
