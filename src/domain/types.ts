/** Version 1 is deliberately preserved: existing local/cloud saves remain readable. */
export type TeamId = string;
export type Region = "CEV" | "NORCECA" | "AVC" | "CSV" | "CAVB";
export type PlayoffFormat = "single" | "double";
export type Seed = 1 | 2 | 3 | 4;
export type SetScore = [number, number];
export interface Team {
  id: TeamId;
  name: string;
  flag: string;
  region: Region;
  rank: number;
  rating: number;
}
export type TeamInput = [TeamId, string, string, Region, number, number];
export interface QuotaLimit {
  min: number;
  max: number;
}
export type RegionQuotas = Record<Region, number>;
export interface Match {
  id: string;
  a: TeamId;
  b: TeamId;
  sets: SetScore[] | null;
  resultOrder?: number;
}
export type StageKey =
  | "r16"
  | "qf"
  | "sf"
  | "final"
  | "bronze"
  | "lower1"
  | "lower2"
  | "lower3"
  | "lower4"
  | "lower5"
  | "lower6"
  | "gf"
  | "reset";
export type StageOutcome = "w" | "l" | "a" | "b";
export type StageSource = [StageOutcome, StageKey, number];
export interface StageDefinition {
  key: StageKey;
  label: string;
  count: number;
  prefix: string;
  kind: "upper" | "lower" | "grand" | "medal";
  pairs?: [StageSource, StageSource][];
  offset?: number;
  reset?: boolean;
}
export interface Bracket {
  seeds: Record<TeamId, Seed>;
  r16: Match[];
  qf: Match[];
  sf: Match[];
  final: Match[];
  bronze: Match[];
  lower1?: Match[];
  lower2?: Match[];
  lower3?: Match[];
  lower4?: Match[];
  lower5?: Match[];
  lower6?: Match[];
  gf?: Match[];
  reset?: Match[];
}
export interface Tournament {
  setupConfirmed?: boolean;
  version: 1;
  playoffFormat?: PlayoffFormat;
  teamIds?: TeamId[];
  rounds: Match[][];
  tie: TeamId[];
  playin: Match[] | null;
  bracket: Bracket | null;
  seasonId?: string;
  seasonNumber?: number;
  seasonCreatedAt?: string;
}
export interface SeasonMetadata {
  seasonId: string;
  seasonNumber: number;
  seasonCreatedAt: string;
}
export type SeasonTournament = Tournament & SeasonMetadata;
export interface Standing extends Team {
  w: number;
  l: number;
  sf: number;
  sa: number;
  pf: number;
  pa: number;
}
export interface FormResult {
  win: boolean;
  opponent: TeamId;
  score: SetScore;
  matchId: string;
}
export interface ScoreInspection {
  errors: string[];
  focusSides: number[];
  sets: SetScore[];
  score: SetScore;
  hasPair: boolean;
  valid: boolean;
}
export type ScoreInput = string | number | null | undefined;
export interface SeasonRecord {
  season_id: string;
  season_number: number;
  status: "completed" | "cancelled";
  created_at: string;
  ended_at: string;
  podium: TeamId[];
  played: number;
  snapshot?: SeasonTournament;
  synced?: boolean;
}
export interface SeasonTile extends Omit<SeasonRecord, "status" | "ended_at"> {
  status: SeasonRecord["status"] | "active" | "ready";
  ended_at?: string;
  current?: boolean;
}
export type SeasonView = SeasonTile & { snapshot: SeasonTournament };
export interface SaveBundle {
  format: "volleyworld-seasons";
  version: 1;
  active: SeasonTournament;
  history: SeasonRecord[];
}
