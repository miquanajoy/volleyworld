# Nations League

Implemented as a third independent mode on main. It inherits existing match cards, score editor (set-by-set simulation, forced winner/score and inline validation), forms, rank arrows, connected playoff tree, podium, season library, manual save, automatic local backups, export/import and account-scoped cloud saves.

## Fixed format

| Division | Teams | Groups | Group format                    | Outcome                                                         |
| -------- | ----- | ------ | ------------------------------- | --------------------------------------------------------------- |
| A        | 16    | 4 × 4  | Double round robin, 6 matchdays | Top two/group enter an eight-team playoff; last/group relegated |
| B        | 16    | 4 × 4  | Double round robin, 6 matchdays | Winner/group promoted; last/group relegated                     |
| C        | 16    | 4 × 4  | Double round robin, 6 matchdays | Winner/group promoted; last/group relegated                     |
| D        | 16    | 4 × 4  | Double round robin, 6 matchdays | Winner/group promoted                                           |

Each matchday comprises 32 matches across all 16 groups. A season has 192 group matches and eight playoff matches, including bronze: **200**. Matchday selection cannot advance beyond the first incomplete shared round. Standings, form and qualification certificates use the selected round cutoff. Group results lock after the playoff draw.

All matches are BO5. Sets 1–4 to 25, fifth to 15, win by two. Tables use wins, set difference, point difference, head-to-head and a saved random tiebreak order. Early berth/relegation certificates reuse the bounded conservative solver: an uncertain result stays undecided.

The first roster uses proportional Hamilton allocation from the existing 100-team catalog: CEV 25, AVC 15, NORCECA 12, CAVB 8, CSV 4. Each region supplies its highest-ranked teams. First-season divisions are consecutive world-rank blocks of 16. Each division has four rank-based pots; every group gets one team/pot. The 64 participants remain fixed within a campaign.

The Division A quarterfinal draw pairs group winners against runners-up from other groups. Quarterfinal pairs are shuffled into four fixed slots; Q1/Q2 feed S1, Q3/Q4 feed S2. Semifinal losers play bronze before the final. Individual final simulation/editing is blocked until bronze has a result.

## Linked seasons and history

A campaign has a stable `campaignId`; `cycleNumber` is the season number shown within that campaign. `seasonNumber` is an internal globally unique archive order. A completed season can have one successor, linked by `previousSeasonId`. Four teams cross each division boundary in each direction. Every new season reseeds and redraws the groups in its resulting divisions.

Players may start independent campaigns while others are active. The explicit **Tạo chuỗi độc lập mới** action starts at season 1; it does not inherit promotion/relegation. Each campaign has a primary continue/create-next-season action. The shared footer continues a selected completed season (or opens its existing successor) and opens season management for an active season; it never silently creates an independent campaign. A next-season overview shows 24 actual division changes (12 promoted, 12 relegated), with old/new divisions; a metadata-only parent offers a load-history action. Completed seasons are read-only. History uses the shared season-card grid across campaigns, with a campaign label on every card, gold completed status, aligned medal rows, active-season progress and bottom-aligned actions. The latest season in each campaign keeps its continuation action on its card. Summaries list final rank bands and division outcomes; honours show each country's result for every season without adding to World League career points.

Export includes complete campaigns, not isolated successors. Import validates every parent transition and creates new campaign/season IDs. Concurrent offline branches are exported as separate complete chains so both alternatives remain recoverable. Missing parents, duplicate IDs/cycles, invalid BO5 scores, seed violations and invalid playoff routes are rejected before import changes any existing record.

## Persistence and security

- Guest key: `volleyworld-nations-guest`.
- Account key: `volleyworld-nations-user-<uid>`; guest saves are kept separately.
- Backup key: current scope + `-backups` (three recent snapshots).
- Cloud table: `public.volleyworld_nations_seasons`.
- RPC: `save_volleyworld_nations_season(jsonb,bigint)`.

A shared generic archive coordinator provides lazy snapshots, serial CAS writes, offline retention, manual-save acknowledgement and account-epoch guards for both World Cup and Nations League. Nations League additionally saves dirty parents before children and detects competing campaign/cycle IDs. The cloud unique constraint prevents two devices from creating two official successors. A conflict requires an explicit local/online choice; a different-ID cycle cannot silently replace the online season. Export preserves the local alternative before choosing online.

The database independently validates the fixed roster, pots, groups, double fixtures, scores, result order, playoff eligibility/routes and parent promotion/relegation. Metadata is derived by a trigger. Draw and identity are immutable; completed saves are immutable and retries are idempotent. RLS restricts select/insert/update to the account owner; anonymous users have no access; no delete permission is granted. Migration adds a separate table and functions and does not mutate either existing mode's rows.

## Validation

- `tests/features/nations-league.cjs`: 125 complete seasons across 25 five-season chains; quotas, calendar, 200-match totals, playoff seeding, promotion/relegation, malformed-state rejection, exhaustive winner-assignment samples for early certificates and concurrent-branch export.
- `tests/features/nations-ui.cjs`: real delegated DOM actions, shared-round progression, set editor, historical tables, forms, team history, bracket, medal order, immutable summary, continuation, independent campaigns, import and reload.
- `tests/features/nations-continuation.cjs`: delegated footer/campaign actions, inherited membership, exact 24-team transfer display, prior-season immutability, active-season management, existing-successor reuse, explicit independent roots and metadata-only parent history.
- `tests/features/nations-cloud.cjs`: owner/guest isolation, offline retry, CAS, parent-first writes, duplicate next-cycle races, explicit conflict resolution, imported chains, number collisions and stale account responses.
- `tests/integration/build.cjs`: actual production Vite ESM and Supabase SDK; finish a Nations League season, create its successor, manual-save and verify both existing mode saves remain unchanged.
- SQL integration: `node scripts/build-test.cjs`, then `node scripts/nations-sql-fixtures.cjs > /tmp/nations-tests.sql`. Execute the resulting SQL on the test connection; all synthetic users and progress roll back. Covers JS/SQL transition parity, malformed scores/fixtures/bracket, CAS, completed immutability, duplicate cycle, derived metadata and cross-account RLS.
- Run `npm run check`, `npm run format:check` and `git diff --check` before publication. The frozen main fixtures and original baseline stylesheet remain untouched.
