import type { Match } from "../domain/types";
import { score, winner } from "../domain/match/scoring";
import { esc } from "../shared/dom";
import { team } from "./team";
export function seasonMatchDetailHtml(
  m: Match,
  locked: boolean,
  options: {
    edition: string;
    label: string;
    prefix: string;
    renderTeam: (id: string) => string;
    lockMessage: string;
  },
) {
  const result = score(m),
    win = winner(m);
  return `<section class="full-match-detail"><div class="full-match-meta"><div><span class="eyebrow">${esc(options.edition)}</span><p>${esc(options.label)}</p></div><span class="full-match-status ${m.sets ? "is-complete" : ""}">${m.sets ? "✓ Đã thi đấu" : "Chưa thi đấu"}</span></div><div class="full-match-scoreboard">${[m.a, m.b].map((id, i) => `${i ? `<div class="full-match-score" aria-label="${m.sets ? `Tỉ số set ${result.join("–")}` : "Trận chưa thi đấu"}"><strong>${m.sets ? `${result[0]}<span>–</span>${result[1]}` : "VS"}</strong><small>${m.sets ? "TỈ SỐ SET" : "BEST OF 5"}</small></div>` : ""}<div class="full-match-team ${win === id ? "is-winner" : ""}">${options.renderTeam(id)}${win ? `<span class="full-match-outcome">${win === id ? "Đội thắng" : "Đội thua"}</span>` : ""}</div>`).join("")}</div>${m.sets ? `<div class="full-match-sets table-wrap"><table aria-label="Điểm từng set"><thead><tr><th>ĐỘI TUYỂN</th>${m.sets.map((_, i) => `<th>SET ${i + 1}</th>`).join("")}</tr></thead><tbody>${[m.a, m.b].map((id, i) => `<tr><th scope="row">${team(id)}</th>${m.sets!.map((pair) => `<td class="${pair[i] > pair[1 - i] ? "set-winner" : ""}">${pair[i]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<p class="full-match-help">Trận đấu BO5 · Đội thắng 3 set giành chiến thắng.</p>'}${locked ? `<p class="full-match-lock" role="status">${esc(options.lockMessage)}</p>` : `<div class="full-match-actions">${!m.sets ? `<button class="primary" data-action="${options.prefix}.dialogSim"><span aria-hidden="true">▶</span> Mô phỏng trận</button>` : ""}<button ${m.sets ? 'class="primary"' : ""} data-action="${options.prefix}.dialogEdit">${m.sets ? "Chỉnh sửa điểm" : "Nhập điểm thủ công"}</button></div>`}</section>`;
}
