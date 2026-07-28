# Helios Foundation 3D.1 Design QA

## Target and state

- Reference: approved cockpit option 3 at `1395` pixels wide.
- Implementation: authenticated Seneca project with 18 real findings, six
  cited documents, the protected source PDF, and Foundation 3D review actions.
- Comparison evidence:
  `docs/evidence/helios-3d1-comparison.png`.

## Fidelity review

### Layout and hierarchy

- Passed: the project/status band, findings queue, live PDF, cited-page rail,
  citation/explanation panel, and decision dock are visible in one continuous
  desktop cockpit.
- Passed: document administration is secondary and collapsed after the
  cockpit.
- Passed: the implementation uses the shared OpsSlate shell and denser
  construction-workspace composition from the reference.
- Intentional boundary: estimate, pricing, RFQ, proposal, and handoff controls
  from the future-state concept remain gated instead of appearing as fake
  actions.

### Typography, spacing, color, icons, and surfaces

- Passed: typography, status colors, borders, radii, elevation, focus rings,
  inputs, selects, badges, dialogs, and buttons use shared OpsSlate tokens and
  primitives.
- Passed: Lucide icons match the established OpsSlate icon family.
- Passed: arbitrary PDF-canvas colors and custom shadow colors were removed in
  favor of shared surface and elevation utilities.
- Passed: no placeholder imagery, CSS art, custom SVG substitute, copied shell,
  duplicate CSS, or new UI library was introduced.

### Content and evidence

- Passed: project, finding, confidence, review, document, citation, page, and
  excerpt content is supplied by the protected Helios project record.
- Passed: the actual PDF is rendered through the protected content route.
- Passed: human-verification language remains visible before downstream use.

## Responsive review

| Viewport | Result |
| --- | --- |
| Desktop `1395 × 868` | Passed; queue, PDF, evidence, and decision dock appear together; no horizontal overflow |
| Tablet `1024 × 768` | Passed; header reflows, cockpit stacks coherently, drawer and controls remain usable; no horizontal overflow |
| Mobile `390 × 844` | Passed; shared drawer, stacked controls, native PDF action, practical tap targets; no horizontal overflow |

## Interaction and accessibility review

- Passed: selecting a finding updates the selected evidence and explanation.
- Passed: findings search and filters update the queue.
- Passed: document and cited-page navigation use semantic labeled controls.
- Passed: review dialogs open with labeled fields and validation.
- Passed: closing a review dialog restores focus to its triggering action.
- Passed: the mobile navigation drawer traps page scrolling while open, closes
  correctly, and restores focus to the menu trigger.
- Passed: disabled, selected, loading, warning, review, hover, and focus states
  use shared semantics.
- Passed: a clean authenticated browser load produced no page errors and no
  document-level horizontal overflow.

## Card-top visibility iteration

- Reference:
  `docs/evidence/helios-3d1-card-top-reference.png`.
- Side-by-side comparison:
  `docs/evidence/helios-3d1-card-top-comparison.png`.
- Passed at the Edge-equivalent `1908 × 915` application viewport: the cockpit
  begins at the top of the content area and the full decision dock is visible
  without page scrolling.
- Passed: Approve, Correct, Reanalyze, Supersede, and Reject are all fully
  inside the initial viewport.
- Passed: the shared milestone badge and account menu remain above the cockpit
  in a reserved header area with no control collision.
- Passed: tablet and mobile retain their normal stacked layout, account access,
  navigation drawer, and zero document-level horizontal overflow.

## Findings

- P0: none.
- P1: none.
- P2: none.

Final result: passed

---

# Helios Euclid Stage 4F Design QA

## Target and state

- Reference: the approved OpsSlate/Helios cockpit shell and three-panel
  construction workspace.
- Implementation: the authenticated Titus Culvert Civil Geometry route in its
  honest `awaiting_model` state.
- Desktop comparison evidence:
  `docs/evidence/helios-euclid-4f-source-desktop.png` and
  `docs/evidence/helios-euclid-4f-cockpit-desktop.png`.
