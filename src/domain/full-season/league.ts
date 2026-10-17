import { get } from "../../data/teams";
import { standings } from "../league/standings";
import { simulate } from "../match/simulation";
import { shuffle } from "../shared/random";
import type { Match, TeamId, Tournament } from "../types";
import type { FullLeague } from "./types";
export function fullLeague(ids: TeamId[], prefix: string): FullLeague {
  const ring: (string | null)[] = shuffle(ids);
  if (ring.length % 2) ring.push(null);
  const rounds: Match[][] = [],
    n = ring.length;
  for (let r = 0; r < n - 1; r++) {
    const round: Match[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i],
        b = ring[n - 1 - i];
      if (a && b) round.push({ id: `${prefix}-${r}-${i}`, a, b, sets: null });
    }
    rounds.push(round);
    ring.splice(1, 0, ring.pop()!);
  }
  return { teamIds: [...ids], rounds, tie: shuffle(ids) };
}
/** The standings algorithm already supports arbitrary roster sizes. */
export function fullStandings(league: FullLeague) {
  return standings({
    ...league,
    version: 1,
    playin: null,
    bracket: null,
  } as Tournament);
}
export const fullLeagueDone = (league: FullLeague) =>
  league.rounds.every((r) => r.every((m) => m.sets));
export const leagueMatches = (league: FullLeague) => league.rounds.flat();
export function simulateLeague(league: FullLeague, round?: number) {
  const matches =
    round === undefined ? leagueMatches(league) : league.rounds[round] || [];
  matches.filter((m) => !m.sets).forEach(simulate);
}
export function compareThirds(
  a: ReturnType<typeof fullStandings>[number],
  b: ReturnType<typeof fullStandings>[number],
  tie: TeamId[],
) {
  return (
    b.w - a.w ||
    b.sf - b.sa - (a.sf - a.sa) ||
    b.pf - b.pa - (a.pf - a.pa) ||
    tie.indexOf(a.id) - tie.indexOf(b.id)
  );
}
export function fullForm(matches: Match[], id: TeamId) {
  return matches
    .filter((m) => m.sets && (m.a === id || m.b === id))
    .sort((a, b) => (a.resultOrder || 0) - (b.resultOrder || 0))
    .slice(-5)
    .map((m) => ({
      win:
        m.sets!.filter(([a, b]) => (m.a === id ? a > b : b > a)).length === 3,
      opponent: get(m.a === id ? m.b : m.a).name,
    }));
}
