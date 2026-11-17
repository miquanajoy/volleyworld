import type { Match } from "../types";
import { validate } from "../match/scoring";
import { regions, type CircuitSeason, type CircuitBracket } from "./types";
import { plan, projection, bracketDone, bracketRanks } from "./bracket";
import {
  validSelection,
  matches,
  stageDone,
  directTickets,
  points,
  qualifiers,
  leagueRanks,
  regionOf,
  nextSeeds,
} from "./index";
import { get } from "../../data/teams";
import * as C from "../challenger/index";
import * as F from "../full-season/index";
import { careerWorldPairs } from "../career/world";
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const same = (a: string[], b: string[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
function validBracket(b: CircuitBracket) {
  if (
    !b ||
    !["single", "double", "top2", "top4", "gsl"].includes(b.kind) ||
    ![4, 8, 16].includes(b.seeds.length) ||
    new Set(b.seeds).size !== b.seeds.length ||
    b.seeds.some((id) => !get(id)) ||
    !Array.isArray(b.rounds)
  )
    return false;
  const p = plan(b);
  if (!b.rounds.length || b.rounds.length > p.length) return false;
  const slots = projection(b);
  for (let r = 0; r < b.rounds.length; r++) {
    const row = b.rounds[r];
    if (
      row.length !== p[r].pairs.length ||
      (r > 0 && !b.rounds[r - 1].every((m) => m.sets))
    )
      return false;
    for (let i = 0; i < row.length; i++) {
      const m = row[i],
        id = p[r].id + "-" + i;
      if (m.id !== id || !equal([m.a, m.b], slots.get(id))) return false;
    }
  }
  if (b.bronzeRequired !== !!b.bronze && b.rounds.length === p.length)
    return false;
  if (b.bronze) {
    const sf = b.rounds.at(-2);
    if (!sf || sf.length !== 2 || !sf.every((m) => m.sets)) return false;
    const losers = sf.map((m) => (m.a === importWinner(m) ? m.b : m.a));
    if (!equal([b.bronze.a, b.bronze.b], losers)) return false;
  }
  return true;
}
import { winner as importWinner } from "../match/scoring";
function validGroups(groups: F.FullLeague[], seeds: string[], count = 2) {
  if (
    groups.length !== count ||
    !same(
      groups.flatMap((g) => g.teamIds),
      seeds,
    )
  )
    return false;
  let pending = false;
  for (let r = 0; r < groups[0].rounds.length; r++) {
    const matches = groups.flatMap((g) => g.rounds[r] || []);
    if (pending && matches.some((m) => m.sets)) return false;
    if (matches.some((m) => !m.sets)) pending = true;
  }
  return groups.every((g) => {
    const n = g.teamIds.length,
      seen = new Set<string>();
    if (g.rounds.length !== n - 1 || !same(g.tie, g.teamIds)) return false;
    return (
      g.rounds.every((row) => {
        if (
          row.length !== n / 2 ||
          !same(
            row.flatMap((m) => [m.a, m.b]),
            g.teamIds,
          )
        )
          return false;
        return row.every((m) => {
          const key = [m.a, m.b].sort().join(":");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }) && seen.size === (n * (n - 1)) / 2
    );
  });
}
export function validCircuit(input: unknown): input is CircuitSeason {
  try {
    const s = input as CircuitSeason;
    if (
      !s ||
      s.version !== 2 ||
      s.mode !== "circuit" ||
      !/^[-\w]{1,100}$/.test(s.seasonId) ||
      !/^[-\w]{1,100}$/.test(s.chainId) ||
      !(
        s.previousSeasonId === null || /^[-\w]{1,100}$/.test(s.previousSeasonId)
      ) ||
      !Number.isSafeInteger(s.seasonNumber) ||
      s.seasonNumber < 1 ||
      !Number.isFinite(Date.parse(s.createdAt)) ||
      !Number.isInteger(s.stage) ||
      s.stage < 0 ||
      s.stage > 7 ||
      !validSelection(s.regions)
    )
      return false;
    for (let i = 0; i < s.stage; i++) if (!stageDone(s, i)) return false;
    if (
      s.stage >= 1 !== !!s.firstStand ||
      s.stage >= 3 !== !!s.challenger ||
      s.stage >= 6 !== !!s.world
    )
      return false;
    for (const r of regions) {
      const z = s.regions[r];
      if (
        z.phases.length !== (s.stage < 2 ? 1 : s.stage < 4 ? 2 : 3) ||
        s.stage >= 5 !== !!z.playin
      )
        return false;
      for (let p = 0; p < z.phases.length; p++)
        for (const tier of ["upper", "lower"] as const) {
          const g = z.phases[p][tier];
          if (!same(g.seeds, z[tier])) return false;
          if (p > 0 && !equal(g.seeds, nextSeeds(z.phases[p - 1][tier])))
            return false;
          if (
            g.groups.length &&
            g.seeds.some(
              (id, i) =>
                i % 2 === 0 &&
                g.groups.some(
                  (group) =>
                    group.teamIds.includes(id) &&
                    group.teamIds.includes(g.seeds[i + 1]),
                ),
            )
          )
            return false;
          if (!(tier === "upper" && p === 0) && !validGroups(g.groups, g.seeds))
            return false;
          if (tier === "upper" && p === 0 && g.groups.length) return false;
          if (g.bracket) {
            if (!validBracket(g.bracket)) return false;
            if (g.groups.length && !g.groups.every(F.fullLeagueDone))
              return false;
            const kind =
              tier === "upper"
                ? p === 0
                  ? "top2"
                  : p === 1
                    ? "single"
                    : "double"
                : "single";
            if (
              g.bracket.kind !== kind ||
              g.bracket.bronzeRequired !== (tier === "upper" && p === 1)
            )
              return false;
            if (p === 0 && tier === "upper" && !equal(g.bracket.seeds, g.seeds))
              return false;
            if (g.groups.length) {
              const [a, b] = g.groups.map(F.fullStandings),
                expected =
                  tier === "upper"
                    ? [
                        a[0].id,
                        b[3].id,
                        b[1].id,
                        a[2].id,
                        b[0].id,
                        a[3].id,
                        a[1].id,
                        b[2].id,
                      ]
                    : [a[0].id, b[1].id, b[0].id, a[1].id];
              if (!equal(g.bracket.seeds, expected)) return false;
            }
          }
        }
      if (z.playin) {
        const direct = directTickets(s, r),
          eligible = points(s, r, true)
            .filter((t) => ![...direct.league, ...direct.points].includes(t.id))
            .map((t) => t.id),
          low = points(s, r, false)
            .slice(0, 4)
            .map((t) => t.id);
        if (
          z.playin.groups.length !== 4 ||
          !same(
            z.playin.groups.flatMap((b) => b.seeds),
            [...eligible, ...low],
          ) ||
          z.playin.groups.some(
            (b) =>
              b.kind !== "gsl" ||
              !validBracket(b) ||
              b.seeds.filter((id) => low.includes(id)).length !== 1,
          )
        )
          return false;
        if (z.playin.bracket) {
          if (
            !z.playin.groups.every(bracketDone) ||
            z.playin.bracket.kind !== "top4" ||
            !validBracket(z.playin.bracket)
          )
            return false;
          const t = z.playin.groups.map(bracketRanks),
            expected = [
              t[0][0].id,
              t[1][1].id,
              t[2][0].id,
              t[3][1].id,
              t[1][0].id,
              t[0][1].id,
              t[3][0].id,
              t[2][1].id,
            ];
          if (!equal(z.playin.bracket.seeds, expected)) return false;
        }
      }
    }
    if (
      s.firstStand &&
      (!validBracket(s.firstStand) ||
        s.firstStand.kind !== "double" ||
        !equal(
          s.firstStand.seeds,
          [0, 1].flatMap((i) =>
            regions.map((r) => leagueRanks(s.regions[r].phases[0].upper)[i].id),
          ),
        ))
    )
      return false;
    // Existing scored legacy draws without an opening override keep their recorded routes.
    if (s.firstStand?.opening) {
      const opening = s.firstStand.opening;
      if (
        !equal(
          opening,
          [0, 5, 2, 7, 1, 4, 3, 6].map((i) => s.firstStand!.seeds[i]),
        ) ||
        new Set(opening.slice(0, 4).map(regionOf)).size !== 4 ||
        new Set(opening.slice(4).map(regionOf)).size !== 4
      )
        return false;
    }
    if (s.challenger) {
      const c = s.challenger,
        entrants = Array.from({ length: 4 }, (_, i) =>
          regions.map((r) => leagueRanks(s.regions[r].phases[1].upper)[i].id),
        ).flat();
      if (
        !same(c.tie, c.roster) ||
        !c.circuit ||
        !equal(c.roster, entrants) ||
        c.rounds.length < 1 ||
        c.rounds.length > 5
      )
        return false;
      const seen = new Set<string>();
      for (let r = 0; r < c.rounds.length; r++) {
        if (r && !c.rounds[r - 1].every((m) => m.sets)) return false;
        const previous = C.challengerStandings(c, r - 1),
          eligible = previous
            .filter((t) => t.w < 3 && t.l < 3)
            .map((t) => t.id);
        if (
          !same(
            c.rounds[r].flatMap((m) => [m.a, m.b]),
            eligible,
          )
        )
          return false;
        for (const m of c.rounds[r]) {
          const key = [m.a, m.b].sort().join(":");
          if (seen.has(key)) return false;
          seen.add(key);
          const a = previous.find((t) => t.id === m.a)!,
            b = previous.find((t) => t.id === m.b)!;
          if (a.w !== b.w || a.l !== b.l) return false;
        }
      }
      if (c.bracket && (!C.swissDone(c) || c.bracket.r16.length)) return false;
    }
    if (s.world) {
      const w = s.world,
        entrants = regions.flatMap((r) => qualifiers(s, r));
      if (
        !validGroups(w.groups, entrants, 8) ||
        w.groups.length !== 8 ||
        w.groups.some((g) => g.teamIds.length !== 4) ||
        !same(
          w.groups.flatMap((g) => g.teamIds),
          entrants,
        ) ||
        w.pots.length !== 4 ||
        w.pots.some((p) => p.length !== 8)
      )
        return false;
      for (const g of w.groups) {
        if (new Set(g.teamIds.map(regionOf)).size !== 4) return false;
        for (const pot of w.pots)
          if (g.teamIds.filter((id) => pot.includes(id)).length !== 1)
            return false;
      }
    }
    function validKnockout(
      b: NonNullable<F.WorldCup["bracket"]>,
      opening: string[],
      start: "qf" | "r16",
    ) {
      if (
        !same(
          b[start].flatMap((m) => [m.a, m.b]),
          opening,
        )
      )
        return false;
      for (const [from, to] of [
        ["r16", "qf"],
        ["qf", "sf"],
        ["sf", "final"],
      ] as const) {
        if (from === "r16" && start === "qf") continue;
        if (b[to].length) {
          if (
            !b[from].length ||
            !b[from].every((m) => m.sets) ||
            b[to].length !== b[from].length / 2
          )
            return false;
          const expected = b[from].map((m) => importWinner(m)!);
          if (
            !equal(
              b[to].flatMap((m) => [m.a, m.b]),
              expected,
            )
          )
            return false;
        }
      }
      if (b.bronze.length) {
        if (
          b.sf.length !== 2 ||
          !b.sf.every((m) => m.sets) ||
          b.bronze.length !== 1
        )
          return false;
        const expected = b.sf.map((m) => (m.a === importWinner(m) ? m.b : m.a));
        if (
          !equal(
            b.bronze.flatMap((m) => [m.a, m.b]),
            expected,
          )
        )
          return false;
      }
      if (b.final.some((m) => m.sets) && !b.bronze.every((m) => m.sets))
        return false;
      return true;
    }
    if (
      s.challenger?.bracket &&
      !validKnockout(
        s.challenger.bracket,
        C.challengerStandings(s.challenger)
          .filter((t) => t.w === 3)
          .map((t) => t.id),
        "qf",
      )
    )
      return false;
    if (s.world?.bracket) {
      if (
        !s.world.groups.every(F.fullLeagueDone) ||
        !validKnockout(s.world.bracket, careerWorldPairs(s.world).flat(), "r16")
      )
        return false;
      if (
        !equal(
          s.world.bracket.r16.flatMap((m) => [m.a, m.b]),
          careerWorldPairs(s.world).flat(),
        )
      )
        return false;
    }
    const ms = matches(s);
    if (new Set(ms.map((m) => m.id)).size !== ms.length || ms.length > 1071)
      return false;
    return ms.every(
      (m: Match) =>
        /^[A-Za-z0-9_-]{1,100}$/.test(m.id) &&
        !!get(m.a) &&
        !!get(m.b) &&
        m.a !== m.b &&
        (m.sets === null || validate(m.sets)) &&
        (m.resultOrder === undefined ||
          (Number.isSafeInteger(m.resultOrder) && m.resultOrder > 0)),
    );
  } catch {
    return false;
  }
}
