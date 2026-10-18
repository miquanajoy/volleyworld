import type {
  Tournament,
  Region,
  SeasonTournament,
  SeasonView,
} from "../domain/types";

export type AppTab =
  | "full-season"
  | "nations-league"
  | "home"
  | "history"
  | "settings"
  | "season-results"
  | "table"
  | "league"
  | "playoff"
  | "teams"
  | "rules"
  | "achievements";
export interface AppState {
  state: SeasonTournament;
  tab: AppTab;
  round: number;
  search: string;
  tableRound: number | null;
  tableSource: Tournament | null;
  editId: string | null;
  seasonView: SeasonView | null;
  editorSubmitted: boolean;
  playoffLayout: "branches" | "tree";
  doubleView: "overview" | "upper" | "lower" | "grand";
  achievementRegion: Region;
  achievementTeam: string | null;
  achievementView: "countries" | "ranking";
  achievementWorldwide: boolean;
}
/** Initialized once by bootstrap before feature controllers are invoked. */
let current: AppState | undefined;
export function initializeStore(state: SeasonTournament): AppState {
  current = {
    state,
    tab: "home",
    round: Math.max(
      0,
      state.rounds.findIndex((r) => r.some((m) => !m.sets)),
    ),
    search: "",
    tableRound: null,
    tableSource: null,
    editId: null,
    seasonView: null,
    editorSubmitted: false,
    playoffLayout: "branches",
    doubleView: "overview",
    achievementRegion: "CEV",
    achievementTeam: null,
    achievementView: "countries",
    achievementWorldwide: false,
  };
  return current;
}
export const store = new Proxy({} as AppState, {
  get(_target, key: keyof AppState) {
    if (!current) throw Error("Application store has not been initialized");
    return current[key];
  },
  set(_target, key: keyof AppState, value) {
    if (!current) throw Error("Application store has not been initialized");
    Reflect.set(current, key, value);
    return true;
  },
});
