import { catalog, get } from "../../data/teams";
import * as T from "../../domain/tour/index";
import { regionOrder } from "../../domain/full-season/types";
import type { Region } from "../../domain/types";
import { team } from "../../components/team";
import { esc, names } from "../../shared/dom";

export function setupHtml(ids: string[], region: Region) {
  const counts = Object.fromEntries(
    regionOrder.map((r) => [
      r,
      ids.filter((id) => get(id)?.region === r).length,
    ]),
  );
  return `<div class="tour-page"><div class="section-head"><div><span class="eyebrow">VOLLEYWORLD TOUR · THIẾT LẬP MÙA</span><h2>Một đội hình. Cả hành trình.</h2><p class="sub">Chỉ chọn 32 đội ở mùa đầu. Từ mùa sau, danh sách World Cup quyết định đội hình League và Challenger.</p></div><button data-action="Tour.cancelSetup">← Quay lại</button></div><section class="tour-selection-intro"><div><span class="tour-selection-number">${ids.length}<small>/ 32</small></span><span>ĐỘI ĐÃ CHỌN</span></div><p>Chọn theo hạn ngạch mùa đầu; những mùa sau tự động thăng/rớt hạng. 68 đội còn lại tranh quyền dự World Cup Play-in tại khu vực.</p><button data-action="Tour.resetRoster">Chọn các đội mạnh nhất</button></section><nav class="challenger-region-tabs tour-region-tabs" aria-label="Khu vực chọn đội">${regionOrder.map((r) => `<button data-action="Tour.setupRegion" data-arg="${r}" aria-pressed="${r === region}"><span>${names[r]}</span><b class="${counts[r] === T.quotas[r] ? "is-ready" : ""}">${counts[r]}<small> / ${T.quotas[r]}</small>${counts[r] === T.quotas[r] ? " ✓" : ""}</b></button>`).join("")}</nav><section class="panel challenger-roster-catalog"><div class="section-head"><div><span class="eyebrow">${T.quotas[region]} SUẤT CỐ ĐỊNH</span><h3>${names[region]}</h3><p class="sub">${region === "CSV" ? "Cả sáu đội Nam Mỹ đều tham gia." : "Bỏ một đội đang chọn để thay bằng quốc gia khác."} · Theo thứ hạng thế giới</p></div><span class="badge">${counts[region]} / ${T.quotas[region]} ĐỘI</span></div><div class="challenger-roster-grid">${catalog
    .filter((t) => t.region === region)
    .map(
      (t) =>
        `<button type="button" class="challenger-roster-option ${ids.includes(t.id) ? "is-selected" : ""}" data-action="Tour.toggleTeam" data-arg="${t.id}" aria-pressed="${ids.includes(t.id)}" ${!ids.includes(t.id) && counts[region] >= T.quotas[region] ? "disabled" : ""} title="${esc(t.name)} · BXH thế giới #${t.rank}"><span class="challenger-roster-check" aria-hidden="true">${ids.includes(t.id) ? "✓" : "+"}</span><span class="team-rank">#${t.rank}</span>${team(t.id)}</button>`,
    )
    .join(
      "",
    )}</div></section><details class="panel tour-roster-review"><summary>Xem toàn bộ đội hình đã chọn</summary><div class="tour-roster-regions">${regionOrder
    .map(
      (r) =>
        `<section><h4>${names[r]} <small>${counts[r]}/${T.quotas[r]}</small></h4>${ids
          .filter((id) => get(id).region === r)
          .map((id) => `<div>${team(id)}</div>`)
          .join("")}</section>`,
    )
    .join(
      "",
    )}</div></details><div class="tour-setup-footer"><p>${T.validRoster(ids) ? "✓ Đã đủ đội cho cả năm khu vực. Sẵn sàng khởi hành." : "Chọn đủ số đội ở từng khu vực để bắt đầu."}</p><button class="primary" data-action="Tour.start" ${T.validRoster(ids) ? "" : "disabled"}>Bắt đầu mùa Tour →</button></div></div>`;
}
