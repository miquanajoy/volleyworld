import { get } from "../../data/teams";
import * as N from "../../domain/nations-league/index";
import type { ArchiveRecord } from "../shared/season-cloud";
export interface NationsRecord extends ArchiveRecord<N.NationsSeason> {
  campaign_id: string;
  cycle_number: number;
  previous_id: string | null;
}
export const nationsModel = {
  scope: "volleyworld-nations-guest",
  records: [] as NationsRecord[],
  loadedScope: "",
  token: 0,
  selected: null as string | null,
  section: "overview",
  round: 0,
  loading: false,
  error: "",
  honourTeam: "POL",
};
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
export function recordOf(s: N.NationsSeason, revision = 0): NationsRecord {
  return {
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    created_at: s.createdAt,
    campaign_id: s.campaignId,
    cycle_number: s.cycleNumber,
    previous_id: s.previousSeasonId,
    status: N.nationsComplete(s) ? "completed" : "active",
    played: N.nationsMatches(s).filter((m) => m.sets).length,
    podium: N.nationsPodium(s),
    revision,
    snapshot: clone(s),
  };
}
export function validRecord(value: unknown): value is NationsRecord {
  try {
    const r = value as NationsRecord;
    return (
      !!r &&
      typeof r.season_id === "string" &&
      typeof r.campaign_id === "string" &&
      /^[a-zA-Z0-9-]{1,100}$/.test(r.season_id) &&
      /^[a-zA-Z0-9-]{1,100}$/.test(r.campaign_id) &&
      Number.isSafeInteger(r.season_number) &&
      r.season_number > 0 &&
      Number.isSafeInteger(r.cycle_number) &&
      r.cycle_number > 0 &&
      (r.cycle_number === 1
        ? r.previous_id === null
        : typeof r.previous_id === "string" &&
          /^[a-zA-Z0-9-]{1,100}$/.test(r.previous_id)) &&
      Number.isFinite(Date.parse(r.created_at)) &&
      ["active", "completed"].includes(r.status) &&
      Number.isSafeInteger(r.played) &&
      r.played >= 0 &&
      r.played <= 200 &&
      Number.isSafeInteger(r.revision) &&
      r.revision >= 0 &&
      Array.isArray(r.podium) &&
      [0, 3].includes(r.podium.length) &&
      r.podium.every((id) => !!get(id)) &&
      (r.dirty === undefined || typeof r.dirty === "boolean") &&
      (!r.snapshot ||
        (N.validNationsSeason(r.snapshot) &&
          r.snapshot.seasonId === r.season_id &&
          r.snapshot.seasonNumber === r.season_number &&
          r.snapshot.campaignId === r.campaign_id &&
          r.snapshot.cycleNumber === r.cycle_number &&
          r.snapshot.previousSeasonId === r.previous_id &&
          N.nationsMatches(r.snapshot).filter((m) => m.sets).length ===
            r.played &&
          (N.nationsComplete(r.snapshot) ? "completed" : "active") ===
            r.status))
    );
  } catch {
    return false;
  }
}
export function readScope(key: string): NationsRecord[] {
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
      nationsModel.records
        .filter((r) => r.snapshot && !r.dirty)
        .slice(-5)
        .map((r) => r.season_id),
    );
    localStorage.setItem(
      nationsModel.scope,
      JSON.stringify(
        nationsModel.records.map((r) => ({
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
export const selected = () =>
  nationsModel.records.find((r) => r.season_id === nationsModel.selected);
export function backup(s: N.NationsSeason) {
  try {
    const key = nationsModel.scope + "-backups",
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
    /* Current progress stays intact if a backup cannot fit. */
  }
}
export function campaignName(id: string) {
  const ids = [
    ...new Set(
      [...nationsModel.records]
        .sort((a, b) => a.season_number - b.season_number)
        .map((r) => r.campaign_id),
    ),
  ];
  return `Chuỗi ${ids.indexOf(id) + 1}`;
}
