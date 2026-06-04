import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const signupPage = readFileSync(join(root, "src/app/signup/page.tsx"), "utf8");
const loginForm = readFileSync(join(root, "src/components/login-form.tsx"), "utf8");

assert.ok(signupPage.includes('lockedMode="signup"'), "/signup should not let users accidentally land in sign-in mode");
assert.ok(loginForm.includes("lockedMode"), "LoginForm should support a locked signup mode");
assert.ok(loginForm.includes("Create your OpsSlate account"), "signup mode should clearly say it creates a new account");
assert.ok(loginForm.includes("Start a new company workspace"), "signup mode should explain that it creates the company workspace");
