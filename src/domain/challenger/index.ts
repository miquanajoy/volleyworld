import { defaultIds, get, limits } from "../../data/teams";
import type { Match, SetScore, TeamId } from "../types";
import { score, validate, winner, loser } from "../match/scoring";
import { simulate } from "../match/simulation";
import { shuffle } from "../shared/random";
import { seedSlots } from "../full-season/qualification";
import {
  worldStages,
  worldPlayOrder,
  type WorldStage,
} from "../full-season/types";
import type { ChallengerSeason } from "./types";
export * from "./types";
export const challengerRoster = () =>
  [...defaultIds].sort((a, b) => get(a).rank - get(b).rank);
export function validChallengerRoster(ids: string[]): boolean {
  if (
    !Array.isArray(ids) ||
    ids.length !== 32 ||
    new Set(ids).size !== 32 ||
    !ids.every((id) => !!get(id))
  )
    return false;
  return Object.entries(limits).every(([region, limit]) => {
    const n = ids.filter((id) => get(id).region === region).length;
    return n >= limit.min && n <= Math.min(limit.max, 16);
  });
}
/** Bipartite matching keeps both seed protection and regional separation. */
function openingOpponents(roster: TeamId[]) {
  const lower = shuffle(roster.slice(16)),
    owner = new Map<TeamId, TeamId>();
  function assign(a: TeamId, seen: Set<TeamId>): boolean {
    for (const b of lower) {
      if (get(a).region === get(b).region || seen.has(b)) continue;
      seen.add(b);
      const previous = owner.get(b);
      if (!previous || assign(previous, seen)) {
        owner.set(b, a);
        return true;
      }
    }
    return false;
  }
  for (const a of shuffle(roster.slice(0, 16)))
    if (!assign(a, new Set()))
      throw Error("Không thể bốc thăm vòng đầu khác khu vực.");
  const opponent = new Map([...owner].map(([b, a]) => [a, b]));
  return roster.slice(0, 16).map((a) => opponent.get(a)!);
}
export function freshChallenger(
  number = 1,
  selected = challengerRoster(),
): ChallengerSeason {
  if (!validChallengerRoster(selected))
    throw Error("Chọn đủ 32 đội và đúng giới hạn khu vực.");
  const roster = [...selected].sort((a, b) => get(a).rank - get(b).rank),
    lower = openingOpponents(roster);
  return {
    version: 1,
    mode: "challenger",
    seasonId: crypto.randomUUID(),
    seasonNumber: number,
    createdAt: new Date().toISOString(),
    roster,
    tie: shuffle(roster),
    rounds: [
      roster
        .slice(0, 16)
        .map((a, i) => ({ id: `C0-${i}`, a, b: lower[i], sets: null })),
    ],
    bracket: null,
  };
}
export const challengerMatches = (s: ChallengerSeason): Match[] => [
  ...s.rounds.flat(),
  ...worldStages.flatMap((k) => s.bracket?.[k] || []),
];
export function challengerStandings(
  s: ChallengerSeason,
  through = s.rounds.length - 1,
) {
  const rows = s.roster.map((id) => ({
      ...get(id),
      w: 0,
      l: 0,
      sf: 0,
      sa: 0,
      pf: 0,
      pa: 0,
      omw: 0,
      opponents: [] as TeamId[],
    })),
    map = Object.fromEntries(rows.map((r) => [r.id, r]));
  for (const m of s.rounds.slice(0, through + 1).flat()) {
    if (!m.sets) continue;
    const [a, b] = score(m),
      x = map[m.a],
      y = map[m.b];
    x.sf += a;
    x.sa += b;
    y.sf += b;
    y.sa += a;
    a > b ? (x.w++, y.l++) : (y.w++, x.l++);
    x.opponents.push(m.b);
    y.opponents.push(m.a);
    for (const [p, q] of m.sets) {
      x.pf += p;
      x.pa += q;
      y.pf += q;
      y.pa += p;
    }
  }
  for (const r of rows)
    r.omw = r.opponents.length
      ? r.opponents.reduce(
          (sum, id) => sum + map[id].w / (map[id].w + map[id].l),
          0,
        ) / r.opponents.length
      : 0;
  return rows.sort(
    (a, b) =>
      b.w - a.w ||
      a.l - b.l ||
      b.omw - a.omw ||
      b.sf - b.sa - (a.sf - a.sa) ||
      b.pf - b.pa - (a.pf - a.pa) ||
      s.tie.indexOf(a.id) - s.tie.indexOf(b.id),
  );
}
export const swissDone = (s: ChallengerSeason) =>
  s.rounds.length === 5 && s.rounds[4].every((m) => m.sets);
