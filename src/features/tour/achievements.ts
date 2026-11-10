import type { TourRecord } from "./model";
import * as T from "../../domain/tour/index";
import type { TourSeason } from "../../domain/tour/index";
import * as V from "../../domain/index";
import * as C from "../../domain/challenger/index";
import * as F from "../../domain/full-season/index";
import { catalog } from "../../data/teams";
import type { Region } from "../../domain/types";
import { team } from "../../components/team";
import { esc, names } from "../../shared/dom";

export const competitionKeys = ["league", "challenger", "worldcup"] as const;
export type CompetitionKey = (typeof competitionKeys)[number];
export type Competition = "all" | CompetitionKey;
export type TourHonours = Record<CompetitionKey, string[]>;
export const competitionNames: Record<CompetitionKey, string> = {
  league: "World League",
  challenger: "Challenger",
  worldcup: "World Cup",
};
export const medalSymbols = ["🥇", "🥈", "🥉"] as const;
export const medalNames = ["Vô địch", "Á quân", "Hạng ba"] as const;
export function honoursOf(record: TourRecord): TourHonours | null {
  if (record.snapshot) {
    const s = record.snapshot;
    return {
      league: V.podium(s.league),
      challenger: s.challenger ? C.challengerPodium(s.challenger) : [],
      worldcup: F.worldPodium(s.worldcup),
    };
  }
  return record.honours || null;
}
export interface AchievementResult {
  kind: "rank" | "absent" | "pending" | "active" | "unavailable";
  from?: number;
  to?: number;
  description: string;
}
function leagueStage(p: { from: number; to: number }, s: TourSeason) {
  if (p.from <= 3) return medalNames[p.from - 1];
  if (p.from === 4) return "Tranh hạng ba";
  if (p.from === 5) return "Tứ kết";
  if (p.from === 9) return "Vòng 16 đội";
  if (p.from <= 20)
    return V.expandedSingle(s.league) && p.from <= 20
      ? "Vòng 20 đội"
      : "Play-in";
  return V.expandedSingle(s.league) && p.from <= 24
    ? "Play-in"
    : "League phase";
}
/** Unknown cloud snapshots never become invented non-participation. */
export function resultFor(
  record: TourRecord,
  id: string,
  competition: CompetitionKey,
): AchievementResult {
  const s = record.snapshot;
  if (!s) {
    const medal = honoursOf(record)?.[competition].indexOf(id) ?? -1;
    if (medal >= 0)
      return {
        kind: "rank",
        from: medal + 1,
        to: medal + 1,
        description: medalNames[medal],
      };
    return { kind: "unavailable", description: "Chưa tải chi tiết mùa" };
  }
  if (competition === "league") {
    if (!s.roster.includes(id))
      return { kind: "absent", description: "Không tham dự League" };
    const p = V.finalPlacement(s.league, id);
    return p
      ? { kind: "rank", ...p, description: leagueStage(p, s) }
      : {
          kind: V.started(s.league) ? "active" : "pending",
          description: V.started(s.league) ? "Đang diễn ra" : "Chưa khởi tranh",
        };
  }
  if (competition === "challenger") {
    if (!s.roster.includes(id))
      return { kind: "absent", description: "Không tham dự Challenger" };
    if (!s.challenger)
      return { kind: "pending", description: "Chưa khởi tranh" };
    const p = C.challengerPlacements(s.challenger).find((p) => p.id === id);
    return p
      ? { kind: "rank", from: p.from, to: p.to, description: p.stage }
      : { kind: "active", description: "Đang diễn ra" };
  }
  const w = s.worldcup.world;
  if (!w) {
    if (T.career(s)) {
      const state = T.careerStatus(s);
      return state.qualified.length === 32 && !state.qualified.includes(id)
        ? { kind: "absent", description: "Không giành vé World Cup" }
        : {
            kind: "pending",
            description:
              state.automatic.includes(id) || state.qualified.includes(id)
                ? "Đã giành vé World Cup"
                : s.stage >= 1
                  ? "Đang vòng loại"
                  : "Chưa khởi tranh",
          };
    }
    if (
      F.intercontinentalDone(s.worldcup) &&
      !F.qualificationEntrants(s.worldcup).includes(id)
    )
      return { kind: "absent", description: "Không giành vé World Cup" };
    return {
      kind: "pending",
      description: s.stage >= 1 ? "Đang vòng loại" : "Chưa khởi tranh",
    };
  }
  if (!w.groups.some((g) => g.teamIds.includes(id)))
    return { kind: "absent", description: "Không giành vé World Cup" };
  const p = F.worldPlacements(s.worldcup)[id];
  return p
    ? { kind: "rank", ...p, description: p.stage }
    : { kind: "active", description: "Đang diễn ra" };
}
export function resultHtml(result: AchievementResult, seasonNumber: number) {
  const label =
    result.kind === "rank"
      ? result.from! <= 3
        ? medalSymbols[result.from! - 1]
        : result.from === result.to
          ? `#${result.from}`
          : `#${result.from}–#${result.to}`
      : result.kind === "absent"
        ? "–"
        : result.kind === "unavailable"
          ? "Chưa tải"
          : result.kind === "active"
            ? "Đang diễn ra"
            : result.description;
  return `<div class="tour-achievement-result is-${result.kind} ${result.kind === "rank" && result.from! <= 3 ? `medal-${result.from}` : ""}" data-result="${result.kind}" ${result.from ? `data-placement="${result.from}-${result.to}"` : ""}><strong aria-label="${esc(result.kind === "rank" && result.from! <= 3 ? medalNames[result.from! - 1] : label)}">${label}</strong><small>${result.kind === "rank" ? `${esc(result.description)} · SS ${seasonNumber}` : result.kind === "absent" || result.kind === "unavailable" ? esc(result.description) : `SS ${seasonNumber}`}</small></div>`;
}
export function medalTotals(
  records: TourRecord[],
  id: string,
  competition: Competition = "all",
) {
  const totals: [number, number, number] = [0, 0, 0];
  const keys = competition === "all" ? competitionKeys : [competition];
  for (const r of records)
    for (const key of keys) {
      const place = honoursOf(r)?.[key].indexOf(id) ?? -1;
      if (place >= 0 && place < 3) totals[place]++;
    }
  return totals;
}
function counters(totals: number[], compact = false) {
  return `<div class="tour-medal-counts ${compact ? "is-compact" : ""}">${totals.map((n, i) => `<span class="medal-${i + 1}" title="${medalNames[i]}"><span aria-hidden="true">${medalSymbols[i]}</span><b>${n}</b>${compact ? "" : `<small>${medalNames[i]}</small>`}</span>`).join("")}</div>`;
}
export function achievementsHtml(
  records: TourRecord[],
  region: Region,
  teamId: string | null,
  competition: Competition,
) {
  const sorted = [...records].sort((a, b) => b.season_number - a.season_number),
    countries = catalog
      .filter((t) => t.region === region)
      .map((t) => ({ ...t, medals: medalTotals(sorted, t.id, competition) }))
      .filter((t) => t.medals.some((n) => n > 0)),
    selected = countries.find((t) => t.id === teamId) || null,
    label =
      competition === "all"
        ? "CẢ BA ĐẤU TRƯỜNG"
        : competitionNames[competition].toUpperCase();
  return `<div class="tour-page tour-achievements"><div class="section-head"><div><span class="eyebrow">VOLLEYWORLD TOUR · HỒ SƠ QUỐC GIA</span><h2>Thành tích qua các mùa</h2><p class="sub">Chỉ hiển thị quốc gia có huy chương theo khu vực và giải đang chọn.</p></div><button data-action="Tour.enter">← Các mùa Tour</button></div><nav class="tour-region-nav" aria-label="Khu vực thành tích">${F.regionOrder.map((r) => `<button data-action="Tour.achievementRegion" data-arg="${r}" aria-pressed="${r === region}">${names[r]}</button>`).join("")}</nav><nav class="tour-achievement-filters" aria-label="Thống kê theo giải"><span>THỐNG KÊ HUY CHƯƠNG</span>${(["all", ...competitionKeys] as Competition[]).map((key) => `<button data-action="Tour.achievementCompetition" data-arg="${key}" aria-pressed="${competition === key}">${key === "all" ? "Tất cả giải" : competitionNames[key]}</button>`).join("")}</nav>${
    selected
      ? `<section class="tour-country-profile"><div><button class="tour-profile-back" data-action="Tour.achievementTeam" data-arg="">← ${names[region]}</button><span class="eyebrow">${label}</span><h3>${team(selected.id)}</h3><p>${sorted.length} mùa trong lịch sử · BXH thế giới #${selected.rank}</p></div>${counters(selected.medals)}</section><section class="panel tour-country-history"><div class="section-head"><div><span class="eyebrow">LỊCH SỬ TỪNG MÙA</span><h3>Ba giải đấu. Đầy đủ thành tích.</h3></div><span class="badge">${sorted.length} MÙA</span></div>${sorted.length ? `<div class="table-wrap"><table class="tour-achievement-table"><thead><tr><th>MÙA GIẢI</th>${competitionKeys.map((key) => `<th class="${competition === key ? "is-selected" : ""}">${competitionNames[key]}</th>`).join("")}</tr></thead><tbody>${sorted.map((r) => `<tr data-achievement-season="${r.season_number}"><th scope="row"><button data-action="Tour.open" data-arg="${esc(r.season_id)}">Mùa ${r.season_number} <span aria-hidden="true">↗</span></button><small>${r.status === "completed" ? "Đã hoàn tất" : "Đang diễn ra"}</small></th>${competitionKeys.map((key) => `<td class="${competition === key ? "is-selected" : ""}" data-competition="${key}">${resultHtml(resultFor(r, selected.id, key), r.season_number)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<div class="tour-empty"><h3>Chưa có mùa Tour nào</h3><p>Thành tích của đội sẽ được ghi lại khi bạn bắt đầu một mùa.</p></div>'}<p class="tour-achievement-note">🥇 Vô địch · 🥈 Á quân · 🥉 Hạng ba · Các đội bị loại cùng vòng được ghi theo nhóm hạng. Dấu “–” là không tham dự hoặc không giành vé.</p></section>`
      : `<div class="section-head"><div><h3>${names[region]}</h3><p class="sub">Chọn một quốc gia để xem chi tiết từng mùa.</p></div><span class="badge">${countries.length} QUỐC GIA CÓ HUY CHƯƠNG</span></div>${
          countries.length
            ? `<div class="tour-country-grid">${countries
                .map((t) => {
                  const medals = t.medals,
                    sum = medals.reduce((a, b) => a + b, 0);
                  return `<button class="tour-country-card has-medals" data-action="Tour.achievementTeam" data-arg="${t.id}"><span class="tour-country-card-top"><span class="team-rank">#${t.rank}</span><span aria-hidden="true">↗</span></span><span class="tour-country-name">${team(t.id)}</span>${counters(medals, true)}<span class="tour-country-caption">${sum} lần lên bục huy chương</span></button>`;
                })
                .join("")}</div>`
            : `<section class="panel tour-empty" data-achievement-empty><h3>Chưa có quốc gia giành huy chương</h3><p>${names[region]} chưa có huy chương trong ${competition === "all" ? "cả ba giải" : competitionNames[competition]} ở lịch sử hiện có.</p></section>`
        }`
  }</div>`;
}
