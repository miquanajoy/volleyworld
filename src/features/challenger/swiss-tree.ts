import * as C from "../../domain/challenger/index";
import { get } from "../../data/teams";
import { team } from "../../components/team";
import { score, winner } from "../../domain/match/scoring";
import type { Match } from "../../domain/types";
import { esc } from "../../shared/dom";
interface Node {
  key: string;
  w: number;
  l: number;
  games: number;
  slots: number;
  end: boolean;
  top: number;
  height: number;
}
const width = 330,
  gap = 64,
  space = 28;
function layout() {
  const specs = [
    [[0, 0, 16, 0]],
    [
      [1, 0, 8, 0],
      [0, 1, 8, 0],
    ],
    [
      [2, 0, 4, 0],
      [1, 1, 8, 0],
      [0, 2, 4, 0],
    ],
    [
      [3, 0, 0, 4],
      [2, 1, 6, 0],
      [1, 2, 6, 0],
      [0, 3, 0, 4],
    ],
    [
      [3, 1, 0, 6],
      [2, 2, 6, 0],
      [1, 3, 0, 6],
    ],
    [
      [3, 2, 0, 6],
      [2, 3, 0, 6],
    ],
  ];
  const columns: Node[][] = specs.map((col) =>
    col.map(([w, l, games, slots]) => ({
      key: `${w}-${l}`,
      w,
      l,
      games,
      slots,
      end: slots > 0,
      top: 0,
      height: slots ? 64 + slots * 28 : 76 + games * 40,
    })),
  );
  const height = Math.max(
    ...columns.map(
      (col) => col.reduce((n, x) => n + x.height, 0) + (col.length - 1) * space,
    ),
  );
  for (const col of columns) {
    let top =
      (height -
        col.reduce((n, x) => n + x.height, 0) -
        (col.length - 1) * space) /
      2;
    for (const node of col) {
      node.top = top;
      top += node.height + space;
    }
  }
  return { columns, height };
}
const seedTeam = (s: C.ChallengerSeason, id: string) =>
  `<span class="swiss-map-team" title="${esc(get(id).name)} · Hạt giống ${s.roster.indexOf(id) + 1}"><small>#${s.roster.indexOf(id) + 1}</small>${team(id)}</span>`;
