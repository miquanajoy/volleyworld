interface AppElements {
  scoreForm: HTMLFormElement;
  editor: HTMLDialogElement;
  seasonDecision: HTMLDialogElement;
  cloudDialog: HTMLDialogElement;
  teamLeagueDialog: HTMLDialogElement;
  playoffMatchDialog: HTMLDialogElement;
  import: HTMLInputElement;
  search: HTMLInputElement;
  loginEmail: HTMLInputElement;
  loginForm: HTMLFormElement;
  heroAction: HTMLButtonElement;
  heroSettings: HTMLButtonElement;
  saveProgress: HTMLButtonElement;
}
export function $<K extends keyof AppElements>(id: K): AppElements[K];
export function $(id: string): HTMLElement;
export function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}
export const input = (id: string): HTMLInputElement =>
  $(id) as HTMLInputElement;
export const names = {
  CEV: "Châu Âu",
  NORCECA: "Bắc, Trung Mỹ & Caribe",
  AVC: "Châu Á & Đại Dương",
  CSV: "Nam Mỹ",
  CAVB: "Châu Phi",
};
export const esc = (s: unknown): string =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
