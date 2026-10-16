import { store } from "../../app/store";
import * as V from "../../domain/index";
import type { PlayoffFormat, Region, RegionQuotas } from "../../domain/types";
export const setupState = { draft: null as SetupDraft | null };
export interface SetupDraft {
  basisFormat: PlayoffFormat;
  playoffFormat: PlayoffFormat;
  basis: string[];
  quotas: RegionQuotas;
  selected: string[];
  step: number;
}
export const regions = Object.keys(V.limits) as Region[];
export const count = (r: Region) =>
  setupState.draft!.selected.filter((id) => V.get(id).region === r).length;
export const equalSets = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));
export function discard() {
  setupState.draft = null;
}
export function ensure() {
  const basis = V.ids(store.state);
  if (
    !setupState.draft ||
    !equalSets(setupState.draft!.basis, basis) ||
    setupState.draft!.basisFormat !== (store.state.playoffFormat || "single")
  )
    setupState.draft = {
      basisFormat: store.state.playoffFormat || "single",
      playoffFormat: store.state.playoffFormat || "single",
      basis: [...basis],
      quotas: V.quotas(basis),
      selected: [...basis],
      step: 1,
    };
}
export function validQuotas() {
  return (
    regions.every(
      (r) =>
        Number.isInteger(setupState.draft!.quotas[r]) &&
        setupState.draft!.quotas[r] >= V.limits[r].min &&
        setupState.draft!.quotas[r] <= V.limits[r].max,
    ) && regions.reduce((n, r) => n + setupState.draft!.quotas[r], 0) === 32
  );
}
export function selectedValid() {
  return (
    validQuotas() &&
    regions.every((r) => count(r) === setupState.draft!.quotas[r]) &&
    V.validRoster(setupState.draft!.selected)
  );
}
export function progressText() {
  let total = regions.reduce((n, r) => n + setupState.draft!.quotas[r], 0);
  if (!Number.isFinite(total)) return "Vui lòng nhập số suất hợp lệ.";
  return total === 32
    ? "Đã phân bổ đủ 32 suất."
    : total < 32
      ? `Còn thiếu ${32 - total} suất. Hãy tăng số suất ở khu vực khác.`
      : `Dư ${total - 32} suất. Hãy giảm số suất ở khu vực khác.`;
}
export function needed(r: Region) {
  let n = count(r) - setupState.draft!.quotas[r];
  return n > 0
    ? `Cần bỏ ${n} đội`
    : n < 0
      ? `Cần thêm ${-n} đội`
      : "Đã chọn đủ";
}
