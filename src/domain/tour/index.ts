export { careerPlayinMatches, useDoublePlayin } from "../career/playin";
export {
  regionalTourChoices,
  defaultRegionalSelection,
  validRegionalSelection,
  regionalTourKeys,
  regionalTourSplit,
  regionalTourStatus,
  regionalTourSeeds,
  regionalTourQuota,
  regionalTourName,
} from "../career/regional-tour";
export { regionalFormat, regionalStage } from "../career/tour";
import {
  career,
  careerCalendar,
  regionalCalendar,
  regionalFormat,
  regionalStage,
  careerIndex,
  careerBaseStage,
  careerAutomaticBerths,
  careerStageDone,
  nextCareerStage,
  careerBatch,
  advanceCareer,
  validCareerTour,
} from "../career/tour";
import type { CareerChain } from "../career/types";
export {
  freshCareerTour,
  nextCareerSeason,
  career,
  careerStatus,
  careerRegionalSlots,
} from "../career/tour";
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
  rules?: "merit-v1" | "career-v1";
  career?: CareerChain;
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
/** Legacy factory remains available for immutable old saves and regression fixtures. */
export function freshMeritTour(
  number = 1,
  roster = defaultRoster(),
): TourSeason {
  const s = freshTour(number, roster);
  s.rules = "merit-v1";
  s.worldcup.regionalFormat = "merit-v1";
  s.worldcup.automatic = null;
  return s;
}
export const merit = (s: TourSeason) => s.rules === "merit-v1";
/** UI adapters retain the legacy competition semantics without rewriting old calendars. */
export const canonicalStage = (s: TourSeason, n: number) =>
  career(s)
    ? careerBaseStage(s, n)
    : merit(s) && [5, 6].includes(n)
      ? 11 - n
      : n;
export const leagueStage = (s: TourSeason) =>
  career(s) ? careerIndex(s, 6) : merit(s) ? 5 : 6;
export const qualificationStage = (s: TourSeason) =>
  career(s) ? careerIndex(s, 5) : merit(s) ? 6 : 5;
export const calendar = (s: TourSeason) =>
  career(s)
    ? regionalFormat(s)
      ? regionalCalendar
      : careerCalendar
    : merit(s)
      ? [
          stages[0],
          ["Vòng bảng khu vực", "100 đội · Phân suất tạm tính"],
          stages[2],
          stages[3],
          stages[4],
          stages[6],
          ["Chốt vé World Cup", "Playoff khu vực · Play-in 17 đội · 3 vé"],
          stages[7],
        ]
      : stages;
export function automaticBerths(s: TourSeason) {
  if (career(s)) return careerAutomaticBerths(s);
  const c = s.challenger?.bracket?.final[0],
    l = s.league.bracket?.final[0];
  const challenger = c?.sets ? V.winner(c) : null,
    league = l?.sets ? V.winner(l) : null;
  if (!challenger) return [];
  if (!league)
    return [
      {
        id: challenger,
        route: "challenger",
        label: "Vô địch Challenger · Vé đặc cách",
      },
    ];
  return [
    { id: league, route: "league", label: "Vô địch League · Vé đặc cách" },
    {
      id: challenger === league ? V.loser(c!)! : challenger,
      route: "challenger",
      label:
        challenger === league
          ? "Á quân Challenger · Chuyển suất do cùng nhà vô địch"
          : "Vô địch Challenger · Vé đặc cách",
    },
  ];
}
/** Safe upgrade: only unplayed knockout fixtures may change under the original rules. */
export function useOriginalPlayoff(s: TourSeason): boolean {
  if (career(s) || merit(s) || !V.expandedSingle(s.league)) return false;
  if (
    s.stage > 6 ||
    (s.stage === 6 &&
      (s.league.bracket || s.league.playin?.some((m) => m.sets)))
  )
    return false;
  delete s.league.playoffEntry;
  if (s.stage === 6) {
    s.league.playin = null;
    V.startPlayin(s.league);
  }
  return true;
}
export const complete = (s: TourSeason) => s.stage === calendar(s).length;
export const lastStage = (s: TourSeason) => calendar(s).length - 1;
export const stageFor = (s: TourSeason, n: number) =>
  career(s) ? careerIndex(s, n) : n;
export const competitionStages = (s: TourSeason) => ({
  league: [0, 2, stageFor(s, 4), leagueStage(s)],
  challenger: [stageFor(s, 3)],
  worldcup: [
    ...(regionalFormat(s) ? [1, 3, 6] : [1]),
    qualificationStage(s),
    lastStage(s),
  ],
});
export const matches = (s: TourSeason): Match[] => [
  ...V.matches(s.league),
  ...(s.challenger ? C.challengerMatches(s.challenger) : []),
  ...F.fullMatches(s.worldcup),
];
export const played = (s: TourSeason) =>
  matches(s).filter((m) => m.sets).length;
export const totalMatches = 516 + 82 + 366;
export const seasonTotal = (s: TourSeason) =>
  V.totalMatches(s.league) + 82 + F.fullTotalMatches(s.worldcup);
export const phaseBounds = (stage: number) =>
  stage === 0 ? [0, 10] : stage === 2 ? [10, 20] : [20, 31];
