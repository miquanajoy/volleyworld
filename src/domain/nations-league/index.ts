import { get, regionTeams } from "../../data/teams";
import type { Match, Region, SetScore, TeamId } from "../types";
import {
  fullLeague,
  fullStandings,
  fullLeagueDone,
  compareThirds,
} from "../full-season/league";
import { groupBerths } from "../full-season/regional";
import { shuffle } from "../shared/random";
import { simulate } from "../match/simulation";
import { validate, winner, loser } from "../match/scoring";
import {
  tiers,
  nationsStages,
  nationsPlayOrder,
  type Tier,
  type NationsDivision,
  type NationsSeason,
} from "./types";
export * from "./types";
export const nationsQuotas: Record<Region, number> = {
  CEV: 25,
  AVC: 15,
  NORCECA: 12,
  CAVB: 8,
  CSV: 4,
};
export const nationsRoster = () =>
  Object.entries(nationsQuotas)
    .flatMap(([r, n]) =>
      regionTeams(r as Region)
        .slice(0, n)
        .map((t) => t.id),
    )
    .sort((a, b) => get(a).rank - get(b).rank);
function division(ids: TeamId[], tier: Tier): NationsDivision {
  const sorted = [...ids].sort((a, b) => get(a).rank - get(b).rank),
    pots = Array.from({ length: 4 }, (_, i) => sorted.slice(i * 4, i * 4 + 4)),
    groups: TeamId[][] = Array.from({ length: 4 }, () => []);
  pots.forEach((p) => shuffle(p).forEach((id, i) => groups[i].push(id)));
  return {
    teamIds: sorted,
    pots,
    groups: groups.map((ids, i) => {
      const g = fullLeague(ids, `N${tier}${i}`);
      g.rounds.push(
        ...g.rounds.map((row, r) =>
          row.map((m, j) => ({
            id: `N${tier}${i}-${r + 3}-${j}`,
            a: m.b,
            b: m.a,
            sets: null,
          })),
        ),
      );
      return g;
    }),
  };
}
export function freshNationsSeason(
  number = 1,
  previous?: NationsSeason,
): NationsSeason {
  if (previous && !nationsComplete(previous))
    throw Error("Cần hoàn tất mùa trước để tạo mùa tiếp theo.");
  const roster = previous ? [...previous.roster] : nationsRoster(),
    next = previous ? nextDivisions(previous) : null;
  return {
    version: 1,
    mode: "nations-league",
    seasonId: crypto.randomUUID(),
    seasonNumber: number,
    createdAt: new Date().toISOString(),
    campaignId: previous?.campaignId || crypto.randomUUID(),
    cycleNumber: (previous?.cycleNumber || 0) + 1,
    previousSeasonId: previous?.seasonId || null,
    roster,
    divisions: Object.fromEntries(
      tiers.map((tier, i) => [
        tier,
        division(next ? next[tier] : roster.slice(i * 16, i * 16 + 16), tier),
      ]),
    ) as NationsSeason["divisions"],
    playoff: null,
  };
}
export const nationsGroups = (s: NationsSeason) =>
  tiers.flatMap((t) => s.divisions[t].groups);
export const nationsMatches = (s: NationsSeason): Match[] => [
  ...nationsGroups(s).flatMap((g) => g.rounds.flat()),
  ...nationsStages.flatMap((k) => s.playoff?.[k] || []),
];
export const nationsRoundMatches = (s: NationsSeason, r: number) =>
  nationsGroups(s).flatMap((g) => g.rounds[r] || []);
export const nationsCurrentRound = (s: NationsSeason) =>
  [0, 1, 2, 3, 4, 5].find((r) =>
    nationsRoundMatches(s, r).some((m) => !m.sets),
  ) ?? 5;
export const nationsGroupsDone = (s: NationsSeason) =>
  nationsGroups(s).every(fullLeagueDone);
