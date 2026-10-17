import { leagueDone, standings } from "../league/standings";
import { match } from "../match/factory";
import { winner } from "../match/scoring";
import { shuffle } from "../shared/random";
import type { Seed, StageKey, Tournament } from "../types";
import { expandedSingle, entrySlots } from "./entry";
import { isDouble } from "./definitions";

export function startPlayin(s: Tournament) {
  if (!leagueDone(s)) throw Error("League chưa kết thúc");
  if (s.playin) return;
  const r = standings(s),
    slots = entrySlots(s);
  s.playin = Array.from({ length: 4 }, (_, i) =>
    match(r[slots.direct + i].id, r[slots.advance - 1 - i].id, `P${i}`),
  );
}

export function draw(s: Tournament) {
  if (!s.playin?.every((m) => m.sets))
    throw Error("Vòng Play-in chưa kết thúc");
  if (s.bracket?.r16.length) throw Error("Nhánh 16 đội đã được bốc thăm.");
  const r20 = s.bracket?.r20;
  if (expandedSingle(s) && !r20) {
    const ranked = standings(s);
    s.bracket = {
      seeds: {},
      r20: Array.from({ length: 4 }, (_, i) =>
        match(ranked[12 + i].id, winner(s.playin![3 - i])!, `D${i}`),
      ),
      r16: [],
      qf: [],
      sf: [],
      final: [],
      bronze: [],
    };
    return;
  }
  if (expandedSingle(s) && !r20?.every((m) => m.sets))
    throw Error("Vòng 20 đội chưa kết thúc.");
  let r = standings(s),
    seeds = [
      r.slice(0, 4).map((x) => x.id),
      r.slice(4, 8).map((x) => x.id),
      r.slice(8, 12).map((x) => x.id),
      (expandedSingle(s) ? r20! : s.playin).map((m) => winner(m)!),
    ].map(shuffle);
  s.bracket = {
    seeds: Object.fromEntries(
      seeds.flatMap((ids, i) => ids.map((id) => [id, (i + 1) as Seed])),
    ),
    ...(expandedSingle(s) ? { r20 } : {}),
    r16: [],
    qf: [],
    sf: [],
    final: [],
    bronze: [],
  };
  if (isDouble(s))
    for (const key of [
      "lower1",
      "lower2",
      "lower3",
      "lower4",
      "lower5",
      "lower6",
      "gf",
      "reset",
    ] as StageKey[])
      s.bracket![key] = [];
  for (let i = 0; i < 4; i++)
    s.bracket!.r16.push(
      match(seeds[0][i], seeds[3][i], `R${i * 2}`),
      match(seeds[1][i], seeds[2][i], `R${i * 2 + 1}`),
    );
}
