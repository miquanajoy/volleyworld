import { catalog } from "../../data/teams";
import { placementPoints } from "../../domain/honours/points";
import { finalPlacements } from "../../domain/tournament/placement";
import type { Region, SeasonTile, TeamId } from "../../domain/types";
import { achievement, seasonMedals } from "./model";
export interface CareerEntry {
  id: TeamId;
  points: number;
  seasons: number;
  gold: number;
  silver: number;
  bronze: number;
  rank: number;
}
export interface CareerRanking {
  entries: CareerEntry[];
  complete: boolean;
  missing: number;
  seasonCount: number;
}
export function uniqueCompleted(rows: SeasonTile[]): SeasonTile[] {
  const byId = new Map<string, SeasonTile>();
  for (const row of rows)
    if (row.status === "completed") {
      const old = byId.get(row.season_id);
      if (!old || (!old.snapshot && row.snapshot)) byId.set(row.season_id, row);
    }
  return [...byId.values()];
}
/** null means unknown archive data; zero means a known non-scoring season. */
export function seasonPoints(row: SeasonTile, id: TeamId): number | null {
  if (row.status !== "completed") return 0;
  const result = achievement(row, id);
  if (result.kind === "unavailable") return null;
  return result.placement ? placementPoints(result.placement) : 0;
}
export function careerSummary(rows: SeasonTile[], id: TeamId) {
  let points = 0,
    seasons = 0,
    missing = 0;
  for (const row of uniqueCompleted(rows)) {
    const value = seasonPoints(row, id);
    if (value === null) missing++;
    else {
      points += value;
      if (value > 0) seasons++;
    }
  }
  return { points, seasons, missing };
}
function compare(a: CareerEntry, b: CareerEntry): number {
  return (
    b.points - a.points ||
    b.gold - a.gold ||
    b.silver - a.silver ||
    b.bronze - a.bronze
  );
}
export function careerRanking(
  rows: SeasonTile[],
  region?: Region,
): CareerRanking {
  const completed = uniqueCompleted(rows),
    map = new Map<TeamId, CareerEntry>();
  for (const row of completed) {
    const medals = seasonMedals(row),
      placements = row.snapshot
        ? finalPlacements(row.snapshot)
        : Object.fromEntries(
            medals.map((id, i) => [id, { from: i + 1, to: i + 1 }]),
          );
    for (const [id, placement] of Object.entries(placements)) {
      const points = placementPoints(placement);
      if (!points || !catalog.some((t) => t.id === id)) continue;
      const entry = map.get(id) || {
        id,
        points: 0,
        seasons: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        rank: 0,
      };
      entry.points += points;
      entry.seasons++;
      if (placement.from === placement.to) {
        if (placement.from === 1) entry.gold++;
        if (placement.from === 2) entry.silver++;
        if (placement.from === 3) entry.bronze++;
      }
      map.set(id, entry);
    }
  }
  const entries = [...map.values()]
    .filter(
      (e) => !region || catalog.find((t) => t.id === e.id)?.region === region,
    )
    .sort((a, b) => compare(a, b) || a.id.localeCompare(b.id));
  entries.forEach((entry, i) => {
    entry.rank =
      i && compare(entry, entries[i - 1]) === 0 ? entries[i - 1].rank : i + 1;
  });
  const missing = completed.filter((r) => !r.snapshot).length;
  return {
    entries,
    complete: missing === 0,
    missing,
    seasonCount: completed.length,
  };
}
