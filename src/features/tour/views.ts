import * as T from "../../domain/tour/index";
import * as V from "../../domain/index";
import * as C from "../../domain/challenger/index";
import * as F from "../../domain/full-season/index";
import type { Match, Region } from "../../domain/types";
import type { TourRecord } from "./model";
import {
  honoursOf,
  competitionKeys,
  competitionNames,
  medalSymbols,
  medalNames,
} from "./achievements";
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
  group?: number | null;
}
const stageLabel = (s: T.TourSeason, n: number) =>
  T.calendar(s)[Math.min(7, n)][0];
const progressHtml = (played: number, total = T.totalMatches) =>
  `<div class="tour-progress" role="progressbar" aria-label="Tiến độ cả mùa" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${played}"><i style="width:${Math.min(100, (played / total) * 100)}%"></i></div>`;
const title = (eyebrow: string, heading: string, sub = "") =>
  `<div><span class="eyebrow">${eyebrow}</span><h3>${heading}</h3>${sub ? `<p class="sub">${sub}</p>` : ""}</div>`;
function recordTotal(r: TourRecord) {
  return r.snapshot
    ? T.seasonTotal(r.snapshot)
    : r.total_matches
      ? r.total_matches
      : r.status === "completed"
        ? r.played
        : T.totalMatches;
}
function historyAwards(r: TourRecord) {
  const awards = honoursOf(r);
  return `<div class="tour-history-awards">${competitionKeys.map((key) => `<section data-history-competition="${key}"><h4>${competitionNames[key]}</h4>${awards && awards[key].length ? awards[key].map((id, i) => `<div class="tour-history-award medal-${i + 1}"><span class="tour-history-medal" title="${medalNames[i]}">${medalSymbols[i]}</span>${team(id)}<small>${medalNames[i]}</small></div>`).join("") : `<p class="tour-award-unavailable">${r.status === "completed" ? "Chưa tải bảng huy chương" : "Chưa xác định huy chương"}</p>`}</section>`).join("")}</div>`;
}
export function libraryHtml(records: TourRecord[]) {
  return `<div class="tour-page"><section class="tour-hero"><div><span class="eyebrow">MỘT MÙA · BA ĐẤU TRƯỜNG</span><h2>VolleyWorld <em>Tour</em></h2><p>Từ cuộc đua League, vượt qua thử thách Swiss,<br>đến sân khấu World Cup.</p><div class="actions"><button class="primary" data-action="Tour.create">Bắt đầu hành trình mới →</button><button data-action="Tour.achievements">Thành tích quốc gia ↗</button></div></div><div class="tour-hero-route" aria-hidden="true"><span>LEAGUE</span><i>↗</i><span>CHALLENGER</span><i>↗</i><strong>WORLD CUP</strong><small>8 CHẶNG · ${T.totalMatches} TRẬN</small></div></section><div class="tour-library-facts"><div><b>32 đội</b><span>League & Challenger cùng đội hình</span></div><div><b>100 đội</b><span>Vòng loại tại năm khu vực</span></div><div><b>3 danh hiệu</b><span>Một hành trình xuyên suốt mùa</span></div></div><div class="full-library-toolbar"><button data-action="Tour.export">Xuất lịch sử</button><button data-action="Tour.import">Nhập lịch sử</button><button data-action="Tour.sync">Đồng bộ lịch sử</button></div><div class="section-head">${title("HÀNH TRÌNH CỦA BẠN", "Các mùa Tour", records.length ? `${records.length} mùa · ${records.filter((r) => r.status === "completed").length} đã hoàn tất` : "Sẵn sàng bắt đầu mùa bóng chuyền của riêng bạn.")}</div>${
    records.length
      ? `<div class="season-grid tour-season-grid">${[...records]
          .sort((a, b) => b.season_number - a.season_number)
          .map(
            (r) =>
              `<article class="panel season-card tour-season-card ${r.status === "completed" ? "is-completed" : ""}" data-tour-season="${esc(r.season_id)}"><div class="season-card-top"><span class="eyebrow">TOUR · MÙA ${r.season_number}</span><span class="badge ${r.status === "completed" ? "gold" : ""}">${r.phase === "conflict" ? "Có xung đột" : r.status === "completed" ? "Hoàn tất" : r.played ? "Đang diễn ra" : "Sẵn sàng"}</span></div><h3>Mùa ${r.season_number}</h3><p class="sub">${r.status === "completed" ? "Bảng huy chương của ba đấu trường" : r.snapshot ? stageLabel(r.snapshot, r.snapshot.stage) : "League · Challenger · World Cup"}</p>${r.status === "completed" ? historyAwards(r) : `<div class="tour-card-progress"><div><span>TIẾN ĐỘ MÙA</span><b>${r.played}<small> / ${recordTotal(r)} trận</small></b></div>${progressHtml(r.played, recordTotal(r))}</div>`}<div class="tour-card-footer"><small>${r.phase === "conflict" ? "Cần chọn bản lưu" : r.dirty ? "Đã giữ trên thiết bị" : r.revision ? "Đã đồng bộ" : "Đã lưu"}${r.status === "completed" ? ` · ${r.played} trận · 8 chặng hoàn tất` : ""}</small><button class="${r.status === "completed" ? "" : "primary"}" data-action="Tour.open" data-arg="${esc(r.season_id)}"><span>${r.status === "completed" ? "Xem tổng kết mùa" : r.played ? "Tiếp tục mùa giải" : "Bắt đầu mùa giải"}</span><span aria-hidden="true">→</span></button></div></article>`,
          )
          .join("")}</div>`
      : `<section class="panel tour-empty"><span class="tour-empty-mark" aria-hidden="true">↗</span><h3>Chặng đầu tiên đang chờ bạn</h3><p>Chọn 32 đội, hoàn thành tám chặng và tìm ra những nhà vô địch của mùa Tour đầu tiên.</p><button class="primary" data-action="Tour.create">Chọn đội tham dự →</button></section>`
  }</div>`;
}
const competitionOf = (stage: number, s: T.TourSeason) =>
  stage === 3
    ? "challenger"
    : [1, T.qualificationStage(s), 7].includes(stage)
      ? "worldcup"
      : "league";
