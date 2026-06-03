import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const teamPage = readFileSync(join(root, "src/app/team/page.tsx"), "utf8");
const authContext = readFileSync(join(root, "src/lib/auth-context.tsx"), "utf8");
const teamMutations = readFileSync(join(root, "convex/team.ts"), "utf8");

assert.match(teamMutations, /export const logActivity/, "team backend should expose activity logging");
assert.match(authContext, /api\.team\.logActivity/, "authenticated sessions should log team activity");
assert.match(authContext, /action:\s*"last_active"/, "activity heartbeats should be marked as last active events");
assert.match(authContext, /window\.addEventListener\("focus", touch\)/, "returning to the app should refresh last active");
assert.match(teamPage, /formatLastActive/, "Team Management should format last active as a relative timer");
assert.match(teamPage, /lastActiveByUserId/, "Team Management should read last active entries from activity logs");
assert.match(teamPage, /setInterval.*60 \* 1000/s, "Team Management should refresh the relative timer each minute");
assert.match(teamMutations, /action\s*===\s*"last_active"/, "last active heartbeats should be handled specially");
assert.match(teamMutations, /ctx\.db\.patch\([^)]*,\s*{\s*lastActiveAt:/s, "last active heartbeats should update the team member record");
assert.match(teamMutations, /query\("teamMembers"\)[\s\S]*by_user/, "last active update should find team members by linked user id");