export const nationsComplete = (s: NationsSeason) =>
  nationsGroupsDone(s) &&
  !!s.playoff?.final[0]?.sets &&
  !!s.playoff?.bronze[0]?.sets;
export function nationsMovements(s: NationsSeason) {
  return Object.fromEntries(
    tiers.map((t) => [
      t,
      {
        up:
          t === "A"
            ? []
            : s.divisions[t].groups.map((g) => fullStandings(g)[0].id),
        down:
          t === "D"
            ? []
            : s.divisions[t].groups.map((g) => fullStandings(g)[3].id),
      },
    ]),
  ) as Record<Tier, { up: TeamId[]; down: TeamId[] }>;
}
export function nextDivisions(s: NationsSeason): Record<Tier, TeamId[]> {
  if (!nationsGroupsDone(s))
    throw Error("Cần hoàn tất vòng bảng để chốt lên/xuống hạng.");
  const changes = nationsMovements(s);
  return Object.fromEntries(
    tiers.map((t, i) => [
      t,
      [
        ...s.divisions[t].teamIds.filter(
          (id) => !changes[t].up.includes(id) && !changes[t].down.includes(id),
        ),
        ...(i > 0 ? changes[tiers[i - 1]].down : []),
        ...(i < 3 ? changes[tiers[i + 1]].up : []),
      ],
    ]),
  ) as Record<Tier, TeamId[]>;
}
export function nationsBerths(g: ReturnType<typeof fullLeague>, tier: Tier) {
  const top = groupBerths(g, tier === "A" ? 2 : 1),
    bottom = groupBerths(g, 3);
  return Object.fromEntries(
    g.teamIds.map((id) => [
      id,
      {
        playoff: tier === "A" && top[id].qualified,
        up: tier !== "A" && top[id].qualified,
        down: tier !== "D" && bottom[id].eliminated,
      },
    ]),
  );
}
export function drawNationsPlayoff(s: NationsSeason) {
  if (s.playoff || !nationsGroupsDone(s))
    throw Error("Hoàn tất cả 6 lượt trước khi bốc thăm playoff.");
  const tables = s.divisions.A.groups.map(fullStandings),
    leaders = shuffle(tables.map((t) => t[0].id)),
    runners = shuffle(tables.map((t) => t[1].id)),
    pairs: [TeamId, TeamId][] = [];
  const group = (id: TeamId) =>
    s.divisions.A.groups.findIndex((g) => g.teamIds.includes(id));
  function place(i: number): boolean {
    if (i === 4) return true;
    for (const id of runners) {
      if (group(id) === group(leaders[i]) || pairs.some((p) => p.includes(id)))
        continue;
      pairs.push([leaders[i], id]);
      if (place(i + 1)) return true;
      pairs.pop();
    }
    return false;
  }
  if (!place(0)) throw Error("Không thể bốc thăm tứ kết hợp lệ.");
  s.playoff = {
    qf: shuffle(pairs).map(([a, b], i) => ({ id: `NQ${i}`, a, b, sets: null })),
    sf: [],
    final: [],
    bronze: [],
  };
}
export function advanceNations(s: NationsSeason) {
  const b = s.playoff;
  if (!b) return;
  for (const [from, to, prefix] of [
    ["qf", "sf", "NS"],
    ["sf", "final", "NF"],
  ] as const) {
    if (b[to].length || !b[from].length || !b[from].every((m) => m.sets))
      continue;
    for (let i = 0; i < b[from].length; i += 2)
      b[to].push({
        id: `${prefix}${i / 2}`,
        a: winner(b[from][i])!,
        b: winner(b[from][i + 1])!,
        sets: null,
      });
    if (from === "sf")
      b.bronze = [
        { id: "NB0", a: loser(b.sf[0])!, b: loser(b.sf[1])!, sets: null },
      ];
  }
}
export function stampNations(s: NationsSeason) {
  let order = Math.max(0, ...nationsMatches(s).map((m) => m.resultOrder || 0));
  for (const m of nationsMatches(s))
    if (m.sets && !m.resultOrder) m.resultOrder = ++order;
}
export function nationsMatchLocked(s: NationsSeason, m: Match) {
  if (nationsComplete(s)) return true;
  const g = nationsGroups(s).find((g) => g.rounds.flat().includes(m));
  if (g)
    return (
      !!s.playoff ||
      g.rounds.findIndex((row) => row.includes(m)) > nationsCurrentRound(s)
    );
  const b = s.playoff;
  if (!b) return true;
  if (b.qf.includes(m)) return !!b.sf.length;
  if (b.sf.includes(m)) return !!b.final.length;
  if (b.final.includes(m)) return !b.bronze[0]?.sets;
  return false;
}
export function recordNationsScore(
  s: NationsSeason,
  id: string,
  sets: SetScore[],
) {
  const m = nationsMatches(s).find((m) => m.id === id);
  if (!m || nationsMatchLocked(s, m) || !validate(sets))
    throw Error("Trận chưa sẵn sàng, đã khóa hoặc điểm không hợp lệ.");
  m.sets = sets.map((p) => [...p]);
  advanceNations(s);
  stampNations(s);
}
export function simulateNationsRound(s: NationsSeason, r: number) {
  if (s.playoff || r < 0 || r > nationsCurrentRound(s) || !Number.isInteger(r))
    throw Error("Cần hoàn tất lượt hiện tại trước.");
  nationsRoundMatches(s, r)
    .filter((m) => !m.sets)
    .forEach(simulate);
  stampNations(s);
}
export function finishNations(s: NationsSeason) {
  for (let r = 0; r < 6; r++) simulateNationsRoundIfOpen(s, r);
  if (!s.playoff) drawNationsPlayoff(s);
  for (const k of nationsPlayOrder) {
    s.playoff![k].filter((m) => !m.sets).forEach(simulate);
    advanceNations(s);
    stampNations(s);
  }
}
function simulateNationsRoundIfOpen(s: NationsSeason, r: number) {
  if (!s.playoff) simulateNationsRound(s, r);
}
export function nationsPodium(s: NationsSeason) {
  return nationsComplete(s)
    ? [
        winner(s.playoff!.final[0])!,
        loser(s.playoff!.final[0])!,
        winner(s.playoff!.bronze[0])!,
      ]
    : [];
}
export function nationsPlacements(s: NationsSeason): Record<
  TeamId,
  {
    from: number;
    to: number;
    tier: Tier;
    group: number;
    rank: number;
    movement: string;
  }
