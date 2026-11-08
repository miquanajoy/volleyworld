import { get } from "../../data/teams";
import type { Match, Region } from "../types";
import type { FullSeason, RegionalLeague } from "../full-season/types";
import { regionOrder } from "../full-season/types";
import {
  fullLeague,
  fullLeagueDone,
  fullStandings,
} from "../full-season/league";
import { regionalGroup } from "../full-season/regional";
import {
  createQualifier,
  advanceQualifier,
  qualifierWinner,
  seedSlots,
} from "../full-season/qualification";
import { winner, loser } from "../match/scoring";
import { shuffle } from "../shared/random";
import {
  setupRegionalTour,
  regionalTourKeys,
  regionalTourQuota,
} from "./regional-tour";
import {
  regionalDoublePlan,
  regionalDoubleRound,
  type RegionalDouble,
} from "./regional-double";

export const pointsFormat = (f: FullSeason) => !!f.career?.points;
export const regionalPhaseIndex = (stage: number) =>
  stage === 1 ? 0 : stage === 3 ? 1 : 2;
export function pointsRegionPhase(f: FullSeason, r: Region, phase: number) {
  return phase === 0 ? f.regions[r] : f.career!.points!.phase2[r];
}
function makePhase(ids: string[], prefix: string): RegionalLeague {
  const groups: string[][] = Array.from(
    { length: Math.ceil(ids.length / 4) },
    () => [],
  );
  for (let i = 0; i < ids.length; i += groups.length)
    shuffle(ids.slice(i, i + groups.length)).forEach((id, j) =>
      groups[j].push(id),
    );
  const leagues = groups.map((g, i) => fullLeague(g, prefix + "G" + i));
  return {
    teamIds: [...ids],
    tie: shuffle(ids),
    groups,
    playoff: null,
    rounds: Array.from(
      { length: Math.max(0, ...leagues.map((g) => g.rounds.length)) },
      (_, i) => leagues.flatMap((g) => g.rounds[i] || []),
    ),
  };
}
export function setupPointsRegions(f: FullSeason, selected: string[]) {
  setupRegionalTour(f, selected);
  f.career!.points = {
    version: 1,
    phase2: {} as Record<Region, RegionalLeague>,
  };
  for (const r of regionOrder) {
    const ids = f.regions[r].teamIds;
    f.regions[r] = makePhase(ids, r + "P1");
    f.career!.points.phase2[r] = makePhase(ids, r + "P2");
  }
}
/** Keep group winners seeded above runners-up and avoid immediate group rematches. */
export function pointsPhaseSeeds(g: RegionalLeague): string[] {
  const tables = g.groups!.map((_, i) => fullStandings(regionalGroup(g, i)));
  const first = tables.map((t) => t[0]?.id).filter((id): id is string => !!id);
  const second = tables.map((t) => t[1]?.id).filter((id): id is string => !!id);
  const group = (id: string) => g.groups!.findIndex((ids) => ids.includes(id));
  function assign(left: string[], ordered: string[]): string[] | null {
    if (left.length) {
      for (const id of left) {
        const result = assign(
          left.filter((x) => x !== id),
          [...ordered, id],
        );
        if (result) return result;
      }
      return null;
    }
    const seeds = [...first, ...ordered],
      slots = seedSlots(seeds.length).map((i) => seeds[i - 1]);
    if (tables.length > 1)
      for (let i = 0; i < slots.length; i += 2)
        if (slots[i] && slots[i + 1] && group(slots[i]) === group(slots[i + 1]))
          return null;
    return seeds;
  }
  const seeds = assign(second, []);
  if (!seeds) throw Error("Không thể ghép top 1–2 khác bảng.");
  return seeds;
}
export const pointsPhaseMatches = (g: RegionalLeague): Match[] => [
  ...g.rounds.flat(),
  ...(g.playoff?.rounds.flat() || []),
  ...(g.decider ? [g.decider] : []),
];
export const pointsPhaseDone = (g: RegionalLeague) =>
  g.teamIds.length < 2 ||
  (fullLeagueDone(g) &&
    !!qualifierWinner(g.playoff) &&
    (!g.decider || !!g.decider.sets));
export function advancePointsPhase(g: RegionalLeague, prefix: string) {
  if (g.teamIds.length < 2 || !fullLeagueDone(g)) return;
  if (!g.playoff) g.playoff = createQualifier(pointsPhaseSeeds(g), prefix);
  advanceQualifier(g.playoff, prefix);
  const semi = g.playoff.rounds.at(-2);
  if (semi?.length === 2 && semi.every((m) => m.sets) && !g.decider)
    g.decider = {
      id: prefix + "B",
      a: loser(semi[0])!,
      b: loser(semi[1])!,
      sets: null,
    };
}
const pending = (rounds: Match[][]) =>
  rounds.find((row) => row.some((m) => !m.sets)) || [];
