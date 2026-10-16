import { leagueDone, standings } from "../league/standings";
import { validate, winner } from "../match/scoring";
import { isDouble, playoffStages } from "../playoff/definitions";
import { expectedStage } from "../playoff/progression";
import type { Match, Tournament } from "../types";
import { ids, validRoster } from "./roster";

export function validState(input: unknown): input is Tournament {
  const s = input as Tournament;
  try {
    if (
      s?.setupConfirmed !== undefined &&
      typeof s.setupConfirmed !== "boolean"
    )
      return false;
    if (
      s?.seasonId !== undefined &&
      (typeof s.seasonId !== "string" ||
        !s.seasonId.match(/^[a-zA-Z0-9-]{1,100}$/))
    )
      return false;
    if (
      s?.seasonNumber !== undefined &&
      (!Number.isSafeInteger(s.seasonNumber) || s.seasonNumber < 1)
    )
      return false;
    if (
      s?.playoffFormat !== undefined &&
      !["single", "double"].includes(s.playoffFormat)
    )
      return false;
    if (
      s?.version !== 1 ||
      !validRoster(ids(s)) ||
      !Array.isArray(s.rounds) ||
      s.rounds.length !== 31 ||
      !Array.isArray(s.tie) ||
      s.tie.length !== 32 ||
      new Set(s.tie).size !== 32 ||
      !s.tie.every((id) => ids(s).includes(id))
    )
      return false;
    const roster = new Set(ids(s)),
      pairs = new Set(),
      matchIds = new Set(),
      resultOrders = new Set();
    const check = (m: Match) => {
      if (m?.resultOrder !== undefined) {
        if (
          !m.sets ||
          !Number.isSafeInteger(m.resultOrder) ||
          m.resultOrder < 1 ||
          resultOrders.has(m.resultOrder)
        )
          return false;
        resultOrders.add(m.resultOrder);
      }
      if (
        !m ||
        typeof m.id !== "string" ||
        !m.id.match(/^[LPRQSFBDG0-9-]+$/) ||
        matchIds.has(m.id) ||
        !roster.has(m.a) ||
        !roster.has(m.b) ||
        m.a === m.b ||
        (m.sets !== null && !validate(m.sets))
      )
        return false;
      matchIds.add(m.id);
      return true;
    };
    for (const r of s.rounds) {
      if (
        !Array.isArray(r) ||
        r.length !== 16 ||
        new Set(r.flatMap((m) => [m.a, m.b])).size !== 32
      )
        return false;
      for (const m of r) {
        if (!check(m)) return false;
        pairs.add([m.a, m.b].sort().join("-"));
      }
    }
    if (pairs.size !== 496) return false;
    if (s.playin !== null) {
      if (
        !leagueDone(s) ||
        !Array.isArray(s.playin) ||
        s.playin.length !== 4 ||
        !s.playin.every(check)
      )
        return false;
      const ranked = standings(s);
      if (
        !s.playin.every(
          (m, i) => m.a === ranked[12 + i].id && m.b === ranked[19 - i].id,
        )
      )
        return false;
    }
    if (s.bracket !== null) {
      const b = s.bracket,
        stages = playoffStages(s),
        allowed = new Set(["seeds", "bronze", ...stages.map((d) => d.key)]);
      if (
        !s.playin?.every((m) => m.sets) ||
        !b.seeds ||
        Object.keys(b).some((k) => !allowed.has(k))
      )
        return false;
      for (const def of stages)
        if (
          !Array.isArray(b[def.key]) ||
          (b[def.key]!.length !== 0 && b[def.key]!.length !== def.count) ||
          !b[def.key]!.every(check)
        )
          return false;
      if (isDouble(s) && (!Array.isArray(b.bronze) || b.bronze.length))
        return false;
      if (b.r16.length !== 8 || !b.r16.every((m, i) => m.id === "R" + i))
        return false;
      const ranked = standings(s).map((t) => t.id),
        seedGroups = [
          ranked.slice(0, 4),
          ranked.slice(4, 8),
          ranked.slice(8, 12),
          s.playin.map((m) => winner(m)!),
        ],
        eligible = seedGroups.flat();
      if (
        Object.keys(b.seeds).length !== 16 ||
        !seedGroups.every((list, i) =>
          list.every((id) => b.seeds[id] === i + 1),
        )
      )
        return false;
      if (
        new Set(b.r16.flatMap((m) => [m.a, m.b])).size !== 16 ||
        !b.r16.every(
          (m, i) =>
            eligible.includes(m.a) &&
            eligible.includes(m.b) &&
            b.seeds[m.a] === (i % 2 === 0 ? 1 : 2) &&
            b.seeds[m.b] === (i % 2 === 0 ? 4 : 3),
        )
      )
        return false;
      for (let i = 0; i < 8; i += 2)
        if (
          b.r16
            .slice(i, i + 2)
            .flatMap((m) => [m.a, m.b])
            .map((id) => b.seeds[id])
            .sort()
            .join("") !== "1234"
        )
          return false;
      for (const def of stages.slice(1)) {
        const expected = expectedStage(s, def);
        if (isDouble(s) && !!expected !== !!b[def.key]!.length) return false;
        if (
          b[def.key]!.length &&
          (!expected ||
            !b[def.key]!.every(
              (m, i) =>
                m.id === def.prefix + (i + (def.offset || 0)) &&
                m.a === expected[i][0] &&
                m.b === expected[i][1],
            ))
        )
          return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
