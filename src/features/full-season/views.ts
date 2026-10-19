import { seasonTeam, seasonMatchCard } from "../../components/season-match";
import { worldPlayoffTree } from "./playoff-tree";
import {
  leagueRoundSnapshot,
  latestLeagueRound,
  leagueRoundStatus,
  rankChanges,
} from "../../domain/league/round-standings";
import {
  rankMovementHtml,
  rankMovementLegend,
} from "../../components/rank-movement";
import { get, regionTeams } from "../../data/teams";
import * as F from "../../domain/full-season/index";
import { medalPodiumHtml } from "../../components/podium";
import { winner, loser } from "../../domain/match/scoring";
import type {
  FullSeason,
  FullLeague,
  WorldStage,
} from "../../domain/full-season/types";
import type { Match, Region } from "../../domain/types";
import { team } from "../../components/team";
import { esc, names } from "../../shared/dom";
import { fullModel, selectedFull, type FullRecord } from "./model";
export function fullTeam(id: string, s: FullSeason, source?: FullLeague) {
  const rank = source
    ? F.fullStandings(source).findIndex((t) => t.id === id) + 1
    : 0;
  return seasonTeam(id, F.fullMatches(s), rank);
}
export function fullCard(s: FullSeason, m: Match, readonly = false) {
  return seasonMatchCard(
    m,
    (id) => fullTeam(id, s),
    "Full",
    readonly || F.fullMatchLocked(s, m),
    /^(AVC|CAVB)D0$/.test(m.id) ? "TRANH SUẤT THẾ GIỚI · BO5" : m.id,
  );
}
export function fullStandingsTable(
  g: FullLeague,
  slots = 0,
  round = latestLeagueRound(g),
  contender = false,
  qualification = false,
) {
  const snapshot = leagueRoundSnapshot(g, round),
    rows = F.fullStandings(snapshot),
    berths = slots
      ? F.groupBerths(snapshot, slots, contender, qualification ? 3 : slots + 1)
      : {},
    previous = F.fullStandings(leagueRoundSnapshot(g, round - 1)),
    changes = rankChanges(
      previous,
      rows,
      round > 0 || snapshot.rounds.some((r) => r.some((m) => m.sets)),
    );
  return `<p class="sub standings-round-note">BXH tới vòng ${round + 1} · ${leagueRoundStatus(g, round)} · chỉ tính kết quả tới vòng đang xem.</p>${rankMovementLegend}<div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>TRẬN</th><th>W</th><th>L</th><th>SET</th><th>HS SET</th><th>ĐIỂM</th><th>HS ĐIỂM</th></tr></thead><tbody>${rows
    .map(
      (t, i) =>
        `<tr class="${i < slots ? "direct" : ""}"><td>${i + 1}${rankMovementHtml(changes[t.id], round)}</td><td><button class="full-team-button" data-action="Full.team" data-arg="${t.id}" data-arg1="${round}">${team(t.id)}</button>${berths[t.id]?.qualified ? `<span class="full-qualification" data-berth="qualified">✓ Giành vé</span>` : berths[t.id]?.contender ? `<span class="full-qualification" data-berth="contender">${qualification ? (slots === 2 ? (F.fullLeagueDone(snapshot) ? "→ Play-in liên khu vực" : "Bảo đảm ít nhất Play-in") : "Bảo đảm ít nhất playoff khu vực") : "Bảo đảm ít nhất trận tranh suất"}</span>` : i < slots ? `<span class="full-qualification">Top dự kiến</span>` : ""}</td><td>${t.w + t.l}</td><td><b>${t.w}</b></td><td>${t.l}</td><td>${t.sf}:${t.sa}</td><td>${t.sf - t.sa}</td><td>${t.pf}:${t.pa}</td><td>${t.pf - t.pa}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
export function libraryHtml() {
  return `<div class="section-head"><div><span class="eyebrow">WORLD CUP · 100 QUỐC GIA</span><h2>VolleyWorld Cup</h2><p class="sub">Từ vòng loại khu vực đến ngôi vô địch thế giới. Một mùa. Sáu giải đấu.</p><p class="sub">Vòng bảng khu vực → playoff khu vực → Play-in → World Cup 24 đội.</p></div><div class="controls"><button data-action="navigate" data-arg="home">← World League</button><button class="primary" data-action="Full.create">Bắt đầu World Cup mới</button></div></div><div class="full-format-grid">${F.regionOrder.map((r) => `<div class="panel full-region-summary"><span class="eyebrow">${names[r]}</span><strong>${regionTeams(r).length} đội</strong><span>${r === "CSV" ? 2 : F.qualificationGroups[r] + 1} vé khu vực${r === "CSV" ? " · hạng 3 dự Play-in" : " + cơ hội Play-in"}</span></div>`).join("")}</div><div class="full-library-toolbar"><button data-action="Full.export">Xuất tất cả World Cup</button><button data-action="Full.import">Nhập World Cup</button><button data-action="Full.honours">Thành tích World Cup</button><button data-action="Full.sync">Đồng bộ lịch sử</button></div>${fullModel.records.length ? `<div class="section-head full-history-heading"><div><h3>Các mùa World Cup</h3><p class="sub">${fullModel.records.length} mùa giải · ${fullModel.records.filter((r) => r.status === "completed").length} đã hoàn tất · ${fullModel.records.filter((r) => r.status !== "completed").length} đang diễn ra</p></div></div><div class="season-grid world-cup-season-grid">${fullModel.records.map(fullSeasonCardHtml).join("")}</div>` : '<div class="panel full-empty"><h3>Sẵn sàng cho một mùa bóng chuyền trọn vẹn?</h3><p>Chia bảng có hạt giống tại châu Âu, châu Á, châu Phi và Bắc, Trung Mỹ & Caribe. Nam Mỹ đánh vòng tròn. Bảng khu vực khoảng 6–7 đội. Nhất bảng đi thẳng; hạng 2–3 dự playoff khu vực. Nam Mỹ lấy top 2, hạng 3 dự Play-in.</p><p>17 vé trực tiếp + 4 vé playoff khu vực + 3 vé Play-in. Giải thế giới mở khi tất cả vòng loại hoàn tất.</p></div>'}`;
}
function fullSeasonCardHtml(r: FullRecord) {
  const complete = r.status === "completed",
    total = r.snapshot
      ? F.fullTotalMatches(r.snapshot)
      : complete
        ? r.played
        : null,
    progress = total ? Math.min(100, Math.max(0, (r.played / total) * 100)) : 0,
    saveLabel =
      r.phase === "conflict"
        ? "Cần chọn bản lưu"
        : r.dirty
          ? "Tiến trình trên thiết bị"
          : "Đã lưu tiến trình",
    stage = r.snapshot
      ? r.snapshot.world?.bracket
        ? "Playoff thế giới"
        : r.snapshot.world
          ? "Vòng bảng thế giới"
          : "Vòng loại khu vực"
      : "Giải đấu đang diễn ra";
  return `<article class="panel season-card world-cup-season-card ${complete ? "is-completed" : "current-season"}" data-world-cup-season="${esc(r.season_id)}"><div class="season-card-top"><span class="eyebrow">WORLD CUP · ${String(r.season_number).padStart(2, "0")}</span><span class="full-history-status ${complete ? "is-completed" : "is-active"}"><span aria-hidden="true">${complete ? "✓" : "●"}</span>${complete ? "Hoàn tất" : "Đang diễn ra"}</span></div><div class="full-history-title"><div><h3>Mùa ${r.season_number}</h3><p>${complete ? "Hành trình đã khép lại" : "Hành trình chinh phục thế giới"}</p></div><span class="full-history-emblem" aria-hidden="true">${complete ? "🏆" : "🏐"}</span></div>${complete ? `<div class="season-medals full-history-medals" aria-label="Top 3 mùa ${r.season_number}">${r.podium.map((id, i) => `<div class="full-history-medal place-${i + 1}" title="${esc(get(id).name)}"><span class="full-history-medal-icon" aria-hidden="true">${["🥇", "🥈", "🥉"][i]}</span>${team(id)}<small>${["Vô địch", "Á quân", "Hạng ba"][i]}</small></div>`).join("")}</div>` : `<div class="full-history-progress"><div><span>${stage}</span>${total ? `<b>${Math.round(progress)}%</b>` : ""}</div>${total ? `<div class="progress" role="progressbar" aria-label="Tiến độ mùa ${r.season_number}" aria-valuenow="${r.played}" aria-valuemin="0" aria-valuemax="${total}"><i style="width:${progress}%"></i></div>` : ""}<p>Vượt qua vòng loại khu vực, tiến tới sân khấu thế giới.</p></div>`}<div class="full-history-footer"><div class="full-history-meta"><span>${r.played.toLocaleString("vi-VN")}${total !== null ? ` / ${total.toLocaleString("vi-VN")}` : ""} trận</span><span class="${r.dirty || r.phase === "conflict" ? "is-pending" : ""}">${saveLabel}</span></div><button class="${complete ? "" : "primary"}" data-action="Full.open" data-arg="${esc(r.season_id)}"><span>${complete ? "Xem tổng kết" : "Tiếp tục giải đấu"}</span><span aria-hidden="true">→</span></button></div></article>`;
}
export function overviewHtml(s: FullSeason) {
  const modern = F.newQualification(s),
    ready = !modern || F.intercontinentalDone(s);
  const done = F.regionOrder.filter((r) => F.regionalDone(s.regions[r])).length;
  return `<div class="full-format-grid full-regional-overview">${F.regionOrder.map((r) => regionalOverviewCardHtml(s, r)).join("")}</div><section class="panel full-world-gate"><div><span class="eyebrow">WORLD CHAMPIONSHIP · 24 ĐỘI</span><h3>${s.world ? "Giải thế giới" : "Hoàn tất khu vực để mở giải thế giới"}</h3><p class="sub">${done}/5 giải khu vực hoàn tất. ${modern ? "Cần hoàn tất cả playoff khu vực và ba nhánh Play-in để chốt đủ 24 đội." : "Cần hoàn tất mọi trận, kể cả khi các vé đã được xác định sớm."}</p></div>${s.world ? '<button class="primary" data-action="Full.section" data-arg="world">Vào giải thế giới →</button>' : `<button class="primary" data-action="Full.drawWorld" ${done < 5 || !ready ? "disabled" : ""}>Bốc thăm & bắt đầu thế giới</button>`}</section>${modern ? `<section class="panel full-world-gate"><div><span class="eyebrow">PLAY-IN LIÊN KHU VỰC</span><h3>27 đội tranh 3 vé cuối</h3><p class="sub">${s.intercontinental ? `${s.intercontinental.branches.filter((b) => F.qualifierWinner(b)).length}/3 nhánh hoàn tất` : done === 5 ? "Đã đủ danh sách, sẵn sàng bốc thăm" : "Chờ hoàn tất cả năm giải khu vực"}</p></div><button class="primary" data-action="Full.section" data-arg="intercontinental">${s.intercontinental ? "Xem nhánh Play-in" : "Vào Play-in"} →</button></section>` : ""}${F.worldComplete(s) ? summaryHtml(s) : ""}`;
}
function regionalOverviewCardHtml(s: FullSeason, r: Region) {
  const g = s.regions[r],
    complete = F.regionalDone(g),
    total =
      F.leagueMatches(g).length +
      (g.playoff !== undefined
        ? g.groups!.length * 2 - 1
        : g.groups && ["AVC", "CAVB"].includes(r)
          ? 1
          : 0),
    played =
      F.leagueMatches(g).filter((m) => m.sets).length +
      (g.decider?.sets ? 1 : 0) +
      F.qualifierMatches(g.playoff).filter((m) => m.sets).length,
    qualified = complete ? F.regionQualifiers(g, r) : [];
  return `<section class="panel full-region-summary full-regional-card ${complete ? "is-completed" : ""}" data-overview-region="${r}"><div class="full-regional-card-header"><span class="eyebrow">${names[r]}</span><span class="full-regional-state ${complete ? "is-completed" : ""}">${complete ? "✓ Hoàn tất" : played ? "Đang thi đấu" : "Chưa bắt đầu"}</span></div><div class="full-regional-card-title"><strong>${complete ? `${qualified.length} đội giành vé` : `${g.teamIds.length} đội`}</strong><span>${complete ? "WORLD CUP" : `${F.worldSlots[r]} suất World Cup`}</span></div>${complete ? `<ul class="full-regional-qualified ${qualified.length > 5 ? "is-large" : ""}" aria-label="Các đội ${names[r]} giành vé World Cup">${qualified.map((id) => `<li data-world-qualifier="${id}" title="${esc(get(id).name)}">${team(id)}<span aria-label="Đã giành vé">✓</span></li>`).join("")}</ul>` : `<div class="full-regional-progress"><div><span>Tiến độ khu vực</span><b>${played}<span> / ${total} trận</span></b></div><div class="progress" role="progressbar" aria-label="Tiến độ ${names[r]}" aria-valuenow="${played}" aria-valuemin="0" aria-valuemax="${total}"><i style="width:${total ? (played / total) * 100 : 0}%"></i></div><p>${g.groups ? F.regionalDescription(s, r) : `Vòng tròn một lượt · top ${g.directSlots || F.worldSlots[r]} giành vé thế giới${g.directSlots ? " · hạng 3 dự Play-in" : ""}`}</p></div>`}<button data-action="Full.section" data-arg="${r}"><span>${complete ? "Xem kết quả" : "Thi đấu khu vực"}</span><span aria-hidden="true">→</span></button></section>`;
}
export function regionHtml(s: FullSeason, r: Region, readonly: boolean) {
  const g = s.regions[r];
  if (!g.groups) return leagueHtml(s, g, names[r], F.worldSlots[r], readonly);
  const complete = F.regionalDone(g),
    qualified = complete ? F.regionQualifiers(g, r) : [],
    direct = g.directSlots || F.groupDirectSlots[r];
  return `${groupNavigation(s)}<div class="section-head"><div><h3>${names[r]} · Vòng bảng</h3><p class="sub">${F.regionalDescription(s, r)} · chia nhóm hạt giống theo BXH thế giới.</p></div></div>
  <div class="full-groups">${g.groups
    .map((_, i) => {
      const group = F.regionalGroup(g, i),
        berths = F.groupBerths(
          group,
          direct,
          F.newQualification(s) || g.decider !== undefined,
          F.newQualification(s) ? 3 : direct + 1,
        );
      return `<section class="panel full-group"><div class="section-head"><h3>Bảng ${"ABC"[i]}</h3><span class="badge">${group.teamIds.length} đội · ${F.leagueMatches(group).filter((m) => m.sets).length}/${F.leagueMatches(group).length} trận</span></div>
    ${F.fullStandings(group)
      .map(
        (t, j) =>
          `<div class="full-regional-standing"><span>#${j + 1}</span>${team(t.id)}<b>${t.w}W · ${t.l}L</b>${qualified.includes(t.id) || berths[t.id].qualified ? '<span class="full-qualification" data-berth="qualified">✓ Giành vé thế giới</span>' : complete ? (F.newQualification(s) && j < 3 ? '<span class="full-qualification" data-berth="contender">→ Play-in liên khu vực</span>' : '<span class="full-qualification" data-berth="eliminated">Không giành vé thế giới</span>') : berths[t.id].contender ? `<span class="full-qualification" data-berth="contender">${F.newQualification(s) ? "Bảo đảm ít nhất playoff khu vực" : "Bảo đảm ít nhất trận tranh suất"}</span>` : berths[t.id].eliminated ? '<span class="full-qualification" data-berth="eliminated">Hết cơ hội giành vé</span>' : ""}</div>`,
      )
      .join("")}
    <button data-action="Full.section" data-arg="${r}G${i}">Lịch & BXH bảng →</button></section>`;
    })
    .join(
      "",
    )}</div>${F.newQualification(s) ? `<section class="panel full-world-gate"><div><h3>Playoff khu vực · 1 vé World Cup</h3><p class="sub">Hạng 2–3 mỗi bảng tranh một vé; các đội còn lại dự Play-in liên khu vực.</p></div><button class="primary" data-action="Full.section" data-arg="${r}P">${g.playoff ? "Vào nhánh đấu" : "Xem thể thức"} →</button></section>` : ""}${g.decider !== undefined ? `<section class="panel full-regional-decider"><h3>Tranh suất thế giới cuối · BO5</h3><p class="sub">Hai đội hạng ${direct + 1} gặp nhau sau khi tất cả trận vòng bảng khu vực hoàn tất. Kết quả vòng bảng khóa khi trận này được tạo.</p>${g.decider ? fullCard(s, g.decider, readonly) : "<p>Chờ hoàn tất cả hai bảng.</p>"}</section>` : ""}
  <details class="panel full-pots"><summary>Nhóm hạt giống đã bốc thăm</summary><div class="full-groups">${g.pots!.map((p, i) => `<section><h4>Nhóm ${i + 1}</h4>${p.map((id) => `<p>${team(id)}</p>`).join("")}</section>`).join("")}</div></details>`;
}
export function groupNavigation(s: FullSeason) {
  const region = F.regionOrder.find(
      (r) =>
        s.regions[r].groups &&
        (fullModel.section === r || fullModel.section.startsWith(`${r}G`)),
    ),
    world = fullModel.section === "world" || fullModel.section.startsWith("WG"),
    parent = world ? "world" : region;
  if (!parent) return "";
  const count = world ? 6 : s.regions[region!].groups!.length;
  return `<section class="panel full-group-switcher" aria-label="Điều hướng bảng đấu"><span class="full-group-switcher-label">BẢNG ĐẤU</span><nav class="full-group-nav" aria-label="Chọn nhanh bảng đấu"><button data-action="Full.section" data-arg="${parent}" aria-current="${fullModel.section === parent ? "page" : "false"}">← ${world ? "Tất cả 6 bảng" : "Tổng quan khu vực"}</button>${Array.from(
    { length: count },
    (_, i) => {
      const key = world ? `WG${i}` : `${region}G${i}`;
      return `<button data-action="Full.section" data-arg="${key}" aria-current="${fullModel.section === key ? "page" : "false"}">Bảng ${"ABCDEF"[i]}</button>`;
    },
  ).join(
    "",
  )}${region && F.newQualification(s) ? `<button data-action="Full.section" data-arg="${region}P" aria-current="false">Playoff khu vực →</button>` : ""}</nav></section>`;
}
export function worldRoundsToolbar(s: FullSeason, readonly: boolean) {
  const w = s.world!,
    round = Math.min(fullModel.round, F.worldCurrentRound(w)),
    matches = F.worldRoundMatches(w, round),
    count = matches.filter((m) => m.sets).length,
    done = count === matches.length;
  return `<section class="panel full-world-round-controls" data-world-round="${round}"><div><span class="eyebrow">LƯỢT ĐẤU CHUNG · 6 BẢNG</span><h3>Vòng ${round + 1} / 3</h3><p class="sub">${count}/${matches.length} trận hoàn tất · chỉ qua vòng mới khi cả 6 bảng đã xong.</p></div><div class="controls"><label>Chọn vòng <select data-action="Full.round" data-trigger="change" aria-label="Chọn vòng chung của 6 bảng thế giới">${[0, 1, 2].map((r) => `<option value="${r}" ${r === round ? "selected" : ""} ${r > F.worldCurrentRound(w) ? "disabled" : ""}>Vòng ${r + 1}${F.worldRoundMatches(w, r).every((m) => m.sets) ? " ✓" : ""}</option>`).join("")}</select></label>${readonly ? (w.bracket ? '<button data-action="Full.section" data-arg="playoff">Xem playoff →</button>' : '<span class="badge">CHỈ XEM</span>') : done ? (round < 2 ? '<button class="primary" data-action="Full.next">Qua vòng tiếp theo →</button>' : '<button class="primary" data-action="Full.drawPlayoff">Bốc thăm playoff 16 đội →</button>') : `<button class="primary" data-action="Full.simRound">Chạy vòng ${round + 1} · cả 6 bảng</button>`}</div></section>`;
}
export function worldHtml(s: FullSeason) {
  const actual = s.world;
  if (!actual) return overviewHtml(s);
  const round = Math.min(fullModel.round, F.worldCurrentRound(actual)),
    w = F.worldAtRound(actual, round),
    readonly =
      selectedFull()?.status === "completed" ||
      selectedFull()?.phase === "conflict" ||
      !!actual.bracket;
  const all = w.groups.every(F.fullLeagueDone),
    qualified = all
      ? F.worldEntrants(w)
      : w.groups.flatMap((g) => {
          const berths = F.groupBerths(g, 2);
          return g.teamIds.filter((id) => berths[id].qualified);
        });
  return `<div class="section-head"><div><h3>Vòng bảng thế giới</h3><p class="sub">6 bảng × 4 đội · mỗi nhóm hạt giống một đội/bảng · tối đa 2 đội cùng khu vực.</p></div>${w.bracket ? '<button class="primary" data-action="Full.section" data-arg="playoff">Xem playoff →</button>' : `<button class="primary" data-action="Full.drawPlayoff" ${all ? "" : "disabled"}>Bốc thăm playoff 16 đội</button>`}</div>${groupNavigation(s)}${worldRoundsToolbar(s, readonly)}<div class="full-groups full-world-matchday">${w.groups
    .map(
      (g, i) =>
        `<section class="panel full-group"><div class="section-head"><h3>Bảng ${"ABCDEF"[i]}</h3><span class="badge">Vòng ${round + 1} · ${g.rounds[round].filter((m) => m.sets).length}/2 trận</span></div>${F.fullStandings(
          g,
        )
          .map(
            (t, j) =>
              `<div class="full-group-team"><span>#${j + 1}</span>${team(t.id)}${qualified.includes(t.id) ? '<span class="full-qualification" data-berth="qualified">✓ Vào playoff</span>' : ""}<span class="badge">S${w.pots.findIndex((p) => p.includes(t.id)) + 1}</span><b>${t.w}W · ${t.l}L</b></div>`,
          )
          .join(
            "",
          )}<div class="full-world-round-fixtures">${actual.groups[i].rounds[round].map((m) => fullCard(s, m, readonly)).join("")}</div><button data-action="Full.section" data-arg="WG${i}">Xem riêng bảng & BXH →</button></section>`,
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
  contender = false,
  qualification = false,
) {
  const round = Math.min(fullModel.round, g.rounds.length - 1),
    matches = g.rounds[round],
    done = matches.every((m) => m.sets),
    region = F.regionOrder.find((r) =>
      g.teamIds.every((id) => s.regions[r].teamIds.includes(id)),
    ),
    locked =
      readonly ||
      (region
        ? !!s.world ||
          !!s.regions[region].decider ||
          !!s.regions[region].playoff
        : !!s.world?.bracket),
    bye = g.teamIds.filter(
      (id) => !matches.some((m) => m.a === id || m.b === id),
    );
  return `${groupNavigation(s)}${region ? "" : worldRoundsToolbar(s, locked)}<div class="section-head"><div><h3>${label}</h3><p class="sub">${g.teamIds.length} đội · ${g.rounds.length} vòng · ${slots ? `Top ${slots} giành vé${contender ? (qualification ? (slots === 2 ? " · hạng 3 dự Play-in" : " · hạng 2–3 dự playoff khu vực") : ` · hạng ${slots + 1} tranh suất cuối`) : ""}` : "Hai đội đầu bảng và xét đội hạng ba"}</p></div><div class="controls">${region ? `<select data-action="Full.round" data-trigger="change" aria-label="Chọn vòng World Cup">${g.rounds.map((r, i) => `<option value="${i}" ${i === round ? "selected" : ""}>Vòng ${i + 1}${r.every((m) => m.sets) ? " ✓" : ""}</option>`).join("")}</select>${locked ? '<span class="badge">CHỈ XEM · KẾT QUẢ ĐÃ KHÓA</span>' : `${done ? `<button class="primary" data-action="Full.next">${round === g.rounds.length - 1 ? (region && s.regions[region].groups ? "Về khu vực →" : "Về tổng quan") : "Qua vòng tiếp theo →"}</button>` : `<button class="primary" data-action="Full.simRound">Chạy vòng ${round + 1}</button>`}<button data-action="Full.simLeague" ${F.fullLeagueDone(g) ? "disabled" : ""}>Chạy hết league này</button>`}` : ""}</div></div>${bye.length ? `<div class="notice">Nghỉ vòng ${round + 1}: ${bye.map((id) => team(id)).join("")}. Không tính trận thắng/thua.</div>` : ""}<div class="grid">${matches.map((m) => fullCard(s, m, locked)).join("")}</div><details class="panel full-league-table" open><summary>BXH ${label}</summary>${fullStandingsTable(g, slots, round, contender, qualification)}</details>`;
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
  const next = F.worldPlayOrder.find((k) => b[k].some((m) => !m.sets));
  return `${F.worldComplete(s) ? summaryHtml(s) : fullPodiumHtml(s)}<div class="section-head"><div><h3>Playoff thế giới</h3><p class="sub">Nhánh cố định sau bốc thăm · tranh hạng ba trước chung kết.</p></div>${!readonly && next ? `<button class="primary" data-action="Full.stage" data-arg="${next}">Mô phỏng ${stageNames[next].toLowerCase()} →</button>` : ""}</div>${worldPlayoffTree(s, readonly, (id) => fullTeam(id, s))}`;
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
  return `<div class="section-head"><div><span class="eyebrow">WORLD CUP · ${readOnly ? "ĐÃ HOÀN TẤT · CHỈ XEM" : "ĐANG DIỄN RA"}</span><h2>Mùa ${s.seasonNumber}</h2><p class="sub">${F.fullMatches(s).filter((m) => m.sets).length}/${F.fullTotalMatches(s).toLocaleString("vi-VN")} trận · 100 đội · 5 khu vực</p></div><div class="controls"><button data-action="Full.library">← Các mùa World Cup</button><button data-action="Full.exportOne">Xuất mùa này</button>${readOnly ? "" : '<button data-action="Full.restore">Khôi phục bản trước</button><button data-action="Full.finish">Mô phỏng hết mùa</button>'}</div></div><nav class="full-nav">${[["overview", "Tổng quan"], ...F.regionOrder.map((r) => [r, names[r]]), ...(F.newQualification(s) ? [["intercontinental", "Play-in"]] : []), ["world", "Thế giới"], ["playoff", "Playoff"]].map(([key, label]) => `<button class="${fullModel.section === key || (F.regionOrder.includes(key as Region) && (fullModel.section.startsWith(`${key}G`) || fullModel.section === `${key}P`)) || (key === "world" && fullModel.section.startsWith("WG")) ? "active" : ""}" data-action="Full.section" data-arg="${key}" ${(key === "world" && !s.world) || (key === "playoff" && !s.world?.bracket) ? "disabled" : ""}>${label}</button>`).join("")}</nav>`;
}
export function fullStatusHtml() {
  const row = selectedFull(),
    conflict = row?.phase === "conflict";
  return `${fullModel.loading ? '<p class="sub" role="status">Đang tải lịch sử World Cup…</p>' : ""}${fullModel.error ? `<div class="notice" role="status">${esc(fullModel.error)} <button data-action="Full.sync">Thử đồng bộ lại</button></div>` : ""}${conflict ? '<div class="notice"><b>Có tiến trình khác trên cloud.</b><p>Xuất mùa hiện tại trước khi thay bản nếu bạn muốn giữ cả hai.</p><button data-action="Full.remote">Dùng bản online</button><button data-action="Full.local">Giữ bản thiết bị</button></div>' : ""}`;
}
