import { get } from "../../data/teams";
import type { Match, SetScore } from "../types";

export function simulate(m: Match) {
  let aw = 0,
    bw = 0,
    sets: SetScore[] = [];
  const p =
    0.5 +
    0.15 * Math.tanh((get(m.a).rating - get(m.b).rating) / 180) +
    (Math.random() - 0.5) * 0.04;
  while (aw < 3 && bw < 3) {
    let a = 0,
      b = 0,
      target = sets.length === 4 ? 15 : 25;
    while (Math.max(a, b) < target || Math.abs(a - b) < 2) {
      Math.random() < p ? a++ : b++;
    }
    sets.push([a, b]);
    a > b ? aw++ : bw++;
  }
  m.sets = sets;
  return m;
}
