import type { TeamId } from "../../types";
export interface QualificationRow {
  id: TeamId;
  w: number;
  sf: number;
  sa: number;
  pf: number;
  pa: number;
}
export interface RemainingMatch {
  a: TeamId;
  b: TeamId;
}
export type WinEdge = [number, number];
export type Totals = [number, number, number];
export interface FlowEdge {
  to: number;
  c: number;
  rev: number;
}
export type SearchResult = boolean | null;
export interface Certificate {
  clinched: boolean;
  excluded: boolean;
  limited: boolean;
}
export type Certificates = Record<TeamId, Record<number, Certificate>>;
export interface QualificationState {
  direct: boolean;
  advance: boolean;
  noDirect: boolean;
  out: boolean;
  limited: boolean;
  playin?: boolean;
  bye?: boolean;
}
export interface Checkpoint {
  teams: Record<TeamId, QualificationState>;
  rounds: number[];
  lastRound: number | undefined;
  final: boolean;
}
export type QualificationEvents = Record<
  "direct" | "advance" | "playin" | "noDirect" | "out",
  TeamId[]
> & { bye?: TeamId[] };
export interface QualificationReport extends Checkpoint {
  events: QualificationEvents;
}
