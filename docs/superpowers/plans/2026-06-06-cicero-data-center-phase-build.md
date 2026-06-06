# Cicero Data Center Phase Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the suite-wide OpsSlate Data Center and Cicero memory foundation, launching first inside Estimating while preserving a path to market intelligence and predictive bid strategy.

**Architecture:** Data Center is a suite-wide intelligence module with Estimating as the first visible entry point. Cicero reads from normalized memory records, estimate items, RFQs, buyouts, actual outcomes, and later approved market sources, then returns source-linked draft actions and strategic recommendations.

**Tech Stack:** Next.js App Router, React, Convex, TypeScript, existing OpsSlate UI components, existing estimating/RFQ/buyout/prediction-memory modules.

---

## Source Doctrine

This plan implements the direction set in:

- `docs/superpowers/specs/2026-06-06-cicero-estimating-intelligence-sop.md`

Core rule:

Estimating is where users work. Data Center is where OpsSlate learns. Cicero connects the two.

## Phase Summary

### Phase 1: Data Center Foundation

**Target:** First usable version in Estimating.

**Outcome:** Users can open Data Center from Estimating, see the intelligence categories, open Estimator Memory, and verify source-linked records from estimate items, RFQs, buyouts, outcomes, and prediction runs.

### Phase 2: Internal Intelligence Wiring

**Target:** Cicero starts reading company memory automatically.

**Outcome:** Estimate pages surface source/confidence-backed signals from internal data without making silent changes.

### Phase 3: Market Intelligence Intake

**Target:** Add approved external data categories.

**Outcome:** Data Center can store and review public bid results, wage data, commodity trends, owner patterns, and regional pricing signals.

### Phase 4: Strategic Playbooks

**Target:** Cicero converts patterns into named bid strategies.

**Outcome:** Cicero recommends bid posture, qualification strategy, quote lock strategy, VE opportunities, and no-bid warnings with source trails.

### Phase 5: Predictive Engine Feedback Loop

**Target:** Cicero learns from outcomes.

**Outcome:** Prediction runs, estimator feedback, actual costs, production outcomes, awards, and losses improve future recommendations.

---

## Phase 1: Data Center Foundation

### Task 1: Add Data Center Navigation

**Files:**

- Modify: `apps/web/src/app/estimating/page.tsx`
- Modify if shared navigation exists: `apps/web/src/components/app-shell.tsx`
- Test: `apps/web/tests/data-center-navigation.test.mjs`

- [ ] **Step 1: Write the failing navigation test**

Create `apps/web/tests/data-center-navigation.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /Data Center/, "Estimating navigation should expose Data Center");
assert.match(page, /Estimator Memory/, "Data Center should include Estimator Memory");
assert.match(page, /Vendor Pricing/, "Data Center should include Vendor Pricing");
assert.match(page, /Production Rates/, "Data Center should include Production Rates");
assert.match(page, /Market Intelligence/, "Data Center should include Market Intelligence");

console.log("data center navigation checks passed");
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
cd apps/web
node tests/data-center-navigation.test.mjs
```

Expected result before implementation:

```text
AssertionError: Estimating navigation should expose Data Center
```

- [ ] **Step 3: Add the Estimating Data Center menu group**

In `apps/web/src/app/estimating/page.tsx`, add a left-side parent group named `Data Center` under the estimator command center. Move or mirror these links under it:

```ts
const DATA_CENTER_LINKS = [
  "Cost Database",
  "Material Database",
  "Labor Database",
  "Equipment Database",
  "Vendor Pricing",
  "Production Rates",
  "Historical Bid Database",
  "Risk Database",
  "Spec Requirements",
  "Estimator Memory",
  "Market Intelligence",
];
```

The first implementation may keep existing pages active while adding the Data Center group. Do not remove old routes until the new group is verified.

- [ ] **Step 4: Run the test and confirm GREEN**

Run:

```bash
cd apps/web
node tests/data-center-navigation.test.mjs
```

Expected:

```text
data center navigation checks passed
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/estimating/page.tsx apps/web/tests/data-center-navigation.test.mjs
git commit -m "Add estimating Data Center navigation"
```

### Task 2: Create Data Center Workspace Shell

**Files:**

- Modify: `apps/web/src/app/estimating/page.tsx`
- Test: `apps/web/tests/data-center-shell.test.mjs`