> {
  if (!nationsComplete(s)) return {};
  const out: ReturnType<typeof nationsPlacements> = {};
  tiers.forEach((tier, ti) =>
    s.divisions[tier].groups.forEach((g, group) =>
      fullStandings(g).forEach((t, i) => {
        out[t.id] = {
          from: ti * 16 + i * 4 + 1,
          to: ti * 16 + i * 4 + 4,
          tier,
          group,
          rank: i + 1,
          movement:
            tier !== "A" && i === 0
              ? `Lên ${tiers[ti - 1]}`
              : tier !== "D" && i === 3
                ? `Xuống ${tiers[ti + 1]}`
                : "Giữ hạng",
        };
      }),
    ),
  );
  s.playoff!.qf.forEach((m) => {
    out[loser(m)!].from = 5;
    out[loser(m)!].to = 8;
  });
  out[loser(s.playoff!.bronze[0])!].from = 4;
  out[loser(s.playoff!.bronze[0])!].to = 4;
  nationsPodium(s).forEach((id, i) => {
    out[id].from = i + 1;
    out[id].to = i + 1;
  });
  return out;
}
export function nationsStandingsAcross(s: NationsSeason, tier: Tier) {
  return s.divisions[tier].groups
    .flatMap(fullStandings)
    .sort((a, b) => compareThirds(a, b, s.roster));
}
export * from "./validation";

export * from "./archive";
