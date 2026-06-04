# Estimating Cockpit and Estimator Command Center Design

## Goal

Make `/estimating` a bid-first Estimating Cockpit. The estimator should land on the work that wins or loses money: active bids, draft estimates, RFQ exposure, takeoff handoff, cost confidence, risk, bid calendar pressure, and schedule-readiness.

The current RFQ workspace remains valuable, but it becomes a tool inside the estimating app instead of the app's main screen.

## Product Position

Estimating is the front end of the business. Project management, scheduling, books, and field execution all inherit the consequences of the estimate. The cockpit should help the estimator see omissions, pressure points, stale pricing, RFQ gaps, risk language, and schedule impacts while the bid is being built.

The design is bid-first, with project context attached to each bid. The user should not have to enter Project Management to understand what project a bid belongs to, who the client is, what project information is available, or what data can be handed to scheduling later.

## Primary Navigation

The estimating app gets its own left sidebar called **Estimator Command Center**. It should match the dark OpsSlate style shown in the reference image, but use estimating-specific destinations.

Initial sidebar items:

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

Shared database tools should be designed as reusable destinations because Materials, Labor, Equipment, Historical Bid Database, and Risk Database will eventually appear in other app side menus as well.

## Main Cockpit

`/estimating` renders the cockpit as the first screen.

Top toolbar:

- Takeoff
- War Room
- New Estimate
- Search estimates, clients, scopes

Hero/header:

- Eyebrow: `Bid Command Center`
- Title: `Estimating Cockpit`
- Subtitle: `Pipeline, bid day risk, cost database health, and takeoff handoff in one screen.`

KPI cards:

- Total estimates
- Active bids
- Drafts needing review
- Bid value
- RFQs open
- RFQs overdue
- Average bid value
- Win rate
- Engineer items / estimate checks
- Schedule-readiness score

Main bid portfolio table:

- Bid / estimate name
- Project
- Client / owner
- Bid date
- Status
- Type
- Total
- RFQ status
- Takeoff status
- Schedule alignment
- Risk level
- Action

Empty state:

- Clear prompt to create the first estimate.
- Secondary prompt to import from project/takeoff when available.

Right rail:

- Bid Pulse
- RFQs needing action
- Cost Database health
- AI Estimator action queue
- Risk alerts
- Schedule handoff readiness

## RFQ Desk

The current RFQ workspace moves into an `RFQ Desk` tool. It should retain:

- Multi-item RFQs
- Vendor-first workflow
- Vendor directory integration
- Inline vendor creation
- Pricing due date
- Signature/letterhead support
- Draft RFQ records
- Quote response logging
- Quote comparison
- Missing detail flags
- Push selected pricing back into estimate items

The cockpit should summarize RFQ exposure but not replace the RFQ Desk.

## Project Management Data Pull

Estimating must be able to pull project information from the Project Management app:

- Project name
- Project code
- Address
- Owner/client
- Contractor
- Project manager
- Project role
- Project type
- Status
- Start/end/bid dates
- Contract value when applicable

The estimate should store enough project context to remain understandable if the project record changes later, but it should also keep a link to the live project record.

## Shared Database Tools

The following tools should be shared app-level databases:

- Materials cost database
- Labor cost database
- Equipment cost database
- Historical bid database
- Risk database

Estimating should consume these databases first. Later, Project Management, Scheduling, Books, Takeoff, and other tools can reuse them.

Initial cockpit behavior:

- Show basic health counts for shared cost databases.
- Surface stale/missing pricing signals.
- Keep sidebar entries available even if the first implementation is a staged placeholder.

## Schedule Alignment

The estimate must speak the same language as the scheduling app so the estimate can populate a schedule when prompted.

Mapping rules:

- Estimate section maps to schedule phase or work package.
- Estimate line item maps to schedule task/activity.
- Estimate milestone maps to scheduler milestone.
- RFQ lead time maps to procurement constraint.
- Risk and requirement language maps to schedule constraint or risk item.

Estimate records should capture:

- Phase
- Work package
- Milestone
- Duration
- Crew/equipment needs
- Procurement lead time
- Dependency notes
- Schedule handoff status

The cockpit should show a schedule-readiness score so the estimator knows whether the bid can cleanly become a project schedule.

## AI Estimator Moonshot

The cockpit should feel like another estimator is reviewing the bid.

Initial AI Estimator signals:

- Empty bid sections
- RFQs not requested for material-heavy items
- Missing takeoff proof
- Missing spec proof
- Line items not tied to a project or schedule phase
- Stale or missing cost database pricing
- Risk database matches
- Bid due soon with unresolved actions
- Schedule handoff gaps