- [ ] **Step 1: Write the failing shell test**

Create `apps/web/tests/data-center-shell.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /function DataCenterView/, "Data Center shell should be a dedicated view component");
assert.match(page, /Company Intelligence/, "Data Center should show Company Intelligence");
assert.match(page, /Market Intelligence/, "Data Center should show Market Intelligence");
assert.match(page, /Strategic Playbooks/, "Data Center should show Strategic Playbooks");
assert.match(page, /data-center-search/, "Data Center should expose search");
assert.match(page, /data-center-detail/, "Data Center should expose a detail area");

console.log("data center shell checks passed");
```

- [ ] **Step 2: Run the test and confirm RED**

```bash
cd apps/web
node tests/data-center-shell.test.mjs
```

- [ ] **Step 3: Implement `DataCenterView`**

Add a dedicated view component that accepts:

```ts
type DataCenterCategory = {
  group: "Company Intelligence" | "Market Intelligence" | "Strategic Playbooks";
  name: string;
  description: string;
  status: "active" | "starter" | "future";
  recordCount?: number;
};
```

Render:

- Search input with `data-center-search`.
- Three category groups.
- Category cards.
- Detail panel with `data-center-detail`.
- "Open", "Review", and "Import" buttons where appropriate.

- [ ] **Step 4: Wire active tool state**

Add an active tool state value such as:

```ts
type EstimatingTool = "dashboard" | "estimate-detail" | "rfq" | "production-breakdown" | "data-center";
```

If the file already uses a broad string state, add `"data-center"` to the existing flow and route the Data Center menu item to `setActiveTool("data-center")`.

- [ ] **Step 5: Run the shell test and TypeScript**

```bash
cd apps/web
node tests/data-center-shell.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
```

Expected:

```text
data center shell checks passed
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/estimating/page.tsx apps/web/tests/data-center-shell.test.mjs
git commit -m "Create Data Center workspace shell"
```

### Task 3: Create Estimator Memory View

**Files:**

- Modify: `apps/web/src/app/estimating/page.tsx`
- Test: `apps/web/tests/estimator-memory-view.test.mjs`

- [ ] **Step 1: Write the failing memory view test**

Create `apps/web/tests/estimator-memory-view.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /function EstimatorMemoryView/, "Estimator Memory should be a dedicated view component");
assert.match(page, /Prediction Runs/, "Estimator Memory should show prediction runs");
assert.match(page, /Estimator Feedback/, "Estimator Memory should show estimator feedback");
assert.match(page, /Outcome Memory/, "Estimator Memory should show outcome memory");
assert.match(page, /Accepted Recommendations/, "Estimator Memory should show accepted recommendations");
assert.match(page, /Dismissed Recommendations/, "Estimator Memory should show dismissed recommendations");

console.log("estimator memory view checks passed");
```

- [ ] **Step 2: Run the test and confirm RED**

```bash
cd apps/web
node tests/estimator-memory-view.test.mjs
```

- [ ] **Step 3: Implement `EstimatorMemoryView`**

The first view should be read-only and include:

- Prediction Runs.
- Outcome Memory.
- Estimator Feedback.
- Accepted Recommendations.
- Dismissed Recommendations.
- Source-linked item memory.

Use existing in-page data sources first:

- `predictiveEstimatorModel`
- `predictiveSignals`
- `ciceroActionsForEstimate`
- `rfqsWithNotes`
- `estimateItems`
- `historicalEstimateItems`

- [ ] **Step 4: Add "Open Estimator Memory" from Data Center**

Inside `DataCenterView`, make the Estimator Memory category open `EstimatorMemoryView` or set a sub-tab state:

```ts
setDataCenterTab("estimator-memory");
```

- [ ] **Step 5: Run tests and TypeScript**

```bash
cd apps/web
node tests/estimator-memory-view.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/estimating/page.tsx apps/web/tests/estimator-memory-view.test.mjs
git commit -m "Add Estimator Memory view"
```

### Task 4: Normalize Data Center Record Summaries

**Files:**

- Modify: `apps/web/src/app/estimating/page.tsx`
- Test: `apps/web/tests/data-center-record-summaries.test.mjs`

- [ ] **Step 1: Write the failing record summary test**

