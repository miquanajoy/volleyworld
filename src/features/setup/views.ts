import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import { team } from "../../components/team";
import * as V from "../../domain/index";
import type { Team } from "../../domain/types";
import { $, names } from "../../shared/dom";
import {
  count,
  ensure,
  needed,
  progressText,
  regions,
  selectedValid,
  setupState,
  validQuotas,
} from "./model";
export function render() {
  if (!getPorts().seasons.canCustomize()) {
    getPorts().seasons.customize();
    return;
  }
  ensure();
  const c = $("content");
  if (setupState.draft!.step === 1) renderQuotas(c);
  if (setupState.draft!.step === 2) renderChoices(c);
  if (setupState.draft!.step === 3) renderReview(c);
}
export function steps() {
  return `<div class="setup-steps">${["Thể thức & suất", "Chọn đội", "Xác nhận"].map((n, i) => `<span class="${setupState.draft!.step === i + 1 ? "current" : ""}"><b>${i + 1}</b>${n}</span>`).join("")}</div>`;
}
export function playoffChoices() {
  return `<section class="playoff-format-setup"><h3>Thể thức playoff</h3><p class="sub">Chọn trước khi bắt đầu mùa. League và vòng Play-in giữ nguyên.</p><div class="format-choices" role="group" aria-label="Thể thức playoff">${[
    [
      "single",
      "Loại trực tiếp",
      "16 trận playoff",
      "Thua một trận bị loại. Có trận tranh hạng ba.",
    ],
    [
      "double",
      "Nhánh thắng – nhánh thua",
      "30–31 trận playoff",
      "Thua lần đầu xuống nhánh thua; thua lần hai bị loại. Chung kết tổng có reset; hạng ba lấy từ chung kết nhánh thua.",
    ],
  ]
    .map(
      ([mode, title, count, help]) =>
        `<button type="button" class="format-choice ${setupState.draft!.playoffFormat === mode ? "selected" : ""}" aria-pressed="${setupState.draft!.playoffFormat === mode}" data-action="Settings.setPlayoffFormat" data-arg="${mode}"><span class="format-choice-heading"><b>${title}</b><span>${setupState.draft!.playoffFormat === mode ? "✓ Đã chọn" : "Chọn"}</span></span><span class="badge">${count} · BO5</span><span class="format-choice-help">${help}</span></button>`,
    )
    .join("")}</div></section>`;
}
export function renderQuotas(c: HTMLElement) {
  let current = V.quotas(setupState.draft!.basis),
    total = regions.reduce((n, r) => n + setupState.draft!.quotas[r], 0);
  c.innerHTML = `<div class="section-head"><div><h2>Tùy chỉnh giải đấu</h2><p class="sub">Bạn quyết định cơ hội của từng khu vực. Giải luôn có 32 đội; bạn chọn thể thức playoff cho mùa này.</p></div><button data-action="Settings.defaults">Phân bổ mặc định</button></div>${steps()}${playoffChoices()}<div class="quota-layout"><div class="quota-cards">${regions.map((r) => `<article class="panel quota-card"><div><span class="badge">${r}</span><h3>${names[r]}</h3><p class="sub">Hiện tại ${current[r]} đội · Giới hạn ${V.limits[r].min}–${V.limits[r].max} đội</p></div><div class="stepper"><button aria-label="Giảm suất ${names[r]}" ${setupState.draft!.quotas[r] <= V.limits[r].min ? "disabled" : ""} data-action="Settings.adjust" data-arg="${r}" data-arg1="-1">−</button><input aria-label="Số suất ${names[r]}" type="number" min="${V.limits[r].min}" max="${V.limits[r].max}" step="1" value="${Number.isFinite(setupState.draft!.quotas[r]) ? setupState.draft!.quotas[r] : ""}" data-action="Settings.setQuota" data-trigger="change" data-arg="${r}"><button aria-label="Tăng suất ${names[r]}" ${setupState.draft!.quotas[r] >= V.limits[r].max ? "disabled" : ""} data-action="Settings.adjust" data-arg="${r}" data-arg1="1">+</button></div></article>`).join("")}</div><aside class="panel quota-summary"><div class="eyebrow">TỔNG SỐ SUẤT</div><div class="quota-total ${validQuotas() ? "valid" : ""}">${Number.isFinite(total) ? total : "–"}<small>/32</small></div><p class="sub" role="status">${progressText()}</p><div class="allocation-bar">${regions.map((r) => `<i class="region-${r}" style="flex:${Math.max(0, setupState.draft!.quotas[r] || 0)}" title="${names[r]}: ${setupState.draft!.quotas[r]}"></i>`).join("")}</div>${regions.map((r) => `<div class="allocation-line"><span><i class="region-${r}"></i>${r}</span><b>${setupState.draft!.quotas[r]} đội</b></div>`).join("")}<button class="primary" ${validQuotas() ? "" : "disabled"} data-action="Settings.next">Tiếp tục: chọn đội →</button><p class="sub" style="margin-top:12px">Thay đổi tại đây chưa ảnh hưởng giải đang chơi.</p></aside></div>`;
}
export function option(t: Team) {
  const selected = setupState.draft!.selected.includes(t.id),
    full = count(t.region) >= setupState.draft!.quotas[t.region];
  return `<label class="roster-option ${selected ? "selected" : ""}"><input type="checkbox" ${selected ? "checked" : ""} ${!selected && full ? "disabled" : ""} data-action="Settings.toggle" data-trigger="change" data-arg="${t.id}"><span class="flag">${t.flag}</span><span class="roster-name">${t.name}<small>#${V.regionTeams(t.region).findIndex((x) => x.id === t.id) + 1} khu vực · #${t.rank} thế giới</small></span>${selected ? '<span class="selection-tick">✓</span>' : ""}</label>`;
}
export function renderChoices(c: HTMLElement) {
  const missing = regions.filter(
    (r) => count(r) !== setupState.draft!.quotas[r],
  );
  c.innerHTML = `<div class="section-head"><div><h2>Chọn đội cho từng khu vực</h2><p class="sub">Đội hiện tại được giữ sẵn. Tự bỏ hoặc thêm đội để khớp số suất bạn đã đặt.</p></div><span class="round-tag">${setupState.draft!.selected.length}/32 ĐỘI ĐÃ CHỌN</span></div>${steps()}<div class="selection-note ${missing.length ? "needs-action" : "complete"}" role="status">${missing.length ? missing.map((r) => `${r}: ${needed(r).toLowerCase()}`).join(" · ") : "Tất cả khu vực đã đủ đội. Bạn có thể xem lại trước khi áp dụng."}</div>${regions
    .map((r) => {
      const old = V.regionTeams(r).filter((t) =>
          setupState.draft!.basis.includes(t.id),
        ),
        reserves = V.regionTeams(r).filter(
          (t) => !setupState.draft!.basis.includes(t.id),
        );
      return `<details class="panel roster-region" ${count(r) !== setupState.draft!.quotas[r] ? "open" : ""}><summary><span><span class="badge">${r}</span> <b>${names[r]}</b></span><span class="${count(r) === setupState.draft!.quotas[r] ? "roster-ready" : "roster-needed"}">${count(r)}/${setupState.draft!.quotas[r]} · ${needed(r)}</span></summary><div class="roster-body"><div class="section-head"><p class="sub">Xếp theo BXH khu vực · bỏ một đội trước nếu muốn đổi sang đội dự phòng.</p><button data-action="Settings.top" data-arg="${r}">Chọn top ${setupState.draft!.quotas[r]} theo BXH</button></div><div class="roster-columns"><section><h3>Đội đang dự giải <span class="badge">${old.length}</span></h3><div class="roster-list">${old.map(option).join("")}</div></section><section><h3>Đội dự phòng <span class="badge">${reserves.length}</span></h3><div class="roster-list">${reserves.map(option).join("")}</div></section></div></div></details>`;
    })
    .join(
      "",
    )}<div class="setup-footer"><button data-action="Settings.back">← Phân bổ suất</button><span class="sub">${selectedValid() ? "Đã chọn đủ 32 đội" : "Chưa thể xác nhận: cần chọn đúng số đội của từng khu vực"}</span><button class="primary" ${selectedValid() ? "" : "disabled"} data-action="Settings.review">Xem lại & xác nhận →</button></div>`;
}
export function renderReview(c: HTMLElement) {
  const added = setupState.draft!.selected.filter(
      (id) => !setupState.draft!.basis.includes(id),
    ),
    removed = setupState.draft!.basis.filter(
      (id) => !setupState.draft!.selected.includes(id),
    ),
    played = store.state.rounds.flat().filter((m) => m.sets).length;
  c.innerHTML = `<div class="section-head"><div><h2>Xác nhận thể thức trước khi bắt đầu</h2><p class="sub">Kiểm tra danh sách trước khi áp dụng.</p></div><span class="round-tag">32 ĐỘI · 31 VÒNG · 496 TRẬN</span></div>${steps()}<div class="notice"><span class="badge">PLAYOFF · ${V.formatName({ playoffFormat: setupState.draft!.playoffFormat })}</span><p>${setupState.draft!.playoffFormat === "double" ? "Thua hai lần mới bị loại. Chung kết tổng có thể cần hai trận BO5; đội thua chung kết nhánh thua đứng hạng ba." : "Loại trực tiếp, có trận tranh hạng ba."}</p><b>${added.length} đội được thêm · ${removed.length} đội được bỏ</b><p>Lịch league và nhánh playoff sẽ được tạo lại theo danh sách mới.${played ? ` Giải hiện tại có ${played} trận league đã đấu; các kết quả đó không chuyển sang giải mới.` : ""} Cấu hình chỉ áp dụng cho mùa chưa bắt đầu.</p><button data-action="exportSave">Xuất tiến độ hiện tại trước khi đổi</button></div><div class="change-grid"><div class="panel change-card"><h3>+ Thêm vào giải</h3>${added.length ? added.map((id) => `<div>${team(id)}</div>`).join("") : '<p class="sub">Không thêm đội mới.</p>'}</div><div class="panel change-card"><h3>− Chuyển sang dự phòng</h3>${removed.length ? removed.map((id) => `<div>${team(id)}</div>`).join("") : '<p class="sub">Không bỏ đội nào.</p>'}</div></div><div class="region-grid">${regions
    .map(
      (r) =>
        `<div class="panel region-card"><span class="badge">${r} · ${setupState.draft!.quotas[r]} ĐỘI</span><h3 style="margin-top:12px">${names[r]}</h3>${V.regionTeams(
          r,
        )
          .filter((t) => setupState.draft!.selected.includes(t.id))
          .map(
            (t) =>
              `<div class="team"><span class="flag">${t.flag}</span>${t.name}${added.includes(t.id) ? "<small>+ Mới</small>" : ""}</div>`,
          )
          .join("")}</div>`,
    )
    .join(
      "",
    )}</div><div class="setup-footer"><button data-action="Settings.back">← Chọn đội</button><button class="primary" data-action="Settings.apply">Xác nhận thể thức & đội →</button></div>`;
}
