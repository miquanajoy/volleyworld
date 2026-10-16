import { nextLeagueRound } from "../features/league/navigation";
import {
  selectRegion,
  selectTeam,
  selectView,
  selectWorldwide,
} from "../features/achievements/controller";
import type { PlayoffFormat, Region, StageKey } from "../domain/types";
import * as league from "../features/league/controller";
import { renderLeague, showTeamLeague } from "../features/league/views";
import {
  editMatch,
  updateScoreEditor,
  simulateEditorSet,
  clearEditorSets,
  generateScore,
} from "../features/matches/editor";
import * as playoffController from "../features/playoff/controller";
import { $ } from "../shared/dom";
import { exportSave, navigate } from "./application";
import { getPorts } from "./ports";
import type { AppTab } from "./store";
import { store } from "./store";

type Action = (element: HTMLElement) => unknown;
const arg = (e: HTMLElement) => e.dataset.arg || "";
/** Explicit command table: markup carries data, never executable JavaScript. */
const actions: Record<string, Action> = {
  achievementView: (e) => selectView(arg(e)),
  achievementWorld: () => selectWorldwide(),
  achievementRegion: (e) => selectRegion(arg(e) as Region),
  achievementTeam: (e) => selectTeam(arg(e)),
  nextLeagueRound: () => nextLeagueRound(),
  navigate: (e) => navigate(arg(e) as AppTab),
  exportSave: () => exportSave(),
  importFile: () => $("import").click(),
  closeDialog: (e) => ($(arg(e)) as HTMLDialogElement).close(),
  changeRound: (e) => {
    store.round += Number(arg(e));
    renderLeague();
  },
  selectRound: (e) => {
    store.round = Number((e as HTMLSelectElement).value);
    renderLeague();
  },
  editMatch: (e) => editMatch(arg(e)),
  updateScoreEditor: () => updateScoreEditor(),
  simulateEditorSet: (e) => simulateEditorSet(Number(arg(e))),
  clearEditorSets: (e) => clearEditorSets(Number(arg(e))),
  generateScore: () => generateScore(),
  showTeamLeague: (e) => showTeamLeague(arg(e)),
  simOne: (e) => league.simOne(arg(e)),
  simRound: () => league.simRound(),
  simLeague: () => league.simLeague(),
  startPlayin: () => league.startPlayin(),
  drawBracket: () => league.drawBracket(),
  simPlayin: () => league.simPlayin(),
  simStage: (e) => league.simStage(arg(e) as StageKey),
  openPlayoffMatch: (e) => playoffController.openPlayoffMatch(arg(e)),
  playoffSimOne: (e) => playoffController.playoffSimOne(arg(e)),
  playoffEditMatch: (e) => playoffController.playoffEditMatch(arg(e)),
  setPlayoffLayout: (e) =>
    playoffController.setPlayoffLayout(arg(e) as "tree" | "branches"),
  setDoubleView: (e) =>
    playoffController.setDoubleView(arg(e) as "upper" | "lower" | "grand"),
  "Seasons.start": () => getPorts().seasons.start(),
  "Seasons.customize": () => getPorts().seasons.customize(),
  "Seasons.requestNew": () => getPorts().seasons.requestNew(),
  "Seasons.view": (e) => getPorts().seasons.view(arg(e)),
  "Seasons.resolve": (e) =>
    getPorts().seasons.resolve(arg(e), e.dataset.arg1 === "true"),
  "Settings.setPlayoffFormat": (e) =>
    getPorts().settings.setPlayoffFormat(arg(e) as PlayoffFormat),
  "Settings.setQuota": (e) =>
    getPorts().settings.setQuota(
      arg(e) as Region,
      (e as HTMLInputElement).value,
    ),
  "Settings.adjust": (e) =>
    getPorts().settings.adjust(arg(e) as Region, Number(e.dataset.arg1)),
  "Settings.toggle": (e) =>
    getPorts().settings.toggle(arg(e), (e as HTMLInputElement).checked),
  "Settings.top": (e) => getPorts().settings.top(arg(e) as Region),
  "Settings.defaults": () => getPorts().settings.defaults(),
  "Settings.next": () => getPorts().settings.next(),
  "Settings.back": () => getPorts().settings.back(),
  "Settings.review": () => getPorts().settings.review(),
  "Settings.apply": () => getPorts().settings.apply(),
  "Cloud.manualSave": () => getPorts().cloud.manualSave(),
  "Cloud.open": () => getPorts().cloud.open(),
  "Cloud.acceptLocal": () => getPorts().cloud.acceptLocal(),
  "Cloud.acceptOnline": () => getPorts().cloud.acceptOnline(),
  "Cloud.logout": () => getPorts().cloud.logout(),
  "Cloud.restoreBackup": () => getPorts().cloud.restoreBackup(),
  "Cloud.retry": () => getPorts().cloud.retry(),
  "Cloud.syncNow": () => getPorts().cloud.syncNow(),
};

export function initializeActions(): () => void {
  const handle = (event: Event) => {
    const element = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-action]",
    );
    if (
      !element ||
      (element instanceof HTMLButtonElement && element.disabled) ||
      (element.dataset.trigger || "click") !== event.type
    )
      return;
    const action = actions[element.dataset.action || ""];
    if (!action) return;
    event.preventDefault();
    void action(element);
  };
  for (const name of ["click", "input", "change"])
    document.addEventListener(name, handle);
  return () => {
    for (const name of ["click", "input", "change"])
      document.removeEventListener(name, handle);
  };
}
