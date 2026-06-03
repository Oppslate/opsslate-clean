import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const bidManager = readFileSync(join(process.cwd(), "convex", "bidManager.ts"), "utf8");
const docAnalyzer = readFileSync(join(process.cwd(), "convex", "docAnalyzer.ts"), "utf8");

assert.match(bidManager, /function openaiTextFromResponse/, "document Read path can parse OpenAI responses");
assert.match(bidManager, /OPENAI_API_KEY/, "document Read path can use OPENAI_API_KEY");
assert.match(bidManager, /OPENROUTER_API_KEY/, "document Read path can use OPENROUTER_API_KEY");
assert.match(bidManager, /https:\/\/api\.openai\.com\/v1\/responses/, "document Read path calls OpenAI Responses API");
assert.match(bidManager, /https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/, "document Read path calls OpenRouter chat completions");
assert.match(bidManager, /callOpenAITextFallback/, "document Read path has OpenAI text fallback");
assert.match(bidManager, /callOpenRouterTextFallback/, "document Read path has OpenRouter text fallback");
assert.match(bidManager, /if \(!apiKey && !openAiKey && !openRouterKey\)/, "document Read path does not require Anthropic when another provider exists");

assert.match(docAnalyzer, /OPENAI_API_KEY/, "document Analyze path can use OPENAI_API_KEY");
assert.match(docAnalyzer, /OPENROUTER_API_KEY/, "document Analyze path can use OPENROUTER_API_KEY");
assert.match(docAnalyzer, /callOpenAITextFallback/, "document Analyze path has OpenAI text fallback");
assert.match(docAnalyzer, /callOpenRouterTextFallback/, "document Analyze path has OpenRouter text fallback");

console.log("document read OpenAI fallback checks passed");
