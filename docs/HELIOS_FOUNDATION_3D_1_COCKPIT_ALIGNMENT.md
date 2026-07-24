# Helios Foundation 3D.1: Cockpit Alignment

## Outcome

Foundation 3D.1 aligns the working Helios cockpit with approved cockpit option
3 while preserving the Foundation 3C document-intelligence boundary and the
Foundation 3D human-review lifecycle.

The primary desktop view now presents one continuous estimator workspace:

1. compact project, bid, analysis, readiness, and confidence context;
2. persistent findings queue with search and review filters;
3. the protected source PDF on screen with cited-page navigation;
4. citation metadata and the selected AI explanation below the document; and
5. a persistent decision dock for estimator-controlled review actions.

The bid package and project-document administration remain available in a
collapsed support section after the cockpit. They no longer displace the
estimator's primary review task.

## Design authority

- The shared `@opsslate/suite-ui` package remains the source of shell, button,
  form, select, dialog, badge, toast, spacing, color, border, focus, and state
  behavior.
- The approved option-3 screenshot is the composition reference.
- Helios-specific treatment is limited to AI provenance, citations, confidence,
  findings, evidence, warnings, recommendations, and human review.
- No new UI library, copied shell, duplicate token set, arbitrary color, fake
  action, placeholder PDF, or disconnected mock record was added.

## Functional boundary

The visible controls are connected to the existing protected application:

- finding selection changes the cited source and AI explanation;
- search, category, and review-status filters operate on real findings;
- protected PDFs load through the existing company-scoped content route;
- approve, correct, reject, request-reanalysis, and supersede use the existing
  Foundation 3D review route;
- dialogs preserve validation, audit history, and keyboard focus;
- reanalysis uses the existing durable intelligence workflow.

Estimate creation, pricing, procurement, RFQ creation, proposal generation, and
OpsSlate handoff remain intentionally gated. The future controls shown in the
concept image were not copied as fake buttons.

## Responsive behavior

- Desktop keeps the findings queue and protected PDF visible simultaneously.
- Tablet stacks the findings queue above the evidence workspace and preserves
  all project-status and action controls without horizontal overflow.
- Mobile uses the shared navigation drawer, opens PDFs in the native browser
  reader, keeps filters usable, and stacks the decision workflow.

## Acceptance evidence

- Reference: `docs/evidence/helios-3-cockpit-reference.png`
- Desktop implementation: `docs/evidence/helios-3d1-desktop.png`
- Side-by-side comparison: `docs/evidence/helios-3d1-comparison.png`
- Tablet implementation: `docs/evidence/helios-3d1-tablet.png`
- Mobile implementation: `docs/evidence/helios-3d1-mobile.png`
- Card-top reference:
  `docs/evidence/helios-3d1-card-top-reference.png`
- Card-top implementation:
  `docs/evidence/helios-3d1-top-card-desktop.png`
- Card-top comparison:
  `docs/evidence/helios-3d1-card-top-comparison.png`
- Design QA: `design-qa.md`

## Stop point

Foundation 3D.1 changes cockpit presentation and interaction composition only.
It does not add estimate items, pricing, procurement, RFQs, proposals, handoff,
production deployment, or domain changes.
