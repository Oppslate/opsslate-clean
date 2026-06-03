# SpecDNA Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable SpecDNA workflow: upload/select a spec PDF on a project, extract a draft obligation matrix, review items by category, and commit approved tasks/submittals into the PM app.

**Architecture:** Add two Convex tables, one node action for extraction, mutations for review/commit, and a focused React component embedded in the project detail page. Phase one stores schedule, billing, bid, scope, and risk intelligence as SpecDNA records while creating real downstream records only for tasks and submittals.

**Tech Stack:** Next.js App Router, React, TypeScript, Convex queries/mutations/actions, existing document storage, Anthropic API pattern from `submittalScanner.ts`, existing `tasks` and `submittals` modules.

---

### Task 1: Add SpecDNA Schema And Mutations

**Files:**
- Modify: `apps/web/convex/schema.ts`
- Create: `apps/web/convex/specDNA.ts`
- Test: `apps/web/tests/specdna-schema.test.mjs`

- [ ] **Step 1: Write the failing schema test**

Create `apps/web/tests/specdna-schema.test.mjs`:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");

assert.match(schema, /specIntakeRuns:\s*defineTable/, "schema defines spec intake runs");
assert.match(schema, /specIntelligenceItems:\s*defineTable/, "schema defines spec intelligence items");
assert.match(schema, /category:\s*v\.string\(\)/, "items store category");
assert.match(schema, /destinationModules:\s*v\.optional\(v\.array\(v\.string\(\)\)\)/, "items store destination modules");
assert.match(specDNA, /export const listRuns/, "specDNA exposes listRuns");
assert.match(specDNA, /export const listItems/, "specDNA exposes listItems");
assert.match(specDNA, /export const updateItemStatus/, "specDNA exposes updateItemStatus");
assert.match(specDNA, /export const commitApproved/, "specDNA exposes commitApproved");

console.log("specdna schema checks passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/specdna-schema.test.mjs` from `apps/web`.

Expected: fail because `convex/specDNA.ts` does not exist.

- [ ] **Step 3: Add schema tables**

Add `specIntakeRuns` and `specIntelligenceItems` near the existing PM/document tables in `apps/web/convex/schema.ts`.

- [ ] **Step 4: Add mutations and queries**

Create `apps/web/convex/specDNA.ts` with:

- `listRuns`
- `listItems`
- `updateItemStatus`
- `updateItem`
- `commitApproved`

`commitApproved` must be idempotent by skipping items that already have `createdRecordId`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/specdna-schema.test.mjs` from `apps/web`.

Expected: pass with `specdna schema checks passed`.

### Task 2: Add SpecDNA Extraction Action

**Files:**
- Modify: `apps/web/convex/specDNA.ts`
- Test: `apps/web/tests/specdna-extraction.test.mjs`

- [ ] **Step 1: Write extraction structure test**

Create `apps/web/tests/specdna-extraction.test.mjs`:

```js
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

console.log("specdna extraction checks passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/specdna-extraction.test.mjs` from `apps/web`.

Expected: fail until the action is added.

- [ ] **Step 3: Implement action**

Add `analyzeSpecDocument` to `apps/web/convex/specDNA.ts`. It should:

- Load the document by ID using `docManager.getById`.
- Fetch the stored file.
- Extract readable text using the existing text/PDF fallback approach from `submittalScanner.ts`.
- Call Anthropic with a prompt that returns JSON `{ summary, items }`.
- Store the run and items.
- Mark failed runs as failed with an error message.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/specdna-extraction.test.mjs` from `apps/web`.

Expected: pass with `specdna extraction checks passed`.

### Task 3: Add SpecDNA Project UI

**Files:**
- Create: `apps/web/src/components/spec-dna-panel.tsx`
- Modify: `apps/web/src/app/project/[id]/page.tsx`
- Test: `apps/web/tests/specdna-ui.test.mjs`

- [ ] **Step 1: Write UI structure test**

Create `apps/web/tests/specdna-ui.test.mjs`:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(panel, /SpecDNA/, "panel uses SpecDNA name");
assert.match(panel, /analyzeSpecDocument/, "panel can run analysis");
assert.match(panel, /commitApproved/, "panel can commit approved items");
assert.match(panel, /Bid Requirements/, "panel shows bid requirements tab");
assert.match(panel, /Submittals/, "panel shows submittals tab");
assert.match(panel, /Schedule/, "panel shows schedule tab");
assert.match(panel, /Billing/, "panel shows billing tab");
assert.match(projectPage, /SpecDNAPanel/, "project page renders SpecDNAPanel");

console.log("specdna UI checks passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/specdna-ui.test.mjs` from `apps/web`.

Expected: fail until the component exists and project page imports it.

- [ ] **Step 3: Build the panel**

Create `SpecDNAPanel` with:

- Project document picker filtered to likely specs.
- Run button.
- Latest run summary.
- Category tabs.
- Item rows with confidence, source section/page, destinations, and status.
- Approve/reject buttons.
- Commit approved button.

- [ ] **Step 4: Embed the panel**

Import and render `SpecDNAPanel` on `apps/web/src/app/project/[id]/page.tsx`, near existing PM project tools/tabs.

- [ ] **Step 5: Run UI test**

Run: `node tests/specdna-ui.test.mjs` from `apps/web`.

Expected: pass with `specdna UI checks passed`.

### Task 4: Verify And Play Locally

**Files:**
- No new files.

- [ ] **Step 1: Run SpecDNA tests**

Run from `apps/web`:

```powershell
node tests/specdna-schema.test.mjs
node tests/specdna-extraction.test.mjs
node tests/specdna-ui.test.mjs
```

Expected: all pass.

- [ ] **Step 2: Run existing relevant tests**

Run from `apps/web`:

```powershell
node tests/project-details-edit.test.mjs
```

Expected: pass or report existing unrelated failure.

- [ ] **Step 3: Start local dev server**

Run from repo root:

```powershell
npm run dev
```

Expected: Next.js local app starts, usually on `http://localhost:3000`.

- [ ] **Step 4: Open a project and test the panel**

Open a project detail page, upload/select a spec document, run SpecDNA, review items, approve at least one task and one submittal, commit approved, and confirm the task/submittal appears in the project.

