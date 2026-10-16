import { match } from "../match/factory";
import { loser, winner } from "../match/scoring";
import type { Match, StageDefinition, StageKey, Tournament } from "../types";
import { playoffStages } from "./definitions";

export function expectedStage(s: Tournament, def: StageDefinition) {
  const b = s.bracket;
  if (!b || !def.pairs) return null;
  if (def.reset && (!b.gf![0]?.sets || winner(b.gf![0]) !== b.gf![0].b))
    return null;
  const keys = [...new Set(def.pairs.flat().map((src) => src[1]))];
  if (
    !keys.every(
      (key) =>
        b[key]?.length === playoffStages(s).find((d) => d.key === key)?.count &&
        b[key]!.every((m) => m.sets),
    )
  )
    return null;
  return def.pairs.map((pair) =>
    pair.map(([out, key, i]) => {
      const m = b[key]![i];
      return out === "w" ? winner(m) : out === "l" ? loser(m) : m[out];
    }),
  );
}

export function advance(s: Tournament) {
  const b = s.bracket;
  if (!b) return;
  for (const def of playoffStages(s).slice(1)) {
    if (b[def.key]!.length) continue;
    const pairs = expectedStage(s, def);
    if (pairs)
      b[def.key] = pairs.map(([a, c], i) =>
        match(a!, c!, def.prefix + (i + (def.offset || 0))),
      );
  }
}

export function playoffLocked(s: Tournament, m: Match) {
  if (!s.bracket) return false;
  const stages = playoffStages(s),
    key = stages.find((d) =>
      s.bracket![d.key]!.some((x) => x.id === m.id),
    )?.key;
  return (
    !!key &&
    stages.some(
      (d) =>
        s.bracket![d.key]!.length &&
        d.pairs?.flat().some((src) => src[1] === key),
    )
  );
}

export function stageSlots(s: Tournament, key: StageKey) {
  const def = playoffStages(s).find((d) => d.key === key);
  if (!def) return [];
  const b = s.bracket,
    short = {
      r16: "R",
      qf: "Q",
      sf: "S",
      final: "F",
      lower1: "LB1-",
      lower2: "LB2-",
      lower3: "LB3-",
      lower4: "LB4-",
      lower5: "LB5-",
      lower6: "LB6-",
      gf: "GF",
    };
  return Array.from({ length: def.count }, (_, i) => ({
    m: b?.[key]?.[i] || null,
    waiting: def.pairs?.[i].map(([out, src, j]) => {
      const m = b?.[src]?.[j];
      if (m?.sets)
        return out === "w" ? winner(m) : out === "l" ? loser(m) : m[out];
      return out === "a"
        ? "Đại diện nhánh thắng"
        : out === "b"
          ? "Đại diện nhánh thua"
          : `${out === "w" ? "Thắng" : "Thua"} ${(short as Partial<Record<StageKey, string>>)[src]}${j + 1}`;
    }) || ["Chờ đội tuyển", "Chờ đội tuyển"],
  }));
}
