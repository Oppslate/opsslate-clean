# OpsSlate Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the OpsSlate app family toward one GitHub repository with shared toolbar, branding, product links, bundle access, and auth/logout helpers.

**Architecture:** Use an npm-workspaces monorepo with separate deployable apps under `apps/*` and shared internal packages under `packages/*`. Keep each Vercel project pointed at its own app folder so domains and deployments remain independent.

**Tech Stack:** Next.js 16, React 19, TypeScript, npm workspaces, Vercel monorepo project settings, shared local packages using `workspace:*`.

---

## Current Inventory

The local app family lives under `D:\OpsSlate`.

| Current folder | Git repo | App type | Notes |
| --- | --- | --- | --- |
| `D:\OpsSlate\construction-app` | `darksteel-ai/construction-app` | Next.js | Main `www.opsslate.app` / Project Management app. Has the latest universal toolbar fix as uncommitted edits. |
| `D:\OpsSlate\construction-bidding-vercel` | `darksteel-ai/construction-bidding-vercel` | Static Vercel app + API functions | Estimating app. Large `index.html`, `api/*` functions, no build script. Needs special handling. |
| `D:\OpsSlate\construction-scheduler` | `darksteel-ai/construction-scheduler` | Next.js | Scheduler app. |
| `D:\OpsSlate\opsslate-books` | `darksteel-ai/opsslate-books` | Next.js | Books app. |
| `D:\OpsSlate\opsslate-takeoff` | `darksteel-ai/opsslate-takeoff` | Next.js | Takeoff app. |
| `D:\OpsSlate\ops-slate-public-works` | `darksteel-ai/ops-slate-public-works` | Next.js | Separate public works product; decide later whether it belongs in the suite monorepo. |

## Target Structure

```txt
D:\OpsSlate\opsslate-suite\
  apps\
    web\
    estimating\
    scheduler\
    books\
    takeoff\
  packages\
    suite-config\
    suite-auth\
    suite-ui\
```

## Migration Rules

- Keep production Vercel projects separate. Only change each project root directory after its app is migrated and verified.
- Commit the existing toolbar fix in `construction-app` before moving files.
- Migrate one app at a time.
- Do not merge auth systems during the first pass. First share the toolbar/config, then consolidate session logic.
- Keep Estimating as a static app initially. Do not convert it to Next.js during the monorepo migration.

---

## Task 1: Commit The Current Toolbar Fix

**Files:**
- Existing modified: `D:\OpsSlate\construction-app\src\components\suite-toolbar.tsx`
- Existing modified: `D:\OpsSlate\construction-app\src\components\suite-nav.tsx`
- Existing modified: `D:\OpsSlate\construction-app\src\components\app-shell.tsx`

- [ ] **Step 1: Verify current changed files**

Run:

```powershell
git -C D:\OpsSlate\construction-app status --short
```

Expected:

```txt
 M src/components/app-shell.tsx
 M src/components/suite-nav.tsx
 M src/components/suite-toolbar.tsx
?? docs/superpowers/plans/2026-05-08-opsslate-monorepo-migration.md
```

- [ ] **Step 2: Verify build**

Run:

```powershell
cd D:\OpsSlate\construction-app
$env:NEXT_PUBLIC_CONVEX_URL='https://sincere-duck-383.convex.cloud'
npm run build
```

Expected: Next.js build completes successfully.

- [ ] **Step 3: Commit**

Run:

```powershell
git -C D:\OpsSlate\construction-app add src/components/app-shell.tsx src/components/suite-nav.tsx src/components/suite-toolbar.tsx docs/superpowers/plans/2026-05-08-opsslate-monorepo-migration.md
git -C D:\OpsSlate\construction-app commit -m "Stabilize universal suite toolbar"
```

Expected: commit created on `main`.

---

## Task 2: Create A New Monorepo Shell

**Files:**
- Create: `D:\OpsSlate\opsslate-suite\package.json`
- Create: `D:\OpsSlate\opsslate-suite\.gitignore`
- Create: `D:\OpsSlate\opsslate-suite\README.md`
- Create: `D:\OpsSlate\opsslate-suite\apps\.gitkeep`
- Create: `D:\OpsSlate\opsslate-suite\packages\.gitkeep`

- [ ] **Step 1: Create folders**

Run:

```powershell
New-Item -ItemType Directory -Force D:\OpsSlate\opsslate-suite\apps
New-Item -ItemType Directory -Force D:\OpsSlate\opsslate-suite\packages
```

Expected: folders exist.

- [ ] **Step 2: Create root package file**

Create `D:\OpsSlate\opsslate-suite\package.json`:

```json
{
  "name": "opsslate-suite",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "dev:web": "npm run dev -w @opsslate/web",
    "dev:scheduler": "npm run dev -w @opsslate/scheduler",
    "dev:books": "npm run dev -w @opsslate/books",
    "dev:takeoff": "npm run dev -w @opsslate/takeoff"
  }
}
```

- [ ] **Step 3: Create root ignore file**

Create `D:\OpsSlate\opsslate-suite\.gitignore`:

