import { regions, type CircuitSeason, type CircuitRegion } from "./types";
import { plan, bracketRanks, bracketDone } from "./bracket";
import { winner } from "../match/scoring";
import { qualifiers } from "./points";
import { regionOf } from "./league";
export const internationalStage = (stage: number) => [1, 3, 6].includes(stage);
/** Only decisive played matches issue tickets; viewing never generates a draw. */
export function internationalTickets(
  s: CircuitSeason,
  stage: number,
  r: CircuitRegion,
): { id: string; route: string }[] {
  if (stage === 6)
    return qualifiers(s, r).map((id) => ({
      id,
      route: "Đã giành vé World Cup",
    }));
  if (stage === 1) {
    if (s.firstStand)
      return s.firstStand.seeds
        .filter((id) => regionOf(id) === r)
        .map((id) => ({ id, route: "Top 2 League Phase 1" }));
    const b = s.regions[r].phases[0].upper.bracket;
    if (!b) return [];
    if (bracketDone(b))
      return bracketRanks(b)
        .slice(0, 2)
        .map((t) => ({
          id: t.id,
          route: t.from === 1 ? "Thắng nhánh thắng" : "Thắng nhánh thua",
        }));
    const p = plan(b),
      kinds = p.map((p) => p.kind);
    return (["upper", "lower"] as const).flatMap((kind) => {
      const i = kinds.lastIndexOf(kind),
        m = b.rounds[i]?.[0];
      return m?.sets
        ? [
            {
              id: winner(m)!,
              route:
                kind === "upper" ? "Thắng nhánh thắng" : "Thắng nhánh thua",
            },
          ]
        : [];
    });
  }
  if (stage === 3) {
    if (s.challenger)
      return s.challenger.roster
        .filter((id) => regionOf(id) === r)
        .map((id) => ({ id, route: "Top 4 League Phase 2" }));
    const b = s.regions[r].phases[1]?.upper.bracket;
    if (b?.kind === "double") {
      if (bracketDone(b))
        return bracketRanks(b)
          .slice(0, 4)
          .map((t) => ({ id: t.id, route: "Top 4 League Phase 2" }));
      return plan(b).flatMap((stage, i) =>
        [b.prefix + "U2", b.prefix + "L2"].includes(stage.id)
          ? (b.rounds[i] || [])
              .filter((m) => m.sets)
              .map((m) => ({
                id: winner(m)!,
                route:
                  stage.kind === "upper"
                    ? "Top 4 từ nhánh thắng Phase 2"
                    : "Top 4 từ nhánh thua Phase 2",
              }))
          : [],
      );
    }
    return (b?.rounds[0] || [])
      .filter((m) => m.sets)
      .map((m) => ({ id: winner(m)!, route: "Thắng tứ kết League Phase 2" }));
  }
  return [];
}
export function internationalCapacity(stage: number) {
  return stage === 1 ? 2 : stage === 3 ? 4 : 8;
}
export function internationalTicketCount(s: CircuitSeason, stage: number) {
  return regions.reduce(
    (n, r) => n + internationalTickets(s, stage, r).length,
    0,
  );
}