const competitionStages = (s: T.TourSeason) => ({
  league: [0, 2, 4, T.leagueStage(s)],
  challenger: [3],
  worldcup: [1, T.qualificationStage(s), 7],
});
function competitionOverviewHtml(s: T.TourSeason, v: TourViewState) {
  const selected = competitionOf(v.stage, s),
    live = T.complete(s) ? null : competitionOf(s.stage, s),
    berths = tourBerths(s),
    leaguePlayed = V.matches(s.league).filter((m) => m.sets).length,
    leagueRounds = s.league.rounds.filter((row) =>
      row.every((m) => m.sets),
    ).length,
    c = s.challenger,
    cPlayed = c ? C.challengerMatches(c).filter((m) => m.sets).length : 0,
    wPlayed = F.fullMatches(s.worldcup).filter((m) => m.sets).length;
  const entries = [
    {
      key: "league",
      name: "World League",
      played: leaguePlayed,
      total: V.totalMatches(s.league),
      status: V.complete(s.league)
        ? "Đã hoàn tất"
        : live === "league"
          ? `Đang thi đấu · Phase ${s.stage === 0 ? 1 : s.stage === 2 ? 2 : s.stage === 4 ? 3 : 4}`
          : leaguePlayed
            ? "Tạm nghỉ giữa các phase"
            : "Sẵn sàng khởi tranh",
      meta: `${leagueRounds}/31 vòng League hoàn tất`,
      done: V.complete(s.league),
    },
    {
      key: "challenger",
      name: "Challenger",
      played: cPlayed,
      total: 82,
      status:
        c && C.challengerComplete(c)
          ? "Đã hoàn tất"
          : c
            ? c.bracket
              ? "Playoff · 16 đội"
              : "Đang thi đấu Swiss"
            : "Chờ League Phase 2 hoàn tất",
      meta: c
        ? `${C.challengerStandings(c).filter((t) => t.w === 3).length}/16 vé playoff đã chốt`
        : "32 đội · chung đội hình League",
      done: !!c && C.challengerComplete(c),
    },
    {
      key: "worldcup",
      name: "World Cup",
      played: wPlayed,
      total: F.fullTotalMatches(s.worldcup),
      status: F.worldComplete(s.worldcup)
        ? "Đã hoàn tất"
        : s.worldcup.world
          ? s.worldcup.world.bracket
            ? "Playoff thế giới"
            : "Vòng bảng · 24 đội"
          : F.intercontinentalDone(s.worldcup)
            ? "Đủ 24 đội · Chờ League kết thúc"
            : F.regionOrder.every((r) => F.regionalDone(s.worldcup.regions[r]))
              ? s.worldcup.intercontinental
                ? "Play-in · Tranh ba vé cuối"
                : "Chờ Play-in liên khu vực"
              : s.stage === 0
                ? "Chờ vòng loại khu vực"
                : "Đang vòng loại khu vực",
      meta: `${berths.total}/24 đội đã giành vé World Cup`,
      done: F.worldComplete(s.worldcup),
    },
  ];
  return `<section class="tour-competition-overview" aria-label="Tổng quan ba giải đấu">${entries.map((e) => `<button type="button" class="tour-competition-card ${selected === e.key ? "is-selected" : ""} ${e.done ? "is-complete" : ""}" data-action="Tour.competition" data-arg="${e.key}" data-competition-overview="${e.key}" aria-pressed="${selected === e.key}"><span class="tour-competition-card-head"><span class="eyebrow">${e.key === "league" ? "31 VÒNG · PLAYOFF" : e.key === "challenger" ? "SWISS · PLAYOFF" : "VÒNG LOẠI · THẾ GIỚI"}</span><span class="tour-competition-view-label">${selected === e.key ? "ĐANG XEM" : "XEM GIẢI ↗"}</span></span><strong class="tour-competition-card-title">${e.name}</strong><span class="tour-competition-card-status ${live === e.key && !e.done ? "is-live" : ""}"><i aria-hidden="true"></i>${e.status}</span><span class="tour-competition-card-progress"><span><b>${e.played}</b> / ${e.total} trận</span><span class="tour-competition-mini-track"><i style="width:${Math.min(100, (e.played / e.total) * 100)}%"></i></span></span><span class="tour-competition-card-meta ${e.key === "worldcup" ? "is-berths" : ""}">${e.meta}</span></button>`).join("")}</section><div class="tour-calendar-context"><span><i aria-hidden="true"></i>${T.complete(s) ? "Mùa giải đã hoàn tất" : `Lịch mùa đang ở chặng ${s.stage + 1}: <b>${stageLabel(s, s.stage)}</b>`}</span>${(v.stage !== s.stage || ["teams", "rules", "qualifiers"].includes(v.section)) && !T.complete(s) ? `<span class="tour-view-context">${v.stage === s.stage ? "Đang xem thông tin" : v.stage < s.stage ? "Đang xem lại" : "Xem trước"}: ${stageLabel(s, v.stage)}${s.stage < 8 ? ` <button data-action="Tour.resume">Về chặng hiện tại →</button>` : ""}</span>` : ""}</div>`;
}
function navigation(s: T.TourSeason, v: TourViewState) {
  const selected = competitionOf(v.stage, s),
    phaseNames: Record<number, string> = {
      0: "Phase 1 · Vòng 1–10",
      2: "Phase 2 · Vòng 11–20",
      4: "Phase 3 · Vòng 21–31",
      6: "Phase 4 · Playoff",
      3: "Swiss & Playoff",
      1: "Vòng loại khu vực",
      5: "Play-in liên khu vực",
      7: "World Cup 24 đội",
    };
  if (T.merit(s)) {
    phaseNames[5] = "Phase 4 · Playoff";
    phaseNames[6] = "Playoff khu vực & Play-in";
  }
  return `<div class="tour-navigation-bar"><nav class="full-nav tour-main-nav" aria-label="Điều hướng mùa Tour">${[
    ...(T.complete(s) ? [["journey", "Tổng kết mùa"]] : []),
    ["matches", "Lịch thi đấu"],
    ["table", "Bảng xếp hạng"],
    ["playoff", "Nhánh playoff"],
    ["qualifiers", "Vé World Cup"],
  ]
    .map(
      ([key, label]) =>
        `<button data-action="Tour.section" data-arg="${key}" class="${v.section === key ? "active" : ""}" aria-pressed="${v.section === key}">${label}</button>`,
    )
    .join(
      "",
    )}</nav><details class="tour-more-menu tour-info-menu"><summary>Thông tin mùa</summary><div><button data-action="Tour.section" data-arg="journey" aria-current="${v.section === "journey" ? "page" : "false"}">${T.complete(s) ? "Tổng kết mùa" : "Hành trình tám chặng"}</button><button data-action="Tour.section" data-arg="teams" aria-current="${v.section === "teams" ? "page" : "false"}">Đội tham dự</button><button data-action="Tour.section" data-arg="rules" aria-current="${v.section === "rules" ? "page" : "false"}">Thể thức</button></div></details></div>${
    ["journey", "teams", "rules", "qualifiers"].includes(v.section)
      ? ""
      : `<nav class="tour-stage-tabs tour-competition-phases" aria-label="Các giai đoạn ${competitionNames[selected]}">${competitionStages(
          s,
        )
          [selected].map(
            (i) =>
              `<button data-action="Tour.viewStage" data-arg="${i}" ${i > s.stage ? "disabled" : ""} aria-pressed="${v.stage === i}"><span>${i < s.stage ? "✓" : i > s.stage ? "·" : "●"}</span>${phaseNames[i]}</button>`,
          )
          .join("")}</nav>`
  }`;
}
function stageActions(s: T.TourSeason, v: TourViewState, locked: boolean) {
  if (locked || v.stage !== s.stage || T.complete(s)) return "";
  return T.stageDone(s)
    ? `<button class="primary" data-action="Tour.next">${s.stage === 7 ? "Xem tổng kết mùa →" : `Qua ${stageLabel(s, s.stage + 1)} →`}</button>`
    : `<button class="primary" data-action="Tour.simRound">Chạy lượt hiện tại</button><button data-action="Tour.finishStage">Mô phỏng hết chặng</button>`;
}
function stageHeader(s: T.TourSeason, v: TourViewState, locked: boolean) {
  return `<div class="section-head tour-stage-heading">${title(`CHẶNG ${v.stage + 1} / 8`, stageLabel(s, v.stage), T.calendar(s)[v.stage][1])}<div class="controls">${stageActions(s, v, locked)}</div></div>${v.stage < s.stage || T.stageDone(s, v.stage) ? '<p class="tour-history-note">✓ Chặng đã hoàn tất · Xem lại kết quả đã lưu</p>' : ""}`;
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
  if (T.complete(s))
    return `${championsHtml(s)}<details class="panel tour-journey-disclosure"><summary><span>Hành trình tám chặng</span><small>Toàn bộ lịch thi đấu và kết quả của mùa</small></summary><ol class="tour-journey-recap">${T.calendar(
      s,
    )
      .map(
        ([label, description], i) =>
          `<li><span aria-hidden="true">✓</span><div><b>${label}</b><small>${description}</small></div><button data-action="Tour.viewStage" data-arg="${i}">Xem kết quả ↗</button></li>`,
      )
      .join("")}</ol></details>`;
  const current = Math.min(s.stage, 7);
  return `<section class="tour-current"><div><span class="eyebrow">${T.stageDone(s) ? "CHẶNG ĐÃ HOÀN TẤT" : `ĐANG THI ĐẤU · CHẶNG ${s.stage + 1}`}</span><h3>${stageLabel(s, current)}</h3><p>${T.calendar(s)[current][1]}</p></div><div class="controls">${!locked && T.stageDone(s) ? `<button class="primary" data-action="Tour.next">Qua chặng tiếp theo →</button>` : `<button class="primary" data-action="Tour.resume">Tiếp tục mùa giải →</button>`}</div></section><div class="section-head">${title("LỊCH MÙA GIẢI", "Tám chặng. Một hành trình.", "Hoàn thành chặng hiện tại để mở sự kiện tiếp theo. Mọi kết quả đã đấu đều được giữ lại.")}</div><div class="tour-journey">${T.calendar(
    s,
  )
    .map(([label, description], i) => {
      const finished = i < s.stage || T.stageDone(s, i),
        active = i === s.stage,
        future = i > s.stage;
      return `<article class="tour-journey-card ${finished ? "is-done" : active ? "is-current" : "is-locked"}"><div class="tour-journey-step"><span>${finished ? "✓" : String(i + 1).padStart(2, "0")}</span><small>${finished ? "HOÀN TẤT" : active ? "ĐANG DIỄN RA" : "CHƯA MỞ"}</small></div><h3>${label}</h3><p>${description}</p><button ${future ? "disabled" : ""} class="${active && !finished ? "primary" : ""}" data-action="Tour.viewStage" data-arg="${i}"><span>${future ? "Chờ các chặng trước" : finished ? "Xem kết quả" : "Vào thi đấu"}</span><span aria-hidden="true">${future ? "·" : "→"}</span></button></article>`;
    })
    .join("")}</div>`;
}
function championsHtml(s: T.TourSeason) {
  const awards = honoursOf({ snapshot: s } as TourRecord)!;
  return `<section class="tour-summary-heading"><div><span class="eyebrow">MÙA ${s.seasonNumber} · ${T.played(s)} TRẬN ĐÃ ĐẤU</span><h3>Một mùa trọn vẹn.</h3><p>Ba đấu trường, chín vị trí trên bục huy chương.</p></div><span class="tour-summary-seal"><span aria-hidden="true">✓</span>8 chặng hoàn tất</span></section><div class="tour-champions">${competitionKeys.map((key, i) => `<section class="tour-competition-summary" data-summary-competition="${key}"><div class="tour-competition-heading"><span class="eyebrow">${String(i + 1).padStart(2, "0")} / BA ĐẤU TRƯỜNG</span><h3>${competitionNames[key]}</h3><small>${key === "league" ? "31 vòng League · Play-in · Playoff" : key === "challenger" ? "Swiss Stage · Playoff 16 đội" : "Vòng bảng · Playoff 16 đội"}</small></div><ol class="tour-summary-podium">${awards[key].map((id, place) => `<li class="medal-${place + 1}" data-medal-place="${place + 1}"><span class="tour-podium-medal" aria-hidden="true">${medalSymbols[place]}</span><div><small>${medalNames[place]}</small>${team(id)}</div></li>`).join("")}</ol><div class="tour-competition-links"><button data-action="Tour.viewStage" data-arg="${key === "league" ? String(T.leagueStage(s)) : key === "challenger" ? "3" : "7"}" data-section="table">${key === "challenger" ? "BXH Swiss" : key === "worldcup" ? "BXH vòng bảng" : "BXH League"} ↗</button><button data-action="Tour.viewStage" data-arg="${key === "league" ? String(T.leagueStage(s)) : key === "challenger" ? "3" : "7"}" data-section="playoff">Nhánh playoff ↗</button></div></section>`).join("")}</div>`;
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
  if (!ms.length)
    return '<p class="tour-fixture-empty">Bảng này không có trận ở lượt đang xem. Chọn lượt khác để xem lịch thi đấu.</p>';
  const available = new Set(T.batch(s).map((m) => m.id));
  return `<div class="grid tour-match-grid">${ms.map((m) => seasonMatchCard(m, (id) => seasonTeam(id, history), "Tour", locked || !available.has(m.id), label)).join("")}</div>`;
}
function leagueRound(v: TourViewState) {
  const [a, b] = T.phaseBounds(v.stage);
  return Math.max(a, Math.min(b - 1, v.round));
}
function leagueTable(s: T.TourSeason, round: number) {
  const { rows, changes, snapshot } = V.roundStandings(s.league, round),
    slots = V.entrySlots(s.league);
  return `<p class="sub">Kết quả tích lũy từ vòng 1 đến vòng ${round + 1} · W/L → HS set → HS điểm → đối đầu → bốc thăm.</p><div class="legend"><span><i class="dot"></i>1–${slots.direct}: Playoff</span><span><i class="dot yellow"></i>${slots.direct + 1}–${slots.advance}: Play-in</span><span><i class="dot gray"></i>${slots.advance + 1}–32: Dừng cuộc chơi</span></div><div class="panel table-wrap"><table class="full-standings tour-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN · PHONG ĐỘ</th><th>TRẬN</th><th>W</th><th>L</th><th>SET</th><th>HS SET</th><th>HS ĐIỂM</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${i < slots.direct ? "direct" : i < slots.advance ? "in" : ""}"><td>${i + 1}${rankMovementHtml(changes[r.id], round)}</td><td>${seasonTeam(r.id, snapshot.rounds.flat())}</td><td>${r.w + r.l}</td><td><b>${r.w}</b></td><td>${r.l}</td><td>${r.sf}:${r.sa}</td><td>${r.sf - r.sa}</td><td>${r.pf - r.pa}</td><td><button data-action="Tour.team" data-arg="${r.id}">Chi tiết ↗</button></td></tr>`).join("")}</tbody></table></div>`;
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
function tourBerths(s: T.TourSeason) {
  const proof = F.worldCupBerths(s.worldcup);
  if (!T.merit(s)) return proof;
  const byId = new Map(proof.teams.map((t) => [t.id, t]));
  for (const t of T.automaticBerths(s))
    byId.set(t.id, {
      ...t,
      route: t.route as F.WorldCupBerth["route"],
      region: V.get(t.id).region,
    });
  return { ...proof, teams: [...byId.values()], total: byId.size };
}
function meritQualificationHtml(
  s: T.TourSeason,
  v: TourViewState,
  locked: boolean,
) {
  if (v.section === "table") return qualifiersHtml(s, true, true);
  const f = s.worldcup,
    ic = f.intercontinental;
  return `<section class="panel tour-merit-summary"><h3>2 vé đặc cách + 19 vé khu vực + 3 vé Play-in</h3><p>Hai đội đặc cách được bỏ qua khi phân suất khu vực. Kết quả vòng bảng giữ nguyên; không có vé theo Phase.</p>${T.automaticBerths(
    s,
  )
    .map(
      (t) => `<p data-merit-team="${t.id}">${team(t.id)} · ${esc(t.label)}</p>`,
    )
    .join(
      "",
    )}</section><details class="panel tour-details" ${!ic ? "open" : ""}><summary>Playoff khu vực · Chọn đại diện Play-in</summary>${F.regionOrder
    .filter((r) => r !== "CSV")
    .map(
      (r) =>
        `<section class="tour-qualifier-branch"><h3>${names[r]} · ${["CEV", "AVC"].includes(r) ? "4 suất Play-in liên khu vực" : "1 vé World Cup · Các đội thua dự Play-in"}</h3>${f.regions[r].playoff ? qualifierTreeHtml(f, f.regions[r].playoff!, r, { readonly: locked || !!ic, actionPrefix: "Tour" }) : "Chờ chốt hai đội đặc cách"}</section>`,
    )
    .join(
      "",
    )}<p>Nam Mỹ: hai đội đủ điều kiện cao nhất có vé trực tiếp; đội tiếp theo dự Play-in.</p></details>${ic ? playinHtml(s, v, locked) : '<section class="panel tour-empty"><h3>Play-in liên khu vực · 17 đội tranh 3 vé</h3><p>Hoàn tất playoff cả bốn khu vực để bốc thăm. Ba nhánh 6–6–5 đội, mỗi nhánh một vé; nhánh ít đội được chọn ngẫu nhiên.</p></section>'}`;
}
function qualifiersHtml(s: T.TourSeason, includePlayin = true, latest = false) {
  const f = includePlayin
      ? s.worldcup
      : { ...s.worldcup, intercontinental: null, world: null },
    berths =
      !includePlayin && T.merit(s)
        ? F.worldCupBerths({ ...f, automatic: null })
        : tourBerths({ ...s, worldcup: f });
  return `<section class="tour-world-berths" aria-label="Các đội giành vé World Cup"><div class="tour-world-berths-heading"><div><span class="eyebrow">${latest ? "VÉ WORLD CUP · CẬP NHẬT MỚI NHẤT" : "VÉ WORLD CUP ĐÃ XÁC ĐỊNH"}</span><h3>Đường đến World Cup</h3><p>${latest ? "Danh sách hiện tại của mùa, kể cả khi bạn đang xem một chặng cũ. " : ""}Đội đủ điều kiện được ghi nhận ngay; không cần chờ cả năm khu vực hoàn tất.</p></div><div class="tour-world-berth-count"><strong>${berths.total}<small> / ${berths.capacity}</small></strong><span>ĐỘI ĐÃ GIÀNH VÉ</span></div></div><div class="tour-qualified-regions">${F.regionOrder
    .map((r) => {
      const teams = berths.teams.filter((t) => t.region === r),
        regionDone = F.regionalDone(f.regions[r]);
      return `<section class="panel tour-qualified-region" data-berth-region="${r}"><div class="section-head"><h4>${names[r]}</h4><span class="badge">${teams.length} VÉ</span></div><div class="tour-qualified-list">${teams.map((t) => `<div data-qualified-team="${t.id}" data-route="${t.route}"><span class="tour-qualified-country">${team(t.id)}<small>${esc(t.label)}</small></span><span class="tour-ticket-check" aria-label="Đã giành vé">✓</span></div>`).join("") || '<p class="tour-berth-waiting">Chưa có đội giành vé.<br><span>Vé sẽ xuất hiện ngay khi đủ điều kiện.</span></p>'}</div><p class="tour-berth-region-status">${F.intercontinentalDone(f) ? "Danh sách dự World Cup đã chốt" : regionDone ? "Vòng loại khu vực đã hoàn tất" : f.regions[r].rounds.flat().some((m) => m.sets) ? "Vòng loại khu vực đang diễn ra" : "Chưa có trận vòng loại hoàn tất"}</p></section>`;
    })
    .join(
      "",
    )}</div><p class="tour-world-berth-note">${berths.total === berths.capacity ? "✓ Đã xác định đủ 24 đội. World Cup khởi tranh sau khi League kết thúc." : `${berths.capacity - berths.total} suất còn lại đang được tranh tại vòng loại, playoff khu vực và Play-in. Chỉ các đội chắc chắn có vé mới xuất hiện ở đây.`}</p></section>`;
}
function regionalGroupNav(
  count: number,
  selected: number | null,
  playoff: boolean,
) {
  return `<section class="panel full-group-switcher tour-regional-switcher" aria-label="Điều hướng bảng khu vực"><span class="full-group-switcher-label">BẢNG ĐẤU</span><nav class="full-group-nav"><button data-action="Tour.group" data-arg="all" aria-current="${selected === null ? "page" : "false"}">← Tổng quan khu vực</button>${Array.from({ length: count }, (_, i) => `<button data-action="Tour.group" data-arg="${i}" aria-current="${selected === i ? "page" : "false"}">Bảng ${String.fromCharCode(65 + i)}</button>`).join("")}${playoff ? '<button data-action="Tour.section" data-arg="playoff">Playoff khu vực →</button>' : ""}</nav></section>`;
}
function regionalOverview(s: T.TourSeason, v: TourViewState, round: number) {
  const region = s.worldcup.regions[v.region],
    groups = region.groups || [region.teamIds],
    regionalComplete =
      F.regionalDone(region) && round === region.rounds.length - 1,
    qualified =
      regionalComplete && !T.merit(s)
        ? F.regionQualifiers(region, v.region)
        : [],
    direct = region.directSlots || (v.region === "CSV" ? 2 : 1);
  return `<div class="section-head"><div><h3>${names[v.region]} · Vòng bảng</h3><p class="sub">${T.merit(s) ? "Vòng bảng · Suất đôn chốt sau chung kết League" : F.regionalDescription(s.worldcup, v.region)} · BXH tới vòng ${round + 1}.</p></div><span class="badge">${groups.length} BẢNG · ${region.teamIds.length} ĐỘI</span></div><div class="full-groups tour-regional-overview">${groups
    .map((_, i) => {
      const g = region.groups ? F.regionalGroup(region, i) : region,
        snapshot = V.leagueRoundSnapshot(
          g,
          Math.min(round, g.rounds.length - 1),
        ),
        rows = F.fullStandings(snapshot),
        berths = F.groupBerths(snapshot, direct, !T.merit(s), 3),
        groupComplete = F.fullLeagueDone(snapshot);
      return `<section class="panel full-group tour-regional-group" data-regional-group="${i}"><div class="section-head"><h3>${region.groups ? `Bảng ${String.fromCharCode(65 + i)}` : "Bảng khu vực"}</h3><span class="badge">${snapshot.rounds.flat().filter((m) => m.sets).length}/${g.rounds.flat().length} TRẬN</span></div><div class="table-wrap"><table class="tour-regional-compact"><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>W</th><th>L</th><th>HS SET</th></tr></thead><tbody>${rows
        .map((t, j) => {
          const status =
            qualified.includes(t.id) || berths[t.id].qualified
              ? '<span class="full-qualification" data-berth="qualified">✓ Giành vé World Cup</span>'
              : T.merit(s)
                ? j < 3
                  ? '<span class="full-qualification">Tạm tính · Chờ chốt vé đặc cách</span>'
                  : ""
                : regionalComplete && j < 3
                  ? '<span class="full-qualification" data-berth="contender">→ Play-in liên khu vực</span>'
                  : groupComplete && j < 3
                    ? `<span class="full-qualification" data-berth="contender">${v.region === "CSV" ? "→ Play-in liên khu vực" : "→ Playoff khu vực"}</span>`
                    : berths[t.id].contender
                      ? `<span class="full-qualification" data-berth="contender">${v.region === "CSV" ? "Bảo đảm ít nhất Play-in" : "Bảo đảm ít nhất playoff"}</span>`
                      : berths[t.id].eliminated
                        ? '<span class="full-qualification" data-berth="eliminated">Hết cơ hội giành vé</span>'
                        : "";
          return `<tr class="${j < direct ? "direct" : j < 3 ? "in" : ""}"><td>${j + 1}</td><td>${team(t.id)}${status}</td><td><b>${t.w}</b></td><td>${t.l}</td><td>${t.sf - t.sa > 0 ? "+" : ""}${t.sf - t.sa}</td></tr>`;
        })
        .join(
          "",
        )}</tbody></table></div><div class="tour-group-shortcuts"><button data-action="Tour.group" data-arg="${i}" data-section="matches">Lịch đấu →</button><button data-action="Tour.group" data-arg="${i}" data-section="table">Xem BXH →</button></div></section>`;
    })
    .join(
      "",
    )}</div>${T.merit(s) ? '<p class="tour-history-note">Các đội có vé đặc cách vẫn thi đấu vòng bảng. Playoff khu vực bốc thăm ở chặng 7 sau khi chốt hai đội đặc cách.</p>' : v.region !== "CSV" ? `<section class="panel full-world-gate tour-regional-playoff-gate"><div><span class="eyebrow">CHẶNG TIẾP THEO CỦA KHU VỰC</span><h3>Playoff khu vực · 1 vé World Cup</h3><p class="sub">Hạng 2–3 mỗi bảng tranh một vé. Các đội còn lại tiếp tục tới Play-in liên khu vực.</p></div><button class="primary" data-action="Tour.section" data-arg="playoff">${region.playoff ? "Vào nhánh đấu" : "Xem thể thức"} →</button></section>` : '<p class="tour-history-note">Nam Mỹ: top 2 giành vé trực tiếp, hạng 3 dự Play-in liên khu vực.</p>'}`;
}
function regionalHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const regional = { ...s.worldcup, intercontinental: null, world: null },
    g = regional.regions[v.region],
    r = Math.min(Math.max(0, v.round), g.rounds.length - 1),
    groups = g.groups || [g.teamIds],
    selected =
      Number.isInteger(v.group) && v.group! >= 0 && v.group! < groups.length
        ? v.group!
        : null;
  const nav = `${regionNav(v.region)}${regionalGroupNav(groups.length, selected, v.region !== "CSV")}`;
  if (v.section === "playoff" && T.merit(s))
    return `${nav}<section class="panel tour-empty"><h3>Playoff khu vực ở chặng 7</h3><p>Chờ hai vé đặc cách từ League và Challenger được xác định. BXH và kết quả vòng bảng vẫn được giữ nguyên.</p></section>`;
  if (v.section === "playoff")
    return `${nav}${g.playoff ? qualifierTreeHtml(regional, g.playoff, v.region, { readonly: locked, actionPrefix: "Tour" }) : `<section class="panel tour-empty"><h3>${v.region === "CSV" ? "Nam Mỹ không có playoff khu vực" : "Chờ hoàn tất vòng bảng"}</h3><p>${v.region === "CSV" ? "Top 2 giành vé World Cup. Hạng 3 dự Play-in liên khu vực." : "Hạng 2–3 mỗi bảng sẽ tranh một vé World Cup qua playoff khu vực."}</p></section>`}`;
  const table = (i: number) => {
    const group = g.groups ? F.regionalGroup(g, i) : g;
    return `<section class="panel tour-group-table"><div class="section-head"><h3>${g.groups ? `Bảng ${String.fromCharCode(65 + i)}` : names[v.region]}</h3><span class="badge">${group.teamIds.length} ĐỘI</span></div>${fullStandingsTable(group, g.directSlots || (v.region === "CSV" ? 2 : 1), Math.min(r, group.rounds.length - 1), !T.merit(s), true).replaceAll("Full.team", "Tour.team")}</section>`;
  };
  const allDone = F.regionOrder.every((k) =>
    F.regionalDone(s.worldcup.regions[k]),
  );
  const overview = selected === null && v.section === "matches";
  return `${nav}${roundNav(g.rounds, r)}${!T.merit(s) && allDone && r === g.rounds.length - 1 ? `<details class="panel tour-details tour-regional-tickets"><summary>${F.worldCupBerths(regional).total} đội đã giành vé từ vòng loại khu vực · Bấm xem</summary>${qualifiersHtml(s, false)}</details>` : ""}${
    overview
      ? regionalOverview(s, v, r)
      : selected === null
        ? groups.map((_, i) => table(i)).join("")
        : `${table(selected)}${
            v.section === "table"
              ? ""
              : `<section class="tour-group-fixtures"><div class="section-head"><h3>${g.groups ? `Bảng ${String.fromCharCode(65 + selected)}` : names[v.region]} · Vòng ${r + 1}</h3><span class="badge">LƯỢT ĐẤU CHUNG CÁC BẢNG</span></div>${cards(
                  s,
                  g.rounds[r].filter((m) => groups[selected].includes(m.a)),
                  locked,
                  `${names[v.region]} · Vòng ${r + 1}`,
                  g.rounds.slice(0, r + 1).flat(),
                )}</section>`
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
    return `<section class="panel tour-empty"><h3>Challenger đang chờ khởi tranh</h3><p>32 đội đã được chọn cùng League. Giải Swiss sẽ mở sau League Phase 2; lịch thi đấu mùa vẫn giữ nguyên.</p></section>${rosterHtml(s)}`;
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
    expanded = V.expandedSingle(l),
    slots = V.entrySlots(l),
    markup = (id: string) =>
      seasonTeam(id, history, V.standings(l).findIndex((t) => t.id === id) + 1);
  return `${b ? livePodium(b, team) : ""}<details class="panel tour-details" ${!b?.r16.length ? "open" : ""}><summary>Play-in League · Hạng ${slots.direct + 1}–${slots.advance}</summary><p class="sub">${expanded ? "Bốn đội thắng vào vòng 20 đội, gặp các đội hạng 13–16. Top 12 được miễn vòng 20 đội." : "Top 12 vào thẳng playoff. Tám đội hạng 13–20 đấu loại trực tiếp; bốn đội thắng đi tiếp vào vòng 16 đội."}</p>${l.playin ? cards(s, l.playin, locked, "Play-in League", history) : '<p class="sub">Chờ League Phase 3 hoàn tất.</p>'}${b?.r20 ? `<h3>Vòng 20 đội · Tranh bốn suất cuối</h3>${cards(s, b.r20, locked, "Vòng 20 đội", history)}` : ""}</details>${b?.r16.length ? connectedPlayoffTree(b, locked, markup, { prefix: "Tour", label: "Nhánh playoff World League trong mùa Tour" }) : `<section class="panel tour-empty"><h3>Nhánh 16 đội đang chờ</h3><p>${expanded ? "Hoàn tất Play-in và vòng 20 đội" : "Hoàn tất bốn trận Play-in"} để chốt bốn nhánh. Từ vòng 16 đội, nhánh được giữ cố định.</p></section>`}`;
}
function worldHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const w = s.worldcup.world;
  if (!w)
    return `<section class="tour-world-preview"><p class="tour-history-note">World Cup 24 đội chỉ khởi tranh khi toàn bộ League và Play-in đã hoàn tất. Bạn có thể theo dõi vé sớm ngay tại đây.</p>${qualifiersHtml(s, true, true)}</section>`;
  const r = Math.max(0, Math.min(v.round, 2)),
    history = w.groups.flatMap((g) => g.rounds.slice(0, r + 1).flat());
  if (v.section === "playoff")
    return w.bracket
      ? `${livePodium(w.bracket, team)}${connectedPlayoffTree(w.bracket, locked, (id) => seasonTeam(id, F.fullMatches(s.worldcup)), { prefix: "Tour", label: "Nhánh World Cup trong mùa Tour" })}`
      : '<section class="panel tour-empty"><h3>16 suất playoff</h3><p>Hai đội đầu mỗi bảng và bốn đội hạng ba tốt nhất sẽ bước tiếp sau ba lượt trận.</p></section>';
  const historical = F.worldAtRound(w, r),
    thirds = F.worldThirds(historical),
    finished = historical.groups.every(F.fullLeagueDone),
    selected =
      Number.isInteger(v.group) && v.group! >= 0 && v.group! < 6
        ? v.group
        : null,
    navigation = `<section class="panel full-group-switcher tour-regional-switcher" aria-label="Điều hướng bảng World Cup"><span class="full-group-switcher-label">BẢNG ĐẤU</span><nav class="full-group-nav"><button data-action="Tour.group" data-arg="all" aria-current="${selected === null ? "page" : "false"}">← Tất cả 6 bảng</button>${w.groups.map((_, i) => `<button data-action="Tour.group" data-arg="${i}" aria-current="${selected === i ? "page" : "false"}">Bảng ${"ABCDEF"[i]}</button>`).join("")}</nav></section>`,
    fixtures = w.groups
      .map((g, i) =>
        selected !== null && selected !== i
          ? ""
          : `<section class="panel full-group tour-world-group" data-world-group="${i}"><div class="section-head"><h3>Bảng ${"ABCDEF"[i]}</h3><span class="badge">LƯỢT ${r + 1} · ${g.rounds[r].filter((m) => m.sets).length}/2 TRẬN</span></div>${F.fullStandings(
              historical.groups[i],
            )
              .map(
                (t, j) =>
                  `<div class="full-group-team"><span>#${j + 1}</span>${team(t.id)}<span class="badge">S${w.pots.findIndex((p) => p.includes(t.id)) + 1}</span><b>${t.w}W · ${t.l}L</b></div>`,
              )
              .join(
                "",
              )}<div class="full-world-round-fixtures">${cards(s, g.rounds[r], locked, `World Cup · Bảng ${"ABCDEF"[i]} · Lượt ${r + 1}`, history)}</div><div class="tour-group-shortcuts"><button data-action="Tour.group" data-arg="${i}" data-section="matches">Lịch bảng ${"ABCDEF"[i]} →</button><button data-action="Tour.group" data-arg="${i}" data-section="table">Xem BXH →</button></div></section>`,
      )
      .join("");
  return `${navigation}${roundNav(w.groups[0].rounds, r)}${v.section === "table" ? `<div class="tour-world-tables">${w.groups.map((g, i) => (selected !== null && selected !== i ? "" : `<section class="panel tour-group-table"><div class="section-head"><h3>Bảng ${"ABCDEF"[i]}</h3><span class="badge">TOP 2 ĐI TIẾP</span></div>${fullStandingsTable(g, 2, r).replaceAll("Full.team", "Tour.team")}</section>`)).join("")}</div><section class="panel tour-group-table"><div class="section-head"><h3>Cuộc đua các đội hạng ba</h3><span class="badge">4 SUẤT PLAYOFF</span></div><div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>BẢNG</th><th>W</th><th>L</th><th>HS SET</th><th>HS ĐIỂM</th></tr></thead><tbody>${thirds.map((t, i) => `<tr class="${i < 4 ? "direct" : ""}"><td>${i + 1}</td><td>${team(t.id)}${finished && i < 4 ? '<span class="full-qualification">✓ Vào playoff</span>' : ""}</td><td>${"ABCDEF"[t.group]}</td><td>${t.w}</td><td>${t.l}</td><td>${t.sf - t.sa}</td><td>${t.pf - t.pa}</td></tr>`).join("")}</tbody></table></div></section>` : `<p class="sub">Lượt ${r + 1}/3 · Các bảng A–F thi đấu cùng lượt trước khi chuyển sang lượt tiếp theo.</p><div class="full-groups full-world-matchday tour-world-matchday">${fixtures}</div>${w.bracket ? '<button class="primary" data-action="Tour.section" data-arg="playoff">Vào nhánh World Cup →</button>' : ""}`}`;
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
function rulesHtml(s: T.TourSeason) {
  if (T.merit(s))
    return `<section class="panel tour-rules"><h3>Thể thức mùa Tour · Vé đặc cách</h3><p>League 31 vòng chia 10 + 10 + 11; top 12 vào playoff, hạng 13–20 đấu Play-in chọn bốn đội. Playoff loại trực tiếp, có tranh hạng ba. Challenger Swiss 3 thắng/3 thua rồi playoff 16 đội.</p><h4>Hai vé đặc cách</h4><p>Vô địch League và vô địch Challenger nhận vé World Cup. Nếu cùng một đội vô địch cả hai, á quân Challenger nhận vé còn lại. Không trao vé theo Phase hoặc BXH tổng League.</p><h4>19 vé khu vực</h4><p>Châu Âu 6, châu Á & Đại Dương 4, Bắc/Trung Mỹ & Caribe 4, châu Phi 3, Nam Mỹ 2. Các đội đặc cách vẫn thi đấu vòng bảng nhưng được bỏ qua khi phân suất. Suất đôn và đại diện playoff chỉ chốt sau chung kết League.</p><h4>Playoff khu vực và Play-in</h4><p>Hai đội đủ điều kiện tiếp theo mỗi bảng dự playoff khu vực. Châu Âu chọn 4 và châu Á chọn 4 đại diện Play-in. Bắc Mỹ và châu Phi trao thêm một vé trực tiếp; 5 và 3 đội thua dự Play-in. Nam Mỹ gửi đội đủ điều kiện thứ ba. Tổng 17 đội chia ba nhánh 6–6–5, mỗi nhánh một vé; seed theo thành tích vòng loại chuẩn hóa số trận.</p><h4>World Cup</h4><p>Chỉ mở sau League và toàn bộ vòng loại. 24 đội, sáu bảng bốn đội; top 2 và bốn đội hạng ba tốt nhất vào playoff 16 đội. Mọi trận BO5, set 1–4 đến 25, set 5 đến 15, hơn hai điểm.</p></section>`;
  return `<section class="panel tour-rules"><span class="eyebrow">VOLLEYWORLD TOUR</span><h3>Thể thức mùa giải</h3><div class="tour-rule-grid"><section><h4>Đội hình chung</h4><p>32 đội: châu Âu 7, châu Á & Đại Dương 7, Nam Mỹ 6, Bắc/Trung Mỹ & Caribe 7, châu Phi 5. Đội hình League và Challenger được giữ nguyên suốt mùa.</p></section><section><h4>League xuyên suốt</h4><p>31 vòng, mỗi đối thủ gặp nhau một lần. Ba chặng 10 + 10 + 11 vòng dùng chung một BXH. W/L → hiệu số set → hiệu số điểm → đối đầu → bốc thăm đã lưu.</p></section><section><h4>Playoff League</h4><p>Top 12 vào thẳng playoff. Hạng 13–20 đấu Play-in; bốn đội thắng cùng top 12 vào vòng 16 đội. Vòng 16 đội chia bốn seed, nhánh cố định, có tranh hạng ba trước chung kết.</p></section><section><h4>Challenger</h4><p>Swiss tối đa năm vòng: ba trận thắng đi tiếp, ba trận thua bị loại. Vòng đầu khác khu vực; các vòng sau cùng W/L và không tái đấu. 16 đội vào playoff loại trực tiếp, có tranh hạng ba.</p></section><section><h4>Vé World Cup</h4><p>100 quốc gia thi đấu vòng loại khu vực. Nhất bảng đi thẳng; hạng 2–3 đấu playoff khu vực. Nam Mỹ lấy top 2, hạng 3 dự Play-in. 27 đội Play-in chia ba nhánh để chọn ba vé cuối.</p></section><section><h4>Sân khấu thế giới</h4><p>World Cup chỉ mở khi League và Play-in hoàn tất. 24 đội chia sáu bảng bốn đội; top 2 mỗi bảng và bốn đội hạng ba tốt nhất vào vòng 16 đội. Nhánh cố định, có tranh hạng ba.</p></section><section><h4>Điểm thi đấu</h4><p>Tất cả trận BO5. Set 1–4 đến 25, set 5 đến 15, phải hơn hai điểm. Mô phỏng, nhập tay, mô phỏng từng set và chọn tỷ số đều dùng bộ nhập điểm chung.</p></section><section><h4>Lưu hành trình</h4><p>Tiến trình được lưu theo từng mùa. Có thể xem lại các chặng đã hoàn tất. Mỗi giải có danh hiệu riêng; Tour tổng kết cả ba đấu trường.</p></section></div></section>`;
}
export function seasonHtml(s: T.TourSeason, v: TourViewState, locked: boolean) {
  const n = T.played(s),
    past = v.stage < s.stage || T.stageDone(s, v.stage),
    read = locked || past,
    canonical = T.canonicalStage(s, v.stage);
  const body =
    v.section === "journey"
      ? journeyHtml(s, locked)
      : v.section === "qualifiers"
        ? qualifiersHtml(s, true, true)
        : v.section === "teams"
          ? rosterHtml(s)
          : v.section === "rules"
            ? rulesHtml(s)
            : v.stage > s.stage
              ? v.stage === 3
                ? challengerHtml(s, v, true)
                : competitionOf(v.stage, s) === "worldcup"
                  ? worldHtml(s, v, true)
                  : '<section class="panel tour-empty"><h3>Chặng chưa mở</h3><p>Hoàn tất chặng hiện tại để tiếp tục mùa Tour.</p></section>'
              : `${stageHeader(s, v, locked)}${[0, 2, 4].includes(v.stage) ? (v.section === "playoff" ? '<section class="panel tour-empty"><h3>League đang tích lũy điểm</h3><p>Play-in và playoff diễn ra ở chặng 7, sau World Cup Play-in.</p><button data-action="Tour.section" data-arg="table">Xem BXH League →</button></section>' : leagueHtml(s, v, read)) : v.stage === 1 ? regionalHtml(s, v, read) : v.stage === 3 ? challengerHtml(s, v, read) : canonical === 5 ? (T.merit(s) ? meritQualificationHtml(s, v, read) : playinHtml(s, v, read)) : canonical === 6 ? (v.section === "table" ? leagueTable(s, 30) : leaguePlayoffHtml(s, read)) : worldHtml(s, v, read)}`;
  return `<div class="tour-page"><div class="section-head tour-season-heading"><div><span class="eyebrow">VOLLEYWORLD TOUR · ${T.complete(s) ? "MÙA ĐÃ HOÀN TẤT" : "MỘT MÙA · BA ĐẤU TRƯỜNG"}</span><h2>Mùa ${s.seasonNumber}</h2><p class="sub">${T.complete(s) ? "Tất cả tám chặng đã khép lại" : `Chặng ${s.stage + 1}/8 · ${stageLabel(s, s.stage)}`} · ${n}/${T.seasonTotal(s)} trận</p></div><div class="controls"><button data-action="Tour.enter">← Các mùa Tour</button><button data-action="Tour.achievements">Thành tích quốc gia</button><details class="tour-more-menu"><summary>Tác vụ mùa</summary><div><button data-action="Tour.exportOne">Xuất mùa này</button>${locked || T.complete(s) ? "" : '<button data-action="Tour.restore">Khôi phục bản trước</button><button data-action="Tour.finish">Mô phỏng hết mùa</button>'}</div></details></div></div>${progressHtml(n, T.seasonTotal(s))}${competitionOverviewHtml(s, v)}${navigation(s, v)}${body}</div>`;
}
