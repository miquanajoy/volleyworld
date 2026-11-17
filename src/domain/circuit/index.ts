import { get } from "../../data/teams";
import type { Match, SetScore } from "../types";
import { simulate } from "../match/simulation";
import { validate } from "../match/scoring";
import { shuffle } from "../shared/random";
import * as C from "../challenger/index";
import * as F from "../full-season/index";
import { careerWorldPairs } from "../career/world";
import {
  regions,
  phaseIndex,
  type CircuitSeason,
  type CircuitRegion,
  type CircuitZone,
} from "./types";
import {
  bracket,
  advanceBracket,
  bracketBatch,
  bracketDone,
  bracketMatches,
  bracketRanks,
} from "./bracket";
import {
  newZone,
  newPhase,
  defaultUpper,
  defaultLower,
  pool,
  phasePrefix,
  phaseMatches,
  advanceLeague,
  leagueDone,
  leagueRanks,
  nextSeeds,
  regionOf,
} from "./league";
import { directTickets, points, qualifiers } from "./points";
export * from "./types";
export * from "./bracket";
export * from "./league";
export * from "./points";
export const defaultSelection = () =>
  Object.fromEntries(
    regions.map((r) => [
      r,
      { upper: defaultUpper(r), lower: defaultLower(r, defaultUpper(r)) },
    ]),
  ) as Record<CircuitRegion, { upper: string[]; lower: string[] }>;
export function validSelection(selection: ReturnType<typeof defaultSelection>) {
  return regions.every((r) => {
    const z = selection[r];
    return (
      z &&
      z.upper.length === 16 &&
      z.lower.length === 8 &&
      new Set([...z.upper, ...z.lower]).size === 24 &&
      [...z.upper, ...z.lower].every((id) => pool(r).includes(id))
    );
  });
}
export function freshCircuit(
  number = 1,
  selection = defaultSelection(),
  previous?: CircuitSeason,
): CircuitSeason {
  if (!validSelection(selection))
    throw Error(
      "Mỗi khu vực cần 16 đội mâm 1 và 8 đội mâm 2, không trùng nhau.",
    );
  if (
    previous &&
    (!complete(previous) ||
      regions.some(
        (r) =>
          JSON.stringify(selection[r].upper) !==
          JSON.stringify(nextUpper(previous, r)),
      ))
  )
    throw Error("Danh sách mâm 1 phải kế thừa suất mùa trước.");
  const seasonId = crypto.randomUUID();
  return {
    version: 2,
    mode: "circuit",
    seasonId,
    seasonNumber: number,
    createdAt: new Date().toISOString(),
    chainId: previous?.chainId || seasonId,
    previousSeasonId: previous?.seasonId || null,
    stage: 0,
    regions: Object.fromEntries(
      regions.map((r) => [
        r,
        newZone(r, selection[r].upper, selection[r].lower),
      ]),
    ) as Record<CircuitRegion, CircuitZone>,
    firstStand: null,
    challenger: null,
    world: null,
  };
}
export const complete = (s: CircuitSeason) => s.stage === 7;
export function matches(s: CircuitSeason): Match[] {
  return [
    ...regions.flatMap((r) => {
      const z = s.regions[r];
      return [
        ...z.phases.flatMap((p) => [
          ...phaseMatches(p.upper),
          ...phaseMatches(p.lower),
        ]),
        ...(z.playin?.groups.flatMap(bracketMatches) || []),
        ...bracketMatches(z.playin?.bracket || null),
      ];
    }),
    ...bracketMatches(s.firstStand),
    ...(s.challenger ? C.challengerMatches(s.challenger) : []),
    ...(s.world?.groups.flatMap((g) => g.rounds.flat()) || []),
    ...(s.world
      ? F.worldStages.flatMap((k) => s.world!.bracket?.[k] || [])
      : []),
  ];
}
export const played = (s: CircuitSeason) =>
  matches(s).filter((m) => m.sets).length;
