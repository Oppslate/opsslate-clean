# Helios Foundation 4D Review

Status: implemented and verified in the Helios development environment

Scope: governed civil-geometry reconstruction, deterministic plan takeoff,
quantity reconciliation, and controlled estimate proposals. Pricing is outside
this milestone.

## Delivered outcome

Helios now turns an accepted Foundation 4C plan register into reviewable civil
geometry and estimator-controlled quantities. The existing WBS, estimate,
Cockpit 2.0, document intelligence, pricing, procurement, evidence, and risk
records remain additive and unchanged.

The geometry authority chain is:

1. horizontal control coordinates, tangent/curve tables, and station equations;
2. vertical profiles, station/elevation points, grades, and curve controls;
3. cross sections and typical sections for offsets, lane widths, slopes, and
   existing/proposed/subgrade surfaces;
4. drainage stations, offsets, structure identifiers, inverts, pipe sizes, and
   materials;
5. explicit material station limits, widths, and depths;
6. dimensioned geometry; and
7. estimator-approved calibrated scale only as a fallback.

Horizontal curve length uses the printed curve-table length rather than the
chord between control points. Station equations are retained explicitly so
station arithmetic cannot silently change physical length.

## Engineering separation of duties

OpenAI reads the complete protected plan documents and proposes only explicit,
source-located geometry. It is instructed not to invent missing coordinates,
interpolate unprinted elevations, or calculate bid quantities. Every proposal
is tied to an exact Foundation 4C page and view and remains unusable until an
estimator accepts it.

After acceptance, deterministic application code calculates quantities from
the stored geometry. Current supported calculations include:

- alignment length from explicit tangent/curve segments or control points;
- true profile length from station/elevation geometry;
- pipe/network length from station, offset, and invert geometry;
- unique structure counts;
- material areas from station and width limits;
- pavement/subgrade layer volume from length, width, and depth; and
- earthwork volume by average end area from accepted cross sections.

Zero and unknown measurements are never converted into quantities. Scale-based
measurements require an approved view calibration. Geometry-based measurements
require accepted civil-geometry records.

## Quantity governance

Measured quantity, owner bid quantity, production quantity, purchasing
quantity, and risk quantity remain distinct. Helios displays variance when
owner and measured quantities are comparable; it does not overwrite either.

Accepting a measurement is a one-click bid-day action that rebuilds its current
quantity proposal. A second one-click decision can send the proposal to the
existing estimate quantity register for production use or comparison. The
estimate receives a proposed plan quantity only; it is not silently accepted,
priced, or substituted for an owner quantity. All consequential actions create
append-only review events with the authenticated reviewer and before/after
values.

## Security and revision control

- Browser requests contain no trusted company identifiers.
- Same-origin session, signed principal, tenant, project, active package,
  package revision, plan run, estimate, page/view, calibration, cost code, and
  geometry ownership are reauthorized on the server.
- Geometry jobs use protected source files and clean up remote OpenAI objects.
- Runs and measurements are bound to the current revision; prior records remain
  auditable and cannot be silently reused against a changed bid package.
- New storage is normalized across geometry runs/jobs/records/reviews and
  takeoff runs/measurements/quantities/reviews.

## User experience

The OpsSlate-style Quantity Intelligence workbench is added to the project
workspace only when the bid basis supports plan takeoff. It provides:

- a civil-geometry review register with source, authority, confidence, and
  unresolved issues;
- one-click accept/reject controls;
- a governed measurement dialog that prioritizes accepted geometry;
- a visible warning when calibrated scale is the fallback;
- owner-versus-measured reconciliation; and
- one-click proposal to the existing estimate quantity register.

Plans-absent projects remain nonblocking and continue estimating from the
available specifications or written scope.

## Verification evidence

- Helios domain build: passed
- Domain tests: 48 passed
- Helios security/UI boundary tests: 68 passed
- Helios lint and production build: passed
- Shared OpsSlate web production build: passed
- Convex schema/function generation on `kindly-tiger-289`: passed
- Authenticated browser check: plans-enabled and specifications-only projects
  loaded with no console errors
- Responsive browser check: 1024px tablet and 390px mobile had no page-level
  horizontal overflow
- Paid/model geometry reconstruction was not triggered during verification

## Deferred work

Foundation 4D establishes the governed geometry and takeoff foundation. The
next milestone should validate it on a golden issued-for-bid civil project and
expand automated quantity execution, including curve/spiral edge cases,
station equations across linked sheets, cross-section interpolation controls,
material-boundary transitions, visual overlays, estimator corrections, and
batch cost-code takeoff.
