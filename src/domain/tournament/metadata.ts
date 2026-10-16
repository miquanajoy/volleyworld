import type { SeasonTournament, Tournament } from "../types";
/** Identity-preserving metadata migration; never regenerates fixtures, seeds or scores. */
export function ensureSeason(s: Tournament, newId = false): SeasonTournament {
  if (!s.seasonId)
    s.seasonId = newId
      ? typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "season-" +
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2)
      : "legacy-season-1";
  if (!s.seasonNumber) s.seasonNumber = 1;
  if (!s.seasonCreatedAt) s.seasonCreatedAt = new Date().toISOString();
  return s as SeasonTournament;
}
