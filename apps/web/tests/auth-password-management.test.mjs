import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const authContext = readFileSync(join(root, "src/lib/auth-context.tsx"), "utf8");
const authMutations = readFileSync(join(root, "convex/auth.ts"), "utf8");

assert.ok(authContext.includes("opsslate_suite_password_managed:"), "login should know when an email uses a Suite-managed password");
assert.ok(authContext.includes("isSuitePasswordManaged"), "login should check Suite-managed password state before shared auth fallback");
assert.ok(authContext.includes("throw directError"), "Suite-managed passwords should not fall through to shared auth after a failed local login");
assert.ok(authContext.includes("Shared auth is only used to create a Suite account"), "old shared-auth passwords should not bypass a failed Suite login");
assert.ok(authContext.includes("const canTrySharedAuth = !isSuitePasswordManaged(email)"), "separate shared-auth accounts should still be allowed to provision after a missing local Suite login");
assert.ok(authContext.includes("if (!canTrySharedAuth) throw directError"), "Suite-managed emails should stop before shared auth fallback");
assert.ok(authContext.includes("resetPasswordMut({ email, newPassword: password })"), "signup should save the chosen password as the Suite password");
assert.ok(authContext.indexOf("await loginMut({ email, password })") < authContext.indexOf("fetch(`${AUTH_URL}/api/auth/login`"), "login should try the local Suite password before shared auth");
assert.ok(authContext.includes("const loginEmail = email.trim().toLowerCase()"), "client login should normalize emails before auth checks");
assert.ok(authMutations.includes("const email = args.email.trim().toLowerCase()"), "auth mutations should normalize emails before account lookup");