export function pointsPhaseBatch(g: RegionalLeague): Match[] {
  if (pointsPhaseDone(g)) return [];
  if (!fullLeagueDone(g)) return pending(g.rounds);
  const row = pending(g.playoff?.rounds || []);
  return row === g.playoff?.rounds.at(-1) && g.decider && !g.decider.sets
    ? [g.decider]
    : row;
}
export function pointsPhasePlaces(g: RegionalLeague): Record<string, number> {
  if (!pointsPhaseDone(g)) return {};
  const out = Object.fromEntries(g.teamIds.map((id) => [id, 17]));
  const b = g.playoff;
  if (!b) return out;
  for (const [i, row] of b.rounds.entries())
    for (const m of row)
      if (m.sets) out[loser(m)!] = 2 ** (b.rounds.length - i - 1) + 1;
  const last = b.rounds.at(-1)?.[0];
  if (last?.sets) {
    out[winner(last)!] = 1;
    out[loser(last)!] = 2;
  }
  if (g.decider?.sets) {
    out[winner(g.decider)!] = 3;
    out[loser(g.decider)!] = 4;
  }
  return out;
}
export function completeRegionalDouble(
  b: RegionalDouble | undefined,
  n: number,
) {
  return (
    n < 2 ||
    (!!b &&
      b.rounds.length ===
        regionalDoublePlan(
          Array.from({ length: n }, (_, i) => String(i)),
          "D",
        ).length &&
      b.rounds.every((row) => row.every((m) => !!m.sets)))
  );
}
export function pointsDoublePlaces(
  f: FullSeason,
  r: Region,
): Record<string, number> {
  const ids = f.regions[r].teamIds,
    b = f.career!.regionalTour!.brackets[r];
  if (!completeRegionalDouble(b, ids.length) || !b?.rounds.flat().length)
    return {};
  const final = b.rounds.flat().at(-1)!,
    champion = winner(final)!,
    runner = loser(final)!;
  const losses = new Map<string, number>(),
    eliminated = new Map<string, number>();
  b.rounds.forEach((row, i) =>
    row.forEach((m) => {
      const id = loser(m)!;
      const n = (losses.get(id) || 0) + 1;
      losses.set(id, n);
      if (n === 2) eliminated.set(id, i);
    }),
  );
  const out: Record<string, number> = { [champion]: 1, [runner]: 2 };
  let place = 3;
  for (const round of [...new Set(eliminated.values())].sort((a, b) => b - a)) {
    const group = ids.filter(
      (id) => id !== champion && id !== runner && eliminated.get(id) === round,
    );
    group.forEach((id) => (out[id] = place));
    place += group.length;
  }
  return out;
}
export function pointsPhaseBonus(place: number | undefined, phase: number) {
  if (!place) return 0;
  return phase < 2
    ? place === 1
      ? 200
      : place === 2
        ? 120
        : place === 3
          ? 80
          : place === 4
            ? 60
            : place <= 8
              ? 30
              : 0
    : place === 1
      ? 240
      : place === 2
        ? 160
        : place === 3
          ? 120
          : place === 4
            ? 90
            : place <= 6
              ? 60
              : place <= 8
                ? 40
                : place <= 12
                  ? 20
                  : 0;
}
export function pointsRegionalPhaseDone(
  f: FullSeason,
  r: Region,
  phase: number,
) {
  return phase < 2
    ? pointsPhaseDone(pointsRegionPhase(f, r, phase))
    : completeRegionalDouble(
        f.career!.regionalTour!.brackets[r],
        f.regions[r].teamIds.length,
      );
}
export function pointsRegionalPhaseMatches(
  f: FullSeason,
  r: Region,
  phase: number,
) {
  return phase < 2
    ? pointsPhaseMatches(pointsRegionPhase(f, r, phase))
    : f.career!.regionalTour!.brackets[r]?.rounds.flat() || [];
}
export function pointsRegionalPhaseScores(
  f: FullSeason,
  r: Region,
  phase: number,
) {
  const ms = pointsRegionalPhaseMatches(f, r, phase),
    done = pointsRegionalPhaseDone(f, r, phase);
  const places =
    phase < 2
      ? pointsPhasePlaces(pointsRegionPhase(f, r, phase))
      : pointsDoublePlaces(f, r);
  return Object.fromEntries(
    f.regions[r].teamIds.map((id) => [
      id,
      ms
        .filter((m) => m.sets && winner(m) === id)
        .reduce(
          (n, m) =>
            n +
            (phase < 2 &&
            pointsRegionPhase(f, r, phase).rounds.flat().includes(m)
              ? 5
              : 10),
          0,
        ) + (done ? pointsPhaseBonus(places[id], phase) : 0),
    ]),
  );
}
export function pointsRegionalRows(f: FullSeason, r: Region) {
  const ids = f.regions[r].teamIds,
    q = regionalTourQuota(f, r);
  const done = [0, 1, 2].map((p) => pointsRegionalPhaseDone(f, r, p));
  const scores = [0, 1, 2].map((p) => pointsRegionalPhaseScores(f, r, p));
  const cap = (id: string) =>
    16 -
    f.career!.leagueRoster.filter((x) => get(x).region === get(id).region)
      .length;
  const maxPhase = (p: number) =>
    p < 2
      ? 200 +
        5 *
          Math.max(
            0,
            ...pointsRegionPhase(f, r, p).groups!.map((g) => g.length - 1),
          ) +
        10 *
          Math.ceil(
            Math.log2(
              Math.max(1, 2 * pointsRegionPhase(f, r, p).groups!.length),
            ),
          )
      : 240 + 20 * Math.ceil(Math.log2(Math.max(1, ids.length)));
  const rows = ids
    .map((id) => {
      const phases = scores.map((score) => score[id] || 0),
        banked = phases.reduce((n, v, i) => n + (done[i] ? v : 0), 0);
      return {
        id,
        phases,
        points: phases.reduce((a, b) => a + b, 0),
        banked,
        max: banked + done.reduce((n, d, i) => n + (d ? 0 : maxPhase(i)), 0),
        confirmed: false,
        inQuota: false,
        eligible: cap(id) > 0,
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.phases[2] - a.phases[2] ||
        b.phases[1] - a.phases[1] ||
        get(a.id).rank - get(b.id).rank,
    );
  const selected: string[] = [];
  for (const row of rows)
    if (
      selected.length < q &&
      selected.filter((id) => get(id).region === get(row.id).region).length <
        cap(row.id)
    ) {
      row.inQuota = true;
      selected.push(row.id);
    }
  for (const row of rows)
    row.confirmed = done.every(Boolean)
      ? row.inQuota
      : row.eligible &&
        rows.filter((x) => x.id !== row.id && x.eligible && x.max >= row.banked)
          .length < q &&
        rows.filter(
          (x) =>
            x.id !== row.id &&
            get(x.id).region === get(row.id).region &&
            x.max >= row.banked,
        ).length < cap(row.id);
  return rows;
}
export function pointsRegionalSeeds(f: FullSeason, r: Region) {
  const p0 = pointsRegionalPhaseScores(f, r, 0),
    p1 = pointsRegionalPhaseScores(f, r, 1);
  return [...f.regions[r].teamIds].sort(
    (a, b) => p0[b] + p1[b] - (p0[a] + p1[a]) || get(a).rank - get(b).rank,
  );
}
export function advancePointsRegions(f: FullSeason, phase: number) {
  for (const r of regionalTourKeys) {
    if (phase < 2) {
      advancePointsPhase(pointsRegionPhase(f, r, phase), r + "P" + (phase + 1));
      continue;
    }
    const seeds = pointsRegionalSeeds(f, r);
    if (seeds.length < 2) continue;
    const b = (f.career!.regionalTour!.brackets[r] ||= { rounds: [] });
    const plan = regionalDoublePlan(seeds, r + "D");
    while (
      b.rounds.length < plan.length &&
      !b.rounds.at(-1)?.some((m) => !m.sets)
    ) {
      const row = regionalDoubleRound(seeds, r + "D", b, b.rounds.length);
      b.rounds.push(row);
      if (row.length) break;
    }
  }
}
export function pointsRegionalBatch(f: FullSeason, r: Region, phase: number) {
  if (pointsRegionalPhaseDone(f, r, phase)) return [];
  return phase < 2
    ? pointsPhaseBatch(pointsRegionPhase(f, r, phase))
    : pending(f.career!.regionalTour!.brackets[r]?.rounds || []);
}
export const pointsRegionalMatches = (f: FullSeason) =>
  regionalTourKeys.flatMap((r) =>
    [0, 1, 2].flatMap((p) => pointsRegionalPhaseMatches(f, r, p)),
  );
export function pointsRegionalTotal(f: FullSeason) {
  return regionalTourKeys.reduce(
    (n, r) =>
      n +
      [0, 1].reduce((sum, p) => {
        const g = pointsRegionPhase(f, r, p),
          entrants = Math.min(g.teamIds.length, 2 * g.groups!.length);
        return (
          sum +
          g.rounds.flat().length +
          Math.max(0, entrants - 1) +
          (entrants >= 4 ? 1 : 0)
        );
      }, 0) +
      (pointsRegionalPhaseDone(f, r, 2)
        ? pointsRegionalPhaseMatches(f, r, 2).length
        : Math.max(0, 2 * f.regions[r].teamIds.length - 1)),
    0,
  );
}
