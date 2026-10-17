import { get, regionTeams } from "../../data/teams";
import * as F from "../../domain/full-season/index";
import { medalPodiumHtml } from "../../components/podium";
import { score, winner, loser } from "../../domain/match/scoring";
import type {
  FullSeason,
  FullLeague,
  WorldStage,
} from "../../domain/full-season/types";
import type { Match } from "../../domain/types";
import { team } from "../../components/team";
import { esc, names } from "../../shared/dom";
import { fullModel, selectedFull } from "./model";
export function fullTeam(id: string, s: FullSeason, source?: FullLeague) {
  const rank = source
    ? F.fullStandings(source).findIndex((t) => t.id === id) + 1
    : 0;
  const form = F.fullForm(F.fullMatches(s), id);
  return `<span class="full-team-line">${rank ? `<span class="team-rank">#${rank}</span>` : ""}${team(id)}<span class="form-strip" role="img" aria-label="5 trận gần nhất, cũ đến mới: ${esc(form.map((t) => (t.win ? "Thắng" : "Thua")).join(", "))}">${Array.from({ length: 5 - form.length }, () => '<span class="form-dot empty">–</span>').join("")}${form.map((t) => `<span class="form-dot ${t.win ? "form-win" : "form-loss"}" title="${t.win ? "Thắng" : "Thua"} ${esc(t.opponent)}">${t.win ? "W" : "L"}</span>`).join("")}</span></span>`;
}
export function fullCard(s: FullSeason, m: Match, readonly = false) {
  const [a, b] = score(m),
    win = winner(m),
    locked = readonly || F.fullMatchLocked(s, m);
  return `<article class="match full-match"><div class="match-top"><span>${esc(m.id)}</span><span>${m.sets ? "HOÀN TẤT" : "CHƯA ĐẤU"}</span></div>${[m.a, m.b].map((id, i) => `<div class="side ${win === id ? "win" : ""}">${fullTeam(id, s)}<span class="result">${m.sets ? (i ? b : a) : "–"}</span></div>`).join("")}${m.sets ? `<div class="sets">${m.sets.map(([x, y], i) => `S${i + 1} ${x}–${y}`).join(" · ")}</div>` : ""}<div class="match-actions"><button data-action="Full.match" data-arg="${m.id}">Chi tiết</button>${locked ? "" : `${!m.sets ? `<button class="primary" data-action="Full.simMatch" data-arg="${m.id}">Mô phỏng</button>` : ""}<button data-action="Full.edit" data-arg="${m.id}">${m.sets ? "Sửa điểm" : "Nhập điểm"}</button>`}</div></article>`;
}
export function fullStandingsTable(g: FullLeague, slots = 0) {
  const done = F.fullLeagueDone(g);
  return `<div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>TRẬN</th><th>W</th><th>L</th><th>SET</th><th>HS SET</th><th>ĐIỂM</th><th>HS ĐIỂM</th></tr></thead><tbody>${F.fullStandings(
    g,
  )
    .map(
      (t, i) =>
        `<tr class="${i < slots ? "direct" : ""}"><td>${i + 1}</td><td><button class="full-team-button" data-action="Full.team" data-arg="${t.id}">${team(t.id)}</button>${i < slots ? `<span class="full-qualification">${done ? "Giành vé" : "Top dự kiến"}</span>` : ""}</td><td>${t.w + t.l}</td><td><b>${t.w}</b></td><td>${t.l}</td><td>${t.sf}:${t.sa}</td><td>${t.sf - t.sa}</td><td>${t.pf}:${t.pa}</td><td>${t.pf - t.pa}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
export function libraryHtml() {
  return `<div class="section-head"><div><span class="eyebrow">FULL SEASON · 100 QUỐC GIA</span><h2>Một mùa. Sáu giải đấu.</h2><p class="sub">5 league khu vực → 24 đại diện → 6 bảng thế giới → playoff 16 đội.</p></div><div class="controls"><button data-action="navigate" data-arg="home">← Chế độ 32 đội</button><button class="primary" data-action="Full.create">Bắt đầu Full Season mới</button></div></div><div class="full-format-grid">${F.regionOrder.map((r) => `<div class="panel full-region-summary"><span class="eyebrow">${names[r]}</span><strong>${regionTeams(r).length} đội</strong><span>Top ${F.worldSlots[r]} dự thế giới</span></div>`).join("")}</div><div class="full-library-toolbar"><button data-action="Full.export">Xuất tất cả Full Season</button><button data-action="Full.import">Nhập Full Season</button><button data-action="Full.honours">Thành tích Full Season</button><button data-action="Full.sync">Đồng bộ lịch sử</button></div>${fullModel.records.length ? `<div class="season-grid">${fullModel.records.map((r) => `<article class="panel season-card"><div class="season-card-top"><span class="eyebrow">FULL SEASON ${r.season_number}</span><span class="badge">${r.status === "completed" ? "Đã hoàn tất" : "Đang diễn ra"}</span></div><h3>Mùa ${r.season_number}</h3><p class="sub">${r.played} / 1.315 trận · ${r.dirty ? "Có tiến trình trên thiết bị" : "Đã lưu"}</p>${r.podium.length ? `<div class="season-medals">${r.podium.map((id, i) => `<div>${["🥇", "🥈", "🥉"][i]} ${team(id)}</div>`).join("")}</div>` : ""}<button class="primary" data-action="Full.open" data-arg="${r.season_id}">${r.status === "completed" ? "Xem tổng kết" : "Tiếp tục giải đấu"} →</button></article>`).join("")}</div>` : '<div class="panel full-empty"><h3>Sẵn sàng cho một mùa bóng chuyền trọn vẹn?</h3><p>Mỗi khu vực đánh vòng tròn một lượt. Không có playoff khu vực, không tùy chỉnh đội hoặc suất dự giải.</p><p>Giải thế giới chỉ mở khi cả 5 giải khu vực hoàn tất.</p></div>'}`;
}
export function overviewHtml(s: FullSeason) {
  const done = F.regionOrder.filter((r) =>
    F.fullLeagueDone(s.regions[r]),
  ).length;
  return `<div class="full-format-grid">${F.regionOrder
    .map((r) => {
      const g = s.regions[r],
        played = F.leagueMatches(g).filter((m) => m.sets).length,
        total = (g.teamIds.length * (g.teamIds.length - 1)) / 2,
        complete = F.fullLeagueDone(g);
      return `<section class="panel full-region-summary"><span class="eyebrow">${names[r]}</span><strong>${g.teamIds.length} đội · Top ${F.worldSlots[r]}</strong><p class="sub">${played}/${total} trận · ${complete ? "Đã hoàn tất" : "League phase"}</p><div class="progress"><i style="width:${(played / total) * 100}%"></i></div>${complete ? `<p>🏆 ${team(F.fullStandings(g)[0].id)}</p>` : ""}<button data-action="Full.section" data-arg="${r}">${complete ? "Xem kết quả" : "Thi đấu khu vực"} →</button></section>`;
    })
    .join(
      "",
    )}</div><section class="panel full-world-gate"><div><span class="eyebrow">WORLD CHAMPIONSHIP · 24 ĐỘI</span><h3>${s.world ? "Giải thế giới" : "Hoàn tất khu vực để mở giải thế giới"}</h3><p class="sub">${done}/5 giải khu vực hoàn tất. Cần hoàn tất mọi trận, kể cả khi các vé đã được xác định sớm.</p></div>${s.world ? '<button class="primary" data-action="Full.section" data-arg="world">Vào giải thế giới →</button>' : `<button class="primary" data-action="Full.drawWorld" ${done < 5 ? "disabled" : ""}>Bốc thăm & bắt đầu thế giới</button>`}</section>${F.worldComplete(s) ? summaryHtml(s) : ""}`;
}
export function worldHtml(s: FullSeason) {
  const w = s.world;
  if (!w) return overviewHtml(s);
  const all = w.groups.every(F.fullLeagueDone);
  return `<div class="section-head"><div><h3>Vòng bảng thế giới</h3><p class="sub">6 bảng × 4 đội · mỗi nhóm hạt giống một đội/bảng · tối đa 2 đội cùng khu vực.</p></div>${w.bracket ? '<button class="primary" data-action="Full.section" data-arg="playoff">Xem playoff →</button>' : `<button class="primary" data-action="Full.drawPlayoff" ${all ? "" : "disabled"}>Bốc thăm playoff 16 đội</button>`}</div><div class="full-groups">${w.groups
    .map(
      (g, i) =>
        `<section class="panel full-group"><div class="section-head"><h3>Bảng ${"ABCDEF"[i]}</h3><span class="badge">${F.leagueMatches(g).filter((m) => m.sets).length}/6 trận</span></div>${F.fullStandings(
          g,
        )
          .map(
            (t, j) =>
              `<div class="full-group-team"><span>#${j + 1}</span>${team(t.id)}<span class="badge">S${w.pots.findIndex((p) => p.includes(t.id)) + 1}</span><b>${t.w}W · ${t.l}L</b></div>`,
          )
          .join(
            "",
          )}<button data-action="Full.section" data-arg="WG${i}">Lịch & BXH bảng →</button></section>`,
    )
    .join(
      "",
    )}</div><section class="panel full-thirds"><h3>Cuộc đua 4 suất hạng ba</h3><p class="sub">${all ? "Kết quả chính thức" : "Tạm tính; chỉ chốt khi cả 6 bảng hoàn tất"} · thắng → HS set → HS điểm → bốc thăm đã lưu.</p><div class="table-wrap"><table><thead><tr><th>#</th><th>ĐỘI</th><th>BẢNG</th><th>W</th><th>HS SET</th><th>HS ĐIỂM</th><th>TRẠNG THÁI</th></tr></thead><tbody>${F.worldThirds(
    w,
  )
    .map(
      (t, i) =>
        `<tr class="${i < 4 ? "direct" : ""}"><td>${i + 1}</td><td>${team(t.id)}</td><td>${"ABCDEF"[t.group]}</td><td>${t.w}</td><td>${t.sf - t.sa}</td><td>${t.pf - t.pa}</td><td>${i < 4 ? (all ? "Đi tiếp" : "Top dự kiến") : all ? "Bị loại" : "Ngoài top 4"}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div></section><details class="panel full-pots"><summary>4 nhóm hạt giống</summary><div class="full-groups">${w.pots.map((p, i) => `<section><h4>Seed ${i + 1}</h4>${p.map((id) => `<p>${team(id)} <small>#${get(id).rank} thế giới</small></p>`).join("")}</section>`).join("")}</div></details>`;
}
export function leagueHtml(
  s: FullSeason,
  g: FullLeague,
  label: string,
  slots: number,
  readonly: boolean,
) {
  const round = Math.min(fullModel.round, g.rounds.length - 1),
    matches = g.rounds[round],
    done = matches.every((m) => m.sets),
    region = F.regionOrder.find((r) => s.regions[r] === g),
    locked = readonly || (region ? !!s.world : !!s.world?.bracket),
    bye = g.teamIds.filter(
      (id) => !matches.some((m) => m.a === id || m.b === id),
    );
  return `<div class="section-head"><div><h3>${label}</h3><p class="sub">${g.teamIds.length} đội · ${g.rounds.length} vòng · ${slots ? `Top ${slots} giành vé khi hoàn tất` : "Hai đội đầu bảng và xét đội hạng ba"}</p></div><div class="controls"><select data-action="Full.round" data-trigger="change" aria-label="Chọn vòng Full Season">${g.rounds.map((r, i) => `<option value="${i}" ${i === round ? "selected" : ""}>Vòng ${i + 1}${r.every((m) => m.sets) ? " ✓" : ""}</option>`).join("")}</select>${locked ? '<span class="badge">CHỈ XEM · KẾT QUẢ ĐÃ KHÓA</span>' : `${done ? `<button class="primary" data-action="Full.next">${round === g.rounds.length - 1 ? "Về tổng quan" : "Qua vòng tiếp theo →"}</button>` : `<button class="primary" data-action="Full.simRound">Chạy vòng ${round + 1}</button>`}<button data-action="Full.simLeague" ${F.fullLeagueDone(g) ? "disabled" : ""}>Chạy hết league này</button>`}</div></div>${bye.length ? `<div class="notice">Nghỉ vòng ${round + 1}: ${bye.map((id) => team(id)).join("")}. Không tính trận thắng/thua.</div>` : ""}<div class="grid">${matches.map((m) => fullCard(s, m, locked)).join("")}</div><details class="panel full-league-table" open><summary>BXH ${label}</summary>${fullStandingsTable(g, slots)}</details>`;
}
export const stageNames: Record<WorldStage, string> = {
  r16: "Vòng 16 đội",
  qf: "Tứ kết",
  sf: "Bán kết",
  final: "Chung kết",
  bronze: "Tranh hạng ba",
};
export function fullPodiumHtml(s: FullSeason) {
  const b = s.world?.bracket;
  if (!b?.final.length || !b.bronze.length) return "";
  return medalPodiumHtml(
    [
      b.final[0].sets ? winner(b.final[0]) : null,
      b.final[0].sets ? loser(b.final[0]) : null,
      b.bronze[0].sets ? winner(b.bronze[0]) : null,
    ],
    (id) => team(id),
  );
}
export function playoffHtml(s: FullSeason, readonly: boolean) {
  const b = s.world?.bracket;
  if (!b) return worldHtml(s);
  const stage = (k: WorldStage) =>
    `<section class="full-bracket-stage" data-world-stage="${k}"><div class="section-head"><h3>${stageNames[k]}</h3>${!readonly && b[k].some((m) => !m.sets) ? `<button data-action="Full.stage" data-arg="${k}">Chạy vòng</button>` : ""}</div>${b[k].length ? b[k].map((m, i) => `<div class="full-bracket-slot"><span class="eyebrow">${k === "r16" ? `Nhánh ${"ABCD"[Math.floor(i / 2)]}` : `Trận ${i + 1}`}</span>${fullCard(s, m, readonly)}</div>`).join("") : '<div class="panel full-empty">Chờ kết quả vòng trước.</div>'}</section>`;
  const next = F.worldPlayOrder.find((k) => b[k].some((m) => !m.sets));
  return `${F.worldComplete(s) ? summaryHtml(s) : fullPodiumHtml(s)}<div class="section-head"><div><h3>Playoff thế giới</h3><p class="sub">Nhánh cố định sau bốc thăm · tranh hạng ba trước chung kết.</p></div>${!readonly && next ? `<button class="primary" data-action="Full.stage" data-arg="${next}">Mô phỏng ${stageNames[next].toLowerCase()} →</button>` : ""}</div><div class="full-bracket">${(["r16", "qf", "sf"] as WorldStage[]).map(stage).join("")}<div class="full-bracket-medals">${stage("final")}${stage("bronze")}</div></div>`;
}
export function summaryHtml(s: FullSeason) {
  const placements = F.worldPlacements(s);
  return `<section class="full-season-summary"><div class="podium-grid">${F.worldPodium(
    s,
  )
    .map(
      (id, i) =>
        `<div class="panel medal-card place-${i + 1}"><span>${["🥇", "🥈", "🥉"][i]}</span><small>${["VÔ ĐỊCH THẾ GIỚI", "Á QUÂN", "HẠNG BA"][i]}</small><h3>${team(id)}</h3></div>`,
    )
    .join(
      "",
    )}</div><details class="panel full-finals-table" open><summary>Thành tích 24 đội tại giải thế giới</summary><div class="table-wrap"><table><thead><tr><th>THỨ HẠNG</th><th>ĐỘI TUYỂN</th><th>VÒNG DỪNG CHÂN</th></tr></thead><tbody>${Object.entries(
    placements,
  )
    .sort((a, b) => a[1].from - b[1].from || get(a[0]).rank - get(b[0]).rank)
    .map(
      ([id, p]) =>
        `<tr><td>${p.from === p.to && p.from <= 3 ? ["🥇", "🥈", "🥉"][p.from - 1] : p.from === p.to ? `#${p.from}` : `#${p.from}–#${p.to}`}</td><td>${team(id)}</td><td>${p.stage}</td></tr>`,
    )
    .join("")}</tbody></table></div></details></section>`;
}
export function selectedHeader(s: FullSeason) {
  const row = selectedFull()!,
    readOnly = row.status === "completed";
  return `<div class="section-head"><div><span class="eyebrow">FULL SEASON · ${readOnly ? "ĐÃ HOÀN TẤT · CHỈ XEM" : "ĐANG DIỄN RA"}</span><h2>Mùa ${s.seasonNumber}</h2><p class="sub">${F.fullMatches(s).filter((m) => m.sets).length}/1.315 trận · 100 đội · 5 khu vực</p></div><div class="controls"><button data-action="Full.library">← Các mùa Full Season</button><button data-action="Full.exportOne">Xuất mùa này</button>${readOnly ? "" : '<button data-action="Full.restore">Khôi phục bản trước</button><button data-action="Full.finish">Mô phỏng hết mùa</button>'}</div></div><nav class="full-nav">${[["overview", "Tổng quan"], ...F.regionOrder.map((r) => [r, names[r]]), ["world", "Thế giới"], ["playoff", "Playoff"]].map(([key, label]) => `<button class="${fullModel.section === key || (key === "world" && fullModel.section.startsWith("WG")) ? "active" : ""}" data-action="Full.section" data-arg="${key}" ${(key === "world" && !s.world) || (key === "playoff" && !s.world?.bracket) ? "disabled" : ""}>${label}</button>`).join("")}</nav>`;
}
export function fullStatusHtml() {
  const row = selectedFull(),
    conflict = row?.phase === "conflict";
  return `${fullModel.loading ? '<p class="sub" role="status">Đang tải lịch sử Full Season…</p>' : ""}${fullModel.error ? `<div class="notice" role="status">${esc(fullModel.error)} <button data-action="Full.sync">Thử đồng bộ lại</button></div>` : ""}${conflict ? '<div class="notice"><b>Có tiến trình khác trên cloud.</b><p>Xuất mùa hiện tại trước khi thay bản nếu bạn muốn giữ cả hai.</p><button data-action="Full.remote">Dùng bản online</button><button data-action="Full.local">Giữ bản thiết bị</button></div>' : ""}`;
}
