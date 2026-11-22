import { winner, loser } from "../match/scoring";
import { shuffle } from "../shared/random";
import { bracket, bracketMatches } from "./bracket";
import { leagueRanks } from "./league";
import { points, qualifiers } from "./points";
import type { CircuitSeason, CircuitRegion, PromotionRound } from "./types";
export function promotionEntrants(s: CircuitSeason, r: CircuitRegion) {
  const safe = qualifiers(s, r),
    z = s.regions[r];
  return [...z.upper, ...z.lower].filter((id) => !safe.includes(id));
}
export function promotionSeeds(
  s: CircuitSeason,
  r: CircuitRegion,
  tie: string[],
) {
  const z = s.regions[r],
    totals = new Map(
      [...points(s, r, true, true), ...points(s, r, false, true)].map((t) => [
        t.id,
        t.total,
      ]),
    );
  const ranks = [2, 1, 0].map(
    (p) =>
      new Map(
        [
          ...(z.phases[p] ? leagueRanks(z.phases[p].upper) : []),
          ...(z.phases[p] ? leagueRanks(z.phases[p].lower) : []),
        ].map((t) => [t.id, t.from]),
      ),
  );
  return promotionEntrants(s, r).sort((a, b) => {
    const d = totals.get(b)! - totals.get(a)!;
    if (d) return d;
    for (const rank of ranks) {
      const diff = (rank.get(a) ?? 99) - (rank.get(b) ?? 99);
      if (diff) return diff;
    }
    return tie.indexOf(a) - tie.indexOf(b);
  });
}
export function drawPromotion(
  s: CircuitSeason,
  r: CircuitRegion,
): PromotionRound {
  const tie = shuffle(promotionEntrants(s, r)),
    seeds = promotionSeeds(s, r, tie);
  if (seeds.length !== 16)
    throw Error("Vòng tranh suất cần đúng 16 đội không dự World Cup.");
  const pots = [0, 1, 2, 3].map((i) => shuffle(seeds.slice(i * 4, i * 4 + 4)));
  return {
    seeds,
    tie,
    pots,
    groups: [0, 1, 2, 3].map((i) =>
      bracket(
        "gsl",
        pots.map((p) => p[i]),
        r + "PRG" + i,
      ),
    ),
  };
}
export function promotionStatus(
  s: CircuitSeason,
  r: CircuitRegion,
  id: string,
): "safe" | "qualified" | "eliminated" | "pending" {
  const g = s.regions[r].promotion?.groups.find((g) => g.seeds.includes(id));
  if (!g) return qualifiers(s, r).includes(id) ? "safe" : "pending";
  const ms = bracketMatches(g).filter((m) => m.sets);
  if (ms.filter((m) => winner(m) === id).length >= 2) return "qualified";
  return ms.filter((m) => loser(m) === id).length >= 2
    ? "eliminated"
    : "pending";
}
export function promotionWinners(s: CircuitSeason, r: CircuitRegion) {
  return (s.regions[r].promotion?.groups || []).flatMap((g) => {
    const wins = new Map<string, number>();
    for (const m of bracketMatches(g))
      if (m.sets) {
        const id = winner(m)!;
        wins.set(id, (wins.get(id) || 0) + 1);
      }
    return g.seeds.filter((id) => (wins.get(id) || 0) >= 2);
  });
}
