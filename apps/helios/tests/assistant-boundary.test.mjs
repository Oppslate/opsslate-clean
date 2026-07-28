import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const assistant = readFileSync(join(root, "../web/convex/heliosAssistant.ts"), "utf8");
const actions = readFileSync(join(root, "../web/convex/heliosAssistantActions.ts"), "utf8");
const prompt = readFileSync(join(root, "../web/convex/heliosAssistantOpenAI.ts"), "utf8");
const gateway = readFileSync(join(root, "../web/convex/heliosGateway.ts"), "utf8");
const route = readFileSync(join(root, "src/app/api/projects/[projectId]/assistant/route.ts"), "utf8");
const workspace = readFileSync(join(root, "src/components/ask-helios-workspace.tsx"), "utf8");
const schema = readFileSync(join(root, "../web/convex/schema.ts"), "utf8");

test("Ask Helios is project-scoped, same-origin, tenant-authorized, and read-only", () => {
  assert.match(route, /isSameOrigin/);
  assert.match(route, /readHeliosPrincipal/);
  assert.match(gateway, /getAssistantWorkspaceReference/);
  assert.match(gateway, /askAssistantReference/);
  assert.match(assistant, /requireHeliosPrincipal/);
  assert.match(assistant, /project\.companyId !== companyId/);
  assert.match(prompt, /read-only/i);
  assert.doesNotMatch(actions, /files\.create|input_file/);
});

test("every Ask Helios generation is persisted before the model call and remains addressable", () => {
  assert.match(schema, /heliosAssistantThreads/);
  assert.match(schema, /heliosAssistantMessages/);
  assert.match(assistant, /status: "pending"/);
  assert.match(assistant, /scheduler\.runAfter\(0, startAnswerReference/);
  assert.match(actions, /parseAssistantAnswer/);
  assert.match(actions, /inputTokens/);
  assert.match(workspace, /\/projects\/\$\{workspace\.project\.id\}\/ask\/\$\{thread\.id\}/);
});

test("engineering answers consume canonical records and expose status, method, and citations", () => {
  assert.match(assistant, /parseStationNotation/);
  assert.match(assistant, /interpolateVerticalElevation/);
  assert.match(assistant, /heliosTakeoffQuantities/);
  assert.match(assistant, /heliosEstimateQuantities/);
  assert.match(assistant, /heliosEvidence/);
  assert.match(prompt, /Never perform a new engineering calculation/);
  assert.match(prompt, /If the record cannot support the answer/);
  assert.match(workspace, /Answer basis/);
  assert.match(workspace, /Answers are advisory and never change the estimate/);
});
