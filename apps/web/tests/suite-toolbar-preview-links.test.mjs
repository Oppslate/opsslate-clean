import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const toolbar = readFileSync(join(root, "public/suite-toolbar.js"), "utf8");

assert.ok(toolbar.includes("sameOriginPath"), "suite toolbar should build clean-app links from the current origin");
assert.ok(toolbar.includes('SESSION_URL = sameOriginPath("/api/auth/suite-session")'), "session checks should stay on the current deployment");
assert.ok(toolbar.includes('LOGIN_URL = sameOriginPath("/login")'), "login should stay on the current deployment");
assert.ok(toolbar.includes('SIGNUP_URL = sameOriginPath("/signup")'), "signup should stay on the current deployment");
assert.ok(toolbar.includes('appHref: sameOriginPath("/")'), "Project Management should not jump to production while previewing");
assert.ok(toolbar.includes('appHref: sameOriginPath("/estimating")'), "Estimating should stay in the clean deployment");
assert.ok(toolbar.includes('this.loggedIn ? sameOriginPath("/") : sameOriginPath("/project-management")'), "brand link should stay on the current deployment");
