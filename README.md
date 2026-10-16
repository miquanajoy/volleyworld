# VolleyWorld Simulator

A Vietnamese-language men's volleyball World Cup simulator with 32 national teams.

## Play

- 31-round single round-robin league (496 matches).
- BO5 scoring: sets 1–4 to 25, deciding set to 15, win by two.
- Standings: wins, losses, set difference, point difference, head-to-head, preseason draw.
- Top 12 qualify directly; ranks 13–20 contest four play-in matches.
- Four seeded playoff branches with a fixed path, final and bronze match.
- Simulate matches or enter set scores manually.
- Browser-local autosave and JSON export/import.

The initial team list uses the ranking snapshot dated 13 October 2026 recorded in the app. Simulation is fictional and does not predict actual match results.

## Repository layout

The application uses strict TypeScript, Vite and feature modules. Production bundles are generated; do not edit `dist/`.

| Directory            | Responsibility                                                                   |
| -------------------- | -------------------------------------------------------------------------------- |
| `src/app`            | Bootstrap, typed state, application ports, navigation and delegated actions      |
| `src/domain`         | Pure tournament rules, scoring, standings, qualification and playoff engines     |
| `src/features`       | Setup, league, matches, playoff, seasons and account controllers/views           |
| `src/components`     | Reusable team, form and match markup                                             |
| `src/data`           | Team catalog, version-one migration, storage repositories and serial cloud queue |
| `src/shared`         | DOM helpers and feedback                                                         |
| `src/styles`         | CSS preserved from the main baseline                                             |
| `tests/legacy`       | Original regression assertions, run through a test-only compatibility facade     |
| `tests/parity`       | Deterministic domain/UI/storage comparisons against frozen main                  |
| `tests/integration`  | Execution of the actual production ESM bundle and Supabase SDK in DOM            |
| `tests/architecture` | Dependency boundaries, baseline integrity and global/inline-code guards          |

See [Architecture](docs/ARCHITECTURE.md) and [Refactor validation](docs/REFACTOR-VALIDATION.md).

## Develop and validate

