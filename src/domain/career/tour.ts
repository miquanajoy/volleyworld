import {
  seasonPointsDirect,
  seasonPointsLabels,
  seasonPointsRows,
} from "./season-points";
import {
  pointsFormat,
  setupPointsRegions,
  pointsRegionalBatch,
  pointsRegionalPhaseDone,
  advancePointsRegions,
  regionalPhaseIndex,
  pointsRegionalPhaseMatches,
} from "./points-regional";
import {
  advanceRegionalTour,
  setupRegionalTour,
  regionalTourKeys,
  regionalTourSplit,
  regionalTourStatus,
} from "./regional-tour";
import * as V from "../index";
import * as C from "../challenger/index";
import * as F from "../full-season/index";
import { get } from "../../data/teams";
import type { TourSeason } from "../tour/index";
import type { Match } from "../types";
import { validCareerRoster } from "./allocation";
import {
  freshCareerQualification,
  advanceCareerRegions,
  careerRegionalDone,
} from "./regionals";
import {
  createCareerPlayin,
  advanceCareerPlayin,
  careerPlayinDone,
  careerConfirmed,
  careerPlayinEliminated,
} from "./playin";
import { drawCareerWorld, careerWorldPots } from "./world";
import { sameCareerSet, validCareerFull } from "./validation";
export const career = (s: TourSeason) => s.rules === "career-v1";
export const careerRegionalSlots = (s: TourSeason) => s.worldcup.career!.slots;
export const regionalFormat = (s: TourSeason) =>
  !!s.worldcup.career?.regionalTour;
export const careerIndex = (s: TourSeason, base: number) =>
  pointsFormat(s.worldcup)
    ? [0, 1, 2, 4, 5, 8, 7, 9, 10][base]
    : regionalFormat(s)
      ? [0, 1, 2, 4, 5, 7, 8, 9, 10][base]
      : base;
export const careerBaseStage = (s: TourSeason, stage: number) =>
  pointsFormat(s.worldcup)
    ? [0, 1, 2, 1, 3, 4, 1, 6, 5, 7, 8][stage]
    : regionalFormat(s)
      ? [0, 1, 2, 1, 3, 4, 1, 5, 6, 7, 8][stage]
      : stage;
export const regionalStage = (s: TourSeason, stage: number) =>
  career(s) && regionalFormat(s) ? [1, 3, 6].includes(stage) : stage === 1;
function regionalRows(
  s: TourSeason,
  r: (typeof regionalTourKeys)[number],
  stage: number,
) {
  const g = s.worldcup.regions[r],
    split = regionalTourSplit(g);
  return stage === 1 ? g.rounds.slice(0, split) : g.rounds.slice(split);
}
const bounds = (stage: number) =>
  stage === 0 ? [0, 10] : stage === 2 ? [10, 20] : [20, 31];
