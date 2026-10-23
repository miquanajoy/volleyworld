import * as F from "../../domain/full-season/index";
import type { Region } from "../../domain/types";
import { get } from "../../data/teams";
import { esc, names } from "../../shared/dom";
import { team } from "../../components/team";
import { selectedFull } from "./model";
import { qualifierTreeHtml } from "./qualification-tree";
const readonly = () =>
  selectedFull()?.status === "completed" ||
  selectedFull()?.phase === "conflict";
export function regionalPlayoffHtml(s: F.FullSeason, r: Region) {
  const g = s.regions[r],
    b = g.playoff;
  return `<div class="section-head"><div><span class="eyebrow">PLAYOFF KHU VỰC</span><h3>${names[r]} · Một vé World Cup</h3><p class="sub">Hạng 2–3 mỗi bảng thi đấu loại trực tiếp. Đội thắng nhánh giành vé; các đội còn lại dự Play-in liên khu vực.</p></div><button data-action="Full.section" data-arg="${r}">← Vòng bảng khu vực</button></div>${b ? qualifierTreeHtml(s, b, r) : '<section class="panel full-empty"><h3>Chờ hoàn tất vòng bảng</h3><p>Nhánh được tạo sau khi tất cả bảng của khu vực hoàn tất.</p></section>'}`;
}
export function intercontinentalHtml(s: F.FullSeason) {
  const ready = F.regionOrder.every((r) => F.regionalDone(s.regions[r]));
  const pool = ready && !s.intercontinental ? F.intercontinentalPool(s) : [];
  return `<div class="section-head"><div><span class="eyebrow">PLAY-IN LIÊN KHU VỰC</span><h3>27 đội · 3 vé cuối dự World Cup</h3><p class="sub">Ba nhánh độc lập, mỗi nhánh chín đội. Seed 8 gặp seed 9 ở sơ loại; đội thắng gặp seed 1. Không có trận tranh hạng ba.</p></div>${!s.intercontinental ? `<button class="primary" data-action="Full.drawIntercontinental" ${!ready || readonly() ? "disabled" : ""}>Bốc thăm Play-in</button>` : F.intercontinentalDone(s) ? `<button class="primary" data-action="${s.world ? "Full.section" : "Full.drawWorld"}" ${s.world ? 'data-arg="world"' : readonly() ? "disabled" : ""}>${s.world ? "Vào World Cup" : "Bốc thăm World Cup"} →</button>` : ""}</div>${
    s.intercontinental
      ? s.intercontinental.branches
          .map(
            (b, i) =>
              `<section class="qualification-branch"><div class="section-head"><h3>Nhánh ${"ABC"[i]}</h3><span class="badge">1 VÉ WORLD CUP</span></div>${qualifierTreeHtml(s, b, `IC${i}`)}</section>`,
          )
          .join("")
      : ready
        ? `<section class="qualification-pool" aria-label="Danh sách đội dự Play-in"><div class="qualification-pool-heading"><div><span class="eyebrow">DANH SÁCH THAM DỰ</span><h3>Sẵn sàng cho lượt bốc thăm</h3><p>Những đội tiếp tục hành trình tranh ba tấm vé World Cup cuối cùng.</p></div><span class="qualification-pool-ready"><span aria-hidden="true">✓</span> Đủ ${pool.length} đội</span></div><div class="qualification-pool-grid">${F.regionOrder
            .map((r) => {
              const ids = pool.filter((id) => get(id).region === r);
              return `<section class="qualification-pool-region" data-pool-region="${r}"><div class="qualification-pool-region-head"><h4>${names[r]}</h4><span>${ids.length} đội</span></div><ul>${ids.map((id) => `<li title="${esc(get(id).name)}">${team(id)}</li>`).join("")}</ul></section>`;
            })
            .join(
              "",
            )}</div><div class="qualification-pool-draw"><span class="qualification-pool-draw-label">THỂ THỨC BỐC THĂM</span><p><strong>9 pot × 3 đội</strong><span aria-hidden="true"> → </span><strong>3 nhánh × 9 đội</strong><span aria-hidden="true"> → </span><strong>3 vé World Cup</strong></p><small>Mỗi nhánh nhận một đội từ mỗi pot. Ưu tiên tránh gặp đội cùng khu vực ở vòng sơ loại.</small></div></section>`
        : '<section class="panel full-empty"><h3>Chờ kết quả năm khu vực</h3><p>Cần hoàn tất vòng bảng và playoff khu vực trước khi chốt danh sách Play-in.</p></section>'
  }`;
}
