import { meritQualification, meritDirect } from "./merit";
import { winner } from "../match/scoring";
import { get } from "../../data/teams";
import type { Region } from "../types";
import type { FullLeague, FullSeason } from "./types";
import { regionOrder, worldSlots } from "./types";
import { fullStandings } from "./league";
import { groupBerths, groupDirectSlots, regionalGroup } from "./regional";
import { qualifierWinner } from "./qualification";
export interface WorldCupBerth {
  readonly id: string;
  readonly region: Region;
  readonly route:
    "group" | "regional-playoff" | "playin" | "league" | "challenger";
  readonly label: string;
}
export interface WorldCupBerths {
  readonly teams: readonly WorldCupBerth[];
  readonly total: number;
  readonly capacity: 24;
}
// Result-identical clones (e.g. a League result) must not repeat qualification searches.
// Include every ranking input so score corrections and historical views cannot use stale proof.
const certificates = new Map<string, readonly string[]>();
function directQualifiers(g: FullLeague, slots: number): readonly string[] {
  const key = JSON.stringify([slots, g.teamIds, g.tie, g.rounds]);
  const cached = certificates.get(key);
  if (cached) return cached;
  const proof = groupBerths(g, slots, false, slots, 12),
    ids = Object.freeze(
      fullStandings(g)
        .filter((r) => proof[r.id].qualified)
        .map((r) => r.id),
    );
  if (certificates.size >= 32)
    certificates.delete(certificates.keys().next().value!);
  certificates.set(key, ids);
  return ids;
}
/** Only mathematically confirmed berths count; a regional playoff place is not a WC berth. */
export function worldCupBerths(s: FullSeason): WorldCupBerths {
  const entrants = new Map<string, WorldCupBerth>();
  const add = (id: string, route: WorldCupBerth["route"], label: string) => {
    if (!entrants.has(id))
      entrants.set(
        id,
        Object.freeze({ id, region: get(id).region, route, label }),
      );
  };
  if (meritQualification(s))
    s.automatic?.forEach((id, i) =>
      add(
        id,
        i === 0 ? "league" : "challenger",
        i === 0 ? "Vô địch League · Vé đặc cách" : "Vé đặc cách Challenger",
      ),
    );
  for (const r of regionOrder) {
    const region = s.regions[r],
      groups = region.groups
        ? region.groups.map((_, i) => regionalGroup(region, i))
        : [region];
    const slots =
      region.directSlots ||
      (region.groups ? groupDirectSlots[r] : worldSlots[r]);
    groups.forEach((g, i) => {
      for (const id of meritQualification(s) && s.automatic
        ? meritDirect(s, r).filter((id) => g.teamIds.includes(id))
        : directQualifiers(g, slots))
        add(
          id,
          "group",
          r === "CSV"
            ? `Top ${slots} Nam Mỹ · Vé trực tiếp`
            : `${slots === 1 ? (meritQualification(s) ? "Suất" : "Nhất") : "Top " + slots} bảng ${String.fromCharCode(65 + i)} · Vé trực tiếp`,
        );
    });
    const decider = region.decider && winner(region.decider);
    if (decider)
      add(decider, "regional-playoff", "Thắng trận tranh suất khu vực");
    const champion = qualifierWinner(region.playoff);
    if (champion) add(champion, "regional-playoff", "Thắng playoff khu vực");
  }
  for (const b of s.intercontinental?.branches || []) {
    const champion = qualifierWinner(b);
    if (champion) add(champion, "playin", "Thắng Play-in liên khu vực");
  }
  const teams = Object.freeze(
    regionOrder.flatMap((r) =>
      [...entrants.values()].filter((t) => t.region === r),
    ),
  );
  return Object.freeze({ teams, total: teams.length, capacity: 24 });
}