- Responsive evidence:
  `docs/evidence/helios-euclid-4f-cockpit-tablet.png` and
  `docs/evidence/helios-euclid-4f-cockpit-mobile.png`.

## Fidelity review

- Passed: the shared OpsSlate shell, sidebar structure, page gutter, dark
  surfaces, border treatment, typography, icons, badges, and orange primary
  action remain visually consistent with the reference project cockpit.
- Passed: Civil Geometry appears as a real navigation destination and the
  project cockpit exposes a direct action without introducing a duplicate
  shell or UI library.
- Passed: the empty state is truthful and uses live project state; no geometry,
  confidence, or readiness values are fabricated.
- Passed: the available-state component follows the approved three-panel
  workflow with alignment inventory, engineering workspace, and intelligence
  rail, using shared OpsSlate primitives.

## Responsive review

| Viewport | Result |
| --- | --- |
| Desktop `1440 × 900` | Passed; shared sidebar and workspace retain the OpsSlate hierarchy with no horizontal overflow |
| Tablet `900 × 1100` | Passed; navigation becomes the shared drawer and the workspace fits the viewport with no horizontal overflow |
| Mobile `390 × 844` | Passed; header and actions stack, the empty-state card fits at `358px`, and document width equals viewport width |

## Interaction, states, and accessibility review

- Passed: project, Civil Geometry, Ask Helios, source evidence, alignment, and
  workspace-tab controls use semantic links, buttons, and tabs.
- Passed: the read-only boundary is visible; Stage 4F adds no geometry-edit,
  acceptance, quantity-publication, or export control.
- Passed: loading, awaiting, failed, available, selected, evidence, conflict,
  and limitation states are represented by the data contract.
- Passed: runtime log review found no application errors; the only browser
  warning is Clerk's expected development-key notice.

## Findings

- P0: none.
- P1: none.
- P2: none after responsive verification.

Final result: passed

---

# Helios Plan-Control Overlap Design QA

## Target and state

- Source visual truth: user-reported authenticated Titus project at
  `docs/evidence/helios-plan-control-overlap-before.png`.
- Implementation: the same authenticated Titus project after removing the
  cockpit's desktop negative top margin at
  `docs/evidence/helios-plan-control-overlap-after.png`.
- Side-by-side comparison:
  `docs/evidence/helios-plan-control-overlap-comparison.png`.
- Viewport: `1912 × 915` CSS pixels at device scale factor `1`.
- Source normalization: the `1912 × 1058` Edge screenshot was cropped to its
  `1912 × 915` application viewport by removing browser and operating-system
  chrome. The implementation capture is `1912 × 915`; no density scaling was
  applied.
- State: Revision 1 has plans and specifications, project synthesis is
  complete, no plan model exists yet, and **Build plan model** is actionable.

## Full-view comparison evidence

- Before: the cockpit was pulled upward by 80 pixels and covered the Plan
  Intelligence description and most of its primary action.
- After: Bid Basis, the complete Plan Intelligence card, and the cockpit follow
  normal document flow. The plan action is fully visible at normal zoom.
- Browser measurement confirms the **Build plan model** control is `36` pixels
  high and has `61.6` pixels of clear vertical separation before the cockpit's
  project heading.

## Focused-region comparison evidence

- The Plan Intelligence header, description, icon, orange action, border,
  radius, typography, and spacing retain the existing OpsSlate design-system
  treatment.
- The fix removes only the overlapping position behavior. It does not move,
  rename, restyle, disable, or reimplement the control.
- The project cockpit retains its bounded height, internal scrolling, three
  panels, and decision dock.

## Required fidelity surfaces

- Fonts and typography: passed; no typography classes changed.
- Spacing and layout rhythm: passed after iteration; workflow cards now have a
  consistent 16-pixel section gap and no negative overlap.
- Colors and visual tokens: passed; existing shared semantic tokens remain.
- Image quality and asset fidelity: passed; original protected PDF rendering
  and Lucide icons remain unchanged, with no new image assets or substitutes.
- Copy and content: passed; all app-specific labels and project data remain
  unchanged.

## Interaction and accessibility checks

