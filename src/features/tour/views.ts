import * as T from "../../domain/tour/index";
import * as V from "../../domain/index";
import * as C from "../../domain/challenger/index";
import * as F from "../../domain/full-season/index";
import type { Match, Region } from "../../domain/types";
import type { ArchiveRecord } from "../shared/season-cloud";
import { team } from "../../components/team";
import { seasonTeam, seasonMatchCard } from "../../components/season-match";
import { medalPodiumHtml } from "../../components/podium";
import { rankMovementHtml } from "../../components/rank-movement";
import { connectedPlayoffTree } from "../full-season/playoff-tree";
import { qualifierTreeHtml } from "../full-season/qualification-tree";
import { fullStandingsTable } from "../full-season/views";
import { swissTreeHtml } from "../challenger/swiss-tree";
import { esc, names } from "../../shared/dom";
export { setupHtml } from "./setup";

export interface TourViewState {
  section: string;
  stage: number;
  round: number;
  region: Region;
  swissView: "tree" | "matches";
}
const stageLabel = (n: number) => T.stages[Math.min(7, n)][0];
const progressHtml = (played: number) =>
  `<div class="tour-progress" role="progressbar" aria-label="Tiến độ cả mùa" aria-valuemin="0" aria-valuemax="${T.totalMatches}" aria-valuenow="${played}"><i style="width:${Math.min(100, (played / T.totalMatches) * 100)}%"></i></div>`;
const title = (eyebrow: string, heading: string, sub = "") =>
  `<div><span class="eyebrow">${eyebrow}</span><h3>${heading}</h3>${sub ? `<p class="sub">${sub}</p>` : ""}</div>`;
