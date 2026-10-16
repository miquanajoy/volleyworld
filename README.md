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

No Supabase configuration means the website continues to work with local saves. Local progress is scoped to the signed-in account, while guest progress is retained separately. Up to five local recovery snapshots are kept before resolving save choices. Offline progress is retained locally; reconnect and choose the intended version if devices diverge. Browser cloud sync requires access to the Supabase JavaScript client CDN.

Validate the sync queue and local fallback with `node test-sync.cjs`. Database access tests are in `supabase/tests/rls.sql` and require the configured Supabase database with pgTAP. These SQL tests must pass on the target project before claiming the cloud setup is verified.
