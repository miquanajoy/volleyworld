import { team } from "../../components/team";
import * as V from "../../domain/index";
import type { Placement } from "../../domain/tournament/placement";
import type { Tournament } from "../../domain/types";

function finishLabel(p: Placement, double: boolean): string {
  if (p.from === 1) return "Vô địch";
  if (p.from === 2) return "Á quân";
  if (p.from === 3) return "Hạng ba";
  if (p.from === 17) return "Play-in";
  if (!double)
    return p.from === 4
      ? "Tranh hạng ba"
      : p.from === 5
        ? "Tứ kết"
        : "Vòng 16 đội";
  return `Nhánh thua · vòng ${{ 4: 5, 5: 4, 7: 3, 9: 2, 13: 1 }[p.from]}`;
}

export function seasonSummary(s: Tournament): string {
  const placements = V.finalPlacements(s),
    league = V.standings(s),
    teams = league
      .filter((t) => placements[t.id]?.to <= 20)
      .sort((a, b) => placements[a.id].from - placements[b.id].from);
  return `<section class="panel season-summary"><div class="season-summary-heading"><div><span class="eyebrow">THÀNH TÍCH CUỐI MÙA</span><h3>Playoff & Play-in</h3></div><span class="badge">${teams.length} đội tuyển</span></div><p class="sub">Các đội bị loại cùng vòng được ghi đồng hạng; thứ tự trong nhóm theo BXH league.</p><div class="table-wrap"><table class="season-summary-table" aria-label="Thành tích cuối mùa"><thead><tr><th>THỨ HẠNG</th><th>ĐỘI TUYỂN</th><th>VÒNG DỪNG CHÂN / THÀNH TÍCH</th></tr></thead><tbody>${teams
    .map((t) => {
      const p = placements[t.id],
        medal = p.from === p.to && p.from <= 3,
        rank = medal
          ? ["🥇", "🥈", "🥉"][p.from - 1]
          : p.from === p.to
            ? `#${p.from}`
            : `#${p.from}–#${p.to}`;
      return `<tr data-summary-team="${t.id}"><td><span class="season-finish ${medal ? "season-finish-medal" : ""}" aria-label="${p.from === p.to ? `Hạng ${p.from}` : `Đồng hạng ${p.from} đến ${p.to}`}">${rank}</span></td><td>${team(t.id)}</td><td>${finishLabel(p, V.isDouble(s))}</td></tr>`;
    })
    .join("")}</tbody></table></div></section>`;
}
