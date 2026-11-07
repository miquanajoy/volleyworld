import type { Match } from "../types";
import { loser, winner } from "../match/scoring";

type Source = string | { id: string; loss?: true } | null;
type Pair = [Source, Source];
export interface RegionalDouble {
  rounds: Match[][];
}
export function regionalDoublePlan(seeds: string[], prefix: string) {
  const size = 2 ** Math.ceil(Math.log2(seeds.length));
  let order = [1, 2];
  for (let n = 4; n <= size; n *= 2)
    order = order.flatMap((i) => [i, n + 1 - i]);
  const stages: {
    id: string;
    kind: "upper" | "lower" | "grand";
    pairs: Pair[];
  }[] = [];
  const add = (
    key: string,
    kind: "upper" | "lower" | "grand",
    pairs: Pair[],
  ) => {
    const id = prefix + key;
    stages.push({ id, kind, pairs });
    return pairs.map((_, i) => ({ id: id + "-" + i }));
  };
  const pair = (ids: Source[]): Pair[] =>
    Array.from({ length: ids.length / 2 }, (_, i) => [
      ids[i * 2],
      ids[i * 2 + 1],
    ]);
  const losses = (ids: { id: string }[]) =>
    ids.map(({ id }) => ({ id, loss: true as const }));
  let upper = add("U1", "upper", pair(order.map((i) => seeds[i - 1] || null)));
  let lower =
    upper.length > 1 ? add("L1", "lower", pair(losses(upper))) : losses(upper);
  let l = 2;
  for (let u = 2; upper.length > 1; u++) {
    upper = add("U" + u, "upper", pair(upper));
    const drop = losses(upper);
    lower = add(
      "L" + l++,
      "lower",
      lower.map((id, i) => [id, drop[drop.length > 1 ? i ^ 1 : i]]),
    );
    if (lower.length > 1) lower = add("L" + l++, "lower", pair(lower));
  }
  add("F", "grand", [[upper[0], lower[0]]]);
  add("R", "grand", [[upper[0], lower[0]]]);
  return stages;
}
export function regionalDoubleRound(
  seeds: string[],
  prefix: string,
  b: RegionalDouble,
  index: number,
) {
  const plan = regionalDoublePlan(seeds, prefix);
  const resolved = new Map<string, [string | null, string | null]>();
  for (let r = 0; r <= index; r++) {
    const node = plan[r];
    if (!node) return [];
    if (r === plan.length - 1) {
      const final = b.rounds[r - 1]?.[0];
      if (!final?.sets || winner(final) === final.a) return [];
    }
    const matches: Match[] = [];
    const source = (s: Source) =>
      typeof s === "object" && s !== null
        ? resolved.get(s.id)?.[s.loss ? 1 : 0] || null
        : s;
    for (const [i, [left, right]] of node.pairs.entries()) {
      const id = node.id + "-" + i;
      const a = source(left),
        c = source(right);
      if (a && c) {
        matches.push({ id, a, b: c, sets: null });
        const actual = b.rounds[r]?.find((m) => m.id === id);
        if (actual?.sets) resolved.set(id, [winner(actual), loser(actual)]);
      } else resolved.set(id, [a || c, null]);
    }
    if (r === index) return matches;
  }
  return [];
}

/** Read-only participant projection. Undefined is an unresolved result; null is a bye. */
export function regionalDoublePreview(
  seeds: string[],
  prefix: string,
  bracket: RegionalDouble,
) {
  type Side = string | null | undefined;
  const outcomes = new Map<string, [Side, Side]>();
  const slots = new Map<string, [Side, Side]>();
  const plan = regionalDoublePlan(seeds, prefix);
  const source = (s: Source): Side =>
    typeof s === "object" && s !== null
      ? outcomes.get(s.id)?.[s.loss ? 1 : 0]
      : s;
  for (const [round, stage] of plan.entries()) {
    for (const [index, pair] of stage.pairs.entries()) {
      const id = `${stage.id}-${index}`;
      const sides: [Side, Side] = [source(pair[0]), source(pair[1])];
      if (round === plan.length - 1) {
        const final = bracket.rounds[round - 1]?.[0];
        if (!final?.sets || winner(final) === final.a) {
          slots.set(id, sides);
          continue;
        }
      }
      slots.set(id, sides);
      const match = bracket.rounds[round]?.find((m) => m.id === id);
      if (match?.sets) outcomes.set(id, [winner(match), loser(match)]);
      else if (sides[0] === null && sides[1] !== undefined)
        outcomes.set(id, [sides[1], null]);
      else if (sides[1] === null && sides[0] !== undefined)
        outcomes.set(id, [sides[0], null]);
    }
  }
  return slots;
}
