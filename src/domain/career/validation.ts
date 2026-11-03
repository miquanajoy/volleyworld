import { get } from "../../data/teams";
import type {
  FullSeason,
  FullLeague,
  QualifierBracket,
} from "../full-season/types";
import { regionOrder, worldStages } from "../full-season/types";
import type { Match } from "../types";
import { validate, winner, loser } from "../match/scoring";
import { qualifierPlayers } from "../full-season/qualification";
import { fullLeagueDone } from "../full-season/league";
import { regionalGroup } from "../full-season/regional";
import {
  allocateCareerSlots,
  outsideCareerTeams,
  validCareerRoster,
} from "./allocation";
import {
  careerRegionalDone,
  careerRegionalLayout,
  careerRegionalBranchSeeds,
} from "./regionals";
import {
  careerPlayinFields,
  careerFinalPlayers,
  careerPlayinDone,
  careerConfirmed,
} from "./playin";
import { careerWorldPairs } from "./world";
export const sameCareerSet = (a: string[], b: string[]) =>
  Array.isArray(a) &&
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
export function validCareerFull(input: unknown): input is FullSeason {
  try {
    const s = input as FullSeason,
      c = s.career;
    if (
      typeof s?.seasonId !== "string" ||
      s?.version !== 1 ||
      s.mode !== "full-season" ||
      s.regionalFormat !== "career-v1" ||
      !c ||
      !validCareerRoster(c.leagueRoster) ||
      !Number.isSafeInteger(s.seasonNumber) ||
      s.seasonNumber < 1 ||
      !Number.isFinite(Date.parse(s.createdAt)) ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(s.seasonId) ||
      s.automatic !== undefined ||
      s.intercontinental !== undefined ||
      Object.keys(s.regions).length !== 5
    )
      return false;
    const slots = allocateCareerSlots(c.leagueRoster, s.seasonNumber);
    if (
      !c.slots ||
      Object.keys(c.slots).length !== 5 ||
      regionOrder.some((r) => c.slots[r] !== slots[r])
    )
      return false;
    const ids = new Set<string>(),
      orders = new Set<number>();
    function match(m: Match, teams: string[], id?: string) {
      if (
        !m ||
        typeof m.id !== "string" ||
        !/^[A-Z0-9-]{1,64}$/.test(m.id) ||
        ids.has(m.id) ||
        (id && m.id !== id) ||
        m.a === m.b ||
        !teams.includes(m.a) ||
        !teams.includes(m.b) ||
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
      ids.add(m.id);
      return true;
    }
    function league(g: FullLeague, teams: string[], prefix: string) {
      const n = teams.length,
        rounds = n % 2 ? n : n - 1;
      if (
        !g ||
        !sameCareerSet(g.teamIds, teams) ||
        !sameCareerSet(g.tie, teams) ||
        !Array.isArray(g.rounds) ||
        g.rounds.length !== rounds
      )
        return false;
      const pairs = new Set<string>();
      for (const [r, row] of g.rounds.entries()) {
        if (
          !Array.isArray(row) ||
          row.length !== Math.floor(n / 2) ||
          new Set(row.flatMap((m) => [m.a, m.b])).size !== 2 * row.length
        )
          return false;
        for (const m of row) {
          if (!m.id.startsWith(`${prefix}-${r}-`) || !match(m, teams))
            return false;
          const pair = [m.a, m.b].sort().join(":");
          if (pairs.has(pair)) return false;
          pairs.add(pair);
        }
      }
      return pairs.size === (n * (n - 1)) / 2;
    }
    function bracket(b: QualifierBracket, seeds: string[], prefix: string) {
      if (
        !b ||
        Object.keys(b).sort().join() !== "rounds,seeds" ||
        JSON.stringify(b.seeds) !== JSON.stringify(seeds) ||
        !Array.isArray(b.rounds) ||
        b.rounds.length !== Math.ceil(Math.log2(seeds.length))
      )
        return false;
      for (let r = 0; r < b.rounds.length; r++) {
        const players = qualifierPlayers(b, r),
          pairs: Match[] = [];
        if (players)
          for (let i = 0; i < players.length; i += 2)
            if (players[i] && players[i + 1])
              pairs.push({
                id: `${prefix}K${r}-${i / 2}`,
                a: players[i]!,
                b: players[i + 1]!,
                sets: null,
              });
        if (b.rounds[r].length !== pairs.length) return false;
        for (let i = 0; i < pairs.length; i++) {
          const m = b.rounds[r][i],
            p = pairs[i];
          if (!match(m, seeds, p.id) || m.a !== p.a || m.b !== p.b)
            return false;
        }
      }
      return true;
    }
    for (const r of regionOrder) {
      const g = s.regions[r],
        expected = outsideCareerTeams(c.leagueRoster, r),
        q = c.slots[r];
      if (
        !g ||
        !sameCareerSet(g.teamIds, expected) ||
        !sameCareerSet(g.tie, expected) ||
        g.playoff !== undefined ||
        g.decider !== undefined ||
        g.directSlots !== undefined ||
        !Array.isArray(g.groups) ||
        !sameCareerSet(g.groups.flat(), expected)
      )
        return false;
      if (!q || q === expected.length) {
        if (
          g.rounds.length ||
          g.pots !== undefined ||
          !Array.isArray(g.qualifierBranches) ||
          g.qualifierBranches.length ||
          g.groups.length !== (expected.length ? 1 : 0)
        )
          return false;
        continue;
      }
      const count = Math.ceil(expected.length / 6);
      if (
        g.groups.length !== count ||
        !Array.isArray(g.pots) ||
        g.pots.length !== Math.ceil(expected.length / count)
      )
        return false;
      for (let i = 0; i < g.pots.length; i++)
        if (
          !sameCareerSet(
            g.pots[i],
            expected.slice(i * count, (i + 1) * count),
          ) ||
          g.groups.some(
            (group) => group.filter((id) => g.pots![i].includes(id)).length > 1,
          )
        )
          return false;
      if (
        g.groups.some(
          (group, i) =>
            group.length !== Math.ceil((expected.length - i) / count),
        )
      )
        return false;
      const nRounds = Math.max(
        ...g.groups.map((group) =>
          group.length % 2 ? group.length : group.length - 1,
        ),
      );
      if (!Array.isArray(g.rounds) || g.rounds.length !== nRounds) return false;
      for (let r0 = 0; r0 < g.rounds.length; r0++) {
        const expectedCount = g.groups.reduce(
          (n, group) =>
            n +
            (r0 < (group.length % 2 ? group.length : group.length - 1)
              ? Math.floor(group.length / 2)
              : 0),
          0,
        );
        if (
          !Array.isArray(g.rounds[r0]) ||
          g.rounds[r0].length !== expectedCount ||
          g.rounds[r0].some(
            (m) =>
              !g.groups!.some(
                (group) => group.includes(m.a) && group.includes(m.b),
              ),
          )
        )
          return false;
      }
      for (let i = 0; i < g.groups.length; i++)
        if (!league(regionalGroup(g, i), g.groups[i], `${r}G${i}`))
          return false;
      let pending = false;
      for (const row of g.rounds) {
        if (!Array.isArray(row) || (pending && row.some((m) => m.sets)))
          return false;
        if (row.some((m) => !m.sets)) pending = true;
      }
      if (!fullLeagueDone(g)) {
        if (g.qualifierBranches !== null) return false;
      } else {
        const seeds = careerRegionalBranchSeeds(s, r);
        if (
          !Array.isArray(g.qualifierBranches) ||
          g.qualifierBranches.length !== careerRegionalLayout(s, r).remaining
        )
          return false;
        for (let i = 0; i < seeds.length; i++)
          if (!bracket(g.qualifierBranches[i], seeds[i], `${r}B${i}`))
            return false;
      }
    }
    if (c.playin !== null) {
      const p = c.playin;
      if (
        !p ||
        !regionOrder.every((r) => careerRegionalDone(s.regions[r])) ||
        !sameCareerSet(p.league16, [...p.league16]) ||
        p.league16.length !== 16 ||
        p.league16.some((id) => !c.leagueRoster.includes(id)) ||
        !sameCareerSet(p.challenger, [...p.challenger]) ||
        p.challenger.length !== 2 ||
        p.challenger.some((id) => !c.leagueRoster.includes(id))
      )
        return false;
      const f = careerPlayinFields(s),
        d = f.extra.length,
        k = 16 - d;
      if (
        !Array.isArray(p.draw) ||
        p.draw.length !== k ||
        new Set(p.draw).size !== k ||
        p.draw.some((n) => !Number.isInteger(n) || n < 0 || n >= k) ||
        !Array.isArray(p.preliminary) ||
        p.preliminary.length !== d
      )
        return false;
      const low = f.regional.slice(16 - 2 * d);
      for (let i = 0; i < d; i++) {
        const m = p.preliminary[i];
        if (
          !match(m, f.regional, `WP${i}`) ||
          m.a !== low[i] ||
          m.b !== low[2 * d - 1 - i]
        )
          return false;
      }
      const final = careerFinalPlayers(s);
      if (
        !Array.isArray(p.final) ||
        p.final.length !== (final ? final.length : 0)
      )
        return false;
      for (let i = 0; i < p.final.length; i++) {
        const m = p.final[i],
          p0 = final![i];
        if (
          !match(m, [...f.league, ...f.regional], p0.id) ||
          m.a !== p0.a ||
          m.b !== p0.b
        )
          return false;
      }
    }
    if (s.world === null) return true;
    if (!careerPlayinDone(s)) return false;
    const w = s.world,
      confirmed = careerConfirmed(s),
      p = c.playin!,
      ic = p.final
        .map((m) => winner(m)!)
        .sort((a, b) => get(a).rank - get(b).rank),
      extra = p.challenger.filter((id) => !p.league16.includes(id));
    if (
      !w ||
      w.groups.length !== 8 ||
      w.pots.length !== 4 ||
      w.pots.some((p) => p.length !== 8) ||
      !sameCareerSet(w.pots.flat(), confirmed) ||
      !sameCareerSet(w.tie, confirmed) ||
      !sameCareerSet(
        w.groups.flatMap((g) => g.teamIds),
        confirmed,
      ) ||
      !sameCareerSet([...w.pots[0], ...w.pots[1]], p.league16) ||
      !sameCareerSet(w.pots[2], [...extra, ...ic.slice(0, 8 - extra.length)]) ||
      !sameCareerSet(w.pots[3], ic.slice(8 - extra.length))
    )
      return false;
    for (let i = 0; i < 8; i++) {
      const g = w.groups[i];
      if (
        g.teamIds.length !== 4 ||
        !league(g, g.teamIds, `WG${i}`) ||
        w.pots.some(
          (p) => g.teamIds.filter((id) => p.includes(id)).length !== 1,
        ) ||
        regionOrder.some(
          (r) => g.teamIds.filter((id) => get(id).region === r).length > 2,
        )
      )
        return false;
    }
    let pending = false;
    for (let r = 0; r < 3; r++) {
      const row = w.groups.flatMap((g) => g.rounds[r]);
      if (pending && row.some((m) => m.sets)) return false;
      if (row.some((m) => !m.sets)) pending = true;
    }
    const b = w.bracket;
    if (b === null) return true;
    if (
      pending ||
      Object.keys(b).sort().join() !== [...worldStages].sort().join()
    )
      return false;
    const pairs = careerWorldPairs(w);
    if (b.r16.length !== 8) return false;
    for (let i = 0; i < 8; i++) {
      const m = b.r16[i];
      if (
        !match(m, confirmed, `WR${i}`) ||
        m.a !== pairs[i][0] ||
        m.b !== pairs[i][1]
      )
        return false;
    }
    for (const [from, to, prefix] of [
      ["r16", "qf", "WQ"],
      ["qf", "sf", "WS"],
      ["sf", "final", "WF"],
    ] as const) {
      const ready = b[from].length > 0 && b[from].every((m) => m.sets);
      if (
        !Array.isArray(b[to]) ||
        b[to].length !== (ready ? b[from].length / 2 : 0)
      )
        return false;
      for (let i = 0; i < b[to].length; i++) {
        const m = b[to][i];
        if (
          !match(m, confirmed, prefix + i) ||
          m.a !== winner(b[from][2 * i]) ||
          m.b !== winner(b[from][2 * i + 1])
        )
          return false;
      }
    }
    const ready = b.sf.length === 2 && b.sf.every((m) => m.sets);
    if (!Array.isArray(b.bronze) || b.bronze.length !== (ready ? 1 : 0))
      return false;
    if (ready) {
      const m = b.bronze[0];
      if (
        !match(m, confirmed, "WB0") ||
        m.a !== loser(b.sf[0]) ||
        m.b !== loser(b.sf[1])
      )
        return false;
    }
    if (
      b.final[0]?.sets &&
      (!b.bronze[0]?.sets ||
        !b.final[0].resultOrder ||
        !b.bronze[0].resultOrder ||
        b.final[0].resultOrder <= b.bronze[0].resultOrder)
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
