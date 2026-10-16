# Refactor validation

Baseline: `miquanajoy/volleyworld@2b77b1f3b20d53f7471c3a0d5a6bf78fd71287ff`.
Branch: `refactor/typescript-feature-architecture`.

## Automated evidence

| Check                      | What is verified                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original main suite        | Fresh baseline run passes before the refactor                                                                                                                                                  |
| Type checking              | Strict TypeScript, unused locals/parameters, no check suppression or blanket `any`                                                                                                             |
| Legacy regressions         | Original assertions retained through a test-only facade: schedules, standings, BO5, roster changes, single/double bracket routes/reset, history, score errors, form, qualification and sync    |
| Differential engine        | 40 complete seasons, both formats, identical serialized state and standings at 1,240 league-round checkpoints; matching draws, routes, podium, form, catalog and cross-version save validation |
| Differential qualification | 62 completed/out-of-order round reports and edited-result recomputation compared with main                                                                                                     |
| Differential UI/storage    | 47 rendered-view and storage checkpoints covering setup, score input/error focus, league, Play-in, branches/tree, lower/grand views, finished seasons, archives, export and reload             |
| Delegated actions          | Original inline handlers vs new delegated handlers: quota/checkbox/review/apply, round controls, team dialog, season cancellation, account dialog and manual save                              |
| Cloud integration          | Mocked real API contract: login/session switch, account isolation, archive rollover, CAS conflict choices, offline retention, manual-save result and logout                                    |
| Built-module integration   | Actual emitted Vite ESM and actual bundled Supabase SDK initialize; guest setup/start/simulation/table/account/manual-save work without DOM runtime errors or leaked test APIs                 |
| Build config               | Paired overrides, HTTPS-only endpoint and browser-safe key restrictions preserved                                                                                                              |
| Architecture               | Pure domain/data boundaries, frozen fixture integrity, no production app globals, `eval` or inline executable handlers                                                                         |
| CSS                        | Byte-identical source stylesheet, including responsive media rules                                                                                                                             |

Reproduce with Node.js 24:

```sh
npm ci
npm run format:check
npm run check
```

The qualification regression also enumerates 41,472 BO5 endpoint completions, and the original suites exercise 30 single-elimination, 40 double-elimination and 18 custom-roster full seasons. These are in addition to the differential runs.

## Limits and release gate

DOM verification does not provide pixel rendering, mobile layout measurements or real-browser screenshots. The connected browser was unavailable in this session because the originating browser context could not be acquired. Therefore screenshot comparison on desktop/mobile and an authenticated two-real-device smoke test remain **unverified**. Cloud tests use an isolated mock contract and do not write to the user's production database.

The branch is prepared for review; this report does not claim zero possible defects or approve a merge. Before merging, check the preview in a real browser, compare representative desktop/mobile views with main, and exercise signed-in save/reload with a disposable season. Production and `main` must remain unchanged until that gate is complete.
