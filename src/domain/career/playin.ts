import { regionalTourStatus } from "./regional-tour";
import { advanceWorldPlayin, worldPlayinStatus } from "./world-playin-double";
import { get } from "../../data/teams";
import { winner, loser } from "../match/scoring";
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
    !regionOrder.every((r) =>
      f.career!.regionalTour
        ? regionalTourStatus(f, r).done
        : careerRegionalDone(f.regions[r]),
    )
  )
    throw Error("Chưa thể bốc thăm World Cup Play-in.");
  const extra = challenger.filter((id) => !league16.includes(id)),
    regional = regionOrder
      .flatMap((r) => careerRegionEntrants(f, r))
      .sort(byRank);
  if (
    league16.length !== 16 ||
    new Set(league16).size !== 16 ||
    league16.some((id) => !f.career!.leagueRoster.includes(id)) ||
    challenger.length !== (f.career!.points ? 0 : 2) ||
    new Set(challenger).size !== challenger.length ||
    challenger.some((id) => !f.career!.leagueRoster.includes(id)) ||
    regional.length !== 16 ||
    new Set(regional).size !== 16 ||
    regional.some((id) => f.career!.leagueRoster.includes(id))
  )
    throw Error("Thiếu đại diện cho World Cup Play-in.");

  f.career!.playin = {
    league16: [...league16],
    challenger: [...challenger],
    draw: [],
    preliminary: [],
    final: [],
    double: {
      seeds: [
        ...f.career!.leagueRoster.filter(
          (id) => !league16.includes(id) && !extra.includes(id),
        ),
        ...regional,
      ].sort(byRank),
      rounds: [],
    },
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
  if (!p) return;
  if (p.double) {
    advanceWorldPlayin(p.double);
    return;
  }
  if (p.final.length) return;
  const players = careerFinalPlayers(f);
  if (players) p.final = players;
}
export function careerConfirmed(f: FullSeason) {
  const p = f.career?.playin;
  if (!p) return [];
  return [
    ...new Set([...p.league16, ...p.challenger, ...careerPlayinWinners(f)]),
  ];
}
export const careerPlayinDone = (f: FullSeason) => {
  const p = f.career?.playin;
  return (
    !!p &&
    (p.double
      ? worldPlayinStatus(p.double).done
      : p.final.length === 16 - careerPlayinFields(f).extra.length &&
        p.final.every((m) => !!m.sets))
  );
};
export const careerPlayinMatches = (f: FullSeason) => {
  const p = f.career?.playin;
  return p
    ? p.double
      ? p.double.rounds.flat()
      : [...p.preliminary, ...p.final]
    : [];
};
export const careerPlayinWinners = (f: FullSeason) => {
  const p = f.career?.playin;
  return p
    ? p.double
      ? worldPlayinStatus(p.double).qualified
      : p.final.filter((m) => m.sets).map((m) => winner(m)!)
    : [];
};
export const careerPlayinEliminated = (f: FullSeason) => {
  const p = f.career?.playin;
  return p
    ? p.double
      ? worldPlayinStatus(p.double).eliminated
      : careerPlayinMatches(f)
          .filter((m) => m.sets)
          .map((m) => loser(m)!)
    : [];
};
export const careerPlayinTotal = (f: FullSeason) => {
  const p = f.career?.playin;
  return p ? (p.double ? p.double.seeds.length + 8 : 16) : 40;
};
/** Upgrade an unplayed old draw; scored legacy Play-ins keep all their results. */
export function useDoublePlayin(f: FullSeason) {
  const p = f.career?.playin;
  if (!p || p.double || f.world || careerPlayinMatches(f).some((m) => m.sets))
    return false;
  const { league16, challenger } = p;
  f.career!.playin = null;
  createCareerPlayin(f, league16, challenger);
  return true;
}
