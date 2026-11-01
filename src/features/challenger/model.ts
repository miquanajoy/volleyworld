import * as C from "../../domain/challenger/index";
import { get } from "../../data/teams";
import type { ArchiveRecord } from "../shared/season-cloud";
export type ChallengerRecord = ArchiveRecord<C.ChallengerSeason>;
export const model = {
  scope: "volleyworld-challenger-guest",
  records: [] as ChallengerRecord[],
  loadedScope: "",
  token: 0,
  selected: null as string | null,
  section: "overview",
  round: 0,
  swissView: "tree" as "tree" | "matches",
  setup: null as null | {
    scope: string;
    token: number;
    editId: string | null;
    ids: string[];
    region: string;
    error: string;
  },
  loading: false,
  error: "",
};
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const selected = () =>
  model.records.find((r) => r.season_id === model.selected);
export function recordOf(
  s: C.ChallengerSeason,
  revision = 0,
): ChallengerRecord {
  return {
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    created_at: s.createdAt,
    status: C.challengerComplete(s) ? "completed" : "active",
    played: C.challengerMatches(s).filter((m) => m.sets).length,
    podium: C.challengerPodium(s),
    revision,
    snapshot: clone(s),
  };
}
export function validRecord(value: unknown): value is ChallengerRecord {
  try {
    const r = value as ChallengerRecord;
    return (
      !!r &&
      typeof r.season_id === "string" &&
      /^[a-zA-Z0-9-]{1,100}$/.test(r.season_id) &&
      Number.isSafeInteger(r.season_number) &&
      r.season_number > 0 &&
      r.season_number <= 2147483647 &&
      Number.isFinite(Date.parse(r.created_at)) &&
      ["active", "completed"].includes(r.status) &&
      Number.isSafeInteger(r.played) &&
      r.played >= 0 &&
      r.played <= 82 &&
      Number.isSafeInteger(r.revision) &&
      r.revision >= 0 &&
      Array.isArray(r.podium) &&
      r.podium.every((id) => !!get(id)) &&
      new Set(r.podium).size === r.podium.length &&
      r.podium.length === (r.status === "completed" ? 3 : 0) &&
      (r.dirty === undefined || typeof r.dirty === "boolean") &&
      (!r.snapshot ||
        (C.validChallenger(r.snapshot) &&
          r.snapshot.seasonId === r.season_id &&
          r.snapshot.seasonNumber === r.season_number &&
          r.snapshot.createdAt === r.created_at &&
          r.played ===
            C.challengerMatches(r.snapshot).filter((m) => m.sets).length &&
          r.status ===
            (C.challengerComplete(r.snapshot) ? "completed" : "active") &&
          JSON.stringify(r.podium) ===
            JSON.stringify(C.challengerPodium(r.snapshot))))
    );
  } catch {
    return false;
  }
}
export function readScope(key: string): ChallengerRecord[] {
  try {
    const rows = JSON.parse(localStorage.getItem(key) || "[]");
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
        .slice(-5)
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
          remoteSeasonId: undefined,
        })),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
export function backup(s: C.ChallengerSeason) {
  try {
    const key = model.scope + "-backups",
      old = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          { time: new Date().toISOString(), state: clone(s) },
          ...(Array.isArray(old) ? old : []),
        ].slice(0, 3),
      ),
    );
  } catch {
    /* The main snapshot remains available. */
  }
}