Use **Node.js 24** and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
npm run check
```

`npm run check` performs strict type checking, builds production assets, runs the regression/differential/architecture suites and exercises the built modules. `npm run format:check` checks source formatting. The frozen main fixtures and original CSS are intentionally excluded from formatting.

## Deploy with Vercel

Import this repository into Vercel. Use the repository root as the root directory. The committed configuration sets the output directory to `dist` and runs the checks above. The local game requires no database. The cloud-enabled build installs the exact dependencies from package-lock.json.

## Saving across devices

The website is accessible from any device once deployed. Guest progress is stored separately in each browser. Sign in to sync the active season and archived history through Supabase. JSON export/import remains available for offline transfers and backups.

## Cloud saves (optional)

Cloud saves use Supabase Auth (email magic link) and PostgreSQL. Each account has one active tournament in `public.volleyworld_saves`; each row contains the complete versioned tournament snapshot, revision and update time. Row Level Security restricts access to the owner. Writes use revision checks to prevent one device silently overwriting another.

1. Create a **Free** Supabase project.
2. Apply `supabase/migrations/001_cloud_saves.sql` once in SQL Editor or through migrations.
3. In Authentication URL Configuration, set **Site URL** to the production Vercel URL and allow that exact URL as a redirect. Add other deployment origins only if you intend to use them for login.
4. Enable email authentication. Supabase's default mail service is restricted; for personal use the destination must be an authorized project-team email. For other players, configure custom SMTP with your own email provider.
5. Set Vercel environment variables:
   - `SUPABASE_URL`: project HTTPS URL.
   - `SUPABASE_PUBLISHABLE_KEY`: publishable key (`sb_publishable_...`) or legacy **anon** key.
6. Redeploy Vercel. `scripts/build.cjs` generates browser configuration from these two public values. **Never supply a secret/service-role key**; the build rejects it.
7. Sign in, then explicitly choose whether to continue from the online save or upload the current device's tournament. Further changes save automatically.

No Supabase configuration means the website continues to work with local saves. Local progress is scoped to the signed-in account, while guest progress is retained separately. Up to five local recovery snapshots are kept before resolving save choices. Offline progress is retained locally; reconnect and choose the intended version if devices diverge. The Supabase browser client is bundled at build time from exact, locked package versions; no third-party CDN is required at runtime.

Validate the sync queue and local fallback with `node test-sync.cjs`. Database access tests are in `supabase/tests/rls.sql` and require the configured Supabase database with pgTAP. These SQL tests must pass on the target project before claiming the cloud setup is verified.

The production Supabase project URL and **publishable** key are committed in `supabase/public-config.json`. These are public browser configuration values, protected by ownership RLS; no secret/service-role credentials are in the repository. Vercel environment overrides remain optional.

Production URL: https://volleyworld.vercel.app/ . Supabase Auth Site URL and Redirect URLs must include this exact origin.

## Tournament customization

The **Tùy chỉnh giải đấu** menu keeps the tournament at 32 teams and lets the player change regional quotas:

| Region              | Minimum | Maximum |
| ------------------- | ------: | ------: |
| Europe / CEV        |       2 |      20 |
| NORCECA             |       2 |      12 |
| Asia–Oceania / AVC  |       2 |      12 |
| South America / CSV |       2 |       6 |
| Africa / CAVB       |       2 |       8 |

The catalog includes 100 teams from the ranking snapshot dated 13 October 2026, with regional reserve lists ordered by world rank. These are a fixed game dataset, not a live feed or real-world qualification eligibility list.

Workflow: allocate exactly 32 slots → explicitly remove/add teams until each region matches its quota → review changes → confirm a new tournament. Existing matches are unchanged while editing. Applying a configuration creates a new schedule and resets results, with a local recovery snapshot and an export action available first. The regular **Giải mới** action preserves the selected roster.

Saves remain version 1, with an optional `teamIds` array; older saves without this field use the original 32 teams. Selected teams persist through local/cloud saves and JSON export/import. The database schema is unchanged.

`test-settings.cjs` checks legacy saves, arbitrary custom rosters, full-season progression and the selection/review/confirmation flow.

## Home and season history

The home page shows **Bắt đầu giải đấu của bạn** until the first result is recorded, then **Tiếp tục giải đấu**. Team customization is available from the home page before a season starts; it is removed from the in-tournament tabs.

For a season in progress, starting another season or changing its format offers three explicit choices: finish all remaining matches by simulation and archive the results; cancel the season and archive it as cancelled without a podium; or keep playing. Changing teams before the first match keeps the same season number. Each actual rollover increments the number.

History cards show every season, including the current season's progress and resume action. Completed seasons open read-only with the playoff bracket, gold/silver/bronze teams, and league standings. Cancelled seasons show their partial progress without inventing winners. A season completes only when both the final and bronze match have results.

Supabase stores archived snapshots in `volleyworld_seasons`, separately from the active save. Ownership RLS and insert-only grants protect history. `save_volleyworld_with_history` writes the active state and pending archives atomically under the existing revision check. Archived results cannot be overwritten. The browser loads historical metadata in pages and fetches older snapshots on demand, keeping at most five synced snapshots in its persisted local cache while retaining pending offline archives. Full history can be exported/imported with the active season; older single-season JSON saves remain accepted.

Apply the season history migration before deploying the new client. `supabase/tests/season_history.sql` checks atomic rollover, archive immutability, revision conflicts, RLS and rollback. `test-seasons.cjs` covers home labels, lock/finish/cancel flows, read-only history, numbering, persistence and export/import.

## Manual save, recent form and score entry

The header **Lưu tiến trình** button saves locally and requests an immediate cloud flush when signed in and the save source has been resolved. Its success message is based on a confirmed server response. Signed-out/offline/conflict states explicitly distinguish local retention from cloud confirmation. Automatic saves remain enabled.

Match cards and the score editor show five form slots: green W for wins, red L for losses, gray placeholders for missing results. Completed matches are shown oldest to newest, with the latest at the right, across league, play-in and playoff within the same season. New results get a persistent `resultOrder` when first saved; editing a score preserves its order. Legacy results without this metadata use canonical fixture order without modifying immutable archived snapshots.

The score editor previews the set tally only after at least one pair of inputs is filled. Partial/invalid sets do not add wins to that tally. Custom validation is shown immediately below the affected set, marks its inputs, scrolls to the first error and focuses the field to correct. Validation covers incomplete pairs, gaps, non-integer/negative values, target points, win-by-two/deuce, a fifth set to 15, missing deciding sets and extra sets after the match has ended. Invalid drafts never change the recorded match.

`test-match-ui.cjs` verifies form chronology, persistence, preview and per-set validation/focus. Manual save success, unresolved source and offline cases are covered by the cloud integration and local fallback tests.

## Early qualification

The league now announces mathematically certified top-12/top-20 berths and eliminations after completed rounds, adds status badges to the standings, and lists early direct/play-in entrants under Play-in & Playoff. Partial rounds do not change certification. Scores are the source of truth, so old saves work without a migration and edits recompute the proof chain. Unproved cases stay “Chưa chốt”; the bounded solver never converts a timeout into a qualification/elimination. See [QUALIFICATION.md](QUALIFICATION.md) for formulas, flow-cut proofs, tie handling and verification scope.

The standings include a league-only last-five form strip (oldest to newest) and a Chi tiết button per team. It opens all 31 league fixtures in round order, showing team-relative set scores and W/L for completed matches; future scores remain blank. This view also works on archived seasons without changing active progress.

## Playoff views

Playoff defaults to four color-coded branch panels, each connecting two round-of-16 matches to its quarterfinal. The final stretch identifies A/B and C/D semifinal paths, the championship match and bronze. The full-tree switch shows the same fixed bracket with CSS connectors and a horizontal scroll region. Match tiles retain form, seeds and scores; opening one shows sets and available simulate/edit actions. Known winners can preview pending slots without creating later matches. Play-in results collapse once the draw exists. Both views support archived read-only seasons.

League match cards now align form and set-score columns and anchor actions to the card bottom. The standings use explicit column widths with centered statistic/form headings and cells. Rank badges before flags in match tiles and the score editor use the current league table of the displayed season; archived seasons use their own table. The standings retain their existing position column.

## Playoff format per season

Before any match starts, Tùy chỉnh thể thức offers single or double elimination. Legacy saves without playoffFormat retain single elimination. A new season inherits the last selection and can be changed before it starts. League qualification, the four single-elimination play-in games, seed pools and the initial draw are unchanged.

Double elimination uses 15 upper-bracket games, 14 lower-bracket games, and one or two grand-final games. Upper rounds retain r16/qf/sf/final; lower1–lower6 receive losers through fixed crossed routes to reduce early rematches. The upper finalist is gf.a. If gf.b wins, reset G1 is created with the same sides; otherwise the tournament completes after G0. Bronze is the loser of lower6. The season totals 530 or 531 games.

The engine's playoffStages graph owns routing, display-slot previews, edit locks, auto-finish order and imported-save validation. No stage may start before its source results exist. Results become locked whenever a dependent stage is created. Double saves must include all ready stages, including a required reset. V.podium, V.complete and V.totalMatches drive season completion, history and progress; the upper final is never treated as the world final.

Double playoff has separate upper/lower/grand-final views, with the existing branch/tree layouts for the upper bracket. Archived seasons retain their own mode and remain read-only. The cloud history played constraint is expanded from 516 to 531 without changing ownership policies or archive immutability.

Validation includes 40 double seasons forced through both grand-final outcomes, 16 auto-finished seasons across both modes, exact two-loss elimination checks, crossed lower entries, reset/no-reset UI, format draft/apply/lock, history/export/import and cloud archive roundtrips. The live SQL tests in supabase/tests/double_elimination.sql exercise 530/531 storage, rejection at 532, atomic rollback and owner isolation, rolling back all fixtures.
