import type { Placement } from "../tournament/placement";
/** A game policy, not an official federation ranking. All seasons have equal weight. */
export const HONOURS_POLICY = "honours-v1";
export const MAX_SCORING_RANK = 20;
export const CHAMPION_POINTS = 1000;
function weight(rank: number): number {
  const floor = 1 / Math.sqrt(MAX_SCORING_RANK + 1);
  return (CHAMPION_POINTS * (1 / Math.sqrt(rank) - floor)) / (1 - floor);
}
/** Average all tied positions BEFORE rounding, so no arbitrary order is invented. */
export function placementPoints(placement: Placement): number {
  const { from, to } = placement;
  if (
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    from < 1 ||
    to < from ||
    to > MAX_SCORING_RANK
  )
    return 0;
  let total = 0;
  for (let rank = from; rank <= to; rank++) total += weight(rank);
  return Math.round(total / (to - from + 1) / 10) * 10;
}
export const POINT_GROUPS: readonly Placement[] = [
  { from: 1, to: 1 },
  { from: 2, to: 2 },
  { from: 3, to: 3 },
  { from: 4, to: 4 },
  { from: 5, to: 8 },
  { from: 9, to: 16 },
  { from: 17, to: 20 },
  { from: 5, to: 6 },
  { from: 7, to: 8 },
  { from: 9, to: 12 },
  { from: 13, to: 16 },
];
