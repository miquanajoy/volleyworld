import { renderFull, exportFull } from "../features/full-season/controller";
import { renderAchievements } from "../features/achievements/controller";
import { KEY, writeTournament } from "../data/local/tournament-storage";
import * as V from "../domain/index";
import { renderLeague, renderTable } from "../features/league/views";
import { renderPlayoff } from "../features/playoff/views";
import { renderRules, renderTeams } from "../features/teams/views";
import { $ } from "../shared/dom";
import { toast } from "../shared/feedback";
import { getPorts } from "./ports";
import { displayState, isReadOnly } from "./selectors";
import type { AppTab } from "./store";
import { store } from "./store";

export function save() {
  V.stampResults(store.state);
  getPorts().seasons?.capture(store.state);
  let stored = false;
  try {
    if (
      !writeTournament(
        localStorage,
        getPorts().cloud?.storageKey() || KEY,
        store.state,
      )
    )
      throw Error("Storage unavailable");
    stored = true;
    $("saved").textContent = "● Đã lưu trên trình duyệt";
  } catch {
    $("saved").textContent = "Không thể lưu · hãy xuất tiến độ";
  }
  getPorts().cloud?.changed(store.state);
  return stored;
}
export function navigate(t: AppTab) {
  if (t === "settings" && !getPorts().seasons.canCustomize()) {
    getPorts().seasons.customize();
    return;
  }
  if (["home", "history", "achievements"].includes(t)) store.seasonView = null;
  if (store.seasonView && t === "league") t = "table";
  store.tab = t;
  render();
}
export function render() {
  if (store.tab === "full-season") {
    $("homeHero").hidden = true;
    $("stats").hidden = true;
    $("nav").hidden = true;
    $("seasonBar").hidden = true;
    renderFull();
    return;
  }
  const s = displayState(),
    home = store.tab === "home",
    outer = ["home", "history", "settings", "achievements"].includes(store.tab),
    done = s.rounds.flat().filter((m) => m.sets).length,
    rd = s.rounds.filter((r) => r.every((m) => m.sets)).length,
    stage = V.complete(s)
      ? "Hoàn tất"
      : s.bracket
        ? "Playoff"
        : s.playin
          ? "Play-in"
          : "League phase";
  $("homeHero").hidden = !home;
  $("stats").hidden = outer;
  $("nav").hidden = outer;
  $("seasonBar").hidden = home;
  $("seasonBar").innerHTML =
    `<button data-action="navigate" data-arg="home">← Trang chủ</button><span class="badge">WORLD LEAGUE · MÙA ${s.seasonNumber || 1}${isReadOnly() ? " · CHỈ XEM" : ""}</span>${store.seasonView ? '<button data-action="navigate" data-arg="history">Lịch sử mùa giải</button>' : ""}`;
  $("stats").innerHTML = [
    ["32", "ĐỘI TUYỂN · 5 KHU VỰC"],
    [
      `${rd}<small style="font-size:15px;color:#859287"> / 31</small>`,
      "VÒNG LEAGUE HOÀN TẤT",
    ],
    [done, "TRẬN LEAGUE ĐÃ ĐẤU"],
    [stage, "GIAI ĐOẠN HIỆN TẠI"],
  ]
    .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`)
    .join("");
  const items = store.seasonView
    ? [
        ["season-results", "Kết quả mùa giải"],
        ["table", "BXH league"],
        ["teams", "Đội tham dự"],
      ]
    : [
        ["table", "Bảng xếp hạng"],
        ["league", "Lịch thi đấu"],
        ["playoff", "Play-in & Playoff"],
        ["teams", "32 đội tuyển"],
        ["rules", "Thể thức"],
        ["achievements", "Thành tích"],
      ];
  $("nav").innerHTML = items
    .map(
      ([id, n]) =>
        `<button class="${store.tab === id ? "active" : ""}" data-action="navigate" data-arg="${id}">${n}</button>`,
    )
    .join("");
  $("heroAction").textContent = V.complete(store.state)
    ? "Bắt đầu mùa giải mới →"
    : V.started(store.state)
      ? "Tiếp tục giải đấu →"
      : "Bắt đầu giải đấu của bạn →";
  if (home) getPorts().seasons.home();
  if (store.tab === "history") getPorts().seasons.history();
  if (store.tab === "season-results") getPorts().seasons.results();
  if (store.tab === "table") renderTable();
  if (store.tab === "league") renderLeague();
  if (store.tab === "playoff") renderPlayoff();
  if (store.tab === "teams") renderTeams();
  if (store.tab === "rules") renderRules();
  if (store.tab === "achievements") renderAchievements();
  if (store.tab === "settings") getPorts().settings.render();
}
export async function exportSave() {
  if (store.tab === "full-season") return exportFull();
  try {
    const bundle = await getPorts().seasons.exportAll(),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(bundle, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "volleyworld-cac-mua-giai.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa xuất được lịch sử.");
  }
}
export function validSave(s: unknown) {
  return V.validState(s);
}
export function resetGame() {
  getPorts().seasons.requestNew();
}