function buildCareer(
  number: number,
  roster: string[],
  chainId: string,
  previousSeasonId: string | null,
  regional?: string[],
): TourSeason {
  if (!validCareerRoster(roster))
    throw Error(
      "Đội hình kế thừa phải đủ 32 đội khác nhau và không vượt trần khu vực.",
    );
  const league = V.fresh(roster, "single", true);
  league.setupConfirmed = true;
  league.seasonNumber = number;
  const worldcup = freshCareerQualification(roster, number);
  if (regional) setupRegionalTour(worldcup, regional);
  return {
    version: 1,
    rules: "career-v1",
    mode: "tour",
    seasonId: crypto.randomUUID(),
    seasonNumber: number,
    createdAt: new Date().toISOString(),
    career: { chainId, previousSeasonId },
    roster: [...roster],
    stage: 0,
    league,
    challenger: null,
    worldcup,
  };
}
export function freshCareerTour(
  number = 1,
  roster?: string[],
  regional?: string[],
): TourSeason {
  if (number !== 1) throw Error("Chuỗi mới phải bắt đầu từ mùa 1.");
  const selected =
    roster ||
    F.regionOrder.flatMap((r) =>
      V.regionTeams(r)
        .slice(0, { CEV: 7, AVC: 7, NORCECA: 7, CAVB: 5, CSV: 6 }[r])
        .map((t) => t.id),
    );
  const initial = { CEV: 7, AVC: 7, NORCECA: 7, CAVB: 5, CSV: 6 };
  if (
    !validCareerRoster(selected) ||
    F.regionOrder.some(
      (r) =>
        selected.filter((id) => get(id).region === r).length !== initial[r],
    )
  )
    throw Error(
      "Mùa đầu cần đúng hạn ngạch 7 Âu, 7 Á, 7 Bắc Mỹ, 5 Phi, 6 Nam Mỹ.",
    );
  return buildCareer(1, selected, crypto.randomUUID(), null, regional);
}
export function careerAutomaticBerths(s: TourSeason) {
  if (pointsFormat(s.worldcup)) return seasonPointsLabels(s);
  const c = s.challenger?.bracket?.final[0],
    l = s.league.bracket;
  const challenger = c?.sets ? [V.winner(c)!, V.loser(c)!] : [],
    league = l?.r16.flatMap((m) => [m.a, m.b]) || [];
  return [
    ...challenger.map((id, i) => ({
      id,
      route: "challenger",
      label:
        i === 0
          ? "Vô địch Challenger · Vé World Cup sớm"
          : "Á quân Challenger · Vé World Cup sớm",
    })),
    ...league
      .filter((id) => !challenger.includes(id))
      .map((id) => ({
        id,
        route: "league",
        label: "Vào playoff League · Vé World Cup và trụ hạng",
      })),
  ];
}
export function careerStatus(s: TourSeason) {
  if (pointsFormat(s.worldcup)) {
    const automatic = seasonPointsRows(s)
      .filter((r) => r.confirmed)
      .map((r) => r.id);
    const qualified = [
      ...new Set([...automatic, ...careerConfirmed(s.worldcup)]),
    ];
    return {
      automatic,
      league16: seasonPointsDirect(s),
      challenger: [] as string[],
      qualified,
      retained: qualified.filter((id) => s.roster.includes(id)),
      promoted: qualified.filter((id) => !s.roster.includes(id)),
      relegated: careerPlayinEliminated(s.worldcup).filter((id) =>
        s.roster.includes(id),
      ),
      tickets: qualified.length,
      playinTickets: 16,
    };
  }
  const league16 = s.league.bracket?.r16.flatMap((m) => [m.a, m.b]) || [],
    c = s.challenger?.bracket?.final[0],
    challenger = c?.sets ? [V.winner(c)!, V.loser(c)!] : [],
    automatic = [...new Set([...league16, ...challenger])];
  const qualified = [
      ...new Set([...automatic, ...careerConfirmed(s.worldcup)]),
    ],
    retained = qualified.filter((id) => s.roster.includes(id)),
    promoted = qualified.filter((id) => !s.roster.includes(id)),
    p = s.worldcup.career!.playin;
  const relegated = p
    ? careerPlayinEliminated(s.worldcup).filter((id) => s.roster.includes(id))
    : [];
  return {
    automatic,
    league16,
    challenger,
    qualified,
    retained,
    promoted,
    relegated,
    tickets: qualified.length,
    playinTickets:
      16 - challenger.filter((id) => !league16.includes(id)).length,
  };
}
export function nextCareerSeason(
  s: TourSeason,
  regional?: string[],
): TourSeason {
  if (!career(s) || s.stage !== careerIndex(s, 8) || !validCareerTour(s))
    throw Error("Hoàn tất World Cup hiện tại trước khi mở mùa sau.");
  const ids = s.worldcup
    .world!.groups.flatMap((g) => g.teamIds)
    .sort((a, b) => get(a).rank - get(b).rank);
  return buildCareer(
    s.seasonNumber + 1,
    ids,
    s.career!.chainId,
    s.seasonId,
    regional,
  );
}
export const careerCalendar = [
  ["League · Phase 1", "Vòng 1–10"],
  ["Tuyển chọn khu vực", "68 đội ngoài League · 16 suất World Cup Play-in"],
  ["League · Phase 2", "Vòng 11–20"],
  ["Challenger", "Swiss & playoff · Top 2 chắc vé World Cup"],
  ["League · Phase 3", "Vòng 21–31 & Play-in League · Chốt 16 đội playoff"],
  [
    "World Cup Play-in",
    "Nhánh thắng–thua · Tranh vé World Cup và thăng/trụ hạng",
  ],
  ["League · Phase 4", "Playoff 16 đội · Xếp pot World Cup"],
  ["World Cup", "32 đội · 8 bảng · Chỉ top 2 đi tiếp"],
];
export const regionalCalendar = [
  careerCalendar[0],
  ["Vòng loại khu vực · Đợt 1", "League khu vực · Mở màn vòng tròn"],
  careerCalendar[2],
  ["Vòng loại khu vực · Đợt 2", "Chốt BXH, vé sớm và hạt giống"],
  careerCalendar[3],
  careerCalendar[4],
  [
    "Vòng loại khu vực · Nhánh thắng–thua",
    "Chốt các suất World Cup Play-in còn lại",
  ],
  ...careerCalendar.slice(5),
];
export function careerStageDone(s: TourSeason, stage = s.stage): boolean {
  if (pointsFormat(s.worldcup) && regionalStage(s, stage))
    return regionalTourKeys.every((r) =>
      pointsRegionalPhaseDone(s.worldcup, r, regionalPhaseIndex(stage)),
    );
  if (regionalFormat(s) && regionalStage(s, stage))
    return regionalTourKeys.every((r) =>
      stage === 6
        ? regionalTourStatus(s.worldcup, r).done
        : regionalRows(s, r, stage)
            .flat()
            .every((m) => !!m.sets),
    );
  stage = careerBaseStage(s, stage);
  if (stage === 8) return true;
  if ([0, 2, 4].includes(stage)) {
    const [a, b] = bounds(stage);
    const done = s.league.rounds
      .slice(a, b)
      .flat()
      .every((m) => m.sets);
    return (
      done &&
      (stage !== 4 ||
        (!!s.league.playin?.every((m) => m.sets) &&
          s.league.bracket?.r16.length === 8))
    );
  }
  if (stage === 1)
    return F.regionOrder.every((r) =>
      careerRegionalDone(s.worldcup.regions[r]),
    );
  if (stage === 3) return !!s.challenger && C.challengerComplete(s.challenger);
  if (stage === 5) return careerPlayinDone(s.worldcup);
  if (stage === 6) return V.complete(s.league);
  return F.worldComplete(s.worldcup);
}
const pending = (rounds: Match[][]) =>
  rounds.find((row) => row.some((m) => !m.sets)) || [];
