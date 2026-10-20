import * as F from "../../domain/full-season/index";
import type { Match } from "../../domain/types";
import { score, winner } from "../../domain/match/scoring";
import { esc, names } from "../../shared/dom";
import { team } from "../../components/team";
import { fullTeam } from "./views";

function qualifierRound(b: F.QualifierBracket, round: number) {
  const size = 2 ** (b.rounds.length - round);
  return round === 0 && 2 ** b.rounds.length !== b.seeds.length
    ? "Sơ loại"
    : size === 8
      ? "Tứ kết"
      : size === 4
        ? "Bán kết"
        : "Tranh vé World Cup";
}
function matchLabel(s: F.FullSeason, m: Match) {
  for (const r of F.regionOrder) {
    const g = s.regions[r],
      playoff = g.playoff?.rounds.findIndex((row) => row.includes(m)) ?? -1,
      round = g.rounds.findIndex((row) => row.includes(m));
    if (playoff >= 0)
      return `${names[r]} · Playoff khu vực · ${qualifierRound(g.playoff!, playoff)}`;
    if (g.decider === m) return `${names[r]} · Tranh vé World Cup`;
    if (round >= 0) {
      const group = g.groups?.findIndex((ids) => ids.includes(m.a)) ?? -1;
      return `${names[r]}${group >= 0 ? ` · Bảng ${group + 1}` : ""} · Vòng ${round + 1}`;
    }
  }
  for (const [i, b] of (s.intercontinental?.branches || []).entries()) {
    const r = b.rounds.findIndex((row) => row.includes(m));
    if (r >= 0)
      return `Play-in liên khu vực · Nhánh ${"ABC"[i]} · ${qualifierRound(b, r)}`;
  }
  const group =
    s.world?.groups.findIndex((g) => g.rounds.flat().includes(m)) ?? -1;
  if (group >= 0) {
    const round = s.world!.groups[group].rounds.findIndex((row) =>
      row.includes(m),
    );
    return `World Cup · Bảng ${"ABCDEF"[group]} · Vòng ${round + 1}`;
  }
  const labels = {
    r16: "Vòng 16 đội",
    qf: "Tứ kết",
    sf: "Bán kết",
    final: "Chung kết",
    bronze: "Tranh hạng ba",
  };
  const stage = F.worldStages.find((k) => s.world?.bracket?.[k].includes(m));
  return stage ? `World Cup · ${labels[stage]}` : "World Cup";
}

export function fullMatchDetailHtml(
  s: F.FullSeason,
  m: Match,
  locked: boolean,
  lockMessage: string,
) {
  const result = score(m),
    win = winner(m);
  return `<section class="full-match-detail"><div class="full-match-meta"><div><span class="eyebrow">WORLD CUP · MÙA ${s.seasonNumber}</span><p>${esc(matchLabel(s, m))}</p></div><span class="full-match-status ${m.sets ? "is-complete" : ""}">${m.sets ? "✓ Đã thi đấu" : "Chưa thi đấu"}</span></div><div class="full-match-scoreboard">${[m.a, m.b].map((id, i) => `${i ? `<div class="full-match-score" aria-label="${m.sets ? `Tỉ số set ${result.join("–")}` : "Trận chưa thi đấu"}"><strong>${m.sets ? `${result[0]}<span>–</span>${result[1]}` : "VS"}</strong><small>${m.sets ? "TỈ SỐ SET" : "BEST OF 5"}</small></div>` : ""}<div class="full-match-team ${win === id ? "is-winner" : ""}">${fullTeam(id, s)}${win ? `<span class="full-match-outcome">${win === id ? "Đội thắng" : "Đội thua"}</span>` : ""}</div>`).join("")}</div>${m.sets ? `<div class="full-match-sets table-wrap"><table aria-label="Điểm từng set"><thead><tr><th>ĐỘI TUYỂN</th>${m.sets.map((_, i) => `<th>SET ${i + 1}</th>`).join("")}</tr></thead><tbody>${[m.a, m.b].map((id, i) => `<tr><th scope="row">${team(id)}</th>${m.sets!.map((pair) => `<td class="${pair[i] > pair[1 - i] ? "set-winner" : ""}">${pair[i]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<p class="full-match-help">Trận đấu BO5 · Đội thắng 3 set giành chiến thắng.</p>'}${locked ? `<p class="full-match-lock" role="status">${esc(lockMessage)}</p>` : `<div class="full-match-actions">${!m.sets ? '<button class="primary" data-action="Full.dialogSim"><span aria-hidden="true">▶</span> Mô phỏng trận</button>' : ""}<button ${m.sets ? 'class="primary"' : ""} data-action="Full.dialogEdit">${m.sets ? "Chỉnh sửa điểm" : "Nhập điểm thủ công"}</button></div>`}</section>`;
}
