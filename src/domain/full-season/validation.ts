import { regionTeams } from "../../data/teams";
import { validate, winner, loser } from "../match/scoring";
import type { Match, TeamId } from "../types";
import { fullLeagueDone } from "./league";
import {
  regionOrder,
  worldStages,
  type FullLeague,
  type FullSeason,
} from "./types";
import { regionalQualifiers, worldEntrants, worldThirds } from "./world";
const sameSet = (a: TeamId[], b: TeamId[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
export function validFullSeason(input: unknown): input is FullSeason {
  try {
    const s = input as FullSeason;
    if (
      !s ||
      s.version !== 1 ||
      s.mode !== "full-season" ||
      typeof s.seasonId !== "string" ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(s.seasonId) ||
      !Number.isInteger(s.seasonNumber) ||
      s.seasonNumber < 1 ||
      s.seasonNumber > 2147483647 ||
      typeof s.createdAt !== "string" ||
      !Number.isFinite(Date.parse(s.createdAt)) ||
      !s.regions ||
      Object.keys(s.regions).length !== 5
    )
      return false;
    const matchIds = new Set<string>(),
      orders = new Set<number>();
    function check(m: Match, ids: TeamId[], expectedId?: string) {
      if (
        !m ||
        typeof m.id !== "string" ||
        !/^[A-Z0-9-]{1,64}$/.test(m.id) ||
        matchIds.has(m.id) ||
        (expectedId && m.id !== expectedId) ||
        m.a === m.b ||
        !ids.includes(m.a) ||
        !ids.includes(m.b) ||
        (m.sets !== null && !validate(m.sets))
      )
        return false;
      if (m.resultOrder !== undefined) {
        if (
          !m.sets ||
          !Number.isSafeInteger(m.resultOrder) ||
          m.resultOrder < 1 ||
          orders.has(m.resultOrder)
        )
          return false;
        orders.add(m.resultOrder);
      }
      matchIds.add(m.id);
      return true;
    }
    function league(g: FullLeague, ids: TeamId[], prefix: string) {
      const n = ids.length,
        rounds = n % 2 ? n : n - 1;
      if (
        !g ||
        !Array.isArray(g.teamIds) ||
        !sameSet(g.teamIds, ids) ||
        !Array.isArray(g.tie) ||
        !sameSet(g.tie, ids) ||
        !Array.isArray(g.rounds) ||
        g.rounds.length !== rounds
      )
        return false;
      const pairs = new Set<string>();
      for (let r = 0; r < rounds; r++) {
        const row = g.rounds[r];
        if (
          !Array.isArray(row) ||
          row.length !== Math.floor(n / 2) ||
          new Set(row.flatMap((m) => [m.a, m.b])).size !== 2 * row.length
        )
          return false;
        for (const m of row) {
          if (!m.id.startsWith(`${prefix}-${r}-`) || !check(m, ids))
            return false;
          const p = [m.a, m.b].sort().join(":");
          if (pairs.has(p)) return false;
          pairs.add(p);
        }
      }
      return pairs.size === (n * (n - 1)) / 2;
    }
    for (const r of regionOrder)
      if (
        !league(
          s.regions[r],
          regionTeams(r).map((t) => t.id),
          r,
        )
      )
        return false;
    if (s.world === null) return true;
    if (!regionOrder.every((r) => fullLeagueDone(s.regions[r]))) return false;
    const w = s.world,
      expected = regionalQualifiers(s).sort((a, b) => {
        const all = regionOrder.flatMap((r) => regionTeams(r));
        return (
          all.find((t) => t.id === a)!.rank - all.find((t) => t.id === b)!.rank
        );
      });
    if (
      !w ||
      !Array.isArray(w.pots) ||
      w.pots.length !== 4 ||
      !Array.isArray(w.groups) ||
      w.groups.length !== 6 ||
      !Array.isArray(w.tie) ||
      !sameSet(w.tie, expected)
    )
      return false;
    for (let i = 0; i < 4; i++)
      if (
        !Array.isArray(w.pots[i]) ||
        !sameSet(w.pots[i], expected.slice(i * 6, i * 6 + 6))
      )
        return false;
    const allGroups = w.groups.flatMap((g) => g.teamIds);
    if (!sameSet(allGroups, expected)) return false;
    for (let i = 0; i < 6; i++) {
      const g = w.groups[i];
      if (
        !league(g, g.teamIds, `WG${i}`) ||
        g.teamIds.length !== 4 ||
        w.pots.some(
          (p) => p.filter((id) => g.teamIds.includes(id)).length !== 1,
        )
      )
        return false;
      for (const r of regionOrder)
        if (
          g.teamIds.filter((id) => s.regions[r].teamIds.includes(id)).length > 2
        )
          return false;
    }
    if (w.bracket === null) return true;
    if (!w.groups.every(fullLeagueDone)) return false;
    const b = w.bracket,
      eligible = worldEntrants(w);
    if (Object.keys(b).sort().join() !== [...worldStages].sort().join())
      return false;
    for (const k of worldStages) if (!Array.isArray(b[k])) return false;
    if (
      b.r16.length !== 8 ||
      !sameSet(
        b.r16.flatMap((m) => [m.a, m.b]),
        eligible,
      )
    )
      return false;
    const thirds = worldThirds(w)
        .slice(0, 4)
        .map((t) => t.id),
      groupOf = (id: string) =>
        w.groups.findIndex((g) => g.teamIds.includes(id)),
      winners = w.groups.map((g) => {
        // Ranking is obtained indirectly from the top two entrants of each group.
        return worldEntrants(w)[w.groups.indexOf(g) * 2];
      });
    for (const [i, m] of b.r16.entries()) {
      if (!check(m, eligible, `WR${i}`) || groupOf(m.a) === groupOf(m.b))
        return false;
      if (winners.includes(m.a) && winners.includes(m.b)) return false;
      if (
        (thirds.includes(m.a) && !winners.includes(m.b)) ||
        (thirds.includes(m.b) && !winners.includes(m.a))
      )
        return false;
    }
    for (const [from, to, prefix] of [
      ["r16", "qf", "WQ"],
      ["qf", "sf", "WS"],
      ["sf", "final", "WF"],
    ] as const) {
      const ready = !!b[from].length && b[from].every((m) => m.sets);
      if (b[to].length !== (ready ? b[from].length / 2 : 0)) return false;
      for (const [i, m] of b[to].entries())
        if (
          !check(m, eligible, prefix + i) ||
          m.a !== winner(b[from][i * 2]) ||
          m.b !== winner(b[from][i * 2 + 1])
        )
          return false;
    }
    const bronzeReady = b.sf.length === 2 && b.sf.every((m) => m.sets);
    if (b.bronze.length !== (bronzeReady ? 1 : 0)) return false;
    if (
      bronzeReady &&
      (!check(b.bronze[0], eligible, "WB0") ||
        b.bronze[0].a !== loser(b.sf[0]) ||
        b.bronze[0].b !== loser(b.sf[1]))
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
