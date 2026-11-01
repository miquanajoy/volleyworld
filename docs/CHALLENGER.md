# VolleyWorld Challenger

Challenger is the fourth, independent mode. Existing World League, World Cup and Nations League seasons keep their own storage and rules.

## Format

- 32 selected national teams from the 100-team catalog, seeded by the catalog ranking snapshot. Setup opens before creating a season. Each region needs at least 2 teams; caps are Europe 16, Asia 12, NORCECA 12, Africa 8 and South America 6. The 16-team ceiling guarantees that regional separation is feasible in round one.
- Opening round pairs the top 16 seeds against the lower 16. A bipartite augmenting-path matching ensures every opener is between different regions, without abandoning seed protection.
- Rounds 2–5 randomly pair active teams with exactly the same wins and losses. A complete matching search with failed-state memoization avoids all earlier Swiss opponents; it never silently falls back to a rematch.
- Three wins qualify a team; three losses eliminate it. Departed teams no longer receive fixtures. All matches are BO5 using the existing scoring and simulation engine.
- Round sizes are 16, 16, 16, 12 and 6 matches: **66 Swiss matches**. Sixteen qualifiers finish at 3–0 (four), 3–1 (six) or 3–2 (six).
- Drawing a subsequent Swiss round locks previous results. Until the next draw, completed matches in the current round can be edited. Future fixtures are never generated before the preceding round finishes.
- Playoffs use seed bands 1–4 for 3–0, 5–10 for 3–1, and 11–16 for 3–2, with a random draw inside each band. Standard seeded placement distributes the four undefeated teams across the four quarters. The bracket remains fixed after this draw.
- Swiss rematch protection ends at the playoff. Opponents may meet again in knockout matches, and may share a region.
- Sixteen knockout matches, including bronze before the final, produce **82 matches per complete season**. The podium shows silver and bronze as soon as their results exist.

## Selection and Swiss diagram

The confirmation step is required for new seasons. Players can add/remove teams, browse regions, review the selected roster and restore the default selection. Existing seasons without any played matches can edit their roster without changing season identity. Once any match has been played, both the UI and database forbid changing the roster.

The Swiss view defaults to a connected W/L lattice: 15 record/result nodes, 18 win/loss transitions and all five rounds. Match buttons show national flags, names and scores and open the shared detail/editor. Future groups show known teams waiting for a draw, never fabricated opponents. The 3–0 / 3–1 / 3–2 and 0–3 / 1–3 / 2–3 result panels update after individual matches. Earlier rounds hide later draws/results, and horizontal scroll survives simulation and editor saves. A list-view switch keeps the familiar match-card layout available.

## Standings and history

Display order: wins descending, losses ascending, opponents' match-win percentage (OMW%) descending, set difference, point difference, and the preseason random order stored in `tie`. OMW% is the arithmetic mean of each faced opponent's `wins / matches played`, using only the Swiss results through the selected round. It is a display tiebreaker: berth eligibility always depends on reaching three wins.

All Swiss groups, standings, team histories and fixture form strips can be viewed at earlier rounds without exposing later results. Completed summaries have a single podium, all 32 placements, and expandable playoff and final Swiss standings. Teams eliminated in Swiss share #17–#32; other knockout finishes share the appropriate rank band.

## Persistence and account boundaries

- Guest key: `volleyworld-challenger-guest`; account key: `volleyworld-challenger-user-<uid>`.
- Export format: `volleyworld-challenger-seasons`, version 1. Imports validate every season and create new IDs / season numbers.
- Three preceding snapshots are retained as browser backups. Restore requires explicit confirmation and completed seasons remain read-only.
- Cloud table: `public.volleyworld_challenger_seasons`; RPC: `save_volleyworld_challenger_season`. The shared season-cloud adapter provides serial compare-and-swap writes, offline retention/retry, lazy history loading, account separation and explicit conflict resolution. The existing save button routes to this mode.
- RLS requires ownership for SELECT, INSERT and UPDATE, including UPDATE WITH CHECK. Anonymous access is denied. The RPC uses SECURITY INVOKER. A trigger derives status, played count and podium, protects identity metadata, and prevents overwriting completed seasons.
- Client and database validators independently verify the selected roster, regional quotas, opener seed/region rules, same-record matching, active-team participation, no rematches, valid BO5 scores, unique chronological result orders, playoff seed bands, exact winner/loser routes, and bronze-before-final chronology.

## Verification

`npm run check` includes existing-mode regression/parity, the 500-season default-roster and 80-season custom-roster Challenger property suites, delegated UI, cloud transport tests and the actual production ESM journey.

```sh
node scripts/build-test.cjs
node tests/features/challenger.cjs
node tests/features/challenger-ui.cjs
node tests/features/challenger-cloud.cjs
node tests/features/challenger-setup-tree.cjs
node scripts/challenger-sql.cjs
```

The last command emits `.test-build/challenger-readonly.sql` and `.test-build/challenger-verification.sql`. Run the generated queries against the migrated project to verify 21 valid / 12 invalid JS–SQL fixtures. The write test selects an existing owner only for foreign-key validation and uses a randomly generated season ID with a season number rebased above existing saves. Every trial save is enclosed in a subtransaction that deliberately rolls back. It tests stale CAS, derived completion, completed-state immutability, RLS separation, and anonymous denial without creating Auth users or leaving test progress.
