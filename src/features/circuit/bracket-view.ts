import * as D from "../../domain/circuit/index";
import { doubleBracketFixture } from "../tour/regional-view";
import { get } from "../../data/teams";
import { esc } from "../../shared/dom";
export function bracketHtml(
  b: D.CircuitBracket,
  title: string,
  closed = false,
) {
  const plan = D.plan(b),
    preview = D.projection(b);
  return `<div class="points-regional-double circuit-bracket" data-circuit-bracket="${esc(b.prefix)}">${(
    ["upper", "lower", "grand"] as const
  )
    .map((kind) => {
      const cols = plan
        .map((stage, i) => ({ stage, i }))
        .filter((x) => x.stage.kind === kind);
      if (!cols.length) return "";
      const rows = Math.max(...cols.map((x) => x.stage.pairs.length));
      return `<section class="double-overview-panel"><div class="section-head"><h3>${esc(title)} · ${kind === "upper" ? (b.kind === "single" ? "Playoff" : "Nhánh thắng") : kind === "lower" ? "Nhánh thua" : "Chung kết tổng"}</h3></div><p class="tree-scroll-hint">Đọc từ trái sang phải · Cuộn ngang để xem trọn nhánh</p><div class="${kind === "upper" ? "playoff-tree-scroll" : "double-lower-scroll"}" role="region" tabindex="0" aria-label="${esc(title)} · ${kind}"><div class="regional-double-columns">${cols
        .map(({ stage, i }, column) => {
          const span = rows / stage.pairs.length,
            next = cols[column + 1]?.stage;
          return `<section class="lower-tree-stage"><div class="double-stage-title"><h3>${kind === "grand" ? "Chung kết" : stage.id.endsWith("W") ? "Tranh nhất bảng" : stage.id.endsWith("Q") ? "Tranh vé đi tiếp" : stage.id.endsWith("O") ? "Mở màn" : stage.id.endsWith("L") ? "Trận loại" : "Vòng " + (column + 1)}</h3></div><div class="regional-double-nodes" style="grid-template-rows:repeat(${rows},${kind === "upper" ? 106 : 132}px)">${stage.pairs
            .map((pair, j) => {
              const id = stage.id + "-" + j,
                m = b.rounds[i]?.find((x) => x.id === id) || null,
                routes = pair.map((s) =>
                  typeof s === "string"
                    ? get(s).name
                    : s
                      ? (s.loss ? "Thua " : "Thắng ") + s.id
                      : "Chờ đối thủ",
                ),
                classes =
                  (kind === "upper" ? "tree-node" : "lower-tree-node") +
                  (column ? " has-prev" : "") +
                  (next ? " has-next" : "") +
                  (next && next.pairs.length < stage.pairs.length && j % 2 === 0
                    ? " join-upper"
                    : "");
              return `<div class="${classes}" style="grid-row:${j * span + 1}/span ${span}" data-circuit-slot="${id}">${doubleBracketFixture(m, column + 1 + "-" + (j + 1) + " · BO5", closed, preview.get(id), routes).replaceAll("Tour.match", "Circuit.match")}${kind === "lower" ? `<p class="double-route">${routes.map(esc).join(" × ")}</p>` : ""}</div>`;
            })
            .join("")}</div></section>`;
        })
        .join("")}</div></div></section>`;
    })
    .join(
      "",
    )}${b.bronze ? `<section class="double-overview-panel circuit-bronze"><h3>Tranh hạng ba</h3>${doubleBracketFixture(b.bronze, "Huy chương đồng · BO5", closed).replaceAll("Tour.match", "Circuit.match")}</section>` : ""}</div>`;
}
