# Mathematical qualification certificates

The UI confirms only proved facts. It does **not** claim to compute the exact
best/worst finishing rank for every team. Unconfirmed means “not yet certified”,
not “a qualifying completion definitely exists”. Some tie cases are deliberately
left undecided until later. There are no probability or current-rank shortcuts.

## Checkpoint and ranking

A checkpoint contains all **fully completed** league rounds. Partial rounds are
excluded. A round's completion order is the greatest `resultOrder` of its games;
legacy games without it fall back to fixture order. All teams at a checkpoint
have played the same number of games. At the end of the league they all play 31,
so ordering W descending also orders L ascending.

Use lexicographic primary totals `T = (W, SD, PD)`, where SD is sets won minus
sets lost and PD is points scored minus conceded. Before the final checkpoint,
an equal tuple is treated as possibly either ahead or behind: head-to-head
mini-table membership can still change. At the final checkpoint use the actual
`V.standings` implementation, including mini-table head-to-head and stored draw.

## Attainable BO5 extrema

All set margins are between 2 and the set target (25, or 15 in set 5).
Deuce cannot increase the margin beyond 2. Arbitrarily long deuce therefore
cannot make **point differential** unbounded.

| Result for the team | SD | Minimum PD | Maximum PD |
|---|---:|---:|---:|
| 3–0 | +3 | +6 | +75 |
| 3–1 | +2 | −19 | +73 |
| 3–2 | +1 | −44 | +61 |
| 0–3 | −3 | −75 | −6 |
| 1–3 | −2 | −73 | +19 |
| 2–3 | −1 | −61 | +44 |

For `r` remaining games and exactly `x` wins, the lexicographic extrema are:

```
optimistic = (W+x, SD+4x−r,  PD+75x+44(r−x))
pessimistic = (W+x, SD+4x−3r, PD−44x−75(r−x))
```

The PD bound is conditional on the SD extremum, which is correct for the
lexicographic comparison. These extrema are attainable per team; they need not
be attainable simultaneously by all teams, so win-flow constraints come next.

## Proving a top-K berth

1. Give target A its worst primary tuple: lose every remaining game 0–3,
   0–25 each set. This also gives every remaining opponent of A a 3–0 win.
2. Remove those target games from the remaining graph. For each rival compute
   the minimum additional wins needed for its optimistic tuple to be **at least**
   A's worst tuple. A tied rival is counted as potentially ahead.
3. Can **K rivals simultaneously** obtain their required number of wins?
   Source → rival (required wins) → remaining game → sink (one win per game)
   is an integral max-flow feasibility problem for any selected set of rivals.
4. To choose a subset, start with every possible rival. On a failed flow, the
   residual cut identifies a conflicting set: at least one of its constraints
   must be removed. Branch on those removals, allowing at most `possible−K`.
5. If every branch is infeasible, fewer than K rivals can be ahead, so A has
   mathematically secured top K.

Why this is safe: in any actual completion, A's tuple is at least its worst
tuple, and replacing A's games by losses can only improve its rivals' primary
tuples. Every rival ahead in a real completion satisfies these relaxed necessary
win requirements. Proving the relaxed scenario impossible proves the real one
impossible as well. A feasible relaxed scenario is **not** a counterexample or a
proof that qualification is still possible.

## Proving elimination from top K

1. Give A its best tuple: win every remaining game 3–0, 25–0 each set. Give its
   remaining opponents the corresponding 0–3 losses; remove these games.
2. For each rival compute the maximum extra wins for which its pessimistic
   tuple is **at most** A's best tuple. Equality is allowed to favour A.
   If even zero extra wins is too many, that rival is unavoidably ahead.
3. Allow at most `K−1` rivals in total to exceed their caps. Remaining games
   must assign exactly one win: source → game → rival → sink (win cap).
4. On an infeasible cut branch on relaxing a rival cap, accounting for already
   unavoidable rivals. If no branch can orient all games within that allowance,
   at least K rivals must be ahead and A is eliminated from top K.

This again relaxes the real problem in A's favour; infeasibility is a certificate.
The search uses at most 96 nodes **per target and cutoff proof** to protect the
browser. A budget exit returns unknown, never an infeasibility certificate.

## UI states and persistence

- Secure top 12 → direct playoff; implies secure top 20.
- Secure top 20 without secure top 12 → at least a play-in berth.
- Secure top 20 **and** eliminated from top 12 → confirmed play-in entrant.
- Eliminated from top 12 → cannot qualify directly; no claim about top 20 unless
  independently proved.
- Eliminated from top 20 → eliminated from the tournament; implies no top 12.

Certificates carry forward through subsequent completed rounds, which only
restrict the set of possible completions. They are reconstructed from scores
and are never persisted as authoritative flags. Editing old scores, importing,
switching accounts or switching seasons rebuilds the appropriate proof chain;
cached checkpoints are keyed by roster, draw order and full checkpoint results.
Notifications compare adjacent checkpoints. A partial round does not emit a new
notification. Play-in pairings and playoff seeds wait for final league ranking.

## Validation

`test-qualification.cjs` checks cut-based certificates on conflicting triangle
fixtures, deliberately exhausted search budgets, all 41,472 combinations of 12
BO5 outcome/point-extreme choices across 24 small remaining graphs, and five
complete 32-team seasons. It also checks persistence after reload, monotonic
certificates, changed scores, out-of-order/partial rounds, final rankings and
the early-entry UI. Enumeration covers the specified endpoint fixtures, not
every possible score in every 496-game season. The safety argument above is what
extends the certificates to all legal results.
