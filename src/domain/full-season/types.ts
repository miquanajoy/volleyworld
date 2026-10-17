import type { Match, Region, TeamId } from "../types";
export const regionOrder: Region[] = ["CEV", "AVC", "NORCECA", "CAVB", "CSV"];
export const worldSlots: Record<Region, number> = {
  CEV: 9,
  AVC: 5,
  NORCECA: 4,
  CAVB: 3,
  CSV: 3,
};
export interface FullLeague {
  teamIds: TeamId[];
  rounds: Match[][];
  tie: TeamId[];
}
export const worldStages = ["r16", "qf", "sf", "final", "bronze"] as const;
export const worldPlayOrder = ["r16", "qf", "sf", "bronze", "final"] as const;
export type WorldStage = (typeof worldStages)[number];
export interface WorldCup {
  pots: TeamId[][];
  groups: FullLeague[];
  tie: TeamId[];
  bracket: Record<WorldStage, Match[]> | null;
}
export interface FullSeason {
  version: 1;
  mode: "full-season";
  seasonId: string;
  seasonNumber: number;
  createdAt: string;
  regions: Record<Region, FullLeague>;
  world: WorldCup | null;
}
