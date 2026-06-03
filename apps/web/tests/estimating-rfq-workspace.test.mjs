import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /Estimating RFQ Workspace/, "Estimating should expose the RFQ workspace");
assert.match(page, /api\.estimating\.listEstimates/, "RFQ workspace should select from estimates");
assert.match(page, /api\.estimating\.listEstimateItems/, "RFQ workspace should load estimate items");
assert.match(page, /selectedItemIds/, "RFQ workspace should support multi-item selection");
assert.match(page, /requestQuoteForItem/, "Estimator should be able to request an RFQ from a single estimate line item");
assert.match(page, /Inline RFQ Builder/, "Line-item RFQs should open inline without leaving the estimate");
assert.match(page, /RFQ Requested/, "Estimate line items should show RFQ request status");
assert.match(page, /rfqStatusForItem/, "RFQ status should be calculated for each visible estimate item");
assert.match(page, /RFQ Status:/, "RFQ status should appear inside the estimate item description area");
assert.match(page, /api\.estimating\.createRfq/, "RFQ workspace should create formal RFQ draft records");
assert.match(page, /status:\s*"draft"/, "Created RFQs should start as drafts");
assert.match(page, /api\.vendors\.create/, "RFQ workspace should add missing vendors inline");
assert.match(page, /Vendor-first comparison/, "RFQ comparison should be vendor-first");
assert.match(page, /applySelectedQuote/, "Selected quote should update estimate pricing");
assert.match(page, /api\.estimating\.updateEstimateItem/, "Awarding a quote should update the estimate item unit cost");
assert.match(page, /Pricing due date/, "RFQ builder should include a pricing due date picker");
assert.match(page, /type="date"/, "Pricing due should use a native date picker");
