import { displayState, isReadOnly } from "../app/selectors";
import * as V from "../domain/index";
import type { Match } from "../domain/types";
import { isLocked } from "../features/matches/selectors";
import { formHtml, team } from "./team";

export function card(m: Match, label = "", locked = false) {
  locked = isLocked(m);
  let [a, b] = V.score(m),
    win = V.winner(m),
    seed = displayState().bracket?.seeds;
  return `<article class="match"><div class="match-top"><span>${label || "BEST OF FIVE"}</span><span>${m.sets ? "HOÀN TẤT" : "CHƯA ĐẤU"}</span></div>${[m.a, m.b].map((id, i) => `<div class="side ${win === id ? "win" : ""}"><span class="match-team-info">${team(id, true)}${formHtml(id)}</span>${seed && seed[id] ? `<span class="badge">S${seed[id]}</span>` : ""}<span class="result">${m.sets ? (i === 0 ? a : b) : "–"}</span></div>`).join("")}${m.sets ? `<div class="sets">${m.sets.map((s, i) => `S${i + 1} ${s[0]}–${s[1]}`).join(" · ")}</div>` : ""}${isReadOnly() ? "" : `<div class="match-actions">${!m.sets ? `<button class="primary" data-action="simOne" data-arg="${m.id}">Mô phỏng</button>` : ""}<button ${locked ? "disabled" : ""} data-action="editMatch" data-arg="${m.id}">${m.sets ? "Xem / sửa điểm" : "Nhập điểm"}</button></div>`}</article>`;
}
