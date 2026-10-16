# Career points — honours-v1

This is a transparent scoring policy for the simulator, not an official federation ranking. The goal is to reward high finishes, retain a small award for reaching Play-in, and treat the single/double formats consistently.

## Awards

| Finish                                                         | Points per completed season |
| -------------------------------------------------------------- | --------------------------: |
| Gold / #1                                                      |                       1,000 |
| Silver / #2                                                    |                         630 |
| Bronze / #3                                                    |                         460 |
| #4                                                             |                         360 |
| #5–#8, single elimination                                      |                         230 |
| #9–#16, single elimination                                     |                          90 |
| #17–#20, Play-in elimination in either format                  |                          20 |
| #5–#6, double elimination                                      |                         270 |
| #7–#8, double elimination                                      |                         190 |
| #9–#12, double elimination                                     |                         120 |
| #13–#16, double elimination                                    |                          60 |
| League elimination / non-participation / unfinished / canceled |                           0 |

For an individual rank `r` from 1 to 20, start with:

```text
w(r) = 1000 × (1/√r − 1/√21) / (1 − 1/√21)
```

For a tied range `[a,b]`, average `w(a)..w(b)` and round the average to the nearest 10 points. This produces decreasing rewards, a 1,000-point champion and zero at the league-elimination boundary. Averaging comes before rounding. It does not invent an order within a tied knockout group.

The current bracket groups distribute **4,170 points per season** in either format. In particular:

- Four single-elimination quarterfinalists: `4 × 230 = 920`; the double format splits them into `2 × 270 + 2 × 190 = 920`.
- Eight single-elimination round-of-16 exits: `8 × 90 = 720`; the double format splits them into `4 × 120 + 4 × 60 = 720`.

Awards depend on final placement, so the same season earns exactly one award per team. Points are not added once per playoff stage or once per match. Teams entering playoffs directly satisfy the “at least Play-in” criterion.

## Accumulation and ordering

Every completed season has equal weight. Career points are the sum of season awards. Only teams with at least one positive award appear in the career leaderboard. New seasons, league eliminations, non-participation and canceled seasons contribute zero and do not create eligibility.

Sort by total points, then gold, silver and bronze counts. Still-equal teams share a competition rank, e.g. `1, 1, 3`. Team-code ordering only stabilizes display within a shared rank. Regional and worldwide filters use the same per-team totals, with ranks recalculated within the selected scope.

Each team detail shows total points, number of scoring seasons and every season's individual award alongside its existing finish/medal. Completed-season IDs are deduplicated; if a metadata-only duplicate and full snapshot coexist, the snapshot is preferred.

## History completeness and storage

Career points are derived from immutable season snapshots and existing medal metadata. No save schema, SQL, endpoint or stored score counter is added. Old saves and imported history receive scores retroactively under honours-v1.

The authoritative leaderboard requires all known completed seasons to have full snapshots. Missing archives load through the existing scoped history reader with at most four concurrent requests. An incomplete/offline history shows an explicit unavailable/retry state; partial totals are not presented as a complete leaderboard. Country detail can still show confirmed medal-based points, with missing-data counts where needed. Canceled history does not block the ranking because it cannot award points.

Account/selection cancellation guards remain in force, so late results from another account cannot replace visible scores. Rendering and scoring never mutate the active tournament or archive results.

## Verification

The dedicated test checks the exact table, decreasing base curve, 4,170-point format equality, 20 qualifying teams per completed season, 12 complete single/double seasons, bulk-vs-individual placements, additive/order-independent totals, duplicate suppression, zero/excluded seasons, medal tie-breaks, shared ranks, region/global filters and per-season detail totals.

DOM tests cover ranking selection, clicks into a team, four-request concurrency, incomplete/offline history, retry affordance, reload and unchanged active state. The real Vite ESM smoke test also opens the new tab and its no-completed-season state. The broader existing regression, differential, architecture and build suites continue to run via `npm run check`.

Real-browser pixel comparison remains unavailable in this session; DOM/CSS checks are not represented as screenshot tests.
