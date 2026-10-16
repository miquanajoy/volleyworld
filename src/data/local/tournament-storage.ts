import type { SeasonTournament, Tournament } from "../../domain/types";
export const KEY = "volleyworld-v1";
export function readInitialTournament(
  storage: Storage,
  fresh: () => SeasonTournament,
): Tournament {
  try {
    const s = JSON.parse(storage.getItem(KEY) || "null");
    return !s || s.version !== 1 ? fresh() : s;
  } catch {
    return fresh();
  }
}
export function writeTournament(
  storage: Storage,
  key: string,
  state: Tournament,
): boolean {
  try {
    storage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
/** Account/guest candidates must be validated by the caller before adoption. */
export function readTournament(storage: Storage, key: string): unknown {
  return JSON.parse(storage.getItem(key) || "null");
}
