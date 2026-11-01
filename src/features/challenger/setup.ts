import { catalog, get, limits } from "../../data/teams";
import { team } from "../../components/team";
import { names, esc } from "../../shared/dom";
import { validChallengerRoster } from "../../domain/challenger/index";
import type { Region } from "../../domain/types";
import { model } from "./model";
export function setupHtml() {
  const draft = model.setup!;
  const regions = ["CEV", "AVC", "NORCECA", "CAVB", "CSV"] as Region[],
    region = draft.region as Region;
  return `<section class="challenger-roster-setup"><div class="section-head"><div><span class="eyebrow">CHALLENGER · THIẾT LẬP MÙA</span><h2>Chọn đội cho hành trình Swiss</h2><p class="sub">Chọn 32 đội. Vòng đầu khác khu vực; toàn bộ Swiss không tái đấu.</p></div><button data-action="Challenger.cancelSetup">← Hủy</button></div><div class="challenger-roster-summary"><div><strong class="${draft.ids.length !== 32 ? "is-incomplete" : ""}">${draft.ids.length}<small>/32 đội</small></strong><p>Ít nhất 2 đội mỗi khu vực. Tối đa 16 đội cùng khu vực để luôn bốc thăm được vòng đầu.</p></div><button data-action="Challenger.resetRoster">Khôi phục 32 đội mặc định</button></div>${draft.error ? `<p class="notice" role="alert">${esc(draft.error)}</p>` : ""}<nav class="challenger-region-tabs" aria-label="Chọn khu vực">${regions
    .map((r) => {
      const n = draft.ids.filter((id) => get(id).region === r).length,
        max = Math.min(16, limits[r].max);
      return `<button data-action="Challenger.setupRegion" data-arg="${r}" aria-pressed="${r === region}"><span>${names[r]}</span><b>${n} <small>/ ${max}</small></b></button>`;
    })
    .join(
      "",
    )}</nav><section class="panel challenger-roster-catalog"><div class="section-head"><div><h3>${names[region]}</h3><p class="sub">${limits[region].min}–${Math.min(16, limits[region].max)} đội · Sắp theo BXH thế giới</p></div><span class="badge">${catalog.filter((t) => t.region === region).length} ĐỘI</span></div><div class="challenger-roster-grid">${catalog
    .filter((t) => t.region === region)
    .map(
      (t) =>
        `<button type="button" class="challenger-roster-option ${draft.ids.includes(t.id) ? "is-selected" : ""}" data-action="Challenger.toggleTeam" data-arg="${t.id}" aria-pressed="${draft.ids.includes(t.id)}" title="${esc(t.name)} · BXH thế giới #${t.rank}"><span class="challenger-roster-check" aria-hidden="true">${draft.ids.includes(t.id) ? "✓" : "+"}</span><span class="team-rank">#${t.rank}</span>${team(t.id)}</button>`,
    )
    .join(
      "",
    )}</div></section><details class="panel challenger-roster-review"><summary>Xem ${draft.ids.length} đội đã chọn</summary><div>${draft.ids.map((id) => `<button data-action="Challenger.toggleTeam" data-arg="${id}" title="Bỏ ${esc(get(id).name)}">${team(id)}<span aria-hidden="true">×</span></button>`).join("")}</div></details><div class="challenger-roster-footer"><p>${draft.ids.length < 32 ? `Còn thiếu ${32 - draft.ids.length} đội` : draft.ids.length > 32 ? `Cần bỏ bớt ${draft.ids.length - 32} đội` : validChallengerRoster(draft.ids) ? "Đủ 32 đội · Sẵn sàng bốc thăm vòng 1" : "Kiểm tra giới hạn từng khu vực"}</p><button class="primary" data-action="Challenger.start" ${validChallengerRoster(draft.ids) ? "" : "disabled"}>${draft.editId ? "Lưu đội & bốc thăm lại vòng 1" : "Xác nhận đội & bắt đầu"} →</button></div></section>`;
}
