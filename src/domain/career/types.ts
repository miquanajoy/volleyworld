import type { Match, Region } from "../types";
export interface CareerPlayin {
  league16: string[];
  challenger: string[];
  draw: number[];
  preliminary: Match[];
  final: Match[];
}
export interface CareerQualification {
  leagueRoster: string[];
  slots: Record<Region, number>;
  playin: CareerPlayin | null;
}
export interface CareerChain {
  chainId: string;
  previousSeasonId: string | null;
}