The AI Estimator should create draft actions, not silently change the bid. Each action should support:

- Review
- Create
- Dismiss
- Dismiss reason / learning note

## North Star: Estimating As The Money Room

The long-term cockpit should not simply report what the estimator typed. It should actively hunt for money, risk, omissions, bad assumptions, weak coverage, pricing drift, and schedule pain before bid day.

This is the "holy crap, I wish I had this 20 years ago" layer. The estimator should feel like OpsSlate is sitting beside them with twenty years of bid memory, every spec section open, vendor behavior tracked, unit prices in context, and a second set of eyes looking for the thing that will cost the company money.

Moonshot modules:

- **Bid Day Mission Control**: countdown view for bid due time, open RFQs, missing alternates, unresolved exclusions, addenda status, bonding/insurance requirements, and final review checklist.
- **AI Red Team Review**: an adversarial review pass that tries to break the bid. It asks: what did we forget, what scope is vague, what spec language can hurt us, what item is underpriced, what item needs qualification?
- **Scope Radar**: detects estimate sections with no line items, line items with no spec/takeoff proof, repeated vague descriptions, and likely missing companion work.
- **Spec Hunter**: ties each estimate item back to spec sections, submittals, testing, installation, products, accepted materials, and closeout requirements.
- **RFQ Exposure Map**: shows which costs are locked, guessed, historical, stale, or waiting on vendors.
- **Vendor Intelligence**: tracks vendor quote history, responsiveness, pricing reliability, exclusions, missed details, and best-fit supplier/sub suggestions.
- **Substitution / Value Engineering Scout**: suggests lower-cost alternates, substitutions, supplier options, and VE ideas, but always as draft recommendations requiring estimator approval.
- **Historical Bid Analog Finder**: compares the current bid to similar past bids by owner, location, scope, spec section, unit price, margin, win/loss result, and risk language.
- **Margin Defense**: flags lines where the spread between estimate, RFQ, historical pricing, and risk exposure suggests the margin is too thin.
- **Schedule Twin**: builds a draft schedule model from bid sections, phases, lead times, milestones, procurement constraints, and crew logic before the job is won.
- **Procurement Clock**: highlights long-lead materials, RFQ lead times, submittal durations, fabrication windows, and critical procurement decisions.
- **Addenda Watch**: tracks addenda status and flags estimate lines/spec sections likely affected by new documents.
- **Qualification Builder**: turns risk, exclusions, assumptions, RFQ gaps, spec conflicts, and schedule constraints into clean bid qualifications.
- **Bid Confidence Score**: rolls scope coverage, RFQ coverage, cost confidence, spec proof, takeoff proof, risk review, and schedule-readiness into one score.
- **Estimator Memory**: learns from dismissed AI actions, selected vendors, accepted unit prices, exclusions, win/loss outcomes, and company preferences.

These modules should begin as cockpit panels and draft action generators, not autonomous bid changes. The estimator remains in control.

## Million Dollar Plan

The system should be designed around the reality that one missed scope item, bad production assumption, wrong vendor number, or unqualified spec requirement can wipe out the profit on a job. The cockpit's job is to protect the bid before it becomes a contract.

Million-dollar capabilities:

- **Omission Insurance**: every bid section must answer: priced, excluded, by others, owner supplied, alternate, or not applicable. Nothing just disappears.
- **Scope Collision Detector**: finds where two sections overlap, duplicate, contradict, or leave a gap between trades.
- **Spec-to-Dollar Extractor**: reads spec requirements and turns hidden cost language into draft estimate actions: testing, submittals, mockups, warranties, closeout, bonds, permits, inspections, working hours, phasing, traffic control, temporary controls, and cleanup.
- **Unit Price Lie Detector**: compares current line pricing against company history, vendor quotes, cost database, recent bids, and production assumptions. It should flag prices that look too low, too high, or unsupported.
- **Production Reality Check**: asks whether the crew, equipment, access, weather, work hours, and site constraints make the production rate believable.
- **Bid Qualification Autopilot**: drafts qualifications from unresolved risk, assumptions, exclusions, substitutions, lead times, phasing conflicts, and RFQ gaps.
- **Vendor Spread Intelligence**: compares vendor responses and highlights suspicious spreads, missing details, unusually low quotes, exclusions, freight/tax gaps, and quote expiration risk.
- **Lead-Time Shock Alarm**: flags materials or equipment that can win the bid but break the schedule after award.
- **Addenda Impact Diff**: detects whether addenda changed drawings/specs tied to already-priced items and creates review actions.
- **Owner / Agency Pattern Memory**: remembers how owners, agencies, engineers, or GCs tend to structure risk, alternates, paperwork, payment, MWBE, bonding, and field constraints.
- **Bid Margin War Room**: shows where margin is protected, where it is exposed, and which numbers are placeholders.
- **Win Strategy Advisor**: suggests where to sharpen, qualify, VE, request pricing, hold margin, or take a strategic position.
- **Handoff Contract**: the bid cannot leave estimating without a clean package for PM, Scheduler, Books, and Field Ops: scope, assumptions, exclusions, RFQs, risks, lead times, schedule map, cost basis, and decision history.

