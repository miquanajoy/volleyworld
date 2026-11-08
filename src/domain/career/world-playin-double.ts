import type { Match } from "../types";
import { winner, loser } from "../match/scoring";
import { regionalDoublePlan, regionalDoubleRound } from "./regional-double";

export interface WorldPlayinDouble {
  /** World ranking order: missing positions in the 32-slot draw are byes. */
  seeds: string[];
  rounds: Match[][];
}
export const worldPlayinExtra = (b: WorldPlayinDouble) => 32 - b.seeds.length;
export const worldPlayinTickets = (b: WorldPlayinDouble) => b.seeds.length - 16;
export const worldPlayinRoundCount = (b: WorldPlayinDouble) =>
  worldPlayinExtra(b) ? 5 : 4;
const rankedLowerWinners = (b: WorldPlayinDouble) => {
  const row = b.rounds[3];
  if (!row || row.length !== 8 || row.some((m) => !m.sets)) return null;
  return row
    .map((m) => winner(m)!)
    .sort((a, c) => b.seeds.indexOf(a) - b.seeds.indexOf(c));
};
/** U1 -> L1 -> U2 (8 tickets) -> L2 -> optional L3.
 * With 31/30 entrants, the top 6/4 L2 winners qualify by seed and the
 * remaining 2/4 play for 1/2 tickets. No twice-beaten team receives a ticket.
 */
export function worldPlayinRound(b: WorldPlayinDouble, index: number): Match[] {
  if (index < 4) return regionalDoubleRound(b.seeds, "WC", b, index);
  if (index !== 4 || !worldPlayinExtra(b)) return [];
  const winners = rankedLowerWinners(b);
  if (!winners) return [];
  const d = worldPlayinExtra(b),
    low = winners.slice(8 - 2 * d);
  return Array.from({ length: d }, (_, i) => ({
    id: `WCL3-${i}`,
    a: low[i],
    b: low[2 * d - 1 - i],
    sets: null,
  }));
}
export function worldPlayinStatus(b: WorldPlayinDouble) {
  const upper = (b.rounds[2] || [])
    .filter((m) => m.sets)
    .map((m) => winner(m)!);
  const d = worldPlayinExtra(b),
    lower = rankedLowerWinners(b);
  const lowerDirect = d
    ? lower?.slice(0, 8 - 2 * d) || []
    : (b.rounds[3] || []).filter((m) => m.sets).map((m) => winner(m)!);
  const lowerFinal = (b.rounds[4] || [])
    .filter((m) => m.sets)
    .map((m) => winner(m)!);
  const qualified = [...upper, ...lowerDirect, ...lowerFinal];
  const losses = new Map<string, number>();
  for (const m of b.rounds.flat())
    if (m.sets) {
      const id = loser(m)!;
      losses.set(id, (losses.get(id) || 0) + 1);
    }
  const eliminated = b.seeds.filter((id) => losses.get(id) === 2);
  return {
    upper,
    lower: [...lowerDirect, ...lowerFinal],
    qualified,
    eliminated,
    losses,
    done:
      qualified.length === worldPlayinTickets(b) && eliminated.length === 16,
  };
}
export function advanceWorldPlayin(b: WorldPlayinDouble) {
  while (
    !worldPlayinStatus(b).done &&
    b.rounds.length < worldPlayinRoundCount(b)
  ) {
    if (b.rounds.at(-1)?.some((m) => !m.sets)) return;
    b.rounds.push(worldPlayinRound(b, b.rounds.length));
  }
}
export function worldPlayinPlan(b: WorldPlayinDouble) {
  const stages = regionalDoublePlan(b.seeds, "WC").slice(0, 4);
  if (worldPlayinExtra(b))
    stages.push({
      id: "WCL3",
      kind: "lower",
      pairs: Array.from({ length: worldPlayinExtra(b) }, () => [null, null]),
    });
  return stages;
}
export function validWorldPlayinDouble(
  b: WorldPlayinDouble,
  seeds: string[],
  match: (m: Match, teams: string[], id: string) => boolean,
) {
  if (
    !b ||
    Object.keys(b).sort().join() !== "rounds,seeds" ||
    !Array.isArray(b.seeds) ||
    JSON.stringify(b.seeds) !== JSON.stringify(seeds) ||
    ![30, 31, 32].includes(seeds.length) ||
    !Array.isArray(b.rounds) ||
    !b.rounds.length ||
    b.rounds.length > worldPlayinRoundCount(b)
  )
    return false;
  const replay: WorldPlayinDouble = { seeds, rounds: [] };
  for (const [i, row] of b.rounds.entries()) {
    if (
      !Array.isArray(row) ||
      worldPlayinStatus(replay).done ||
      replay.rounds.at(-1)?.some((m) => !m.sets)
    )
      return false;
    const expected = worldPlayinRound(replay, i);
    if (
      row.length !== expected.length ||
      row.some(
        (m, j) =>
          !match(m, seeds, expected[j].id) ||
          m.a !== expected[j].a ||
          m.b !== expected[j].b,
      )
    )
      return false;
    replay.rounds.push(row);
  }
  return worldPlayinStatus(b).done || !!b.rounds.at(-1)?.some((m) => !m.sets);
}
