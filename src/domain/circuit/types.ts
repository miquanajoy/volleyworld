import type { Match } from "../types";
import type { FullLeague, WorldCup } from "../full-season/types";
import type { ChallengerSeason } from "../challenger/types";
export const regions = ["CEV", "AVC", "NORCECA", "CAVB"] as const;
export type CircuitRegion = (typeof regions)[number];
export const regionNames: Record<CircuitRegion, string> = {
  CEV: "Châu Âu",
  AVC: "Châu Á & Đại Dương",
  NORCECA: "Châu Mỹ",
  CAVB: "Châu Phi",
};
export type BracketKind = "double" | "top2" | "top4" | "single" | "gsl";
export interface CircuitBracket {
  kind: BracketKind;
  prefix: string;
  seeds: string[];
  opening?: string[];
  rounds: Match[][];
  bronze: Match | null;
  bronzeRequired: boolean;
}
export interface RegionalPhase {
  seeds: string[];
  groups: FullLeague[];
  bracket: CircuitBracket | null;
}
export interface PromotionRound {
  seeds: string[];
  tie: string[];
  pots: string[][];
  groups: CircuitBracket[];
}
export interface CircuitZone {
  promotion?: PromotionRound;
  upper: string[];
  lower: string[];
  phases: { upper: RegionalPhase; lower: RegionalPhase }[];
  playin: { groups: CircuitBracket[]; bracket: CircuitBracket | null } | null;
}
export interface CircuitSeason {
  version: 2;
  integerPoints?: true;
  promotionEnabled?: true;
  phaseTwoDouble?: true;
  mode: "circuit";
  seasonId: string;
  seasonNumber: number;
  createdAt: string;
  chainId: string;
  previousSeasonId: string | null;
  stage: number;
  regions: Record<CircuitRegion, CircuitZone>;
  firstStand: CircuitBracket | null;
  challenger: ChallengerSeason | null;
  world: WorldCup | null;
}
export const calendar = [
  ["Phase 1 · League khu vực", "Hạng 1 nhánh thắng–thua · hạng 2 vòng bảng"],
  ["First Stand", "8 đội · nhánh thắng–thua"],
  [
    "Phase 2 · League khu vực",
    "Hạng 1 nhánh thắng–thua · Hạng 2 loại trực tiếp",
  ],
  ["Challenger", "16 đội · Swiss · playoff 8 đội"],
  ["Phase 3 · League khu vực", "Chia lại bảng · playoff nhánh thắng–thua"],
  ["Phase 4 · World Cup Play-in", "16 đội mỗi khu vực · 4 vé"],
  ["Phase 5 · World Cup", "32 đội · 8 bảng · playoff 16 đội"],
  [
    "Phase 6 · Tranh suất Hạng 1",
    "16 đội mỗi khu vực · 4 bảng sinh tử · 8 suất",
  ],
] as const;
export const phaseIndex = (stage: number) =>
  stage === 0 ? 0 : stage === 2 ? 1 : 2;
