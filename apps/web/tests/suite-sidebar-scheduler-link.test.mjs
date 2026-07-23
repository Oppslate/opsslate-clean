import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const navigation = readFileSync(
  join(root, "src/lib/opsslate-navigation.ts"),
  "utf8",
);

assert.ok(
  navigation.includes('process.env.NEXT_PUBLIC_SCHEDULER_APP_URL ||'),
  "OpsSlate navigation should allow the Scheduler deployment to be configured",
);

assert.ok(
  navigation.includes('"https://opsslate-clean-web-seven.vercel.app/scheduler"'),
  "Suite Tools Scheduler fallback should point to the clean Scheduler deployment",
);
