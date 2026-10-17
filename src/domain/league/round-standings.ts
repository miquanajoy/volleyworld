import type { Match, TeamId, Tournament } from "../types";
import { standings } from "./standings";
export interface LeagueRounds {
  rounds: Match[][];
}
/** Scheduled-round cutoff; future/out-of-order results never leak into the past. */
export function leagueRoundSnapshot<T extends LeagueRounds>(
  s: T,
  round: number,
): T {
  if (!Number.isInteger(round) || round < -1 || round >= s.rounds.length)
    throw Error("Vòng BXH không hợp lệ.");
  return {
    ...s,
    rounds: s.rounds.map((matches, i) =>
      i <= round
        ? matches
        : matches.map((m) => ({ ...m, sets: null, resultOrder: undefined })),
    ),
  };
}
export function latestLeagueRound(s: LeagueRounds): number {
  let latest = 0;
  s.rounds.forEach((r, i) => {
    if (r.some((m) => m.sets)) latest = i;
  });
  return latest;
}
export function leagueRoundStatus(s: LeagueRounds, round: number): string {
  const matches = s.rounds[round];
  return matches.every((m) => m.sets)
    ? "Đã hoàn tất"
    : matches.some((m) => m.sets)
      ? "Đang đấu · tạm thời"
      : "Chưa đấu";
}
export function rankChanges(
  previous: { id: TeamId }[],
  current: { id: TeamId }[],
  visible: boolean,
): Record<TeamId, number | null> {
  const before = new Map(previous.map((t, i) => [t.id, i + 1]));
  return Object.fromEntries(
    current.map((t, i) => [
      t.id,
      visible && before.has(t.id) ? before.get(t.id)! - (i + 1) : null,
    ]),
  );
}
export function roundStandings<T extends Tournament>(s: T, round: number) {
  const snapshot = {
      ...leagueRoundSnapshot(s, round),
      playin: null,
      bracket: null,
    },
    rows = standings(snapshot),
    previous = standings(leagueRoundSnapshot(snapshot, round - 1)),
    visible = round > 0 || snapshot.rounds.some((r) => r.some((m) => m.sets));
  return { snapshot, rows, changes: rankChanges(previous, rows, visible) };
}
