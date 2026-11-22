import { winner } from "../match/scoring";
import * as C from "../challenger/index";
import * as F from "../full-season/index";
import { leagueDone } from "./league";
import { bracketRanks, bracketMatches, bracketDone } from "./bracket";
import { phaseMatches, leagueRanks, regionOf } from "./league";
import type { CircuitSeason, CircuitRegion } from "./types";
/** Versioned rules: win points stay fixed; placement weights increase 1 / 2 / 3 for the integer policy. */
export const upperBonus = (rank: number) =>
  rank === 1
    ? 120
    : rank === 2
      ? 100
      : rank === 3
        ? 80
        : rank === 4
          ? 60
          : rank <= 6
            ? 40
            : rank <= 8
              ? 30
              : rank <= 12
                ? 20
                : 10;
export const lowerBonus = (rank: number) =>
  rank === 1 ? 60 : rank === 2 ? 45 : rank === 3 ? 35 : rank === 4 ? 25 : 0;
export const internationalBonus = (rank: number) =>
  rank === 1
    ? 240
    : rank === 2
      ? 180
      : rank === 3
        ? 140
        : rank === 4
          ? 100
          : rank <= 6
            ? 60
            : rank <= 8
              ? 40
              : 0;
export const integerPointPolicy = (s: CircuitSeason) =>
  s.integerPoints === true || s.stage < 5;
export const placementPoints = (
  _s: CircuitSeason,
  base: number,
  multiplier: number,
) => base * multiplier;
export const leagueMultiplier = (s: CircuitSeason, phase: number) =>
  integerPointPolicy(s) ? [1, 2, 3][phase] : [1, 1.5, 2][phase];
export const challengerMultiplier = (s: CircuitSeason) =>
  integerPointPolicy(s) ? 2 : 1.5;
