# VolleyWorld Tour

A Vietnamese-language men's volleyball simulator built around one full-season journey: **World League → regional qualification → Challenger → World Cup**. The eight-event calendar keeps every competition's results and gives each season three independent titles.

Play at [volleyworld.vercel.app](https://volleyworld.vercel.app/). See [Tour rules and architecture](docs/TOUR.md).

- Choose one fixed 32-country roster for League and Challenger: Europe 7, Asia/Oceania 7, South America 6, North/Central America/Caribbean 7, Africa 5.
- League uses 31 rounds in three calendar windows (10 + 10 + 11), then the original single-elimination qualification: top 12 direct, ranks 13–20 in Play-in, 16 playoff teams. Bronze precedes the final.
- Challenger uses a five-round Swiss stage, regional separation in round one and no Swiss rematches, followed by a fixed 16-team playoff.
- Teams outside League enter regional selection for 16 World Cup Play-in places. World Cup starts only after Play-in and the League final are complete.
- New feature-branch seasons use **World Cup 32**, Challenger top-two tickets and 16 League playoff tickets, followed by World Cup Play-in. World Cup entrants become the next League roster; only the first season selects teams. The first season has 833 matches; later totals vary. See [career32 rules](docs/TOUR-CAREER32.md). Legacy and merit24 saves retain their original rules. Manual scores, set-by-set simulation, selected scoreline generation and five-match form share the same match components.
- Completed season pages and history cards show all three podiums. Country profiles show each season's League, Challenger and World Cup achievement, including tied knockout placements and non-participation.
- Career32 preview is local-only with export/import and chain reset; it does not write production data. Legacy seasons retain account-isolated cloud saves and CAS conflict handling.

Tour is the only public mode. The standalone experimental lobbies and writers have been removed; Nations League source and active write access have been retired. Historical SQL migrations remain for reproducible database upgrades. The domain modules behind League, Challenger and World Cup remain reusable competition engines within Tour.

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
- `src/features/tour`: selection, journey, three-title summaries, country achievements, score actions and account-scoped season model.
- `src/features/account`: authentication and Tour-only account lifecycle.
- `src/features/shared/season-cloud.ts`: serial CAS writers, lazy history, offline retry and scope guards.
- `src/components`: shared team/form, editor detail, podium and bracket presentation.
- `src/data`: catalog, repositories and cloud transport.
- `tests/support/legacy-*`: test-only composition of earlier interfaces, preserving historical engine/UI regression checks without including those lobbies in production.

`npm run check` includes pure-domain/property tests, historical regressions, 24 complete Tour seasons, summary/achievement coverage, the actual single-mode UI/account composition and the emitted Vite ESM journey. The production build never initializes standalone save keys or requests standalone season tables.

For rollback-only database parity/CAS checks, see [Tour verification](docs/TOUR.md#verification).
