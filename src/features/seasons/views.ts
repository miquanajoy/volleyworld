import { getPorts } from "../../app/ports";
import { displayState } from "../../app/selectors";
import { store } from "../../app/store";
import { team } from "../../components/team";
import * as V from "../../domain/index";
import { $ } from "../../shared/dom";
import { all, medals, progress, scope, seasonsState } from "./model";
import { seasonSummary } from "./summary";
export function showDecision(customizing: boolean) {
  const box = $("seasonDecision");
  $("seasonDecisionContent").innerHTML =
    `<p>Mùa ${store.state.seasonNumber} đang diễn ra: ${progress(store.state)}.</p><p class="sub">Chỉ có thể chỉnh đội và thể thức khi mùa mới chưa có trận đấu. Chọn cách xử lý mùa hiện tại:</p><div class="season-choices"><button class="primary" data-action="Seasons.resolve" data-arg="finish" data-arg1="${customizing}">Mô phỏng hết mùa hiện tại & tạo mùa mới</button><button data-action="Seasons.resolve" data-arg="cancel" data-arg1="${customizing}">Hủy tiến trình hiện tại & tạo mùa mới</button><button data-action="closeDialog" data-arg="seasonDecision">Giữ lại và tiếp tục chơi</button></div><p class="sub">Mùa được mô phỏng sẽ lưu đầy đủ kết quả. Mùa bị hủy được ghi rõ trong lịch sử, không có nhà vô địch.</p>`;
  if (!box.open) box.showModal();
}
export function tiles() {
  const list = all();
  return `<div class="season-grid">${list
    .map((r) => {
      const done = r.status === "completed",
        ongoing = r.current && !done,
        label = done
          ? "Đã hoàn tất"
          : r.status === "cancelled"
            ? "Đã hủy"
            : r.status === "active"
              ? "Đang diễn ra"
              : "Chưa bắt đầu";
      return `<article class="panel season-card ${r.current ? "current-season" : ""}"><div class="season-card-top"><span class="eyebrow">SEASON ${String(r.season_number).padStart(2, "0")}</span><span class="badge ${done ? "gold" : ""}">${label}</span></div><h3>Mùa ${r.season_number}</h3>${r.snapshot ? `<p class="season-format-label">${V.formatName(r.snapshot)}</p>` : ""}${done ? `<div class="season-medals">${(r.podium || []).map((id, i) => `<div><span>${["🥇", "🥈", "🥉"][i]}</span>${team(id)}</div>`).join("")}</div>` : `<p class="sub">${r.snapshot ? progress(r.snapshot) : `${r.played || 0} trận đã đấu`}</p><div class="progress"><i style="width:${((r.played || 0) / (r.snapshot ? V.totalMatches(r.snapshot) : 531)) * 100}%"></i></div>`}<div class="actions">${ongoing ? `<button class="primary" data-action="Seasons.start">${V.started(store.state) ? "Tiếp tục giải đấu" : "Bắt đầu giải đấu"}</button>` : `<button data-action="Seasons.view" data-arg="${r.season_id}">${done ? "Xem kết quả mùa giải" : "Xem tiến trình đã hủy"} →</button>`}</div></article>`;
    })
    .join("")}</div>`;
}
export function home() {
  scope();
  $("content").innerHTML =
    `<div class="section-head"><div><div class="eyebrow">YOUR VOLLEYBALL JOURNEY</div><h2 style="margin-top:8px">Các mùa giải của bạn</h2><p class="sub">Mỗi mùa là một hành trình. Kết quả được giữ lại để bạn xem bất cứ lúc nào.</p></div><button data-action="navigate" data-arg="history">Lịch sử giải đấu ↗</button></div>${seasonsState.historyError ? `<div class="notice">${seasonsState.historyError}</div>` : ""}${tiles()}`;
}
export function history() {
  scope();
  $("content").innerHTML =
    `<div class="section-head"><div><h2>Lịch sử giải đấu</h2><p class="sub">Mùa đang chơi có thể tiếp tục; các mùa đã kết thúc chỉ xem kết quả.</p></div><button data-action="navigate" data-arg="home">← Trang chủ</button></div>${tiles()}`;
}
export function resultHeader() {
  const r = store.seasonView || {
      season_number: store.state.seasonNumber,
      status: "completed",
      snapshot: store.state,
    },
    s = r.snapshot;
  return `<div class="season-result-heading"><button data-action="navigate" data-arg="history">← Lịch sử mùa giải</button><div><span class="badge">${r.status === "cancelled" ? "ĐÃ HỦY · CHỈ XEM" : "ĐÃ HOÀN TẤT · CHỈ XEM"}</span><h2>Mùa ${r.season_number}</h2><p class="sub">${V.formatName(s)}</p></div></div>${
    V.complete(s)
      ? `<div class="podium-grid">${medals(s)
          .map(
            (id, i) =>
              `<div class="panel medal-card place-${i + 1}"><span>${["🥇", "🥈", "🥉"][i]}</span><small>${["VÔ ĐỊCH", "Á QUÂN", "HẠNG BA"][i]}</small><h3>${team(id)}</h3></div>`,
          )
          .join("")}</div>`
      : `<div class="notice">Mùa này đã bị hủy ở tiến trình: ${progress(s)}. Không xác định top 3.</div>`
  }`;
}
export function results() {
  const s = displayState();
  if (V.complete(s)) {
    const content = $("content"),
      playoffOpen = content
        .querySelector?.('[data-season-section="playoff"]')
        ?.hasAttribute("open"),
      leagueOpen = content
        .querySelector?.('[data-season-section="league"]')
        ?.hasAttribute("open");
    getPorts().commands.renderPlayoff();
    const playoff = content.innerHTML;
    getPorts().commands.renderTable();
    const league = content.innerHTML;
    content.innerHTML = `${resultHeader()}${seasonSummary(s)}<details class="panel season-result-disclosure" data-season-section="playoff" ${playoffOpen ? "open" : ""}><summary><span>Nhánh playoff</span><small>Kết quả từng trận · điểm từng set</small></summary><div class="season-result-body">${playoff}</div></details><details class="panel season-result-disclosure" data-season-section="league" ${leagueOpen ? "open" : ""}><summary><span>BXH sau league phase</span><small>Đầy đủ 32 đội · phong độ · chi tiết trận đấu</small></summary><div class="season-result-body">${league}</div></details>`;
    return;
  }
  const header = resultHeader();
  getPorts().commands.renderPlayoff();
  $("content").innerHTML =
    header +
    (!V.leagueDone(displayState())
      ? '<div class="notice">Chưa hoàn tất league nên chưa có nhánh playoff.</div>'
      : $("content").innerHTML);
  const saved = $("content").innerHTML;
  getPorts().commands.renderTable();
  $("content").innerHTML =
    saved + `<div style="height:32px"></div>` + $("content").innerHTML;
}
