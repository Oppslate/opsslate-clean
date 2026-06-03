import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");

assert.match(specDNA, /export const analyzeSpecDocument/, "has analyzeSpecDocument action");
assert.match(specDNA, /Bid Requirements/, "prompt extracts bid requirements");
assert.match(specDNA, /Schedule Drivers/, "prompt extracts schedule drivers");
assert.match(specDNA, /Billing Rules/, "prompt extracts billing rules");
assert.match(specDNA, /sourceQuote/, "prompt asks for source evidence");
assert.match(specDNA, /confidence/, "prompt asks for confidence");
assert.match(specDNA, /destinationModules/, "prompt asks for destinations");
assert.match(specDNA, /ctx\.runMutation\(a\.specDNA\.createRunInternal/, "action creates a run");
assert.match(specDNA, /ctx\.runMutation\(a\.specDNA\.replaceRunItemsInternal/, "action stores extracted items");
assert.match(specDNA, /buildFallbackSpecMatrix/, "action has a no-token fallback extractor");
assert.match(specDNA, /isRecoverableAiFailure/, "action detects recoverable AI provider failures");
assert.match(specDNA, /AI provider is unavailable/, "fallback summary explains provider availability");
assert.match(specDNA, /callOpenAI/, "action has an OpenAI provider fallback");
assert.match(specDNA, /OPENAI_API_KEY/, "OpenAI fallback is controlled by OPENAI_API_KEY");
assert.match(specDNA, /https:\/\/api\.openai\.com\/v1\/responses/, "OpenAI fallback uses the Responses API");
assert.match(specDNA, /openaiTextFromResponse/, "OpenAI fallback extracts response text");
assert.match(specDNA, /callOpenRouter/, "action has an OpenRouter fallback");
assert.match(specDNA, /OPENROUTER_API_KEY/, "OpenRouter fallback is controlled by OPENROUTER_API_KEY");
assert.match(specDNA, /https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/, "OpenRouter fallback uses chat completions");

console.log("specdna extraction checks passed");
