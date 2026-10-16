import { get } from "../../data/teams";
import type { Match, SetScore } from "../types";

export type RandomSource = () => number;
/** Bounded set odds retain an upset path even for the largest rating gap. */
export function setWinProbability(ratingA: number, ratingB: number): number {
  return 0.5 + 0.35 * Math.tanh((ratingA - ratingB) / 180);
}
export function matchWinProbability(p: number): number {
  return p ** 3 * (1 + 3 * (1 - p) + 6 * (1 - p) ** 2);
}
/** Outcome and margin are sampled separately so close teams rarely lose by 10+. */
export function simulateSet(
  m: Pick<Match, "a" | "b">,
  index: number,
  forcedWinner?: 0 | 1,
  random: RandomSource = Math.random,
): SetScore {
  if (!Number.isInteger(index) || index < 0 || index > 4)
    throw Error("Chỉ có Set 1–5.");
  if (forcedWinner !== undefined && forcedWinner !== 0 && forcedWinner !== 1)
    throw Error("Đội thắng set không hợp lệ.");
  const delta = get(m.a).rating - get(m.b).rating,
    side =
      forcedWinner ??
      (random() < setWinProbability(get(m.a).rating, get(m.b).rating) ? 0 : 1),
    target = index === 4 ? 15 : 25,
    // An underdog's winning set is usually competitive rather than a rout.
    dominance =
      Math.abs(Math.tanh(delta / 180)) *
      Math.tanh(Math.abs(get(m.a).rank - get(m.b).rank) / 12) *
      ((side === 0 ? delta : -delta) >= 0 ? 1 : 0.3),
    low = 0.01 + 0.14 * dominance,
    middle = 0.07 + 0.2 * dominance,
    deuce = 0.14 - 0.08 * dominance,
    bucket = random();
  let winner = target,
    loser: number;
  if (bucket < low) {
    const maximum = target === 25 ? 15 : 8;
    loser = Math.min(maximum, Math.floor((maximum + 1) * random() ** 0.25));
  } else if (bucket < low + middle) {
    const start = target === 25 ? 16 : 9,
      count = target === 25 ? 3 : 2;
    loser = start + Math.floor(random() * count);
  } else if (bucket >= 1 - deuce) {
    // Geometric tail, no rejection loop; every extended set ends by exactly two.
    const extra = Math.floor(
      Math.log(1 - Math.min(random(), 1 - Number.EPSILON)) / Math.log(0.45),
    );
    loser = target - 1 + extra;
    winner = loser + 2;
  } else {
    const start = target === 25 ? 19 : 11,
      count = target === 25 ? 5 : 3;
    loser =
      start + Math.min(count - 1, Math.floor(count * Math.sqrt(random())));
  }
  return side === 0 ? [winner, loser] : [loser, winner];
}
export function simulateWithRandom(m: Match, random: RandomSource) {
  let aw = 0,
    bw = 0;
  const sets: SetScore[] = [];
  while (aw < 3 && bw < 3) {
    const set = simulateSet(m, sets.length, undefined, random);
    sets.push(set);
    set[0] > set[1] ? aw++ : bw++;
  }
  m.sets = sets;
  return m;
}
/** Creates a preview; never mutates the supplied match. */
export function simulateChosenResult(
  m: Pick<Match, "a" | "b">,
  winner: 0 | 1,
  losses: 0 | 1 | 2,
  random: RandomSource = Math.random,
): SetScore[] {
  if (![0, 1].includes(winner) || ![0, 1, 2].includes(losses))
    throw Error("Kết quả phải là 3–0, 3–1 hoặc 3–2.");
  const prefix: (0 | 1)[] = [
    winner,
    winner,
    ...Array<0 | 1>(losses).fill(winner === 0 ? 1 : 0),
  ];
  for (let i = prefix.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [prefix[i], prefix[j]] = [prefix[j], prefix[i]];
  }
  return [...prefix, winner].map((side, i) => simulateSet(m, i, side, random));
}

export function simulate(m: Match) {
  return simulateWithRandom(m, Math.random);
}
