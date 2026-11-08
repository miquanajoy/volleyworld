import {
  pointsFormat,
  pointsRegionalRows,
  pointsRegionalPhaseDone,
  pointsRegionalTotal,
  advancePointsRegions,
} from "./points-regional";
import { catalog, get } from "../../data/teams";
import { fullLeague, fullStandings } from "../full-season/league";
import { regionalGroup } from "../full-season/regional";
import {
  regionOrder,
  type FullSeason,
  type RegionalLeague,
} from "../full-season/types";
import { loser } from "../match/scoring";
import { shuffle } from "../shared/random";
import type { Match, Region } from "../types";
import { allocateCareerSlots } from "./allocation";
import { regionalDoublePlan, regionalDoubleRound } from "./regional-double";

export const regionalTourKeys = ["CEV", "AVC", "CAVB", "NORCECA"] as const;
export const regionalTourName = (r: Region) =>
  r === "NORCECA" ? "Châu Mỹ" : null;
const regionOf = (id: string) => get(id).region;
const zoneOf = (id: string) =>
  regionOf(id) === "CSV" ? "NORCECA" : regionOf(id);
const capacity = (roster: string[], r: Region) =>
  16 - roster.filter((id) => regionOf(id) === r).length;
export function regionalTourChoices(roster: string[], number: number) {
  const slots = allocateCareerSlots(roster, number);
  return regionalTourKeys.map((region) => {
    const q = slots[region] + (region === "NORCECA" ? slots.CSV : 0);
    const pool = catalog
      .filter((t) => zoneOf(t.id) === region && !roster.includes(t.id))
      .map((t) => t.id);
    return {
      region,
      q,
      pool,
      count: q
        ? Math.min(pool.length, region === "CEV" ? 16 : Math.max(8, q + 3))
        : 0,
    };
  });
}
export function regionalTourEligible(
  roster: string[],
  ids: string[],
  q: number,
) {
  return (
    regionOrder.reduce(
      (n, r) =>
        n +
        Math.min(
          capacity(roster, r),
          ids.filter((id) => regionOf(id) === r).length,
        ),
      0,
    ) >= q
  );
}
export function validRegionalSelection(
  roster: string[],
  number: number,
  selected: string[],
) {
  const choices = regionalTourChoices(roster, number);
  return (
    new Set(selected).size === selected.length &&
    selected.length === choices.reduce((n, x) => n + x.count, 0) &&
    choices.every((x) => {
      const ids = selected.filter((id) => x.pool.includes(id));
      return ids.length === x.count && regionalTourEligible(roster, ids, x.q);
    })
  );
}
export function defaultRegionalSelection(roster: string[], number: number) {
  const slots = allocateCareerSlots(roster, number);
  return regionalTourChoices(roster, number).flatMap((x) => {
    const required =
      x.region === "NORCECA"
        ? [
            ...x.pool
              .filter((id) => regionOf(id) === "NORCECA")
              .slice(0, slots.NORCECA),
            ...x.pool
              .filter((id) => regionOf(id) === "CSV")
              .slice(0, slots.CSV),
          ]
        : [];
    return [
      ...required,
      ...x.pool.filter((id) => !required.includes(id)),
    ].slice(0, x.count);
  });
}
export function setupRegionalTour(f: FullSeason, selected: string[]) {
  const c = f.career!;
  if (!validRegionalSelection(c.leagueRoster, f.seasonNumber, selected))
    throw Error(
      "Chọn đủ đội ngoài League cho từng khu vực và đủ đội hợp lệ để phân vé.",
    );
  c.regionalTour = { brackets: {} };
  f.regions.CSV = { teamIds: [], tie: [], rounds: [], groups: [] };
  for (const { region, q, pool } of regionalTourChoices(
    c.leagueRoster,
    f.seasonNumber,
  )) {
    const ids = pool.filter((id) => selected.includes(id));
    const groups: string[][] =
      ids.length === q ? [] : region === "CEV" ? [[], []] : [[]];
    for (let i = 0; i < ids.length && groups.length; i += groups.length)
      shuffle(ids.slice(i, i + groups.length)).forEach((id, j) =>
        groups[j].push(id),
      );
    const leagues = groups.map((ids, i) => fullLeague(ids, region + "T" + i));
    f.regions[region] = {
      teamIds: ids,
      tie: shuffle(ids),
      groups,
      rounds: Array.from(
        { length: Math.max(0, ...leagues.map((g) => g.rounds.length)) },
        (_, i) => leagues.flatMap((g) => g.rounds[i] || []),
      ),
    };
  }
}
export const regionalTourSplit = (g: RegionalLeague) =>
  Math.floor(g.rounds.length / 2);
export const regionalTourQuota = (f: FullSeason, r: Region) =>
  r === "CSV"
    ? 0
    : f.career!.slots[r] + (r === "NORCECA" ? f.career!.slots.CSV : 0);
