import { displayState, isReadOnly } from "../../app/selectors";
import { store } from "../../app/store";
import { card } from "../../components/match-card";
import { formHtml, signed, team } from "../../components/team";
import * as V from "../../domain/index";
import type { TeamId } from "../../domain/types";
import { $ } from "../../shared/dom";
import {
  qualificationBadge,
  qualificationData,
  qualificationNews,
} from "./qualification-view";

export function renderTable() {
  let rows = V.standings(displayState()),
    q = qualificationData();
  $("content").innerHTML =
    `<div class="section-head"><div><h2>League standings</h2><p class="sub">Thắng / thua → hiệu số set → hiệu số điểm → đối đầu → bốc thăm</p></div><div class="controls">${isReadOnly() ? "" : '<input class="search" placeholder="Tìm đội tuyển…" aria-label="Tìm đội tuyển" id="search">'}${isReadOnly() ? "" : `<button class="primary" data-action="navigate" data-arg="league">Thi đấu vòng tiếp theo →</button>`}</div></div><div class="legend"><span><i class="dot"></i>1–12: Vào thẳng playoff</span><span><i class="dot yellow"></i>13–20: Vòng Play-in</span><span><i class="dot gray"></i>21–32: Bị loại sau league</span></div>${qualificationNews(q)}<div class="panel table-wrap"><table class="standings-table"><colgroup><col class="col-position"><col class="col-team"><col class="col-region"><col class="col-form"><col class="col-played"><col class="col-w"><col class="col-l"><col class="col-sets"><col class="col-set-diff"><col class="col-points"><col class="col-point-diff"></colgroup><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>KHU VỰC</th><th>PHONG ĐỘ LEAGUE <small>cũ → mới</small></th><th>TRẬN</th><th>W</th><th>L</th><th>SET +/−</th><th>HS SET</th><th>ĐIỂM +/−</th><th>HS ĐIỂM</th></tr></thead><tbody id="rows"></tbody></table></div>`;
  const draw = () => {
    $("rows").innerHTML = rows
      .map((t, i) => ({ ...t, pos: i + 1 }))
      .filter(
        (t) =>
          t.name.toLowerCase().includes(store.search.toLowerCase()) ||
          t.id.toLowerCase().includes(store.search.toLowerCase()),
      )
      .map(
        (t) =>
          `<tr class="${t.pos <= 12 ? "direct" : t.pos <= 20 ? "in" : "out"}"><td>${t.pos}</td><td>${team(t.id)}${qualificationBadge(q?.teams[t.id])}</td><td><span class="badge">${t.region}</span></td><td><div class="standings-form">${formHtml(t.id, displayState(), true)}<button class="team-league-button" data-action="showTeamLeague" data-arg="${t.id}" aria-label="Xem toàn bộ trận league của ${t.name}">Chi tiết ↗</button></div></td><td>${t.w + t.l}</td><td><b>${t.w}</b></td><td>${t.l}</td><td>${t.sf} : ${t.sa}</td><td><b>${signed(t.sf - t.sa)}</b></td><td>${t.pf} : ${t.pa}</td><td>${signed(t.pf - t.pa)}</td></tr>`,
      )
      .join("");
  };
  if ($("search")) {
    $("search").value = store.search;
    $("search").oninput = () => {
      store.search = $("search").value;
      draw();
    };
  }
  draw();
}
export function showTeamLeague(id: TeamId) {
  const s = displayState();
  if (!V.ids(s).includes(id)) return;
  const fixtures = s.rounds.flatMap((r, i) =>
      r
        .filter((m) => m.a === id || m.b === id)
        .map((m) => ({ m, round: i + 1 })),
    ),
    played = fixtures.filter(({ m }) => m.sets),
    wins = played.filter(({ m }) => V.winner(m) === id).length;
  $("teamLeagueTitle").innerHTML = team(id, true, s);
  $("teamLeagueSummary").innerHTML =
    `<p class="sub">Mùa ${s.seasonNumber || 1} · League phase · Đã đấu ${played.length}/31 · ${wins} thắng · ${played.length - wins} thua</p><div class="team-league-form">${formHtml(id, s, true)}<span class="sub">5 trận league gần nhất · cũ → mới</span></div>`;
  $("teamLeagueRows").innerHTML = fixtures
    .map(({ m, round }) => {
      const home = m.a === id,
        opponent = home ? m.b : m.a,
        score = V.score(m),
        won = V.winner(m) === id;
      return `<tr><td>${round}</td><td>${team(opponent)}</td><td>${m.sets ? `<span class="team-league-result ${won ? "won" : "lost"}"><b>${home ? score[0] : score[1]}–${home ? score[1] : score[0]}</b><span>${won ? "Thắng" : "Thua"}</span></span>` : '<span class="team-league-unplayed" aria-label="Chưa có kết quả"></span>'}</td><td class="team-league-sets">${m.sets ? m.sets.map(([a, b], i) => `<span>S${i + 1} ${home ? a : b}–${home ? b : a}</span>`).join("") : ""}</td></tr>`;
    })
    .join("");
  if (!$("teamLeagueDialog").open) $("teamLeagueDialog").showModal();
}
export function renderLeague() {
  $("content").innerHTML =
    `<div class="section-head"><div><h2>Lịch thi đấu league</h2><p class="sub">Vòng tròn một lượt · 496 trận · Phong độ: cũ → mới</p></div><div class="controls"><select aria-label="Chọn vòng" data-action="selectRound" data-trigger="change">${store.state.rounds.map((r, i) => `<option value="${i}" ${i === store.round ? "selected" : ""}>Vòng ${i + 1}${r.every((m) => m.sets) ? " ✓" : ""}</option>`).join("")}</select><button data-action="simRound" ${store.state.rounds[store.round].every((m) => m.sets) ? "disabled" : ""}>Chạy vòng ${store.round + 1}</button><button class="primary" data-action="simLeague" ${V.leagueDone(store.state) ? "disabled" : ""}>Chạy hết league</button></div></div><div class="progress"><i style="width:${(store.state.rounds.flat().filter((m) => m.sets).length / 496) * 100}%"></i></div><div style="height:20px"></div>${V.leagueDone(store.state) ? `<div class="notice"><b>League đã kết thúc!</b> Top 12 đi tiếp; hạng 13–20 tranh 4 vé còn lại. <button data-action="navigate" data-arg="playoff">Đến vòng Play-in →</button></div>` : ""}${qualificationNews(qualificationData())}<div class="grid">${store.state.rounds[store.round].map((m) => card(m, `VÒNG ${store.round + 1}`, !!store.state.playin)).join("")}</div><div class="section-head" style="margin-top:20px"><button ${store.round === 0 ? "disabled" : ""} data-action="changeRound" data-arg="-1">← Vòng trước</button><button ${store.round === 30 ? "disabled" : ""} data-action="changeRound" data-arg="1">Vòng sau →</button></div>`;
}
