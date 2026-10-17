import type { StageDefinition, Tournament } from "../types";
import { expandedSingle } from "./entry";
import { doubleStages } from "./double/rules";
import { pairRound } from "./shared-rules";
import { singleStages } from "./single/rules";
export { source } from "./shared-rules";
export const isDouble = (
  s: Pick<Tournament, "playoffFormat" | "playoffEntry">,
): boolean => s.playoffFormat === "double";
export const formatName = (
  s: Pick<Tournament, "playoffFormat" | "playoffEntry">,
): string => (isDouble(s) ? "Nhánh thắng – nhánh thua" : "Loại trực tiếp");
export function playoffStages(
  s: Pick<Tournament, "playoffFormat" | "playoffEntry">,
): StageDefinition[] {
  const upper: StageDefinition[] = [
    { key: "r16", label: "Vòng 16 đội", count: 8, prefix: "R", kind: "upper" },
    pairRound("qf", "Tứ kết", "r16", 4, "Q"),
    pairRound("sf", "Bán kết", "qf", 2, "S"),
    pairRound(
      "final",
      isDouble(s) ? "Chung kết nhánh thắng" : "Chung kết",
      "sf",
      1,
      "F",
    ),
  ];
  return isDouble(s)
    ? doubleStages(upper)
    : [
        ...(expandedSingle(s)
          ? [
              {
                key: "r20" as const,
                label: "Vòng 20 đội",
                count: 4,
                prefix: "D",
                kind: "upper" as const,
              },
            ]
          : []),
        ...singleStages(upper),
      ];
}

/** Competition order differs from the stable bracket/schema order. */
export function playoffOrder(
  s: Pick<Tournament, "playoffFormat" | "playoffEntry">,
): StageDefinition[] {
  const stages = playoffStages(s);
  return isDouble(s)
    ? stages
    : [
        ...stages.filter((d) => !["final", "bronze"].includes(d.key)),
        stages.find((d) => d.key === "bronze")!,
        stages.find((d) => d.key === "final")!,
      ];
}
