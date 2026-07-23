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
  navigation.includes('process.env.NEXT_PUBLIC_ESTIMATING_APP_URL ||'),
  "OpsSlate navigation should allow the Estimating deployment to be configured",
);

assert.ok(
  navigation.includes('"https://opsslate-clean-web-seven.vercel.app/estimating"'),
  "Suite Tools Estimating fallback should point to the clean Estimating deployment",
);
