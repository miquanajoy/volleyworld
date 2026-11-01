import { swissTreeHtml } from "./swiss-tree";
import * as C from "../../domain/challenger/index";
import type { Match } from "../../domain/types";
import { seasonTeam, seasonMatchCard } from "../../components/season-match";
import { team } from "../../components/team";
import { medalPodiumHtml } from "../../components/podium";
import { seasonMatchDetailHtml } from "../../components/season-match-detail";
import { winner, loser } from "../../domain/match/scoring";
import { esc } from "../../shared/dom";
import { connectedPlayoffTree } from "../full-season/playoff-tree";
import { model, selected } from "./model";
export const readonly = () =>
  selected()?.status === "completed" || selected()?.phase === "conflict";
export const teamLine = (s: C.ChallengerSeason, id: string, through?: number) =>
  seasonTeam(
    id,
    through === undefined
      ? C.challengerMatches(s)
      : s.rounds.slice(0, through + 1).flat(),
    C.challengerStandings(s, through).findIndex((r) => r.id === id) + 1,
  );
const status = (w: number, l: number) =>
  w === 3
    ? '<span class="full-qualification" data-swiss-status="qualified">✓ Vào playoff</span>'
    : l === 3
      ? '<span class="swiss-eliminated" data-swiss-status="eliminated">Đã bị loại</span>'
      : `<span class="swiss-record">${w}–${l}</span>`;
