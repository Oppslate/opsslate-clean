# Helios checkpoint ledger

This ledger records approved Helios milestones and their exact Git restore
points.

## Checkpoint rules

- Create a dedicated commit for each approved milestone.
- Create an annotated Git tag on the exact milestone commit.
- Record verification evidence and any preview deployment.
- Keep cockpit and feature work out of foundation checkpoints unless expressly
  approved.
- Do not move or reuse an existing checkpoint tag.

## Milestones

| Milestone | Date | Status | Commit | Git tag | Verification |
| --- | --- | --- | --- | --- | --- |
| Foundation item 2: shared OpsSlate UI and responsive Helios application boundary | 2026-07-23 | Approved and verified | `89c51ef` | `helios-foundation-item-2` | Local and Vercel production builds passed; shared-ownership drift check passed; desktop, tablet, mobile, drawer, focus, assets, and styles verified |
| Foundation item 3A: identity, session, and company authorization boundary | 2026-07-23 | Implemented and locally verified; live integration pending | `cac34c6` | Not tagged | Domain/security tests, lint, type checks, and builds passed; live issuer/tenant tests pending |

## Milestones in progress

| Milestone | Date started | Status | Pending before checkpoint |
| --- | --- | --- | --- |
| Foundation item 3B: working cockpit and secure PDF intake | 2026-07-23 | Implemented and locally verified; live integration review pending | Run isolated cross-tenant, upload, responsive, accessibility, and visual acceptance tests before approval or deployment |

### Foundation item 2 evidence

- [Foundation handoff](./HELIOS_FOUNDATION_ITEM_2.md)
- [Vercel preview](https://helios-foundation-item-2-preview-eibbhk6p2-oppslate.vercel.app)
- Vercel target: Preview
- Vercel status: Ready
- Cockpit work: Not started
