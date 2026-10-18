import * as N from "../../domain/nations-league/index";
import { fullStandings } from "../../domain/full-season/league";
import {
  leagueRoundSnapshot,
  rankChanges,
} from "../../domain/league/round-standings";
import {
  rankMovementHtml,
  rankMovementLegend,
} from "../../components/rank-movement";
import { seasonTeam, seasonMatchCard } from "../../components/season-match";
import { medalPodiumHtml } from "../../components/podium";
import { team } from "../../components/team";
import { score, winner, loser } from "../../domain/match/scoring";
import type { Match } from "../../domain/types";
import { regionOrder } from "../../domain/full-season/types";
import { get, regionTeams } from "../../data/teams";
import { esc, names } from "../../shared/dom";
import { connectedPlayoffTree } from "../full-season/playoff-tree";
import {
  nationsModel as model,
  selected,
  campaignName,
  type NationsRecord,
} from "./model";
export const stageNames = {
  qf: "Tứ kết",
  sf: "Bán kết",
  bronze: "Tranh hạng ba",
  final: "Chung kết",
};
export const readonly = () =>
  selected()?.status === "completed" || selected()?.phase === "conflict";
export function nationsTeam(
  s: N.NationsSeason,
  id: string,
  matches = N.nationsMatches(s),
  round?: number,
) {
  const g = N.nationsGroups(s).find((g) => g.teamIds.includes(id));
  return seasonTeam(
    id,
    matches,
    g
      ? fullStandings(
          round === undefined ? g : leagueRoundSnapshot(g, round),
        ).findIndex((t) => t.id === id) + 1
      : 0,
  );
}
export function card(s: N.NationsSeason, m: Match, round?: number) {
  const matches =
    round === undefined
      ? N.nationsMatches(s)
      : N.nationsGroups(s).flatMap((g) =>
          leagueRoundSnapshot(g, round).rounds.flat(),
        );
  return seasonMatchCard(
    m,
    (id) => nationsTeam(s, id, matches, round),
    "Nations",
    readonly() || N.nationsMatchLocked(s, m),
  );
}
export function statusHtml() {
  const row = selected();
  return `${model.loading ? '<p class="notice">Đang đồng bộ lịch sử Nations League…</p>' : ""}${model.error ? `<p class="notice">${esc(model.error)} <button data-action="Nations.sync">Thử lại</button></p>` : ""}${row?.phase === "conflict" ? '<div class="notice"><b>Có bản lưu khác trên thiết bị khác.</b><p>Xuất bản trên thiết bị trước khi chọn bản cần giữ.</p><button data-action="Nations.remote">Dùng bản online</button><button data-action="Nations.local">Giữ bản thiết bị</button><button data-action="Nations.export">Xuất lịch sử</button></div>' : ""}`;
}
export function libraryHtml() {
  const campaigns = [...new Set(model.records.map((r) => r.campaign_id))];
  return `<div class="section-head"><div><span class="eyebrow">NATIONS LEAGUE · 64 QUỐC GIA</span><h2>VolleyWorld Nations League</h2><p class="sub">Bốn hạng đấu. Sáu lượt trận. Lên hạng, trụ hạng và tranh ngôi vô địch qua từng mùa.</p><p class="sub">Chọn Tiếp tục / Tạo mùa kế tiếp trong chuỗi để kế thừa lên/xuống hạng. Chuỗi độc lập mới bắt đầu lại từ mùa 1.</p></div><div class="controls"><button data-action="navigate" data-arg="home">← Trang chủ</button><button class="${campaigns.length ? "" : "primary"}" data-action="Nations.create">Tạo chuỗi độc lập mới</button></div></div><div class="full-format-grid nations-format">${N.tiers.map((t) => `<section class="panel full-region-summary"><span class="eyebrow">DIVISION ${t}</span><strong>16 đội · 4 bảng</strong><span>${t === "A" ? "Top 2 mỗi bảng → playoff 8 đội" : "Nhất mỗi bảng → lên hạng"}${t === "D" ? "" : " · Cuối bảng xuống hạng"}</span></section>`).join("")}</div>${rulesHtml(false)}<div class="full-library-toolbar"><button data-action="Nations.export">Xuất lịch sử Nations League</button><button data-action="Nations.import">Nhập lịch sử</button><button data-action="Nations.honours">Thành tích</button><button data-action="Nations.sync">Đồng bộ lịch sử</button></div>${
    campaigns.length
      ? `<div class="section-head"><div><h3>Các mùa Nations League</h3><p class="sub">${model.records.length} mùa · ${campaigns.length} chuỗi độc lập. Chọn mùa kế tiếp trong cùng chuỗi để giữ lên/xuống hạng.</p></div></div><div class="season-grid nations-season-grid">${[
          ...model.records,
        ]
          .sort((a, b) => a.season_number - b.season_number)
          .map(seasonCardHtml)
          .join("")}</div>`
      : '<section class="panel full-empty"><h3>Bắt đầu hành trình Nations League</h3><p>Tạo một chuỗi mùa để chinh phục Division A. Bạn cũng có thể tạo chuỗi độc lập khi một chuỗi khác đang diễn ra.</p></section>'
  }`;
}
export function headerHtml(s: N.NationsSeason) {
  return `<div class="section-head"><div><span class="eyebrow">NATIONS LEAGUE · ${campaignName(s.campaignId).toUpperCase()}</span><h2>Mùa ${s.cycleNumber}${N.nationsComplete(s) ? " · Đã hoàn tất" : ""}</h2><p class="sub">${N.nationsMatches(s).filter((m) => m.sets).length}/200 trận · ${readonly() ? "Chỉ xem" : "Tự động lưu trên thiết bị"}</p></div><div class="controls"><button data-action="Nations.library">← Các mùa</button><button data-action="Nations.exportOne">Xuất chuỗi này</button>${!readonly() ? '<button data-action="Nations.restore">Khôi phục bản trước</button><button data-action="Nations.finish">Mô phỏng hết mùa</button>' : ""}</div></div><nav class="full-nav">${[
    ["overview", "Tổng quan"],
    ["groups", "Vòng bảng"],
    ["playoff", "Nhánh playoff"],
    ["rules", "Thể thức"],
  ]
    .map(
      ([key, label]) =>
        `<button data-action="Nations.section" data-arg="${key}" ${model.section === key || (key === "groups" && /^[ABCD](G[0-3])?$/.test(model.section)) ? 'class="active"' : ""}>${label}</button>`,
    )
    .join("")}</nav>`;
}
export function toolbar(s: N.NationsSeason) {
  const r = Math.min(model.round, N.nationsCurrentRound(s)),
    done = N.nationsRoundMatches(s, r).every((m) => m.sets),
    locked = readonly() || !!s.playoff;
  return `<section class="panel full-world-round-controls" data-nations-round="${r}"><div><span class="eyebrow">LƯỢT ĐẤU CHUNG · 16 BẢNG</span><h3>Vòng ${r + 1} / 6</h3><p class="sub">${N.nationsRoundMatches(s, r).filter((m) => m.sets).length}/32 trận · hoàn tất cả bốn Division để qua vòng mới.</p></div><div class="controls"><label>Chọn vòng <select aria-label="Chọn vòng Nations League" data-action="Nations.round" data-trigger="change">${[0, 1, 2, 3, 4, 5].map((i) => `<option value="${i}" ${i === r ? "selected" : ""} ${i > N.nationsCurrentRound(s) ? "disabled" : ""}>Vòng ${i + 1}${N.nationsRoundMatches(s, i).every((m) => m.sets) ? " ✓" : ""}</option>`).join("")}</select></label>${locked ? (s.playoff ? '<button data-action="Nations.section" data-arg="playoff">Xem playoff →</button>' : "") : done ? (r < 5 ? '<button class="primary" data-action="Nations.next">Qua vòng tiếp theo →</button>' : '<button class="primary" data-action="Nations.draw">Bốc thăm playoff →</button>') : `<button class="primary" data-action="Nations.simRound">Chạy vòng ${r + 1} · cả 16 bảng</button>`}</div></section>`;
}
export function overviewHtml(s: N.NationsSeason) {
  if (N.nationsComplete(s)) return summaryHtml(s);
  return `${transferSummaryHtml(s)}${toolbar(s)}<div class="full-format-grid nations-format">${N.tiers.map((t) => `<section class="panel full-region-summary"><span class="eyebrow">DIVISION ${t}</span><strong>16 đội · 4 bảng</strong><p class="sub">${s.divisions[t].groups.flatMap((g) => g.rounds.flat()).filter((m) => m.sets).length}/48 trận</p><button data-action="Nations.section" data-arg="${t}">Xem lịch & BXH →</button></section>`).join("")}</div>${s.playoff ? '<section class="panel full-world-gate"><h3>Playoff Division A</h3><button class="primary" data-action="Nations.section" data-arg="playoff">Vào nhánh đấu →</button></section>' : ""}`;
}
export function groupsHtml(s: N.NationsSeason) {
  const round = Math.min(model.round, N.nationsCurrentRound(s));
  const selectedTier = N.tiers.includes(model.section as N.Tier)
    ? (model.section as N.Tier)
    : (model.section.match(/^([ABCD])G[0-3]$/)?.[1] as N.Tier | undefined);
  const groupIndex = /^[ABCD]G[0-3]$/.test(model.section)
    ? Number(model.section.at(-1))
    : undefined;
  return `<section class="panel nations-navigation" aria-label="Điều hướng vòng bảng"><div class="nations-nav-row"><span class="nations-nav-label">Hạng đấu</span><nav class="full-group-nav" aria-label="Chọn Division"><button data-action="Nations.section" data-arg="groups" aria-current="${!selectedTier ? "page" : "false"}">Tất cả Division</button>${N.tiers.map((t) => `<button data-action="Nations.section" data-arg="${t}" aria-current="${selectedTier === t ? "page" : "false"}">Division ${t}</button>`).join("")}</nav></div>${selectedTier ? `<div class="nations-nav-row"><span class="nations-nav-label">Bảng đấu</span><nav class="full-group-nav" aria-label="Chọn bảng Division ${selectedTier}"><button data-action="Nations.section" data-arg="${selectedTier}" aria-current="${groupIndex === undefined ? "page" : "false"}">Tất cả bảng</button>${[0, 1, 2, 3].map((i) => `<button data-action="Nations.section" data-arg="${selectedTier}G${i}" aria-current="${groupIndex === i ? "page" : "false"}">Bảng ${i + 1}</button>`).join("")}</nav></div>` : ""}</section>${toolbar(s)}${(selectedTier
    ? [selectedTier]
    : N.tiers
  )
    .map(
      (t) =>
        `<section class="nations-division"><h3>Division ${t}</h3><p class="sub">${t === "A" ? "Hai đội đầu mỗi bảng vào playoff." : "Nhất mỗi bảng lên Division " + N.tiers[N.tiers.indexOf(t) - 1] + "."} ${t !== "D" ? "Cuối mỗi bảng xuống Division " + N.tiers[N.tiers.indexOf(t) + 1] + "." : ""}</p><div class="full-groups">${s.divisions[
          t
        ].groups
          .map((g, gi) => {
            if (groupIndex !== undefined && gi !== groupIndex) return "";
            const snapshot = leagueRoundSnapshot(g, round),
              rows = fullStandings(snapshot),
              prev = fullStandings(leagueRoundSnapshot(g, round - 1)),
              changes = rankChanges(
                prev,
                rows,
                round > 0 || snapshot.rounds.some((r) => r.some((m) => m.sets)),
              ),
              berths = N.nationsBerths(snapshot, t);
            return `<section class="panel full-group"><h4>Division ${t} · Bảng ${gi + 1}</h4>${rankMovementLegend}<div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>W</th><th>L</th><th>HS SET</th><th>HS ĐIỂM</th></tr></thead><tbody>${rows.map((row, i) => `<tr><td>${i + 1}${rankMovementHtml(changes[row.id], round)}</td><td><button class="full-team-button" data-action="Nations.team" data-arg="${row.id}" data-arg1="${round}">${seasonTeam(row.id, snapshot.rounds.flat())}</button>${berths[row.id].playoff ? '<span class="full-qualification" data-berth="qualified">✓ Vào playoff</span>' : berths[row.id].up ? '<span class="full-qualification" data-berth="qualified">↑ Đã lên hạng</span>' : berths[row.id].down ? '<span class="full-qualification" data-berth="eliminated">↓ Đã xuống hạng</span>' : ""}</td><td>${row.w}</td><td>${row.l}</td><td>${row.sf - row.sa}</td><td>${row.pf - row.pa}</td></tr>`).join("")}</tbody></table></div><p class="sub">BXH tới vòng ${round + 1}; phong độ và trạng thái theo vòng đang xem.</p><div class="full-world-round-fixtures">${g.rounds[round].map((m) => card(s, m, round)).join("")}</div></section>`;
          })
          .join("")}</div></section>`,
    )
    .join("")}`;
}
export function playoffHtml(s: N.NationsSeason) {
  const b = s.playoff;
  if (!b)
    return `<section class="panel full-empty"><h3>Playoff Division A · 8 đội</h3><p>Hoàn tất cả 6 lượt của 16 bảng để khóa kết quả lên/xuống hạng và bốc thăm tứ kết.</p><button class="primary" data-action="Nations.draw" ${!N.nationsGroupsDone(s) || readonly() ? "disabled" : ""}>Bốc thăm playoff</button><button data-action="Nations.section" data-arg="groups">Về vòng bảng</button></section>`;
  const next = N.nationsPlayOrder.find((k) => b[k].some((m) => !m.sets));
  return `${b.final.length ? medalPodiumHtml([b.final[0].sets ? winner(b.final[0]) : null, b.final[0].sets ? loser(b.final[0]) : null, b.bronze[0]?.sets ? winner(b.bronze[0]) : null], (id) => team(id)) : ""}<div class="section-head"><div><h3>Playoff Division A</h3><p class="sub">Nhất bảng gặp nhì bảng khác · theo nhánh cố định · tranh hạng ba trước chung kết.</p></div>${!readonly() && next ? `<button class="primary" data-action="Nations.stage" data-arg="${next}">Mô phỏng ${stageNames[next].toLowerCase()} →</button>` : ""}</div>${connectedPlayoffTree(b, readonly(), (id) => nationsTeam(s, id), { start: "qf", prefix: "Nations", label: "Nhánh playoff Nations League" })}`;
}
export function summaryHtml(s: N.NationsSeason) {
  const places = N.nationsPlacements(s),
    changes = N.nationsMovements(s),
    existing = model.records.find(
      (r) =>
        r.campaign_id === s.campaignId && r.cycle_number === s.cycleNumber + 1,
    );
  return `<section class="full-season-summary"><h3>Tổng kết mùa ${s.cycleNumber}</h3>${medalPodiumHtml(N.nationsPodium(s), (id) => team(id))}<div class="full-world-gate panel"><div><h3>${existing ? "Mùa tiếp theo đã có" : "Tiếp tục hành trình lên hạng"}</h3><p class="sub">Giữ nguyên 64 đội, cập nhật Division theo kết quả mùa này và bốc thăm bảng mới.</p></div><button class="primary" data-action="Nations.nextSeason">${existing ? "Mở" : "Bắt đầu"} mùa ${s.cycleNumber + 1} →</button></div><div class="full-format-grid nations-format">${N.tiers.map((t) => `<section class="panel full-region-summary"><h4>Division ${t}</h4>${changes[t].up.length ? `<b>↑ Lên hạng</b>${changes[t].up.map((id) => `<p>${team(id)}</p>`).join("")}` : ""}${changes[t].down.length ? `<b>↓ Xuống hạng</b>${changes[t].down.map((id) => `<p>${team(id)}</p>`).join("")}` : ""}</section>`).join("")}</div><details class="panel nations-details"><summary>Thành tích cuối mùa · 64 đội</summary><div class="table-wrap"><table><thead><tr><th>HẠNG</th><th>ĐỘI</th><th>DIVISION</th><th>VÒNG DỪNG CHÂN / VỊ TRÍ BẢNG</th><th>MÙA SAU</th></tr></thead><tbody>${Object.entries(
    places,
  )
    .sort((a, b) => a[1].from - b[1].from)
    .map(
      ([id, p]) =>
        `<tr><td>${placementLabel(p)}</td><td>${team(id)}</td><td>${p.tier}</td><td>${p.tier === "A" && p.from <= 8 ? (p.from <= 2 ? "Chung kết" : p.from <= 4 ? "Tranh hạng ba" : "Tứ kết") : `#${p.rank} bảng ${p.group + 1}`}</td><td>${p.movement}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div></details><details class="panel nations-details"><summary>Nhánh playoff</summary>${connectedPlayoffTree(s.playoff!, true, (id) => nationsTeam(s, id), { start: "qf", prefix: "Nations" })}</details><button data-action="Nations.section" data-arg="groups">Xem BXH & lịch vòng bảng →</button></section>`;
}
function placementLabel(p: { from: number; to: number }) {
  return p.from === p.to && p.from <= 3
    ? ["🥇", "🥈", "🥉"][p.from - 1]
    : p.from === p.to
      ? `#${p.from}`
      : `#${p.from}–#${p.to}`;
}
export function honoursHtml() {
  const id = model.honourTeam;
  return `<div class="section-head"><div><h2>Thành tích Nations League</h2><p class="sub">Theo từng chuỗi và từng mùa; thành tích riêng, không cộng vào điểm World League.</p></div><button data-action="Nations.library">← Các mùa</button></div><label>Quốc gia<select aria-label="Chọn quốc gia Nations League" data-action="Nations.honourTeam" data-trigger="change">${regionOrder
    .map(
      (r) =>
        `<optgroup label="${names[r]}">${regionTeams(r)
          .map(
            (t) =>
              `<option value="${t.id}" ${id === t.id ? "selected" : ""}>${t.flag} ${t.name}</option>`,
          )
          .join("")}</optgroup>`,
    )
    .join(
      "",
    )}</select></label><section class="panel full-honours"><div class="table-wrap"><table><thead><tr><th>CHUỖI</th><th>MÙA</th><th>DIVISION</th><th>THÀNH TÍCH</th><th>LÊN / XUỐNG HẠNG</th></tr></thead><tbody>${model.records
    .map((r) => {
      const s = r.snapshot,
        p = s && N.nationsPlacements(s)[id],
        tier = s && N.tiers.find((t) => s.divisions[t].teamIds.includes(id));
      return `<tr><td>${campaignName(r.campaign_id)}</td><td>Mùa ${r.cycle_number}</td><td>${tier || (!s ? "Chưa tải được" : "-")}</td><td>${!s ? "Chưa tải được" : p ? placementLabel(p) : tier ? "Đang diễn ra" : "-"}</td><td>${p ? p.movement : "-"}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div></section><button data-action="Nations.honours">Thử tải lại lịch sử</button>`;
}

export function rulesHtml(open = true) {
  return `<details class="panel nations-details" ${open ? "open" : ""}><summary>Thể thức & 64 đội tham dự</summary><p>Mỗi bảng 4 đội đánh vòng tròn hai lượt, tất cả trận BO5. Mỗi lượt chạy đồng thời cả 16 bảng (32 trận); toàn mùa có 200 trận.</p><p>Division A: nhất bảng gặp nhì bảng khác ở tứ kết, sau đó theo nhánh cố định. Tranh hạng ba trước chung kết. Bốn đội lên và bốn đội xuống ở mỗi ranh giới hạng đấu.</p><p>Mùa đầu chia hạng theo BXH thế giới; các mùa sau kế thừa kết quả lên/xuống hạng. Mỗi bảng có một đội từ mỗi nhóm hạt giống. BXH: số trận thắng → HS set → HS điểm → đối đầu → thứ tự bốc thăm đã lưu.</p><p>${Object.entries(
    N.nationsQuotas,
  )
    .map(([r, n]) => `${names[r as keyof typeof names]}: ${n}`)
    .join(
      " · ",
    )}. Chọn các đội đứng đầu khu vực; danh sách được giữ nguyên xuyên suốt chuỗi mùa.</p><div class="nations-roster">${N.tiers
    .map(
      (t, i) =>
        `<section><h4>Division ${t} · mùa đầu</h4>${N.nationsRoster()
          .slice(i * 16, i * 16 + 16)
          .map((id) => `<p>${team(id)} <small>#${get(id).rank}</small></p>`)
          .join("")}</section>`,
    )
    .join("")}</div></details>`;
}

export function matchDetailHtml(s: N.NationsSeason, m: Match, locked: boolean) {
  const group = N.nationsGroups(s).find((g) => g.rounds.flat().includes(m)),
    tier = N.tiers.find((t) =>
      s.divisions[t].groups.some((g) => g.teamIds.includes(m.a)),
    ),
    stage = N.nationsStages.find((k) => s.playoff?.[k].includes(m)),
    label =
      group && tier
        ? `Division ${tier} · Bảng ${s.divisions[tier].groups.indexOf(group) + 1} · Vòng ${group.rounds.findIndex((r) => r.includes(m)) + 1}`
        : stage
          ? `Division A · ${stageNames[stage]}`
          : "Nations League",
    result = score(m),
    win = winner(m),
    waitingBronze = s.playoff?.final.includes(m) && !s.playoff.bronze[0]?.sets;
  return `<section class="nations-match-detail"><div class="nations-match-meta"><div><span class="eyebrow">NATIONS LEAGUE · MÙA ${s.cycleNumber}</span><p>${label}</p></div><span class="nations-match-status ${m.sets ? "is-complete" : ""}">${m.sets ? "✓ Đã thi đấu" : "Chưa thi đấu"}</span></div><div class="nations-match-scoreboard">${[m.a, m.b].map((id, i) => `${i ? `<div class="nations-match-score" aria-label="${m.sets ? "Tỉ số set " + result.join("–") : "Trận chưa thi đấu"}"><strong>${m.sets ? `${result[0]}<span>–</span>${result[1]}` : "VS"}</strong><small>${m.sets ? "TỈ SỐ SET" : "BEST OF 5"}</small></div>` : ""}<div class="nations-match-team ${win === id ? "is-winner" : ""}">${seasonTeam(id, N.nationsMatches(s))}${win ? `<span class="nations-match-outcome">${win === id ? "Đội thắng" : "Đội thua"}</span>` : ""}</div>`).join("")}</div>${m.sets ? `<div class="nations-match-sets table-wrap"><table aria-label="Điểm từng set"><thead><tr><th>ĐỘI TUYỂN</th>${m.sets.map((_, i) => `<th>SET ${i + 1}</th>`).join("")}</tr></thead><tbody>${[m.a, m.b].map((id, i) => `<tr><th scope="row">${team(id)}</th>${m.sets!.map((pair) => `<td class="${pair[i] > pair[1 - i] ? "set-winner" : ""}">${pair[i]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<p class="nations-match-help">Mô phỏng hoặc nhập điểm để bắt đầu trận đấu.</p>'}${locked ? `<p class="nations-match-lock" role="status">${waitingBronze ? "Hoàn tất trận tranh hạng ba để mở chung kết." : selected()?.status === "completed" ? "Mùa giải đã hoàn tất · Chỉ xem kết quả" : m.sets ? "Kết quả đã khóa · Chỉ xem" : "Trận đấu chưa mở"}</p>` : `<div class="nations-match-actions">${!m.sets ? '<button class="primary" data-action="Nations.dialogSim"><span aria-hidden="true">▶</span> Mô phỏng trận</button>' : ""}<button ${m.sets ? 'class="primary"' : ""} data-action="Nations.dialogEdit">${m.sets ? "Chỉnh sửa điểm" : "Nhập điểm thủ công"}</button></div>`}</section>`;
}

function seasonCardHtml(r: NationsRecord) {
  const done = r.status === "completed",
    latest = !model.records.some(
      (other) =>
        other.campaign_id === r.campaign_id &&
        other.cycle_number > r.cycle_number,
    ),
    saveLabel =
      r.phase === "conflict"
        ? "Cần chọn bản lưu"
        : r.dirty
          ? "Có tiến trình trên thiết bị"
          : "Đã lưu",
    continuation = latest && r.phase !== "conflict";
  return `<article class="panel season-card ${done ? "" : "current-season"}" data-nations-season="${esc(r.season_id)}"><div class="season-card-top"><span class="eyebrow">${campaignName(r.campaign_id).toUpperCase()} · SEASON ${String(r.cycle_number).padStart(2, "0")}</span><span class="badge ${done ? "gold" : ""}">${done ? "Đã hoàn tất" : "Đang diễn ra"}</span></div><h3>Mùa ${r.cycle_number}</h3><p class="season-format-label">Nations League · 4 Division · BO5</p>${done ? `<div class="season-medals">${r.podium.map((id, i) => `<div><span>${["🥇", "🥈", "🥉"][i]}</span>${team(id)}</div>`).join("")}</div>` : `<p class="sub">${r.played}/200 trận đã đấu</p><div class="progress" role="progressbar" aria-label="Tiến độ mùa ${r.cycle_number}" aria-valuenow="${r.played}" aria-valuemin="0" aria-valuemax="200"><i style="width:${r.played / 2}%"></i></div>`}<p class="sub nations-season-save">${saveLabel}</p><div class="actions">${continuation ? `<button class="primary" data-action="Nations.continue" data-arg="${esc(r.season_id)}">${done ? `Tạo mùa ${r.cycle_number + 1} · lên/xuống hạng` : `Tiếp tục mùa ${r.cycle_number}`} →</button>` : ""}${done || !continuation ? `<button data-action="Nations.open" data-arg="${esc(r.season_id)}">${done ? "Xem kết quả mùa giải" : "Xem tiến trình"} →</button>` : ""}</div></article>`;
}
export function transferSummaryHtml(s: N.NationsSeason) {
  if (!s.previousSeasonId)
    return '<p class="sub nations-cycle-note">Mùa 1 của chuỗi độc lập · Division chia theo BXH thế giới. Lên/xuống hạng được kế thừa khi tạo mùa kế tiếp trong cùng chuỗi.</p>';
  const previous = model.records.find(
    (r) => r.season_id === s.previousSeasonId,
  )?.snapshot;
  if (!previous)
    return `<section class="panel nations-transfer-summary"><h3>Lên/xuống hạng đầu mùa ${s.cycleNumber}</h3><p class="sub">Mùa này kế thừa Division từ mùa ${s.cycleNumber - 1}. Tải kết quả mùa trước để xem danh sách đội đổi hạng.</p><button data-action="Nations.transfers" data-arg="${esc(s.previousSeasonId)}">Xem các đội lên/xuống hạng</button></section>`;
  if (!N.validNationsTransition(previous, s))
    return '<div class="notice">Chưa xác minh được kết quả chuyển hạng của hai mùa. Hãy thử đồng bộ lịch sử.</div>';
  const changes = N.nationsTransfers(previous, s);
  return `<section class="panel nations-transfer-summary"><span class="eyebrow">KẾ THỪA TỪ MÙA ${previous.cycleNumber}</span><h3>Đã áp dụng lên/xuống hạng cho mùa ${s.cycleNumber}</h3><p class="sub"><b>${changes.filter((t) => t.promoted).length} đội lên hạng</b> · <b>${changes.filter((t) => !t.promoted).length} đội xuống hạng</b> · 16 đội mỗi Division.</p><details><summary>Xem ${changes.length} đội đổi Division</summary><p class="sub nations-transfer-legend">Division cũ → Division mới · Mùa ${previous.cycleNumber} → Mùa ${s.cycleNumber}</p><div class="nations-transfer-grid">${N.tiers
    .map((tier) => {
      const arrivals = changes.filter((t) => t.to === tier);
      return `<section class="nations-transfer-division" aria-label="Các đội chuyển đến Division ${tier}"><div class="nations-transfer-division-head"><h4>Division ${tier}</h4><span>${arrivals.length} đội chuyển đến</span></div>${[
        true,
        false,
      ]
        .map((promoted) => {
          const group = arrivals
            .filter((t) => t.promoted === promoted)
            .sort((a, b) => get(a.id).rank - get(b.id).rank);
          if (!group.length) return "";
          return `<div class="nations-transfer-group"><div class="nations-transfer-group-head"><span class="nations-transfer-tag ${promoted ? "is-promoted" : "is-relegated"}">${promoted ? "↑ Lên hạng" : "↓ Xuống hạng"}</span><small>${group.length} đội</small></div><div role="list" class="nations-transfer-list">${group.map((t) => `<div class="nations-transfer-row" role="listitem" data-transfer-team="${t.id}" data-from="${t.from}" data-to="${t.to}"><span class="nations-transfer-team" title="${esc(get(t.id).name)}">${team(t.id)}</span><span class="nations-transfer-route ${t.promoted ? "is-promoted" : "is-relegated"}" aria-label="Division ${t.from} sang Division ${t.to}"><span>${t.from}</span><span aria-hidden="true">→</span><b>${t.to}</b></span></div>`).join("")}</div></div>`;
        })
        .join("")}</section>`;
    })
    .join("")}</div></details></section>`;
}