export function points(
  s: CircuitSeason,
  r: CircuitRegion,
  upper: boolean,
  includeWorld = false,
) {
  const zone = s.regions[r];
  // Compute each competition's standings and wins once for the whole roster.
  const wins = (ms: ReturnType<typeof phaseMatches>) => {
    const counts = new Map<string, number>();
    for (const m of ms)
      if (m.sets) {
        const id = winner(m)!;
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    return counts;
  };
  const phases = Array.from({ length: 3 }, (_, i) => {
    const p = zone.phases[i]?.[upper ? "upper" : "lower"];
    return {
      wins: wins(p ? phaseMatches(p) : []),
      ranks: new Map((p ? leagueRanks(p) : []).map((t) => [t.id, t.from])),
    };
  });
  const first = upper ? s.firstStand : null,
    firstRanks = new Map(
      (first ? bracketRanks(first) : []).map((t) => [t.id, t.from]),
    ),
    firstWins = wins(bracketMatches(first)),
    challenger = upper ? s.challenger : null,
    challengerRanks = new Map(
      (challenger ? C.challengerPlacements(challenger) : []).map((t) => [
        t.id,
        t.from,
      ]),
    ),
    challengerWins = wins(challenger ? C.challengerMatches(challenger) : []),
    w = includeWorld ? s.world : null,
    worldWins = wins(
      w
        ? [
            ...w.groups.flatMap((g) => g.rounds.flat()),
            ...F.worldStages.flatMap((k) => w.bracket?.[k] || []),
          ]
        : [],
    ),
    worldRanks =
      w?.bracket?.final[0]?.sets && w.bracket.bronze[0]?.sets
        ? F.worldPlacements({ world: w } as F.FullSeason)
        : {};
  return (upper ? zone.upper : zone.lower)
    .map((id) => {
      const phase = phases.map((p, i) => {
        const rank = p.ranks.get(id);
        return (
          5 * (p.wins.get(id) || 0) +
          (rank
            ? placementPoints(
                s,
                upper ? upperBonus(rank) : lowerBonus(rank),
                leagueMultiplier(s, i),
              )
            : 0)
        );
      });
      const fr = firstRanks.get(id),
        cr = challengerRanks.get(id),
        wr = worldRanks[id]?.from,
        firstPoints =
          10 * (firstWins.get(id) || 0) + (fr ? internationalBonus(fr) : 0),
        challengerPoints =
          10 * (challengerWins.get(id) || 0) +
          (cr
            ? placementPoints(
                s,
                internationalBonus(cr),
                challengerMultiplier(s),
              )
            : 0),
        worldPoints =
          10 * (worldWins.get(id) || 0) +
          (wr ? placementPoints(s, internationalBonus(wr), 3) : 0);
      return {
        id,
        phase,
        world: worldPoints,
        first: firstPoints,
        challenger: challengerPoints,
        total:
          phase.reduce((a, b) => a + b, 0) +
          firstPoints +
          challengerPoints +
          worldPoints,
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        zone[upper ? "upper" : "lower"].indexOf(a.id) -
          zone[upper ? "upper" : "lower"].indexOf(b.id),
    );
}
export function leagueTickets(s: CircuitSeason, r: CircuitRegion) {
  const p = s.regions[r].phases[2]?.upper,
    b = p?.bracket;
  if (!b) return [];
  if (bracketDone(b))
    return bracketRanks(b)
      .slice(0, 2)
      .map((t) => t.id);
  // Both grand-final participants already own tickets before the title match.
  return b.rounds.length === importPlanLength(b)
    ? b.rounds.at(-1)!.flatMap((m) => [m.a, m.b])
    : [];
}
import { plan } from "./bracket";
const importPlanLength = (b: Parameters<typeof plan>[0]) => plan(b).length;
/** Conservative ceilings deliberately overestimate any unfinished competition. */
export function confirmedByPoints(
  s: CircuitSeason,
  r: CircuitRegion,
  upper: boolean,
  slots: number,
  exclude: string[] = [],
) {
  const rows = points(s, r, upper).filter((t) => !exclude.includes(t.id));
  const z = s.regions[r];
  const remaining =
    Array.from({ length: 3 }, (_, i) => {
      const p = z.phases[i]?.[upper ? "upper" : "lower"];
      return p && leagueDone(p)
        ? 0
        : upper
          ? (integerPointPolicy(s)
              ? [150, s.phaseTwoDouble ? 300 : 290, 430]
              : [150, 230, 310])[i]
          : (integerPointPolicy(s) ? [85, 145, 205] : [85, 115, 145])[i];
    }).reduce((a, b) => a + b, 0) +
    (upper
      ? (!s.firstStand || !bracketDone(s.firstStand) ? 300 : 0) +
        (!s.challenger || !C.challengerComplete(s.challenger)
          ? integerPointPolicy(s)
            ? 540
            : 420
          : 0)
      : 0);
  return rows
    .filter(
      (t) =>
        rows.filter(
          (other) => other.id !== t.id && other.total + remaining >= t.total,
        ).length < slots,
    )
    .map((t) => t.id);
}
export function directTickets(s: CircuitSeason, r: CircuitRegion) {
  const automatic = leagueTickets(s, r),
    p = s.regions[r].phases[2]?.upper;
  return {
    league: automatic,
    points:
      p?.bracket && bracketDone(p.bracket)
        ? points(s, r, true)
            .filter((t) => !automatic.includes(t.id))
            .slice(0, 2)
            .map((t) => t.id)
        : confirmedByPoints(s, r, true, 2, automatic),
  };
}
export function playinTickets(s: CircuitSeason, r: CircuitRegion) {
  const b = s.regions[r].playin?.bracket;
  if (!b) return [];
  const p = plan(b),
    ids: string[] = [];
  p.forEach((stage, i) => {
    if (/[UL]2$/.test(stage.id))
      for (const m of b.rounds[i] || []) if (m.sets) ids.push(winner(m)!);
  });
  return ids;
}
export function qualifiers(s: CircuitSeason, r: CircuitRegion) {
  const direct = directTickets(s, r),
    b = playinTickets(s, r);
  return [...direct.league, ...direct.points, ...b];
}
export function worldQualifiers(s: CircuitSeason) {
  return Object.values(s.regions)
    .flatMap((z) => z.upper.concat(z.lower))
    .filter((id) => qualifiers(s, regionOf(id)).includes(id));
}
