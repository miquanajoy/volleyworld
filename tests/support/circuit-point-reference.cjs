// Frozen per-team calculation from the pre-optimization engine.
const D = require("../../.test-build/circuit-engine.js"),
  C = require("../../.test-build/challenger-engine.js"),
  F = require("../../.test-build/full-engine.js");
const { winner } = require("../../.test-build/engine.js");
const {
  phaseMatches,
  leagueRanks,
  bracketRanks,
  bracketMatches,
  upperBonus,
  lowerBonus,
  internationalBonus,
  placementPoints,
  leagueMultiplier,
  challengerMultiplier,
} = D;
function referencePoints(s, r, upper, includeWorld = false) {
  const zone = s.regions[r],
    wins = (ms, id) => ms.filter((m) => m.sets && winner(m) === id).length;
  return (upper ? zone.upper : zone.lower)
    .map((id) => {
      const phase = Array.from({ length: 3 }, (_, i) => {
        const p = zone.phases[i]?.[upper ? "upper" : "lower"];
        if (!p) return 0;
        const rank = leagueRanks(p).find((t) => t.id === id)?.from;
        return (
          5 * wins(phaseMatches(p), id) +
          (rank
            ? placementPoints(
                s,
                upper ? upperBonus(rank) : lowerBonus(rank),
                leagueMultiplier(s, i),
              )
            : 0)
        );
      });
      const first = s.firstStand,
        fr = first
          ? bracketRanks(first).find((t) => t.id === id)?.from
          : void 0;
      const firstPoints =
        upper && first
          ? 10 * wins(bracketMatches(first), id) +
            (fr ? internationalBonus(fr) : 0)
          : 0;
      const challenger = s.challenger,
        cr = challenger
          ? C.challengerPlacements(challenger).find((t) => t.id === id)?.from
          : void 0;
      const challengerPoints =
        upper && challenger
          ? 10 * wins(C.challengerMatches(challenger), id) +
            (cr
              ? placementPoints(
                  s,
                  internationalBonus(cr),
                  challengerMultiplier(s),
                )
              : 0)
          : 0;
      const w = s.world,
        wm = w
          ? [
              ...w.groups.flatMap((g) => g.rounds.flat()),
              ...F.worldStages.flatMap((k) => w.bracket?.[k] || []),
            ]
          : [];
      const finalReady =
        !!w?.bracket?.final[0]?.sets && !!w.bracket.bronze[0]?.sets;
      const worldRank = finalReady
        ? F.worldPlacements({ world: w })[id]?.from
        : void 0;
      const worldPoints = includeWorld
        ? 10 * wins(wm, id) +
          (worldRank ? placementPoints(s, internationalBonus(worldRank), 3) : 0)
        : 0;
      return {
        id,
        phase,
        world: worldPoints,
        first: firstPoints,
        challenger: challengerPoints,
        total:
          phase.reduce((a, b) => a + b, 0) +
          firstPoints +
          challengerPoints +
          worldPoints,
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        zone[upper ? "upper" : "lower"].indexOf(a.id) -
          zone[upper ? "upper" : "lower"].indexOf(b.id),
    );
}

module.exports = referencePoints;
