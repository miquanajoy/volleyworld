import type { FullSeason, RegionalLeague } from "../full-season/types";
import type { Match } from "../types";
import { regionOrder } from "../full-season/types";
import { fullLeagueDone } from "../full-season/league";
import { qualifierPlayers } from "../full-season/qualification";
import { loser } from "../match/scoring";
import { validRegionalSelection, regionalTourKeys } from "./regional-tour";
import {
  pointsPhaseSeeds,
  pointsPhaseDone,
  pointsRegionalSeeds,
} from "./points-regional";
import { regionalDoublePlan, regionalDoubleRound } from "./regional-double";

export function validPointsRegions(
  f: FullSeason,
  match: (m: Match, teams: string[], id?: string) => boolean,
) {
  const c = f.career!,
    p = c.points;
  const same = (a: string[], b: string[]) =>
    Array.isArray(a) &&
    a.length === b.length &&
    new Set(a).size === a.length &&
    a.every((id) => b.includes(id));
  if (
    !p ||
    (p.version !== 1 && p.version !== 2) ||
    Object.keys(p).sort().join() !== "phase2,version" ||
    !p.phase2 ||
    Object.keys(p.phase2).length !== 5 ||
    !c.regionalTour ||
    Object.keys(c.regionalTour.brackets).some(
      (r) => !regionalTourKeys.includes(r as (typeof regionalTourKeys)[number]),
    )
  )
    return false;
  if (
    !validRegionalSelection(
      c.leagueRoster,
      f.seasonNumber,
      regionOrder.flatMap((r) => f.regions[r].teamIds),
      p.version === 2,
    ) ||
    f.regions.CSV.teamIds.length
  )
    return false;
  function phase(g: RegionalLeague, ids: string[], prefix: string) {
    if (
      !g ||
      !same(g.teamIds, ids) ||
      !same(g.tie, ids) ||
      !Array.isArray(g.groups) ||
      g.groups.length !== Math.ceil(ids.length / 4) ||
      !same(g.groups.flat(), ids) ||
      !Array.isArray(g.rounds) ||
      g.qualifierBranches !== undefined ||
      g.directSlots !== undefined ||
      g.pots !== undefined
    )
      return false;
    const sizes = g.groups.map((a) => a.length);
    if (
      sizes.some((n) => n < 1 || n > 4) ||
      Math.max(0, ...sizes) - Math.min(...sizes) > 1
    )
      return false;
    const rounds = Math.max(0, ...sizes.map((n) => (n % 2 ? n : n - 1)));
    if (g.rounds.length !== rounds) return false;
    const pairs = new Set<string>();
    let waiting = false;
    for (const [ri, row] of g.rounds.entries()) {
      if (
        !Array.isArray(row) ||
        (waiting && row.some((m) => m.sets)) ||
        row.length !==
          sizes.reduce(
            (n, size) =>
              n +
              (ri < (size % 2 ? size : size - 1) ? Math.floor(size / 2) : 0),
            0,
          ) ||
        new Set(row.flatMap((m) => [m.a, m.b])).size !== 2 * row.length
      )
        return false;
      for (const m of row) {
        const gi = g.groups.findIndex(
          (group) => group.includes(m.a) && group.includes(m.b),
        );
        if (
          gi < 0 ||
          !m.id.startsWith(`${prefix}G${gi}-${ri}-`) ||
          !match(m, ids)
        )
          return false;
        const pair = [m.a, m.b].sort().join(":");
        if (pairs.has(pair)) return false;
        pairs.add(pair);
      }
      if (row.some((m) => !m.sets)) waiting = true;
    }
    if (
      pairs.size !== sizes.reduce((n, size) => n + (size * (size - 1)) / 2, 0)
    )
      return false;
    if (!g.playoff)
      return (
        g.playoff === null &&
        !g.decider &&
        (ids.length < 2 || !fullLeagueDone(g))
      );
    if (ids.length < 2 || !fullLeagueDone(g)) return false;
    const b = g.playoff,
      seeds = pointsPhaseSeeds(g);
    if (
      Object.keys(b).sort().join() !== "rounds,seeds" ||
      JSON.stringify(b.seeds) !== JSON.stringify(seeds) ||
      !Array.isArray(b.rounds) ||
      b.rounds.length !== Math.ceil(Math.log2(seeds.length))
    )
      return false;
    for (const [i, row] of b.rounds.entries()) {
      const players = qualifierPlayers(b, i),
        expected: Match[] = [];
      if (players)
        for (let j = 0; j < players.length; j += 2)
          if (players[j] && players[j + 1])
            expected.push({
              id: `${prefix}K${i}-${j / 2}`,
              a: players[j]!,
              b: players[j + 1]!,
              sets: null,
            });
      if (
        !Array.isArray(row) ||
        row.length !== expected.length ||
        row.some(
          (m, j) =>
            !match(m, seeds, expected[j].id) ||
            m.a !== expected[j].a ||
            m.b !== expected[j].b,
        )
      )
        return false;
    }
    const semi = b.rounds.at(-2),
      need = semi?.length === 2 && semi.every((m) => m.sets);
    if (need) {
      if (
        !g.decider ||
        !match(g.decider, seeds, prefix + "B") ||
        g.decider.a !== loser(semi![0]) ||
        g.decider.b !== loser(semi![1]) ||
        (b.rounds.at(-1)?.some((m) => m.sets) && !g.decider.sets)
      )
        return false;
    } else if (g.decider !== undefined) return false;
    return true;
  }
  for (const r of regionOrder) {
    const g = f.regions[r],
      g2 = p.phase2[r];
    if (!phase(g, g.teamIds, r + "P1") || !phase(g2, g.teamIds, r + "P2"))
      return false;
    if (
      (g2.rounds.flat().some((m) => m.sets) || g2.playoff) &&
      !pointsPhaseDone(g)
    )
      return false;
    const b = c.regionalTour.brackets[r];
    if (!b) continue;
    if (
      g.teamIds.length < 2 ||
      !pointsPhaseDone(g) ||
      !pointsPhaseDone(g2) ||
      !Array.isArray(b.rounds) ||
      Object.keys(b).join() !== "rounds"
    )
      return false;
    const seeds = pointsRegionalSeeds(f, r),
      plan = regionalDoublePlan(seeds, r + "D"),
      replay = { rounds: [] as Match[][] };
    if (!b.rounds.length || b.rounds.length > plan.length) return false;
    for (const [i, row] of b.rounds.entries()) {
      if (replay.rounds.at(-1)?.some((m) => !m.sets)) return false;
      const expected = regionalDoubleRound(seeds, r + "D", replay, i);
      if (
        !Array.isArray(row) ||
        row.length !== expected.length ||
        row.some(
          (m, j) =>
            !match(m, seeds, expected[j].id) ||
            m.a !== expected[j].a ||
            m.b !== expected[j].b,
        )
      )
        return false;
      replay.rounds.push(row);
    }
    if (b.rounds.length < plan.length && !b.rounds.at(-1)?.some((m) => !m.sets))
      return false;
  }
  return true;
}
