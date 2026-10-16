import { matches } from "../tournament/matches";
import type { FormResult, TeamId, Tournament } from "../types";
import { score, winner } from "./scoring";

export function recentForm(s: Tournament, id: TeamId): FormResult[] {
  return matches(s)
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => m.sets && (m.a === id || m.b === id))
    .sort((a, b) => {
      const x = Number.isSafeInteger(a.m.resultOrder),
        y = Number.isSafeInteger(b.m.resultOrder);
      return (
        Number(x) - Number(y) ||
        (x ? a.m.resultOrder! - b.m.resultOrder! : a.index - b.index) ||
        a.index - b.index
      );
    })
    .slice(-5)
    .map(({ m }) => {
      const a = m.a === id,
        [x, y] = score(m);
      return {
        win: winner(m) === id,
        opponent: a ? m.b : m.a,
        score: a ? [x, y] : [y, x],
        matchId: m.id,
      };
    });
}
