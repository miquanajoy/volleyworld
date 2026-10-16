# League timeline, honours and season onboarding

Implemented on `refactor/typescript-feature-architecture`, following the architecture-only commit `1d026948be937b6c743859f48c773672ac3e3940`. Main and production are not changed by this branch update.

## League-round history and navigation

The league schedule renders qualification news for the selected round, rather than the latest completed round. Reports use the prefix of completed rounds at that round's actual completion, determined by existing `resultOrder`. Partial rounds have no confirmed report. Legacy saves without result ordering fall back to scheduled order, as before. The standings and Playoff overview continue to show the latest status.

No redundant proof snapshots are saved. Reload/import reconstructs the same timeline from scores. Correcting a historical result recomputes affected reports, rather than keeping stale qualification claims. The domain test compares every one of 31 historical reports before/after later results, plus reload, corrections and out-of-order completion.

The main schedule button is:

- An incomplete round: **Chạy vòng X**.
- A finished round before 31: **Qua vòng tiếp theo**.
- Finished round 31 with the league complete: **Qua giai đoạn Play-in**. It creates Play-in pairings once, then opens that phase.
- Finished round 31 while other rounds remain unfinished: **Tới vòng chưa hoàn tất**. It returns to the first unfinished round instead of suggesting qualification is final.

Revisiting the button never resets an existing Play-in or its scores.

## Form alignment and podium

The score editor and league match cards use fixed form columns. Hidden live set scores reserve their score column, so entering the first complete set does not shift form strips. Bracket rows reserve form/seed/score columns too. Responsive overrides are isolated in `src/styles/enhancements.css`; the original stylesheet remains untouched.

The playoff dashboard has separate gold, silver and bronze cards. Single elimination awards silver immediately after the final, even if the bronze match remains pending. Double elimination awards medals only after the decisive grand final; a lower-bracket win in GF1 does not prematurely award silver before the reset. Archived results retain their medal header.

## National-team honours

A global **Thành tích** entry is available on the home hero and tournament navigation. Select a region, then any team from the full regional catalog. Each known season has an explicit SS number and result. Gold/silver/bronze use medals; fourth and subsequent finishes use ranks or tied knockout groups.

| Stage of elimination              | Single elimination       | Double elimination       |
| --------------------------------- | ------------------------ | ------------------------ |
| Championship / runner-up / bronze | 1 / 2 / 3                | 1 / 2 / 3                |
| Fourth                            | Loser of bronze match    | Loser of lower round 5   |
| Quarterfinal / lower round 4      | 5–8                      | 5–6                      |
| Lower round 3                     | —                        | 7–8                      |
| Round of 16 / lower round 2       | 9–16                     | 9–12                     |
| Lower round 1                     | —                        | 13–16                    |
| Play-in                           | 17–20                    | 17–20                    |
| League elimination                | Exact league ranks 21–32 | Exact league ranks 21–32 |

Non-participation is shown as `-`; canceled and unfinished seasons have distinct labels. Uncached history uses existing scoped snapshot reads, with at most four requests concurrently. Medal metadata can establish top-three placement without a snapshot. Otherwise unavailable/offline data is shown as unknown with retry, never as non-participation. Responses from a previous account or obsolete selection cannot overwrite the visible panel.

## Mandatory initial setup

The separate customization button is removed. Starting an unconfigured season opens format/quota/team setup. Confirming enters the league and saves an optional boolean `setupConfirmed` on the version-one tournament. Reload retains this confirmation. Started legacy seasons continue normally; unstarted legacy seasons go through setup. Every newly created season must confirm its setup. No SQL schema or API change is needed.

## Verification

`npm run check` runs original regressions, domain differential tests, legacy-contract DOM comparisons, feature tests, architecture checks and execution of the real production ESM/Supabase bundle.

The earlier UI parity suite now explicitly excludes the approved new honours entry, podium cards, per-round news, next-round CTA and setup-confirmation field. It still compares the remaining markup, all scores/fixtures/seeds/history and saved data. Four legacy assertions were updated for the new setup flow/podium labels. Dedicated feature tests verify those changed behaviors directly, including actual DOM clicks, score input, reload and asynchronous archive reads.

The placement suite checks all 32 finishes across 24 full single/double seasons. The UI suite checks mandatory setup, partial/final-round controls, non-destructive Play-in transitions, fixed form columns, single/double/reset podiums, region selection, all-season history, non-participation, canceled/unfinished seasons, offline reads and stale-account responses.

Actual desktop/mobile screenshot comparison remains unverified: the browser connector cannot obtain the originating browser context. DOM/CSS checks are not claimed as pixel rendering tests.
