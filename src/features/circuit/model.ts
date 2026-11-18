import { get } from "../../data/teams";
import * as D from "../../domain/circuit/index";
import type { ArchiveRecord } from "../shared/season-cloud";
export type CircuitRecord = ArchiveRecord<D.CircuitSeason>;
export const prefix = "volleyworld-circuit-v2";
export const model = {
  scope: prefix + "-guest",
  loadedScope: "",
  token: 0,
  records: [] as CircuitRecord[],
  selected: null as string | null,
  section: "journey",
  error: "",
  loading: false,
  stage: 0,
  round: 0,
  region: "CEV" as D.CircuitRegion,
  tier: "upper" as "upper" | "lower",
  group: null as number | null,
  setup: null as null | {
    selection: ReturnType<typeof D.defaultSelection>;
    parent: string | null;
    region: D.CircuitRegion;
    tier: "upper" | "lower";
    scope: string;
    token: number;
  },
  achievement: "all",
  achievementRegion: "all",
  achievementTeam: null as string | null,
  reset: false,
};
export const clone = <T>(s: T): T => JSON.parse(JSON.stringify(s));
export const selected = () =>
  model.records.find((r) => r.season_id === model.selected);
export function recordOf(s: D.CircuitSeason, revision = 0): CircuitRecord {
  s = clone(s);
  D.enablePromotion(s);
  D.upgradePhaseTwo(s);
  if (s.stage < 5) s.integerPoints = true;
  return {
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    created_at: s.createdAt,
    status: D.complete(s) ? "completed" : "active",
    played: D.played(s),
    podium: D.podium(s),
    revision,
    snapshot: clone(s),
  };
}
export function validRecord(input: unknown): input is CircuitRecord {
  const r = input as CircuitRecord;
  return (
    !!r &&
    /^[-\w]{1,100}$/.test(r.season_id) &&
    Number.isSafeInteger(r.season_number) &&
    r.season_number > 0 &&
    Number.isFinite(Date.parse(r.created_at)) &&
    ["active", "completed"].includes(r.status) &&
    Number.isSafeInteger(r.played) &&
    r.played >= 0 &&
    r.played <= D.totalMatches &&
    Number.isSafeInteger(r.revision) &&
    r.revision >= 0 &&
    Array.isArray(r.podium) &&
    r.podium.every((id) => !!get(id)) &&
    new Set(r.podium).size === r.podium.length &&
    (r.status === "completed"
      ? r.podium.length === 3
      : [0, 3].includes(r.podium.length)) &&
    (!r.snapshot ||
      (D.validCircuit(r.snapshot) &&
        r.snapshot.seasonId === r.season_id &&
        r.snapshot.seasonNumber === r.season_number &&
        r.snapshot.createdAt === r.created_at &&
        JSON.stringify(D.podium(r.snapshot)) === JSON.stringify(r.podium) &&
        D.played(r.snapshot) === r.played &&
        D.complete(r.snapshot) === (r.status === "completed")))
  );
}
export function readScope(key: string): CircuitRecord[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter(validRecord).map((row) => {
      if (
        row.snapshot &&
        row.snapshot.stage < 5 &&
        !row.snapshot.integerPoints
      ) {
        row.snapshot.integerPoints = true;
        row.dirty = true;
      }
      if (
        row.snapshot &&
        row.snapshot.stage < 7 &&
        !row.snapshot.promotionEnabled
      ) {
        D.enablePromotion(row.snapshot);
        row.dirty = true;
      }
      if (row.snapshot && !row.snapshot.phaseTwoDouble) {
        D.upgradePhaseTwo(row.snapshot);
        if (row.snapshot.phaseTwoDouble) row.dirty = true;
      }
      return row;
    });
  } catch {
    return [];
  }
}
export function persist() {
  try {
    localStorage.setItem(model.scope, JSON.stringify(model.records));
    return true;
  } catch {
    return false;
  }
}
export function backup(s: D.CircuitSeason) {
  try {
    localStorage.setItem(model.scope + "-backup", JSON.stringify(s));
  } catch {
    /* Current save remains intact. */
  }
}
/** Release reset only touches old game caches, never browser authentication. */
export function purgeLegacyData() {
  for (const key of Object.keys(localStorage))
    if (
      key.startsWith("volleyworld") &&
      !key.startsWith(prefix) &&
      !key.startsWith("volleyworld-reset-")
    )
      localStorage.removeItem(key);
}