export const challengerComplete = (s: ChallengerSeason) =>
  !!s.bracket?.final[0]?.sets && !!s.bracket?.bronze[0]?.sets;
export const challengerPodium = (s: ChallengerSeason) =>
  challengerComplete(s)
    ? [
        winner(s.bracket!.final[0])!,
        loser(s.bracket!.final[0])!,
        winner(s.bracket!.bronze[0])!,
      ]
    : [];
/** Exact matching in a score group. Most-constrained-first avoids greedy dead ends. */
export function pairScoreGroup(
  ids: TeamId[],
  previous: Match[],
): [TeamId, TeamId][] {
  const met = new Set(previous.map((m) => [m.a, m.b].sort().join(":"))),
    failed = new Set<string>();
  function solve(left: TeamId[]): [TeamId, TeamId][] | null {
    if (!left.length) return [];
    const key = [...left].sort().join(",");
    if (failed.has(key)) return null;
    const options = (a: TeamId) =>
      left.filter((b) => a !== b && !met.has([a, b].sort().join(":")));
    const a = [...left].sort(
      (a, b) => options(a).length - options(b).length,
    )[0];
    for (const b of options(a)) {
      const tail = solve(left.filter((id) => id !== a && id !== b));
      if (tail) return [[a, b], ...tail];
    }
    failed.add(key);
    return null;
  }
  const pairs = solve(shuffle(ids));
  if (!pairs) throw Error("Không tìm được cặp cùng W–L không tái đấu.");
  return pairs;
}
export function drawSwissRound(s: ChallengerSeason) {
  if (s.bracket || swissDone(s) || !s.rounds.at(-1)?.every((m) => m.sets))
    throw Error("Hoàn tất vòng hiện tại trước khi bốc thăm vòng mới.");
  const groups = new Map<string, TeamId[]>();
  for (const r of challengerStandings(s))
    if (r.w < 3 && r.l < 3) {
      const key = `${r.w}-${r.l}`;
      groups.set(key, [...(groups.get(key) || []), r.id]);
    }
  const pairs = [...groups.values()].flatMap((ids) =>
    pairScoreGroup(ids, s.rounds.flat()),
  );
  const round = s.rounds.length;
  s.rounds.push(
    pairs.map(([a, b], i) => ({ id: `C${round}-${i}`, a, b, sets: null })),
  );
}
export function drawChallengerPlayoff(s: ChallengerSeason) {
  if (s.bracket || !swissDone(s))
    throw Error("Hoàn tất Swiss trước khi bốc thăm playoff.");
  // Four undefeated teams, six 3–1 teams and six 3–2 teams occupy seeds 1–16.
  // Randomize within equal records, preserving each record's seed band.
  const rows = challengerStandings(s).filter((r) => r.w === 3),
    seeds = [0, 1, 2].flatMap((l) =>
      shuffle(rows.filter((r) => r.l === l).map((r) => r.id)),
    ),
    slots = seedSlots(16).map((n) => seeds[n - 1]);
  s.bracket = {
    r16: Array.from({ length: 8 }, (_, i) => ({
      id: `CR${i}`,
      a: slots[2 * i],
      b: slots[2 * i + 1],
      sets: null,
    })),
    qf: [],
    sf: [],
    bronze: [],
    final: [],
  };
}
export function advanceChallenger(s: ChallengerSeason) {
  const b = s.bracket;
  if (!b) return;
  for (const [from, to, prefix] of [
    ["r16", "qf", "CQ"],
    ["qf", "sf", "CS"],
    ["sf", "final", "CF"],
  ] as const) {
    if (b[to].length || !b[from].length || !b[from].every((m) => m.sets))
      continue;
    b[to] = Array.from({ length: b[from].length / 2 }, (_, i) => ({
      id: `${prefix}${i}`,
      a: winner(b[from][2 * i])!,
      b: winner(b[from][2 * i + 1])!,
      sets: null,
    }));
    if (from === "sf")
      b.bronze = [
        { id: "CB0", a: loser(b.sf[0])!, b: loser(b.sf[1])!, sets: null },
      ];
  }
}
export function challengerLocked(s: ChallengerSeason, m: Match) {
  if (challengerComplete(s)) return true;
  const r = s.rounds.findIndex((row) => row.includes(m));
  if (r >= 0) return r < s.rounds.length - 1 || !!s.bracket;
  const b = s.bracket;
  if (!b) return true;
  if (b.r16.includes(m)) return !!b.qf.length;
  if (b.qf.includes(m)) return !!b.sf.length;
  if (b.sf.includes(m)) return !!b.final.length;
  if (b.final.includes(m)) return !b.bronze[0]?.sets;
  return !b.bronze.includes(m);
}
export function stampChallenger(s: ChallengerSeason) {
  let order = Math.max(
    0,
    ...challengerMatches(s).map((m) => m.resultOrder || 0),
  );
  for (const m of challengerMatches(s))
    if (m.sets && !m.resultOrder) m.resultOrder = ++order;
}
export function recordChallengerScore(
  s: ChallengerSeason,
  id: string,
  sets: SetScore[],
) {
  const m = challengerMatches(s).find((m) => m.id === id);
  if (!m || challengerLocked(s, m) || !validate(sets))
    throw Error("Trận đã khóa hoặc điểm không hợp lệ.");
  m.sets = sets.map((p) => [...p]);
  advanceChallenger(s);
  stampChallenger(s);
}
export function simulateChallengerRound(s: ChallengerSeason) {
  if (s.bracket) throw Error("Swiss đã kết thúc.");
  s.rounds
    .at(-1)!
    .filter((m) => !m.sets)
    .forEach(simulate);
  stampChallenger(s);
}
export function simulateChallengerStage(
  s: ChallengerSeason,
  stage?: WorldStage,
) {
  const b = s.bracket;
  if (!b) throw Error("Chưa bốc thăm playoff.");
  const next = worldPlayOrder.find((k) => b[k].some((m) => !m.sets));
  if (!next || (stage && next !== stage))
    throw Error("Hoàn tất vòng trước trước khi tiếp tục.");
  for (const m of b[next]) if (!m.sets && !challengerLocked(s, m)) simulate(m);
  advanceChallenger(s);
  stampChallenger(s);
}
export function finishChallenger(s: ChallengerSeason) {
  while (!swissDone(s)) {
    simulateChallengerRound(s);
    if (!swissDone(s)) drawSwissRound(s);
  }
  if (!s.bracket) drawChallengerPlayoff(s);
  while (!challengerComplete(s)) simulateChallengerStage(s);
}
export function challengerPlacements(s: ChallengerSeason) {
  if (!challengerComplete(s)) return [];
  const b = s.bracket!,
    podium = challengerPodium(s),
    base = challengerStandings(s);
  return base
    .map((r) => ({
      id: r.id,
      from: podium.includes(r.id)
        ? podium.indexOf(r.id) + 1
        : loser(b.bronze[0]) === r.id
          ? 4
          : b.qf.some((m) => loser(m) === r.id)
            ? 5
            : b.r16.some((m) => loser(m) === r.id)
              ? 9
              : 17,
      to: podium.includes(r.id)
        ? podium.indexOf(r.id) + 1
        : loser(b.bronze[0]) === r.id
          ? 4
          : b.qf.some((m) => loser(m) === r.id)
            ? 8
            : b.r16.some((m) => loser(m) === r.id)
              ? 16
              : 32,
      stage: podium.includes(r.id)
        ? "Huy chương"
        : loser(b.bronze[0]) === r.id
          ? "Tranh hạng ba"
          : b.qf.some((m) => loser(m) === r.id)
            ? "Tứ kết"
            : b.r16.some((m) => loser(m) === r.id)
              ? "Vòng 16 đội"
              : "Swiss Stage",
    }))
    .sort((a, b) => a.from - b.from);
}
export * from "./validation";
