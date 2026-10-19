import { get } from "../../data/teams";
import { winner } from "../match/scoring";
import { shuffle } from "../shared/random";
import type { Match, Region, TeamId } from "../types";
import { fullLeagueDone, fullStandings } from "./league";
import { regionalGroup, regionalDone, regionQualifiers } from "./regional";
import {
  regionOrder,
  type FullSeason,
  type QualifierBracket,
  type RegionalLeague,
} from "./types";
export const qualificationGroups: Record<Region, number> = {
  CEV: 6,
  AVC: 4,
  NORCECA: 3,
  CAVB: 2,
  CSV: 1,
};
export const newQualification = (s: FullSeason) =>
  s.regionalFormat === "qualification-v2";
export function seedSlots(n: number): number[] {
  let slots = [1, 2];
  while (slots.length < n) {
    const size = slots.length * 2;
    slots = slots.flatMap((x) => [x, size + 1 - x]);
  }
  return slots;
}
export function qualifierPlayers(
  b: QualifierBracket,
  round: number,
): (TeamId | null)[] | null {
  let players: (TeamId | null)[] = seedSlots(b.seeds.length).map(
    (n) => b.seeds[n - 1] || null,
  );
  for (let r = 0; r < round; r++) {
    const next: (TeamId | null)[] = [];
    for (let i = 0; i < players.length; i += 2) {
      const a = players[i],
        c = players[i + 1];
      if (a && c) {
        const m = b.rounds[r]?.find((m) => m.id.endsWith(`-${i / 2}`));
        if (!m?.sets) return null;
        next.push(winner(m)!);
      } else next.push(a || c);
    }
    players = next;
  }
  return players;
}
export function advanceQualifier(b: QualifierBracket, prefix: string) {
  for (let r = 0; r < b.rounds.length; r++) {
    if (b.rounds[r].length) continue;
    const players = qualifierPlayers(b, r);
    if (!players) return;
    for (let i = 0; i < players.length; i += 2)
      if (players[i] && players[i + 1])
        b.rounds[r].push({
          id: `${prefix}K${r}-${i / 2}`,
          a: players[i]!,
          b: players[i + 1]!,
          sets: null,
        });
  }
}
export function createQualifier(
  seeds: TeamId[],
  prefix: string,
): QualifierBracket {
  const b = {
    seeds: [...seeds],
    rounds: Array.from(
      { length: Math.ceil(Math.log2(seeds.length)) },
      () => [] as Match[],
    ),
  };
  advanceQualifier(b, prefix);
  return b;
}
export const qualifierWinner = (b: QualifierBracket | null | undefined) =>
  b?.rounds.at(-1)?.[0]?.sets ? winner(b.rounds.at(-1)![0]) : null;
export const qualifierMatches = (
  b: QualifierBracket | null | undefined,
): Match[] => b?.rounds.flat() || [];
export function qualificationStanding(s: FullSeason, id: TeamId) {
  const r = get(id).region,
    g = s.regions[r],
    group = g.groups?.findIndex((ids) => ids.includes(id));
  const rows = fullStandings(group === undefined ? g : regionalGroup(g, group));
  return {
    ...rows.find((t) => t.id === id)!,
    rank: rows.findIndex((t) => t.id === id) + 1,
  };
}
/** Compare fractions by cross multiplication; unequal groups never gain extra weight. */
export function compareQualification(s: FullSeason, a: TeamId, b: TeamId) {
  const x = qualificationStanding(s, a),
    y = qualificationStanding(s, b),
    xn = x.w + x.l,
    yn = y.w + y.l;
  return (
    x.rank - y.rank ||
    y.w * xn - x.w * yn ||
    (y.sf - y.sa) * xn - (x.sf - x.sa) * yn ||
    (y.pf - y.pa) * xn - (x.pf - x.pa) * yn ||
    get(a).rank - get(b).rank
  );
}
export function regionalPlayoffSeeds(g: RegionalLeague): TeamId[] {
  const rows = g.groups!.flatMap((_, i) =>
    fullStandings(regionalGroup(g, i))
      .slice(1, 3)
      .map((t, j) => ({ ...t, rank: j + 2 })),
  );
  return rows
    .sort(
      (x, y) =>
        x.rank - y.rank ||
        y.w * (x.w + x.l) - x.w * (y.w + y.l) ||
        (y.sf - y.sa) * (x.w + x.l) - (x.sf - x.sa) * (y.w + y.l) ||
        (y.pf - y.pa) * (x.w + x.l) - (x.pf - x.pa) * (y.w + y.l) ||
        get(x.id).rank - get(y.id).rank,
    )
    .map((t) => t.id);
}
export function advanceQualification(s: FullSeason) {
  if (!newQualification(s)) return;
  for (const r of regionOrder) {
    const g = s.regions[r];
    if (r === "CSV") continue;
    if (g.playoff === null && fullLeagueDone(g))
      g.playoff = createQualifier(regionalPlayoffSeeds(g), r);
    if (g.playoff) advanceQualifier(g.playoff, r);
  }
  s.intercontinental?.branches.forEach((b, i) => advanceQualifier(b, `IC${i}`));
}
export function intercontinentalPool(s: FullSeason) {
  if (
    !newQualification(s) ||
    !regionOrder.every((r) => regionalDone(s.regions[r]))
  )
    throw Error("Cần hoàn tất vòng bảng và playoff cả năm khu vực.");
  return regionOrder
    .flatMap((r) => {
      const g = s.regions[r];
      if (r === "CSV") return [fullStandings(g)[2].id];
      return regionalPlayoffSeeds(g).filter(
        (id) => id !== qualifierWinner(g.playoff),
      );
    })
    .sort((a, b) => compareQualification(s, a, b));
}
const permutations = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];
export function drawIntercontinental(s: FullSeason) {
  if (s.intercontinental) throw Error("Play-in đã được bốc thăm.");
  const seeds = intercontinentalPool(s);
  if (seeds.length !== 27) throw Error("Play-in cần đúng 27 đội.");
  const pots = Array.from({ length: 9 }, (_, i) =>
      seeds.slice(i * 3, i * 3 + 3),
    ),
    branches: TeamId[][] = [[], [], []];
  for (const [i, pot] of pots.entries()) {
    const choices = shuffle(permutations)
      .map((p) => ({
        p,
        cost: p.reduce(
          (n, j, k) =>
            n +
            branches[k].filter((id) => get(id).region === get(pot[j]).region)
              .length +
            (i === 8 && get(branches[k][7]).region === get(pot[j]).region
              ? 100
              : 0),
          0,
        ),
      }))
      .sort((a, b) => a.cost - b.cost);
    choices[0].p.forEach((j, k) => branches[k].push(pot[j]));
  }
  s.intercontinental = {
    pots,
    branches: branches.map((ids, i) => createQualifier(ids, `IC${i}`)),
  };
}
export const intercontinentalDone = (s: FullSeason) =>
  !!s.intercontinental &&
  s.intercontinental.branches.every((b) => !!qualifierWinner(b));
export function qualificationEntrants(s: FullSeason) {
  if (!intercontinentalDone(s))
    throw Error("Cần hoàn tất cả ba nhánh Play-in liên khu vực.");
  return [
    ...regionOrder.flatMap((r) => regionQualifiers(s.regions[r], r)),
    ...s.intercontinental!.branches.map((b) => qualifierWinner(b)!),
  ];
}
