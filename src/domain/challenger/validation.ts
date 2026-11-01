import { get } from "../../data/teams";
import { validate, winner, loser } from "../match/scoring";
import { worldStages } from "../full-season/types";
import { seedSlots } from "../full-season/qualification";
import type { Match, TeamId } from "../types";
import { validChallengerRoster, challengerStandings, swissDone } from "./index";
import { roundSizes, type ChallengerSeason } from "./types";
const same = (a: TeamId[], b: TeamId[]) =>
  Array.isArray(a) &&
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
export function validChallenger(value: unknown): value is ChallengerSeason {
  try {
    const s = value as ChallengerSeason,
      roster = s?.roster;
    if (
      !s ||
      s.version !== 1 ||
      s.mode !== "challenger" ||
      typeof s.seasonId !== "string" ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(s.seasonId) ||
      !Number.isSafeInteger(s.seasonNumber) ||
      s.seasonNumber < 1 ||
      s.seasonNumber > 2147483647 ||
      typeof s.createdAt !== "string" ||
      !Number.isFinite(Date.parse(s.createdAt)) ||
      !validChallengerRoster(roster) ||
      roster.some(
        (id, i) => i > 0 && get(roster[i - 1]).rank >= get(id).rank,
      ) ||
      !same(s.tie, roster) ||
      !Array.isArray(s.rounds) ||
      s.rounds.length < 1 ||
      s.rounds.length > 5
    )
      return false;
    const orders = new Set<number>(),
      ids = new Set<string>(),
      pairs = new Set<string>(),
      records = Object.fromEntries(roster.map((id) => [id, { w: 0, l: 0 }]));
    function check(m: Match, id: string) {
      if (
        !m ||
        m.id !== id ||
        ids.has(id) ||
        m.a === m.b ||
        !roster.includes(m.a) ||
        !roster.includes(m.b) ||
        (m.sets !== null && !validate(m.sets))
      )
        return false;
      if (m.sets) {
        if (
          !Number.isSafeInteger(m.resultOrder) ||
          m.resultOrder! < 1 ||
          orders.has(m.resultOrder!)
        )
          return false;
        orders.add(m.resultOrder!);
      } else if (m.resultOrder !== undefined) return false;
      ids.add(id);
      return true;
    }
    for (const [r, row] of s.rounds.entries()) {
      if (
        !Array.isArray(row) ||
        row.length !== roundSizes[r] ||
        (r > 0 && !s.rounds[r - 1].every((m) => m.sets))
      )
        return false;
      const active = roster.filter(
          (id) => records[id].w < 3 && records[id].l < 3,
        ),
        players: TeamId[] = [],
        priorMax = Math.max(0, ...orders);
      for (const [i, m] of row.entries()) {
        if (
          !check(m, `C${r}-${i}`) ||
          !active.includes(m.a) ||
          !active.includes(m.b)
        )
          return false;
        const a = records[m.a],
          b = records[m.b],
          key = [m.a, m.b].sort().join(":");
        if (
          a.w !== b.w ||
          a.l !== b.l ||
          pairs.has(key) ||
          (r === 0 &&
            (roster.indexOf(m.a) >= 16 ||
              roster.indexOf(m.b) < 16 ||
              get(m.a).region === get(m.b).region)) ||
          (m.sets && m.resultOrder! <= priorMax)
        )
          return false;
        players.push(m.a, m.b);
        pairs.add(key);
      }
      if (!same(players, active)) return false;
      for (const m of row)
        if (m.sets) {
          records[winner(m)!].w++;
          records[loser(m)!].l++;
        }
    }
    if (s.bracket === null) return true;
    const b = s.bracket;
    if (
      !b ||
      !swissDone(s) ||
      Object.keys(b).sort().join() !== [...worldStages].sort().join() ||
      !Array.isArray(b.r16) ||
      b.r16.length !== 8
    )
      return false;
    const entrants = b.r16.flatMap((m) => [m.a, m.b]),
      qualified = challengerStandings(s)
        .filter((r) => r.w === 3)
        .map((r) => r.id);
    if (!same(entrants, qualified)) return false;
    const slots = seedSlots(16),
      seeds: TeamId[] = [];
    entrants.forEach((id, i) => (seeds[slots[i] - 1] = id));
    if (seeds.some((id, i) => records[id].l !== (i < 4 ? 0 : i < 10 ? 1 : 2)))
      return false;
    const swissMax = Math.max(
      0,
      ...s.rounds.flat().map((m) => m.resultOrder || 0),
    );
    for (const [i, m] of b.r16.entries())
      if (!check(m, `CR${i}`) || (m.sets && m.resultOrder! <= swissMax))
        return false;
    for (const [from, to, prefix] of [
      ["r16", "qf", "CQ"],
      ["qf", "sf", "CS"],
      ["sf", "final", "CF"],
    ] as const) {
      const ready = b[from].length > 0 && b[from].every((m) => m.sets),
        expected = ready ? b[from].length / 2 : 0;
      if (!Array.isArray(b[to]) || b[to].length !== expected) return false;
      const priorMax = Math.max(0, ...b[from].map((m) => m.resultOrder || 0));
      for (const [i, m] of b[to].entries())
        if (
          !check(m, `${prefix}${i}`) ||
          m.a !== winner(b[from][2 * i]) ||
          m.b !== winner(b[from][2 * i + 1]) ||
          (m.sets && m.resultOrder! <= priorMax)
        )
          return false;
    }
    if (
      !Array.isArray(b.bronze) ||
      b.bronze.length !== (b.final.length ? 1 : 0)
    )
      return false;
    if (b.bronze.length) {
      const m = b.bronze[0];
      if (
        !check(m, "CB0") ||
        m.a !== loser(b.sf[0]) ||
        m.b !== loser(b.sf[1]) ||
        (m.sets &&
          m.resultOrder! <= Math.max(...b.sf.map((m) => m.resultOrder!)))
      )
        return false;
    }
    if (
      b.final[0]?.sets &&
      (!b.bronze[0]?.sets ||
        b.final[0].resultOrder! <= b.bronze[0].resultOrder!)
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
