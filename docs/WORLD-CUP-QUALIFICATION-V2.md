# World Cup qualification v2

New seasons default to `regionalFormat: "qualification-v2"`. Existing `groups-v1`
(543 matches) and original single-league seasons (1,315 matches) remain unchanged,
validated, importable, viewable and writable. Creating a new season selects v2.

## Format

| Region                            | Groups              | Direct | Regional playoff | Play-in entrants |
| --------------------------------- | ------------------- | -----: | ---------------: | ---------------: |
| Europe                            | 7/7/7/6/6/6         |      6 |  1 from 12 teams |               11 |
| Asia & Oceania                    | 6/6/6/6             |      4 |   1 from 8 teams |                7 |
| North/Central America & Caribbean | 6/6/6               |      3 |   1 from 6 teams |                5 |
| Africa                            | 7/6                 |      2 |   1 from 4 teams |                3 |
| South America                     | One six-team league |      2 |             None |      Third place |

Group winners qualify directly, while second and third enter the regional playoff.
In South America the first two qualify directly and third enters intercontinental
Play-in without a regional playoff. Regional playoff winners qualify; every other
regional playoff entrant goes to Play-in, regardless of the round lost.

There are 17 direct places, four regional-playoff places and three Play-in places.
The 24-team World Cup keeps six seeded four-team groups, the top two plus four
best thirds advancing to its fixed 16-team playoff, including bronze before final.

## Seeds, byes and progression

All matches are BO5. Qualification brackets use standard fixed seed slots. Regional
playoffs of 12 and six have four and two byes respectively; eight and four need
none. Regional seeds prioritize group second over third, then compare win rate,
set difference per match, point difference per match and world rank. Fractions are
compared by cross multiplication in the engine, so a seven-team group has no raw
match-count advantage over a six-team group. No extra random tie is needed after
world rank, which is unique in the fixed roster.

The 27 Play-in entrants are seeded by the same group-stage comparison, without
counting regional knockout results. Nine pots of three supply one team per pot
to each of three nine-team branches. The draw balances regional concentration
and prioritizes avoiding same-region opponents in the preliminary game; these
are preferences, not hard exclusions when the pots make them impossible.

Within each branch seeds 8 and 9 play the preliminary game. Its winner faces seed
1; the other quarterfinals are 4–5, 2–7, 3–6. A branch winner qualifies for World
Cup. There is no bronze or championship game between already qualified teams.

Brackets store `seeds` and staged `rounds`, with real matches only: a bye never
creates a score or a win. Later rounds are populated only after the previous round
finishes. Regional group results lock when their playoff is created; regional
playoffs and South America lock after the Play-in draw; Play-in locks after the
World Cup draw. Completed seasons are read-only. Results are chronologically
stamped across all phases for consistent team form.

## Gates and match counts

All five regional leagues and their playoffs must finish before the Play-in draw.
All three Play-in branches must finish before drawing the World Cup. Early berth
certificates do not skip remaining fixtures or open a later phase prematurely.

- Regional leagues: 108 + 60 + 45 + 36 + 15 = 264 matches.
- Regional playoffs: 11 + 7 + 5 + 3 = 26 matches.
- Play-in: 3 × 8 = 24 matches.
- World Cup: 36 group matches + 16 playoff/medal matches = 52.
- **Total: 366 matches.**

## Storage and verification

V2 adds `directSlots` and regional `playoff` fields and a season-level
`intercontinental` draw. The existing Full Season table and CAS RPC remain in
use. Database validation independently derives seeds, bye routes, the 27-team
pool, all 24 World Cup entrants, World Cup seed pots and knockout routes, and
rejects duplicate IDs/result order, wrong participants or premature stages.
Season format is immutable on updates. Metadata counts every new-phase match.
Owner RLS and completed-save immutability are retained.

`tests/features/world-qualification.cjs` runs 40 full seasons and real delegated
UI actions, including six European groups, manual scoring, stage controls,
phase gates and reload. Legacy/grouped suites remain explicit, alongside new
366-match production-build and cloud tests. `scripts/world-qualification-sql.cjs`
generates rollback-only SQL integration tests for intermediate states, normalized
seed parity, CAS, 313/366 progress boundaries, old saves and account isolation.
