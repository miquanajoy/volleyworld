import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import * as V from "../../domain/index";
import type { StageKey } from "../../domain/types";
import { toast } from "../../shared/feedback";
import { findMatch } from "../matches/selectors";

export function simOne(id: string) {
  if (!getPorts().seasons.editable()) return;
  let m = findMatch(id);
  if (!m || m.sets) return;
  V.simulate(m);
  V.advance(store.state);
  getPorts().commands.save();
  getPorts().commands.render();
}
export function simRound() {
  if (!getPorts().seasons.editable()) return;
  store.state.rounds[store.round].filter((m) => !m.sets).forEach(V.simulate);
  getPorts().commands.save();
  getPorts().commands.render();
  toast(`Đã hoàn tất vòng ${store.round + 1}`);
}
export function simLeague() {
  if (!getPorts().seasons.editable()) return;
  if (
    !confirm(
      "Mô phỏng tất cả trận league chưa đấu? Kết quả đã có được giữ nguyên.",
    )
  )
    return;
  store.state.rounds
    .flat()
    .filter((m) => !m.sets)
    .forEach(V.simulate);
  getPorts().commands.save();
  getPorts().commands.render();
  toast("League đã hoàn tất. Vòng Play-in đã sẵn sàng!");
}
export function startPlayin() {
  if (!getPorts().seasons.editable()) return;
  V.startPlayin(store.state);
  getPorts().commands.save();
  getPorts().commands.render();
}
export function drawBracket() {
  if (!getPorts().seasons.editable()) return;
  V.draw(store.state);
  getPorts().commands.save();
  getPorts().commands.render();
  toast("Đã bốc thăm 4 nhánh. Nhánh đấu được giữ cố định!");
}
export function simStage(key: StageKey) {
  if (!getPorts().seasons.editable()) return;
  if (!Array.isArray(store.state.bracket?.[key])) return;
  store.state.bracket[key].filter((m) => !m.sets).forEach(V.simulate);
  V.advance(store.state);
  if (V.isDouble(store.state))
    store.doubleView = key.startsWith("lower")
      ? "lower"
      : ["gf", "reset"].includes(key)
        ? "grand"
        : "upper";
  getPorts().commands.save();
  getPorts().commands.render();
}
export function simPlayin() {
  if (
    !getPorts().seasons.editable() ||
    !store.state.playin ||
    store.state.bracket
  )
    return;
  store.state.playin.filter((m) => !m.sets).forEach(V.simulate);
  getPorts().commands.save();
  getPorts().commands.render();
}
