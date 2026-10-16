import { isReadOnly } from "../../app/selectors";
import { store } from "../../app/store";
import * as V from "../../domain/index";
import type { Match } from "../../domain/types";

export function allMatches() {
  return V.matches(store.state);
}
export function findMatch(id: string | null) {
  return allMatches().find((m) => m.id === id);
}
export function isLocked(m: Match) {
  if (isReadOnly()) return true;
  if (m.id.startsWith("L")) return !!store.state.playin;
  if (m.id.startsWith("P")) return !!store.state.bracket;
  return V.playoffLocked(store.state, m);
}
