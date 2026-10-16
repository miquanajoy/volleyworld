import { loser, winner } from "../match/scoring";
import type { Match, Tournament } from "../types";
import { isDouble, playoffStages } from "./definitions";

export function decidingFinal(s: Tournament) {
  const b = s.bracket;
  if (!b) return null;
  if (!isDouble(s)) return b.final[0] || null;
  return b.gf![0]?.sets && winner(b.gf![0]) === b.gf![0].b
    ? b.reset![0] || null
    : b.gf![0] || null;
}

export function podium(s: Tournament) {
  if (!complete(s)) return [];
  const f = decidingFinal(s)!;
  return [
    winner(f)!,
    loser(f)!,
    isDouble(s) ? loser(s.bracket!.lower6![0])! : winner(s.bracket!.bronze[0])!,
  ];
}

export function totalMatches(s: Tournament) {
  if (!isDouble(s)) return 516;
  const gf = s.bracket?.gf?.[0];
  return gf?.sets && winner(gf) === gf.a ? 530 : 531;
}

export const complete = (s: Tournament) =>
  isDouble(s)
    ? !!(
        s.bracket?.gf?.[0]?.sets &&
        (winner(s.bracket.gf[0]) === s.bracket.gf[0].a ||
          s.bracket.reset?.[0]?.sets)
      )
    : !!(s.bracket?.final[0]?.sets && s.bracket?.bronze[0]?.sets);

export function matchLabel(s: Tournament, m: Match) {
  if (m.id.startsWith("P")) return "Vòng Play-in";
  return (
    playoffStages(s).find((d) => s.bracket?.[d.key]?.some((x) => x.id === m.id))
      ?.label || "Playoff"
  );
}