Create `apps/web/tests/data-center-record-summaries.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /type DataCenterRecordSummary/, "Data Center should define a normalized record summary type");
assert.match(page, /sourceApp/, "Data Center records should include source app");
assert.match(page, /sourceRecordId/, "Data Center records should include source record id");
assert.match(page, /confidence/, "Data Center records should include confidence");
assert.match(page, /buildEstimatorMemoryRecords/, "Estimator memory records should be built from current bid data");
assert.match(page, /estimate_item/, "Estimate item records should be represented");
assert.match(page, /rfq_quote/, "RFQ quote records should be represented");
assert.match(page, /buyout_award/, "Buyout award records should be represented");
assert.match(page, /actual_outcome/, "Actual outcome records should be represented");

console.log("data center record summary checks passed");
```

- [ ] **Step 2: Run the test and confirm RED**

```bash
cd apps/web
node tests/data-center-record-summaries.test.mjs
```

- [ ] **Step 3: Add normalized record type**

Add:

```ts
type DataCenterRecordSummary = {
  id: string;
  sourceApp: "estimating" | "rfq" | "buyout" | "project-management" | "scheduler" | "market";
  sourceRecordId: string;
  sourceType: string;
  title: string;
  category: string;
  status: string;
  confidence: "Strong" | "Likely" | "Needs Review" | "Low";
  projectId?: string;
  estimateId?: string;
  estimateItemId?: string;
  sourceDate?: string;
  notes?: string;
};
```

- [ ] **Step 4: Add `buildEstimatorMemoryRecords`**

Create a pure helper that builds summaries from:

- Estimate items.
- RFQ line responses.
- Selected RFQ/buyout awards.
- Cicero actions.
- Actual outcome markers.

The helper should return only display records and not write data.

- [ ] **Step 5: Render records in Estimator Memory**

Show a compact table with:

- Source.
- Title.
- Category.
- Status.
- Confidence.
- Open source action.

- [ ] **Step 6: Run tests and TypeScript**

```bash
cd apps/web
node tests/data-center-record-summaries.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/estimating/page.tsx apps/web/tests/data-center-record-summaries.test.mjs
git commit -m "Normalize Data Center memory summaries"
```

---

## Phase 2: Internal Intelligence Wiring

### Task 5: Surface Source and Confidence on Cicero Actions

**Files:**

- Modify: `apps/web/src/app/estimating/page.tsx`
- Test: `apps/web/tests/cicero-source-confidence.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/cicero-source-confidence.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /CiceroSourceBadge/, "Cicero actions should show source badges");
assert.match(page, /CiceroConfidenceBadge/, "Cicero actions should show confidence badges");
assert.match(page, /Internal Fact/, "Cicero should separate internal facts");
assert.match(page, /External Market Signal/, "Cicero should reserve external market signals");
assert.match(page, /Strategic Recommendation/, "Cicero should separate recommendations");

console.log("cicero source confidence checks passed");
```

- [ ] **Step 2: Run RED**

```bash
cd apps/web
node tests/cicero-source-confidence.test.mjs
```

- [ ] **Step 3: Add source/confidence badges**

Add small reusable badges:

```tsx
function CiceroSourceBadge({ source }: { source: string }) {
  return <Badge variant="outline">{source}</Badge>;
}

function CiceroConfidenceBadge({ confidence }: { confidence: DataCenterRecordSummary["confidence"] }) {
  const tone = confidence === "Strong" ? "bg-green-500/15 text-green-200" : confidence === "Likely" ? "bg-blue-500/15 text-blue-200" : confidence === "Needs Review" ? "bg-orange-500/15 text-orange-200" : "bg-red-500/15 text-red-200";
  return <Badge className={tone}>{confidence}</Badge>;
}
```

- [ ] **Step 4: Add badges to draft action cards and memory rows**

Each recommendation row should show:

- Source type.
- Confidence.
- Whether the row is fact, signal, or strategic recommendation.

- [ ] **Step 5: Run tests and TypeScript**

```bash
cd apps/web
node tests/cicero-source-confidence.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/estimating/page.tsx apps/web/tests/cicero-source-confidence.test.mjs
git commit -m "Show Cicero source and confidence labels"
```

### Task 6: Connect Memory to Existing Convex Prediction Tables

**Files:**