function fixture(s: C.ChallengerSeason, m: Match) {
  const result = score(m),
    win = winner(m);
  return `<button type="button" class="swiss-map-match ${m.sets ? "is-completed" : ""}" data-action="Challenger.match" data-arg="${m.id}" aria-label="${esc(`${get(m.a).name} gặp ${get(m.b).name} · ${m.sets ? result.join("–") : "Chưa đấu"} · Xem chi tiết`)}"><span class="${win === m.a ? "is-winner" : win ? "is-loser" : ""}">${seedTeam(s, m.a)}</span><b>${m.sets ? result.join("–") : "VS"}</b><span class="${win === m.b ? "is-winner" : win ? "is-loser" : ""}">${seedTeam(s, m.b)}</span></button>`;
}
export function swissTreeHtml(s: C.ChallengerSeason, through: number) {
  const { columns, height } = layout(),
    total = columns.length * width + (columns.length - 1) * gap,
    rows = C.challengerStandings(s, through),
    byKey = new Map(columns.flat().map((n) => [n.key, n]));
  const paths = columns.flatMap((col, c) =>
    col.flatMap((node) => {
      if (node.end) return [];
      return [
        [node.w + 1, node.l, "win"],
        [node.w, node.l + 1, "loss"],
      ].map(([w, l, kind]) => {
        const next = byKey.get(`${w}-${l}`)!,
          x = c * (width + gap) + width,
          y = node.top + node.height / 2,
          nx = x + gap,
          ny = next.top + next.height / 2;
        return `<path class="swiss-flow-${kind}" d="M ${x} ${y} C ${x + gap / 2} ${y}, ${nx - gap / 2} ${ny}, ${nx} ${ny}"/>`;
      });
    }),
  );
  return `<div class="swiss-map-legend"><span><i class="swiss-legend-win"></i>Thắng → nhóm trên</span><span><i class="swiss-legend-loss"></i>Thua → nhóm dưới</span><span>Đối thủ bốc thăm lại mỗi vòng · Cuộn ngang xem toàn bộ · Bấm vào trận để xem hoặc nhập điểm</span></div><div class="swiss-tree-scroll" tabindex="0" role="region" aria-label="Sơ đồ nhánh Swiss, có thể cuộn ngang"><div class="swiss-map" style="width:${total}px"><div class="swiss-map-head">${columns.map((_, i) => `<div style="width:${width}px"><span class="eyebrow">${i < 5 ? `VÒNG ${i + 1}` : "KẾT QUẢ SWISS"}</span><b>${i < 5 ? (i <= through ? "Đã bốc thăm" : "Chờ bốc thăm") : "16 vé playoff"}</b></div>`).join("")}</div><div class="swiss-map-body" style="height:${height}px"><svg class="swiss-map-lines" width="${total}" height="${height}" viewBox="0 0 ${total} ${height}" aria-hidden="true">${paths.join("")}</svg>${columns
    .map((col, c) =>
      col
        .map((node) => {
          const matches =
            !node.end && c <= through
              ? (s.rounds[c] || []).filter((m) => {
                  const before = C.challengerStandings(s, c - 1).find(
                    (r) => r.id === m.a,
                  )!;
                  return before.w === node.w && before.l === node.l;
                })
              : [];
          const known = rows.filter((r) => r.w === node.w && r.l === node.l),
            capacity = node.end ? node.slots : node.games * 2;
          const terminal = node.end
            ? node.w === 3
              ? "qualified"
              : "eliminated"
            : "";
          const label = node.end
            ? node.w === 3
              ? "VÀO PLAYOFF"
              : "BỊ LOẠI"
            : node.w === 2 && node.l === 2
              ? "TRẬN QUYẾT ĐỊNH"
              : node.w === 2
                ? "TRANH VÉ PLAYOFF"
                : node.l === 2
                  ? "TRẬN SINH TỬ"
                  : "CÙNG THÀNH TÍCH";
          return `<section class="swiss-map-node ${terminal ? `is-${terminal}` : ""} ${c === through && !node.end ? "is-current" : ""}" data-swiss-node="${node.key}" style="left:${c * (width + gap)}px;top:${node.top}px;width:${width}px;height:${node.height}px"><header><strong>${node.w}–${node.l}</strong><span>${label}</span><small>${node.end ? `${known.length}/${capacity} đội` : `${node.games} trận`}</small></header>${node.end ? `<div class="swiss-map-terminal">${Array.from({ length: capacity }, (_, i) => (known[i] ? `<div data-swiss-team="${known[i].id}">${seedTeam(s, known[i].id)}<span aria-label="${node.w === 3 ? "Đã giành vé" : "Đã bị loại"}">${node.w === 3 ? "✓" : "–"}</span></div>` : '<div class="swiss-map-empty">Chờ xác định đội</div>')).join("")}</div>` : matches.length ? `<div class="swiss-map-fixtures">${matches.map((m) => fixture(s, m)).join("")}</div><footer>${matches.filter((m) => m.sets).length}/${matches.length} trận hoàn tất · BO5</footer>` : `<div class="swiss-map-pending"><p>${known.length}/${capacity} đội đã xác định</p><div>${known.map((r) => `<span data-swiss-team="${r.id}">${seedTeam(s, r.id)}</span>`).join("")}</div><small>${known.length === capacity ? "Đủ đội · Chờ bốc thăm vòng " + (c + 1) : "Chờ kết quả vòng trước"}</small></div>`}</section>`;
        })
        .join(""),
    )
    .join("")}</div></div></div>`;
}
