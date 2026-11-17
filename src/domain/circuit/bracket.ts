import { regionalDoublePlan } from "../career/regional-double";
import { winner, loser } from "../match/scoring";
import type { Match } from "../types";
import type { CircuitBracket, BracketKind } from "./types";
type Source = string | { id: string; loss?: true } | null;
export function plan(b: CircuitBracket) {
  if (b.kind === "gsl")
    return [
      {
        id: b.prefix + "O",
        kind: "upper" as const,
        pairs: [
          [b.seeds[0], b.seeds[3]],
          [b.seeds[1], b.seeds[2]],
        ] as [Source, Source][],
      },
      {
        id: b.prefix + "W",
        kind: "upper" as const,
        pairs: [[{ id: b.prefix + "O-0" }, { id: b.prefix + "O-1" }]] as [
          Source,
          Source,
        ][],
      },
      {
        id: b.prefix + "L",
        kind: "lower" as const,
        pairs: [
          [
            { id: b.prefix + "O-0", loss: true },
            { id: b.prefix + "O-1", loss: true },
          ],
        ] as [Source, Source][],
      },
      {
        id: b.prefix + "Q",
        kind: "lower" as const,
        pairs: [
          [{ id: b.prefix + "W-0", loss: true }, { id: b.prefix + "L-0" }],
        ] as [Source, Source][],
      },
    ];
  if (b.kind !== "single") {
    const stages = regionalDoublePlan(b.seeds, b.prefix);
    if (b.opening)
      stages[0].pairs = Array.from({ length: b.opening.length / 2 }, (_, i) => [
        b.opening![2 * i],
        b.opening![2 * i + 1],
      ]);
    return stages.filter(
      (s) =>
        !s.id.endsWith("R") &&
        (b.kind !== "top2" || s.kind !== "grand") &&
        (b.kind !== "top4" || /[UL][12]$/.test(s.id)),
    );
  }
  const rows: ReturnType<typeof regionalDoublePlan> = [];
  let sources: Source[] = [...b.seeds];
  let i = 0;
  while (sources.length > 1) {
    const id = b.prefix + "K" + i++;
    const pairs = Array.from(
      { length: sources.length / 2 },
      (_, j) => [sources[2 * j], sources[2 * j + 1]] as [Source, Source],
    );
    rows.push({ id, kind: "upper", pairs });
    sources = pairs.map((_, j) => ({ id: id + "-" + j }));
  }
  return rows;
}
export function projection(b: CircuitBracket) {
  const outcomes = new Map<string, [string | undefined, string | undefined]>(),
    slots = new Map<string, [string | undefined, string | undefined]>();
  const source = (s: Source) =>
    typeof s === "string"
      ? s
      : s
        ? outcomes.get(s.id)?.[s.loss ? 1 : 0]
        : undefined;
  plan(b).forEach((stage, r) =>
    stage.pairs.forEach((p, i) => {
      const id = stage.id + "-" + i,
        sides: [string | undefined, string | undefined] = [
          source(p[0]),
          source(p[1]),
        ];
      slots.set(id, sides);
      const m = b.rounds[r]?.find((m) => m.id === id);
      if (m?.sets) outcomes.set(id, [winner(m)!, loser(m)!]);
    }),
  );
  return slots;
}
export function bracket(
  kind: BracketKind,
  seeds: string[],
  prefix: string,
  bronzeRequired = false,
): CircuitBracket {
  const b: CircuitBracket = {
    kind,
    seeds: [...seeds],
    prefix,
    rounds: [],
    bronze: null,
    bronzeRequired,
  };
  advanceBracket(b);
  return b;
}
export function advanceBracket(b: CircuitBracket) {
  const stages = plan(b);
  for (let i = 0; i < stages.length; i++) {
    if (b.rounds[i]?.length) {
      if (b.rounds[i].some((m) => !m.sets)) break;
      continue;
    }
    if (i && !b.rounds[i - 1]?.every((m) => m.sets)) break;
    const slots = projection(b),
      row = stages[i].pairs.map((_, j) => {
        const id = stages[i].id + "-" + j,
          [a, c] = slots.get(id)!;
        return a && c ? ({ id, a, b: c, sets: null } as Match) : null;
      });
    if (row.some((m) => !m)) break;
    b.rounds.push(row as Match[]);
    break;
  }
  if (
    b.bronzeRequired &&
    !b.bronze &&
    b.rounds.at(-2)?.length === 2 &&
    b.rounds.at(-2)!.every((m) => m.sets) &&
    b.rounds.length === stages.length
  )
    b.bronze = {
      id: b.prefix + "B",
      a: loser(b.rounds.at(-2)![0])!,
      b: loser(b.rounds.at(-2)![1])!,
      sets: null,
    };
}
export const bracketDone = (b: CircuitBracket) =>
  b.rounds.length === plan(b).length &&
  b.rounds.every((r) => r.every((m) => m.sets)) &&
  (!b.bronzeRequired || !!b.bronze?.sets);
export const bracketMatches = (b: CircuitBracket | null) =>
  b ? [...b.rounds.flat(), ...(b.bronze ? [b.bronze] : [])] : [];
export function bracketBatch(b: CircuitBracket | null): Match[] {
  if (!b || bracketDone(b)) return [];
  const row = b.rounds.find((r) => r.some((m) => !m.sets)) || [];
  if (
    b.bronzeRequired &&
    b.rounds.length === plan(b).length &&
    b.bronze &&
    !b.bronze.sets
  )
    return [b.bronze];
  return row;
}
export function survivors(b: CircuitBracket) {
  const lost = new Map(b.seeds.map((id) => [id, 0]));
  for (const m of b.rounds.flat())
    if (m.sets) lost.set(loser(m)!, lost.get(loser(m)!)! + 1);
  return b.seeds.filter((id) => lost.get(id)! < (b.kind === "single" ? 1 : 2));
}
export function bracketRanks(
  b: CircuitBracket,
): { id: string; from: number; to: number }[] {
  if (!bracketDone(b)) return [];
  const rows: { id: string; from: number; to: number }[] = [],
    seen = new Set<string>();
  const add = (ids: string[]) => {
    const fresh = ids.filter((id) => !seen.has(id));
    const start = rows.length + 1;
    fresh.forEach((id) => {
      seen.add(id);
      rows.push({ id, from: start, to: start + fresh.length - 1 });
    });
  };
  if (b.kind === "gsl") {
    add([winner(b.rounds[1][0])!]);
    add([winner(b.rounds[3][0])!]);
  } else if (b.kind === "top2") {
    const p = plan(b),
      u = p.map((s) => s.kind).lastIndexOf("upper"),
      l = p.map((s) => s.kind).lastIndexOf("lower");
    add([winner(b.rounds[u][0])!]);
    add([winner(b.rounds[l][0])!]);
  } else if (b.kind === "top4") add(survivors(b));
  else {
    const final = b.rounds.at(-1)![0];
    add([winner(final)!]);
    add([loser(final)!]);
  }
  if (b.bronze?.sets) {
    add([winner(b.bronze)!]);
    add([loser(b.bronze)!]);
  }
  for (const row of [...b.rounds].reverse()) add(row.map((m) => loser(m)!));
  return rows;
}
