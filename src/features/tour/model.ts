import * as T from "../../domain/tour/index";
import type { ArchiveRecord } from "../shared/season-cloud";
import * as V from "../../domain/index";
import * as C from "../../domain/challenger/index";
import * as F from "../../domain/full-season/index";
import type { Region } from "../../domain/types";
export interface TourHonours {
  league: string[];
  challenger: string[];
  worldcup: string[];
}
export interface TourRecord extends ArchiveRecord<T.TourSeason> {
  honours?: TourHonours;
  total_matches?: number;
}
export const clone = <S>(s: S): S => JSON.parse(JSON.stringify(s));
export const tourStoragePrefix = __VOLLEY_CONFIG__.previewLocal
  ? "volleyworld-tour-merit-preview"
  : "volleyworld-tour";
export const model = {
  scope: `${tourStoragePrefix}-guest`,
  loadedScope: "",
  token: 0,
  records: [] as TourRecord[],
  selected: null as string | null,
  section: "journey",
  stage: 0,
  round: 0,
  region: "CEV" as Region,
  group: null as number | null,
  swissView: "tree" as "tree" | "matches",
  setup: null as null | {
    ids: string[];
    region: Region;
    scope: string;
    token: number;
  },
  achievementRegion: "CEV" as Region,
  achievementTeam: null as string | null,
  achievementCompetition: "all" as "all" | "league" | "challenger" | "worldcup",
  loading: false,
  error: "",
};
export const selected = () =>
  model.records.find((r) => r.season_id === model.selected);
export function recordOf(source: T.TourSeason, revision = 0): TourRecord {
  const s = clone(source),
    upgraded = T.useOriginalPlayoff(s);
  return {
    ...(upgraded ? { dirty: true } : {}),
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    created_at: s.createdAt,
    status: T.complete(s) ? "completed" : "active",
    played: T.played(s),
    podium: T.podium(s),
    honours: {
      league: V.podium(s.league),
      challenger: s.challenger ? C.challengerPodium(s.challenger) : [],
      worldcup: F.worldPodium(s.worldcup),
    },
    total_matches: T.seasonTotal(s),
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
      r.played <= 968 &&
      Number.isSafeInteger(r.revision) &&
      r.revision >= 0 &&
      Array.isArray(r.podium) &&
      r.podium.length === (r.status === "completed" ? 3 : 0) &&
      (r.dirty === undefined || typeof r.dirty === "boolean") &&
      (r.total_matches === undefined ||
        [948, 964, 968].includes(r.total_matches)) &&
      (r.honours === undefined ||
        [r.honours.league, r.honours.challenger, r.honours.worldcup].every(
          (ids) =>
            Array.isArray(ids) &&
            [0, 3].includes(ids.length) &&
            new Set(ids).size === ids.length &&
            ids.every((id) => !!V.get(id)),
        )) &&
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
    return Array.isArray(rows)
      ? rows
          .filter(validRecord)
          .map((r) =>
            r.snapshot &&
            V.expandedSingle(r.snapshot.league) &&
            (r.snapshot.stage < 6 ||
              (r.snapshot.stage === 6 &&
                !r.snapshot.league.bracket &&
                !r.snapshot.league.playin?.some((m) => m.sets)))
              ? { ...r, ...recordOf(r.snapshot, r.revision), dirty: true }
              : r,
          )
      : [];
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
