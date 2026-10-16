# Completed season summary

Completed season results show one podium followed by final placements for the 20 teams that reached Play-in or playoffs. Placements reuse the existing domain classification used by achievements; teams eliminated at the same stage retain a shared rank and are displayed in league order within that group.

The fixed single-elimination groups are 1, 2, 3, 4, 5–8, 9–16 and 17–20. Double elimination uses 1, 2, 3, 4, 5–6, 7–8, 9–12, 13–16 and 17–20. Each row shows the team and its final achievement or elimination stage.

Playoff results and the complete 32-team league standings remain available in initially collapsed native disclosure sections. Changing playoff layout or double-elimination branch preserves which sections are open. Match detail and league team dialogs remain read-only for archived seasons. The embedded playoff renderer omits its additional podium on the summary page; live tournament podiums remain unchanged. Canceled seasons retain their existing progress presentation.

No save, database or scoring contract changes are introduced. `tests/features/season-summary.cjs` exercises both formats, all 20 placements, one podium, four Play-in exits, all 32 league rows, disclosure state, match details and snapshot immutability. Legacy differential tests retain header/podium and data comparisons; the intentionally redesigned summary content is verified by the feature suite.