- Passed: **Build plan model** resolves to one visible semantic button.
- Passed: the action is fully inside the viewport and is not covered by the
  cockpit.
- Passed: project headings and workflow order remain semantic and unchanged.
- Passed: no browser console errors were observed during the authenticated
  local verification.

## Comparison history

1. P1 finding: the cockpit's `xl:-mt-20` offset hid a required upstream action.
2. Fix: removed the negative top margin from both estimate and intelligence
   cockpit variants and added a regression boundary test.
3. Post-fix evidence: the aligned browser capture and DOM measurements show the
   complete action with 61.6 pixels of separation from the cockpit.

## Findings

- P0: none.
- P1: none after correction.
- P2: none.

Final result: passed

---

# Helios Cockpit 2.0 Design QA

## Target and implemented state

- Reference: approved cockpit option 3 at `1395 × 837`.
- Implementation: authenticated Seneca estimate workspace using the current
  estimate version, owner items, cost codes, resources, quantities, pricing
  status, procurement records, evidence links, risks, and decision history.
- Side-by-side comparison:
  `docs/evidence/helios-cockpit-2-comparison.png`.
- Responsive evidence:
  `docs/evidence/helios-cockpit-2-desktop.png`,
  `docs/evidence/helios-cockpit-2-tablet.png`, and
  `docs/evidence/helios-cockpit-2-mobile.png`.

## Fidelity review

### Layout, hierarchy, and workflow

- Passed: the implementation preserves the approved dense project header,
  readiness strip, prioritized left queue, dominant center work area,
  contextual right intelligence panel, and persistent decision dock.
- Passed: the requested stacked estimate intentionally replaces the mockup's
  dominant PDF reader. The center now exposes the operational hierarchy
  `section → owner item → cost code → resource` while proof remains available
  in context on the right.
- Passed: critical risks sort ahead of routine missing-price work, while the
  lane controls permit one-click isolation of scope, quantity, pricing,
  procurement, evidence, and risk work.
- Passed: the shared OpsSlate shell remains the only shell and document
  administration stays collapsed below the cockpit.

### Typography, spacing, tokens, icons, and surfaces

- Passed: the screen uses shared OpsSlate typography, semantic colors,
  borders, radii, shadows, focus rings, badges, buttons, inputs, tabs, and
  status treatments.
- Passed: compact identifiers and costs use the established monospace
  treatment; headings and action labels retain the OpsSlate hierarchy.
- Passed: Lucide remains the single icon family. No new UI library, copied
  shell, placeholder imagery, CSS art, inline SVG, or arbitrary color system
  was introduced.
- Passed after iteration: header actions no longer collide with the shared
  account control, the right context panel is not clipped, and the stacked
  estimate does not cause document-level horizontal overflow.

## Responsive review

| Viewport | Result |
| --- | --- |
| Desktop `1395 × 837` | Passed; all three panels and the decision dock are visible together with zero document-level or panel-level horizontal overflow |
| Tablet `1024 × 768` | Passed; queue and estimate share the first row, context spans the next row, panels use bounded internal scrolling, and there is zero document-level horizontal overflow |
| Mobile `390 × 844` | Passed; shared navigation becomes a drawer, header and metrics reflow, panels stack with bounded internal scrolling, controls retain practical targets, and there is zero horizontal overflow |

## Interaction, states, and accessibility review

- Passed: selecting a readiness metric filters the review queue in one click;
  browser verification confirmed Evidence changes the queue from 150 to 50
  actions and exposes its pressed state.
- Passed: selecting a review card synchronizes the estimate context, proof/risk
  tab, and decision dock without navigation.
- Passed: scope, resource, quantity, evidence, risk, RFQ, and submittal actions
  use the existing secured and audited estimate endpoints.
- Passed: semantic headings, regions, buttons, links, labels, pressed states,
  visible focus rings, loading/disabled states, and screen-reader-only input
  labels are present.
- Passed: empty proof, risk, procurement, and history contexts provide a clear
  next step without fake data or fake controls.

## Findings

- P0: none.
- P1: none.
- P2: none after desktop, tablet, and mobile fit corrections.

Final result: passed
