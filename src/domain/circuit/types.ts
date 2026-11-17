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
export interface CircuitZone {
  upper: string[];
  lower: string[];
  phases: { upper: RegionalPhase; lower: RegionalPhase }[];
  playin: { groups: CircuitBracket[]; bracket: CircuitBracket | null } | null;
}
export interface CircuitSeason {
  version: 2;
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
  ["Phase 1 · League khu vực", "Mâm 1 nhánh thắng–thua · mâm 2 vòng bảng"],
  ["First Stand", "8 đội · nhánh thắng–thua"],
  ["Phase 2 · League khu vực", "Chia bảng · playoff loại trực tiếp"],
  ["Challenger", "16 đội · Swiss · playoff 8 đội"],
  ["Phase 3 · League khu vực", "Chia lại bảng · playoff nhánh thắng–thua"],
  ["Phase 4 · World Cup Play-in", "16 đội mỗi khu vực · 4 vé"],
  ["World Cup", "32 đội · 8 bảng · playoff 16 đội"],
] as const;
export const phaseIndex = (stage: number) =>
  stage === 0 ? 0 : stage === 2 ? 1 : 2;
