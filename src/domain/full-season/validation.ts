import {
  newQualification,
  qualificationGroups,
  qualifierPlayers,
  regionalPlayoffSeeds,
  intercontinentalPool,
  intercontinentalDone,
} from "./qualification";
import type { QualifierBracket } from "./types";
import { regionTeams } from "../../data/teams";
import { validate, winner, loser } from "../match/scoring";
import type { Match, TeamId } from "../types";
import { fullLeagueDone, fullStandings } from "./league";
import {
  regionOrder,
  worldStages,
  type FullLeague,
  type FullSeason,
} from "./types";
import {
  regionalGroup,
  regionalDone,
  regionalGroupCount,
  groupDirectSlots,
} from "./regional";
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
    function knockout(b: QualifierBracket, expected: TeamId[], prefix: string) {
      if (
        !b ||
        Object.keys(b).sort().join() !== "rounds,seeds" ||
        !Array.isArray(b.seeds) ||
        b.seeds.join() !== expected.join() ||
        !Array.isArray(b.rounds) ||
        b.rounds.length !== Math.ceil(Math.log2(expected.length))
      )
        return false;
      for (let r = 0; r < b.rounds.length; r++) {
        const players = qualifierPlayers(b, r),
          pairs: { a: TeamId; b: TeamId; id: string }[] = [];
        if (players)
          for (let i = 0; i < players.length; i += 2)
            if (players[i] && players[i + 1])
              pairs.push({
                a: players[i]!,
                b: players[i + 1]!,
                id: `${prefix}K${r}-${i / 2}`,
              });
        if (!Array.isArray(b.rounds[r]) || b.rounds[r].length !== pairs.length)
          return false;
        for (const [i, m] of b.rounds[r].entries())
          if (
            !check(m, expected, pairs[i].id) ||
            m.a !== pairs[i].a ||
            m.b !== pairs[i].b
          )
            return false;
      }
      return true;
    }
    const modern = newQualification(s);
    if (
      s.regionalFormat !== undefined &&
      s.regionalFormat !== "groups-v1" &&
      !modern
    )
      return false;
    for (const r of regionOrder) {
      const g = s.regions[r],
        ids = regionTeams(r).map((t) => t.id);
      if ((s.regionalFormat !== "groups-v1" && !modern) || r === "CSV") {
        if (
          modern
            ? g.directSlots !== 2 || g.playoff !== undefined
            : g.directSlots !== undefined || g.playoff !== undefined
        )
          return false;
        if (
          g.groups !== undefined ||
          g.pots !== undefined ||
          g.decider !== undefined ||
          !league(g, ids, r)
        )
          return false;
        continue;
      }
      const count = modern ? qualificationGroups[r] : regionalGroupCount[r];
      if (
        modern
          ? g.directSlots !== 1
          : g.directSlots !== undefined || g.playoff !== undefined
      )
        return false;
      if (
        !Array.isArray(g.groups) ||
        g.groups.length !== count ||
        !sameSet(g.groups.flat(), ids) ||
        !sameSet(g.teamIds, ids) ||
        !sameSet(g.tie, ids) ||
        !Array.isArray(g.pots) ||
        g.pots.length !== Math.ceil(ids.length / count)
      )
        return false;
      for (let p = 0; p < g.pots.length; p++) {
        if (
          !sameSet(g.pots[p], ids.slice(p * count, (p + 1) * count)) ||
          g.groups.some(
            (group) => group.filter((id) => g.pots![p].includes(id)).length > 1,
          )
        )
          return false;
      }
      if (
        g.groups.some(
          (group, i) => group.length !== Math.ceil((ids.length - i) / count),
        )
      )
        return false;
      const expectedRounds = Math.max(
        ...g.groups.map((group) =>
          group.length % 2 ? group.length : group.length - 1,
        ),
      );
      if (
        !Array.isArray(g.rounds) ||
        g.rounds.length !== expectedRounds ||
        g.rounds.some(
          (row, i) =>
            !Array.isArray(row) ||
            row.length !==
              g.groups!.reduce(
                (n, group) =>
                  n +
                  (i < (group.length % 2 ? group.length : group.length - 1)
                    ? Math.floor(group.length / 2)
                    : 0),
                0,
              ),
        )
      )
        return false;
      for (let i = 0; i < count; i++)
        if (!league(regionalGroup(g, i), g.groups[i], `${r}G${i}`))
          return false;
      if (modern) {
        if (g.decider !== undefined) return false;
        if (
          fullLeagueDone(g)
            ? !g.playoff || !knockout(g.playoff, regionalPlayoffSeeds(g), r)
            : g.playoff !== null
        )
          return false;
        continue;
      }
      const hasDecider = r === "AVC" || r === "CAVB";
      if (!hasDecider) {
        if (g.decider !== undefined) return false;
      } else {
        const ready = fullLeagueDone(g);
        if (!ready) {
          if (g.decider !== null) return false;
        } else {
          const expected = g.groups.map(
            (_, i) =>
              fullStandings(regionalGroup(g, i))[groupDirectSlots[r]].id,
          );
          if (
            !g.decider ||
            g.decider.a !== expected[0] ||
            g.decider.b !== expected[1] ||
            !check(g.decider, expected, `${r}D0`)
          )
            return false;
        }
      }
    }
    if (modern) {
      if (s.intercontinental !== null) {
        const b = s.intercontinental;
        if (
          !b ||
          Object.keys(b).sort().join() !== "branches,pots" ||
          !Array.isArray(b.pots) ||
          b.pots.length !== 9 ||
          !Array.isArray(b.branches) ||
          b.branches.length !== 3
        )
          return false;
        const pool = intercontinentalPool(s);
        for (let i = 0; i < 9; i++)
          if (
            !Array.isArray(b.pots[i]) ||
            b.pots[i].join() !== pool.slice(i * 3, i * 3 + 3).join()
          )
            return false;
        if (
          !sameSet(
            b.branches.flatMap((x) => x.seeds),
            pool,
          )
        )
          return false;
        for (const [i, branch] of b.branches.entries())
          if (
            branch.seeds.length !== 9 ||
            branch.seeds.some((id, j) => !b.pots[j].includes(id)) ||
            !knockout(branch, branch.seeds, `IC${i}`)
          )
            return false;
      }
      if (s.world !== null && !intercontinentalDone(s)) return false;
    } else if (s.intercontinental !== undefined) return false;
    if (s.world === null) return true;
    if (!regionOrder.every((r) => regionalDone(s.regions[r]))) return false;
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
