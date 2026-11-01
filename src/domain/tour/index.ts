import * as V from "../index";
import * as C from "../challenger/index";
import * as F from "../full-season/index";
import { get, regionTeams } from "../../data/teams";
import type { Match, Region, SeasonTournament, SetScore } from "../types";

export const quotas: Record<Region, number> = {
  CEV: 7,
  AVC: 7,
  CSV: 6,
  NORCECA: 7,
  CAVB: 5,
};
export const stages = [
  ["League · Phase 1", "Vòng 1–10"],
  ["Vòng loại khu vực", "Vòng bảng & playoff · 100 đội"],
  ["League · Phase 2", "Vòng 11–20"],
  ["Challenger", "Swiss Stage & playoff · 32 đội"],
  ["League · Phase 3", "Vòng 21–31 · Chốt BXH"],
  ["World Cup Play-in", "27 đội · 3 vé cuối"],
  ["League · Phase 4", "Play-in & playoff League"],
  ["World Cup", "24 đội · Hành trình vô địch"],
] as const;
export interface TourSeason {
  version: 1;
  mode: "tour";
  seasonId: string;
  seasonNumber: number;
  createdAt: string;
  roster: string[];
  stage: number;
  league: SeasonTournament;
  challenger: C.ChallengerSeason | null;
  worldcup: F.FullSeason;
}
export const defaultRoster = () =>
  F.regionOrder.flatMap((r) =>
    regionTeams(r)
      .slice(0, quotas[r])
      .map((t) => t.id),
  );
export function validRoster(ids: string[]): boolean {
  return (
    Array.isArray(ids) &&
    ids.length === 32 &&
    new Set(ids).size === 32 &&
    ids.every((id) => !!get(id)) &&
    F.regionOrder.every(
      (r) => ids.filter((id) => get(id).region === r).length === quotas[r],
    )
  );
}
export function freshTour(number = 1, roster = defaultRoster()): TourSeason {
  if (!validRoster(roster)) throw Error("Chọn đủ đội theo hạn ngạch của Tour.");
  const league = V.fresh(roster, "single");
  league.setupConfirmed = true;
  league.playoffEntry = "top16";
  league.seasonNumber = number;
  return {
    version: 1,
    mode: "tour",
    seasonId: crypto.randomUUID(),
    seasonNumber: number,
    createdAt: new Date().toISOString(),
    roster: [...roster],
    stage: 0,
    league,
    challenger: null,
    worldcup: F.freshFullSeason(number),
  };
}
export const complete = (s: TourSeason) => s.stage === 8;
export const matches = (s: TourSeason): Match[] => [
  ...V.matches(s.league),
  ...(s.challenger ? C.challengerMatches(s.challenger) : []),
  ...F.fullMatches(s.worldcup),
];
export const played = (s: TourSeason) =>
  matches(s).filter((m) => m.sets).length;
export const totalMatches = 520 + 82 + 366;
export const phaseBounds = (stage: number) =>
  stage === 0 ? [0, 10] : stage === 2 ? [10, 20] : [20, 31];