export function libraryHtml(records: ArchiveRecord<T.TourSeason>[]) {
  return `<div class="tour-page"><section class="tour-hero"><div><span class="eyebrow">MỘT MÙA · BA ĐẤU TRƯỜNG</span><h2>VolleyWorld <em>Tour</em></h2><p>Từ cuộc đua League, vượt qua thử thách Swiss,<br>đến sân khấu World Cup.</p><div class="actions"><button class="primary" data-action="Tour.create">Bắt đầu hành trình mới →</button><button data-action="navigate" data-arg="home">← Trang chủ</button></div></div><div class="tour-hero-route" aria-hidden="true"><span>LEAGUE</span><i>↗</i><span>CHALLENGER</span><i>↗</i><strong>WORLD CUP</strong><small>8 CHẶNG · ${T.totalMatches} TRẬN</small></div></section><div class="tour-library-facts"><div><b>32 đội</b><span>League & Challenger cùng đội hình</span></div><div><b>100 đội</b><span>Vòng loại tại năm khu vực</span></div><div><b>3 danh hiệu</b><span>Một hành trình xuyên suốt mùa</span></div></div><div class="full-library-toolbar"><button data-action="Tour.export">Xuất lịch sử</button><button data-action="Tour.import">Nhập lịch sử</button><button data-action="Tour.sync">Đồng bộ lịch sử</button></div><div class="section-head">${title("HÀNH TRÌNH CỦA BẠN", "Các mùa Tour", records.length ? `${records.length} mùa · ${records.filter((r) => r.status === "completed").length} đã hoàn tất` : "Sẵn sàng bắt đầu mùa bóng chuyền của riêng bạn.")}</div>${records.length ? `<div class="season-grid tour-season-grid">${records.map((r) => `<article class="panel season-card tour-season-card"><div class="season-card-top"><span class="eyebrow">TOUR · MÙA ${r.season_number}</span><span class="badge ${r.status === "completed" ? "gold" : ""}">${r.phase === "conflict" ? "Có xung đột" : r.status === "completed" ? "Hoàn tất" : r.played ? "Đang diễn ra" : "Sẵn sàng"}</span></div><h3>Mùa ${r.season_number}</h3><p class="sub">${r.status === "completed" ? "Một mùa trọn vẹn. Ba đấu trường." : r.snapshot ? stageLabel(r.snapshot.stage) : "League · Challenger · World Cup"}</p>${r.podium.length ? `<div class="tour-card-podium">${r.podium.map((id, i) => `<div><span>${["🥇", "🥈", "🥉"][i]}</span>${team(id)}</div>`).join("")}</div>` : ""}<div class="tour-card-progress"><div><span>TIẾN ĐỘ MÙA</span><b>${r.played}<small> / ${T.totalMatches} trận</small></b></div>${progressHtml(r.played)}</div><div class="tour-card-footer"><small>${r.phase === "conflict" ? "Cần chọn bản lưu" : r.dirty ? "Đã giữ trên thiết bị" : r.revision ? "Đã đồng bộ" : "Đã lưu"}</small><button class="${r.status === "completed" ? "" : "primary"}" data-action="Tour.open" data-arg="${esc(r.season_id)}"><span>${r.status === "completed" ? "Xem tổng kết" : r.played ? "Tiếp tục mùa giải" : "Bắt đầu mùa giải"}</span><span aria-hidden="true">→</span></button></div></article>`).join("")}</div>` : `<section class="panel tour-empty"><span class="tour-empty-mark" aria-hidden="true">↗</span><h3>Chặng đầu tiên đang chờ bạn</h3><p>Chọn 32 đội, hoàn thành tám chặng và tìm ra những nhà vô địch của mùa Tour đầu tiên.</p><button class="primary" data-action="Tour.create">Chọn đội tham dự →</button></section>`}</div>`;
}
function navigation(s: T.TourSeason, v: TourViewState) {
  return `<nav class="full-nav tour-main-nav" aria-label="Điều hướng mùa Tour">${[
    ["journey", "Hành trình mùa"],
    ["matches", "Lịch thi đấu"],
    ["table", "Bảng xếp hạng"],
    ["playoff", "Nhánh playoff"],
    ["teams", "Đội tham dự"],
    ["rules", "Thể thức"],
  ]
    .map(
      ([key, label]) =>
        `<button data-action="Tour.section" data-arg="${key}" class="${v.section === key ? "active" : ""}" aria-pressed="${v.section === key}">${label}</button>`,
    )
    .join(
      "",
    )}</nav>${["journey", "teams", "rules"].includes(v.section) ? "" : `<nav class="tour-stage-tabs" aria-label="Chọn chặng thi đấu">${T.stages.map(([label], i) => `<button data-action="Tour.viewStage" data-arg="${i}" ${i > s.stage ? "disabled" : ""} aria-pressed="${v.stage === i}"><span>${i < s.stage ? "✓" : String(i + 1).padStart(2, "0")}</span>${label}</button>`).join("")}</nav>`}`;
}
function stageActions(s: T.TourSeason, v: TourViewState, locked: boolean) {
  if (locked || v.stage !== s.stage || T.complete(s)) return "";
  return T.stageDone(s)
    ? `<button class="primary" data-action="Tour.next">${s.stage === 7 ? "Xem tổng kết mùa →" : `Qua ${stageLabel(s.stage + 1)} →`}</button>`
    : `<button class="primary" data-action="Tour.simRound">Chạy lượt hiện tại</button><button data-action="Tour.finishStage">Mô phỏng hết chặng</button>`;
}
function stageHeader(s: T.TourSeason, v: TourViewState, locked: boolean) {
  return `<div class="section-head tour-stage-heading">${title(`CHẶNG ${v.stage + 1} / 8`, stageLabel(v.stage), T.stages[v.stage][1])}<div class="controls">${stageActions(s, v, locked)}</div></div>${v.stage < s.stage || T.stageDone(s, v.stage) ? '<p class="tour-history-note">✓ Chặng đã hoàn tất · Xem lại kết quả đã lưu</p>' : ""}`;
}
function livePodium(
  b: { final: Match[]; bronze: Match[] },
  renderTeam: (id: string) => string,
) {
  if (!b.final.length) return "";
  return medalPodiumHtml(
    [
      b.final[0]?.sets ? V.winner(b.final[0]) : null,
      b.final[0]?.sets ? V.loser(b.final[0]) : null,
      b.bronze[0]?.sets ? V.winner(b.bronze[0]) : null,
    ],
    renderTeam,
  );
}
function journeyHtml(s: T.TourSeason, locked: boolean) {
  const current = Math.min(s.stage, 7),
    done = T.complete(s);
  return `${done ? championsHtml(s) : `<section class="tour-current"><div><span class="eyebrow">${T.stageDone(s) ? "CHẶNG ĐÃ HOÀN TẤT" : `ĐANG THI ĐẤU · CHẶNG ${s.stage + 1}`}</span><h3>${stageLabel(current)}</h3><p>${T.stages[current][1]}</p></div><div class="controls">${!locked && T.stageDone(s) ? `<button class="primary" data-action="Tour.next">Qua chặng tiếp theo →</button>` : `<button class="primary" data-action="Tour.section" data-arg="matches">Tiếp tục mùa giải →</button>`}</div></section>`}<div class="section-head">${title("LỊCH MÙA GIẢI", "Tám chặng. Một hành trình.", "Hoàn thành chặng hiện tại để mở sự kiện tiếp theo. Mọi kết quả đã đấu đều được giữ lại.")}</div><div class="tour-journey">${T.stages
    .map(([label, description], i) => {
      const finished = i < s.stage || T.stageDone(s, i),
        active = i === s.stage,
        future = i > s.stage;
      return `<article class="tour-journey-card ${finished ? "is-done" : active ? "is-current" : "is-locked"}"><div class="tour-journey-step"><span>${finished ? "✓" : String(i + 1).padStart(2, "0")}</span><small>${finished ? "HOÀN TẤT" : active ? "ĐANG DIỄN RA" : "CHƯA MỞ"}</small></div><h3>${label}</h3><p>${description}</p><button ${future ? "disabled" : ""} class="${active && !finished ? "primary" : ""}" data-action="Tour.viewStage" data-arg="${i}"><span>${future ? "Chờ các chặng trước" : finished ? "Xem kết quả" : "Vào thi đấu"}</span><span aria-hidden="true">${future ? "·" : "→"}</span></button></article>`;
    })
    .join("")}</div>`;
}
function championsHtml(s: T.TourSeason) {
  const winners = [
    ["World League", V.podium(s.league)],
    ["Challenger", s.challenger ? C.challengerPodium(s.challenger) : []],
    ["World Cup", F.worldPodium(s.worldcup)],
  ] as const;
  return `<section class="tour-season-finish"><span class="eyebrow">MÙA ${s.seasonNumber} · HÀNH TRÌNH TRỌN VẸN</span><h3>Những nhà vô địch của mùa Tour</h3><p>Ba danh hiệu, ba hành trình đáng nhớ.</p><div class="tour-champions">${winners
    .map(
      ([name, ids]) =>
        `<section><span class="eyebrow">${name}</span><div class="tour-champion-main"><span aria-hidden="true">🏆</span>${ids[0] ? team(ids[0]) : "–"}</div><div class="tour-champion-rest">${ids
          .slice(1)
          .map(
            (id, i) => `<div><span>${["🥈", "🥉"][i]}</span>${team(id)}</div>`,
          )
          .join("")}</div></section>`,
    )
    .join("")}</div></section>`;
}
function roundNav(
  rounds: Match[][],
  round: number,
  start = 0,
  end = rounds.length,
) {
  return `<nav class="swiss-round-nav tour-round-nav" aria-label="Chọn vòng thi đấu">${rounds
    .slice(start, end)
    .map(
      (row, i) =>
        `<button data-action="Tour.round" data-arg="${i + start}" aria-pressed="${round === i + start}">Vòng ${i + start + 1}${row.every((m) => m.sets) ? " ✓" : ""}</button>`,
    )
    .join("")}</nav>`;
}
function cards(
  s: T.TourSeason,
  ms: Match[],
  locked: boolean,
  label: string,
  history: Match[] = ms,
) {
  const available = new Set(T.batch(s).map((m) => m.id));
  return `<div class="grid tour-match-grid">${ms.map((m) => seasonMatchCard(m, (id) => seasonTeam(id, history), "Tour", locked || !available.has(m.id), label)).join("")}</div>`;
}
function leagueRound(v: TourViewState) {
  const [a, b] = T.phaseBounds(v.stage);
  return Math.max(a, Math.min(b - 1, v.round));
}
function leagueTable(s: T.TourSeason, round: number) {
  const { rows, changes, snapshot } = V.roundStandings(s.league, round);
  return `<p class="sub">Kết quả tích lũy từ vòng 1 đến vòng ${round + 1} · W/L → HS set → HS điểm → đối đầu → bốc thăm.</p><div class="legend"><span><i class="dot"></i>1–16: Playoff</span><span><i class="dot yellow"></i>17–24: Play-in</span><span><i class="dot gray"></i>25–32: Dừng cuộc chơi</span></div><div class="panel table-wrap"><table class="full-standings tour-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN · PHONG ĐỘ</th><th>TRẬN</th><th>W</th><th>L</th><th>SET</th><th>HS SET</th><th>HS ĐIỂM</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${i < 16 ? "direct" : i < 24 ? "in" : ""}"><td>${i + 1}${rankMovementHtml(changes[r.id], round)}</td><td>${seasonTeam(r.id, snapshot.rounds.flat())}</td><td>${r.w + r.l}</td><td><b>${r.w}</b></td><td>${r.l}</td><td>${r.sf}:${r.sa}</td><td>${r.sf - r.sa}</td><td>${r.pf - r.pa}</td><td><button data-action="Tour.team" data-arg="${r.id}">Chi tiết ↗</button></td></tr>`).join("")}</tbody></table></div>`;
}
function leagueHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const [a, b] = T.phaseBounds(v.stage),
    r = leagueRound(v),
    nav = roundNav(s.league.rounds, r, a, b);
  return `${nav}${v.section === "table" ? leagueTable(s, r) : `<div class="section-head"><h3>League · Vòng ${r + 1}</h3><span class="badge">${s.league.rounds[r].filter((m) => m.sets).length}/16 TRẬN</span></div>${cards(s, s.league.rounds[r], locked, `League · Vòng ${r + 1}`, s.league.rounds.slice(0, r + 1).flat())}`}`;
}
function regionNav(region: Region) {
  return `<nav class="tour-region-nav" aria-label="Khu vực thi đấu">${F.regionOrder.map((r) => `<button data-action="Tour.region" data-arg="${r}" aria-pressed="${r === region}">${names[r]}</button>`).join("")}</nav>`;
}
function qualifiersHtml(s: T.TourSeason, includePlayin = true) {
  const f = s.worldcup;
  return `<div class="tour-qualified-regions">${F.regionOrder
    .map((r) => {
      const g = f.regions[r],
        direct = F.regionalDone(g) ? F.regionQualifiers(g, r) : [],
        extra =
          (includePlayin ? f.intercontinental : null)?.branches
            .map(F.qualifierWinner)
            .filter((id): id is string => !!id && V.get(id).region === r) || [];
      const ids = [...new Set([...direct, ...extra])];
      return `<section class="panel tour-qualified-region"><div class="section-head"><h4>${names[r]}</h4><span class="badge">${ids.length} VÉ</span></div><div class="tour-qualified-list">${ids.map((id) => `<div>${team(id)}<span>${extra.includes(id) ? "Play-in ✓" : "✓"}</span></div>`).join("") || '<p class="sub">Chưa có vé được chốt.</p>'}</div></section>`;
    })
    .join("")}</div>`;
}
function regionalHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const regional = { ...s.worldcup, intercontinental: null, world: null },
    g = regional.regions[v.region],
    r = Math.min(Math.max(0, v.round), g.rounds.length - 1),
    grouped = g.groups || [g.teamIds];
  const tables = grouped
    .map((_, i) => {
      const group = g.groups ? F.regionalGroup(g, i) : g;
      return `<section class="panel tour-group-table"><div class="section-head"><h3>${g.groups ? `Bảng ${String.fromCharCode(65 + i)}` : names[v.region]}</h3><span class="badge">${group.teamIds.length} ĐỘI</span></div>${fullStandingsTable(group, g.directSlots || (v.region === "CSV" ? 2 : 1), Math.min(r, group.rounds.length - 1), true, true).replaceAll("Full.team", "Tour.team")}</section>`;
    })
    .join("");
  return `${regionNav(v.region)}${F.regionOrder.every((k) => F.regionalDone(s.worldcup.regions[k])) ? qualifiersHtml(s, false) : ""}${
    v.section === "playoff"
      ? g.playoff
        ? qualifierTreeHtml(regional, g.playoff, v.region, {
            readonly: locked,
            actionPrefix: "Tour",
          })
        : `<section class="panel tour-empty"><h3>${v.region === "CSV" ? "Nam Mỹ không có playoff khu vực" : "Chờ hoàn tất vòng bảng"}</h3><p>${v.region === "CSV" ? "Top 2 giành vé World Cup. Hạng 3 dự Play-in liên khu vực." : "Hạng 2–3 mỗi bảng sẽ tranh một vé World Cup qua playoff khu vực."}</p></section>`
      : `${roundNav(g.rounds, r)}${
          v.section === "table"
            ? tables
            : `<div class="tour-regional-groups">${grouped
                .map(
                  (ids, i) =>
                    `<section class="tour-group-fixtures"><div class="section-head"><h3>${g.groups ? `Bảng ${String.fromCharCode(65 + i)}` : names[v.region]} · Vòng ${r + 1}</h3><button data-action="Tour.section" data-arg="table">Xem BXH ↗</button></div>${cards(
                      s,
                      g.rounds[r].filter((m) => ids.includes(m.a)),
                      locked,
                      `${names[v.region]} · Vòng ${r + 1}`,
                      g.rounds.slice(0, r + 1).flat(),
                    )}</section>`,
                )
                .join(
                  "",
                )}</div>${g.playoff ? `<details class="panel tour-details" ${F.fullLeagueDone(g) ? "open" : ""}><summary>Playoff khu vực · ${names[v.region]}</summary>${qualifierTreeHtml(regional, g.playoff, v.region, { readonly: locked, actionPrefix: "Tour" })}</details>` : ""}`
        }`
  }`;
}
function swissTable(s: C.ChallengerSeason, r: number) {
  const rows = C.challengerStandings(s, r);
  return `<div class="panel table-wrap"><table class="full-standings tour-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN · PHONG ĐỘ</th><th>W</th><th>L</th><th>OMW%</th><th>HS SET</th><th>HS ĐIỂM</th><th>TRẠNG THÁI</th></tr></thead><tbody>${rows.map((t, i) => `<tr class="${t.w === 3 ? "direct" : ""}"><td>${i + 1}</td><td><button class="tour-table-team" data-action="Tour.team" data-arg="${t.id}">${seasonTeam(t.id, s.rounds.slice(0, r + 1).flat())}</button></td><td><b>${t.w}</b></td><td>${t.l}</td><td>${(t.omw * 100).toFixed(1)}%</td><td>${t.sf - t.sa}</td><td>${t.pf - t.pa}</td><td>${t.w === 3 ? '<span class="full-qualification">✓ Vào playoff</span>' : t.l === 3 ? '<span class="swiss-eliminated">Bị loại</span>' : `<span class="swiss-record">${t.w}–${t.l}</span>`}</td></tr>`).join("")}</tbody></table></div>`;
}
function challengerHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const c = s.challenger;
  if (!c)
    return '<section class="panel tour-empty"><h3>Challenger chưa mở</h3><p>Hoàn tất League Phase 2 để khởi tranh Swiss Stage.</p></section>';
  const r = Math.max(0, Math.min(v.round, c.rounds.length - 1));
  if (v.section === "playoff")
    return c.bracket
      ? `${livePodium(c.bracket, team)}${connectedPlayoffTree(c.bracket, locked, (id) => seasonTeam(id, C.challengerMatches(c)), { prefix: "Tour", label: "Nhánh Challenger trong mùa Tour" })}`
      : '<section class="panel tour-empty"><h3>Playoff · 16 đội</h3><p>Hoàn tất Swiss để xác định 16 quốc gia đủ ba trận thắng. Nhánh sẽ được bốc thăm tự động.</p></section>';
  return `${roundNav(c.rounds, r)}${v.section === "table" ? swissTable(c, r) : `<div class="swiss-view-switch" role="group" aria-label="Giao diện Swiss"><button data-action="Tour.swissView" data-arg="tree" aria-pressed="${v.swissView === "tree"}">Sơ đồ Swiss</button><button data-action="Tour.swissView" data-arg="matches" aria-pressed="${v.swissView === "matches"}">Danh sách trận</button>${c.bracket ? '<button data-action="Tour.section" data-arg="playoff">Vào nhánh playoff →</button>' : ""}</div>${v.swissView === "tree" ? swissTreeHtml(c, r).replaceAll("Challenger.", "Tour.") : cards(s, c.rounds[r], locked, `Swiss · Vòng ${r + 1}`, c.rounds.slice(0, r + 1).flat())}`}`;
}
function playinHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const ic = s.worldcup.intercontinental;
  if (!ic)
    return '<section class="panel tour-empty"><h3>Play-in chưa mở</h3><p>Chặng này mở sau League Phase 3.</p></section>';
  return `${v.section === "table" ? qualifiersHtml(s) : `<p class="sub">Mỗi nhánh trao một vé World Cup. Các đội được miễn sơ loại đã có sẵn trong nhánh.</p>${ic.branches.map((b, i) => `<section class="tour-qualifier-branch"><div class="section-head"><h3>Nhánh ${"ABC"[i]}</h3><span class="badge">1 VÉ WORLD CUP</span></div>${qualifierTreeHtml({ ...s.worldcup, world: null }, b, `IC${i}`, { readonly: locked, actionPrefix: "Tour" })}</section>`).join("")}${F.intercontinentalDone(s.worldcup) ? `<details class="panel tour-details"><summary>24 đội giành vé World Cup</summary>${qualifiersHtml(s)}</details>` : ""}`}`;
}
function leaguePlayoffHtml(s: T.TourSeason, locked: boolean) {
  const l = s.league,
    b = l.bracket,
    history = V.matches(l),
    markup = (id: string) =>
      seasonTeam(id, history, V.standings(l).findIndex((t) => t.id === id) + 1);
  return `${b ? livePodium(b, team) : ""}<details class="panel tour-details" ${!b?.r16.length ? "open" : ""}><summary>Play-in League · Hạng 17–24</summary><p class="sub">Bốn đội thắng vào vòng 20 đội, gặp các đội hạng 13–16. Top 12 được miễn vòng 20 đội.</p>${l.playin ? cards(s, l.playin, locked, "Play-in League", history) : '<p class="sub">Chờ League Phase 3 hoàn tất.</p>'}${b?.r20 ? `<h3>Vòng 20 đội · Tranh bốn suất cuối</h3>${cards(s, b.r20, locked, "Vòng 20 đội", history)}` : ""}</details>${b?.r16.length ? connectedPlayoffTree(b, locked, markup, { prefix: "Tour", label: "Nhánh playoff World League trong mùa Tour" }) : '<section class="panel tour-empty"><h3>Nhánh 16 đội đang chờ</h3><p>Hoàn tất Play-in và vòng 20 đội để chốt bốn nhánh. Từ vòng 16 đội, nhánh được giữ cố định.</p></section>'}`;
}
function worldHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const w = s.worldcup.world;
  if (!w)
    return '<section class="panel tour-empty"><h3>World Cup chưa khởi tranh</h3><p>World Cup mở khi Play-in và toàn bộ League đã kết thúc.</p></section>';
  const r = Math.max(0, Math.min(v.round, 2)),
    history = w.groups.flatMap((g) => g.rounds.slice(0, r + 1).flat());
  if (v.section === "playoff")
    return w.bracket
      ? `${livePodium(w.bracket, team)}${connectedPlayoffTree(w.bracket, locked, (id) => seasonTeam(id, F.fullMatches(s.worldcup)), { prefix: "Tour", label: "Nhánh World Cup trong mùa Tour" })}`
      : '<section class="panel tour-empty"><h3>16 suất playoff</h3><p>Hai đội đầu mỗi bảng và bốn đội hạng ba tốt nhất sẽ bước tiếp sau ba lượt trận.</p></section>';
  const historical = F.worldAtRound(w, r),
    thirds = F.worldThirds(historical),
    finished = historical.groups.every(F.fullLeagueDone);
  return `${roundNav(w.groups[0].rounds, r)}${v.section === "table" ? `<div class="tour-world-tables">${w.groups.map((g, i) => `<section class="panel tour-group-table"><div class="section-head"><h3>Bảng ${"ABCDEF"[i]}</h3><span class="badge">TOP 2 ĐI TIẾP</span></div>${fullStandingsTable(g, 2, r).replaceAll("Full.team", "Tour.team")}</section>`).join("")}</div><section class="panel tour-group-table"><div class="section-head"><h3>Cuộc đua các đội hạng ba</h3><span class="badge">4 SUẤT PLAYOFF</span></div><div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>BẢNG</th><th>W</th><th>L</th><th>HS SET</th><th>HS ĐIỂM</th></tr></thead><tbody>${thirds.map((t, i) => `<tr class="${i < 4 ? "direct" : ""}"><td>${i + 1}</td><td>${team(t.id)}${finished && i < 4 ? '<span class="full-qualification">✓ Vào playoff</span>' : ""}</td><td>${"ABCDEF"[t.group]}</td><td>${t.w}</td><td>${t.l}</td><td>${t.sf - t.sa}</td><td>${t.pf - t.pa}</td></tr>`).join("")}</tbody></table></div></section>` : `<p class="sub">Lượt ${r + 1}/3 · Các bảng A–F thi đấu cùng lượt trước khi chuyển sang lượt tiếp theo.</p>${w.groups.map((g, i) => `<section class="tour-group-fixtures"><div class="section-head"><h3>Bảng ${"ABCDEF"[i]} · Lượt ${r + 1}</h3><button data-action="Tour.section" data-arg="table">Xem BXH ↗</button></div>${cards(s, g.rounds[r], locked, `World Cup · Bảng ${"ABCDEF"[i]} · Lượt ${r + 1}`, history)}</section>`).join("")}${w.bracket ? '<button class="primary" data-action="Tour.section" data-arg="playoff">Vào nhánh World Cup →</button>' : ""}`}`;
}
function rosterHtml(s: T.TourSeason) {
  return `<div class="section-head">${title("ĐỘI HÌNH ĐÃ XÁC NHẬN", "32 quốc gia. Hai đấu trường.", "League và Challenger dùng chung danh sách dưới đây. Vòng loại World Cup có đầy đủ 100 đội.")}</div><div class="tour-roster-regions">${F.regionOrder
    .map(
      (r) =>
        `<section class="panel"><div class="section-head"><h3>${names[r]}</h3><span class="badge">${T.quotas[r]} ĐỘI</span></div>${s.roster
          .filter((id) => V.get(id).region === r)
          .map(
            (id) =>
              `<div class="tour-roster-team"><span class="team-rank">#${V.get(id).rank}</span>${team(id)}</div>`,
          )
          .join("")}</section>`,
    )
    .join("")}</div>`;
}
function rulesHtml() {
  return `<section class="panel tour-rules"><span class="eyebrow">VOLLEYWORLD TOUR</span><h3>Thể thức mùa giải</h3><div class="tour-rule-grid"><section><h4>Đội hình chung</h4><p>32 đội: châu Âu 7, châu Á & Đại Dương 7, Nam Mỹ 6, Bắc/Trung Mỹ & Caribe 7, châu Phi 5. Đội hình League và Challenger được giữ nguyên suốt mùa.</p></section><section><h4>League xuyên suốt</h4><p>31 vòng, mỗi đối thủ gặp nhau một lần. Ba chặng 10 + 10 + 11 vòng dùng chung một BXH. W/L → hiệu số set → hiệu số điểm → đối đầu → bốc thăm đã lưu.</p></section><section><h4>Playoff League</h4><p>Top 16 đi tiếp. Hạng 17–24 đấu Play-in; bốn đội thắng gặp hạng 13–16 ở vòng 20 đội. Top 12 được miễn vòng này. Vòng 16 đội chia bốn seed, nhánh cố định, có tranh hạng ba trước chung kết.</p></section><section><h4>Challenger</h4><p>Swiss tối đa năm vòng: ba trận thắng đi tiếp, ba trận thua bị loại. Vòng đầu khác khu vực; các vòng sau cùng W/L và không tái đấu. 16 đội vào playoff loại trực tiếp, có tranh hạng ba.</p></section><section><h4>Vé World Cup</h4><p>100 quốc gia thi đấu vòng loại khu vực. Nhất bảng đi thẳng; hạng 2–3 đấu playoff khu vực. Nam Mỹ lấy top 2, hạng 3 dự Play-in. 27 đội Play-in chia ba nhánh để chọn ba vé cuối.</p></section><section><h4>Sân khấu thế giới</h4><p>World Cup chỉ mở khi League và Play-in hoàn tất. 24 đội chia sáu bảng bốn đội; top 2 mỗi bảng và bốn đội hạng ba tốt nhất vào vòng 16 đội. Nhánh cố định, có tranh hạng ba.</p></section><section><h4>Điểm thi đấu</h4><p>Tất cả trận BO5. Set 1–4 đến 25, set 5 đến 15, phải hơn hai điểm. Mô phỏng, nhập tay, mô phỏng từng set và chọn tỷ số đều dùng bộ nhập điểm chung.</p></section><section><h4>Lưu hành trình</h4><p>Tiến trình được lưu theo từng mùa. Có thể xem lại các chặng đã hoàn tất. Mỗi giải có danh hiệu riêng; Tour tổng kết cả ba đấu trường.</p></section></div></section>`;
}
export function seasonHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const n = T.played(s),
    past = v.stage < s.stage || T.stageDone(s, v.stage),
    read = locked || past;
  const body =
    v.section === "journey"
      ? journeyHtml(s, locked)
      : v.section === "teams"
        ? rosterHtml(s)
        : v.section === "rules"
          ? rulesHtml()
          : v.stage > s.stage
            ? '<section class="panel tour-empty"><h3>Chặng chưa mở</h3><p>Hoàn tất chặng hiện tại để tiếp tục mùa Tour.</p></section>'
            : `${stageHeader(s, v, locked)}${[0, 2, 4].includes(v.stage) ? (v.section === "playoff" ? '<section class="panel tour-empty"><h3>League đang tích lũy điểm</h3><p>Play-in và playoff diễn ra ở chặng 7, sau World Cup Play-in.</p><button data-action="Tour.section" data-arg="table">Xem BXH League →</button></section>' : leagueHtml(s, v, read)) : v.stage === 1 ? regionalHtml(s, v, read) : v.stage === 3 ? challengerHtml(s, v, read) : v.stage === 5 ? playinHtml(s, v, read) : v.stage === 6 ? (v.section === "table" ? leagueTable(s, 30) : leaguePlayoffHtml(s, read)) : worldHtml(s, v, read)}`;
  return `<div class="tour-page"><div class="section-head tour-season-heading"><div><span class="eyebrow">VOLLEYWORLD TOUR · ${T.complete(s) ? "MÙA ĐÃ HOÀN TẤT" : "MỘT MÙA · BA ĐẤU TRƯỜNG"}</span><h2>Mùa ${s.seasonNumber}</h2><p class="sub">${T.complete(s) ? "Tất cả tám chặng đã khép lại" : `Chặng ${s.stage + 1}/8 · ${stageLabel(s.stage)}`} · ${n}/${T.totalMatches} trận</p></div><div class="controls"><button data-action="Tour.enter">← Các mùa Tour</button><button data-action="Tour.exportOne">Xuất mùa này</button>${locked || T.complete(s) ? "" : '<button data-action="Tour.restore">Khôi phục bản trước</button><button data-action="Tour.finish">Mô phỏng hết mùa</button>'}</div></div>${progressHtml(n)}${navigation(s, v)}${body}</div>`;
}
