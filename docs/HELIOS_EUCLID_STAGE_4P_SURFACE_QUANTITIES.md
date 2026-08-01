# Helios Euclid Stage 4P — Governed Surface Comparison and Draft Quantities

## Outcome

Stage 4P compares the canonical surfaces assembled by Stage 4O and calculates traceable draft earthwork, structural-envelope, excavation-limit, and material quantities. It uses the current canonical Euclid model once and performs no PDF read, OpenAI request, storage operation, or estimate mutation.

Every result remains a draft. Stage 4P cannot bypass Stage 4K quantity publication, estimator review, cost-code mapping, or pricing controls.

## Comparison hierarchy

The earthwork comparison uses existing ground against subgrade when both surfaces share governed panel spans. If no governed subgrade span exists, proposed grade is the explicit fallback. Helios does not combine both design bases in one quantity.

Additional comparisons are calculated only when common governed panels exist:

- proposed grade to subgrade for the structural-section envelope; and
- existing ground to excavation limit for the excavation-limit envelope.

These comparison totals are separate bases and must never be added together automatically.

## Cross-section method

At each bounding station, both surfaces must share at least three exact governed offsets. Elevations are normalized into the horizontal engineering unit. The signed depth is base elevation minus target elevation.

Each lateral segment is integrated as a trapezoid. When depth changes sign, the segment is split at the calculated zero crossing so cut and fill remain separate.

## Longitudinal method

Volumes are calculated only across station intervals where both surfaces have Stage 4O panels. The average-end-area formula is:

`interval volume = distance × (start area + end area) / 2`

Imperial cubic feet are divided by 27 for cubic yards. Missing stations, incompatible offsets, unknown units, and absent surface spans become explicit gaps. Helios never bridges them.

## Material quantities

An accepted material layer can produce a draft area and volume when it has:

- accepted start and end chainage;
- accepted left and right offsets; and
- accepted positive thickness with known units.

The result uses the governed footprint and normalized thickness. Material vertical placement remains unresolved unless explicit subgrade geometry establishes it.

## User workflow

In the Euclid cockpit, select an alignment and open **Surfaces**. One action—**Build surfaces and draft quantities**—runs Stage 4O and Stage 4P from the same current canonical record.

The workspace shows:

- surface sections, points, panels, and gaps;
- comparison bases and interval counts;
- separate positive and negative comparison volumes;
- draft excavation, embankment, envelope, material-area, and material-volume results; and
- method, confidence, limitations, and engineering status.

Ask Helios can answer questions about governed excavation, embankment, material, cut/fill, and surface quantities from the deterministic 4P result.

## Safety boundary

Stage 4P does not:

- write or overwrite an owner quantity;
- create an accepted production quantity;
- apply shrink, swell, waste, or means-and-methods factors;
- price a quantity;
- map a result to a cost code;
- publish into the estimate; or
- infer missing geometry.

Those actions remain explicit estimator decisions through the governed estimate and Stage 4K publication workflows.

## Acceptance criteria

Stage 4P passes when identical canonical inputs produce the same fingerprint, cut and fill are separated at sign changes, gaps stop longitudinal integration, material math requires complete accepted controls, all results are labeled draft, and no database mutation or publication occurs.
