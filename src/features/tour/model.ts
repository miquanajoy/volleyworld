import * as T from "../../domain/tour/index";
import type { ArchiveRecord } from "../shared/season-cloud";
import type { Region } from "../../domain/types";
export type TourRecord = ArchiveRecord<T.TourSeason>;
export const clone = <S>(s: S): S => JSON.parse(JSON.stringify(s));
export const model = {
  scope: "volleyworld-tour-guest",
  loadedScope: "",
  token: 0,
  records: [] as TourRecord[],
  selected: null as string | null,
  section: "journey",
  stage: 0,
  round: 0,
  region: "CEV" as Region,
  swissView: "tree" as "tree" | "matches",
  setup: null as null | {
    ids: string[];
    region: Region;
    scope: string;
    token: number;
  },
  loading: false,
  error: "",
};
export const selected = () =>
  model.records.find((r) => r.season_id === model.selected);
export function recordOf(s: T.TourSeason, revision = 0): TourRecord {
  return {
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    created_at: s.createdAt,
    status: T.complete(s) ? "completed" : "active",
    played: T.played(s),
    podium: T.podium(s),
    revision,
    snapshot: clone(s),
  };
}
export function validRecord(input: unknown): input is TourRecord {
  try {
    const r = input as TourRecord;
    return (
      !!r &&
      /^[a-zA-Z0-9-]{1,100}$/.test(r.season_id) &&
      Number.isSafeInteger(r.season_number) &&
      r.season_number > 0 &&
      Number.isFinite(Date.parse(r.created_at)) &&
      ["active", "completed"].includes(r.status) &&
      Number.isSafeInteger(r.played) &&
      r.played >= 0 &&
      r.played <= T.totalMatches &&
      Number.isSafeInteger(r.revision) &&
      r.revision >= 0 &&
      Array.isArray(r.podium) &&
      r.podium.length === (r.status === "completed" ? 3 : 0) &&
      (r.dirty === undefined || typeof r.dirty === "boolean") &&
      (!r.snapshot ||
        (T.validTour(r.snapshot) &&
          r.snapshot.seasonId === r.season_id &&
          r.snapshot.seasonNumber === r.season_number &&
          r.snapshot.createdAt === r.created_at &&
          T.played(r.snapshot) === r.played &&
          T.complete(r.snapshot) === (r.status === "completed")))
    );
  } catch {
    return false;
  }
}
export function readScope(key: string): TourRecord[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(rows) ? rows.filter(validRecord) : [];
  } catch {
    return [];
  }
}
export function persist() {
  try {
    const cached = new Set(
      model.records
        .filter((r) => r.snapshot && !r.dirty)
        .slice(-3)
        .map((r) => r.season_id),
    );
    localStorage.setItem(
      model.scope,
      JSON.stringify(
        model.records.map((r) => ({
          ...r,
          snapshot: r.dirty || cached.has(r.season_id) ? r.snapshot : undefined,
          phase: undefined,
          remoteRevision: undefined,
        })),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
export function backup(s: T.TourSeason) {
  try {
    const key = model.scope + "-backups",
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
  } catch {}
}
