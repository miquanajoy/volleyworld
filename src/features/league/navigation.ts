import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import { leagueDone, startPlayin } from "../../domain/index";
import { renderLeague } from "./views";
export function nextLeagueRound() {
  if (!store.state.rounds[store.round]?.every((m) => m.sets)) return;
  if (store.round < 30) {
    store.round++;
    renderLeague();
    return;
  }
  if (!leagueDone(store.state)) {
    store.round = store.state.rounds.findIndex((r) => r.some((m) => !m.sets));
    renderLeague();
    return;
  }
  if (!store.state.playin) {
    startPlayin(store.state);
    getPorts().commands.save();
  }
  getPorts().commands.navigate("playoff");
}
