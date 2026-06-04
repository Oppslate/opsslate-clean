# Estimating Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first working bid-first Estimating Cockpit with an Estimator Command Center sidebar and move the existing RFQ workspace into an RFQ Desk tool view.

**Architecture:** Keep implementation in `apps/web/src/app/estimating/page.tsx` for the first pass because the existing RFQ workspace already lives there and uses local state. Add small helper functions/components in the same file to compute cockpit metrics, render the estimating sidebar, render cockpit panels, and preserve the RFQ workspace view.

**Tech Stack:** Next.js App Router, React client components, Convex queries/mutations, existing OpsSlate UI components.

---

### Task 1: Cockpit Data Model and Tests

**Files:**
- Modify: `apps/web/src/app/estimating/page.tsx`
- Create: `apps/web/tests/estimating-cockpit.test.mjs`

- [ ] **Step 1: Write source-level test**

Create `apps/web/tests/estimating-cockpit.test.mjs` asserting that the estimating page includes `Estimating Cockpit`, `Estimator Command Center`, `RFQ Desk`, `Predictive Bid Engine`, `Schedule Readiness`, and shared database labels.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/estimating-cockpit.test.mjs`

- [ ] **Step 3: Add cockpit helpers**

Add helper functions in `page.tsx`:
- `statusLabel`
- `estimateTotal`
- `rfqCounts`
- `scheduleReadinessScore`
- `predictiveSignalsForEstimate`

- [ ] **Step 4: Run test**

Run: `node tests/estimating-cockpit.test.mjs`

### Task 2: Estimator Command Center Sidebar

**Files:**
- Modify: `apps/web/src/app/estimating/page.tsx`

- [ ] **Step 1: Add view state**

Add `activeTool` state with default `cockpit`.

- [ ] **Step 2: Add `EstimatorCommandCenter` component**

Render sidebar items:
- Dashboard
- Estimates
- RFQ Desk
- Takeoff Handoff
- Cost Database
- Materials
- Labor
- Equipment
- Historical Bid Database
- Risk Database
- Bid War Room
- Bid Calendar
- Win/Loss Analytics
- Settings

- [ ] **Step 3: Wire sidebar clicks**

Clicking RFQ Desk renders the existing RFQ workspace content. Other tools render staged panels for first pass.

### Task 3: Cockpit Main Screen

**Files:**
- Modify: `apps/web/src/app/estimating/page.tsx`

- [ ] **Step 1: Add cockpit header**

Add Bid Command Center eyebrow, Estimating Cockpit title, tagline rotation line, search, Takeoff, War Room, New Estimate buttons.

- [ ] **Step 2: Add KPI cards**

Render total estimates, active bids, drafts, RFQs open, overdue RFQs, bid value, average bid value, win rate, schedule-readiness score, and engineer items.

- [ ] **Step 3: Add bid portfolio table**

Render estimates with project/client/status/type/total/RFQ/takeoff/schedule/risk/action columns and empty state.

- [ ] **Step 4: Add right rail**

Render Bid Pulse, Cost Database, AI Estimator, Predictive Bid Engine, and shared database health panels.

### Task 4: RFQ Desk Preservation

**Files:**
- Modify: `apps/web/src/app/estimating/page.tsx`

- [ ] **Step 1: Extract existing RFQ JSX into `RfqDeskView`**

Move current returned RFQ workspace content into a component/function that can render when `activeTool === "rfq"`.

- [ ] **Step 2: Keep all RFQ handlers/state intact**

Ensure draft creation, vendor creation, response logging, email draft, copy package, and selected quote application still use the same state and functions.

### Task 5: Verification and Deploy

**Files:**
- Modify: existing source/test files only.

- [ ] **Step 1: Run focused tests**

Run:
- `node tests/estimating-cockpit.test.mjs`
- `node tests/input-date-picker.test.mjs`
- `node tests/sidebar-project-management-heading.test.mjs`

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit --project tsconfig.json --pretty false`

- [ ] **Step 3: Production build**

Run with clean Convex env:
`$env:NEXT_PUBLIC_CONVEX_URL='https://curious-guineapig-248.convex.cloud'; $env:NEXT_PUBLIC_CONVEX_SITE_URL='https://curious-guineapig-248.convex.site'; $env:CONVEX_DEPLOYMENT='dev:curious-guineapig-248'; npm run build`

- [ ] **Step 4: Commit, deploy, push**

Commit source/test/plan/spec changes, deploy with `npx vercel deploy --prod`, push branch.
