import type { SeasonRecord, SeasonTournament } from "../domain/types";
export interface CloudConfiguration {
  supabaseUrl?: string;
  supabaseKey?: string;
}
export interface WriteAcknowledgement {
  revision: number;
  updated_at: string;
}
export interface CloudSaveRow extends WriteAcknowledgement {
  state: SeasonTournament;
}
export interface StoredBackup {
  time: string;
  account: string | null;
  state: SeasonTournament;
  history?: SeasonRecord[];
}
export type WriterPhase = "pending" | "saving" | "saved" | "conflict" | "error";
export type CloudPhase = WriterPhase | "loading" | "local" | "choose";
export interface ManualSaveResult {
  local?: boolean;
  online?: boolean;
  status: string;
}
