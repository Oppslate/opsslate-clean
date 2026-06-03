# SpecDNA Phase Two Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a project-level Spec Intelligence Command Center that summarizes action queue, coverage score, attention flags, and handoff readiness.

**Architecture:** Add a derived Convex query in `specDNA.ts`, render it with a focused React component, and mount it above the existing Spec Matrix panels on the project detail page. No new table is needed for this first Phase 2 slice.

**Tech Stack:** Convex queries, Next.js/React client component, existing UI primitives, static Node regression tests.

---

### Task 1: Command Center Contract

**Files:**
- Create: `apps/web/tests/specdna-command-center.test.mjs`
- Modify: `apps/web/convex/specDNA.ts`
- Create: `apps/web/src/components/spec-intelligence-command-center.tsx`
- Modify: `apps/web/src/app/project/[id]/page.tsx`

- [ ] Write a failing static test that checks for the Convex query, UI component, and project-page render.
- [ ] Run `node tests/specdna-command-center.test.mjs` from `apps/web` and verify it fails because the command center does not exist.
- [ ] Add `getCommandCenter` in `apps/web/convex/specDNA.ts`.
- [ ] Add `SpecIntelligenceCommandCenter` component.
- [ ] Render the component above `SpecDNAPanel`.
- [ ] Run the new test and related SpecDNA tests.
- [ ] Run `npm.cmd run build`.
- [ ] Deploy Convex and Vercel after tests pass.