export function careerBatch(s: TourSeason): Match[] {
  if (careerStageDone(s)) return [];
  if (pointsFormat(s.worldcup) && regionalStage(s, s.stage))
    return regionalTourKeys.flatMap((r) =>
      pointsRegionalBatch(s.worldcup, r, regionalPhaseIndex(s.stage)),
    );
  if (regionalFormat(s) && regionalStage(s, s.stage))
    return regionalTourKeys.flatMap((r) =>
      s.stage === 6
        ? regionalTourStatus(s.worldcup, r).done
          ? []
          : pending(s.worldcup.career!.regionalTour!.brackets[r]?.rounds || [])
        : pending(regionalRows(s, r, s.stage)),
    );
  const stage = careerBaseStage(s, s.stage);
  if ([0, 2, 4].includes(stage)) {
    const [a, b] = bounds(stage),
      row = pending(s.league.rounds.slice(a, b));
    return row.length ? row : stage === 4 ? s.league.playin || [] : [];
  }
  if (stage === 1)
    return F.regionOrder.flatMap((r) => {
      const g = s.worldcup.regions[r];
      return F.fullLeagueDone(g)
        ? g.qualifierBranches?.flatMap((b) => pending(b.rounds)) || []
        : pending(g.rounds);
    });
  if (stage === 3) {
    const c = s.challenger!;
    if (!C.swissDone(c)) return c.rounds.at(-1)!;
    return (
      F.worldPlayOrder
        .map((k) => c.bracket?.[k] || [])
        .find((ms) => ms.some((m) => !m.sets)) || []
    );
  }
  if (stage === 5) {
    const p = s.worldcup.career!.playin!;
    return p.double
      ? p.double.rounds.at(-1) || []
      : p.preliminary.some((m) => !m.sets)
        ? p.preliminary
        : p.final;
  }
  if (stage === 6)
    return (
      V.playoffOrder(s.league)
        .map(({ key }) => s.league.bracket?.[key] || [])
        .find((ms) => ms.some((m) => !m.sets)) || []
    );
  const w = s.worldcup.world!;
  if (!w.groups.every(F.fullLeagueDone))
    return F.worldRoundMatches(w, F.worldCurrentRound(w));
  return (
    F.worldPlayOrder
      .map((k) => w.bracket?.[k] || [])
      .find((ms) => ms.some((m) => !m.sets)) || []
  );
}
export function advanceCareer(s: TourSeason) {
  V.stampResults(s.league);
  if (pointsFormat(s.worldcup) && regionalStage(s, s.stage))
    advancePointsRegions(s.worldcup, regionalPhaseIndex(s.stage));
  else if (regionalFormat(s)) {
    if (s.stage === 6) advanceRegionalTour(s.worldcup);
  } else if (s.stage === 1) advanceCareerRegions(s.worldcup);

  if (careerBaseStage(s, s.stage) === 3) {
    const c = s.challenger!;
    C.advanceChallenger(c);
    C.stampChallenger(c);
    if (!C.swissDone(c) && c.rounds.at(-1)!.every((m) => m.sets))
      C.drawSwissRound(c);
    if (C.swissDone(c) && !c.bracket) C.drawChallengerPlayoff(c);
  }
  if (careerBaseStage(s, s.stage) === 4 && V.leagueDone(s.league)) {
    if (!s.league.playin) V.startPlayin(s.league);
    if (s.league.playin!.every((m) => m.sets) && !s.league.bracket)
      V.draw(s.league);
  }
  if (careerBaseStage(s, s.stage) === 5) advanceCareerPlayin(s.worldcup);
  if (careerBaseStage(s, s.stage) === 6) {
    V.advance(s.league);
    V.stampResults(s.league);
  }
  if (careerBaseStage(s, s.stage) === 7) {
    const f = s.worldcup;
    if (f.world!.groups.every(F.fullLeagueDone) && !f.world!.bracket)
      F.drawWorldPlayoff(f);
    F.advanceWorld(f);
  }
  F.stampFull(s.worldcup);
}
export function nextCareerStage(s: TourSeason) {
  if (s.stage === careerIndex(s, 8) || !careerStageDone(s))
    throw Error("Hoàn tất chặng hiện tại trước khi tiếp tục.");
  s.stage++;
  if (pointsFormat(s.worldcup) && regionalStage(s, s.stage))
    advancePointsRegions(s.worldcup, regionalPhaseIndex(s.stage));
  else if (regionalFormat(s) && s.stage === 6) advanceRegionalTour(s.worldcup);
  if (careerBaseStage(s, s.stage) === 3)
    s.challenger = C.freshChallenger(s.seasonNumber, s.roster, true);
  if (careerBaseStage(s, s.stage) === 5) {
    const status = careerStatus(s);
    createCareerPlayin(s.worldcup, status.league16, status.challenger);
  }
  if (careerBaseStage(s, s.stage) === 7) drawCareerWorld(s.worldcup, s.league);
}
export function validCareerTour(s: TourSeason): boolean {
  try {
    if (
      typeof s.seasonId !== "string" ||
      typeof s.career?.chainId !== "string" ||
      s.version !== 1 ||
      s.mode !== "tour" ||
      s.rules !== "career-v1" ||
      !s.career ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(s.seasonId) ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(s.career.chainId) ||
      !Number.isSafeInteger(s.seasonNumber) ||
      s.seasonNumber < 1 ||
      !Number.isFinite(Date.parse(s.createdAt)) ||
      !Number.isInteger(s.stage) ||
      s.stage < 0 ||
      s.stage > careerIndex(s, 8) ||
      !validCareerRoster(s.roster)
    )
      return false;
    if (s.career.previousSeasonId === null) {
      if (
        s.seasonNumber !== 1 ||
        F.regionOrder.some(
          (r) =>
            s.roster.filter((id) => get(id).region === r).length !==
            { CEV: 7, AVC: 7, NORCECA: 7, CAVB: 5, CSV: 6 }[r],
        )
      )
        return false;
    } else if (
      typeof s.career.previousSeasonId !== "string" ||
      s.seasonNumber <= 1 ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(s.career.previousSeasonId) ||
      s.career.previousSeasonId === s.seasonId
    )
      return false;
    if (
      !V.validState(s.league) ||
      s.league.career !== true ||
      s.league.playoffFormat !== "single" ||
      s.league.playoffEntry !== undefined ||
      !sameCareerSet(V.ids(s.league), s.roster) ||
      !validCareerFull(s.worldcup) ||
      JSON.stringify(s.worldcup.career!.leagueRoster) !==
        JSON.stringify(s.roster) ||
      s.worldcup.seasonNumber !== s.seasonNumber
    )
      return false;
    if (
      s.stage >= careerIndex(s, 3) !== !!s.challenger ||
      (s.challenger &&
        (!C.validChallenger(s.challenger) ||
          s.challenger.career !== true ||
          !sameCareerSet(s.challenger.roster, s.roster)))
    )
      return false;
    if (
      regionalFormat(s) &&
      !pointsFormat(s.worldcup) &&
      s.stage >= 6 &&
      regionalTourKeys.some(
        (r) =>
          s.worldcup.regions[r].rounds.length &&
          !s.worldcup.career!.regionalTour!.brackets[r],
      )
    )
      return false;
    for (let i = 0; i < s.stage; i++) if (!careerStageDone(s, i)) return false;
    const last =
      s.stage < careerIndex(s, 2) ? 10 : s.stage < careerIndex(s, 4) ? 20 : 31;
    if (
      s.league.rounds
        .slice(last)
        .flat()
        .some((m) => m.sets)
    )
      return false;
    let waiting = false;
    for (const row of s.league.rounds) {
      if (waiting && row.some((m) => m.sets)) return false;
      if (row.some((m) => !m.sets)) waiting = true;
    }
    if (
      regionalFormat(s) &&
      !pointsFormat(s.worldcup) &&
      (regionalTourKeys.some(
        (r) =>
          s.worldcup.regions[r].rounds
            .slice(
              s.stage < 1
                ? 0
                : s.stage < 3
                  ? regionalTourSplit(s.worldcup.regions[r])
                  : undefined,
            )
            .some((row) => row.some((m) => m.sets)) && s.stage < 3,
      ) ||
        (s.stage < 6 &&
          Object.keys(s.worldcup.career!.regionalTour!.brackets).length))
    )
      return false;
    if (pointsFormat(s.worldcup)) {
      for (const [phase, at] of [
        [0, 1],
        [1, 3],
        [2, 6],
      ])
        if (
          s.stage < at &&
          regionalTourKeys.some((r) =>
            pointsRegionalPhaseMatches(s.worldcup, r, phase).some(
              (m) => m.sets,
            ),
          )
        )
          return false;
    }
    if (s.stage === 0 && F.fullMatches(s.worldcup).some((m) => m.sets))
      return false;
    const leagueDone = V.leagueDone(s.league);
    if (
      s.stage < careerIndex(s, 4)
        ? !!s.league.playin || !!s.league.bracket
        : leagueDone !== !!s.league.playin
    )
      return false;
    if (s.stage === careerIndex(s, 4)) {
      const ready = !!s.league.playin?.every((m) => m.sets);
      if (
        ready !== !!s.league.bracket ||
        s.league.bracket?.r16.some((m) => m.sets) ||
        s.league.bracket?.qf.length
      )
        return false;
    }
    if (
      s.stage < careerIndex(s, 6) &&
      s.league.bracket?.r16.some((m) => m.sets)
    )
      return false;
    const p = s.worldcup.career!.playin;
    if (s.stage >= careerIndex(s, 5) !== !!p) return false;
    if (p) {
      const status = careerStatus(s);
      if (
        JSON.stringify(p.league16) !== JSON.stringify(status.league16) ||
        JSON.stringify(p.challenger) !== JSON.stringify(status.challenger)
      )
        return false;
    }
    if (s.stage >= careerIndex(s, 7) !== !!s.worldcup.world) return false;
    if (s.worldcup.world) {
      const expected = careerWorldPots(s.worldcup, s.league);
      if (expected.some((p, i) => !sameCareerSet(s.worldcup.world!.pots[i], p)))
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function freshPointsTour(
  number = 1,
  roster?: string[],
  selected?: string[],
) {
  const s = freshCareerTour(number, roster);
  if (!selected) throw Error("Cần chọn đội vòng loại khu vực.");
  setupPointsRegions(s.worldcup, selected);
  return s;
}
export function nextPointsSeason(s: TourSeason, selected: string[]) {
  const next = nextCareerSeason(s);
  setupPointsRegions(next.worldcup, selected);
  return next;
}
export const pointsCalendar = [
  careerCalendar[0],
  ["Vòng loại khu vực · Phase 1", "Bảng 4 đội · Top 2 → playoff · Tích điểm"],
  careerCalendar[2],
  ["Vòng loại khu vực · Phase 2", "Bảng 4 đội · Top 2 → playoff · Tích điểm"],
  ["Challenger", "Swiss & playoff · Tích điểm World Cup"],
  careerCalendar[4],
  [
    "Vòng loại khu vực · Phase 3",
    "Nhánh thắng–thua đến nhà vô địch · Chốt điểm khu vực",
  ],
  ["League · Phase 4", "Playoff League · Chốt 12 vé theo điểm"],
  ["World Cup Play-in", "32 đội · 16 vé · Mỗi đội hai mạng"],
  careerCalendar[7],
];