- Modify: `apps/web/convex/estimatePredictionMemory.ts`
- Modify: `apps/web/convex/schema.ts`
- Modify: `apps/web/src/app/estimating/page.tsx`
- Test: `apps/web/tests/estimate-prediction-memory.test.mjs`

- [ ] **Step 1: Extend the existing test**

Add assertions to `apps/web/tests/estimate-prediction-memory.test.mjs`:

```js
assert.match(memory, /listPredictionRuns/, "Prediction memory should list prediction runs");
assert.match(memory, /listOutcomeMemory/, "Prediction memory should list outcome memory");
assert.match(memory, /listEstimatorFeedback/, "Prediction memory should list estimator feedback");
assert.match(page, /api\.estimatePredictionMemory\.listPredictionRuns/, "Estimating should query prediction runs for memory");
assert.match(page, /api\.estimatePredictionMemory\.listOutcomeMemory/, "Estimating should query outcome memory for memory");
```

- [ ] **Step 2: Run RED**

```bash
cd apps/web
node tests/estimate-prediction-memory.test.mjs
```

- [ ] **Step 3: Add read queries**

In `apps/web/convex/estimatePredictionMemory.ts`, add read-only queries:

```ts
export const listPredictionRuns = query({
  args: { companyId: v.id("companies"), estimateId: v.optional(v.id("estimates")) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("estimatePredictionRuns").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    return args.estimateId ? rows.filter((row) => row.estimateId === args.estimateId) : rows;
  },
});
```

Repeat the same pattern for:

- `listOutcomeMemory`.
- `listEstimatorFeedback`.

- [ ] **Step 4: Query memory in Estimating**

Use `useQuery` calls guarded by user/company:

```ts
const predictionRuns = useQuery(api.estimatePredictionMemory.listPredictionRuns, user?.companyId ? { companyId: user.companyId, estimateId: selectedEstimate?._id as Id<"estimates"> | undefined } : "skip");
```

Render these in Estimator Memory.

- [ ] **Step 5: Run tests, TypeScript, and Convex sync**

```bash
cd apps/web
node tests/estimate-prediction-memory.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
npx convex dev --once
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/convex/estimatePredictionMemory.ts apps/web/convex/schema.ts apps/web/src/app/estimating/page.tsx apps/web/tests/estimate-prediction-memory.test.mjs
git commit -m "Expose prediction memory in Data Center"
```

---

## Phase 3: Market Intelligence Intake

### Task 7: Add Market Intelligence Schema

**Files:**

- Modify: `apps/web/convex/schema.ts`
- Create: `apps/web/convex/marketIntelligence.ts`
- Test: `apps/web/tests/market-intelligence-schema.test.mjs`

- [ ] **Step 1: Write failing schema test**

Create `apps/web/tests/market-intelligence-schema.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const schema = readFileSync(join(root, "convex/schema.ts"), "utf8");
const market = readFileSync(join(root, "convex/marketIntelligence.ts"), "utf8");

assert.match(schema, /marketIntelligenceRecords/, "Schema should include market intelligence records");
assert.match(schema, /sourceUrl/, "Market records should include source URL");
assert.match(schema, /region/, "Market records should include region");
assert.match(schema, /ownerAgency/, "Market records should include owner or agency");
assert.match(schema, /refreshDate/, "Market records should include refresh date");
assert.match(market, /createMarketRecord/, "Market module should create market records");
assert.match(market, /listMarketRecords/, "Market module should list market records");

console.log("market intelligence schema checks passed");
```

- [ ] **Step 2: Run RED**

```bash
cd apps/web
node tests/market-intelligence-schema.test.mjs
```

- [ ] **Step 3: Add table**

In `schema.ts`, add:

```ts
marketIntelligenceRecords: defineTable({
  companyId: v.id("companies"),
  sourceName: v.string(),
  sourceType: v.string(),
  sourceUrl: v.optional(v.string()),
  sourceFileId: v.optional(v.string()),
  collectedAt: v.string(),
  refreshDate: v.optional(v.string()),
  region: v.optional(v.string()),
  ownerAgency: v.optional(v.string()),
  workCategory: v.optional(v.string()),
  title: v.string(),
  summary: v.string(),
  unit: v.optional(v.string()),
  unitCost: v.optional(v.number()),
  totalCost: v.optional(v.number()),
  confidence: v.string(),
  status: v.string(),
  notes: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
}).index("by_company", ["companyId"])
  .index("by_source_type", ["companyId", "sourceType"])
  .index("by_region", ["companyId", "region"]),
```

