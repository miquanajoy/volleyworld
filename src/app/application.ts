import {
  renderTour,
  enter,
  create,
  exportSeasons,
  achievements,
} from "../features/tour/controller";
import { store } from "./store";
import type { AppTab } from "./store";
import { $ } from "../shared/dom";
/** Tour is the single public application; old routes cannot create standalone seasons. */
export function render() {
  store.tab = "tour";
  for (const id of ["homeHero", "stats", "nav", "seasonBar"]) {
    const e = document.getElementById(id);
    if (e) e.hidden = true;
  }
  renderTour();
}
export function navigate(t: AppTab) {
  if (t === "achievements") achievements();
  else enter();
}
export const exportSave = () => exportSeasons();
export const resetGame = () => create();
// Former save entry points are inert; Tour mutations use the scoped CAS adapter.
export const save = () => false;
export function closeDialog(id: string) {
  const e = $(id) as HTMLDialogElement;
  if (e?.open) e.close();
}
