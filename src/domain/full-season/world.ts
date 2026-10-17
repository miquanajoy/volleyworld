import { get } from "../../data/teams";
import { loser, winner } from "../match/scoring";
import { shuffle } from "../shared/random";
import type { TeamId } from "../types";
import {
  compareThirds,
  fullLeague,
  fullLeagueDone,
  fullStandings,
} from "./league";
import {
  regionOrder,
  worldSlots,
  type FullSeason,
  type WorldCup,
  type WorldStage,
} from "./types";
export function regionalQualifiers(s: FullSeason): TeamId[] {
  if (!regionOrder.every((r) => fullLeagueDone(s.regions[r])))
    throw Error("Cần hoàn tất cả 5 giải khu vực.");
  return regionOrder.flatMap((r) =>
    fullStandings(s.regions[r])
      .slice(0, worldSlots[r])
      .map((t) => t.id),
  );
}
/** Exact constrained assignment; bounded by the 24-team state space, no random retry loop. */
export function drawWorld(s: FullSeason) {
  if (s.world) throw Error("Giải thế giới đã được bốc thăm.");
  const qualified = regionalQualifiers(s).sort(
      (a, b) => get(a).rank - get(b).rank,
    ),
    pots = Array.from({ length: 4 }, (_, i) =>
      qualified.slice(i * 6, i * 6 + 6),
    ),
    groups: TeamId[][] = Array.from({ length: 6 }, () => []),
    pool = pots.map((p) => shuffle(p));
  let budget = 500000;
  function place(pot: number, item: number): boolean {
    if (--budget < 0)
      throw Error("Không tìm được phân bố bảng hợp lệ trong giới hạn an toàn.");
    if (pot === 4) return true;
    if (item === 6) return place(pot + 1, 0);
    const id = pool[pot][item],
      region = get(id).region;
    const choices = shuffle([0, 1, 2, 3, 4, 5]);
    for (const g of choices) {
      if (
        groups[g].length !== pot ||
        groups[g].filter((t) => get(t).region === region).length >= 2
      )
        continue;
      groups[g].push(id);
      if (place(pot, item + 1)) return true;
      groups[g].pop();
    }
    return false;
  }
  if (!place(0, 0)) throw Error("Không thể chia bảng theo ràng buộc khu vực.");
  s.world = {
    pots,
    groups: groups.map((ids, i) => fullLeague(ids, `WG${i}`)),
    tie: shuffle(qualified),
    bracket: null,
  };
}
export function worldThirds(w: WorldCup) {
  return w.groups
    .map((g, i) => ({ ...fullStandings(g)[2], group: i }))
    .sort((a, b) => compareThirds(a, b, w.tie));
}
export function worldEntrants(w: WorldCup) {
  if (!w.groups.every(fullLeagueDone))
    throw Error("Cần hoàn tất 6 bảng thế giới.");
  return [
    ...w.groups.flatMap((g) =>
      fullStandings(g)
        .slice(0, 2)
        .map((t) => t.id),
    ),
    ...worldThirds(w)
      .slice(0, 4)
      .map((t) => t.id),
  ];
}
/** Four group winners meet thirds; two winners meet runners-up; remaining runners pair.
 * All assignments avoid the original group. A DFS explores the small exact matching.
 */
