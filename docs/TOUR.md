# VolleyWorld Tour

Tour combines World League, Challenger and World Cup into one independently saved season. Existing standalone modes remain available. Select **VolleyWorld Tour · Mùa giải dài** on the home screen.

## Shared roster

Before creating a season, choose exactly 32 national teams: Europe 7, Asia/Oceania 7, South America 6, North/Central America/Caribbean 7, Africa 5. Defaults use the catalog's highest regional ranks. League and Challenger share this roster for the entire season. World Cup qualification still includes all 100 catalog teams, including countries outside this selection.

## Calendar

| Stage | Competition                      | Completion gate                                                                    |
| ----- | -------------------------------- | ---------------------------------------------------------------------------------- |
| 1     | League Phase 1                   | Rounds 1–10                                                                        |
| 2     | World Cup regional qualification | All five regional group stages and four regional playoffs                          |
| 3     | League Phase 2                   | Rounds 11–20                                                                       |
| 4     | Challenger                       | Five Swiss rounds, 16-team playoff, bronze and final                               |
| 5     | League Phase 3                   | Rounds 21–31                                                                       |
| 6     | World Cup Play-in                | Three winners from 27 intercontinental entrants                                    |
| 7     | League Phase 4                   | League Play-in, round of 20, fixed 16-team playoff, bronze and final               |
| 8     | World Cup                        | Six groups of four, top two plus four best thirds, fixed playoff, bronze and final |

Use **Qua chặng tiếp theo** after completing an event. Future events cannot be simulated or scored early. World Cup is drawn only after both intercontinental Play-in and the entire League are complete. All matches are BO5 using the shared manual, per-set and forced-result score editor. A full Tour contains **968 matches**: League 520 + Challenger 82 + World Cup qualification/tournament 366.

League keeps one cumulative standings table across its three group-phase calendar windows. Challenger uses the existing world-ranking snapshot for opening seeds, regional separation in round one and no Swiss rematches. Its title does not award a World Cup berth. World Cup qualification keeps the current 21 regional berths + 3 Play-in berths.

## Interface and history

The journey page shows all eight events, the current event, progress and the three independent champions. Completed events remain viewable. League and Swiss support historical round tables, forms and team details; world group matchdays run all six groups before advancing. Match detail/editor, score simulation, qualification and playoff trees reuse the standalone components. Region/branch run buttons simulate only that region/branch. Completed seasons are read-only; players can create another Tour without deleting unfinished seasons.

Scores can be corrected while their round is still active. Advancing the draw or round locks its predecessors. Bronze precedes every title match. Teams and quotas cannot be changed after creating a Tour.

## Persistence

- Local key: `volleyworld-tour-guest` or `volleyworld-tour-user-UID`.
- Cloud table: `public.volleyworld_tour_seasons`; RPC: `save_volleyworld_tour_season`.
- Account-scoped CAS writers, explicit cross-device conflict resolution, lazy history loading, local retry, three rotating backup snapshots, import/export and the shared **Lưu tiến trình** button.
- PostgreSQL validates quota/roster consistency, the calendar gates and all three underlying competition snapshots. Server triggers derive progress/podium and protect identity, roster and completed snapshots. Ownership RLS applies to every exposed operation; anonymous reads/writes are denied.
- No new services or paid subscriptions are introduced.

## Authorized progress reset

On 2026-11-01, playing data for the two explicitly authorized accounts was cleared from all five preexisting save/history tables; Auth users were retained. `volleyworld_data_resets` records the reset cutoff. The application reads the marker before activating account writers, clears the affected account's old browser caches/backups once, and avoids adopting old guest progress. A database trigger rejects pre-reset snapshots from older open clients. Other accounts and guest storage are unaffected.

All mode writers are suspended before an account switch awaits the reset lookup. Main saves are blocked while that lookup is pending. A failed lookup retains local data and can be retried without activating stale writers.

## Verification

`npm run check` runs legacy and differential checks, domain/property suites, Tour UI/cloud/reset tests, architecture checks and the actual Vite ESM journey. Tour tests simulate 24 complete custom-roster seasons, eight ordered gates, 968 matches, history, score correction and account isolation.

For independent database verification:

```sh
node scripts/build-test.cjs
node tests/features/tour.cjs
node scripts/tour-sql.cjs
```

Generated `.test-build/tour-readonly.sql` checks valid/invalid JS fixtures against SQL. `.test-build/tour-verification.sql` exercises all nine saved states, stale CAS, derived completion, immutable history and RLS inside an intentionally rolled-back subtransaction; it leaves no test seasons behind.
