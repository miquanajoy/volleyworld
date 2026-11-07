import type { Match, Region } from "../types";
export interface CareerPlayin {
  league16: string[];
  challenger: string[];
  draw: number[];
  preliminary: Match[];
  final: Match[];
  double?: import("./world-playin-double").WorldPlayinDouble;
}
export interface CareerQualification {
  leagueRoster: string[];
  slots: Record<Region, number>;
  playin: CareerPlayin | null;
  regionalTour?: CareerRegionalTour;
}
export interface CareerChain {
  chainId: string;
  previousSeasonId: string | null;
}

/** New regional format; legacy career saves omit this block. */
export interface CareerRegionalTour {
  brackets: Partial<Record<Region, import("./regional-double").RegionalDouble>>;
}
