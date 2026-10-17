import { getPorts } from "../../app/ports";
import {
  rankMovementHtml,
  rankMovementLegend,
} from "../../components/rank-movement";
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
  const source = displayState();
  if (store.tableSource !== source) {
    store.tableSource = source;
    store.tableRound = null;
  }
  const round = store.tableRound ?? V.latestLeagueRound(source),
    { snapshot, rows, changes } = V.roundStandings(source, round),
    q = qualificationData(snapshot),
    slots = V.entrySlots(source);
  const controls = `<div class="standings-history-controls"><label for="standingsRound">BXH theo vòng</label><select id="standingsRound" data-action="selectStandingsRound" data-trigger="change" aria-label="Chọn vòng BXH"><option value="latest" ${store.tableRound === null ? "selected" : ""}>Hiện tại · vòng ${V.latestLeagueRound(source) + 1}</option>${source.rounds.map((_r, i) => `<option value="${i}" ${store.tableRound === i ? "selected" : ""}>Vòng ${i + 1} · ${V.leagueRoundStatus(source, i)}</option>`).join("")}</select></div>`;
  $("content").innerHTML =
    `<div class="section-head"><div><h2>League standings</h2><p class="sub">Thắng / thua → hiệu số set → hiệu số điểm → đối đầu → bốc thăm</p></div><div class="controls">${controls}${isReadOnly() ? "" : '<input class="search" placeholder="Tìm đội tuyển…" aria-label="Tìm đội tuyển" id="search">'}${isReadOnly() ? "" : `<button class="primary" data-action="navigate" data-arg="league">Thi đấu vòng tiếp theo →</button>`}</div></div><div class="legend"><span><i class="dot"></i>1–${slots.direct}: Vào thẳng playoff</span><span><i class="dot yellow"></i>${slots.direct + 1}–${slots.advance}: Vòng Play-in</span><span><i class="dot gray"></i>${slots.advance + 1}–32: Bị loại sau league</span></div><p class="sub standings-round-note">BXH tới vòng ${round + 1} · ${V.leagueRoundStatus(source, round)} · chỉ tính kết quả từ vòng 1 đến vòng ${round + 1}.</p>${rankMovementLegend}${V.leagueDone(source) ? "" : qualificationNews(q)}<div class="panel table-wrap"><table class="standings-table"><colgroup><col class="col-position"><col class="col-team"><col class="col-region"><col class="col-form"><col class="col-played"><col class="col-w"><col class="col-l"><col class="col-sets"><col class="col-set-diff"><col class="col-points"><col class="col-point-diff"></colgroup><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>KHU VỰC</th><th>PHONG ĐỘ LEAGUE <small>cũ → mới</small></th><th>TRẬN</th><th>W</th><th>L</th><th>SET +/−</th><th>HS SET</th><th>ĐIỂM +/−</th><th>HS ĐIỂM</th></tr></thead><tbody id="rows"></tbody></table></div>`;
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
          `<tr class="${t.pos <= slots.direct ? "direct" : t.pos <= slots.advance ? "in" : "out"}"><td>${t.pos}${rankMovementHtml(changes[t.id], round)}</td><td>${team(t.id)}${qualificationBadge(q?.teams[t.id])}</td><td><span class="badge">${t.region}</span></td><td><div class="standings-form">${formHtml(t.id, snapshot, true)}<button class="team-league-button" data-action="showTeamLeague" data-arg="${t.id}" data-arg1="${round}" aria-label="Xem toàn bộ trận league của ${t.name}">Chi tiết ↗</button></div></td><td>${t.w + t.l}</td><td><b>${t.w}</b></td><td>${t.l}</td><td>${t.sf} : ${t.sa}</td><td><b>${signed(t.sf - t.sa)}</b></td><td>${t.pf} : ${t.pa}</td><td>${signed(t.pf - t.pa)}</td></tr>`,
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
export function selectStandingsRound(value: string) {
  const s = displayState(),
    round = Number(value);
  if (
    value !== "latest" &&
    (!/^\d+$/.test(value) ||
      !Number.isInteger(round) ||
      round < 0 ||
      round >= s.rounds.length)
  )
    return;
  store.tableSource = s;
  store.tableRound = value === "latest" ? null : round;
  if (store.tab === "season-results") getPorts().seasons.results();
  else renderTable();
}
export function showTeamLeague(id: TeamId, round?: number) {
  const source = displayState(),
    historical =
      round !== undefined &&
      Number.isInteger(round) &&
      round >= 0 &&
      round < source.rounds.length,
    s = historical ? V.roundStandings(source, round!).snapshot : source;
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
    `<p class="sub">Mùa ${s.seasonNumber || 1} · League phase${historical ? `<span class="standings-detail-cutoff"> · Tới vòng ${round! + 1}</span>` : ""} · Đã đấu ${played.length}/31 · ${wins} thắng · ${played.length - wins} thua</p><div class="team-league-form">${formHtml(id, s, true)}<span class="sub">5 trận league gần nhất · cũ → mới</span></div>`;
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
    `<div class="section-head"><div><h2>Lịch thi đấu league</h2><p class="sub">Vòng tròn một lượt · 496 trận · Phong độ: cũ → mới</p></div><div class="controls"><select aria-label="Chọn vòng" data-action="selectRound" data-trigger="change">${store.state.rounds.map((r, i) => `<option value="${i}" ${i === store.round ? "selected" : ""}>Vòng ${i + 1}${r.every((m) => m.sets) ? " ✓" : ""}</option>`).join("")}</select>${store.state.rounds[store.round].every((m) => m.sets) ? `<button class="primary" data-action="nextLeagueRound">${store.round === 30 ? (V.leagueDone(store.state) ? "Qua giai đoạn Play-in →" : "Tới vòng chưa hoàn tất →") : "Qua vòng tiếp theo →"}</button>` : `<button data-action="simRound">Chạy vòng ${store.round + 1}</button>`}<button class="primary" data-action="simLeague" ${V.leagueDone(store.state) ? "disabled" : ""}>Chạy hết league</button></div></div><div class="progress"><i style="width:${(store.state.rounds.flat().filter((m) => m.sets).length / 496) * 100}%"></i></div><div style="height:20px"></div>${V.leagueDone(store.state) ? `<div class="notice"><b>League đã kết thúc!</b> ${V.expandedSingle(store.state) ? "Top 16 vào thẳng; hạng 17–24 tranh 4 vé Play-in. Top 12 được miễn vòng 20 đội." : "Top 12 đi tiếp; hạng 13–20 tranh 4 vé còn lại."} <button data-action="navigate" data-arg="playoff">Đến vòng Play-in →</button></div>` : ""}${qualificationNews(qualificationData(store.state, store.round)) || `<div class="notice round-race-pending"><b>CUỘC ĐUA PLAYOFF · VÒNG ${store.round + 1}</b><p>Hoàn tất vòng này để xem các suất được xác nhận tại thời điểm đó.</p></div>`}<div class="grid">${store.state.rounds[store.round].map((m) => card(m, `VÒNG ${store.round + 1}`, !!store.state.playin)).join("")}</div><div class="section-head" style="margin-top:20px"><button ${store.round === 0 ? "disabled" : ""} data-action="changeRound" data-arg="-1">← Vòng trước</button><button ${store.round === 30 ? "disabled" : ""} data-action="changeRound" data-arg="1">Vòng sau →</button></div>`;
}
