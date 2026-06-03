import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const teamPage = readFileSync(join(root, "src/app/team/page.tsx"), "utf8");
const authMutations = readFileSync(join(root, "convex/auth.ts"), "utf8");

assert.ok(teamPage.includes("api.auth.resetPassword"), "team management should use the existing resetPassword mutation");
assert.ok(teamPage.includes("setPasswordMember"), "team management should open a password change dialog for a member");
assert.ok(teamPage.includes("Change Password"), "member actions should include a Change Password action");
assert.ok(teamPage.includes("newPassword.length < 8"), "password change should enforce a minimum length");
assert.ok(teamPage.includes("newPassword !== confirmPassword"), "password change should require matching confirmation");
assert.ok(teamPage.includes("opsslate_convex_token"), "changing your own password should refresh the local session token");
assert.ok(teamPage.includes("opsslate_suite_password_managed:"), "password changes should mark the email as Suite-password managed");
assert.ok(teamPage.includes("showTeamPassword"), "password dialog should include a see password toggle");
assert.ok(teamPage.includes("showConfirmPassword"), "password dialog should include a confirm password visibility toggle");
assert.ok(authMutations.includes("export const resetPassword"), "auth backend should expose direct password reset");