export function stageDone(s: CircuitSeason, stage = s.stage): boolean {
  if (stage === 7) return true;
  if ([0, 2, 4].includes(stage)) {
    const p = phaseIndex(stage);
    return regions.every((r) => {
      const z = s.regions[r].phases[p];
      return !!z && leagueDone(z.upper) && leagueDone(z.lower);
    });
  }
  if (stage === 1) return !!s.firstStand && bracketDone(s.firstStand);
  if (stage === 3) return !!s.challenger && C.challengerComplete(s.challenger);
  if (stage === 5)
    return regions.every((r) => {
      const p = s.regions[r].playin;
      return !!p?.bracket && bracketDone(p.bracket);
    });
  return (
    !!s.world?.bracket?.final[0]?.sets && !!s.world.bracket.bronze[0]?.sets
  );
}
function pendingGroups(p: Parameters<typeof phaseMatches>[0]) {
  if (p.bracket) return bracketBatch(p.bracket);
  const n = p.groups.find((g) => !F.fullLeagueDone(g));
  if (!n) return [];
  const round = n.rounds.findIndex((row) => row.some((m) => !m.sets));
  return p.groups.flatMap((g) => g.rounds[round] || []);
}
export function regionalBatch(
  s: CircuitSeason,
  r: CircuitRegion,
  upper?: boolean,
): Match[] {
  if ([0, 2, 4].includes(s.stage)) {
    const p = s.regions[r].phases[phaseIndex(s.stage)];
    return [
      ...(upper !== false ? pendingGroups(p.upper) : []),
      ...(upper !== true ? pendingGroups(p.lower) : []),
    ];
  }
  if (s.stage === 5) {
    const p = s.regions[r].playin!;
    return p.bracket ? bracketBatch(p.bracket) : p.groups.flatMap(bracketBatch);
  }
  return [];
}
export function batch(s: CircuitSeason): Match[] {
  if (complete(s) || stageDone(s)) return [];
  if ([0, 2, 4, 5].includes(s.stage))
    return regions.flatMap((r) => regionalBatch(s, r));
  if (s.stage === 1) return bracketBatch(s.firstStand);
  if (s.stage === 3) {
    const c = s.challenger!;
    if (!C.swissDone(c)) return c.rounds.at(-1)!;
    return F.worldPlayOrder
      .flatMap((k) => c.bracket?.[k] || [])
      .filter((m) => !C.challengerLocked(c, m));
  }
  const w = s.world!;
  if (!w.groups.every(F.fullLeagueDone))
    return F.worldRoundMatches(w, F.worldCurrentRound(w));
  const key = F.worldPlayOrder.find((k) => w.bracket?.[k].some((m) => !m.sets));
  return key ? w.bracket![key] : [];
}
export function advance(s: CircuitSeason) {
  if ([0, 2, 4].includes(s.stage)) {
    const p = phaseIndex(s.stage);
    for (const r of regions)
      for (const upper of [true, false]) {
        const phase = s.regions[r].phases[p][upper ? "upper" : "lower"];
        advanceLeague(phase, p, upper, phasePrefix(r, p, upper));
        if (phase.bracket) advanceBracket(phase.bracket);
      }
  }
  if (s.stage === 1) advanceBracket(s.firstStand!);
  if (s.stage === 3) {
    const c = s.challenger!;
    C.advanceChallenger(c);
    if (!C.swissDone(c) && c.rounds.at(-1)!.every((m) => m.sets))
      C.drawSwissRound(c);
    if (C.swissDone(c) && !c.bracket) C.drawChallengerPlayoff(c);
  }
  if (s.stage === 5)
    for (const r of regions) {
      const p = s.regions[r].playin!;
      p.groups.forEach(advanceBracket);
      if (!p.bracket && p.groups.every(bracketDone)) {
        const rows = p.groups.map(bracketRanks);
        p.bracket = bracket(
          "top4",
          [
            rows[0][0].id,
            rows[1][1].id,
            rows[2][0].id,
            rows[3][1].id,
            rows[1][0].id,
            rows[0][1].id,
            rows[3][0].id,
            rows[2][1].id,
          ],
          r + "PIK",
        );
        p.bracket.opening = [...p.bracket.seeds];
        p.bracket.rounds = [];
      }
      if (p.bracket) advanceBracket(p.bracket);
    }
  if (s.stage === 6) {
    const w = s.world!;
    if (w.groups.every(F.fullLeagueDone) && !w.bracket) {
      w.bracket = {
        r16: careerWorldPairs(w).map(([a, b], i) => ({
          id: "WCR" + i,
          a,
          b,
          sets: null,
        })),
        qf: [],
        sf: [],
        bronze: [],
        final: [],
      };
    }
    F.advanceWorld(worldFacade(s));
  }
  let order = Math.max(0, ...matches(s).map((m) => m.resultOrder || 0));
  for (const m of matches(s))
    if (m.sets && !m.resultOrder) m.resultOrder = ++order;
}
export function nextStage(s: CircuitSeason) {
  if (complete(s) || !stageDone(s))
    throw Error("Hoàn tất chặng hiện tại trước khi tiếp tục.");
  s.stage++;
  if (s.stage === 1) {
    const seeds = [0, 1].flatMap((rank) =>
      regions.map((r) => leagueRanks(s.regions[r].phases[0].upper)[rank].id),
    );
    s.firstStand = bracket("double", seeds, "FS");
  }
  if (s.stage === 2 || s.stage === 4) {
    const p = phaseIndex(s.stage);
    for (const r of regions) {
      const previous = s.regions[r].phases[p - 1];
      s.regions[r].phases.push({
        upper: newPhase(
          nextSeeds(previous.upper),
          p,
          true,
          phasePrefix(r, p, true),
        ),
        lower: newPhase(
          nextSeeds(previous.lower),
          p,
          false,
          phasePrefix(r, p, false),
        ),
      });
    }
  }
  if (s.stage === 3) {
    const roster = Array.from({ length: 4 }, (_, rank) =>
      regions.map((r) => leagueRanks(s.regions[r].phases[1].upper)[rank].id),
    ).flat();
    const pairs = regions.flatMap((_, i) => [
      [roster[i], roster[12 + ((i + 1) % 4)]],
      [roster[4 + i], roster[8 + ((i + 1) % 4)]],
    ]);
    s.challenger = {
      version: 1,
      mode: "challenger",
      circuit: true,
      seasonId: s.seasonId + "-C",
      seasonNumber: s.seasonNumber,
      createdAt: s.createdAt,
      roster,
      tie: [...roster],
      rounds: [pairs.map(([a, b], i) => ({ id: "C0-" + i, a, b, sets: null }))],
      bracket: null,
    };
  }
  if (s.stage === 5)
    for (const r of regions) {
      const direct = directTickets(s, r),
        eligible = points(s, r, true)
          .filter((t) => ![...direct.league, ...direct.points].includes(t.id))
          .map((t) => t.id),
        lower = points(s, r, false)
          .slice(0, 4)
          .map((t) => t.id);
      const pots = [
        eligible.slice(0, 4),
        eligible.slice(4, 8),
        eligible.slice(8),
        lower,
      ].map(shuffle);
      s.regions[r].playin = {
        groups: Array.from({ length: 4 }, (_, i) =>
          bracket(
            "gsl",
            pots.map((p) => p[i]),
            r + "PIG" + i,
          ),
        ),
        bracket: null,
      };
    }
  if (s.stage === 6) {
    const pots = Array.from({ length: 4 }, () => [] as string[]);
    for (const r of regions) {
      const q = qualifiers(s, r),
        sorted = [...q].sort(
          (a, b) =>
            (points(s, r, true).find((t) => t.id === b)?.total || 0) -
              (points(s, r, true).find((t) => t.id === a)?.total || 0) ||
            get(a).rank - get(b).rank,
        );
      sorted.forEach((id, i) => pots[Math.floor(i / 2)].push(id));
    }
    const groups = Array.from({ length: 8 }, () => [] as string[]);
    regions.forEach((r, ri) => {
      pots.forEach((pot, p) => {
        const ids = shuffle(pot.filter((id) => regionOf(id) === r));
        ids.forEach((id, j) => groups[(ri * 2 + j + p * 2) % 8].push(id));
      });
    });
    s.world = {
      pots,
      groups: groups.map((ids, i) => F.fullLeague(ids, "WCG" + i)),
      tie: pots.flat(),
      bracket: null,
    };
  }
}
export function recordScore(s: CircuitSeason, id: string, sets: SetScore[]) {
  const m = batch(s).find((m) => m.id === id);
  if (!m || !validate(sets))
    throw Error("Trận đã khóa hoặc tỉ số không hợp lệ.");
  m.sets = sets.map((p) => [...p]);
  advance(s);
}
export function simulateBatch(
  s: CircuitSeason,
  r?: CircuitRegion,
  upper?: boolean,
) {
  const ms = r ? regionalBatch(s, r, upper) : batch(s);
  if (!ms.some((m) => !m.sets))
    throw Error("Không còn trận chưa đấu trong lượt này.");
  ms.filter((m) => !m.sets).forEach(simulate);
  advance(s);
}
export function finishStage(
  s: CircuitSeason,
  r?: CircuitRegion,
  upper?: boolean,
) {
  let guard = 0;
  while (r ? regionalBatch(s, r, upper).some((m) => !m.sets) : !stageDone(s)) {
    if (++guard > 200) throw Error("Lịch thi đấu không thể tiếp tục.");
    simulateBatch(s, r, upper);
  }
}
export function finishSeason(s: CircuitSeason) {
  while (!complete(s)) {
    finishStage(s);
    nextStage(s);
  }
}
export function worldFacade(s: CircuitSeason): F.FullSeason {
  return {
    version: 1,
    mode: "full-season",
    seasonId: s.seasonId,
    seasonNumber: s.seasonNumber,
    createdAt: s.createdAt,
    regions: {} as F.FullSeason["regions"],
    world: s.world,
  };
}
export function nextUpper(s: CircuitSeason, r: CircuitRegion) {
  if (!complete(s)) throw Error("Hoàn tất World Cup trước khi mở mùa tiếp.");
  const wc = qualifiers(s, r);
  return [
    ...wc,
    ...points(s, r, true)
      .filter((t) => !wc.includes(t.id))
      .slice(0, 8)
      .map((t) => t.id),
  ];
}
export function inheritedSelection(s: CircuitSeason) {
  return Object.fromEntries(
    regions.map((r) => {
      const upper = nextUpper(s, r);
      return [r, { upper, lower: defaultLower(r, upper) }];
    }),
  ) as ReturnType<typeof defaultSelection>;
}
export const podium = (s: CircuitSeason) =>
  s.world ? F.worldPodium(worldFacade(s)) : [];
export const totalMatches = 1071;
export { validCircuit } from "./validation";

export * from "./international-tickets";
