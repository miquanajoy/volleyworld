import {
  careerSummaryHtml,
  seasonPointHtml,
  pointsRulesHtml,
  rankingHtml,
} from "./points-view";
import { store } from "../../app/store";
import { team } from "../../components/team";
import { regionTeams } from "../../data/teams";
import type { Region, SeasonTile } from "../../domain/types";
import { names } from "../../shared/dom";
import { achievement, medalCounts, seasonMedals } from "./model";
export function achievementsHtml(rows: SeasonTile[], loading: boolean): string {
  const region = store.achievementRegion,
    selected = store.achievementTeam;
  const detail = selected
    ? `<section class="panel achievement-detail" aria-live="polite"><h3>${team(selected)}</h3>${careerSummaryHtml(rows, selected)}<p class="sub">Huy chương và thứ hạng của đội tuyển qua từng mùa giải.</p>${
        rows.some(
          (r) => r.status === "completed" && seasonMedals(r).includes(selected),
        )
          ? `<p class="achievement-medal-totals">${medalCounts(rows, selected)
              .map((n, i) => `${["🥇", "🥈", "🥉"][i]} ${n}`)
              .join(" · ")}</p>`
          : ""
      }<ul class="achievement-season-list">${rows
        .map((row) => {
          const result = achievement(row, selected),
            p = result.placement;
          const medal =
            p && p.from === p.to && p.from <= 3
              ? ["🥇", "🥈", "🥉"][p.from - 1]
              : null;
          const label = p
            ? p.from === p.to
              ? `#${p.from}`
              : `#${p.from}–#${p.to}`
            : result.kind === "absent"
              ? "-"
              : result.kind === "cancelled"
                ? "Đã hủy"
                : result.kind === "pending"
                  ? row.status === "ready"
                    ? "Chưa bắt đầu"
                    : "Đang diễn ra"
                  : loading
                    ? "Đang tải…"
                    : "Chưa tải được kết quả";
          return `<li class="achievement-season" data-season="${row.season_id}"><div><b>SS ${row.season_number}</b><span class="sub">Mùa ${row.season_number}</span></div><div><span class="achievement-placement ${medal ? "medal" : ""}" aria-label="${medal ? `Hạng ${p!.from}` : label}">${medal || label}</span>${seasonPointHtml(row, selected)}<span class="sub">${p ? `${label} · SS ${row.season_number}` : result.kind === "absent" ? "Không tham gia mùa này" : result.kind === "cancelled" ? "Không xác định thứ hạng" : result.kind === "pending" ? "Chưa có thành tích cuối mùa" : loading ? "Đang tải lịch sử mùa giải từ tài khoản" : "Kết nối mạng rồi bấm thử lại"}</span></div></li>`;
        })
        .join(
          "",
        )}</ul>${!loading && rows.some((r) => achievement(r, selected).kind === "unavailable") ? `<button data-action="achievementTeam" data-arg="${selected}">Thử tải lại lịch sử</button>` : ""}</section>`
    : '<section class="panel achievement-hint">Chọn một quốc gia để xem thành tích từng mùa.</section>';
  const countries = `<section class="panel achievement-countries" aria-label="Các đội tuyển trong khu vực">${regionTeams(
    region,
  )
    .map(
      (t) =>
        `<button class="achievement-country" data-action="achievementTeam" data-arg="${t.id}" aria-pressed="${selected === t.id}">${team(t.id)}<span class="achievement-medal-totals">${
          medalCounts(rows, t.id).some(Boolean)
            ? medalCounts(rows, t.id)
                .map((n, i) => `${["🥇", "🥈", "🥉"][i]}${n}`)
                .join(" ")
            : rows.every((r) => achievement(r, t.id).kind === "absent")
              ? "-"
              : "Chi tiết →"
        }</span></button>`,
    )
    .join("")}</section>`;
  return `<div class="section-head"><div><div class="eyebrow">NATIONAL TEAM HONOURS</div><h2>Thành tích các đội tuyển</h2><p class="sub">🥇 Vô địch · 🥈 Á quân · 🥉 Hạng ba · “-” Không tham gia</p></div><button data-action="navigate" data-arg="home">← Trang chủ</button></div><div class="achievement-mode-switch" role="group" aria-label="Cách xem thành tích"><button data-action="achievementView" data-arg="countries" aria-pressed="${store.achievementView === "countries"}">Theo quốc gia</button><button data-action="achievementView" data-arg="ranking" aria-pressed="${store.achievementView === "ranking"}">BXH điểm qua các mùa</button></div>${pointsRulesHtml()}<div class="achievement-regions" role="group" aria-label="Chọn khu vực">${store.achievementView === "ranking" ? `<button data-action="achievementWorld" aria-pressed="${store.achievementWorldwide}">Toàn thế giới</button>` : ""}${(Object.keys(names) as Region[]).map((r) => `<button data-action="achievementRegion" data-arg="${r}" aria-pressed="${!store.achievementWorldwide && region === r}">${names[r]}</button>`).join("")}</div><div class="achievement-layout ${store.achievementView === "ranking" ? "ranking-layout" : ""}">${store.achievementView === "ranking" ? rankingHtml(rows, loading) : countries}${detail}</div>`;
}
