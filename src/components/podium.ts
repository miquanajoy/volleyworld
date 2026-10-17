import { decidingFinal, isDouble, loser, winner } from "../domain/index";
import type { Tournament } from "../domain/types";
import { team } from "./team";

export function medalPodiumHtml(
  ids: (string | null | undefined)[],
  renderTeam: (id: string) => string,
  live = true,
  finalLabel = "Chờ kết quả chung kết",
) {
  return `<div class="podium-grid ${live ? "live-podium" : ""}" aria-label="Top 3 mùa giải">${ids.map((id, i) => `<section class="panel medal-card place-${i + 1}" data-place="${i + 1}"><span>${["🥇", "🥈", "🥉"][i]}</span><small>${["VÔ ĐỊCH", "Á QUÂN", "HẠNG BA"][i]}</small>${id ? `<h3>${renderTeam(id)}</h3>` : `<p class="sub">${i < 2 ? finalLabel : "Chờ kết quả hạng ba"}</p>`}</section>`).join("")}</div>`;
}

/** Show the three award slots as soon as the medal-deciding matches are ready. */
export function podiumHtml(s: Tournament): string {
  const b = s.bracket;
  if (
    !b ||
    !(isDouble(s) ? b.lower6?.length : b.final.length && b.bronze.length)
  )
    return "";
  const final = decidingFinal(s);
  const bronze = isDouble(s) ? b.lower6?.[0] : b.bronze[0];
  return medalPodiumHtml(
    [
      final?.sets ? winner(final) : null,
      final?.sets ? loser(final) : null,
      bronze?.sets ? (isDouble(s) ? loser(bronze) : winner(bronze)) : null,
    ],
    (id) => team(id, false, s),
    true,
    isDouble(s) ? "Chờ chung kết tổng" : "Chờ kết quả chung kết",
  );
}
