import type { TourSeason } from "../tour/index";
import type { Match } from "../types";
import { standings, leagueDone } from "../league/standings";
import { winner, loser } from "../match/scoring";
import { complete as leagueComplete } from "../playoff/outcomes";
import { finalPlacements } from "../tournament/placement";
import {
  challengerComplete,
  challengerPlacements,
  challengerStandings,
} from "../challenger/index";

export const seasonPointsFormat = (s: TourSeason) =>
  !!s.worldcup.career?.points;
export const leaguePointBonus = (p: number) =>
  p === 1
    ? 400
    : p === 2
      ? 300
      : p === 3
        ? 240
        : p === 4
          ? 200
          : p <= 8
            ? 150
            : p <= 16
              ? 80
              : 0;
export const challengerPointBonus = (p: number) =>
  p === 1
    ? 300
    : p === 2
      ? 180
      : p === 3
        ? 120
        : p === 4
          ? 100
          : p <= 8
            ? 60
            : p <= 16
              ? 25
              : 0;
const wins = (ms: Match[], id: string) =>
  ms.filter((m) => m.sets && winner(m) === id).length;
type Knockout = {
  r16: Match[];
  qf: Match[];
  sf: Match[];
  final: Match[];
  bronze: Match[];
};
function knockoutUpper(
  b: Knockout | null,
  id: string,
  actualWins: number,
  league: boolean,
) {
  const bonus = league ? leaguePointBonus : challengerPointBonus;
  if (!b) return { wins: league ? 5 : 4, bonus: bonus(1) };
  for (const [key, place] of [
    ["final", 1],
    ["bronze", 3],
    ["qf", 5],
    ["r16", 9],
  ] as const) {
    const m = b[key].find((m) => m.sets && (m.a === id || m.b === id));
    if (!m) continue;
    if (key === "final" || key === "bronze")
      return {
        wins: actualWins,
        bonus: bonus(winner(m) === id ? place : place + 1),
      };
    if (loser(m) === id) return { wins: actualWins, bonus: bonus(place) };
  }
  if (b.sf.some((m) => m.sets && loser(m) === id))
    return { wins: actualWins + 1, bonus: bonus(3) };
  if (!b.r16.some((m) => m.a === id || m.b === id))
    return { wins: actualWins, bonus: 0 };
  return { wins: league ? 5 : 4, bonus: bonus(1) };
}
export function leagueTopFour(s: TourSeason) {
  return leagueDone(s.league)
    ? standings(s.league)
        .slice(0, 4)
        .map((t) => t.id)
    : [];
}
export function seasonPointsRows(s: TourSeason) {
  const table = standings(s.league),
    ldone = leagueComplete(s.league),
    c = s.challenger,
    cdone = !!c && challengerComplete(c);
  const leaguePlaces = ldone ? finalPlacements(s.league) : {},
    challengerPlaces = cdone ? challengerPlacements(c!) : [];
  const swiss = c ? challengerStandings(c) : [];
  const lko = [
    ...(s.league.playin || []),
    ...(["r16", "qf", "sf", "bronze", "final"] as const).flatMap(
      (k) => s.league.bracket?.[k] || [],
    ),
  ];
  const cko = (["r16", "qf", "sf", "bronze", "final"] as const).flatMap(
    (k) => c?.bracket?.[k] || [],
  );
  const auto = leagueTopFour(s);
  const rows = s.roster
    .map((id) => {
      const t = table.find((t) => t.id === id)!,
        sw = swiss.find((t) => t.id === id),
        lw = wins(lko, id),
        cw = wins(cko, id);
      const lp = leaguePlaces[id]?.from || 33,
        cp = challengerPlaces.find((p) => p.id === id)?.from || 33;
      const league = t.w * 5 + lw * 20 + (ldone ? leaguePointBonus(lp) : 0);
      const challenger =
        (sw?.w || 0) * 5 + cw * 10 + (cdone ? challengerPointBonus(cp) : 0);
      let banked = cdone ? challenger : 0;
      for (const [a, b] of [
        [0, 10],
        [10, 20],
        [20, 31],
      ]) {
        const ms = s.league.rounds.slice(a, b).flat();
        if (ms.every((m) => m.sets)) banked += wins(ms, id) * 5;
      }
      if (ldone) banked += lw * 20 + leaguePointBonus(lp);
      let lu = knockoutUpper(s.league.bracket, id, lw, true),
        cu = knockoutUpper(c?.bracket || null, id, cw, false);
      if (
        s.league.playin?.some((m) => m.sets && loser(m) === id) ||
        (leagueDone(s.league) && table.findIndex((t) => t.id === id) >= 20)
      )
        lu = { wins: lw, bonus: 0 };
      if (sw?.l === 3) cu = { wins: cw, bonus: 0 };
      const remaining = s.league.rounds
        .flat()
        .filter((m) => !m.sets && (m.a === id || m.b === id)).length;
      const max =
        (ldone ? league : (t.w + remaining) * 5 + lu.wins * 20 + lu.bonus) +
        (cdone
          ? challenger
          : (sw?.l === 3 ? sw.w * 5 : 15) + cu.wins * 10 + cu.bonus);
      return {
        id,
        league,
        challenger,
        points: league + challenger,
        banked,
        max,
        leaguePlace: lp,
        challengerPlace: cp,
        leagueWins: t.w,
        automatic: auto.includes(id),
        inQuota: false,
        confirmed: false,
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.leaguePlace - b.leaguePlace ||
        a.challengerPlace - b.challengerPlace ||
        b.leagueWins - a.leagueWins ||
        s.league.tie.indexOf(a.id) - s.league.tie.indexOf(b.id),
    );
  let slot = 0;
  for (const row of rows) {
    row.inQuota = !row.automatic && slot++ < 12;
    row.confirmed =
      row.automatic ||
      (ldone && cdone
        ? row.inQuota
        : rows.filter(
            (x) => x.id !== row.id && !x.automatic && x.max >= row.banked,
          ).length < 12);
  }
  return rows;
}
export function seasonPointsDirect(s: TourSeason) {
  if (
    !leagueComplete(s.league) ||
    !s.challenger ||
    !challengerComplete(s.challenger)
  )
    return [];
  const rows = seasonPointsRows(s),
    auto = leagueTopFour(s);
  return [
    ...auto,
    ...rows
      .filter((r) => !r.automatic)
      .slice(0, 12)
      .map((r) => r.id),
  ];
}
export const seasonPointsLabels = (s: TourSeason) =>
  seasonPointsRows(s)
    .filter((r) => r.confirmed)
    .map((r) => ({
      id: r.id,
      route: r.automatic ? "league" : "points",
      label: r.automatic
        ? "Top 4 BXH League · Vé World Cup"
        : "Đủ điểm tích lũy · Vé World Cup",
    }));