- [ ] **Step 4: Add Convex functions**

Create `apps/web/convex/marketIntelligence.ts` with:

- `listMarketRecords`.
- `createMarketRecord`.
- `updateMarketRecord`.
- `removeMarketRecord`.

- [ ] **Step 5: Run test and Convex sync**

```bash
cd apps/web
node tests/market-intelligence-schema.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
npx convex dev --once
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/convex/schema.ts apps/web/convex/marketIntelligence.ts apps/web/tests/market-intelligence-schema.test.mjs
git commit -m "Add market intelligence records"
```

### Task 8: Add Market Intelligence Read-Only UI

**Files:**

- Modify: `apps/web/src/app/estimating/page.tsx`
- Test: `apps/web/tests/market-intelligence-ui.test.mjs`

- [ ] **Step 1: Write failing UI test**

Create `apps/web/tests/market-intelligence-ui.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /function MarketIntelligenceView/, "Market Intelligence should have a read-only view");
assert.match(page, /Public Bid Results/, "Market Intelligence should include public bid results");
assert.match(page, /Prevailing Wage/, "Market Intelligence should include prevailing wage");
assert.match(page, /Commodity Indexes/, "Market Intelligence should include commodities");
assert.match(page, /Owner Procurement History/, "Market Intelligence should include owner history");

console.log("market intelligence UI checks passed");
```

- [ ] **Step 2: Run RED**

```bash
cd apps/web
node tests/market-intelligence-ui.test.mjs
```

- [ ] **Step 3: Implement read-only view**

Add `MarketIntelligenceView` with:

- Category filters.
- Source cards.
- Search.
- Record table.
- Confidence badge.
- Refresh date.
- Source URL button.

- [ ] **Step 4: Add to Data Center tab routing**

Clicking the Market Intelligence card opens `MarketIntelligenceView`.

- [ ] **Step 5: Run tests**

```bash
cd apps/web
node tests/market-intelligence-ui.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/estimating/page.tsx apps/web/tests/market-intelligence-ui.test.mjs
git commit -m "Add market intelligence read-only view"
```

---

## Phase 4: Strategic Playbooks

### Task 9: Add Strategic Playbook Types and UI

**Files:**

- Modify: `apps/web/src/app/estimating/page.tsx`
- Test: `apps/web/tests/strategic-playbooks.test.mjs`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/strategic-playbooks.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");

assert.match(page, /type StrategicPlaybook/, "Strategic playbooks should have a typed model");
assert.match(page, /Fast Strike Bid/, "Fast Strike Bid should exist");
assert.match(page, /Margin Defense Bid/, "Margin Defense Bid should exist");
assert.match(page, /Quote Lock Strategy/, "Quote Lock Strategy should exist");
assert.match(page, /Schedule Compression Trap/, "Schedule Compression Trap should exist");
assert.match(page, /Spec Gap Exposure/, "Spec Gap Exposure should exist");

console.log("strategic playbook checks passed");
```

- [ ] **Step 2: Run RED**

```bash
cd apps/web
node tests/strategic-playbooks.test.mjs
```

- [ ] **Step 3: Add `StrategicPlaybook` type**

Add:

```ts
type StrategicPlaybook = {
  name: string;
  trigger: string;
  recommendedAction: string;
  riskLevel: "Low" | "Medium" | "High";
  confidence: DataCenterRecordSummary["confidence"];
  sourceMix: "Company" | "Market" | "Mixed";
};
```

- [ ] **Step 4: Add starter playbooks**

Add starter records:

- Fast Strike Bid.
- Margin Defense Bid.
- Market Dip Opportunity.
- Quote Lock Strategy.
- Owner Drag Risk.
- Schedule Compression Trap.
- Spec Gap Exposure.
- Commodity Escalation Watch.
- Labor Availability Watch.
- VE Opportunity.
- No-Bid Warning.

- [ ] **Step 5: Render playbooks in Data Center**

Show:

- Name.
- Trigger.
- Recommended action.
- Risk level.
- Confidence.
- Source mix.

- [ ] **Step 6: Run tests and TypeScript**

```bash
cd apps/web
node tests/strategic-playbooks.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/estimating/page.tsx apps/web/tests/strategic-playbooks.test.mjs
git commit -m "Add strategic playbook starter library"
```

---

## Phase 5: Predictive Engine Feedback Loop

### Task 10: Track Recommendation Outcomes

**Files:**

- Modify: `apps/web/convex/estimatePredictionMemory.ts`
- Modify: `apps/web/src/app/estimating/page.tsx`
- Test: `apps/web/tests/cicero-recommendation-outcomes.test.mjs`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/cicero-recommendation-outcomes.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");
const memory = readFileSync(join(root, "convex/estimatePredictionMemory.ts"), "utf8");

assert.match(page, /Approve Recommendation/, "Cicero recommendations should be approvable");
assert.match(page, /Dismiss Recommendation/, "Cicero recommendations should be dismissible");
assert.match(page, /Learning Note/, "Dismissals should capture learning notes");
assert.match(memory, /recordPredictionFeedback/, "Prediction feedback should be recorded");
assert.match(memory, /accepted|dismissed/, "Feedback should distinguish accepted and dismissed actions");

console.log("cicero recommendation outcome checks passed");
```