export function regionalTourSeeds(g: RegionalLeague) {
  return (g.groups || [])
    .flatMap((_, i) =>
      fullStandings(regionalGroup(g, i)).map((t, j) => ({ ...t, rank: j })),
    )
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.w - a.w ||
        b.sf - b.sa - (a.sf - a.sa) ||
        b.pf - b.pa - (a.pf - a.pa) ||
        get(a.id).rank - get(b.id).rank,
    )
    .map((t) => t.id);
}
function allocate(
  f: FullSeason,
  ids: string[],
  q: number,
  existing: string[] = [],
) {
  const out = [...existing];
  for (const id of ids)
    if (
      out.length < q &&
      !out.includes(id) &&
      out.filter((x) => regionOf(x) === regionOf(id)).length <
        capacity(f.career!.leagueRoster, regionOf(id))
    )
      out.push(id);
  return out;
}
export function regionalTourEarly(f: FullSeason, r: Region) {
  const g = f.regions[r],
    q = regionalTourQuota(f, r);
  if (g.teamIds.length === q) return [...g.teamIds];
  if (g.rounds.some((row) => row.some((m) => !m.sets))) return [];
  const n = r === "CEV" ? (q >= 3 ? 2 : 0) : Math.floor(q / 2);
  return allocate(f, regionalTourSeeds(g), n);
}
export function regionalTourStatus(f: FullSeason, r: Region) {
  if (pointsFormat(f)) {
    const rows = pointsRegionalRows(f, r),
      done = pointsRegionalPhaseDone(f, r, 2),
      early = rows.filter((x) => x.confirmed).map((x) => x.id);
    return {
      done,
      early,
      entrants: done ? rows.filter((x) => x.inQuota).map((x) => x.id) : early,
    };
  }
  const g = f.regions[r],
    q = regionalTourQuota(f, r),
    early = regionalTourEarly(f, r);
  if (!q || g.teamIds.length === q)
    return { done: true, early, entrants: early };
  const b = f.career!.regionalTour!.brackets[r];
  if (!b) return { done: false, early, entrants: early };
  const seeds = regionalTourSeeds(g),
    lost = new Map<string, number>(),
    eliminated = new Map<string, number>();
  let last = -1;
  for (const [i, row] of b.rounds.entries()) {
    if (row.some((m) => !m.sets))
      return { done: false, early, entrants: early };
    for (const m of row) {
      const id = loser(m)!;
      const n = (lost.get(id) || 0) + 1;
      lost.set(id, n);
      if (n === 2) eliminated.set(id, i);
    }
    last = i;
  }
  const alive = seeds.filter(
    (id) => !early.includes(id) && !eliminated.has(id),
  );
  const plan = regionalDoublePlan(seeds, r + "D");
  const finished = b.rounds.length === plan.length;
  if ((last < 0 || alive.length > q - early.length) && !finished)
    return { done: false, early, entrants: early };
  const order = [
    ...alive,
    ...seeds
      .filter((id) => eliminated.has(id))
      .sort((a, b) => eliminated.get(b)! - eliminated.get(a)!),
  ];
  return { done: true, early, entrants: allocate(f, order, q, early) };
}
export function advanceRegionalTour(f: FullSeason) {
  if (pointsFormat(f)) {
    advancePointsRegions(f, 2);
    return;
  }
  const rt = f.career!.regionalTour!;
  for (const r of regionalTourKeys) {
    const g = f.regions[r],
      q = regionalTourQuota(f, r);
    if (
      !q ||
      g.teamIds.length === q ||
      g.rounds.some((row) => row.some((m) => !m.sets))
    )
      continue;
    const b = (rt.brackets[r] ||= { rounds: [] });
    const seeds = regionalTourSeeds(g),
      plan = regionalDoublePlan(seeds, r + "D");
    if (b.rounds.at(-1)?.some((m) => !m.sets)) continue;
    while (!regionalTourStatus(f, r).done && b.rounds.length < plan.length) {
      const row = regionalDoubleRound(seeds, r + "D", b, b.rounds.length);
      b.rounds.push(row);
      if (row.length) break;
    }
  }
}
export function regionalTourMatches(f: FullSeason): Match[] {
  return Object.values(f.career?.regionalTour?.brackets || {}).flatMap((b) =>
    b.rounds.flat(),
  );
}
export function regionalTourTotal(f: FullSeason) {
  if (pointsFormat(f)) return pointsRegionalTotal(f);
  return regionalTourKeys.reduce((n, r) => {
    const g = f.regions[r],
      q = regionalTourQuota(f, r);
    return (
      n +
      g.rounds.flat().length +
      (!q || q === g.teamIds.length
        ? 0
        : regionalTourStatus(f, r).done
          ? f.career!.regionalTour!.brackets[r]!.rounds.flat().length
          : 2 * g.teamIds.length - 1)
    );
  }, 0);
}