The million-dollar principle: the app should not only help create an estimate; it should help defend the company from living with a bad estimate.

## Predictive Bid Engine

The secret sauce is prediction. Anyone can perform a takeoff, apply unit costs, and calculate markup. OpsSlate should help predict whether the bid is positioned to win, whether the number is believable, where margin is fragile, and what hidden conditions could change the outcome.

The Predictive Bid Engine should combine:

- Current estimate data
- Takeoff quantities
- Spec requirements
- RFQ responses
- Vendor behavior
- Historical bid results
- Historical unit prices
- Labor/equipment/material cost databases
- Project location
- Project type
- Owner/client/agency history
- Schedule and lead-time pressure
- Risk database matches
- Weather/seasonality when relevant
- Addenda and document changes
- Estimator decisions and dismissals

Primary predictions:

- **Win Probability**: likelihood the bid is competitively positioned based on owner, scope, market, estimate value, competition pattern, and historical outcomes.
- **Margin Confidence**: likelihood the estimate margin survives after RFQs, production, schedule, exclusions, and risk are considered.
- **Omission Probability**: likelihood the bid is missing scope based on spec sections, estimate sections, takeoff proof, and historical scope patterns.
- **RFQ Exposure**: how much of the bid is still vendor-dependent, stale, placeholder, or unsupported.
- **Production Confidence**: likelihood labor/equipment assumptions are realistic for the work, location, schedule, and constraints.
- **Schedule Impact Probability**: likelihood the estimate contains lead-time, phasing, access, milestone, or sequencing issues that will affect execution.
- **Qualification Need**: whether unresolved assumptions should become bid qualifications.
- **Bid Volatility**: how sensitive the total is to material price shifts, vendor spread, labor productivity, alternates, and addenda.

The engine should not simply output one score. It should explain the reason:

- `Why this is strong`
- `Why this is fragile`
- `What could move the number`
- `What must be reviewed before bid day`
- `What should be qualified`
- `What should be RFQed`
- `What should be mapped to schedule`

## Predictive Signals

Initial signals should be deterministic and explainable before advanced model training:

- Bid section exists but has no estimate items.
- Estimate item has no spec match.
- Estimate item has no takeoff proof.
- Material-heavy item has no RFQ.
- RFQ response is missing lead time, exclusions, taxes, freight, or expiration.
- Vendor quote is far below or above historical range.
- Unit price is outside company history for the same section/type/location.
- Spec section contains testing, inspections, submittals, mockups, bonds, insurance, permits, phasing, MWBE/DBE, liquidated damages, or working-hour limits.
- Project type has known historical risk patterns.
- Bid due date is close and unresolved actions remain.
- Schedule handoff fields are missing for critical work.
- Addenda touched already-priced sections.
- Estimate has many placeholder costs.
- High-value section has low proof confidence.

Later signals can become statistical once the historical database grows:

- Owner/client win-rate patterns.
- Vendor reliability and price spread patterns.
- Unit price drift by region and season.
- Production rate accuracy by crew/equipment/work type.
- Margin fade by project type.
- Change-order likelihood by spec language and owner.
- Schedule delay likelihood by lead-time and phasing profile.

## Predictive Cockpit UX

The cockpit should include a predictive strip or panel:

- Win Probability
- Margin Confidence
- Omission Risk
- RFQ Exposure
- Schedule Readiness
- Bid Volatility

Each card opens to:

- Signal list
- Evidence
- Suggested action
- Create draft action
- Dismiss with learning note

The estimator should be able to ask:

- `What is wrong with this bid?`
- `Where can we make money?`
- `What scares you?`
- `What needs an RFQ?`
- `What should I qualify?`
- `What would you check before submitting?`
- `What does history say?`

The system answers from project data, not generic advice.

## Estimator Inspiration Lines