export function stageDone(s: TourSeason, stage = s.stage): boolean {
  if (stage === 8) return true;
  if ([0, 2, 4].includes(stage)) {
    const [a, b] = phaseBounds(stage);
    return s.league.rounds
      .slice(a, b)
      .flat()
      .every((m) => !!m.sets);
  }
  if (stage === 1)
    return F.regionOrder.every((r) => F.regionalDone(s.worldcup.regions[r]));
  if (stage === 3) return !!s.challenger && C.challengerComplete(s.challenger);
  if (stage === 5) return F.intercontinentalDone(s.worldcup);
  if (stage === 6) return V.complete(s.league);
  return F.worldComplete(s.worldcup);
}
export function nextStage(s: TourSeason) {
  if (complete(s) || !stageDone(s))
    throw Error("Hoàn tất chặng hiện tại trước khi tiếp tục.");
  s.stage++;
  if (s.stage === 3) s.challenger = C.freshChallenger(s.seasonNumber, s.roster);
  if (s.stage === 5) F.drawIntercontinental(s.worldcup);
  if (s.stage === 6) V.startPlayin(s.league);
  if (s.stage === 7) F.drawWorld(s.worldcup);
}
function remainingRound(rounds: Match[][]): Match[] {
  return rounds.find((row) => row.some((m) => !m.sets)) || [];
}
/** A single matchday per competition; generated later rounds stay locked. */
export function batch(s: TourSeason): Match[] {
  if (complete(s) || stageDone(s)) return [];
  if ([0, 2, 4].includes(s.stage)) {
    const [a, b] = phaseBounds(s.stage);
    return remainingRound(s.league.rounds.slice(a, b));
  }
  if (s.stage === 1)
    return F.regionOrder.flatMap((r) => {
      const g = s.worldcup.regions[r];
      return F.fullLeagueDone(g)
        ? g.playoff
          ? remainingRound(g.playoff.rounds)
          : []
        : remainingRound(g.rounds);
    });
  if (s.stage === 3) {
    const c = s.challenger!;
    if (!C.swissDone(c)) return c.rounds.at(-1)!;
    for (const key of F.worldPlayOrder)
      if (c.bracket?.[key]?.some((m) => !m.sets)) return c.bracket[key];
    return [];
  }
  if (s.stage === 5)
    return s.worldcup.intercontinental!.branches.flatMap((b) =>
      remainingRound(b.rounds),
    );
  if (s.stage === 6) {
    const l = s.league;
    if (l.playin?.some((m) => !m.sets)) return l.playin;
    for (const { key } of V.playoffOrder(l))
      if (l.bracket?.[key]?.some((m) => !m.sets)) return l.bracket[key]!;
    return [];
  }
  const w = s.worldcup.world!;
  if (!w.groups.every(F.fullLeagueDone))
    return F.worldRoundMatches(w, F.worldCurrentRound(w));
  for (const k of F.worldPlayOrder)
    if (w.bracket?.[k]?.some((m) => !m.sets)) return w.bracket[k];
  return [];
}
export function advance(s: TourSeason) {
  V.stampResults(s.league);
  if (s.stage === 1 || s.stage === 5) {
    F.advanceRegions(s.worldcup);
    F.stampFull(s.worldcup);
  }
  if (s.stage === 3) {
    const c = s.challenger!;
    C.advanceChallenger(c);
    C.stampChallenger(c);
    if (!C.swissDone(c) && c.rounds.at(-1)!.every((m) => m.sets))
      C.drawSwissRound(c);
    if (C.swissDone(c) && !c.bracket) C.drawChallengerPlayoff(c);
  }
  if (s.stage === 6) {
    const l = s.league;
    if (
      l.playin?.every((m) => m.sets) &&
      (!l.bracket ||
        (l.bracket.r20?.every((m) => m.sets) && !l.bracket.r16.length))
    )
      V.draw(l);
    V.advance(l);
    V.stampResults(l);
  }
  if (s.stage === 7) {
    const f = s.worldcup;
    if (f.world!.groups.every(F.fullLeagueDone) && !f.world!.bracket)
      F.drawWorldPlayoff(f);
    F.advanceWorld(f);
    F.stampFull(f);
  }
}
export function recordScore(s: TourSeason, id: string, sets: SetScore[]) {
  const m = batch(s).find((m) => m.id === id);
  if (!m || !V.validate(sets))
    throw Error("Trận đã khóa hoặc điểm không hợp lệ.");
  m.sets = sets.map((p) => [...p]);
  advance(s);
}
export function simulateMatches(s: TourSeason, ids: string[]) {
  const current = batch(s);
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !current.some((m) => m.id === id))
  )
    throw Error("Trận chưa đến lịch.");
  current.filter((m) => ids.includes(m.id) && !m.sets).forEach(V.simulate);
  advance(s);
}
export function simulateBatch(s: TourSeason) {
  const ms = batch(s).filter((m) => !m.sets);
  if (!ms.length) return;
  ms.forEach(V.simulate);
  advance(s);
}
export function finishStage(s: TourSeason) {
  for (let n = 0; !stageDone(s); n++) {
    if (n > 150) throw Error("Không thể hoàn tất chặng.");
    simulateBatch(s);
  }
}
export function finishTour(s: TourSeason) {
  while (!complete(s)) {
    finishStage(s);
    nextStage(s);
  }
}
export const podium = (s: TourSeason) =>
  complete(s) ? F.worldPodium(s.worldcup) : [];
export function validTour(input: unknown): input is TourSeason {
  try {
    const s = input as TourSeason;
    if (
      s?.version !== 1 ||
      s.mode !== "tour" ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(s.seasonId) ||
      !Number.isSafeInteger(s.seasonNumber) ||
      s.seasonNumber < 1 ||
      !Number.isFinite(Date.parse(s.createdAt)) ||
      !Number.isInteger(s.stage) ||
      s.stage < 0 ||
      s.stage > 8 ||
      !validRoster(s.roster)
    )
      return false;
    if (
      !V.validState(s.league) ||
      s.league.playoffFormat !== "single" ||
      s.league.playoffEntry !== "top16" ||
      V.ids(s.league).some((id) => !s.roster.includes(id)) ||
      !F.validFullSeason(s.worldcup) ||
      s.worldcup.regionalFormat !== "qualification-v2"
    )
      return false;
    if (
      s.stage >= 3 !== !!s.challenger ||
      (s.challenger &&
        (!C.validChallenger(s.challenger) ||
          s.challenger.roster.some((id) => !s.roster.includes(id))))
    )
      return false;
    for (let i = 0; i < s.stage; i++) if (!stageDone(s, i)) return false;
    const lastLeague = s.stage < 2 ? 10 : s.stage < 4 ? 20 : 31;
    if (
      s.league.rounds
        .slice(lastLeague)
        .flat()
        .some((m) => m.sets)
    )
      return false;
    if (s.stage < 1 && F.fullMatches(s.worldcup).some((m) => m.sets))
      return false;
    if (s.stage >= 5 !== !!s.worldcup.intercontinental) return false;
    if (s.stage >= 6 !== !!s.league.playin || (s.stage < 6 && s.league.bracket))
      return false;
    if (s.stage >= 7 !== !!s.worldcup.world) return false;
    let pending = false;
    for (const round of s.league.rounds) {
      if (pending && round.some((m) => m.sets)) return false;
      if (round.some((m) => !m.sets)) pending = true;
    }
    return true;
  } catch {
    return false;
  }
}