export function statusHtml() {
  const row = selected();
  return `${model.loading ? '<p class="notice">Đang đồng bộ Challenger…</p>' : ""}${model.error ? `<p class="notice">${esc(model.error)} <button data-action="Challenger.sync">Thử lại</button></p>` : ""}${row?.phase === "conflict" ? '<div class="notice"><b>Có tiến trình khác trên thiết bị khác.</b><p>Xuất bản thiết bị trước khi chọn bản cần giữ.</p><button data-action="Challenger.remote">Dùng bản online</button><button data-action="Challenger.local">Giữ bản thiết bị</button><button data-action="Challenger.export">Xuất lịch sử</button></div>' : ""}`;
}
export function libraryHtml() {
  return `<section class="challenger-hero"><div><span class="eyebrow">32 ĐỘI · SWISS STAGE</span><h2>VolleyWorld Challenger</h2><p>Ba trận thắng để bước tiếp.<br>Ba trận thua để dừng cuộc chơi.</p><div class="actions"><button class="primary" data-action="Challenger.create">Bắt đầu Challenger mới →</button><button data-action="navigate" data-arg="home">← Trang chủ</button></div></div><div class="challenger-hero-numbers"><strong>3<span>W</span></strong><small>16 VÉ PLAYOFF · 82 TRẬN MỖI MÙA</small></div></section><div class="full-library-toolbar"><button data-action="Challenger.export">Xuất lịch sử</button><button data-action="Challenger.import">Nhập lịch sử</button><button data-action="Challenger.sync">Đồng bộ lịch sử</button></div>${rulesHtml(false)}<div class="section-head"><h3>Các mùa Challenger</h3><span class="badge">${model.records.length} mùa</span></div><div class="season-grid">${model.records.map((r) => `<section class="panel season-card"><span class="eyebrow">CHALLENGER · MÙA ${r.season_number}</span><h3>${r.status === "completed" ? "Đã hoàn tất" : r.played ? "Đang thi đấu" : "Sẵn sàng bắt đầu"}</h3><p class="sub">${r.played}/82 trận · ${r.phase === "conflict" ? "Cần chọn bản lưu" : r.dirty ? "Đã giữ trên thiết bị" : "Đã lưu"}</p>${r.podium.length ? `<div class="challenger-history-medals">${r.podium.map((id, i) => `<p>${["🥇", "🥈", "🥉"][i]} ${team(id)}</p>`).join("")}</div>` : ""}<button class="primary" data-action="Challenger.open" data-arg="${r.season_id}">${r.status === "completed" ? "Xem tổng kết" : r.played ? "Tiếp tục giải đấu" : "Bắt đầu giải đấu"} →</button></section>`).join("") || '<section class="panel full-empty"><h3>Một hành trình mới đang chờ</h3><p>Chọn 32 đội từ toàn bộ danh sách, với đối thủ được bốc thăm lại theo thành tích sau mỗi vòng.</p></section>'}</div>`;
}
export function headerHtml(s: C.ChallengerSeason) {
  return `<div class="section-head"><div><span class="eyebrow">VOLLEYWORLD CHALLENGER</span><h2>Mùa ${s.seasonNumber}${C.challengerComplete(s) ? " · Đã hoàn tất" : ""}</h2><p class="sub">${C.challengerMatches(s).filter((m) => m.sets).length}/82 trận · ${readonly() ? "Chỉ xem" : "Tự động lưu trên thiết bị"}</p></div><div class="controls"><button data-action="Challenger.enter">← Các mùa</button><button data-action="Challenger.exportOne">Xuất mùa này</button>${!readonly() && !C.challengerMatches(s).some((m) => m.sets) ? '<button data-action="Challenger.editRoster">Chọn đội tham dự</button>' : ""}${readonly() ? "" : '<button data-action="Challenger.restore">Khôi phục bản trước</button><button data-action="Challenger.finish">Mô phỏng hết mùa</button>'}</div></div><nav class="full-nav">${[
    ["overview", "Tổng quan"],
    ["swiss", "Swiss Stage"],
    ["table", "Bảng xếp hạng"],
    ["playoff", "Nhánh playoff"],
    ["rules", "Thể thức"],
  ]
    .map(
      ([key, label]) =>
        `<button data-action="Challenger.section" data-arg="${key}" class="${model.section === key ? "active" : ""}">${label}</button>`,
    )
    .join("")}</nav>`;
}
function roundsHtml(s: C.ChallengerSeason) {
  return `<div class="swiss-round-nav" aria-label="Chọn vòng Swiss">${Array.from({ length: 5 }, (_, i) => `<button data-action="Challenger.round" data-arg="${i}" ${i >= s.rounds.length ? "disabled" : ""} aria-pressed="${model.round === i}">Vòng ${i + 1}${s.rounds[i]?.every((m) => m.sets) ? " ✓" : ""}</button>`).join("")}</div>`;
}
function nextHtml(s: C.ChallengerSeason) {
  const last = model.round === s.rounds.length - 1,
    done = s.rounds[model.round].every((m) => m.sets);
  return `<div class="controls">${!readonly() && !done ? `<button class="primary" data-action="Challenger.simRound">Chạy vòng ${model.round + 1}</button>` : ""}${done ? `<button class="primary" data-action="Challenger.next">${!last ? "Xem vòng tiếp theo →" : C.swissDone(s) ? "Qua giai đoạn playoff →" : readonly() ? "Swiss đã hoàn tất" : "Bốc thăm vòng tiếp theo →"}</button>` : ""}</div>`;
}
export function tableHtml(s: C.ChallengerSeason, summary = false) {
  const round = summary ? s.rounds.length - 1 : model.round,
    rows = C.challengerStandings(s, round);
  return `${summary ? "" : roundsHtml(s)}<div class="section-head"><div><h3>BXH Swiss · Vòng ${round + 1}</h3><p class="sub">Theo kết quả đến vòng đang xem. W → L → OMW% → HS set → HS điểm → bốc thăm đã lưu.</p></div>${summary ? "" : nextHtml(s)}</div><div class="table-wrap"><table class="full-standings swiss-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>W</th><th>L</th><th title="Trung bình tỷ lệ thắng của các đối thủ đã gặp, chỉ tính đến vòng đang xem">OMW%</th><th>HS SET</th><th>HS ĐIỂM</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.w === 3 ? "direct" : ""}"><td>${i + 1}</td><td>${seasonTeam(r.id, s.rounds.slice(0, round + 1).flat())}</td><td><b>${r.w}</b></td><td>${r.l}</td><td>${(r.omw * 100).toFixed(1)}%</td><td>${r.sf - r.sa}</td><td>${r.pf - r.pa}</td><td>${status(r.w, r.l)}</td><td><button data-action="Challenger.team" data-arg="${r.id}" data-arg1="${round}" aria-label="Xem các trận của ${esc(r.name)}">Chi tiết ↗</button></td></tr>`).join("")}</tbody></table></div>`;
}
export function swissHtml(s: C.ChallengerSeason) {
  const r = model.round,
    atStart = C.challengerStandings(s, r - 1),
    groups = new Map<string, Match[]>();
  for (const m of s.rounds[r]) {
    const t = atStart.find((t) => t.id === m.a)!,
      key = `${t.w}–${t.l}`;
    groups.set(key, [...(groups.get(key) || []), m]);
  }
  return `${roundsHtml(s)}<div class="section-head"><div><h3>Swiss Stage · Vòng ${r + 1}</h3><p class="sub">${r === 0 ? "Khác khu vực · Có chia hạt giống" : "Cùng W–L gặp nhau"} · Không tái đấu · Tất cả BO5.</p></div>${nextHtml(s)}</div><div class="swiss-view-switch" role="group" aria-label="Giao diện Swiss"><button data-action="Challenger.swissView" data-arg="tree" aria-pressed="${model.swissView === "tree"}">Sơ đồ nhánh</button><button data-action="Challenger.swissView" data-arg="matches" aria-pressed="${model.swissView === "matches"}">Danh sách trận</button></div>${model.swissView === "tree" ? swissTreeHtml(s, r) : [...groups].map(([record, matches]) => `<section class="swiss-score-group"><div class="section-head"><h3>Nhóm ${record}</h3><span class="badge">${matches.length} trận${record.startsWith("2") ? " · Tranh vé playoff" : ""}${record.endsWith("2") ? " · Trận sinh tử" : ""}</span></div><div class="grid">${matches.map((m) => seasonMatchCard(m, (id) => teamLine(s, id, r), "Challenger", readonly() || C.challengerLocked(s, m), `Vòng ${r + 1} · Nhóm ${record}`)).join("")}</div></section>`).join("")}`;
}
function podiumHtml(s: C.ChallengerSeason) {
  const b = s.bracket;
  if (!b?.final.length) return "";
  return medalPodiumHtml(
    [
      b.final[0]?.sets ? winner(b.final[0]) : null,
      b.final[0]?.sets ? loser(b.final[0]) : null,
      b.bronze[0]?.sets ? winner(b.bronze[0]) : null,
    ],
    (id) => team(id),
    !C.challengerComplete(s),
  );
}
function treeHtml(s: C.ChallengerSeason) {
  return s.bracket
    ? connectedPlayoffTree(s.bracket, readonly(), (id) => teamLine(s, id), {
        prefix: "Challenger",
        label: "Nhánh playoff Challenger",
      })
    : "";
}
export function playoffHtml(s: C.ChallengerSeason) {
  return s.bracket
    ? `${podiumHtml(s)}${treeHtml(s)}`
    : `<section class="panel full-empty"><h3>Playoff · 16 đội</h3><p>4 đội 3–0, 6 đội 3–1 và 6 đội 3–2. Chia seed theo nhóm thành tích, bốc thăm trong cùng nhóm; sau đó giữ nguyên nhánh.</p><button class="primary" data-action="Challenger.draw" ${!C.swissDone(s) || readonly() ? "disabled" : ""}>Bốc thăm playoff</button>${!C.swissDone(s) ? '<p class="sub">Hoàn tất cả 5 vòng Swiss để mở bốc thăm.</p>' : ""}</section>`;
}
export function overviewHtml(s: C.ChallengerSeason) {
  if (C.challengerComplete(s))
    return `${podiumHtml(s)}<section class="panel"><div class="section-head"><h3>Thành tích cuối mùa</h3><span class="badge">82 TRẬN · HOÀN TẤT</span></div><div class="table-wrap"><table><thead><tr><th>THỨ HẠNG</th><th>ĐỘI TUYỂN</th><th>VÒNG DỪNG CHÂN</th></tr></thead><tbody>${C.challengerPlacements(
      s,
    )
      .map(
        (p) =>
          `<tr><td>${p.from <= 3 ? ["🥇", "🥈", "🥉"][p.from - 1] : p.from === p.to ? `#${p.from}` : `#${p.from}–#${p.to}`}</td><td>${team(p.id)}</td><td>${p.stage}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div></section><details class="panel"><summary>Nhánh playoff</summary>${treeHtml(s)}</details><details class="panel"><summary>BXH Swiss cuối cùng</summary>${tableHtml(s, true)}</details>`;
  const rows = C.challengerStandings(s),
    qualified = rows.filter((r) => r.w === 3),
    eliminated = rows.filter((r) => r.l === 3);
  return `<section class="challenger-hero challenger-season-hero"><div><span class="eyebrow">${s.bracket ? "PLAYOFF · 16 ĐỘI" : "SWISS STAGE"}</span><h2>${s.bracket ? "Chinh phục ngôi vô địch" : C.swissDone(s) ? "Đã tìm ra 16 đội đi tiếp" : `Vòng ${s.rounds.length} · Mọi trận đều có ý nghĩa`}</h2><p>${qualified.length}/16 đội có vé playoff · ${eliminated.length}/16 đội đã bị loại.</p><button class="primary" data-action="Challenger.section" data-arg="${s.bracket || C.swissDone(s) ? "playoff" : "swiss"}">${s.bracket ? "Vào nhánh playoff" : C.swissDone(s) ? "Bốc thăm playoff" : "Tiếp tục Swiss Stage"} →</button></div><div class="challenger-hero-numbers"><strong>${qualified.length}<span>/16</span></strong><small>VÉ PLAYOFF ĐÃ XÁC ĐỊNH</small></div></section><div class="swiss-qualified-grid">${[
    ["Đã vào playoff", qualified],
    ["Đã bị loại", eliminated],
  ]
    .map(
      ([label, list]) =>
        `<section class="panel"><h3>${label}</h3><div class="swiss-team-list">${(list as typeof rows).map((r) => `<div>${team(r.id)}<b>${r.w}–${r.l}</b></div>`).join("") || '<p class="sub">Chưa có đội nào.</p>'}</div></section>`,
    )
    .join("")}</div>`;
}
export function rulesHtml(open = true) {
  return `<details class="panel challenger-rules" ${open ? "open" : ""}><summary>Thể thức VolleyWorld Challenger</summary><p>Chọn 32 đội từ toàn bộ danh sách trước khi bắt đầu; giữ ít nhất 2 đội mỗi khu vực và không quá 16 đội cùng khu vực. Swiss 5 vòng tối đa, tổng cộng 66 trận. Mỗi đội chơi 3–5 trận; đủ 3 thắng vào playoff, đủ 3 thua bị loại.</p><p>Vòng đầu: 16 đội mạnh gặp 16 đội còn lại, bốc thăm theo BXH thế giới và không gặp đội cùng khu vực. Các vòng sau ghép ngẫu nhiên đội cùng W–L, có thể gặp đội cùng khu vực. Không tái đấu trong toàn bộ Swiss. Chỉ bốc thăm vòng sau khi vòng hiện tại đã xong; kết quả vòng trước sẽ khóa sau bốc thăm.</p><p>BXH hiển thị: số trận thắng giảm dần → số trận thua tăng dần → OMW% (trung bình tỷ lệ thắng của đối thủ đã gặp) → hiệu số set → hiệu số điểm → thứ tự bốc thăm lưu từ đầu mùa. OMW% và BXH vòng cũ chỉ dùng kết quả đến vòng đang xem.</p><p>Playoff có 4 đội 3–0, 6 đội 3–1 và 6 đội 3–2. Ưu tiên seed theo ba nhóm này, bốc thăm trong cùng nhóm, ghép seed 1–16, 8–9, 4–13, 5–12, 2–15, 7–10, 3–14, 6–11; sau đó nhánh cố định. Tranh hạng ba trước chung kết.</p><p>Tất cả BO5: set 1–4 đến 25, set 5 đến 15, phải hơn 2 điểm. Cả mùa có 82 trận. Nhập điểm, mô phỏng từng set và tạo tỷ số theo ý đều dùng chung với các giải khác.</p></details>`;
}
export function detailHtml(s: C.ChallengerSeason, m: Match) {
  const r = s.rounds.findIndex((row) => row.includes(m)),
    label =
      r >= 0
        ? `Swiss Stage · Vòng ${r + 1}`
        : Object.entries(s.bracket || {}).find(([, row]) =>
            row.includes(m),
          )?.[0] || "Playoff";
  return seasonMatchDetailHtml(m, readonly() || C.challengerLocked(s, m), {
    edition: `CHALLENGER · MÙA ${s.seasonNumber}`,
    label,
    prefix: "Challenger",
    renderTeam: (id) => teamLine(s, id),
    lockMessage:
      selected()?.phase === "conflict"
        ? "Cần xử lý xung đột trước khi tiếp tục."
        : C.challengerComplete(s)
          ? "Mùa đã hoàn tất · Chỉ xem kết quả"
          : s.bracket?.final.includes(m) && !s.bracket.bronze[0]?.sets
            ? "Hoàn tất trận tranh hạng ba để mở chung kết."
            : "Kết quả đã khóa vì vòng tiếp theo đã bốc thăm.",
  });
}
