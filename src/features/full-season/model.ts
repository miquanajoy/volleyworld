import { get } from "../../data/teams";
import type { FullSeason } from "../../domain/full-season/types";
import { validFullSeason } from "../../domain/full-season/validation";
import {
  fullMatches,
  worldComplete,
  worldPodium,
} from "../../domain/full-season/index";
export interface FullRecord {
  season_id: string;
  season_number: number;
  created_at: string;
  status: "active" | "completed";
  played: number;
  podium: string[];
  revision: number;
  updated_at?: string;
  snapshot?: FullSeason;
  dirty?: boolean;
  phase?: string;
  remoteRevision?: number;
}
export const fullModel = {
  scope: "volleyworld-full-guest",
  records: [] as FullRecord[],
  selected: null as string | null,
  section: "overview",
  round: 0,
  loadedScope: "",
  loading: false,
  error: "",
  token: 0,
};
export const clone = <T>(s: T): T => JSON.parse(JSON.stringify(s));
export function recordOf(s: FullSeason, revision = 0): FullRecord {
  return {
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    created_at: s.createdAt,
    status: worldComplete(s) ? "completed" : "active",
    played: fullMatches(s).filter((m) => m.sets).length,
    podium: worldPodium(s),
    revision,
    snapshot: clone(s),
  };
}
export function validFullRecord(r: FullRecord): boolean {
  return (
    !!r &&
    /^[a-zA-Z0-9-]{1,100}$/.test(r.season_id) &&
    Number.isSafeInteger(r.season_number) &&
    r.season_number > 0 &&
    Number.isFinite(Date.parse(r.created_at)) &&
    ["active", "completed"].includes(r.status) &&
    Number.isSafeInteger(r.played) &&
    r.played >= 0 &&
    r.played <= 1315 &&
    Array.isArray(r.podium) &&
    [0, 3].includes(r.podium.length) &&
    r.podium.every((id) => !!get(id)) &&
    Number.isSafeInteger(r.revision) &&
    r.revision >= 0 &&
    (r.dirty === undefined || typeof r.dirty === "boolean") &&
    (!r.snapshot ||
      (validFullSeason(r.snapshot) &&
        r.snapshot.seasonId === r.season_id &&
        r.snapshot.seasonNumber === r.season_number &&
        (worldComplete(r.snapshot) ? "completed" : "active") === r.status))
  );
}
export function readScope(key: string): FullRecord[] {
  try {
    const rows = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(rows) ? rows.filter(validFullRecord) : [];
  } catch {
    return [];
  }
}
export function persistFull() {
  try {
    const cached = new Set(
      fullModel.records
        .filter((r) => r.snapshot && !r.dirty)
        .slice(-5)
        .map((r) => r.season_id),
    );
    const rows = fullModel.records.map((r) => ({
      ...r,
      snapshot: r.dirty || cached.has(r.season_id) ? r.snapshot : undefined,
      phase: undefined,
      remoteRevision: undefined,
    }));
    localStorage.setItem(fullModel.scope, JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}
export function fullBackup(s: FullSeason) {
  try {
    const key = fullModel.scope + "-backups",
      rows = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          { time: new Date().toISOString(), state: clone(s) },
          ...(Array.isArray(rows) ? rows : []),
        ].slice(0, 3),
      ),
    );
  } catch {
    /* A failed backup must not erase the current save. */
  }
}
export function selectedFull() {
  return fullModel.records.find((r) => r.season_id === fullModel.selected);
}
