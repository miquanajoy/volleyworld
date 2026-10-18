import { fullForm } from "../domain/full-season/league";
import { score, winner } from "../domain/match/scoring";
import type { Match, TeamId } from "../domain/types";
import { team } from "./team";
import { esc } from "../shared/dom";
export function seasonTeam(id: TeamId, matches: Match[], rank = 0) {
  const form = fullForm(matches, id);
  return `<span class="full-team-line">${rank ? `<span class="team-rank">#${rank}</span>` : ""}${team(id)}<span class="form-strip" role="img" aria-label="5 trận gần nhất, cũ đến mới: ${esc(form.map((t) => (t.win ? "Thắng" : "Thua")).join(", "))}">${Array.from({ length: 5 - form.length }, () => '<span class="form-dot empty">–</span>').join("")}${form.map((t) => `<span class="form-dot ${t.win ? "form-win" : "form-loss"}" title="${t.win ? "Thắng" : "Thua"} ${esc(t.opponent)}">${t.win ? "W" : "L"}</span>`).join("")}</span></span>`;
}
export function seasonMatchCard(
  m: Match,
  renderTeam: (id: TeamId) => string,
  prefix: string,
  locked: boolean,
  label = m.id,
) {
  const [a, b] = score(m),
    win = winner(m);
  return `<article class="match full-match"><div class="match-top"><span>${esc(label)}</span><span>${m.sets ? "HOÀN TẤT" : "CHƯA ĐẤU"}</span></div>${[m.a, m.b].map((id, i) => `<div class="side ${win === id ? "win" : ""}">${renderTeam(id)}<span class="result">${m.sets ? (i ? b : a) : "–"}</span></div>`).join("")}${m.sets ? `<div class="sets">${m.sets.map(([x, y], i) => `S${i + 1} ${x}–${y}`).join(" · ")}</div>` : ""}<div class="match-actions"><button data-action="${prefix}.match" data-arg="${m.id}">Chi tiết</button>${locked ? "" : `${!m.sets ? `<button class="primary" data-action="${prefix}.simMatch" data-arg="${m.id}">Mô phỏng</button>` : ""}<button data-action="${prefix}.edit" data-arg="${m.id}">${m.sets ? "Sửa điểm" : "Nhập điểm"}</button>`}</div></article>`;
}
