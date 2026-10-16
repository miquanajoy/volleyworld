# Simulation v2 — controlled upsets and score previews

Implemented on `feature/full-season-mode`. This improves the existing tournament simulator; Full Season itself remains planned in `FULL-SEASON-PLAN.md`. No database migration or save format change is introduced, and existing recorded scores are not regenerated.

## Strength and upsets

The probability that team A wins one set is:

```text
p = 0.5 + 0.35 × tanh((ratingA − ratingB) / 180)
P(A wins BO5) = p³ × [1 + 3(1−p) + 6(1−p)²]
```

Set outcomes are independent conditional on the catalog ratings. Equal strength gives 50% match odds, swapping teams reverses the probability, and a larger rating advantage increases win probability monotonically. Set probability stays between 15% and 85%; consequently the stronger team's match loss probability is always at least 2.6611875%. This is a game balancing policy, not an empirical minimum loss rate in real volleyball.

There is no additional forced-upset roll, no guaranteed win, and no hidden alteration based on league position or recent results. Ordinary simulation, round/season simulation and the per-set button use the same set engine. User-selected results intentionally override outcome odds.

Reference: FIVB's explanation models all six match outcomes from ranking scores and historical match data: https://www.fivb.com/fivb-launches-advanced-world-ranking-system/ . This implementation does not reproduce or claim to calibrate the official FIVB model.

## Set scores

Sample the winning side first, then the final score conditional on that side. Define:

```text
d = |tanh((ratingA − ratingB) / 180)|
    × tanh(|worldRankA − worldRankB| / 12)
    × (1 if the stronger side wins, otherwise 0.3)
```

The rank-distance factor specifically reduces lopsided sets between neighboring world-ranked teams even when their rating gap is substantial. The weaker side's winning set is also less likely to be a rout.

| Score bucket            |           Probability | Sets 1–4: loser's points          | Set 5: loser's points     |
| ----------------------- | --------------------: | --------------------------------- | ------------------------- |
| Large margin            |          0.01 + 0.14d | 0–15, strongly weighted toward 15 | 0–8, weighted toward 8    |
| Medium margin           |          0.07 + 0.20d | 16–18                             | 9–10                      |
| Close regulation finish | Remaining probability | 19–23, weighted toward 23         | 11–13, weighted toward 13 |
| Deuce                   |          0.14 − 0.08d | 24+                               | 14+                       |

Deuce extensions have a geometric tail with continuation factor 0.45. The winner always leads by exactly two in extended sets. Sampling has no rejection loop. At zero strength distance the buckets are 1%, 7%, 78%, 14%. All percentages are proposed gameplay weights, not fitted tournament statistics.

## Editor behavior

- A new score draft shows only Set 1. A small accessible play button appears beside the next playable set.
- A completed valid set reveals the next set. After a third set win, no further empty row is shown. Set 5 is possible only after 2–2.
- Partially entered or invalid sets block subsequent set simulation. Filled invalid rows remain visible so the player can correct them; saving identifies and focuses the first erroneous set.
- The reset arrow explicitly clears that set and every following set. Earlier edits do not silently destroy later entered scores; invalid post-finish scores are rejected until corrected or cleared.
- The optional “Tạo kết quả theo ý bạn” section selects a winner and 3–0, 3–1 or 3–2. Its copy explicitly states it replaces all draft scores. The final set is always won by the chosen winner; the preceding sequence cannot finish the match early.
- All generated points are editable previews. No match/standings/form/history/cloud changes occur until the existing Save submission validates and commits the complete match. Cancel discards the preview.
- Existing matches open with their recorded sets. Locked, archived, closed-dialog and stale season/account previews cannot use the new simulation actions.

## Verification

`tests/features/simulation-v2.cjs` uses a deterministic random source for 300,000 complete matches over five catalog pairings. It checks all six outcome probabilities against the analytic model, score legality, monotonicity, symmetry, the upset floor, close-team score tails, endpoint random values and 3,000 chosen-result previews. DOM tests exercise progressive set buttons, repeated clicks, incomplete/invalid input, all six chosen outcomes, cancel, save, reopening and unchanged draft storage. The real production ESM test also clicks these new controls and verifies that only Save persists the result.

The original frozen simulation is intentionally retained in **test-only differential bundles** to compare unchanged tournament rules and legacy UI/data behavior with identical score inputs and RNG consumption. Production and normal feature/regression tests use the new model. The differential editor comparison normalizes the explicitly approved progressive controls; dedicated feature tests cover their actual behavior. Frozen main fixture files are unchanged.
