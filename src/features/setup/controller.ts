import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import * as V from "../../domain/index";
import type { PlayoffFormat, Region } from "../../domain/types";
import { toast } from "../../shared/feedback";
import {
  count,
  discard,
  ensure,
  equalSets,
  regions,
  selectedValid,
  setupState,
  validQuotas,
} from "./model";
import { render } from "./views";
export function setPlayoffFormat(mode: PlayoffFormat) {
  if (
    !getPorts().seasons.canCustomize() ||
    !["single", "double"].includes(mode)
  )
    return;
  ensure();
  setupState.draft!.playoffFormat = mode;
  render();
}
export function setQuota(r: Region, value: number | string) {
  if (!getPorts().seasons.canCustomize()) return;
  ensure();
  if (!regions.includes(r)) return;
  setupState.draft!.quotas[r] = Number(value);
  render();
}
export function adjust(r: Region, delta: number) {
  const n = setupState.draft!.quotas[r] + delta;
  if (n >= V.limits[r].min && n <= V.limits[r].max) setQuota(r, n);
}
export function defaults() {
  setupState.draft!.quotas = V.quotas(V.defaultIds);
  render();
}
export function next() {
  if (!getPorts().seasons.canCustomize()) return;
  if (!validQuotas()) {
    toast("Cần đủ 32 suất và đúng giới hạn từng khu vực.");
    return;
  }
  setupState.draft!.step = 2;
  render();
}
export function back() {
  setupState.draft!.step = Math.max(1, setupState.draft!.step - 1);
  render();
}
export function toggle(id: string, checked: boolean) {
  if (!getPorts().seasons.canCustomize()) return;
  ensure();
  const t = V.get(id);
  if (!t) return;
  if (checked) {
    if (
      count(t.region) >= setupState.draft!.quotas[t.region] ||
      setupState.draft!.selected.includes(id)
    )
      return;
    setupState.draft!.selected.push(id);
  } else
    setupState.draft!.selected = setupState.draft!.selected.filter(
      (x) => x !== id,
    );
  render();
}
export function top(r: Region) {
  if (!getPorts().seasons.canCustomize()) return;
  setupState.draft!.selected = [
    ...setupState.draft!.selected.filter((id) => V.get(id).region !== r),
    ...V.regionTeams(r)
      .slice(0, setupState.draft!.quotas[r])
      .map((t) => t.id),
  ];
  render();
}
export function review() {
  if (!getPorts().seasons.canCustomize()) return;
  if (!selectedValid()) {
    toast("Chọn đủ đội cho từng khu vực trước khi xác nhận.");
    return;
  }
  setupState.draft!.step = 3;
  render();
}
export function apply() {
  if (
    !getPorts().seasons.canCustomize() ||
    !setupState.draft ||
    setupState.draft!.step !== 3 ||
    !selectedValid()
  )
    return;
  if (
    !equalSets(setupState.draft!.basis, V.ids(store.state)) ||
    setupState.draft!.basisFormat !== (store.state.playoffFormat || "single")
  ) {
    discard();
    render();
    toast("Danh sách giải đã thay đổi. Hãy tùy chỉnh lại.");
    return;
  }
  const selected = V.catalog
    .filter((t) => setupState.draft!.selected.includes(t.id))
    .map((t) => t.id);
  getPorts().seasons.replaceRoster(selected, setupState.draft!.playoffFormat);
}
export { discard } from "./model";
export { render } from "./views";
