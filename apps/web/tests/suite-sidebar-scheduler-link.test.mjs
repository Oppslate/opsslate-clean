import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const sidebar = readFileSync(join(root, "src/components/sidebar.tsx"), "utf8");

assert.ok(
  sidebar.includes('process.env.NEXT_PUBLIC_SCHEDULER_APP_URL || "https://opsslate-clean-web-seven.vercel.app/scheduler"'),
  "Suite Tools Scheduler fallback should point to the clean Scheduler deployment",
);
