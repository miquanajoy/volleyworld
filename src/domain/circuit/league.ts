import { circuitCatalog, get } from "../../data/teams";
import {
  fullLeague,
  fullLeagueDone,
  fullStandings,
} from "../full-season/league";
import { shuffle } from "../shared/random";
import { bracket, bracketDone, bracketRanks } from "./bracket";
import type { CircuitRegion, RegionalPhase, CircuitZone } from "./types";
export const regionOf = (id: string): CircuitRegion =>
  get(id).region === "CSV" ? "NORCECA" : (get(id).region as CircuitRegion);
export const pool = (r: CircuitRegion) =>
  circuitCatalog
    .filter((t) => regionOf(t.id) === r)
    .sort((a, b) => a.rank - b.rank)
    .map((t) => t.id);
export const defaultUpper = (r: CircuitRegion) => pool(r).slice(0, 16);
export const defaultLower = (r: CircuitRegion, upper: string[]) =>
  pool(r)
    .filter((id) => !upper.includes(id))
    .slice(0, 8);
export function seededGroups(seeds: string[], prefix: string) {
  const groups: [string[], string[]] = [[], []];
  for (let i = 0; i < seeds.length; i += 2) {
    const pair = shuffle(seeds.slice(i, i + 2));
    groups[0].push(pair[0]);
    groups[1].push(pair[1]);
  }
  return groups.map((ids, i) => fullLeague(ids, prefix + "G" + i));
}
export function newPhase(
  seeds: string[],
  phase: number,
  upper: boolean,
  prefix: string,
): RegionalPhase {
  return {
    seeds: [...seeds],
    groups: upper && phase === 0 ? [] : seededGroups(seeds, prefix),
    bracket: upper && phase === 0 ? bracket("top2", seeds, prefix + "D") : null,
  };
}
export const leagueDone = (p: RegionalPhase) =>
  !!p.bracket && bracketDone(p.bracket);
export function advanceLeague(
  p: RegionalPhase,
  phase: number,
  upper: boolean,
  prefix: string,
) {
  if (p.bracket || !p.groups.length || !p.groups.every(fullLeagueDone)) return;
  const [a, b] = p.groups.map(fullStandings),
    opening = upper
      ? [a[0].id, b[3].id, b[1].id, a[2].id, b[0].id, a[3].id, a[1].id, b[2].id]
      : [a[0].id, b[1].id, b[0].id, a[1].id];
  p.bracket = bracket(
    upper && phase === 2 ? "double" : "single",
    opening,
    prefix + "D",
    upper && phase === 1,
  );
  if (upper && phase === 2) {
    p.bracket.opening = opening;
    p.bracket.rounds = [];
  }
}
export function leagueRanks(p: RegionalPhase) {
  if (!leagueDone(p)) return [];
  const ranks = bracketRanks(p.bracket!),
    seen = new Set(ranks.map((r) => r.id));
  for (let i = 0; i < 8; i++) {
    const ids = p.groups.flatMap((g) => {
      const row = fullStandings(g)[i];
      return row && !seen.has(row.id) ? [row.id] : [];
    });
    const from = ranks.length + 1;
    for (const id of ids) {
      seen.add(id);
      ranks.push({ id, from, to: from + ids.length - 1 });
    }
  }
  return ranks;
}
/** Same-phase performance resolves seeding ties only; placement awards stay shared. */
export function nextSeeds(p: RegionalPhase) {
  const matches = [
    ...p.groups.flatMap((g) => g.rounds.flat()),
    ...p.bracket!.rounds.flat(),
  ];
  const aggregate = fullStandings({
    teamIds: p.seeds,
    tie: p.seeds,
    rounds: [matches],
  });
  const ranks = leagueRanks(p);
  return [...p.seeds].sort(
    (a, b) =>
      ranks.find((r) => r.id === a)!.from -
        ranks.find((r) => r.id === b)!.from ||
      aggregate.findIndex((r) => r.id === a) -
        aggregate.findIndex((r) => r.id === b),
  );
}
export const phasePrefix = (
  region: CircuitRegion,
  phase: number,
  upper: boolean,
) => `${region}P${phase + 1}M${upper ? 1 : 2}`;
export const phaseMatches = (p: RegionalPhase) => [
  ...p.groups.flatMap((g) => g.rounds.flat()),
  ...(p.bracket?.rounds.flat() || []),
  ...(p.bracket?.bronze ? [p.bracket.bronze] : []),
];
export function newZone(
  r: CircuitRegion,
  upper = defaultUpper(r),
  lower = defaultLower(r, upper),
): CircuitZone {
  return {
    upper: [...upper],
    lower: [...lower],
    phases: [
      {
        upper: newPhase(upper, 0, true, phasePrefix(r, 0, true)),
        lower: newPhase(lower, 0, false, phasePrefix(r, 0, false)),
      },
    ],
    playin: null,
  };
}
