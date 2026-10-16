import type { Match, Tournament } from "../types";

export function matches(s: Tournament): Match[] {
  return [
    ...s.rounds.flat(),
    ...(s.playin || []),
    ...Object.values(s.bracket || {})
      .filter(Array.isArray)
      .flat(),
  ];
}

export function stampResults(s: Tournament) {
  const all = matches(s);
  let n = Math.max(
    0,
    ...all
      .filter((m) => m.sets && Number.isSafeInteger(m.resultOrder))
      .map((m) => m.resultOrder!),
  );
  for (const m of all)
    if (m.sets && !Number.isSafeInteger(m.resultOrder)) m.resultOrder = ++n;
  return s;
}

export const started = (s: Tournament) =>
  s.rounds.some((r) => r.some((m) => m.sets));
