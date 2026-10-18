import * as Nations from "../features/nations-league/controller";
import { nationsCloud } from "../features/nations-league/cloud";
import * as Full from "../features/full-season/controller";
import { nextLeagueRound } from "../features/league/navigation";
import {
  selectRegion,
  selectTeam,
  selectView,
  selectWorldwide,
} from "../features/achievements/controller";
import type { PlayoffFormat, Region, StageKey } from "../domain/types";
import * as league from "../features/league/controller";
import {
  renderLeague,
  showTeamLeague,
  selectStandingsRound,
} from "../features/league/views";
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
  "Nations.enter": () => Nations.enterNations(),
  "Nations.library": () => Nations.enterNations(),
  "Nations.create": () => Nations.createNations(),
  "Nations.nextSeason": () => Nations.nextNationsSeason(),
  "Nations.open": (e) => Nations.openNations(arg(e)),
  "Nations.section": (e) => Nations.sectionNations(arg(e)),
  "Nations.round": (e) => Nations.roundNations((e as HTMLSelectElement).value),
  "Nations.next": () => Nations.nextNationsRound(),
  "Nations.simRound": () => Nations.simulateNationsRound(),
  "Nations.simMatch": (e) => Nations.simulateNationsMatch(arg(e)),
  "Nations.draw": () => Nations.drawNations(),
  "Nations.stage": (e) => Nations.simulateNationsStage(arg(e)),
  "Nations.finish": () => Nations.finishNations(),
  "Nations.edit": (e) => Nations.editNationsMatch(arg(e)),
  "Nations.match": (e) => Nations.showNationsMatch(arg(e)),
  "Nations.dialogSim": () => Nations.actNationsDialog(),
  "Nations.dialogEdit": () => Nations.actNationsDialog(true),
  "Nations.team": (e) =>
    Nations.showNationsTeam(
      arg(e),
      e.dataset.arg1 === undefined ? undefined : Number(e.dataset.arg1),
    ),
  "Nations.export": () => Nations.exportNations(),
  "Nations.exportOne": () => Nations.exportNations(true),
  "Nations.import": () => $("nationsImport").click(),
  "Nations.importFile": (e) =>
    Nations.importNations((e as HTMLInputElement).files?.[0]),
  "Nations.restore": () => Nations.restoreNations(),
  "Nations.honours": () => Nations.showNationsHonours(),
  "Nations.honourTeam": (e) =>
    Nations.showNationsHonours((e as HTMLSelectElement).value),
  "Nations.sync": () => nationsCloud.reload(),
  "Nations.remote": () => nationsCloud.resolve(true),
  "Nations.local": () => nationsCloud.resolve(false),

  "Full.enter": () => Full.enterFull(),
  "Full.library": () => Full.enterFull(),
  "Full.create": () => Full.createFull(),
  "Full.open": (e) => Full.openFull(arg(e)),
  "Full.section": (e) => Full.sectionFull(arg(e)),
  "Full.round": (e) => Full.setFullRound((e as HTMLSelectElement).value),
  "Full.next": () => Full.nextFullRound(),
  "Full.simMatch": (e) => Full.simulateFullMatch(arg(e)),
  "Full.simRound": () => Full.simulateFullRound(),
  "Full.simLeague": () => Full.simulateFullRound(true),
  "Full.drawWorld": () => Full.drawFullWorld(),
  "Full.drawPlayoff": () => Full.drawFullPlayoff(),
  "Full.stage": (e) => Full.simulateFullStage(arg(e)),
  "Full.finish": () => Full.finishFull(),
  "Full.edit": (e) => Full.editFullMatch(arg(e)),
  "Full.match": (e) => Full.showFullMatch(arg(e)),
  "Full.dialogSim": () => Full.actFullMatchDialog(),
  "Full.dialogEdit": () => Full.actFullMatchDialog(true),
  "Full.team": (e) =>
    Full.showFullTeam(
      arg(e),
      e.dataset.arg1 === undefined ? undefined : Number(e.dataset.arg1),
    ),
  "Full.export": () => Full.exportFull(),
  "Full.exportOne": () => Full.exportFull(true),
  "Full.import": () => $("fullImport").click(),
  "Full.importFile": (e) => Full.importFull((e as HTMLInputElement).files?.[0]),
  "Full.restore": () => Full.restoreFull(),
  "Full.honours": () => Full.showFullHonours(),
  "Full.honourTeam": (e) =>
    Full.showFullHonours((e as HTMLSelectElement).value),
  "Full.sync": () => Full.reloadFullCloud(),
  "Full.remote": () => Full.resolveFullConflict(true),
  "Full.local": () => Full.resolveFullConflict(false),
  achievementView: (e) => selectView(arg(e)),
  achievementWorld: () => selectWorldwide(),
  achievementRegion: (e) => selectRegion(arg(e) as Region),
  achievementTeam: (e) => selectTeam(arg(e)),
  nextLeagueRound: () => nextLeagueRound(),
  navigate: (e) => navigate(arg(e) as AppTab),
  exportSave: () => exportSave(),
  importFile: () =>
    $(
      store.tab === "nations-league"
        ? "nationsImport"
        : store.tab === "full-season"
          ? "fullImport"
          : "import",
    ).click(),
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
  selectStandingsRound: (e) =>
    selectStandingsRound((e as HTMLSelectElement).value),
  showTeamLeague: (e) =>
    showTeamLeague(
      arg(e),
      e.dataset.arg1 === undefined ? undefined : Number(e.dataset.arg1),
    ),
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
  "Seasons.requestNew": () =>
    store.tab === "nations-league"
      ? Nations.createNations()
      : store.tab === "full-season"
        ? Full.createFull()
        : getPorts().seasons.requestNew(),
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
