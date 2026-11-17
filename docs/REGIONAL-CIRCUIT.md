# Regional circuit v2

The public entry point uses `features/circuit`; historical Tour engines remain regression fixtures. No legacy state is converted into a new season.

## Rosters and calendar

Four regions: Europe, Asia/Oceania, Americas (NORCECA + CSV), Africa. Each has sixteen Tier 1 teams and eight Tier 2 teams, selected at season start and frozen through all phases. Africa gains eleven simulation teams; their ratings are explicit game seeds, not live rankings. Legacy catalog counts stay intact for existing engines.

| Stage | Event                       | Matches |
| ----- | --------------------------- | ------: |
| 0     | Phase 1 regional leagues    |     176 |
| 1     | First Stand                 |      14 |
| 2     | Phase 2 regional leagues    |     316 |
| 3     | Challenger                  |      41 |
| 4     | Phase 3 regional leagues    |     340 |
| 5     | Regional World Cup Play-ins |     120 |
| 6     | Phase 5 World Cup           |      64 |
| 7     | Phase 6 promotion           |      80 |
|       | Total                       |   1,151 |

Phase 1 Tier 1 is sixteen-team double elimination stopped before the grand final: upper winner first, lower winner second. Both qualify for First Stand. First Stand has eight teams and one grand final, no reset.

Phase 2 Tier 1 has two groups of eight per region, seeded by Phase 1 League results. Top four per group qualify for a fixed single bracket: A1–B4 / B2–A3 / B1–A4 / A2–B3. Quarterfinal winners qualify for Challenger; bronze and final determine regional seeds. Challenger has sixteen teams, five-round three-win/three-loss Swiss with no rematches, then eight-team knockout with bronze before final.

Phase 3 redraws two groups of eight from Phase 2 League seeds. Top four per group enter the same fixed opening, followed by double elimination with one grand final. Both grand-final participants have direct World Cup tickets before the title match.

Tier 2 in every phase has two groups of four, top two advance via A1–B2 / B1–A2 to final, no bronze. Semifinal losers share third place and placement points. Same-phase totals resolve League seeding ties only; awards remain shared. Seed pairs are separated between groups.

## Points and integer-award policy

This release concretizes the proposed placement curve so a whole season is playable. League wins earn 5; First Stand, Challenger and World Cup wins earn 10. Placement awards bank only when the relevant tournament finishes. Fixed seed order resolves an exact season-points tie.

| Rank  | Tier 1 base | Tier 2 base | First Stand base |
| ----- | ----------: | ----------: | ---------------: |
| 1     |         120 |          60 |              240 |
| 2     |         100 |          45 |              180 |
| 3     |          80 |          35 |              140 |
| 4     |          60 |          25 |              100 |
| 5–6   |          40 |           0 |               60 |
| 7–8   |          30 |           0 |               40 |
| 9–12  |          20 |           0 |                0 |
| 13–16 |          10 |           0 |                0 |

Tier 2 teams outside playoff receive no placement award. League placement weights are **1 / 2 / 3** for phases 1 / 2 / 3. Challenger placement awards are twice First Stand; World Cup awards are three times First Stand. Win points never scale. Integer multipliers produce integer awards directly, with no rounding. The `integerPoints` marker persists this policy on new and pre-Play-in seasons. Existing seasons already at Play-in/World Cup without the marker retain the original 1 / 1.5 / 2 League and 1.5 Challenger ledger to preserve issued tickets and draws. World Cup points are displayed separately and cannot change already allocated qualification routes.

Conservative unfinished-event ceilings can confirm an early points berth; ties remain unresolved until official closure. Qualification always uses the pre-Play-in ledger. Regional Phase 3 finalists are excluded before the two points tickets are selected. No duplicate direct tickets.

## Play-in and World Cup

Per region, four direct tickets leave twelve Tier 1 teams. Top four Tier 2 points teams join them. Four pots yield four GSL groups: three Tier 1 teams plus one Tier 2 team per group. Each group plays opening pairs, winners match, elimination match and decider. Two wins advance; two losses eliminate.

Eight survivors reset loss counts and enter fixed opening A1–B2 / C1–D2 / B1–A2 / D1–C2. Upper semifinal winners earn two tickets; crossed lower matches earn the other two. No redundant final. Each region has twenty GSL plus ten bracket matches. Tickets appear as soon as the decisive match ends.

World Cup has eight seeded groups of four, each with one team per region and one per pot. Top two advance to the existing fixed sixteen-team knockout, including bronze before final. Historical group standings and qualification icons use the selected round snapshot.

## Following season

Every World Cup participant is guaranteed Tier 1 next season. All other sixteen current-season teams per region must play Phase 6, regardless of original tier or points. Four GSL groups award two places each: two wins qualify, two losses eliminate. No overall final or placement points are awarded. The other eight Tier 1 places come exclusively from these winners. Tier 2 is still selected at the next season start from the national pool excluding inherited Tier 1 teams. All sixteen inherited Tier 1 slots are locked in setup.

Phase 6 seeds use total season points, then League Phase 3/2/1 placement, then a stored random tie order. Four shuffled pots each provide one team to each group; pot 1 faces pot 4 and pot 2 faces pot 3. The draw is stored and never regenerated on render or reload. Green ticks and red crosses update as soon as a team reaches two wins or losses; World Cup participants have a separate safe route. Regional group panels reuse the existing bracket renderer in two columns on wide screens.

New and unfinished seasons carry `promotionEnabled: true`. World Cup is stage 6, promotion is stage 7, and completion becomes stage 8. Existing completed seasons without the marker remain immutable at stage 7 with their original 1,071 matches and inheritance policy. Loading an unfinished local/cloud/imported season enables Phase 6 without replacing results. A World Cup podium can exist on an active season while promotion remains unfinished. The season ends only after all four regions complete promotion, for 1,151 matches.

## UI, persistence and verification

The circuit reuses standings and historical rank movement, match cards and five-match form, detail modal, progressive/forced BO5 editor, connected double bracket tiles, Swiss tree, and connected single bracket. Regional group tables use two columns on wide screens, one on narrow screens, with table and bracket scrolling contained inside panels.

Cloud records use `volleyworld_circuit_seasons` with owner RLS, metadata derivation, immutable completed saves and CAS revisions. The account adapter is selected at production composition; legacy fixture accounts keep their original adapter. Legacy browser game keys are removed on entry; Supabase auth and account-reset markers are preserved. Database reset is administrative and separately authorized; it is never a global delete in browser code.

Automated checks cover complete seasons, partial-state validation, fixed routes, no reset, Swiss16, GSL exits, early tickets, score editing, historical standings, filters, promotion, reload, account isolation, offline writes, CAS conflicts, scoped reset and the real Vite production bundle. Direct browser preview actions were blocked by the existing preview policy, so DOM integration and scoped stylesheet checks do not constitute screenshot verification.