export function stageDone(s: TourSeason, stage = s.stage): boolean {
  if (career(s)) return careerStageDone(s, stage);
  if (stage === 8) return true;
  if ([0, 2, 4].includes(stage)) {
    const [a, b] = phaseBounds(stage);
    return s.league.rounds
      .slice(a, b)
      .flat()
      .every((m) => !!m.sets);
  }
  if (stage === 1)
    return F.regionOrder.every((r) =>
      merit(s)
        ? F.fullLeagueDone(s.worldcup.regions[r])
        : F.regionalDone(s.worldcup.regions[r]),
    );
  if (stage === 3) return !!s.challenger && C.challengerComplete(s.challenger);
  if (stage === qualificationStage(s))
    return F.intercontinentalDone(s.worldcup);
  if (stage === leagueStage(s)) return V.complete(s.league);
  return F.worldComplete(s.worldcup);
}
export function nextStage(s: TourSeason) {
  if (career(s)) {
    nextCareerStage(s);
    return;
  }
  if (complete(s) || !stageDone(s))
    throw Error("Hoàn tất chặng hiện tại trước khi tiếp tục.");
  s.stage++;
  if (s.stage === 3) s.challenger = C.freshChallenger(s.seasonNumber, s.roster);
  if (s.stage === leagueStage(s)) V.startPlayin(s.league);
  if (s.stage === qualificationStage(s)) {
    if (merit(s)) {
      s.worldcup.automatic = automaticBerths(s).map((t) => t.id);
      F.advanceRegions(s.worldcup);
    } else F.drawIntercontinental(s.worldcup);
  }
  if (s.stage === 7) F.drawWorld(s.worldcup);
}
function remainingRound(rounds: Match[][]): Match[] {
  return rounds.find((row) => row.some((m) => !m.sets)) || [];
}
/** A single matchday per competition; generated later rounds stay locked. */
export function batch(s: TourSeason): Match[] {
  if (career(s)) return careerBatch(s);
  if (complete(s) || stageDone(s)) return [];
  if ([0, 2, 4].includes(s.stage)) {
    const [a, b] = phaseBounds(s.stage);
    return remainingRound(s.league.rounds.slice(a, b));
  }
  if (s.stage === 1)
    return F.regionOrder.flatMap((r) => {
      const g = s.worldcup.regions[r];
      return merit(s)
        ? remainingRound(g.rounds)
        : F.fullLeagueDone(g)
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
  if (s.stage === qualificationStage(s))
    return s.worldcup.intercontinental
      ? s.worldcup.intercontinental.branches.flatMap((b) =>
          remainingRound(b.rounds),
        )
      : F.regionOrder.flatMap((r) =>
          s.worldcup.regions[r].playoff
            ? remainingRound(s.worldcup.regions[r].playoff!.rounds)
            : [],
        );
  if (s.stage === leagueStage(s)) {
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
  if (career(s)) {
    advanceCareer(s);
    return;
  }
  V.stampResults(s.league);
  if (s.stage === 1 || s.stage === qualificationStage(s)) {
    F.advanceRegions(s.worldcup);
    F.stampFull(s.worldcup);
    if (
      merit(s) &&
      s.stage === qualificationStage(s) &&
      !s.worldcup.intercontinental &&
      F.regionOrder.every((r) => F.regionalDone(s.worldcup.regions[r]))
    )
      F.drawIntercontinental(s.worldcup);
  }
  if (s.stage === 3) {
    const c = s.challenger!;
    C.advanceChallenger(c);
    C.stampChallenger(c);
    if (!C.swissDone(c) && c.rounds.at(-1)!.every((m) => m.sets))
      C.drawSwissRound(c);
    if (C.swissDone(c) && !c.bracket) C.drawChallengerPlayoff(c);
  }
  if (s.stage === leagueStage(s)) {
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
/** The selected region progresses independently; other regions keep their scores. */
export function regionalBatch(s: TourSeason, region: Region): Match[] {
  if (!regionalStage(s, s.stage) || !F.regionOrder.includes(region)) return [];
  const ids = new Set(s.worldcup.regions[region].teamIds);
  return batch(s).filter((m) => ids.has(m.a) && ids.has(m.b) && !m.sets);
}
export function simulateRegion(s: TourSeason, region: Region, finish = false) {
  for (let n = 0; ; n++) {
    const ms = regionalBatch(s, region);
    if (!ms.length) return;
    if (n > 150) throw Error("Không thể hoàn tất khu vực.");
    simulateMatches(
      s,
      ms.map((m) => m.id),
    );
    if (!finish) return;
  }
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
    if (s?.rules === "career-v1") return validCareerTour(s);
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
      (s.rules !== undefined && s.rules !== "merit-v1") ||
      !validRoster(s.roster)
    )
      return false;
    if (
      !V.validState(s.league) ||
      s.league.playoffFormat !== "single" ||
      (s.league.playoffEntry !== undefined &&
        s.league.playoffEntry !== "top16") ||
      V.ids(s.league).some((id) => !s.roster.includes(id)) ||
      !F.validFullSeason(s.worldcup) ||
      s.worldcup.regionalFormat !==
        (merit(s) ? "merit-v1" : "qualification-v2") ||
      (merit(s) && s.league.playoffEntry !== undefined)
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
    if (merit(s)) {
      if (
        s.stage < 6
          ? s.worldcup.automatic !== null
          : JSON.stringify(s.worldcup.automatic) !==
            JSON.stringify(automaticBerths(s).map((t) => t.id))
      )
        return false;
      if (s.stage < 6 && s.worldcup.intercontinental) return false;
      if (
        s.stage >= 6 &&
        F.regionOrder.every((r) => F.regionalDone(s.worldcup.regions[r])) !==
          !!s.worldcup.intercontinental
      )
        return false;
    } else if (s.stage >= 5 !== !!s.worldcup.intercontinental) return false;
    if (
      s.stage >= leagueStage(s) !== !!s.league.playin ||
      (s.stage < leagueStage(s) && s.league.bracket)
    )
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
