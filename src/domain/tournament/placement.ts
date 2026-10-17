import { standings } from "../league/standings";
import { loser } from "../match/scoring";
import { entrySlots, expandedSingle } from "../playoff/entry";
import { isDouble } from "../playoff/definitions";
import { complete, podium } from "../playoff/outcomes";
import type { StageKey, TeamId, Tournament } from "../types";
import { ids } from "./roster";
export interface Placement {
  from: number;
  to: number;
}
/** Tournament finish, not a fabricated order within a tied knockout group. */
export function finalPlacement(s: Tournament, id: TeamId): Placement | null {
  if (!complete(s) || !ids(s).includes(id)) return null;
  const medal = podium(s).indexOf(id);
  if (medal >= 0) return { from: medal + 1, to: medal + 1 };
  const leagueRank = standings(s).findIndex((t) => t.id === id) + 1;
  if (leagueRank > entrySlots(s).advance)
    return { from: leagueRank, to: leagueRank };
  if (s.playin?.some((m) => loser(m) === id))
    return expandedSingle(s) ? { from: 21, to: 24 } : { from: 17, to: 20 };
  const b = s.bracket!;
  const groups: [StageKey, number, number][] = isDouble(s)
    ? [
        ["lower1", 13, 16],
        ["lower2", 9, 12],
        ["lower3", 7, 8],
        ["lower4", 5, 6],
        ["lower5", 4, 4],
      ]
    : [
        ...(expandedSingle(s)
          ? [["r20", 17, 20] as [StageKey, number, number]]
          : []),
        ["r16", 9, 16],
        ["qf", 5, 8],
        ["bronze", 4, 4],
      ];
  for (const [key, from, to] of groups)
    if (b[key]?.some((m) => loser(m) === id)) return { from, to };
  return null;
}

/** One standings pass for a whole season, used by all-time aggregation. */
export function finalPlacements(s: Tournament): Record<TeamId, Placement> {
  if (!complete(s)) return {};
  const result: Record<TeamId, Placement> = {};
  standings(s)
    .slice(entrySlots(s).advance)
    .forEach((t, i) => {
      result[t.id] = {
        from: i + entrySlots(s).advance + 1,
        to: i + entrySlots(s).advance + 1,
      };
    });
  for (const m of s.playin || []) {
    const id = loser(m);
    if (id)
      result[id] = expandedSingle(s)
        ? { from: 21, to: 24 }
        : { from: 17, to: 20 };
  }
  const groups: [StageKey, number, number][] = isDouble(s)
    ? [
        ["lower1", 13, 16],
        ["lower2", 9, 12],
        ["lower3", 7, 8],
        ["lower4", 5, 6],
        ["lower5", 4, 4],
      ]
    : [
        ...(expandedSingle(s)
          ? [["r20", 17, 20] as [StageKey, number, number]]
          : []),
        ["r16", 9, 16],
        ["qf", 5, 8],
        ["bronze", 4, 4],
      ];
  for (const [key, from, to] of groups)
    for (const m of s.bracket?.[key] || []) {
      const id = loser(m);
      if (id) result[id] = { from, to };
    }
  podium(s).forEach((id, i) => {
    result[id] = { from: i + 1, to: i + 1 };
  });
  return result;
}
