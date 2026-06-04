import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const authContext = readFileSync(join(root, "src/lib/auth-context.tsx"), "utf8");
const suiteSessionRoute = readFileSync(join(root, "src/app/api/auth/suite-session/route.ts"), "utf8");

assert.ok(authContext.includes("currentCookieDomain"), "client auth should choose cookie domain from current host");
assert.ok(authContext.includes('window.location.href = "/login"'), "logout should stay on the current deployment login route");
assert.ok(!authContext.includes('const OPSLATE_LOGIN_URL = "https://www.opsslate.app/login"'), "client auth should not force preview users back to production");
assert.ok(suiteSessionRoute.includes("cookieDomainForRequest"), "suite-session API should choose cookie domain from request host");
assert.ok(suiteSessionRoute.includes('hostname.endsWith("opsslate.app")'), "suite-session API should only use shared domain cookies on OpsSlate domains");
