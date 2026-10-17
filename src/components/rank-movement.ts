/** The symbol and accessible label convey movement independently of color. */
export function rankMovementHtml(change: number | null, round: number): string {
  if (change === null) return "";
  const kind = change > 0 ? "up" : change < 0 ? "down" : "same",
    comparison = round === 0 ? "trước vòng 1" : `vòng ${round}`,
    label = `${change > 0 ? `Tăng ${change} bậc` : change < 0 ? `Giảm ${-change} bậc` : "Giữ nguyên thứ hạng"} so với ${comparison}`;
  return `<span class="rank-movement rank-${kind}" data-change="${change}" role="img" aria-label="${label}" title="${label}">${change > 0 ? "↑" : change < 0 ? "↓" : "="}</span>`;
}
export const rankMovementLegend =
  '<div class="rank-legend"><span class="rank-up">↑ Tăng hạng</span><span class="rank-down">↓ Giảm hạng</span><span class="rank-same">= Giữ hạng</span><span>So với vòng liền trước</span></div>';
