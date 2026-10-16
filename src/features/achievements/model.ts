import { podium } from "../../domain/playoff/outcomes";
import { finalPlacement } from "../../domain/tournament/placement";
import { ids } from "../../domain/tournament/roster";
import type { Placement } from "../../domain/tournament/placement";
import type { SeasonTile, TeamId } from "../../domain/types";
export interface AchievementResult {
  kind: "placed" | "absent" | "pending" | "cancelled" | "unavailable";
  placement?: Placement;
}
export function seasonMedals(row: SeasonTile): TeamId[] {
  if (row.status !== "completed") return [];
  if (row.snapshot) return podium(row.snapshot);
  return Array.isArray(row.podium) ? row.podium : [];
}
export function achievement(row: SeasonTile, id: TeamId): AchievementResult {
  const snapshot = row.snapshot;
  if (snapshot && !ids(snapshot).includes(id)) return { kind: "absent" };
  if (
    !snapshot &&
    !(row.status === "completed" && seasonMedals(row).includes(id))
  )
    return { kind: "unavailable" };
  if (row.status === "cancelled") return { kind: "cancelled" };
  if (row.status !== "completed") return { kind: "pending" };
  const medal = seasonMedals(row).indexOf(id);
  if (medal >= 0)
    return { kind: "placed", placement: { from: medal + 1, to: medal + 1 } };
  if (!snapshot) return { kind: "unavailable" };
  const placement = finalPlacement(snapshot, id);
  return placement ? { kind: "placed", placement } : { kind: "unavailable" };
}
export function medalCounts(rows: SeasonTile[], id: TeamId): number[] {
  return [0, 1, 2].map(
    (place) =>
      rows.filter(
        (r) => r.status === "completed" && seasonMedals(r)[place] === id,
      ).length,
  );
}
