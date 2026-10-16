import type { StageDefinition } from "../../types";
import { pairRound } from "../shared-rules";
export function singleStages(upper: StageDefinition[]): StageDefinition[] {
  return [
    ...upper,
    pairRound("bronze", "Tranh hạng ba", "sf", 1, "B", "l", "medal"),
  ];
}
