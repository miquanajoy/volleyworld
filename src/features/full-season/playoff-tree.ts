import { get } from "../../data/teams";
import { score, winner, loser } from "../../domain/match/scoring";
import type { FullSeason, WorldStage } from "../../domain/full-season/types";
import type { Match, TeamId } from "../../domain/types";
import { esc } from "../../shared/dom";

type TeamMarkup = (id: TeamId) => string;
function slot(
  m: Match | undefined,
  label: string,
  renderTeam: TeamMarkup,
  waiting: string[] = ["Chờ đội tuyển", "Chờ đội tuyển"],
) {
  const result = m ? score(m) : [0, 0],
    win = m && winner(m),
    tag = m ? "button" : "div",
    title = m
      ? `${label}: ${get(m.a).name} gặp ${get(m.b).name}. ${m.sets ? `Tỉ số ${result.join("–")}.` : "Chưa đấu."} Xem chi tiết trận.`
      : `${label} · chờ kết quả vòng trước`;
  return `<${tag} class="bracket-match full-tree-match ${m?.sets ? "is-finished" : ""} ${m ? "" : "is-waiting"}" ${m ? `type="button" data-action="Full.match" data-arg="${m.id}"` : ""} aria-label="${esc(title)}"><span class="bracket-match-head"><span>${label}</span><span class="bracket-state">${m?.sets ? "✓ Đã đấu" : m ? "Chi tiết ↗" : "Chờ vòng trước"}</span></span>${[
    0, 1,
  ]
    .map((i) => {
      const id = m ? (i ? m.b : m.a) : get(waiting[i])?.id;
      return `<span class="full-tree-side ${win && win === id ? "is-winner" : win ? "is-loser" : ""}">${id ? renderTeam(id) : `<span class="full-tree-waiting"><span class="waiting-team-icon">?</span><span>${esc(waiting[i])}</span></span>`}<b class="bracket-set-score">${m?.sets ? result[i] : "–"}</b></span>`;
    })
    .join("")}</${tag}>`;
}
export function worldPlayoffTree(
  s: FullSeason,
  readonly: boolean,
  renderTeam: TeamMarkup,
) {
  const b = s.world?.bracket;
  if (!b) return "";
  const stages: [WorldStage, string, number][] = [
      ["r16", "Vòng 16 đội", 8],
      ["qf", "Tứ kết", 4],
      ["sf", "Bán kết", 2],
      ["final", "Chung kết", 1],
    ],
    advance = (m: Match | undefined, fallback: string) =>
      m?.sets ? winner(m)! : fallback;
  return `<p class="tree-scroll-hint">Đọc từ trái sang phải · ${readonly ? "bấm vào trận để xem kết quả" : "bấm vào trận để xem, mô phỏng hoặc nhập điểm"} · cuộn ngang trên màn hình nhỏ.</p><div class="full-bracket full-playoff-tree" tabindex="0" role="region" aria-label="Sơ đồ playoff thế giới, có thể cuộn ngang"><div class="playoff-tree-head">${stages.map(([k, label, n]) => `<div><span><b>${label}</b><small>${n} trận${k === "final" ? " + tranh hạng ba" : ""}</small></span>${!readonly && k !== "final" && b[k].some((m) => !m.sets) ? `<button data-action="Full.stage" data-arg="${k}" aria-label="Mô phỏng ${label.toLowerCase()}">Chạy vòng</button>` : ""}</div>`).join("")}</div><div class="playoff-tree">${stages
    .map(
      ([key, label, n], stage) =>
        `<section class="tree-stage" ${key !== "final" ? `data-world-stage="${key}"` : ""} aria-label="${label}">${Array.from(
          { length: n },
          (_, i) => {
            let waiting: string[] | undefined;
            if (key === "qf")
              waiting = [
                advance(b.r16[i * 2], `Thắng R${i * 2 + 1}`),
                advance(b.r16[i * 2 + 1], `Thắng R${i * 2 + 2}`),
              ];
            if (key === "sf")
              waiting = [
                advance(b.qf[i * 2], `Thắng Q${i * 2 + 1}`),
                advance(b.qf[i * 2 + 1], `Thắng Q${i * 2 + 2}`),
              ];
            if (key === "final")
              return `<div class="tree-node tree-medal-stack full-bracket-medals" style="grid-row:1 / span 16"><section class="tree-final-slot has-prev" data-world-stage="final">${slot(b.final[0], "F · Chung kết", renderTeam, [advance(b.sf[0], "Thắng S1"), advance(b.sf[1], "Thắng S2")])}</section><section class="tree-bronze" data-world-stage="bronze"><h3>🥉 Tranh hạng ba</h3>${slot(b.bronze[0], "B · Tranh hạng ba", renderTeam, [b.sf[0]?.sets ? loser(b.sf[0])! : "Thua S1", b.sf[1]?.sets ? loser(b.sf[1])! : "Thua S2"])}</section></div>`;
            const matchLabel =
              key === "r16"
                ? `R${i + 1} · Nhánh ${"ABCD"[Math.floor(i / 2)]}`
                : key === "qf"
                  ? `Q${i + 1} · Nhánh ${"ABCD"[i]}`
                  : `S${i + 1} · Bán kết`;
            return `<div class="tree-node has-next ${stage ? "has-prev" : ""} ${i % 2 === 0 ? "join-upper" : ""} ${stage === 0 ? "tree-branch-" + Math.floor(i / 2) : ""}" style="grid-row:${i * (16 / n) + 1} / span ${16 / n}">${slot(b[key][i], matchLabel, renderTeam, waiting)}</div>`;
          },
        ).join("")}</section>`,
    )
    .join("")}</div></div>`;
}
