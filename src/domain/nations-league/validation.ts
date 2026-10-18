import { get } from "../../data/teams";
import { validate, winner, loser } from "../match/scoring";
import { fullStandings } from "../full-season/league";
import type { Match, TeamId } from "../types";
import { tiers, nationsStages, type NationsSeason } from "./types";
import {
  nationsRoster,
  nationsGroupsDone,
  nationsComplete,
  nextDivisions,
} from "./index";
const identity = (x: unknown): x is string =>
  typeof x === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(x);
const same = (a: TeamId[], b: TeamId[]) =>
  Array.isArray(a) &&
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
export function validNationsSeason(value: unknown): value is NationsSeason {
  try {
    const s = value as NationsSeason,
      roster = nationsRoster();
    if (
      !s ||
      s.version !== 1 ||
      s.mode !== "nations-league" ||
      !identity(s.seasonId) ||
      !identity(s.campaignId) ||
      !Number.isSafeInteger(s.seasonNumber) ||
      s.seasonNumber < 1 ||
      s.seasonNumber > 2147483647 ||
      !Number.isSafeInteger(s.cycleNumber) ||
      s.cycleNumber < 1 ||
      s.cycleNumber > 2147483647 ||
      typeof s.createdAt !== "string" ||
      !Number.isFinite(Date.parse(s.createdAt)) ||
      !same(s.roster, roster) ||
      !s.divisions ||
      Object.keys(s.divisions).sort().join() !== [...tiers].join()
    )
      return false;
    if (
      s.cycleNumber === 1
        ? s.previousSeasonId !== null
        : !identity(s.previousSeasonId) || s.previousSeasonId === s.seasonId
    )
      return false;
    const matchIds = new Set<string>(),
      orders = new Set<number>();
    function check(m: Match, ids: TeamId[], expected: string) {
      if (
        !m ||
        m.id !== expected ||
        matchIds.has(m.id) ||
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
    const all: TeamId[] = [];
    for (const [ti, tier] of tiers.entries()) {
      const d = s.divisions[tier];
      if (
        !d ||
        !Array.isArray(d.teamIds) ||
        d.teamIds.length !== 16 ||
        !Array.isArray(d.groups) ||
        d.groups.length !== 4 ||
        !Array.isArray(d.pots) ||
        d.pots.length !== 4
      )
        return false;
      all.push(...d.teamIds);
      if (
        s.cycleNumber === 1 &&
        !same(d.teamIds, roster.slice(ti * 16, ti * 16 + 16))
      )
        return false;
      const sorted = [...d.teamIds].sort((a, b) => get(a).rank - get(b).rank);
      for (let p = 0; p < 4; p++)
        if (!same(d.pots[p], sorted.slice(p * 4, p * 4 + 4))) return false;
      if (
        !same(
          d.groups.flatMap((g) => g.teamIds),
          d.teamIds,
        )
      )
        return false;
      for (const [i, g] of d.groups.entries()) {
        if (
          !same(g.tie, g.teamIds) ||
          g.teamIds.length !== 4 ||
          !Array.isArray(g.rounds) ||
          g.rounds.length !== 6 ||
          d.pots.some(
            (p) => g.teamIds.filter((id) => p.includes(id)).length !== 1,
          )
        )
          return false;
        const pairs = new Set<string>();
        for (let r = 0; r < 6; r++) {
          const row = g.rounds[r];
          if (
            !Array.isArray(row) ||
            row.length !== 2 ||
            new Set(row.flatMap((m) => [m.a, m.b])).size !== 4
          )
            return false;
          for (const [j, m] of row.entries()) {
            if (!check(m, g.teamIds, `N${tier}${i}-${r}-${j}`)) return false;
            const key = [m.a, m.b].sort().join(":");
            if (r < 3) {
              if (pairs.has(key)) return false;
              pairs.add(key);
            } else {
              const first = g.rounds[r - 3][j];
              if (m.a !== first.b || m.b !== first.a) return false;
            }
          }
        }
      }
    }
    if (!same(all, roster)) return false;
    if (s.playoff === null) return true;
    if (
      !s.playoff ||
      !nationsGroupsDone(s) ||
      Object.keys(s.playoff).sort().join() !== [...nationsStages].sort().join()
    )
      return false;
    const b = s.playoff,
      tables = s.divisions.A.groups.map(fullStandings),
      leaders = tables.map((t) => t[0].id),
      runners = tables.map((t) => t[1].id),
      eligible = [...leaders, ...runners],
      groupOf = (id: TeamId) =>
        s.divisions.A.groups.findIndex((g) => g.teamIds.includes(id));
    if (
      !Array.isArray(b.qf) ||
      b.qf.length !== 4 ||
      !same(
        b.qf.flatMap((m) => [m.a, m.b]),
        eligible,
      )
    )
      return false;
    for (const [i, m] of b.qf.entries())
      if (
        !check(m, eligible, `NQ${i}`) ||
        !leaders.includes(m.a) ||
        !runners.includes(m.b) ||
        groupOf(m.a) === groupOf(m.b)
      )
        return false;
    for (const [from, to, prefix] of [
      ["qf", "sf", "NS"],
      ["sf", "final", "NF"],
    ] as const) {
      const ready = !!b[from].length && b[from].every((m) => m.sets);
      if (
        !Array.isArray(b[to]) ||
        b[to].length !== (ready ? b[from].length / 2 : 0)
      )
        return false;
      for (const [i, m] of b[to].entries())
        if (
          !check(m, eligible, `${prefix}${i}`) ||
          m.a !== winner(b[from][i * 2]) ||
          m.b !== winner(b[from][i * 2 + 1])
        )
          return false;
    }
    const bronzeReady = b.sf.length === 2 && b.sf.every((m) => m.sets);
    if (!Array.isArray(b.bronze) || b.bronze.length !== (bronzeReady ? 1 : 0))
      return false;
    if (
      bronzeReady &&
      (!check(b.bronze[0], eligible, "NB0") ||
        b.bronze[0].a !== loser(b.sf[0]) ||
        b.bronze[0].b !== loser(b.sf[1]))
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
export function validNationsTransition(
  previous: NationsSeason,
  next: NationsSeason,
) {
  if (
    !validNationsSeason(previous) ||
    !validNationsSeason(next) ||
    !nationsComplete(previous) ||
    next.campaignId !== previous.campaignId ||
    next.previousSeasonId !== previous.seasonId ||
    next.cycleNumber !== previous.cycleNumber + 1 ||
    next.seasonId === previous.seasonId
  )
    return false;
  const expected = nextDivisions(previous);
  return tiers.every((t) => same(next.divisions[t].teamIds, expected[t]));
}

/** Actual division membership changes, independently of this season's group draw. */
export function nationsTransfers(previous: NationsSeason, next: NationsSeason) {
  if (!validNationsTransition(previous, next))
    throw Error("Hai mùa không có kết quả chuyển hạng hợp lệ.");
  return previous.roster.flatMap((id) => {
    const from = tiers.find((t) => previous.divisions[t].teamIds.includes(id))!,
      to = tiers.find((t) => next.divisions[t].teamIds.includes(id))!;
    return from === to
      ? []
      : [{ id, from, to, promoted: tiers.indexOf(to) < tiers.indexOf(from) }];
  });
}
