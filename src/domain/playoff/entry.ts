import type { Tournament } from "../types";
/** Missing marker deliberately keeps existing seasons on their original rules. */
export const expandedSingle = (
  s: Pick<Tournament, "playoffFormat" | "playoffEntry">,
) => s.playoffFormat !== "double" && s.playoffEntry === "top16";
export function entrySlots(
  s: Pick<Tournament, "playoffFormat" | "playoffEntry">,
) {
  return expandedSingle(s)
    ? { direct: 16, advance: 24 }
    : { direct: 12, advance: 20 };
}
