# Full Season implementation

Branch: `feature/full-season-mode`. The approved plan remains in [FULL-SEASON-PLAN.md](FULL-SEASON-PLAN.md). This change does not merge into main.

## Play flow

Choose **Full Season · 100 đội** on the home page, then **Bắt đầu Full Season mới**. Each Full Season independently contains the 100 catalog teams across five fixed round-robin leagues. Multiple Full Seasons may remain in progress at the same time; creating one does not cancel a classic or another full season.

The regional field/qualification allocation is CEV 39/9, AVC 24/5, NORCECA 18/4, CAVB 13/3, CSV 6/3. All 1,263 regional fixtures must have complete results before drawing the world competition. Early mathematical qualification does not unlock it. Odd leagues have a bye; the bye is not a match or a win.

The world draw has four six-team pots based on catalog world rank and six four-team groups, one entrant per pot and at most two per region. The assignment uses finite backtracking with a safety budget. The saved draw and lotteries never change on rendering/reloading.

After all 36 group fixtures, the six winners, six runners-up and best four third-placed teams advance. Third-place comparison uses wins, set difference, point difference and the saved world lottery, without head-to-head across groups. Exact matching pairs four group winners with thirds, the remaining two winners with runners-up, and the other four runners-up with each other; no opening match repeats an original group. Pairings are shuffled into eight fixed slots, then advance through quarterfinals, semifinals, final and bronze. There are 16 knockout fixtures including bronze and 1,315 fixtures in a complete Full Season.

Regional scores lock after the world draw; group scores lock after the knockout draw; knockout scores lock when their successors exist. Completed full seasons are read-only locally and immutable on the server. All matches use the existing BO5 validator, simulation-v2 set engine and progressive score editor, including chosen-result previews. Draft scores do not save until submitted.

## Architecture

- `src/domain/full-season`: standalone types, generic odd/even round robin, existing standings adapter, constrained draws, fixed knockout progression, result order, score editing, final placements and structural validation.
- `src/features/full-season`: UI/library, full-season commands, account-scoped records and cloud coordination.
- `src/data/repositories/full-seasons.ts`: metadata paging, lazy snapshot reads and the full-season CAS RPC.
- `CloudWriter<T>` generalizes the already-tested serial writer; its default type remains the classic Tournament.
- The score editor accepts a guarded full-season context. Classic form validation/commit behavior is preserved, with common input/error presentation.
- Classic production save schema, storage keys, SQL endpoints and career points are unchanged. Only the additional mode entry is excluded from frozen legacy UI comparisons. Production ESM tests exercise the real Full Season path.

## Persistence and account boundaries

Full Season uses `volleyworld-full-guest` and `volleyworld-full-user-<uid>` device keys. Records retain all pending snapshots plus the five latest acknowledged snapshots, while the in-memory session retains opened snapshots. Metadata history is fetched in pages of 100; old snapshots load on demand. Three previous mutation snapshots are retained in the corresponding `-backups` key. Guest data remains in its own scope on sign-in and is never silently adopted by another account.

The new `volleyworld_full_seasons` table stores each independent season with owner, identity, number, status, played count, podium, state, revision and timestamps. RLS restricts SELECT/INSERT/UPDATE to its owner; anonymous access and DELETE are not granted. Metadata/progress/podium are derived in a trigger; the RPC runs as SECURITY INVOKER, validates state, checks expected revision and locks the row for updates. Completed state cannot change; resubmitting the same completed state is idempotent. Creation number conflicts can be rebased during metadata refresh without overwriting another season.

Serial queues capture account epoch and scope. Failed/offline writes keep pending device snapshots. Revision conflicts require the player to choose local or online state, with a device backup before replacement. A completed online season cannot be replaced by a conflicting local alternative; that alternative can be exported. Late reads/writes from an old account cannot modify the newly selected account. A manual save stops waiting when the account changes.

The header save button and footer export/import/new-season actions follow the currently displayed mode. Full Season export uses `volleyworld-full-seasons`, version 1. Import validates every snapshot and creates new season identities/numbers after confirmation, preserving existing history and classic data. Account guards also cover asynchronous import/export and history fetches. Local-storage failures retain in-memory progress, warn the player and leave export available.

## Results and honours

World podium appears once on the summary page. The final table includes all 24 world participants: medals, #4, #5–#8, #9–#16, #17–#18 (nonqualifying thirds), and #19–#24 (fourth-place teams). Teams tied by knockout stage retain grouped ranks. Regional results and world brackets/standings remain accessible through their own sections.

**Thành tích Full Season** reports each country's regional and world finish for every saved full season. It is separate from classic career points. No new point policy or cross-mode points aggregation is invented.

## Verification

- `npm run check`: strict TypeScript, Vite production build, classic regressions/differential tests, architecture constraints, feature tests and actual production ESM/SDK smoke tests.
- `tests/features/full-season.cjs`: 40 full seasons/52,600 fixtures; schedule uniqueness/byes, late gate, quotas, pots/region constraints, stable draws, third-place qualifiers, fixed route, all world placements, invalid states, shared editor, multiple independent seasons, archive immutability and reload.
- `tests/features/full-season-cloud.cjs`: separate guest/account state, CAS/offline retry, immutable history conflict resolution, lazy snapshots, stale account reads/writes, import copies and creation-number conflicts.
- Production ESM test enters Full Season, finishes one region while verifying the gate stays locked, finishes the entire season, checks 1,315 recorded fixtures/24 world placements/one podium, and verifies classic storage did not change.
- `supabase/tests/full_season.sql`: live rollback-only checks for initial/partial/completed saves, revision conflicts, early-world rejection, invalid scores, derived 1,315-match metadata, completed immutability, owner separation and denied reassignment/delete/anonymous operations. Generated snapshots come from the real engine; test users and writes are rolled back.
- Supabase advisors: no performance findings or new-schema security findings. The existing Auth leaked-password-protection warning is unrelated to the new tables; the app uses email-link authentication. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

To reproduce the live SQL contract test, first build the test engine, then run `node scripts/full-season-sql-test.cjs /tmp/volleyworld-full-season-test.sql` and execute that generated SQL through an authorized Supabase SQL connection. Do not execute the unexpanded placeholder template. Browser layout has responsive CSS; DOM/production tests do not constitute a pixel comparison in a real browser.