The cockpit can periodically show short, sharp lines that remind the estimator what OpsSlate is doing. These should feel like command-room energy, not marketing fluff. They should rotate quietly in the cockpit header, AI Estimator panel, or empty states.

Primary tagline:

> Anyone can do a takeoff and calculate a markup. OpsSlate predicts whether the number can survive.

Other optional lines:

- The bid is where the money is made or lost.
- Protect the margin before the contract exists.
- Find the miss before bid day finds it for you.
- Every placeholder is a question waiting to cost money.
- Scope, price, risk, schedule: all one bid.
- A good estimate is a plan the company can live with.
- Win the job without buying the problem.
- The cheapest mistake is the one found before submission.
- Your second estimator is watching the gaps.
- Predict the pain before the field inherits it.

Coach-mode inspiration:

- I am not looking for the best players, Craig. I am looking for the right ones.
- You think you can win on talent alone? Gentlemen, you do not have enough talent to win on talent alone.
- Great moments are born from great opportunity.
- Do not tell me what you cannot do. Show me what you can do.

Estimating adaptations:

- We are not looking for every number. We are looking for the right number.
- You cannot win on markup alone. The bid needs proof, scope, risk control, and timing.
- Great bids are born from great preparation.
- Do not tell me the price is close. Show me why it survives.
- The right vendor matters more than the cheapest vendor.
- Talent builds the estimate. Discipline wins the bid.
- This is the opportunity. Find the gap before your competitor does.

Rules:

- Do not show inspiration copy inside dense data tables.
- Do not interrupt workflow.
- Keep it occasional.
- Rotate lines so the app feels alive without becoming noisy.
- Let company admins eventually customize or disable them.
- Keep coach-mode quotes optional so the company can choose between direct inspiration and OpsSlate-original estimating lines.

## Moonshot User Flow

1. Estimator opens `/estimating`.
2. Cockpit shows active bids and highlights the bid with the most exposure.
3. AI Estimator lists draft actions:
   - Request RFQ for unpriced material-heavy section.
   - Add schedule phase to concrete work.
   - Review spec section with submittal/testing requirements.
   - Qualify bonding or prevailing wage language.
   - Compare asphalt unit price against historical bid database.
4. Estimator opens a bid.
5. Each line item shows:
   - Spec proof
   - Takeoff proof
   - RFQ status
   - Cost confidence
   - Schedule handoff mapping
   - Risk/qualification notes
6. When ready, estimator asks OpsSlate to generate:
   - RFQ package
   - Qualification list
   - Schedule draft
   - Risk register draft
   - Bid day checklist

## Data Gravity

Estimating becomes the place where shared company intelligence is born.

When the estimator works, OpsSlate should learn:

- Real material prices
- Labor production assumptions
- Equipment assumptions
- Vendor responsiveness
- Scope patterns
- Risk language
- Addenda impact
- Historical bid outcomes
- Schedule assumptions
- Crew logic
- Procurement lead times

That intelligence should feed Project Management, Scheduler, Books, Takeoff, and future CRM workflows.

## Error and Empty States

If there are no estimates, show a polished empty cockpit with New Estimate and Import/Attach Project actions.

If Project Management data is unavailable, estimating still works but flags the bid as missing project context.

If shared database tables are empty, show zero-state cards and entry points to seed data.

If schedule alignment data is missing, the bid remains valid but shows low schedule-readiness.

## Build Order

1. Create Estimator Command Center shell/sidebar for the estimating route.
2. Make `/estimating` render the cockpit dashboard first.
3. Move existing RFQ workspace into an RFQ Desk view/tool.
4. Add bid portfolio table and KPI/right-rail panels from existing estimates, RFQs, vendors, and cost records.
5. Add project context pull/linking affordances.
6. Add schedule-readiness fields and cockpit score.
7. Add shared database sidebar entries with staged health panels.
8. Add AI Estimator action queue.

## Testing

Tests should verify:

- `/estimating` renders `Estimating Cockpit`.
- The estimating sidebar renders `Estimator Command Center`.
- RFQ Desk content remains available.
- Cockpit includes bid portfolio, bid pulse, cost database, AI Estimator, and schedule-readiness labels.
- Shared database tools are present in the sidebar.
- Project and schedule alignment language is present in the cockpit.

## Acceptance Criteria

- The estimator lands on a bid-first cockpit, not the RFQ workspace.
- RFQ Desk is still reachable as an estimating tool.
- The sidebar feels like the reference image and is specific to estimating.
- The cockpit uses real estimate/RFQ/vendor data where available.
- Empty states look intentional.
- The design prepares estimating to pull project data and hand schedule-ready structure to Scheduler.
