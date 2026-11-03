import { accountState } from "../features/account/model";
import * as Tour from "../features/tour/controller";
import { tourCloud } from "../features/tour/cloud";
import * as Cloud from "../features/account/controller";
import {
  updateScoreEditor,
  simulateEditorSet,
  clearEditorSets,
  generateScore,
} from "../features/matches/editor";
import { $ } from "../shared/dom";
import { navigate, closeDialog, exportSave } from "./application";
import type { AppTab } from "./store";
type Action = (element: HTMLElement) => unknown;
const arg = (e: HTMLElement) => e.dataset.arg || "";
const actions: Record<string, Action> = {
  "Tour.nextSeason": (e) => Tour.nextSeason(arg(e)),
  "Tour.requestReset": (e) => Tour.requestReset(arg(e)),
  "Tour.confirmReset": (e) => Tour.confirmReset(arg(e)),
  "Tour.cancelReset": () => Tour.cancelReset(),
  "Tour.competition": (e) => Tour.competition(arg(e)),
  "Tour.resume": () => Tour.resume(),
  "Tour.enter": () => Tour.enter(),
  "Tour.create": () => Tour.create(),
  "Tour.start": () => Tour.start(),
  "Tour.cancelSetup": () => Tour.cancelSetup(),
  "Tour.toggleTeam": (e) => Tour.toggleTeam(arg(e)),
  "Tour.setupRegion": (e) => Tour.setupRegion(arg(e)),
  "Tour.resetRoster": () => Tour.resetRoster(),
  "Tour.open": (e) => Tour.open(arg(e)),
  "Tour.section": (e) => Tour.section(arg(e)),
  "Tour.viewStage": (e) => Tour.viewStage(arg(e), e.dataset.section),
  "Tour.round": (e) =>
    Tour.round(e.dataset.arg ?? (e as HTMLSelectElement).value),
  "Tour.region": (e) => Tour.region(arg(e)),
  "Tour.group": (e) => Tour.group(arg(e), e.dataset.section),
  "Tour.swissView": (e) => Tour.swissView(arg(e)),
  "Tour.next": () => Tour.next(),
  "Tour.simRound": () => Tour.simRound(),
  "Tour.stage": (e) => Tour.stage(arg(e)),
  "Tour.qualifierStage": (e) => Tour.qualifierStage(arg(e)),
  "Tour.finishStage": () => Tour.finishStage(),
  "Tour.finish": () => Tour.finish(),
  "Tour.match": (e) => Tour.showMatch(arg(e)),
  "Tour.simMatch": (e) => Tour.simMatch(arg(e)),
  "Tour.edit": (e) => Tour.edit(arg(e)),
  "Tour.dialogSim": () => Tour.actDialog(),
  "Tour.dialogEdit": () => Tour.actDialog(true),
  "Tour.team": (e) => Tour.showTeam(arg(e)),
  "Tour.export": () => Tour.exportSeasons(),
  "Tour.exportOne": () => Tour.exportSeasons(true),
  "Tour.import": () => $("tourImport").click(),
  "Tour.importFile": (e) =>
    Tour.importSeasons((e as HTMLInputElement).files?.[0]),
  "Tour.restore": () => Tour.restore(),
  "Tour.sync": () => Tour.sync(),
  "Tour.remote": () => tourCloud.resolve(true),
  "Tour.local": () => tourCloud.resolve(false),

  "Tour.achievements": () => Tour.achievements(),
  "Tour.achievementRegion": (e) => Tour.achievementRegion(arg(e)),
  "Tour.achievementTeam": (e) => Tour.achievementTeam(arg(e)),
  "Tour.achievementCompetition": (e) => Tour.achievementCompetition(arg(e)),
  navigate: (e) => navigate(arg(e) as AppTab),
  closeDialog: (e) => closeDialog(arg(e)),
  exportSave: () => exportSave(),
  updateScoreEditor: () => updateScoreEditor(),
  simulateEditorSet: (e) => simulateEditorSet(Number(arg(e))),
  clearEditorSets: (e) => clearEditorSets(Number(arg(e))),
  generateScore: () => generateScore(),
  "Cloud.manualSave": () => Cloud.manualSave(),
  "Cloud.open": () => Cloud.open(),
  "Cloud.logout": () => Cloud.logout(),
  "Cloud.retry": () => Cloud.retry(),
  "Cloud.syncNow": () => Cloud.syncNow(),
  "Cloud.restoreBackup": () => Cloud.restoreBackup(),
};
export function initializeActions() {
  const handle = (event: Event) => {
    const e = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-action]",
    );
    if (
      !e ||
      (e instanceof HTMLButtonElement && e.disabled) ||
      (e.dataset.trigger || "click") !== event.type
    )
      return;
    if (
      accountState.resetPending &&
      !["closeDialog", "Cloud.retry", "Cloud.logout", "Cloud.open"].includes(
        e.dataset.action || "",
      )
    )
      return;
    const action = actions[e.dataset.action || ""];
    if (!action) return;
    event.preventDefault();
    void action(e);
  };
  for (const name of ["click", "input", "change"])
    document.addEventListener(name, handle);
  return () => {
    for (const name of ["click", "input", "change"])
      document.removeEventListener(name, handle);
  };
}