```gitignore
node_modules
.next
out
dist
build
coverage
*.log
*.tsbuildinfo
.env
.env.*
!.env.example
.vercel
```

- [ ] **Step 4: Initialize git**

Run:

```powershell
cd D:\OpsSlate\opsslate-suite
git init
git add package.json .gitignore
git commit -m "Initialize OpsSlate suite monorepo"
```

Expected: clean git repo with one initial commit.

---

## Task 3: Create Shared Product Config Package

**Files:**
- Create: `D:\OpsSlate\opsslate-suite\packages\suite-config\package.json`
- Create: `D:\OpsSlate\opsslate-suite\packages\suite-config\src\index.ts`
- Create: `D:\OpsSlate\opsslate-suite\packages\suite-config\tsconfig.json`

- [ ] **Step 1: Create package**

Run:

```powershell
New-Item -ItemType Directory -Force D:\OpsSlate\opsslate-suite\packages\suite-config\src
```

- [ ] **Step 2: Create package manifest**

Create `D:\OpsSlate\opsslate-suite\packages\suite-config\package.json`:

```json
{
  "name": "@opsslate/suite-config",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

- [ ] **Step 3: Move suite app metadata**

Copy the app and bundle metadata from `D:\OpsSlate\construction-app\src\lib\suite-apps.ts` into `D:\OpsSlate\opsslate-suite\packages\suite-config\src\index.ts`.

Expected export names:

```ts
export type SuiteAppKey = "projectManagement" | "estimating" | "scheduler" | "books" | "takeoff" | "cad" | "crm";
export type SuiteApp = { /* same shape as current construction-app */ };
export const suiteApps: SuiteApp[] = [/* copied app list */];
export const suiteBundles = [/* copied bundle list */];
export function getSuiteAppsByKeys(keys: SuiteAppKey[]) { /* same behavior */ }
```

- [ ] **Step 4: Commit package**

Run:

```powershell
git -C D:\OpsSlate\opsslate-suite add packages/suite-config
git -C D:\OpsSlate\opsslate-suite commit -m "Add shared suite config package"
```

---

## Task 4: Create Shared UI Package For Toolbar

**Files:**
- Create: `D:\OpsSlate\opsslate-suite\packages\suite-ui\package.json`
- Create: `D:\OpsSlate\opsslate-suite\packages\suite-ui\src\SuiteToolbar.tsx`
- Create: `D:\OpsSlate\opsslate-suite\packages\suite-ui\src\index.ts`
- Create: `D:\OpsSlate\opsslate-suite\packages\suite-ui\src\types.ts`

- [ ] **Step 1: Create package folders**

Run:

```powershell
New-Item -ItemType Directory -Force D:\OpsSlate\opsslate-suite\packages\suite-ui\src
```

- [ ] **Step 2: Create package manifest**

Create `D:\OpsSlate\opsslate-suite\packages\suite-ui\package.json`:

```json
{
  "name": "@opsslate/suite-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "next": ">=16",
    "react": ">=19",
    "react-dom": ">=19"
  },
  "dependencies": {
    "@opsslate/suite-config": "workspace:*"
  }
}
```

- [ ] **Step 3: Create toolbar API**

Create `D:\OpsSlate\opsslate-suite\packages\suite-ui\src\types.ts`:

```ts
import type { SuiteAppKey } from "@opsslate/suite-config";

export type SuiteToolbarUser = {
  email?: string;
  name?: string;
} | null;

