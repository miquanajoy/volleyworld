# Season qualification points (versions 1–2)

New Tour seasons use qualification points with fixed regional participant counts (version 2). Existing saved seasons retain their original qualification rules; continuing an old chain creates the next season using the new rules. Qualification points are separate from historical honours and reset each season. They are derived from match results, never saved as editable totals.

## Main competition

32 World Cup places: top four **regular League standings** receive automatic places; the highest 12 remaining teams by combined League and Challenger points qualify directly; 16 places are awarded by the existing double-elimination World Cup Play-in. Challenger no longer has separate finalist tickets.

| Source                            | Points per win |
| --------------------------------- | -------------: |
| Regular League / Challenger Swiss |              5 |
| League Play-in / playoff          |             20 |
| Challenger playoff                |             10 |

| Final placement   | League bonus | Challenger bonus |
| ----------------- | -----------: | ---------------: |
| Champion          |          400 |              300 |
| Runner-up         |          300 |              180 |
| Third             |          240 |              120 |
| Fourth            |          200 |              100 |
| Quarterfinal exit |          150 |               60 |
| Round-of-16 exit  |           80 |               25 |
| Other             |            0 |                0 |

Each competition awards exactly one final-placement bonus. Win points are additive. The Challenger title gives a strong qualification position, without being a separate automatic ticket. Ties: League playoff placement, Challenger placement, regular League wins, then the season's stored draw order.

The calendar is League P1 → regional P1 → League P2 → regional P2 → Challenger → League P3 + League Play-in → regional P3 → League playoff → World Cup Play-in → World Cup. League playoff therefore finishes before the World Cup Play-in draw.

## Regional qualification

Phase 1 and Phase 2 are independent tournaments with separate groups, fixtures, playoffs and points. Europe has 16 teams in four groups of four; Asia and the other regions have eight participants in two groups of four whenever enough eligible teams remain outside League. Participant counts no longer grow with the ticket quota. Top two per group advance to a single-elimination playoff, including bronze. Smaller inherited pools use balanced groups of at most four and seeded byes. Initial playoff pairings avoid same-group rematches when multiple groups exist.

Phase 3 uses the full upper/lower bracket to a champion, including a grand-final reset when required. It does not stop once enough teams survive. Seeds use Phase 1+2 points, then world ranking.

| Result          | Phase 1 / 2 | Phase 3 |
| --------------- | ----------: | ------: |
| Group win       |           5 |       — |
| Knockout win    |          10 |      10 |
| Champion bonus  |         200 |     240 |
| Runner-up bonus |         120 |     160 |
| Third bonus     |          80 |     120 |
| Fourth bonus    |          60 |      90 |
| Fifth–sixth     |          30 |      60 |
| Seventh–eighth  |          30 |      40 |
| Ninth–twelfth   |           0 |      20 |

Regional places are allocated by total points, then Phase 3 points, Phase 2 points, world ranking. There are still 16 outside-League representatives in total. Version 2 caps each non-European regional ticket allocation at its eight-team participant pool (including the combined Americas pool) and redistributes excess capacity proportionally; confederation limits remain in force. Americas combines NORCECA and CSV in one competition while preserving the separate confederation capacity limit: at most 16 World Cup participants from each confederation, including the League roster.

## Closing phases and early tickets

Live tables show earned win points, but a final-placement bonus is banked only when that phase/competition is complete. Certification uses banked points and conservative ceilings for every opponent's possible remaining results. A tie at the ceiling counts as a threat, so the UI cannot certify a ticket on an unresolved tiebreak. Main competition certification excludes already automatic top-four teams. Regional certification also checks same-confederation threats and remaining capacity.

“Đã giành vé” means mathematically safe or finally allocated. “Tạm trong nhóm có suất” means only the current ranking falls inside the quota. There is no fixed universal safe-points threshold. The separate World Cup ticket view shows confirmed World Cup teams and confirmed regional World Cup Play-in representatives.

## Saved seasons

Version 1 retains the former `max(8, quota + 3)` participant rule for compatibility. Its already scheduled or scored nine-team seasons remain readable and are never silently reduced to eight. New seasons, including continuation from a version 1 chain, use version 2.

## Validation

`season-qualification-points.cjs` exercises 40 chained complete seasons plus five extreme inherited rosters, exact awards, over 27,000 opponent point ceilings, early-ticket stability, top4+12+16 distinct allocation, group/top-two routes, reset/no-reset Phase 3, confederation limits, season reset, JSON persistence and chain import, manual-score/future-phase locks, corrupt phase/route rejection and agreement between points tables and the World Cup ticket view. Existing legacy suites remain on their saved formats.

`fixed-regional-pools.cjs` exhaustively checks all 19,076 inherited regional roster allocations, reproduces the six-ticket/nine-team Asia case, verifies fixed 2×4 grouping, total ticket conservation, confederation limits, setup UI and scored legacy-save compatibility.
