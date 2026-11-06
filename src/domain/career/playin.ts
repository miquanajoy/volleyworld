import { get } from "../../data/teams";
import { shuffle } from "../shared/random";
import { winner } from "../match/scoring";
import type { FullSeason } from "../full-season/types";
import { regionOrder } from "../full-season/types";
import { careerRegionEntrants, careerRegionalDone } from "./regionals";
const byRank = (a: string, b: string) => get(a).rank - get(b).rank;
export function careerPlayinFields(f: FullSeason) {
  const p = f.career!.playin!;
  const extra = p.challenger.filter((id) => !p.league16.includes(id)),
    league = f
      .career!.leagueRoster.filter(
        (id) => !p.league16.includes(id) && !extra.includes(id),
      )
      .sort(byRank),
    regional = regionOrder
      .flatMap((r) => careerRegionEntrants(f, r))
      .sort(byRank);
  return { extra, league, regional };
}
export function createCareerPlayin(
  f: FullSeason,
  league16: string[],
  challenger: string[],
) {
  if (
    f.career!.playin ||
    (!f.career!.regionalTour &&
      !regionOrder.every((r) => careerRegionalDone(f.regions[r])))
  )
    throw Error("Chưa thể bốc thăm World Cup Play-in.");
  const extra = challenger.filter((id) => !league16.includes(id)),
    d = extra.length,
    regional = regionOrder
      .flatMap((r) => careerRegionEntrants(f, r))
      .sort(byRank);
  if (
    league16.length !== 16 ||
    challenger.length !== 2 ||
    regional.length !== 16
  )
    throw Error("Thiếu đại diện cho World Cup Play-in.");
  const low = regional.slice(16 - 2 * d);
  f.career!.playin = {
    league16: [...league16],
    challenger: [...challenger],
    draw: shuffle(Array.from({ length: 16 - d }, (_, i) => i)),
    preliminary: Array.from({ length: d }, (_, i) => ({
      id: `WP${i}`,
      a: low[i],
      b: low[2 * d - 1 - i],
      sets: null,
    })),
    final: [],
  };
  advanceCareerPlayin(f);
}
export function careerFinalPlayers(f: FullSeason) {
  const p = f.career!.playin!,
    fields = careerPlayinFields(f);
  if (p.preliminary.some((m) => !m.sets)) return null;
  const regional = [
    ...fields.regional.slice(0, 16 - 2 * fields.extra.length),
    ...p.preliminary.map((m) => winner(m)!),
  ];
  return fields.league.map((id, i) => ({
    id: `WI${i}`,
    a: id,
    b: regional[p.draw[i]],
    sets: null,
  }));
}
export function advanceCareerPlayin(f: FullSeason) {
  const p = f.career?.playin;
  if (!p || p.final.length) return;
  const players = careerFinalPlayers(f);
  if (players) p.final = players;
}
export function careerConfirmed(f: FullSeason) {
  const p = f.career?.playin;
  if (!p) return [];
  return [
    ...new Set([
      ...p.league16,
      ...p.challenger,
      ...p.final.filter((m) => m.sets).map((m) => winner(m)!),
    ]),
  ];
}
export const careerPlayinDone = (f: FullSeason) =>
  !!f.career?.playin &&
  f.career.playin.final.length === 16 - careerPlayinFields(f).extra.length &&
  f.career.playin.final.every((m) => !!m.sets);