export type SuiteToolbarProps = {
  activePathname: string;
  user: SuiteToolbarUser;
  plan: string;
  showActions?: boolean;
  onLogout?: () => void;
  appUrlOverrides?: Partial<Record<SuiteAppKey, string>>;
};
```

- [ ] **Step 4: Move toolbar component**

Move the current toolbar UI from `D:\OpsSlate\construction-app\src\components\suite-toolbar.tsx` into `D:\OpsSlate\opsslate-suite\packages\suite-ui\src\SuiteToolbar.tsx`.

Required adaptation:
- Do not call `usePathname`, `useAuth`, or `useBilling` inside the package.
- Accept `activePathname`, `user`, `plan`, and `onLogout` through props.
- Keep the exact same visual layout and locked/soon behavior.

- [ ] **Step 5: Export package**

Create `D:\OpsSlate\opsslate-suite\packages\suite-ui\src\index.ts`:

```ts
export { SuiteToolbar } from "./SuiteToolbar";
export type { SuiteToolbarProps, SuiteToolbarUser } from "./types";
```

- [ ] **Step 6: Commit package**

Run:

```powershell
git -C D:\OpsSlate\opsslate-suite add packages/suite-ui
git -C D:\OpsSlate\opsslate-suite commit -m "Add shared suite toolbar package"
```

---

## Task 5: Migrate Main Web App Into Monorepo

**Files:**
- Copy from: `D:\OpsSlate\construction-app`
- Copy to: `D:\OpsSlate\opsslate-suite\apps\web`
- Modify: `D:\OpsSlate\opsslate-suite\apps\web\package.json`
- Modify: `D:\OpsSlate\opsslate-suite\apps\web\src\components\suite-toolbar.tsx`
- Modify: `D:\OpsSlate\opsslate-suite\apps\web\src\components\suite-nav.tsx`
- Modify: `D:\OpsSlate\opsslate-suite\apps\web\src\lib\suite-apps.ts`

- [ ] **Step 1: Copy app without generated folders**

Run:

```powershell
robocopy D:\OpsSlate\construction-app D:\OpsSlate\opsslate-suite\apps\web /E /XD .git node_modules .next .vercel /XF .env .env.local
if ($LASTEXITCODE -lt 8) { $global:LASTEXITCODE = 0 }
```

- [ ] **Step 2: Rename package**

Edit `D:\OpsSlate\opsslate-suite\apps\web\package.json`:

```json
{
  "name": "@opsslate/web",
  "private": true
}
```

Preserve existing dependencies and scripts. Add:

```json
"@opsslate/suite-config": "workspace:*",
"@opsslate/suite-ui": "workspace:*"
```

- [ ] **Step 3: Replace local config re-export**

Replace `D:\OpsSlate\opsslate-suite\apps\web\src\lib\suite-apps.ts` with:

```ts
export * from "@opsslate/suite-config";
```

- [ ] **Step 4: Replace local toolbar wrapper**

Update `D:\OpsSlate\opsslate-suite\apps\web\src\components\suite-toolbar.tsx` to import the package component and pass local app state:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { SuiteToolbar as SharedSuiteToolbar } from "@opsslate/suite-ui";
import { useAuth } from "@/lib/auth-context";
import { useBilling } from "@/lib/use-billing";

export function SuiteToolbar({ showActions = true }: { showActions?: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { plan } = useBilling();

  return (
    <SharedSuiteToolbar
      activePathname={pathname}
      user={user}
      plan={plan}
      showActions={showActions}
      onLogout={logout}
    />
  );
}
```

- [ ] **Step 5: Install and build**

Run:

```powershell
cd D:\OpsSlate\opsslate-suite
npm install
$env:NEXT_PUBLIC_CONVEX_URL='https://sincere-duck-383.convex.cloud'
npm run build -w @opsslate/web
```

Expected: main web app builds.

- [ ] **Step 6: Commit migrated web app**

Run:

```powershell
git -C D:\OpsSlate\opsslate-suite add apps/web package-lock.json package.json
git -C D:\OpsSlate\opsslate-suite commit -m "Migrate web app into suite monorepo"
```

---

## Task 6: Migrate Remaining Apps One At A Time

Repeat the app migration pattern in this order:

1. `construction-scheduler` -> `apps\scheduler`
2. `opsslate-books` -> `apps\books`
3. `opsslate-takeoff` -> `apps\takeoff`
4. `construction-bidding-vercel` -> `apps\estimating`

For each Next.js app:

- [ ] Copy app without `.git`, `node_modules`, `.next`, `.vercel`, and env files.
- [ ] Rename package to `@opsslate/<app>`.
- [ ] Add workspace dependencies:

```json
"@opsslate/suite-config": "workspace:*",
"@opsslate/suite-ui": "workspace:*"
```

- [ ] Replace its local toolbar with the shared toolbar wrapper.
- [ ] Run app-specific build.
- [ ] Commit after each app.

For Estimating:

- [ ] Copy static app into `apps\estimating`.
- [ ] Keep `vercel.json` functions config inside `apps\estimating`.
- [ ] Do not force it into the shared React toolbar until it is converted or wrapped.
- [ ] Create a small generated/static toolbar strategy separately if needed.

---

## Task 7: Repoint Vercel Projects

For each Vercel project, update the project root directory in Vercel:

| Domain | Vercel root directory |
| --- | --- |
| `www.opsslate.app` | `apps/web` |
| `estimating.opsslate.app` | `apps/estimating` |
| `scheduler.opsslate.app` | `apps/scheduler` |
| `books.opsslate.app` | `apps/books` |
| `takeoff.opsslate.app` | `apps/takeoff` |

Required environment variable check:

```powershell
vercel env ls
```

Each app must keep its existing production env vars before the root directory is changed.

---

## Task 8: Archive Old Repos After Production Is Verified

Do not delete old repositories immediately.

- [ ] Keep old repos read-only for at least one deployment cycle.
- [ ] Add README notice to old repos:

```md
# Archived

This app now lives in the OpsSlate suite monorepo.
```

- [ ] Archive old GitHub repos only after all production domains build from the monorepo.

---

## Verification Checklist

- [ ] `npm install` works at monorepo root.
- [ ] `npm run build -w @opsslate/web` passes.
- [ ] `npm run build -w @opsslate/scheduler` passes.
- [ ] `npm run build -w @opsslate/books` passes.
- [ ] `npm run build -w @opsslate/takeoff` passes.
- [ ] Estimating deploy works from `apps/estimating`.
- [ ] Toolbar location is identical across all apps.
- [ ] Toolbar logout appears in all logged-in apps.
- [ ] Public users see sales/splash pages.
- [ ] Logged-in users see app destinations according to bundle access.
- [ ] Existing domains keep working after Vercel root directory updates.

