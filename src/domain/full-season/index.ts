import { regionTeams } from "../../data/teams";
import { simulate } from "../match/simulation";
import type { Match, SetScore } from "../types";
import { validate } from "../match/scoring";
import { fullLeague, leagueMatches, simulateLeague } from "./league";
import {
  regionOrder,
  worldStages,
  worldPlayOrder,
  type FullSeason,
} from "./types";
import {
  advanceWorld,
  drawWorld,
  drawWorldPlayoff,
  worldComplete,
} from "./world";
export * from "./types";
export * from "./league";
export * from "./world";
export * from "./regional";
import { freshRegion, advanceRegions } from "./regional";
export function freshFullSeason(
  number = 1,
  format: "groups" | "legacy" = "groups",
): FullSeason {
  return {
    version: 1,
    mode: "full-season",
    seasonId: crypto.randomUUID(),
    seasonNumber: number,
    createdAt: new Date().toISOString(),
    ...(format === "groups" ? { regionalFormat: "groups-v1" as const } : {}),
    regions: Object.fromEntries(
      regionOrder.map((r) => [
        r,
        format === "groups"
          ? freshRegion(r)
          : fullLeague(
              regionTeams(r).map((t) => t.id),
              r,
            ),
      ]),
    ) as FullSeason["regions"],
    world: null,
  };
}
export function fullMatches(s: FullSeason): Match[] {
  return [
    ...regionOrder.flatMap((r) => [
      ...leagueMatches(s.regions[r]),
      ...(s.regions[r].decider ? [s.regions[r].decider!] : []),
    ]),
    ...(s.world?.groups.flatMap(leagueMatches) || []),
    ...worldStages.flatMap((k) => s.world?.bracket?.[k] || []),
  ];
}
export function stampFull(s: FullSeason) {
  let n = Math.max(0, ...fullMatches(s).map((m) => m.resultOrder || 0));
  for (const m of fullMatches(s))
    if (m.sets && !m.resultOrder) m.resultOrder = ++n;
}
export function fullMatchLocked(s: FullSeason, m: Match) {
  if (worldComplete(s)) return true;
  for (const r of regionOrder) {
    const g = s.regions[r];
    if (g.decider === m) return !!s.world;
    if (leagueMatches(g).includes(m)) return !!s.world || !!g.decider;
  }
  if (s.world?.groups.some((g) => leagueMatches(g).includes(m)))
    return !!s.world.bracket;
  const b = s.world?.bracket;
  if (!b) return false;
  if (b.r16.includes(m)) return !!b.qf.length;
  if (b.qf.includes(m)) return !!b.sf.length;
  if (b.sf.includes(m)) return !!b.final.length;
  return false;
}
export function recordFullScore(s: FullSeason, id: string, sets: SetScore[]) {
  const m = fullMatches(s).find((m) => m.id === id);
  if (!m || fullMatchLocked(s, m) || !validate(sets))
    throw Error("Kết quả không hợp lệ hoặc trận đã khóa.");
  m.sets = sets.map((p) => [...p]);
  advanceRegions(s);
  advanceWorld(s);
  stampFull(s);
}
export function finishFullSeason(s: FullSeason) {
  regionOrder.forEach((r) => simulateLeague(s.regions[r]));
  advanceRegions(s);
  regionOrder.forEach((r) => {
    const m = s.regions[r].decider;
    if (m && !m.sets) simulate(m);
  });
  if (!s.world) drawWorld(s);
  s.world!.groups.forEach((g) => simulateLeague(g));
  if (!s.world!.bracket) drawWorldPlayoff(s);
  for (const k of worldPlayOrder) {
    s.world!.bracket![k].filter((m) => !m.sets).forEach(simulate);
    advanceWorld(s);
    stampFull(s);
  }
  stampFull(s);
}

export * from "./validation";
