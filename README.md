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

- `dist/`: deployable static website, no dependencies.
- `test.cjs`: tournament engine checks, including 30 complete seasons.
- `vercel.json`: static hosting configuration; checks run before deployment.

## Validate

Requires Node.js; no packages need installing.

```sh
node --check dist/engine.js
node --check dist/app.js
node test.cjs
```

## Deploy with Vercel

Import this repository into Vercel. Use the repository root as the root directory. The committed configuration sets the output directory to `dist` and runs the checks above. No environment variables, database or build dependencies are required.

## Saving across devices

The website is accessible from any device once deployed. Progress is stored separately in each browser, not in a shared account. Choose **Xuất tiến độ** on the old device and **Nhập tiến độ** on the new device to continue the same tournament.
