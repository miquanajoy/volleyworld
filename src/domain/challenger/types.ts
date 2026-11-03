import type { Match, TeamId } from "../types";
import type { WorldStage } from "../full-season/types";
export interface ChallengerSeason {
  career?: true;
  version: 1;
  mode: "challenger";
  seasonId: string;
  seasonNumber: number;
  createdAt: string;
  roster: TeamId[];
  tie: TeamId[];
  rounds: Match[][];
  bracket: Record<WorldStage, Match[]> | null;
}
export const roundSizes = [16, 16, 16, 12, 6];
