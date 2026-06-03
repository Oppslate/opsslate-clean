import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src", "app", "emails", "page.tsx"), "utf8");

assert.match(page, /inboundEmailAddresses\.list/, "emails page reads configured inbound addresses");
assert.match(page, /activeForwardingAddresses/, "emails page derives active forwarding addresses");
assert.match(page, /inbound\.opsslate\.app/, "emails page points users to inbound OpsSlate addresses");
assert.match(page, /Create address/, "emails page links to address creation");
assert.match(page, /project@inbound\.opsslate\.app/, "emails page shows a company/project style example");
assert.doesNotMatch(page, /companyForwardingAddress\s*\|\| "your-company@opsslate\.app"/, "emails page does not rely on the legacy personal fallback address");

console.log("email forwarding address display checks passed");
