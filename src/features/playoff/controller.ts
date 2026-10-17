import { getPorts } from "../../app/ports";
import { displayState, isReadOnly } from "../../app/selectors";
import { store } from "../../app/store";
import { card } from "../../components/match-card";
import * as V from "../../domain/index";
import { $ } from "../../shared/dom";
import { simOne } from "../league/controller";
import { editMatch } from "../matches/editor";
import { isLocked } from "../matches/selectors";
import { renderPlayoff } from "./views";
export function setPlayoffLayout(mode: "branches" | "tree") {
  if (!["branches", "tree"].includes(mode)) return;
  store.playoffLayout = mode;
  if (store.tab === "season-results") getPorts().seasons.results();
  else renderPlayoff();
}
export function openPlayoffMatch(id: string) {
  const s = displayState(),
    m = V.matches(s).find((x) => x.id === id);
  if (!m || id.startsWith("L")) return;
  const label = V.matchLabel(s, m);
  $("playoffMatchTitle").textContent = label;
  $("playoffMatchBody").innerHTML =
    card(m, label)
      .replaceAll('data-action="simOne"', 'data-action="playoffSimOne"')
      .replaceAll('data-action="editMatch"', 'data-action="playoffEditMatch"') +
    `<p class="sub">${isReadOnly() ? "Chỉ xem kết quả của mùa giải này." : isLocked(m) ? "Kết quả đã khóa vì vòng tiếp theo đã được tạo." : "BO5 · Đội thắng 3 set thắng trận."}</p>`;
  if (!$("playoffMatchDialog").open) $("playoffMatchDialog").showModal();
}
export function playoffSimOne(id: string) {
  $("playoffMatchDialog").close();
  simOne(id);
}
export function playoffEditMatch(id: string) {
  $("playoffMatchDialog").close();
  editMatch(id);
}
export function setDoubleView(view: "overview" | "upper" | "lower" | "grand") {
  if (!["overview", "upper", "lower", "grand"].includes(view)) return;
  store.doubleView = view;
  if (store.tab === "season-results") getPorts().seasons.results();
  else renderPlayoff();
}
