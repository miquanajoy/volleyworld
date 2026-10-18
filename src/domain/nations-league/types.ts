import type { Match, TeamId } from "../types";
import type { FullLeague } from "../full-season/types";
export const tiers = ["A", "B", "C", "D"] as const;
export type Tier = (typeof tiers)[number];
export const nationsStages = ["qf", "sf", "final", "bronze"] as const;
export const nationsPlayOrder = ["qf", "sf", "bronze", "final"] as const;
export type NationsStage = (typeof nationsStages)[number];
export interface NationsDivision {
  teamIds: TeamId[];
  pots: TeamId[][];
  groups: FullLeague[];
}
export type NationsBracket = Record<NationsStage, Match[]>;
export interface NationsSeason {
  version: 1;
  mode: "nations-league";
  seasonId: string;
  seasonNumber: number;
  createdAt: string;
  campaignId: string;
  cycleNumber: number;
  previousSeasonId: string | null;
  roster: TeamId[];
  divisions: Record<Tier, NationsDivision>;
  playoff: NationsBracket | null;
}
