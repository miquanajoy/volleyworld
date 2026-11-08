import { regionalDoublePreview } from "../../domain/career/regional-double";
import {
  worldPlayinPlan,
  worldPlayinRound,
  worldPlayinStatus,
  worldPlayinTickets,
  worldPlayinExtra,
  type WorldPlayinDouble,
} from "../../domain/career/world-playin-double";
import { team } from "../../components/team";
import { doubleBracketFixture } from "./regional-view";

const code = (id: string) =>
  id.replace(/^WC/, "").replace(/-(\d+)$/, (_, n) => "-" + (+n + 1));
export function worldPlayinHtml(b: WorldPlayinDouble, points = false) {
  const status = worldPlayinStatus(b),
    d = worldPlayinExtra(b);
  const plan = worldPlayinPlan(b),
    preview = regionalDoublePreview(b.seeds, "WC", b);
  const final = worldPlayinRound(b, 4);
  for (let i = 0; i < d; i++) {
    const m = final[i];
    preview.set(`WCL3-${i}`, m ? [m.a, m.b] : [undefined, undefined]);
  }
  const panel = (kind: "upper" | "lower", label: string, sub: string) => {
    const columns = plan
      .map((stage, i) => ({ stage, i }))
      .filter(({ stage }) => stage.kind === kind);
    const rows = Math.max(...columns.map(({ stage }) => stage.pairs.length));
    return `<section class="double-overview-panel" aria-label="${label}"><div class="section-head"><div><span class="eyebrow">WORLD CUP PLAY-IN</span><h3>${label}</h3><p class="sub">${sub}</p></div></div><div class="${kind === "upper" ? "playoff-tree-scroll" : "double-lower-scroll"}" role="region" tabindex="0" aria-label="${label} · Cuộn ngang"><div class="regional-double-columns">${columns
      .map(({ stage, i }, col) => {
        const span = rows / stage.pairs.length;
        return `<section class="lower-tree-stage"><div class="double-stage-title"><h3>Vòng ${stage.id.match(/\d+$/)?.[0]}</h3><span class="badge">${b.rounds[i]?.filter((m) => m.sets).length || 0} đã đấu</span></div><div class="regional-double-nodes" style="grid-template-rows:repeat(${rows},${kind === "upper" ? 106 : 132}px)">${stage.pairs
          .map((pair, j) => {
            const id = stage.id + "-" + j,
              m = b.rounds[i]?.find((m) => m.id === id) || null;
            const routes =
              i === 4
                ? [
                    `Hạt giống nhánh thua ${8 - 2 * d + j + 1}`,
                    `Hạt giống nhánh thua ${8 - j}`,
                  ]
                : pair.map((source) =>
                    typeof source === "object" && source
                      ? (source.loss ? "Thua " : "Thắng ") + code(source.id)
                      : source
                        ? team(source)
                        : "Miễn đấu",
                  );
            const tile = doubleBracketFixture(
              m,
              `${code(id)} · BO5`,
              false,
              preview.get(id),
              routes,
            );
            const next = columns[col + 1]?.stage;
            const links =
              (next && next.id !== "WCL3" ? " has-next" : "") +
              (col && stage.id !== "WCL3" ? " has-prev" : "") +
              (next && next.pairs.length < stage.pairs.length && j % 2 === 0
                ? " join-upper"
                : "");
            return `<div data-world-playin-slot="${id}" class="${kind === "upper" ? "tree-node" : "lower-tree-node"}${links}" style="grid-row:${j * span + 1} / span ${span}">${kind === "upper" ? tile : `<div>${tile}<p class="double-route">${routes.join(" × ")}</p></div>`}</div>`;
          })
          .join("")}</div></section>`;
      })
      .join("")}</div></div></section>`;
  };
  return `<section class="tour-career-playin" data-world-playin-double><section class="panel world-playin-summary"><div class="section-head"><div><span class="eyebrow">WORLD CUP PLAY-IN · NHÁNH THẮNG–THUA</span><h3>${b.seeds.length} đội tranh ${worldPlayinTickets(b)} vé World Cup</h3><p class="sub">Mỗi đội có 2 mạng · Tất cả trận BO5 · ${b.seeds.length + 8} trận. ${points ? "16 đội có vé trực tiếp theo League/điểm không tham dự." : "Top 2 Challenger đã có vé và không tham dự."}</p></div><span class="badge">${status.qualified.length}/${worldPlayinTickets(b)} VÉ ĐÃ CHỐT</span></div><p class="sub">8 đội thắng vòng 2 nhánh thắng giành vé. ${d ? `Ở nhánh thua, ${8 - 2 * d} đội thắng vòng 2 có hạt giống cao nhất giành vé; ${2 * d} đội còn lại đấu vòng 3 tranh ${d} vé. ${d} suất miễn vòng 1 dành cho hạt giống cao nhất.` : "8 đội thắng vòng 2 nhánh thua giành các vé còn lại."} Thua lần hai bị loại; đội giành vé không thi đấu tiếp.</p>${status.qualified.length ? `<div class="qualification-names">${status.qualified.map((id) => `<span data-world-playin-qualified="${id}">${team(id)} <small>${status.upper.includes(id) ? "Vé nhánh thắng" : "Vé nhánh thua"}</small></span>`).join("")}</div>` : ""}${status.eliminated.length ? `<details><summary>Đã bị loại (${status.eliminated.length} đội)</summary><div class="qualification-names">${status.eliminated.map((id) => `<span data-world-playin-eliminated="${id}">${team(id)} <small>2 trận thua</small></span>`).join("")}</div></details>` : ""}</section><div class="double-overview">${panel("upper", "Nhánh thắng", "Thắng vòng 2 giành vé World Cup. Thua lần đầu chuyển xuống nhánh thua.")}${panel("lower", "Nhánh thua", "Thua lần hai bị loại. Hạt giống theo thứ hạng thế giới khi bốc thăm.")}</div></section>`;
}
