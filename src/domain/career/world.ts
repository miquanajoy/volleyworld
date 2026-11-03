import { get } from "../../data/teams";
import { shuffle } from "../shared/random";
import { winner, loser } from "../match/scoring";
import { fullLeague, fullStandings } from "../full-season/league";
import {
  regionOrder,
  type FullSeason,
  type WorldCup,
} from "../full-season/types";
import type { SeasonTournament } from "../types";
import { careerConfirmed, careerPlayinDone } from "./playin";
export function careerWorldPots(f: FullSeason, l: SeasonTournament) {
  if (!careerPlayinDone(f) || !l.bracket?.final[0]?.sets)
    throw Error(
      "Hoàn tất Play-in World Cup và playoff League trước khi chia bảng.",
    );
  const p = f.career!.playin!,
    ic = p.final
      .map((m) => winner(m)!)
      .sort((a, b) => get(a).rank - get(b).rank),
    extra = p.challenger.filter((id) => !p.league16.includes(id));
  return [
    l.bracket.r16.map((m) => winner(m)!),
    l.bracket.r16.map((m) => loser(m)!),
    [...extra, ...ic.slice(0, 8 - extra.length)],
    ic.slice(8 - extra.length),
  ];
}
/** Eight perfect matchings of a regularized bipartite multigraph.
 * Pot vertices have degree 8; split region vertices each have degree <=8.
 * Dummy pot vertices complete an 8-regular graph, so every matching exists.
 * Each matching gives one team/pot and at most two teams/region, without retries.
 */
export function careerDrawGroups(pots: string[][]): string[][] {
  const ids = pots.flat();
  if (
    pots.length !== 4 ||
    pots.some((p) => p.length !== 8) ||
    new Set(ids).size !== 32 ||
    regionOrder.some(
      (r) => ids.filter((id) => get(id).region === r).length > 16,
    )
  )
    throw Error("Bốn pot cần đủ 32 đội, tối đa 16 đội mỗi khu vực.");
  const buckets: string[][][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 10 }, () => []),
    ),
    counts: number[][] = Array.from({ length: 10 }, () => Array(10).fill(0));
  for (const [ri, r] of regionOrder.entries())
    shuffle(ids.filter((id) => get(id).region === r)).forEach((id, i) => {
      const p = pots.findIndex((p) => p.includes(id)),
        v = ri * 2 + (i % 2);
      buckets[p][v].push(id);
      counts[p][v]++;
    });
  const deficit = Array.from(
    { length: 10 },
    (_, v) => 8 - counts.slice(0, 4).reduce((s, row) => s + row[v], 0),
  );
  for (let p = 4; p < 10; p++) {
    let left = 8;
    for (const v of shuffle(Array.from({ length: 10 }, (_, i) => i))) {
      const n = Math.min(left, deficit[v]);
      counts[p][v] += n;
      deficit[v] -= n;
      left -= n;
    }
    if (left) throw Error("Không thể hoàn thiện đồ thị chia bảng.");
  }
  const groups: string[][] = [];
  for (let color = 0; color < 8; color++) {
    const owner = Array(10).fill(-1) as number[];
    function assign(p: number, seen: Set<number>): boolean {
      for (const v of shuffle(Array.from({ length: 10 }, (_, i) => i))) {
        if (!counts[p][v] || seen.has(v)) continue;
        seen.add(v);
        if (owner[v] < 0 || assign(owner[v], seen)) {
          owner[v] = p;
          return true;
        }
      }
      return false;
    }
    for (const p of shuffle(Array.from({ length: 10 }, (_, i) => i)))
      if (!assign(p, new Set()))
        throw Error("Không tìm được ghép cặp chia bảng.");
    const g = Array(4).fill("") as string[];
    owner.forEach((p, v) => {
      counts[p][v]--;
      if (p < 4) g[p] = buckets[p][v].pop()!;
    });
    groups.push(g);
  }
  return shuffle(groups);
}
export function drawCareerWorld(f: FullSeason, l: SeasonTournament) {
  if (f.world) throw Error("World Cup đã được bốc thăm.");
  const pots = careerWorldPots(f, l);
  f.world = {
    pots,
    groups: careerDrawGroups(pots).map((ids, i) => fullLeague(ids, `WG${i}`)),
    tie: shuffle(careerConfirmed(f)),
    bracket: null,
  };
}
export function careerWorldPairs(w: WorldCup) {
  const rows = w.groups.map(fullStandings);
  return [
    ...[0, 2, 4, 6].map((i) => [rows[i][0].id, rows[i + 1][1].id]),
    ...[1, 3, 5, 7].map((i) => [rows[i][0].id, rows[i - 1][1].id]),
  ];
}
