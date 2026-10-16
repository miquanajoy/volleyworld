import { decidingFinal, isDouble, loser, winner } from "../domain/index";
import type { Tournament } from "../domain/types";
import { team } from "./team";
/** The final awards silver immediately; single-elimination bronze may still be pending. */
export function podiumHtml(s: Tournament): string {
  const final = decidingFinal(s);
  if (!final?.sets) return "";
  const bronze = isDouble(s) ? s.bracket?.lower6?.[0] : s.bracket?.bronze[0];
  const ids = [
    winner(final),
    loser(final),
    bronze?.sets ? (isDouble(s) ? loser(bronze) : winner(bronze)) : null,
  ];
  return `<div class="podium-grid live-podium" aria-label="Top 3 mùa giải">${ids.map((id, i) => `<section class="panel medal-card place-${i + 1}" data-place="${i + 1}"><span>${["🥇", "🥈", "🥉"][i]}</span><small>${["VÔ ĐỊCH", "Á QUÂN", "HẠNG BA"][i]}</small>${id ? `<h3>${team(id, false, s)}</h3>` : '<p class="sub">Chờ trận tranh hạng ba</p>'}</section>`).join("")}</div>`;
}
