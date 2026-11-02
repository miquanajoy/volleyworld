# World Cup merit berths — feature branch

Status: implementation on `feature/world-cup-merit-berths`; no merge or production migration. Vercel Preview for this branch is local-only: no Supabase credentials, auth or cloud writes; browser progress uses `volleyworld-tour-merit-preview-guest`. Export/import remains available. Other branches and production keep their existing cloud configuration.

## Fixed allocation

24 distinct entrants: League champion + Challenger champion + 19 regional qualifiers + 3 intercontinental winners. If both titles belong to one country, the Challenger runner-up receives the second automatic berth. No Phase winner or regular-season leader berth. Every team still plays its original regional group schedule; standings/scores are never rewritten.

After both tournaments finish, persist the two distinct automatic IDs in order `[leagueWinner, challengerWinnerOrRunnerUp]`. Filter them out of each completed regional standings table when allocating berths. The highest eligible country gets its group's direct berth; the next two eligible countries enter the regional playoff. South America takes the top two eligible countries directly and its third eligible country enters intercontinental Play-in.

## Eight stages (UI numbers)

| Stage | Event                                           | Gate                                                                      |
| ----- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| 1     | League Phase 1                                  | Rounds 1–10                                                               |
| 2     | Regional groups only                            | All groups complete; no regional playoff drawn                            |
| 3     | League Phase 2                                  | Rounds 11–20                                                              |
| 4     | Challenger                                      | Swiss, playoff, bronze, final                                             |
| 5     | League Phase 3                                  | Rounds 21–31                                                              |
| 6     | League Phase 4                                  | Play-in, playoff, bronze, final                                           |
| 7     | Regional playoffs then intercontinental Play-in | Two automatic IDs known; all four regional playoffs then three IC winners |
| 8     | World Cup                                       | Six groups of four and 16-team playoff                                    |

## Regional allocation

| Region                          | Group berths | Regional playoff                                             | IC pool                |
| ------------------------------- | ------------ | ------------------------------------------------------------ | ---------------------- |
| Europe                          | 6            | 12 eligible entrants play only until four remain (8 matches) | 4 advancers            |
| Asia/Oceania                    | 4            | 8 eligible entrants play until four remain (4 matches)       | 4 advancers            |
| North/Central America/Caribbean | 3            | 6 eligible entrants, one WC winner (5 matches)               | 5 losers               |
| Africa                          | 2            | 4 eligible entrants, one WC winner (3 matches)               | 3 losers               |
| South America                   | 2            | No playoff                                                   | Third eligible country |
| Total                           | 17           | 2 more WC berths                                             | 17 countries           |

Each group has at least six countries, so removing at most two automatic teams always leaves enough eligible teams. Two automatic teams in one group move allocation down without changing actual rankings. Nations outside the shared League/Challenger roster retain all regional routes.

## Intercontinental draw

Sort the 17 entrants by actual group rank, win ratio, set difference per game, point difference per game and world rank. Cross multiplication compares ratios exactly. Six pots of up to three teams. Each full pot sends one team to every branch; the final two teams are assigned to two randomly selected branches. Thus the five-team branch is not tied permanently to a branch or region. Branches have 6,6,5 teams, each using a seeded eight-slot bracket with byes. One winner per branch; no redraws. The smaller branch remains a declared draw advantage, not a claim of equal path difficulty.

## UI and history

The three existing competition cards, group tables, forms, manual/per-set editor and fixed playoff trees remain. The calendar switches League playoff and IC order only for new saves. Stage 7 contains regional trees plus IC trees; Europe/Asia stop at four and label their winners as IC representatives, not World Cup qualifiers. Confirmed title berths appear immediately in the WC ticket panel. Regional promotion/contender labels remain provisional until both automatic countries are known. Legacy seasons keep their original labels, controls, totals and historical results.

## Preview release boundary

This branch sets `VOLLEY_PREVIEW_LOCAL=1` explicitly in its Vercel build command. The compiler emits empty Supabase URL/key values, the account runtime disables cloud initialization, and storage uses a preview-only prefix. A visible notice explains browser-only saves and export/import. Before any later approved production merge, restore the regular Vercel build command and apply the reviewed migration to the intended database; do not treat this preview as a production release.

## Persistence and validation

Tour `rules: "merit-v1"`; nested FullSeason `regionalFormat: "merit-v1"`, `automatic: null` through stage 6 (zero-based 0–5), then two derived IDs. Europe/Asia brackets have `advanceSlots: 4` and truncated round arrays. Full IC pots/seed bands, all fixtures and exact 24-team World Cup membership are validated. Total: 516 League + 82 Challenger + 264 regional group + 20 regional playoff + 14 IC + 52 World Cup = **948**.

`freshTour` remains the legacy fixture/compatibility factory. Production creates new seasons with `freshMeritTour`. A migration is prepared in this branch; it must be applied to a test/staging database before cloud testing or a later approved release. It has not been applied to the production database.

## Verification

- `npm run check` — legacy parity, engine/UI/cloud/production build and architecture regression suites.
- `node tests/features/tour-merit.cjs` — 30 complete seasons, all 264 same-group automatic-country pairs, five-region title transfer, 948 fixtures, 24 distinct entrants, malformed save rejection and legacy compatibility.
- `node tests/features/tour-merit-ui.cjs` — actual Tour creation, new gates, early title tickets, score editor, regional/IC controls, completed history and reload.
- Local PostgreSQL migration/fixture/CAS tests are documented in `scripts/test-tour-merit-sql.cjs`; no production rows are touched.
