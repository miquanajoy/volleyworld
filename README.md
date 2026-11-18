# VolleyWorld Tour

A Vietnamese-language volleyball simulator built around four regions and two tiers: **regional League → First Stand → regional League → Challenger → final regional League → World Cup Play-in → World Cup → Phase 6 promotion**.

Play at [volleyworld.vercel.app](https://volleyworld.vercel.app/). See [the regional circuit specification](docs/REGIONAL-CIRCUIT.md).

- Europe, Asia/Oceania, the Americas and Africa each have 16 Tier 1 and 8 Tier 2 teams. Tier 2 rosters are chosen at the beginning of each season.
- Phase 1: Tier 1 double elimination stops at two regional representatives. Eight teams play First Stand; its grand final is one match with no reset.
- Phase 2: seeded groups and regional double elimination select the final top four representatives per region for the 16-team Swiss Challenger; eight advance to knockout, including bronze.
- Phase 3: groups are redrawn from Phase 2 League seeds. The top eight play double elimination with one grand final. Regional finalists plus two season-points leaders qualify directly for World Cup.
- Each regional Play-in has twelve remaining Tier 1 teams and the top four Tier 2 teams: four GSL groups, then an eight-team double bracket stopped at four tickets.
- World Cup has 32 teams, eight groups and a sixteen-team knockout with bronze. All eight World Cup participants per region are guaranteed Tier 1 next season, joined by eight Phase 6 winners.
- Phase 6: all sixteen non-World-Cup teams per region enter four seeded GSL groups for eight Tier 1 places. Two wins qualify; two losses eliminate. Season points only seed the draw. The UI names tiers “Hạng 1” and “Hạng 2”.
- A full season has 1,175 BO5 matches. Match cards, standings, rank movement, bracket connectors, Swiss visualization, score editor and country profiles reuse the established UI.
- Circuit saves use their own account-scoped cloud table with revision conflicts and offline retention. Old game caches are removed on entry; browser authentication is preserved. Legacy engines remain available as regression fixtures, not as public modes.

## Development

```sh
npm ci
npm run dev
npm run check
npm run format:check
```

Configure Supabase using `.env.example`. Vite accepts only HTTPS project URLs and publishable/legacy-anon client keys; server secrets are rejected. Never place service-role keys in frontend configuration.

## Code layout

- `src/app`: single-mode bootstrap, explicit delegated actions and renderer composition.
- `src/domain`: pure match, standings, qualification, Swiss, knockout and Tour calendar rules.
- `src/features/circuit`: the public circuit UI, scoped cloud saves, roster selection, medals and shared match actions.
- `src/features/tour`: retained legacy renderer and shared components used by the circuit and regression suite.
- `src/features/account`: authentication and Tour-only account lifecycle.
- `src/features/shared/season-cloud.ts`: serial CAS writers, lazy history, offline retry and scope guards.
- `src/components`: shared team/form, editor detail, podium and bracket presentation.
- `src/data`: catalog, repositories and cloud transport.
- `tests/support/legacy-*`: test-only composition of earlier interfaces, preserving historical engine/UI regression checks without including those lobbies in production.

`npm run check` includes pure-domain/property tests, historical regressions, 24 complete Tour seasons, summary/achievement coverage, the actual single-mode UI/account composition and the emitted Vite ESM journey. The production build never initializes standalone save keys or requests standalone season tables.

For rollback-only database parity/CAS checks, see [Tour verification](docs/TOUR.md#verification).