export function drawWorldPlayoff(s: FullSeason) {
  const w = s.world;
  if (!w || w.bracket) throw Error("Chưa thể bốc thăm playoff.");
  worldEntrants(w);
  const groupOf = (id: string) =>
      w.groups.findIndex((g) => g.teamIds.includes(id)),
    winners = shuffle(w.groups.map((g) => fullStandings(g)[0].id)),
    thirds = shuffle(
      worldThirds(w)
        .slice(0, 4)
        .map((t) => t.id),
    ),
    runners = shuffle(w.groups.map((g) => fullStandings(g)[1].id));
  const pairings: [TeamId, TeamId][] = [];
  function assignThird(i: number): boolean {
    if (i === 4) return assignRunner(0, [...runners]);
    for (const id of thirds) {
      if (
        pairings.some((p) => p.includes(id)) ||
        groupOf(id) === groupOf(winners[i])
      )
        continue;
      pairings.push([winners[i], id]);
      if (assignThird(i + 1)) return true;
      pairings.pop();
    }
    return false;
  }
  function assignRunner(i: number, left: TeamId[]): boolean {
    if (i === 2) return pairRest(left);
    for (const id of left) {
      if (groupOf(id) === groupOf(winners[4 + i])) continue;
      pairings.push([winners[4 + i], id]);
      if (
        assignRunner(
          i + 1,
          left.filter((t) => t !== id),
        )
      )
        return true;
      pairings.pop();
    }
    return false;
  }
  function pairRest(left: TeamId[]): boolean {
    if (!left.length) return true;
    for (const id of left.slice(1)) {
      if (groupOf(id) === groupOf(left[0])) continue;
      pairings.push([left[0], id]);
      if (pairRest(left.filter((t) => t !== left[0] && t !== id))) return true;
      pairings.pop();
    }
    return false;
  }
  if (!assignThird(0)) throw Error("Không thể ghép vòng 16 hợp lệ.");
  const fixtures = shuffle(pairings).map(([a, b], i) => ({
    id: `WR${i}`,
    a,
    b,
    sets: null,
  }));
  w.bracket = { r16: fixtures, qf: [], sf: [], final: [], bronze: [] };
}
export function advanceWorld(s: FullSeason) {
  const b = s.world?.bracket;
  if (!b) return;
  const stages: [WorldStage, WorldStage, string][] = [
    ["r16", "qf", "WQ"],
    ["qf", "sf", "WS"],
    ["sf", "final", "WF"],
  ];
  for (const [from, to, prefix] of stages) {
    if (b[to].length || !b[from].length || !b[from].every((m) => m.sets))
      continue;
    const winners = b[from].map((m) => winner(m)!);
    for (let i = 0; i < winners.length; i += 2)
      b[to].push({
        id: prefix + i / 2,
        a: winners[i],
        b: winners[i + 1],
        sets: null,
      });
    if (from === "sf")
      b.bronze = [
        { id: "WB0", a: loser(b.sf[0])!, b: loser(b.sf[1])!, sets: null },
      ];
  }
}
export const worldComplete = (s: FullSeason) =>
  !!s.world?.bracket?.final[0]?.sets && !!s.world?.bracket?.bronze[0]?.sets;
export function worldPodium(s: FullSeason) {
  const b = s.world?.bracket;
  if (!worldComplete(s) || !b) return [];
  return [winner(b.final[0])!, loser(b.final[0])!, winner(b.bronze[0])!];
}
export function worldPlacements(
  s: FullSeason,
): Record<TeamId, { from: number; to: number; stage: string }> {
  if (!worldComplete(s)) return {};
  const w = s.world!,
    b = w.bracket!,
    out: ReturnType<typeof worldPlacements> = {};
  const thirds = worldThirds(w);
  for (const t of thirds.slice(4))
    out[t.id] = { from: 17, to: 18, stage: "Hạng ba vòng bảng" };
  for (const g of w.groups)
    out[fullStandings(g)[3].id] = {
      from: 19,
      to: 24,
      stage: "Hạng tư vòng bảng",
    };
  for (const [key, from, to, stage] of [
    ["r16", 9, 16, "Vòng 16 đội"],
    ["qf", 5, 8, "Tứ kết"],
    ["bronze", 4, 4, "Tranh hạng ba"],
  ] as const)
    b[key].forEach((m) => {
      out[loser(m)!] = { from, to, stage };
    });
  worldPodium(s).forEach((id, i) => {
    out[id] = {
      from: i + 1,
      to: i + 1,
      stage: ["Vô địch", "Á quân", "Hạng ba"][i],
    };
  });
  return out;
}
