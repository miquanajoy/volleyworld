import { simulate } from "../match/simulation";
import { playoffOrder } from "../playoff/definitions";
import { advance } from "../playoff/progression";
import { draw, startPlayin } from "../playoff/seeding";
import type { Tournament } from "../types";
import { stampResults } from "./matches";

export function finishAll(s: Tournament) {
  stampResults(s);
  s.rounds
    .flat()
    .filter((m) => !m.sets)
    .forEach(simulate);
  if (!s.playin) startPlayin(s);
  s.playin!.filter((m) => !m.sets).forEach(simulate);
  if (!s.bracket) draw(s);
  advance(s);
  for (const { key } of playoffOrder(s)) {
    s.bracket![key]!.filter((m) => !m.sets).forEach(simulate);
    if (key === "r20" && !s.bracket!.r16.length) draw(s);
    advance(s);
    stampResults(s);
  }
  return stampResults(s);
}
