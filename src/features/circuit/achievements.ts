import * as D from "../../domain/circuit/index";
import * as C from "../../domain/challenger/index";
import { circuitCatalog } from "../../data/teams";
import { team } from "../../components/team";
import { model, type CircuitRecord } from "./model";
const competitions = [
  ["all", "Toàn bộ"],
  ["league", "League khu vực"],
  ["first", "First Stand"],
  ["challenger", "Challenger"],
  ["world", "World Cup"],
];
function awards(s: D.CircuitSeason) {
  return [
    ...D.regions.flatMap((r) =>
      s.regions[r].phases.flatMap((p, i) =>
        (["upper", "lower"] as const).flatMap((t) =>
          D.leagueRanks(p[t])
            .filter((x) => x.from <= 3)
            .map((x) => ({
              id: x.id,
              rank: x.from,
              type: "league",
              label: `League ${D.regionNames[r]} · Phase ${i + 1} · Hạng ${t === "upper" ? 1 : 2}`,
            })),
        ),
      ),
    ),
    ...(s.firstStand
      ? D.bracketRanks(s.firstStand)
          .filter((x) => x.from <= 3)
          .map((x) => ({
            id: x.id,
            rank: x.from,
            type: "first",
            label: "First Stand",
          }))
      : []),
    ...(s.challenger
      ? C.challengerPodium(s.challenger).map((id, i) => ({
          id,
          rank: i + 1,
          type: "challenger",
          label: "Challenger",
        }))
      : []),
    ...D.podium(s).map((id, i) => ({
      id,
      rank: i + 1,
      type: "world",
      label: "World Cup",
    })),
  ];
}
export function achievementsHtml(records: CircuitRecord[]) {
  const entries = records
      .flatMap((r) =>
        r.snapshot
          ? awards(r.snapshot).map((a) => ({ ...a, season: r.season_number }))
          : [],
      )
      .filter(
        (a) => model.achievement === "all" || a.type === model.achievement,
      ),
    teams = circuitCatalog.filter(
      (t) =>
        (model.achievementRegion === "all" ||
          D.regionOf(t.id) === model.achievementRegion) &&
        entries.some((a) => a.id === t.id),
    );
  const selected = teams.find((t) => t.id === model.achievementTeam);
  return `<div class="tour-page circuit-page"><div class="section-head"><div><span class="eyebrow">VOLLEYWORLD TOUR · HỒ SƠ QUỐC GIA</span><h1>Thành tích qua các mùa</h1><p>Chỉ hiển thị đội có huy chương theo bộ lọc đang chọn.</p></div><button data-action="Circuit.enter">← Các mùa</button></div><div class="controls">${competitions.map(([key, label]) => `<button data-action="Circuit.achievementCompetition" data-arg="${key}" aria-pressed="${key === model.achievement}">${label}</button>`).join("")}</div><nav class="tour-region-nav"><button data-action="Circuit.achievementRegion" data-arg="all">Tất cả khu vực</button>${D.regions.map((r) => `<button data-action="Circuit.achievementRegion" data-arg="${r}">${D.regionNames[r]}</button>`).join("")}</nav><span class="badge">${teams.length} QUỐC GIA CÓ HUY CHƯƠNG</span><div class="challenger-team-grid">${teams
    .map((t) => {
      const medals = [1, 2, 3].map(
        (rank) =>
          entries.filter((a) => a.id === t.id && a.rank === rank).length,
      );
      return `<button class="panel tour-country-card has-medals" data-action="Circuit.teamHistory" data-arg="${t.id}">${team(t.id)}<span>🥇 ${medals[0]} · 🥈 ${medals[1]} · 🥉 ${medals[2]}</span></button>`;
    })
    .join(
      "",
    )}</div>${!teams.length ? '<section class="panel tour-empty" data-achievement-empty><h3>Chưa có quốc gia giành huy chương</h3></section>' : ""}${
    selected
      ? `<section class="panel"><h2>${team(selected.id)}</h2><div class="table-wrap"><table class="full-standings"><thead><tr><th>Mùa</th><th>Giải</th><th>Huy chương</th></tr></thead><tbody>${entries
          .filter((a) => a.id === selected.id)
          .map(
            (a) =>
              `<tr><td>${a.season}</td><td>${a.label}</td><td>${["🥇", "🥈", "🥉"][a.rank - 1]}</td></tr>`,
          )
          .join("")}</tbody></table></div></section>`
      : ""
  }</div>`;
}
