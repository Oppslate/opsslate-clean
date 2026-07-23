# Helios foundation item 2 — shared application boundary

**Status:** Implemented  
**Date:** July 23, 2026  
**Scope:** Foundation only; no cockpit or workflow features

## Outcome

Helios now exists as a responsive Next.js web-application boundary in the
OpsSlate workspace. It may be deployed separately during development, while
its product identity and visual behavior come from the same versioned package
used by OpsSlate.

## Shared ownership

`@opsslate/suite-ui` version `0.2.0` is the single owner of:

- semantic tokens, dark theme, motion, and responsive shell padding
- suite toolbar implementation and active-app treatment
- AppShell frame, sidebar geometry, mobile drawer, top utility row, account
  menu, footer, and injected action slots
- UI primitives
- toast, skeleton, empty-state, and table-toolbar patterns

The former app-local primitive files, sidebar implementation, toolbar script,
feedback components, and token declarations were removed from the OpsSlate web
application.

## Application adapters

OpsSlate retains adapters for:

- authentication and login
- billing and bundle access
- OpsSlate navigation data
- notifications, command search, feedback, and account actions

Helios supplies:

- its workflow navigation model as data
- the Helios active-app identity
- environment-specific suite links

Neither application owns a copied shell, sidebar, token inventory, toolbar, or
primitive set.

## Helios boundary

`apps/helios` contains a responsive foundation verification route that proves
the shared package is being consumed. Future workflow destinations are visible
only as explicitly disabled, foundation-gated navigation items. They are not
fake controls and have no route or feature implementation.

No cockpit, document intelligence, estimating, RFQ, bid review, proposal,
handoff, OpenAI, authentication, database, or OpsSlate mutation code was
created.

## Compatibility and drift prevention

The shared package follows semantic versioning. Any change to shared tokens,
geometry, component variants, toolbar behavior, or shell behavior requires:

1. a package version change;
2. successful builds for OpsSlate and Helios;
3. the shared ownership check;
4. side-by-side visual regression review at the locked viewports.

Run the ownership check with:

```bash
npm run check:ui-boundary
```

## Foundation item 2 acceptance

- Helios is a separate responsive workspace application.
- Both applications consume `@opsslate/suite-ui`.
- Tokens and primitives have one owner.
- AppShell and sidebar visuals have one owner and accept application data
  through typed contracts.
- The suite toolbar no longer depends on an app-local public script.
- Helios contains no cockpit or product workflow implementation.
- Automated checks reject copied ownership and duplicated core tokens.
