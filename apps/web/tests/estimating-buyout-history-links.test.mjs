import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");
const schema = readFileSync(join(root, "convex/schema.ts"), "utf8");
const buyout = readFileSync(join(root, "convex/buyout.ts"), "utf8");

for (const field of [
  "estimateId: v.optional(v.id(\"estimates\"))",
  "estimateItemId: v.optional(v.id(\"estimateItems\"))",
  "sourceRfqId: v.optional(v.string())",
  "sourceQuoteId: v.optional(v.string())",
]) {
  assert.match(schema, new RegExp(field.replace(/[()]/g, "\\$&")), `buyout schema should support ${field}`);
}

assert.match(schema, /\.index\("by_estimate_item"/, "buyout items should be queryable by estimate item");
assert.match(buyout, /estimateItemId:\s*v\.optional\(v\.id\("estimateItems"\)\)/, "buyout mutations should accept estimate item links");
assert.match(buyout, /sourceRfqId:\s*v\.optional\(v\.string\(\)\)/, "buyout mutations should accept RFQ source links");
assert.match(buyout, /sourceQuoteId:\s*v\.optional\(v\.string\(\)\)/, "buyout mutations should accept quote source links");
assert.match(buyout, /listItemsByEstimateItem/, "buyout module should expose item-level buyout history");

assert.match(page, /type BuyoutLinkSummary/, "estimating page should model item buyout link summaries");
assert.match(page, /buyoutLinksForItem/, "estimating page should collect quote and award history for each item");
assert.match(page, /Quote History/, "estimate line items should show quote history");
assert.match(page, /Buyout Award/, "estimate line items should show buyout award status");
assert.match(page, /api\.buyout\.createItem/, "applying a selected quote should create a buyout item when linked to a project");
assert.match(page, /api\.buyout\.createQuote/, "applying a selected quote should create buyout quote history");
assert.match(page, /recordEstimateOutcome\(\{[\s\S]*outcomeType:\s*"estimate_item_buyout_award"/, "awarding a quote should persist buyout outcome memory");
assert.match(page, /sourceRfqId:\s*String\(rfq\._id\)/, "buyout item should link back to RFQ");
assert.match(page, /sourceQuoteId:\s*buyoutQuoteId \? String\(buyoutQuoteId\) : undefined/, "buyout item should link to the created quote");

console.log("estimating buyout history link checks passed");
