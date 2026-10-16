import { displayState } from "../app/selectors";
import * as V from "../domain/index";
import type { TeamId, Tournament } from "../domain/types";

export function leagueRank(id: TeamId, s: Tournament = displayState()) {
  return V.standings(s).findIndex((t) => t.id === id) + 1;
}
export function team(
  id: TeamId,
  ranked = false,
  s: Tournament = displayState(),
) {
  let t = V.get(id),
    rank = ranked === true ? leagueRank(id, s) : 0;
  return `<span class="team">${rank ? `<span class="team-rank" title="Hạng ${rank} trên BXH league mùa ${s.seasonNumber || 1}">#${rank}</span>` : ""}<span class="flag">${t.flag}</span><span class="team-name">${t.name}</span></span>`;
}
export function formHtml(
  id: TeamId,
  s: Tournament = displayState(),
  leagueOnly = false,
) {
  const list = V.recentForm(
      leagueOnly ? { ...s, playin: null, bracket: null } : s,
      id,
    ),
    label = list.length
      ? list.map((x) => (x.win ? "Thắng" : "Thua")).join(", ")
      : "Chưa có trận đã đấu";
  return `<span class="form-strip" role="img" aria-label="5 trận ${leagueOnly ? "league " : ""}gần nhất, cũ đến mới: ${label}" title="5 trận ${leagueOnly ? "league " : ""}đã hoàn thành gần nhất · cũ → mới">${Array.from({ length: 5 - list.length }, () => '<span class="form-dot empty" aria-hidden="true">–</span>').join("")}${list.map((x) => `<span class="form-dot ${x.win ? "form-win" : "form-loss"}" aria-hidden="true" title="${x.win ? "Thắng" : "Thua"} ${V.get(x.opponent).name} ${x.score[0]}–${x.score[1]}">${x.win ? "W" : "L"}</span>`).join("")}</span>`;
}
export function signed(n: number) {
  return n > 0 ? "+" + n : n;
}