- [ ] **Step 2: Run RED**

```bash
cd apps/web
node tests/cicero-recommendation-outcomes.test.mjs
```

- [ ] **Step 3: Add feedback write path**

Use the existing `predictionFeedback` table or add a mutation that records:

- Prediction run ID.
- Recommendation ID.
- Feedback type.
- Reason.
- Learning note.
- User ID.
- Created date.

- [ ] **Step 4: Wire approve/dismiss actions**

For each draft action:

- Approve creates the intended draft object where applicable.
- Dismiss opens a modal with reason and learning note.
- Both write feedback to memory.

- [ ] **Step 5: Run tests and TypeScript**

```bash
cd apps/web
node tests/cicero-recommendation-outcomes.test.mjs
npx tsc --noEmit --project tsconfig.json --pretty false
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/convex/estimatePredictionMemory.ts apps/web/src/app/estimating/page.tsx apps/web/tests/cicero-recommendation-outcomes.test.mjs
git commit -m "Track Cicero recommendation outcomes"
```

---

## Deployment and Verification

After each completed phase:

- [ ] Run focused tests created in the phase.
- [ ] Run existing estimating tests:

```bash
cd apps/web
node tests/estimating-buyout-history-links.test.mjs
node tests/estimating-rfq-workspace.test.mjs
node tests/estimate-prediction-memory.test.mjs
node tests/estimating-cockpit.test.mjs
node tests/estimating-company-history.test.mjs
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit --project tsconfig.json --pretty false
```

- [ ] Build production:

```bash
$env:NEXT_PUBLIC_CONVEX_URL='https://curious-guineapig-248.convex.cloud'
$env:NEXT_PUBLIC_CONVEX_SITE_URL='https://curious-guineapig-248.convex.site'
$env:CONVEX_DEPLOYMENT='dev:curious-guineapig-248'
npm run build
```

- [ ] Sync Convex when schema/functions change:

```bash
npx convex dev --once
```

- [ ] Deploy to the clean OpsSlate Vercel project:

```bash
npx vercel deploy --prod --yes
```

- [ ] Verify live health:

```bash
Invoke-WebRequest -Uri 'https://opsslate-clean-web-seven.vercel.app/api/health/convex' -UseBasicParsing
```

Expected Convex:

```json
{
  "ok": true,
  "convexUrl": "https://curious-guineapig-248.convex.cloud",
  "siteUrl": "https://curious-guineapig-248.convex.site",
  "deployment": "dev:curious-guineapig-248"
}
```

## Guardrails

- Do not use Darksteel Vercel.
- Do not use `sincere-duck`.
- Do not use local Convex for OpsSlate clean.
- Do not silently change estimates from Cicero recommendations.
- Do not add more main left-menu database clutter.
- Do not create duplicate memory records when an existing source record can be linked.
- Keep recommendations as draft actions until approved.
- Preserve user-entered estimate data.
- Leave unrelated dirty files alone.

## First Implementation Recommendation

Start with Phase 1 only:

1. Data Center navigation.
2. Data Center shell.
3. Estimator Memory view.
4. Normalized memory summaries.

This gives Cicero a home before adding external market feeds or strategic automation.
