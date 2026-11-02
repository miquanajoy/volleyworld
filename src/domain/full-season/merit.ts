import { get } from "../../data/teams";
import type { Region, TeamId } from "../types";
import { shuffle } from "../shared/random";
import { fullLeagueDone, fullStandings } from "./league";
import { regionalGroup, regionalDone } from "./regional";
import {
  advanceQualifier,
  createQualifier,
  qualifierPlayers,
  qualifierWinner,
  compareQualification,
} from "./qualification";
import { regionOrder, type FullSeason, type QualifierBracket } from "./types";

export const meritQualification = (s: FullSeason) =>
  s.regionalFormat === "merit-v1";
export const meritRegionalSlots: Record<Region, number> = {
  CEV: 6,
  AVC: 4,
  NORCECA: 4,
  CAVB: 3,
  CSV: 2,
};
export function meritGroupRows(s: FullSeason, r: Region, index = 0) {
  const g = s.regions[r];
  return fullStandings(g.groups ? regionalGroup(g, index) : g).filter(
    (t) => !s.automatic?.includes(t.id),
  );
}
export function meritDirect(s: FullSeason, r: Region): TeamId[] {
  const g = s.regions[r];
  return (g.groups || [g.teamIds]).flatMap((_, i) =>
    meritGroupRows(s, r, i)
      .slice(0, r === "CSV" ? 2 : 1)
      .map((t) => t.id),
  );
}
export function meritPlayoffSeeds(s: FullSeason, r: Region): TeamId[] {
  const g = s.regions[r];
  return (g.groups || [])
    .flatMap((_, i) =>
      meritGroupRows(s, r, i)
        .slice(1, 3)
        .map((t, j) => ({ ...t, rank: j + 2 })),
    )
    .sort((a, b) => {
      const an = a.w + a.l,
        bn = b.w + b.l;
      return (
        a.rank - b.rank ||
        b.w * an - a.w * bn ||
        (b.sf - b.sa) * an - (a.sf - a.sa) * bn ||
        (b.pf - b.pa) * an - (a.pf - a.pa) * bn ||
        get(a.id).rank - get(b.id).rank
      );
    })
    .map((t) => t.id);
}
/** Winners of a truncated bracket; byes never create persisted matches. */
export function qualifierAdvancers(
  b: QualifierBracket | null | undefined,
): TeamId[] {
  if (!b || b.rounds.some((row) => row.some((m) => !m.sets))) return [];
  const ids =
    qualifierPlayers(b, b.rounds.length)?.filter((id): id is string => !!id) ||
    [];
  return ids.length === (b.advanceSlots || 1) ? ids : [];
}
export function advanceMerit(s: FullSeason) {
  if (!s.automatic) return;
  for (const r of regionOrder) {
    const g = s.regions[r];
    if (r === "CSV") continue;
    if (!g.playoff && fullLeagueDone(g)) {
      const seeds = meritPlayoffSeeds(s, r);
      g.playoff = createQualifier(seeds, r);
      if (r === "CEV" || r === "AVC") {
        g.playoff.advanceSlots = 4;
        g.playoff.rounds = g.playoff.rounds.slice(0, -2);
      }
    }
    if (g.playoff) advanceQualifier(g.playoff, r);
  }
  s.intercontinental?.branches.forEach((b, i) => advanceQualifier(b, `IC${i}`));
}
export function meritRegionQualifiers(s: FullSeason, r: Region): TeamId[] {
  return [
    ...meritDirect(s, r),
    ...(["NORCECA", "CAVB"].includes(r) && qualifierWinner(s.regions[r].playoff)
      ? [qualifierWinner(s.regions[r].playoff)!]
      : []),
  ];
}
export function meritIntercontinentalPool(s: FullSeason): TeamId[] {
  if (!s.automatic || !regionOrder.every((r) => regionalDone(s.regions[r])))
    throw Error(
      "Hoàn tất vé đặc cách và playoff khu vực trước khi bốc thăm Play-in.",
    );
  return regionOrder
    .flatMap((r) => {
      if (r === "CSV") return [meritGroupRows(s, r)[2].id];
      const b = s.regions[r].playoff!;
      return b.advanceSlots === 4
        ? qualifierAdvancers(b)
        : b.seeds.filter((id) => id !== qualifierWinner(b));
    })
    .sort((a, b) => compareQualification(s, a, b));
}
export function drawMeritIntercontinental(s: FullSeason) {
  const pool = meritIntercontinentalPool(s);
  if (pool.length !== 17 || new Set(pool).size !== 17)
    throw Error("Play-in cần đúng 17 đội khác nhau.");
  const pots = Array.from({ length: 6 }, (_, i) =>
      pool.slice(i * 3, i * 3 + 3),
    ),
    branches: TeamId[][] = [[], [], []];
  // All three branches are equally likely to have five entrants; pot bands remain intact.
  for (const pot of pots) {
    const order = shuffle([0, 1, 2]);
    shuffle(pot).forEach((id, i) => branches[order[i]].push(id));
  }
  s.intercontinental = {
    pots,
    branches: branches.map((ids, i) => createQualifier(ids, `IC${i}`)),
  };
}
export function meritEntrants(s: FullSeason): TeamId[] {
  if (
    !s.automatic ||
    !s.intercontinental?.branches.every((b) => qualifierWinner(b))
  )
    throw Error("Chưa chốt đủ vé World Cup.");
  const ids = [
    ...s.automatic,
    ...regionOrder.flatMap((r) => meritRegionQualifiers(s, r)),
    ...s.intercontinental.branches.map((b) => qualifierWinner(b)!),
  ];
  if (ids.length !== 24 || new Set(ids).size !== 24)
    throw Error("Danh sách World Cup phải có đúng 24 đội khác nhau.");
  return ids;
}
